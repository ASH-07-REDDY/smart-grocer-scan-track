
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useNotificationSystem() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const checkExpiryNotifications = async () => {
      try {
        console.log('Checking for expiring products...');
        
        // Get user's notification preferences
        const { data: preferences } = await supabase
          .from('user_notification_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        const reminderDays = preferences?.expiry_reminder_days || 3;
        
        // Calculate date range for expiring products
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + reminderDays);

        // Fetch products expiring within the reminder period
        const { data: expiringProducts, error } = await supabase
          .from('grocery_items')
          .select(`
            *,
            categories (name)
          `)
          .eq('user_id', user.id)
          .gte('expiry_date', today.toISOString().split('T')[0])
          .lte('expiry_date', futureDate.toISOString().split('T')[0]);

        if (error) {
          console.error('Error fetching expiring products:', error);
          return;
        }

        if (!expiringProducts?.length) {
          console.log('No expiring products found');
          return;
        }

        console.log(`Found ${expiringProducts.length} expiring products`);

        // Process each expiring product
        for (const product of expiringProducts) {
          const expiryDate = new Date(product.expiry_date);
          const diffTime = expiryDate.getTime() - today.getTime();
          const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Check if we already sent a notification for this product today
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', product.id)
            .eq('type', 'expiry')
            .gte('created_at', today.toISOString().split('T')[0])
            .maybeSingle();

          if (existingNotification) {
            console.log(`Notification already sent for product ${product.name} today`);
            continue;
          }

          // Send notification via edge function
          await sendNotification({
            user_id: user.id,
            product: {
              id: product.id,
              name: product.name,
              category: product.categories?.name || 'Uncategorized',
              quantity: product.quantity || 0,
              quantity_type: product.quantity_type || 'pieces',
              amount: product.amount || 0,
              expiry_date: product.expiry_date
            },
            notification_type: 'expiry',
            days_until_expiry: daysUntilExpiry
          });

          console.log(`Notification sent for ${product.name} (expires in ${daysUntilExpiry} days)`);
        }

      } catch (error) {
        console.error('Error in notification check:', error);
      }
    };

    // Initial check
    checkExpiryNotifications();

    // Set up interval to check every hour
    const interval = setInterval(checkExpiryNotifications, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  const sendNotification = async (payload: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-notifications', {
        body: payload
      });

      if (error) {
        console.error('Error sending notification:', error);
        toast({
          title: "Notification Error",
          description: "Failed to send notification",
          variant: "destructive",
        });
        return;
      }

      console.log('Notification sent successfully:', data);
    } catch (error) {
      console.error('Error invoking notification function:', error);
    }
  };

  const sendProductNotification = async (
    productId: string, 
    notificationType: 'product_added' | 'product_removed'
  ) => {
    if (!user) return;

    try {
      // Fetch product details
      const { data: product, error } = await supabase
        .from('grocery_items')
        .select(`
          *,
          categories (name)
        `)
        .eq('id', productId)
        .eq('user_id', user.id)
        .single();

      if (error || !product) {
        console.error('Error fetching product for notification:', error);
        return;
      }

      await sendNotification({
        user_id: user.id,
        product: {
          id: product.id,
          name: product.name,
          category: product.categories?.name || 'Uncategorized',
          quantity: product.quantity || 0,
          quantity_type: product.quantity_type || 'pieces',
          amount: product.amount || 0,
          expiry_date: product.expiry_date
        },
        notification_type: notificationType
      });

    } catch (error) {
      console.error('Error sending product notification:', error);
    }
  };

  return {
    sendProductNotification
  };
}
