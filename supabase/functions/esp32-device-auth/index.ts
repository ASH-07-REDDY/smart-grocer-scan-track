import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface DeviceAuthRequest {
  device_id: string;
  device_token: string;
  user_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { device_id, device_token, user_id }: DeviceAuthRequest = await req.json();

    // Validate required fields
    if (!device_id || !device_token || !user_id) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "Missing required fields: device_id, device_token, user_id" 
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify device registration and token
    const { data: device, error: deviceError } = await supabase
      .from('device_registry')
      .select('*')
      .eq('device_id', device_id)
      .eq('device_token', device_token)
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    if (deviceError || !device) {
      console.error("Device authentication failed:", deviceError);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Invalid device credentials" 
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update last seen timestamp
    await supabase
      .from('device_registry')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', device.id);

    console.log(`Device authenticated: ${device_id} for user: ${user_id}`);

    return new Response(JSON.stringify({ 
      success: true,
      device_id: device.device_id,
      device_name: device.device_name,
      authenticated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in device authentication:", error);
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