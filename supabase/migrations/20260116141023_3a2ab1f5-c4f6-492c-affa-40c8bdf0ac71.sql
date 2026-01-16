
-- Add missing columns to grocery_items table
ALTER TABLE public.grocery_items 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id),
ADD COLUMN IF NOT EXISTS quantity_type TEXT DEFAULT 'units',
ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);

-- Add missing column to device_registry
ALTER TABLE public.device_registry
ADD COLUMN IF NOT EXISTS device_token TEXT;

-- Add missing column to barcode_products 
ALTER TABLE public.barcode_products
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Update product_name from name for existing records
UPDATE public.barcode_products SET product_name = name WHERE product_name IS NULL;
