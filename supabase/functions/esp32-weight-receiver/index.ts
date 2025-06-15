import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { barcode, weight_value, sensor_id, temperature, battery_level, signal_strength, user_id } = await req.json()

    // Validate required fields
    if (!barcode || !weight_value || !sensor_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: barcode, weight_value, sensor_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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