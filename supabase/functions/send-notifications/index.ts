
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface NotificationPayload {
  user_id: string;
  product: {
    id: string;
    name: string;
    category: string;
    quantity: number;
    quantity_type: string;
    amount: number;
    expiry_date: string;
  };
  notification_type: 'expiry' | 'product_added' | 'product_removed';
  days_until_expiry?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("Processing notification:", payload);

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', payload.user_id)
      .maybeSingle();

    if (prefError) {
      console.error("Error fetching user preferences:", prefError);
      return new Response(JSON.stringify({ error: "Failed to fetch user preferences" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user profile for email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', payload.user_id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
    }

    // Create notification record
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.user_id,
        title: getNotificationTitle(payload),
        message: getNotificationMessage(payload),
        type: payload.notification_type,
        product_id: payload.product.id,
        product_details: {
          name: payload.product.name,
          category: payload.product.category,
          quantity: payload.product.quantity,
          quantity_type: payload.product.quantity_type,
          amount: payload.product.amount,
          expiry_date: payload.product.expiry_date,
          days_until_expiry: payload.days_until_expiry
        }
      })
      .select()
      .single();

    if (notificationError) {
      console.error("Error creating notification:", notificationError);
      return new Response(JSON.stringify({ error: "Failed to create notification" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const results = [];

    // Send email notification
    if (preferences?.email_notifications && profile?.email) {
      try {
        const emailResult = await sendEmailNotification(
          profile.email,
          profile.full_name || "User",
          payload,
          notification.id
        );
        results.push(emailResult);
      } catch (error) {
        console.error("Email sending failed:", error);
        await logDeliveryStatus(notification.id, 'email', 'failed', { error: error.message });
      }
    }

    // Send SMS notification
    if (preferences?.phone_notifications && preferences?.phone_number) {
      try {
        const smsResult = await sendSMSNotification(
          preferences.phone_number,
          payload,
          notification.id
        );
        results.push(smsResult);
      } catch (error) {
        console.error("SMS sending failed:", error);
        await logDeliveryStatus(notification.id, 'sms', 'failed', { error: error.message });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notification_id: notification.id,
      delivery_results: results 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function sendEmailNotification(
  email: string, 
  userName: string, 
  payload: NotificationPayload,
  notificationId: string
) {
  const subject = getEmailSubject(payload);
  const htmlContent = getEmailHTML(userName, payload);

  const emailResponse = await resend.emails.send({
    from: "Pantry Manager <notifications@resend.dev>",
    to: [email],
    subject: subject,
    html: htmlContent,
  });

  await logDeliveryStatus(notificationId, 'email', 'sent', emailResponse);
  return { method: 'email', status: 'sent', result: emailResponse };
}

async function sendSMSNotification(
  phoneNumber: string,
  payload: NotificationPayload,
  notificationId: string
) {
  const message = getSMSMessage(payload);
  
  // Using Twilio for SMS - you'll need TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
  const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    throw new Error("Twilio credentials not configured");
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  
  const formData = new URLSearchParams();
  formData.append('From', twilioPhoneNumber);
  formData.append('To', phoneNumber);
  formData.append('Body', message);

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(`Twilio error: ${result.message}`);
  }

  await logDeliveryStatus(notificationId, 'sms', 'sent', result);
  return { method: 'sms', status: 'sent', result };
}

async function logDeliveryStatus(
  notificationId: string,
  method: string,
  status: string,
  details: any
) {
  await supabase
    .from('notification_delivery_log')
    .insert({
      notification_id: notificationId,
      delivery_method: method,
      delivery_status: status,
      delivery_details: details
    });
}

function getNotificationTitle(payload: NotificationPayload): string {
  switch (payload.notification_type) {
    case 'expiry':
      if (payload.days_until_expiry === 0) {
        return "🚨 Product Expires Today!";
      } else if (payload.days_until_expiry === 1) {
        return "⚠️ Product Expires Tomorrow!";
      } else {
        return `📅 Product Expiring in ${payload.days_until_expiry} Days`;
      }
    case 'product_added':
      return "✅ Product Added to Pantry";
    case 'product_removed':
      return "🗑️ Product Removed from Pantry";
    default:
      return "📦 Pantry Update";
  }
}

function getNotificationMessage(payload: NotificationPayload): string {
  const { product, days_until_expiry } = payload;
  
  switch (payload.notification_type) {
    case 'expiry':
      const urgency = days_until_expiry === 0 ? "expires today" : 
                     days_until_expiry === 1 ? "expires tomorrow" :
                     `expires in ${days_until_expiry} days`;
      
      return `${product.name} (${product.quantity} ${product.quantity_type}, ₹${product.amount}) ${urgency}. Category: ${product.category}`;
    
    case 'product_added':
      return `${product.name} has been added to your pantry - ${product.quantity} ${product.quantity_type}, ₹${product.amount}`;
    
    case 'product_removed':
      return `${product.name} has been removed from your pantry`;
    
    default:
      return `Update for ${product.name}`;
  }
}

function getEmailSubject(payload: NotificationPayload): string {
  return getNotificationTitle(payload);
}

function getEmailHTML(userName: string, payload: NotificationPayload): string {
  const { product, days_until_expiry } = payload;
  
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">${getNotificationTitle(payload)}</h2>
          
          <p>Hello ${userName},</p>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">Product Details:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px; font-weight: bold;">Product Name:</td>
                <td style="padding: 8px;">${product.name}</td>
              </tr>
              <tr style="background-color: #e2e8f0;">
                <td style="padding: 8px; font-weight: bold;">Category:</td>
                <td style="padding: 8px;">${product.category}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Quantity:</td>
                <td style="padding: 8px;">${product.quantity} ${product.quantity_type}</td>
              </tr>
              <tr style="background-color: #e2e8f0;">
                <td style="padding: 8px; font-weight: bold;">Cost:</td>
                <td style="padding: 8px;">₹${product.amount}</td>
              </tr>
              <tr>
                <td style="padding: 8px; font-weight: bold;">Expiry Date:</td>
                <td style="padding: 8px;">${new Date(product.expiry_date).toLocaleDateString('en-IN')}</td>
              </tr>
              ${days_until_expiry !== undefined ? `
              <tr style="background-color: #fee2e2;">
                <td style="padding: 8px; font-weight: bold;">Days Until Expiry:</td>
                <td style="padding: 8px; font-weight: bold; color: #dc2626;">${days_until_expiry} days</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${payload.notification_type === 'expiry' ? `
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #dc2626;">
              ${days_until_expiry === 0 ? 'This product expires today! Please use it immediately.' :
                days_until_expiry === 1 ? 'This product expires tomorrow! Please plan to use it soon.' :
                `This product expires in ${days_until_expiry} days. Please plan accordingly.`}
            </p>
          </div>
          ` : ''}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This is an automated notification from your Pantry Manager. 
            You can manage your notification preferences in the app settings.
          </p>
        </div>
      </body>
    </html>
  `;
}

function getSMSMessage(payload: NotificationPayload): string {
  const { product, days_until_expiry } = payload;
  
  switch (payload.notification_type) {
    case 'expiry':
      const urgency = days_until_expiry === 0 ? "expires TODAY" : 
                     days_until_expiry === 1 ? "expires TOMORROW" :
                     `expires in ${days_until_expiry} days`;
      
      return `🚨 PANTRY ALERT: ${product.name} ${urgency}!\n\nDetails:\n• Qty: ${product.quantity} ${product.quantity_type}\n• Cost: ₹${product.amount}\n• Category: ${product.category}\n• Expiry: ${new Date(product.expiry_date).toLocaleDateString('en-IN')}\n\nPlan accordingly! - Pantry Manager`;
    
    case 'product_added':
      return `✅ Added to pantry: ${product.name} (${product.quantity} ${product.quantity_type}, ₹${product.amount}) - Pantry Manager`;
    
    case 'product_removed':
      return `🗑️ Removed from pantry: ${product.name} - Pantry Manager`;
    
    default:
      return `📦 Pantry update for ${product.name} - Pantry Manager`;
  }
}

serve(handler);
