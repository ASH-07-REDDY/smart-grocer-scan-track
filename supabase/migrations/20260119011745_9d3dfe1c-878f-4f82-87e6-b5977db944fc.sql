-- Fix overly permissive SELECT policy on weight_readings table
-- The current policy allows any authenticated user to view ALL readings

DROP POLICY IF EXISTS "Users can view weight readings from their devices" ON public.weight_readings;

CREATE POLICY "Users can view weight readings from their devices"
ON public.weight_readings FOR SELECT
USING (
  device_id IN (
    SELECT device_id FROM public.device_registry WHERE user_id = auth.uid()
  )
);