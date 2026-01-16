
-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create barcode_products table with product info
CREATE TABLE public.barcode_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  category TEXT,
  default_expiry_days INTEGER DEFAULT 30,
  current_weight DECIMAL(10,2),
  unit TEXT DEFAULT 'g',
  image_url TEXT,
  nutrition_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create grocery_items table
CREATE TABLE public.grocery_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER DEFAULT 1,
  unit TEXT,
  expiry_date DATE,
  barcode TEXT,
  image_url TEXT,
  notes TEXT,
  is_expired BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create weight_readings table for sensor data
CREATE TABLE public.weight_readings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barcode TEXT,
  weight DECIMAL(10,2) NOT NULL,
  unit TEXT DEFAULT 'g',
  device_id TEXT,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_expiry_dates table
CREATE TABLE public.user_expiry_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  barcode TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create device_registry table for ESP32 devices
CREATE TABLE public.device_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT,
  device_type TEXT DEFAULT 'ESP32',
  api_key TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  item_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_notification_preferences table
CREATE TABLE public.user_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  phone_notifications BOOLEAN DEFAULT false,
  phone_number TEXT,
  expiry_reminder_days INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create waste_items table
CREATE TABLE public.waste_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  reason TEXT,
  wasted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcode_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_expiry_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Categories policies (public read)
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);

-- Barcode products policies (public read/write for now)
CREATE POLICY "Anyone can view barcode products" ON public.barcode_products FOR SELECT USING (true);
CREATE POLICY "Anyone can insert barcode products" ON public.barcode_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update barcode products" ON public.barcode_products FOR UPDATE USING (true);

-- Grocery items policies
CREATE POLICY "Users can view own grocery items" ON public.grocery_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own grocery items" ON public.grocery_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own grocery items" ON public.grocery_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own grocery items" ON public.grocery_items FOR DELETE USING (auth.uid() = user_id);

-- Weight readings policies (public for ESP32 devices)
CREATE POLICY "Anyone can view weight readings" ON public.weight_readings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert weight readings" ON public.weight_readings FOR INSERT WITH CHECK (true);

-- User expiry dates policies
CREATE POLICY "Users can view own expiry dates" ON public.user_expiry_dates FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expiry dates" ON public.user_expiry_dates FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expiry dates" ON public.user_expiry_dates FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expiry dates" ON public.user_expiry_dates FOR DELETE USING (auth.uid() = user_id);

-- Device registry policies
CREATE POLICY "Users can view own devices" ON public.device_registry FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own devices" ON public.device_registry FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own devices" ON public.device_registry FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own devices" ON public.device_registry FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- User notification preferences policies
CREATE POLICY "Users can view own preferences" ON public.user_notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON public.user_notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON public.user_notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Waste items policies
CREATE POLICY "Users can view own waste items" ON public.waste_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own waste items" ON public.waste_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own waste items" ON public.waste_items FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_barcode_products_updated_at BEFORE UPDATE ON public.barcode_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_grocery_items_updated_at BEFORE UPDATE ON public.grocery_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_expiry_dates_updated_at BEFORE UPDATE ON public.user_expiry_dates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_device_registry_updated_at BEFORE UPDATE ON public.device_registry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, icon, color) VALUES
  ('Dairy', 'milk', '#3B82F6'),
  ('Fruits', 'apple', '#22C55E'),
  ('Vegetables', 'carrot', '#F97316'),
  ('Meat', 'beef', '#EF4444'),
  ('Beverages', 'cup-soda', '#8B5CF6'),
  ('Snacks', 'cookie', '#F59E0B'),
  ('Grains', 'wheat', '#A16207'),
  ('Frozen', 'snowflake', '#06B6D4'),
  ('Condiments', 'flask-conical', '#EC4899'),
  ('Other', 'package', '#6B7280');

-- Insert sample barcode products
INSERT INTO public.barcode_products (barcode, name, brand, category, default_expiry_days, current_weight, unit, nutrition_info) VALUES
  ('8901030865039', 'Amul Butter', 'Amul', 'Dairy', 90, 500, 'g', '{"calories": 717, "fat": 81, "protein": 0.9, "carbs": 0.1}'),
  ('8901725181123', 'Maggi Noodles', 'Nestle', 'Grains', 365, 280, 'g', '{"calories": 312, "fat": 11, "protein": 7.3, "carbs": 47}'),
  ('8901063020108', 'Tata Salt', 'Tata', 'Condiments', 730, 1000, 'g', '{"calories": 0, "fat": 0, "protein": 0, "carbs": 0}'),
  ('8901058851854', 'Parle-G Biscuits', 'Parle', 'Snacks', 180, 800, 'g', '{"calories": 462, "fat": 14.7, "protein": 6.5, "carbs": 76.3}'),
  ('8906002560011', 'Haldiram Aloo Bhujia', 'Haldiram', 'Snacks', 120, 400, 'g', '{"calories": 570, "fat": 37, "protein": 11, "carbs": 48}'),
  ('8901262150132', 'Britannia Good Day', 'Britannia', 'Snacks', 180, 600, 'g', '{"calories": 495, "fat": 22, "protein": 6, "carbs": 68}'),
  ('8902080700394', 'Fortune Sunflower Oil', 'Adani Wilmar', 'Condiments', 365, 1000, 'ml', '{"calories": 884, "fat": 100, "protein": 0, "carbs": 0}'),
  ('8901491101189', 'Aashirvaad Atta', 'ITC', 'Grains', 180, 5000, 'g', '{"calories": 341, "fat": 1.7, "protein": 11.8, "carbs": 71.2}'),
  ('8901030000027', 'Amul Milk', 'Amul', 'Dairy', 7, 500, 'ml', '{"calories": 62, "fat": 3.5, "protein": 3.2, "carbs": 4.8}'),
  ('8904004400026', 'Kissan Tomato Ketchup', 'Hindustan Unilever', 'Condiments', 365, 500, 'g', '{"calories": 115, "fat": 0.2, "protein": 1.5, "carbs": 27}'),
  ('8901719100093', 'Lays Classic Salted', 'PepsiCo', 'Snacks', 90, 52, 'g', '{"calories": 536, "fat": 35, "protein": 6, "carbs": 52}'),
  ('8902080020010', 'Frooti Mango', 'Parle Agro', 'Beverages', 180, 600, 'ml', '{"calories": 60, "fat": 0, "protein": 0, "carbs": 15}'),
  ('8901030711121', 'Amul Cheese Slices', 'Amul', 'Dairy', 180, 200, 'g', '{"calories": 330, "fat": 27, "protein": 20, "carbs": 2}'),
  ('8906010500150', 'Paper Boat Aam Panna', 'Hector Beverages', 'Beverages', 180, 250, 'ml', '{"calories": 55, "fat": 0, "protein": 0, "carbs": 14}'),
  ('8901063157606', 'Tata Tea Gold', 'Tata', 'Beverages', 730, 500, 'g', '{"calories": 0, "fat": 0, "protein": 0, "carbs": 0}');

-- Function to sync weight readings to barcode products
CREATE OR REPLACE FUNCTION public.sync_weight_to_product()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.barcode_products 
  SET current_weight = NEW.weight, updated_at = now()
  WHERE barcode = NEW.barcode;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER sync_weight_reading AFTER INSERT ON public.weight_readings FOR EACH ROW EXECUTE FUNCTION public.sync_weight_to_product();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
