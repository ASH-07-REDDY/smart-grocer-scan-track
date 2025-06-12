
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface NotificationPrefs {
  email_notifications: boolean;
  phone_notifications: boolean;
  phone_number: string;
  expiry_reminder_days: number;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email_notifications: true,
    phone_notifications: false,
    phone_number: '',
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

      // Take the first record if multiple exist
      if (data && data.length > 0) {
        const preference = data[0];
        setPrefs({
          email_notifications: preference.email_notifications || false,
          phone_notifications: preference.phone_notifications || false,
          phone_number: preference.phone_number || '',
          expiry_reminder_days: preference.expiry_reminder_days || 3,
        });
      }
    };

    fetchPreferences();
  }, [user]);

  const validateIndianPhoneNumber = (phone: string): boolean => {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it starts with +91 or 91 and has 10 more digits
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      return true;
    }
    
    // Check if it's just 10 digits (assuming Indian number)
    if (cleanPhone.length === 10) {
      return true;
    }
    
    return false;
  };

  const formatIndianPhoneNumber = (phone: string): string => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    if (cleanPhone.length === 10) {
      return `+91${cleanPhone}`;
    }
    
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      return `+${cleanPhone}`;
    }
    
    return phone;
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate phone number if phone notifications are enabled
    if (prefs.phone_notifications) {
      if (!prefs.phone_number) {
        toast({
          title: 'Validation Error',
          description: 'Phone number is required for SMS notifications',
          variant: 'destructive',
        });
        return;
      }

      if (!validateIndianPhoneNumber(prefs.phone_number)) {
        toast({
          title: 'Invalid Phone Number',
          description: 'Please enter a valid Indian phone number (10 digits or +91 followed by 10 digits)',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      const formattedPhoneNumber = prefs.phone_number ? formatIndianPhoneNumber(prefs.phone_number) : null;

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert([
          {
            user_id: user.id,
            email_notifications: prefs.email_notifications,
            phone_notifications: prefs.phone_notifications,
            phone_number: formattedPhoneNumber,
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
                Receive expiry reminders via email
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

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="phone-notifications">SMS Notifications</Label>
              <p className="text-sm text-gray-500">
                Receive expiry reminders via SMS (Indian numbers only)
              </p>
            </div>
            <Switch
              id="phone-notifications"
              checked={prefs.phone_notifications}
              onCheckedChange={(checked) =>
                setPrefs({ ...prefs, phone_notifications: checked })
              }
            />
          </div>

          {prefs.phone_notifications && (
            <div className="space-y-2">
              <Label htmlFor="phone-number">Indian Phone Number</Label>
              <Input
                id="phone-number"
                type="tel"
                value={prefs.phone_number}
                onChange={(e) =>
                  setPrefs({ ...prefs, phone_number: e.target.value })
                }
                placeholder="+91 9876543210 or 9876543210"
              />
              <p className="text-xs text-gray-500">
                Enter a valid Indian phone number (10 digits or +91 followed by 10 digits)
              </p>
            </div>
          )}

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
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  );
}
