-- Add weight tracking columns to barcode_products table
ALTER TABLE public.barcode_products 
ADD COLUMN current_weight NUMERIC DEFAULT 0,
ADD COLUMN weight_unit TEXT DEFAULT 'grams',
ADD COLUMN last_weight_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create weight_readings table for historical weight data
CREATE TABLE public.weight_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT NOT NULL,
  weight_value NUMERIC NOT NULL,
  weight_unit TEXT NOT NULL DEFAULT 'grams',
  sensor_id TEXT NOT NULL,
  temperature NUMERIC,
  battery_level INTEGER,
  signal_strength INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on weight_readings
ALTER TABLE public.weight_readings ENABLE ROW LEVEL SECURITY;

-- Create policies for weight_readings
CREATE POLICY "Users can view their own weight readings" 
ON public.weight_readings 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight readings" 
ON public.weight_readings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_weight_readings_barcode ON public.weight_readings(barcode);
CREATE INDEX idx_weight_readings_user_timestamp ON public.weight_readings(user_id, timestamp DESC);

-- Add user_expiry_dates table to store user-specific expiry dates for products
CREATE TABLE public.user_expiry_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  barcode TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, barcode)
);

-- Enable RLS on user_expiry_dates
ALTER TABLE public.user_expiry_dates ENABLE ROW LEVEL SECURITY;

-- Create policies for user_expiry_dates
CREATE POLICY "Users can manage their own expiry dates" 
ON public.user_expiry_dates 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_user_expiry_dates_updated_at
BEFORE UPDATE ON public.user_expiry_dates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update current weight in barcode_products
CREATE OR REPLACE FUNCTION public.update_barcode_product_weight()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.barcode_products 
  SET 
    current_weight = NEW.weight_value,
    weight_unit = NEW.weight_unit,
    last_weight_update = NEW.timestamp
  WHERE barcode = NEW.barcode;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update barcode_products when new weight reading is inserted
CREATE TRIGGER update_current_weight_trigger
AFTER INSERT ON public.weight_readings
FOR EACH ROW
EXECUTE FUNCTION public.update_barcode_product_weight();