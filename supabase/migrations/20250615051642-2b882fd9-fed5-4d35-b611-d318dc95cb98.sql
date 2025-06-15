-- First, let's check if RLS is properly enabled and add missing policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- Create proper RLS policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Drop existing policies for notification_delivery_log if they exist
DROP POLICY IF EXISTS "Users can view their own delivery logs" ON public.notification_delivery_log;
DROP POLICY IF EXISTS "Users can create delivery logs for their notifications" ON public.notification_delivery_log;
DROP POLICY IF EXISTS "Users can update their own delivery logs" ON public.notification_delivery_log;
DROP POLICY IF EXISTS "Users can delete their own delivery logs" ON public.notification_delivery_log;

-- Create proper RLS policies for notification_delivery_log
CREATE POLICY "Users can view their own delivery logs" 
ON public.notification_delivery_log 
FOR SELECT 
USING (
  notification_id IN (
    SELECT id FROM public.notifications WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create delivery logs for their notifications" 
ON public.notification_delivery_log 
FOR INSERT 
WITH CHECK (
  notification_id IN (
    SELECT id FROM public.notifications WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own delivery logs" 
ON public.notification_delivery_log 
FOR UPDATE 
USING (
  notification_id IN (
    SELECT id FROM public.notifications WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own delivery logs" 
ON public.notification_delivery_log 
FOR DELETE 
USING (
  notification_id IN (
    SELECT id FROM public.notifications WHERE user_id = auth.uid()
  )
);

-- Ensure proper foreign key with cascade delete is set up
ALTER TABLE public.notification_delivery_log 
DROP CONSTRAINT IF EXISTS notification_delivery_log_notification_id_fkey;

ALTER TABLE public.notification_delivery_log 
ADD CONSTRAINT notification_delivery_log_notification_id_fkey 
FOREIGN KEY (notification_id) 
REFERENCES public.notifications(id) 
ON DELETE CASCADE;

-- Add cascade delete for notifications when products are deleted
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_product_id_fkey;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.grocery_items(id) 
ON DELETE CASCADE;