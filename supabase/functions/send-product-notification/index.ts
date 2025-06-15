import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ProductNotificationRequest {
  productName: string;
  category: string;
  quantity: number;
  quantityType: string;
  expiryDate: string;
  userId: string;
  productId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, category, quantity, quantityType, expiryDate, userId, productId }: ProductNotificationRequest = await req.json();

    if (!productName || !userId || !productId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log(`Sending notifications for new product: ${productName} by user ${userId}`);

    // Get user profile for email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Create in-app notification
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: 'New Product Added',
        message: `${productName} has been successfully added to your pantry`,
        type: 'product_added',
        product_id: productId,
        product_details: {
          name: productName,
          category: category,
          quantity: quantity,
          quantity_type: quantityType,
          expiry_date: expiryDate
        }
      });

    if (notificationError) {
      console.error('Error creating notification:', notificationError);
    } else {
      console.log('In-app notification created successfully');
    }

    // Send email notification if user has email and Resend is configured
    if (profile?.email && Deno.env.get("RESEND_API_KEY")) {
      try {
        const emailResponse = await resend.emails.send({
          from: "Smart Pantry <noreply@yourdomain.com>",
          to: [profile.email],
          subject: `New Product Added: ${productName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Product Successfully Added! 🥬</h2>
              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #333;">${productName}</h3>
                <p style="margin: 5px 0;"><strong>Category:</strong> ${category}</p>
                <p style="margin: 5px 0;"><strong>Quantity:</strong> ${quantity} ${quantityType}</p>
                <p style="margin: 5px 0;"><strong>Expiry Date:</strong> ${new Date(expiryDate).toLocaleDateString()}</p>
              </div>
              <p style="color: #666;">
                Your product has been successfully added to your Smart Pantry inventory. 
                You'll receive reminders before it expires.
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                This is an automated message from Smart Pantry. Please do not reply to this email.
              </p>
            </div>
          `,
        });

        console.log("Email sent successfully:", emailResponse);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Notifications sent successfully" 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in send-product-notification:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);