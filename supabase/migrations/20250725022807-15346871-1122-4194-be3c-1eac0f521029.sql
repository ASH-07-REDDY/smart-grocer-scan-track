-- Fix database function security vulnerabilities by setting proper search_path
-- This prevents SQL injection attacks via search_path manipulation

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);
  RETURN NEW;
END;
$function$;

-- Update the update_barcode_product_weight function
CREATE OR REPLACE FUNCTION public.update_barcode_product_weight()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.barcode_products 
  SET 
    current_weight = NEW.weight_value,
    weight_unit = NEW.weight_unit,
    last_weight_update = NEW.timestamp
  WHERE barcode = NEW.barcode;
  
  RETURN NEW;
END;
$function$;

-- Update the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Create a secure device management table for ESP32 authentication
CREATE TABLE IF NOT EXISTS public.device_registry (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL UNIQUE,
    device_name TEXT NOT NULL,
    user_id UUID NOT NULL,
    device_token TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on device registry
ALTER TABLE public.device_registry ENABLE ROW LEVEL SECURITY;

-- Create policies for device registry
CREATE POLICY "Users can view their own devices" 
ON public.device_registry 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own devices" 
ON public.device_registry 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" 
ON public.device_registry 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own devices" 
ON public.device_registry 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_device_registry_updated_at
BEFORE UPDATE ON public.device_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();