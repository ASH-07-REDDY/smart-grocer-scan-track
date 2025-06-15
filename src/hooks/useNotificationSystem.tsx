
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

        if (!preferences?.email_notifications) {
          console.log('Email notifications disabled for user');
          return;
        }

        const reminderDays = preferences?.expiry_reminder_days || 3;
        const today = new Date();
        
        // Check for expired products first
        const { data: expiredProducts, error: expiredError } = await supabase
          .from('grocery_items')
          .select(`
            *,
            categories (name)
          `)
          .eq('user_id', user.id)
          .lt('expiry_date', today.toISOString().split('T')[0]);

        if (!expiredError && expiredProducts?.length > 0) {
          for (const product of expiredProducts) {
            // Check if we already sent an expired notification for this product
            const { data: existingExpiredNotification } = await supabase
              .from('notifications')
              .select('id')
              .eq('user_id', user.id)
              .eq('product_id', product.id)
              .eq('type', 'expired')
              .maybeSingle();

            if (!existingExpiredNotification) {
              // Send expired notification
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
                notification_type: 'expired'
              });
              console.log(`Expired notification sent for ${product.name}`);
            }
          }
        }
        
        // Calculate date range for expiring products
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + reminderDays);

        // Fetch products expiring within the reminder period (not expired)
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

          // Check if we already sent ANY expiry notification for this product (not just today)
          // We only want ONE notification per product when it starts expiring
          const { data: existingNotification } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', user.id)
            .eq('product_id', product.id)
            .eq('type', 'expiry')
            .maybeSingle();

          if (existingNotification) {
            console.log(`Expiry notification already exists for product ${product.name}`);
            continue;
          }

          // Send notification via edge function
          const result = await sendNotification({
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

          if (result.success) {
            console.log(`Email notification sent successfully for ${product.name} (expires in ${daysUntilExpiry} days)`);
          } else {
            console.error(`Failed to send notification for ${product.name}:`, result.error);
          }
        }

      } catch (error) {
        console.error('Error in notification check:', error);
      }
    };

    // Initial check
    checkExpiryNotifications();

    // Set up interval to check every 6 hours
    const interval = setInterval(checkExpiryNotifications, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, toast]);

  const sendNotification = async (payload: any) => {
    try {
      console.log('Sending notification with payload:', payload);
      
      const { data, error } = await supabase.functions.invoke('send-notifications', {
        body: payload
      });

      if (error) {
        console.error('Error sending notification:', error);
        return { success: false, error };
      }

      console.log('Email notification sent successfully:', data);
      return { success: true, data };
    } catch (error) {
      console.error('Error invoking notification function:', error);
      return { success: false, error };
    }
  };

  // Only check for expiry notifications when products are added
  const checkNewProductExpiry = async (productId: string) => {
    if (!user) return;

    try {
      // Get user's notification preferences
      const { data: preferences } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!preferences?.email_notifications) {
        console.log('Email notifications disabled for user');
        return;
      }

      const reminderDays = preferences?.expiry_reminder_days || 3;
      
      // Fetch the product details
      const { data: product, error } = await supabase
        .from('grocery_items')
        .select(`
          *,
          categories (name)
        `)
        .eq('id', productId)
        .eq('user_id', user.id)
        .single();

      if (error || !product || !product.expiry_date) {
        return; // No expiry date, no notification needed
      }

      // Check if product is expiring within reminder period
      const today = new Date();
      const expiryDate = new Date(product.expiry_date);
      const diffTime = expiryDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= reminderDays && daysUntilExpiry >= 0) {
        // Check if we already have a notification for this product
        const { data: existingNotification } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', product.id)
          .eq('type', 'expiry')
          .maybeSingle();

        if (!existingNotification) {
          // Send expiry notification
          const result = await sendNotification({
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

          if (result.success) {
            console.log(`Expiry notification sent for newly added product ${product.name}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking new product expiry:', error);
    }
  };

  return {
    checkNewProductExpiry
  };
}
