-- Insert barcode products into the barcode_products table
INSERT INTO public.barcode_products (barcode, product_name, brand, category, default_expiry_days) VALUES
('123456789012', 'Apple', 'Fresh Produce', 'Fruits', 7),
('234567890123', 'Bananas', 'Fresh Produce', 'Fruits', 5),
('345678901234', 'Biscuits', 'Parle', 'Snacks', 30),
('456789012345', 'Chips', 'Lays', 'Snacks', 45),
('567890123456', 'Oranges', 'Fresh Produce', 'Fruits', 10),
('678901234567', 'Potatoes', 'Fresh Produce', 'Vegetables', 14),
('789012345678', 'Onions', 'Fresh Produce', 'Vegetables', 21),
('890123456789', 'Tomatoes', 'Fresh Produce', 'Vegetables', 7)
ON CONFLICT (barcode) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  brand = EXCLUDED.brand,
  category = EXCLUDED.category,
  default_expiry_days = EXCLUDED.default_expiry_days;