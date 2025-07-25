import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-id',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { barcode, weight_value, sensor_id, temperature, battery_level, signal_strength, user_id, device_token } = await req.json()
    const deviceId = req.headers.get('x-device-id')

    // Validate required fields
    if (!barcode || !weight_value || !sensor_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: barcode, weight_value, sensor_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Authenticate device if device_token and device_id are provided
    if (device_token && deviceId) {
      const { data: device, error: deviceError } = await supabaseClient
        .from('device_registry')
        .select('*')
        .eq('device_id', deviceId)
        .eq('device_token', device_token)
        .eq('user_id', user_id)
        .eq('is_active', true)
        .single()

      if (deviceError || !device) {
        return new Response(
          JSON.stringify({ error: 'Invalid device credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update last seen timestamp
      await supabaseClient
        .from('device_registry')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', device.id)
    }

    // Insert weight reading
    const { data, error } = await supabaseClient
      .from('weight_readings')
      .insert({
        barcode,
        weight_value: parseFloat(weight_value),
        weight_unit: 'grams',
        sensor_id,
        temperature: temperature ? parseFloat(temperature) : null,
        battery_level: battery_level ? parseInt(battery_level) : null,
        signal_strength: signal_strength ? parseInt(signal_strength) : null,
        user_id
      })

    if (error) {
      console.error('Database error:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to save weight reading' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Weight reading saved successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})