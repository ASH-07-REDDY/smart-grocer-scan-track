-- First, let's clean up duplicate notification preferences and keep only the latest one
DELETE FROM user_notification_preferences 
WHERE user_id = '3424388f-d99f-4e58-b319-bfaefabbe350' 
AND id NOT IN (
  SELECT id FROM user_notification_preferences 
  WHERE user_id = '3424388f-d99f-4e58-b319-bfaefabbe350' 
  ORDER BY created_at DESC 
  LIMIT 1
);

-- Add a unique constraint to prevent duplicate user preferences
ALTER TABLE user_notification_preferences 
ADD CONSTRAINT unique_user_notification_preferences 
UNIQUE (user_id);