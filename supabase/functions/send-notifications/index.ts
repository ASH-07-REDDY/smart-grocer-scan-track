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
    id?: string;
    name: string;
    category?: string;
    quantity?: number;
    quantity_type?: string;
    amount?: number;
    expiry_date?: string;
  };
  notification_type: 'expiring' | 'expired' | 'product_added' | 'product_removed' | 'product_used';
  days_until_expiry?: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("Processing notification:", JSON.stringify(payload, null, 2));

    if (!payload.user_id || !payload.product || !payload.notification_type) {
      console.error("Missing required fields in payload");
      return new Response(JSON.stringify({ 
        success: false,
        error: "Missing required fields" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get user profile for email - try both id and user_id fields
    let profile = null;
    let profileError = null;

    // First try by id
    const result1 = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', payload.user_id)
      .maybeSingle();

    if (result1.data) {
      profile = result1.data;
    } else {
      // Try by user_id
      const result2 = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('user_id', payload.user_id)
        .maybeSingle();
      
      profile = result2.data;
      profileError = result2.error;
    }

    // If still no profile, try to get email from auth.users
    if (!profile?.email) {
      console.log("No profile found, checking auth.users...");
      const { data: userData } = await supabase.auth.admin.getUserById(payload.user_id);
      if (userData?.user?.email) {
        profile = { email: userData.user.email, full_name: userData.user.user_metadata?.full_name };
      }
    }

    if (!profile?.email) {
      console.error("Error fetching user profile:", profileError);
      // Still create notification even if we can't send email
      await createNotificationRecord(payload);
      return new Response(JSON.stringify({ 
        success: true,
        message: "Notification created but email not sent - no email found" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found user email: ${profile.email}`);

    // Get user preferences
    const { data: preferences } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', payload.user_id)
      .maybeSingle();

    const userPrefs = preferences || { email_notifications: true };

    // Create notification record first
    const notification = await createNotificationRecord(payload);

    if (!userPrefs.email_notifications) {
      console.log("Email notifications disabled for user");
      return new Response(JSON.stringify({ 
        success: true,
        message: "Notification created but email disabled",
        notification_id: notification?.id
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send email notification using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(JSON.stringify({ 
        success: true,
        message: "Notification created but email service not configured",
        notification_id: notification?.id
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const resend = new Resend(resendApiKey);
    console.log(`Sending email to: ${profile.email}`);
    
    const emailSubject = getEmailSubject(payload);
    const emailHtml = getEmailHTML(profile.full_name || "User", payload);

    try {
      const emailResult = await resend.emails.send({
        from: "Smart Pantry <onboarding@resend.dev>",
        to: [profile.email],
        subject: emailSubject,
        html: emailHtml,
      });

      console.log("Email sent successfully:", emailResult);

      return new Response(JSON.stringify({ 
        success: true, 
        notification_id: notification?.id,
        email_sent: true,
        email_result: emailResult
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (emailError: any) {
      console.error("Email sending failed:", emailError);
      return new Response(JSON.stringify({ 
        success: true,
        message: "Notification created but email failed",
        notification_id: notification?.id,
        email_error: emailError.message
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  } catch (error: any) {
    console.error("Error in notification function:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function createNotificationRecord(payload: NotificationPayload) {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: payload.user_id,
        title: getNotificationTitle(payload),
        message: getNotificationMessage(payload),
        type: payload.notification_type,
        item_id: payload.product.id || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating notification:", error);
      return null;
    }

    console.log("Notification record created:", notification.id);
    return notification;
  } catch (error) {
    console.error("Error creating notification record:", error);
    return null;
  }
}

function getNotificationTitle(payload: NotificationPayload): string {
  switch (payload.notification_type) {
    case 'expiring':
      if (payload.days_until_expiry === 0) {
        return "🚨 Product Expires Today!";
      } else if (payload.days_until_expiry === 1) {
        return "⚠️ Product Expires Tomorrow!";
      } else {
        return `📅 Product Expiring in ${payload.days_until_expiry} Days`;
      }
    case 'expired':
      return "❌ Product Has Expired!";
    case 'product_added':
      return "✅ Product Added to Pantry";
    case 'product_removed':
      return "🗑️ Product Removed from Pantry";
    case 'product_used':
      return "🍽️ Product Used";
    default:
      return "📦 Pantry Update";
  }
}

function getNotificationMessage(payload: NotificationPayload): string {
  const { product, days_until_expiry } = payload;
  
  switch (payload.notification_type) {
    case 'expiring':
      const urgency = days_until_expiry === 0 ? "expires today" : 
                     days_until_expiry === 1 ? "expires tomorrow" :
                     `expires in ${days_until_expiry} days`;
      return `${product.name} ${urgency}. Use it before it goes bad!`;
    
    case 'expired':
      return `${product.name} has expired and should be discarded.`;
    
    case 'product_added':
      return `${product.name} has been added to your pantry${product.quantity ? ` - ${product.quantity} ${product.quantity_type || 'units'}` : ''}`;
    
    case 'product_removed':
      return `${product.name} has been removed from your pantry`;
    
    case 'product_used':
      return `${product.name} has been marked as used`;
    
    default:
      return `Update for ${product.name}`;
  }
}

function getEmailSubject(payload: NotificationPayload): string {
  return `Smart Pantry: ${getNotificationTitle(payload)}`;
}

function getEmailHTML(userName: string, payload: NotificationPayload): string {
  const { product, days_until_expiry } = payload;
  
  const getStatusBadge = () => {
    switch (payload.notification_type) {
      case 'expiring':
        return days_until_expiry === 0 ? 
          '<span style="background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">EXPIRES TODAY</span>' :
          days_until_expiry === 1 ?
          '<span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">EXPIRES TOMORROW</span>' :
          `<span style="background: #3b82f6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">EXPIRES IN ${days_until_expiry} DAYS</span>`;
      case 'expired':
        return '<span style="background: #6b7280; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">EXPIRED</span>';
      case 'product_added':
        return '<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">ADDED</span>';
      case 'product_removed':
        return '<span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">REMOVED</span>';
      case 'product_used':
        return '<span style="background: #8b5cf6; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">USED</span>';
      default:
        return '';
    }
  };
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Smart Pantry Notification</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f3f4f6;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 32px; font-weight: bold; color: white;">🏠 Smart Pantry</h1>
          <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Your intelligent pantry manager</p>
        </div>
        
        <div style="background-color: #ffffff; padding: 40px 30px;">
          <p style="font-size: 18px; margin: 0 0 20px 0;">Hello <strong>${userName}</strong>,</p>
          
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 16px; padding: 30px; margin: 25px 0; border: 1px solid #e2e8f0;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
              <h2 style="margin: 0; font-size: 24px; color: #1e293b;">${product.name}</h2>
              ${getStatusBadge()}
            </div>
            
            <p style="margin: 0; color: #64748b; font-size: 16px; line-height: 1.6;">
              ${getNotificationMessage(payload)}
            </p>
            
            ${product.category ? `
            <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <table style="width: 100%;">
                ${product.category ? `<tr><td style="color: #64748b; padding: 5px 0;">Category:</td><td style="font-weight: 500;">${product.category}</td></tr>` : ''}
                ${product.quantity ? `<tr><td style="color: #64748b; padding: 5px 0;">Quantity:</td><td style="font-weight: 500;">${product.quantity} ${product.quantity_type || ''}</td></tr>` : ''}
                ${product.amount ? `<tr><td style="color: #64748b; padding: 5px 0;">Value:</td><td style="font-weight: 500;">₹${product.amount}</td></tr>` : ''}
                ${product.expiry_date ? `<tr><td style="color: #64748b; padding: 5px 0;">Expiry:</td><td style="font-weight: 500;">${new Date(product.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td></tr>` : ''}
              </table>
            </div>
            ` : ''}
          </div>
          
          ${payload.notification_type === 'expiring' && days_until_expiry !== undefined && days_until_expiry <= 1 ? `
          <div style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 2px solid #fca5a5; border-radius: 12px; padding: 20px; text-align: center; margin-top: 20px;">
            <p style="margin: 0; font-weight: bold; color: #dc2626; font-size: 16px;">
              ⚠️ Action Required: Use this product soon to avoid waste!
            </p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://smart-grocer-scan-track.lovable.app" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Open Smart Pantry
            </a>
          </div>
        </div>
        
        <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #6b7280; font-size: 12px; margin: 0; line-height: 1.6;">
            This is an automated notification from Smart Pantry.<br>
            Manage your notification preferences in <a href="https://smart-grocer-scan-track.lovable.app" style="color: #667eea;">app settings</a>.
          </p>
        </div>
      </body>
    </html>
  `;
}

serve(handler);
