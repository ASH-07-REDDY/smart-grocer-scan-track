
-- Create barcode_products table to store barcode to product mappings
CREATE TABLE public.barcode_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  default_expiry_days INTEGER DEFAULT 30,
  nutrition_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_notification_preferences table
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  email_notifications BOOLEAN DEFAULT true,
  phone_notifications BOOLEAN DEFAULT false,
  phone_number TEXT,
  expiry_reminder_days INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add barcode column to grocery_items table
ALTER TABLE public.grocery_items 
ADD COLUMN barcode TEXT;

-- Create indexes for better performance
CREATE INDEX idx_barcode_products_barcode ON public.barcode_products(barcode);
CREATE INDEX idx_grocery_items_barcode ON public.grocery_items(barcode);
CREATE INDEX idx_user_notification_preferences_user_id ON public.user_notification_preferences(user_id);

-- Enable RLS on new tables
ALTER TABLE public.barcode_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for barcode_products (public read access)
CREATE POLICY "Anyone can view barcode products" 
  ON public.barcode_products 
  FOR SELECT 
  USING (true);

-- RLS policies for user_notification_preferences
CREATE POLICY "Users can view their own notification preferences" 
  ON public.user_notification_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences" 
  ON public.user_notification_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences" 
  ON public.user_notification_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences" 
  ON public.user_notification_preferences 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Insert some sample barcode data
INSERT INTO public.barcode_products (barcode, product_name, brand, category, default_expiry_days) VALUES
('123456789012', 'Organic Milk', 'Fresh Farms', 'Dairy', 7),
('234567890123', 'Whole Wheat Bread', 'Baker''s Best', 'Bakery', 5),
('345678901234', 'Greek Yogurt', 'Healthy Choice', 'Dairy', 14),
('456789012345', 'Bananas', 'Fresh Produce', 'Fruits', 7),
('567890123456', 'Chicken Breast', 'Premium Meats', 'Meat', 3),
('678901234567', 'Olive Oil', 'Mediterranean Gold', 'Pantry', 730),
('789012345678', 'Brown Rice', 'Nature''s Grain', 'Pantry', 365),
('890123456789', 'Fresh Salmon', 'Ocean Fresh', 'Seafood', 2),
('901234567890', 'Tomatoes', 'Garden Fresh', 'Vegetables', 7),
('012345678901', 'Cheddar Cheese', 'Dairy Dreams', 'Dairy', 30);
