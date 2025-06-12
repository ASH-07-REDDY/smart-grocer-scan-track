
-- Add columns to notifications table for enhanced product details
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES grocery_items(id);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS product_details JSONB;

-- Create a table to track notification delivery status
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'sms')),
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  delivery_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Create policies for the notification delivery log
CREATE POLICY "Users can view their own delivery logs" 
  ON notification_delivery_log 
  FOR SELECT 
  USING (
    notification_id IN (
      SELECT id FROM notifications WHERE user_id = auth.uid()
    )
  );

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_product_id ON notifications(product_id);
CREATE INDEX IF NOT EXISTS idx_delivery_log_notification_id ON notification_delivery_log(notification_id);

-- Update existing notifications to have better structure
UPDATE notifications 
SET product_details = jsonb_build_object(
  'name', COALESCE(message, ''),
  'category', 'Unknown',
  'quantity', 0,
  'quantity_type', 'pieces',
  'amount', 0
)
WHERE product_details IS NULL AND type = 'expiry';
