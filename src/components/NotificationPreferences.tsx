
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Email Notifications</Label>
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

          <div className="space-y-2">
            <Label htmlFor="reminder-days">Reminder Days Before Expiry</Label>
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
            />
            <p className="text-xs text-gray-500">
              Get notified this many days before your products expire (1-30 days)
            </p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
