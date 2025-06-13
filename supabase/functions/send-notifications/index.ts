
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
      .limit(1);

    if (prefError) {
      console.error("Error fetching user preferences:", prefError);
      return new Response(JSON.stringify({ error: "Failed to fetch user preferences" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const userPrefs = preferences && preferences.length > 0 ? preferences[0] : null;

    // Get user profile for email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', payload.user_id)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      return new Response(JSON.stringify({ error: "Failed to fetch user profile" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!profile?.email) {
      console.error("No email found for user");
      return new Response(JSON.stringify({ error: "No email found for user" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
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

    // Send email notification if enabled
    if (userPrefs?.email_notifications && profile?.email) {
      try {
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        if (!resendApiKey) {
          console.error("RESEND_API_KEY not configured");
          await logDeliveryStatus(notification.id, 'email', 'failed', { error: 'RESEND_API_KEY not configured' });
          return new Response(JSON.stringify({ error: "Email service not configured" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const resend = new Resend(resendApiKey);
        const emailResult = await sendEmailNotification(
          resend,
          profile.email,
          profile.full_name || "User",
          payload,
          notification.id
        );

        return new Response(JSON.stringify({ 
          success: true, 
          notification_id: notification.id,
          email_sent: true,
          delivery_result: emailResult 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });

      } catch (error) {
        console.error("Email sending failed:", error);
        await logDeliveryStatus(notification.id, 'email', 'failed', { error: error.message });
        return new Response(JSON.stringify({ error: "Failed to send email notification" }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else {
      return new Response(JSON.stringify({ 
        success: true, 
        notification_id: notification.id,
        email_sent: false,
        message: "Email notifications disabled or no email address" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error) {
    console.error("Error in notification function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function sendEmailNotification(
  resend: any,
  email: string, 
  userName: string, 
  payload: NotificationPayload,
  notificationId: string
) {
  const subject = getEmailSubject(payload);
  const htmlContent = getEmailHTML(userName, payload);

  const emailResponse = await resend.emails.send({
    from: "Pantry Manager <onboarding@resend.dev>",
    to: [email],
    subject: subject,
    html: htmlContent,
  });

  console.log("Email sent successfully:", emailResponse);
  await logDeliveryStatus(notificationId, 'email', 'sent', emailResponse);
  return { method: 'email', status: 'sent', result: emailResponse };
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
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🥘 Pantry Manager</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px; font-weight: normal;">${getNotificationTitle(payload)}</h2>
        </div>
        
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e1e8ed; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${userName}</strong>,</p>
          
          <div style="background-color: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #1e40af; font-size: 18px;">📦 Product Details</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 10px 15px; font-weight: bold; background-color: #e2e8f0; border-radius: 4px; width: 40%;">Product Name:</td>
                <td style="padding: 10px 15px; background-color: #f8fafc; border-radius: 4px;">${product.name}</td>
              </tr>
              <tr><td colspan="2" style="height: 5px;"></td></tr>
              <tr>
                <td style="padding: 10px 15px; font-weight: bold; background-color: #e2e8f0; border-radius: 4px;">Category:</td>
                <td style="padding: 10px 15px; background-color: #f8fafc; border-radius: 4px;">${product.category}</td>
              </tr>
              <tr><td colspan="2" style="height: 5px;"></td></tr>
              <tr>
                <td style="padding: 10px 15px; font-weight: bold; background-color: #e2e8f0; border-radius: 4px;">Quantity:</td>
                <td style="padding: 10px 15px; background-color: #f8fafc; border-radius: 4px;">${product.quantity} ${product.quantity_type}</td>
              </tr>
              <tr><td colspan="2" style="height: 5px;"></td></tr>
              <tr>
                <td style="padding: 10px 15px; font-weight: bold; background-color: #e2e8f0; border-radius: 4px;">Cost:</td>
                <td style="padding: 10px 15px; background-color: #f8fafc; border-radius: 4px;">₹${product.amount}</td>
              </tr>
              <tr><td colspan="2" style="height: 5px;"></td></tr>
              <tr>
                <td style="padding: 10px 15px; font-weight: bold; background-color: #e2e8f0; border-radius: 4px;">Expiry Date:</td>
                <td style="padding: 10px 15px; background-color: #f8fafc; border-radius: 4px;">${new Date(product.expiry_date).toLocaleDateString('en-IN')}</td>
              </tr>
              ${days_until_expiry !== undefined ? `
              <tr><td colspan="2" style="height: 5px;"></td></tr>
              <tr>
                <td style="padding: 10px 15px; font-weight: bold; background-color: #fee2e2; border-radius: 4px;">Days Until Expiry:</td>
                <td style="padding: 10px 15px; font-weight: bold; color: #dc2626; background-color: #fef2f2; border-radius: 4px;">${days_until_expiry} days</td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          ${payload.notification_type === 'expiry' ? `
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #fca5a5; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 10px;">
              ${days_until_expiry === 0 ? '🚨' : days_until_expiry === 1 ? '⚠️' : '📅'}
            </div>
            <p style="margin: 0; font-weight: bold; color: #dc2626; font-size: 16px;">
              ${days_until_expiry === 0 ? 'This product expires today! Please use it immediately.' :
                days_until_expiry === 1 ? 'This product expires tomorrow! Please plan to use it soon.' :
                `This product expires in ${days_until_expiry} days. Please plan accordingly.`}
            </p>
          </div>
          ` : payload.notification_type === 'product_added' ? `
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 10px;">✅</div>
            <p style="margin: 0; font-weight: bold; color: #16a34a; font-size: 16px;">
              Successfully added to your pantry!
            </p>
          </div>
          ` : payload.notification_type === 'product_removed' ? `
          <div style="background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%); border: 2px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center;">
            <div style="font-size: 24px; margin-bottom: 10px;">🗑️</div>
            <p style="margin: 0; font-weight: bold; color: #d97706; font-size: 16px;">
              Removed from your pantry
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              📱 Open Pantry Manager
            </a>
          </div>
        </div>
        
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e1e8ed; border-top: none;">
          <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.4;">
            This is an automated notification from your Pantry Manager.<br>
            You can manage your notification preferences in the app settings.
          </p>
        </div>
      </body>
    </html>
  `;
}

serve(handler);
