-- Fix permissive RLS policies on weight_readings
DROP POLICY IF EXISTS "Anyone can view weight readings" ON public.weight_readings;
DROP POLICY IF EXISTS "Anyone can insert weight readings" ON public.weight_readings;

-- Create proper RLS policies for weight_readings based on device ownership
CREATE POLICY "Users can view weight readings from their devices"
ON public.weight_readings FOR SELECT
USING (
  device_id IN (
    SELECT device_id FROM public.device_registry WHERE user_id = auth.uid()
  )
  OR auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated users can insert weight readings"
ON public.weight_readings FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their device readings"
ON public.weight_readings FOR UPDATE
USING (
  device_id IN (
    SELECT device_id FROM public.device_registry WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their device readings"
ON public.weight_readings FOR DELETE
USING (
  device_id IN (
    SELECT device_id FROM public.device_registry WHERE user_id = auth.uid()
  )
);

-- Fix permissive RLS policies on barcode_products
DROP POLICY IF EXISTS "Anyone can insert barcode products" ON public.barcode_products;
DROP POLICY IF EXISTS "Anyone can update barcode products" ON public.barcode_products;

CREATE POLICY "Authenticated users can insert barcode products"
ON public.barcode_products FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update barcode products"
ON public.barcode_products FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Add DELETE policy for user notification preferences
CREATE POLICY "Users can delete own notification preferences"
ON public.user_notification_preferences FOR DELETE
USING (auth.uid() = user_id);

-- Add UPDATE policy for waste_items
CREATE POLICY "Users can update own waste items"
ON public.waste_items FOR UPDATE
USING (auth.uid() = user_id);

-- Add DELETE policy for barcode_products (restricted to authenticated users)
CREATE POLICY "Authenticated users can delete barcode products"
ON public.barcode_products FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Add policies for categories management
CREATE POLICY "Authenticated users can insert categories"
ON public.categories FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update categories"
ON public.categories FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete categories"
ON public.categories FOR DELETE
USING (auth.uid() IS NOT NULL);