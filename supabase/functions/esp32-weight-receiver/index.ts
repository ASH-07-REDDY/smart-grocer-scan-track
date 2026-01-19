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
    if (!barcode || weight_value === undefined || weight_value === null || !sensor_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: barcode, weight_value, sensor_id, user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate barcode format (alphanumeric, hyphens allowed, max 50 chars)
    if (typeof barcode !== 'string' || !/^[A-Za-z0-9-]{1,50}$/.test(barcode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid barcode format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate sensor_id format (alphanumeric, underscores allowed, max 50 chars)
    if (typeof sensor_id !== 'string' || !/^[A-Za-z0-9_]{1,50}$/.test(sensor_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid sensor_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate user_id is a valid UUID
    if (typeof user_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid user_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate weight_value - must be a valid number within reasonable range
    const weight = parseFloat(weight_value)
    if (isNaN(weight) || !isFinite(weight) || weight < 0 || weight > 100000) {
      return new Response(
        JSON.stringify({ error: 'Invalid weight value. Must be between 0 and 100000' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate optional temperature (-50 to 100 Celsius)
    let validatedTemperature: number | null = null
    if (temperature !== undefined && temperature !== null) {
      const temp = parseFloat(temperature)
      if (isNaN(temp) || !isFinite(temp) || temp < -50 || temp > 100) {
        return new Response(
          JSON.stringify({ error: 'Invalid temperature value. Must be between -50 and 100' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      validatedTemperature = temp
    }

    // Validate optional battery_level (0 to 100 percent)
    let validatedBatteryLevel: number | null = null
    if (battery_level !== undefined && battery_level !== null) {
      const battery = parseInt(battery_level)
      if (isNaN(battery) || battery < 0 || battery > 100) {
        return new Response(
          JSON.stringify({ error: 'Invalid battery level. Must be between 0 and 100' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      validatedBatteryLevel = battery
    }

    // Validate optional signal_strength (-120 to 0 dBm)
    let validatedSignalStrength: number | null = null
    if (signal_strength !== undefined && signal_strength !== null) {
      const signal = parseInt(signal_strength)
      if (isNaN(signal) || signal < -120 || signal > 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid signal strength. Must be between -120 and 0' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      validatedSignalStrength = signal
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

    // Insert weight reading with validated data
    const { data, error } = await supabaseClient
      .from('weight_readings')
      .insert({
        barcode,
        weight_value: weight,
        weight_unit: 'grams',
        sensor_id,
        temperature: validatedTemperature,
        battery_level: validatedBatteryLevel,
        signal_strength: validatedSignalStrength,
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