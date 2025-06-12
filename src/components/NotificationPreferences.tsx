
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Calendar, Bell } from 'lucide-react';

interface NotificationPrefs {
  email_notifications: boolean;
  expiry_reminder_days: number;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_notifications: true,
    expiry_reminder_days: 3,
  });

  useEffect(() => {
    if (!user) return;

    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('Error fetching preferences:', error);
        return;
      }

      if (data && data.length > 0) {
        const preference = data[0];
        setPrefs({
          email_notifications: preference.email_notifications || false,
          expiry_reminder_days: preference.expiry_reminder_days || 3,
        });
      }
    };

    fetchPreferences();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert([
          {
            user_id: user.id,
            email_notifications: prefs.email_notifications,
            phone_notifications: false,
            phone_number: null,
            expiry_reminder_days: prefs.expiry_reminder_days,
            updated_at: new Date().toISOString(),
          }
        ]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Notification preferences saved successfully',
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    if (!user || !prefs.email_notifications) {
      toast({
        title: 'Email Notifications Disabled',
        description: 'Please enable email notifications to test',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-notifications', {
        body: {
          user_id: user.id,
          product: {
            id: 'test-product-id',
            name: 'Test Product',
            category: 'Test Category',
            quantity: 1,
            quantity_type: 'piece',
            amount: 50,
            expiry_date: new Date().toISOString().split('T')[0]
          },
          notification_type: 'expiry',
          days_until_expiry: 1
        }
      });

      if (error) {
        console.error('Test notification error:', error);
        toast({
          title: 'Test Failed',
          description: 'Failed to send test notification',
          variant: 'destructive',
        });
      } else {
        console.log('Test notification result:', data);
        toast({
          title: 'Test Successful',
          description: 'Test email notification sent successfully',
        });
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Email Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
              </div>
              <p className="text-sm text-gray-500">
                Receive expiry reminders and product updates via email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={prefs.email_notifications}
              onCheckedChange={(checked) =>
                setPrefs({ ...prefs, email_notifications: checked })
              }
            />
          </div>

          <div className="space-y-2 p-4 border rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <Label htmlFor="reminder-days" className="font-medium">Reminder Days Before Expiry</Label>
            </div>
            <Input
              id="reminder-days"
              type="number"
              min="1"
              max="30"
              value={prefs.expiry_reminder_days}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  expiry_reminder_days: parseInt(e.target.value) || 3,
                })
              }
              className="w-24"
            />
            <p className="text-xs text-gray-500">
              Get notified this many days before your products expire (1-30 days)
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
          <Button 
            onClick={testNotification} 
            disabled={loading || !prefs.email_notifications} 
            variant="outline"
          >
            Test Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
