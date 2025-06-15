-- Add cascade delete constraint to notification_delivery_log if it doesn't exist
DO $$ 
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'notification_delivery_log' 
        AND constraint_name = 'notification_delivery_log_notification_id_fkey'
    ) THEN
        ALTER TABLE public.notification_delivery_log 
        DROP CONSTRAINT notification_delivery_log_notification_id_fkey;
    END IF;
    
    -- Add new constraint with cascade delete
    ALTER TABLE public.notification_delivery_log 
    ADD CONSTRAINT notification_delivery_log_notification_id_fkey 
    FOREIGN KEY (notification_id) 
    REFERENCES public.notifications(id) 
    ON DELETE CASCADE;
END $$;