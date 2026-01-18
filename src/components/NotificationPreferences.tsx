import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Mail, Calendar, Bell, Phone, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  const validatePhoneNumber = (phone: string): boolean => {
    // Validate phone number format: +country code followed by digits
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate phone number if SMS is enabled
    if (prefs.phone_notifications && !validatePhoneNumber(prefs.phone_number)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number with country code (e.g., +911234567890)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert([
          {
            user_id: user.id,
            email_notifications: prefs.email_notifications,
            phone_notifications: prefs.phone_notifications,
            phone_number: prefs.phone_notifications ? prefs.phone_number.replace(/\s/g, '') : null,
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

  const testEmailNotification = async () => {
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
      const testProductId = crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('send-notifications', {
        body: {
          user_id: user.id,
          product: {
            id: testProductId,
            name: 'Test Product',
            category: 'Test Category',
            quantity: 1,
            quantity_type: 'piece',
            amount: 50,
            expiry_date: new Date().toISOString().split('T')[0]
          },
          notification_type: 'expiring',
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
          description: data?.email_sent ? 'Test email sent successfully' : 'Notification created but email may not have been sent',
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

  const testSMSNotification = async () => {
    if (!user || !prefs.phone_notifications) {
      toast({
        title: 'SMS Notifications Disabled',
        description: 'Please enable SMS notifications to test',
        variant: 'destructive',
      });
      return;
    }

    if (!validatePhoneNumber(prefs.phone_number)) {
      toast({
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number first',
        variant: 'destructive',
      });
      return;
    }

    // Save preferences first to ensure phone number is stored
    await handleSave();

    setLoading(true);
    try {
      const testProductId = crypto.randomUUID();
      
      const { data, error } = await supabase.functions.invoke('send-notifications', {
        body: {
          user_id: user.id,
          product: {
            id: testProductId,
            name: 'Test Product',
            category: 'Test Category',
            quantity: 1,
            quantity_type: 'piece',
            amount: 50,
            expiry_date: new Date().toISOString().split('T')[0]
          },
          notification_type: 'expiring',
          days_until_expiry: 0 // Today = urgent, triggers SMS
        }
      });

      if (error) {
        console.error('Test SMS error:', error);
        toast({
          title: 'Test Failed',
          description: 'Failed to send test SMS',
          variant: 'destructive',
        });
      } else {
        console.log('Test SMS result:', data);
        if (data?.sms_sent) {
          toast({
            title: 'SMS Sent!',
            description: 'Test SMS sent successfully to your phone',
          });
        } else {
          toast({
            title: 'SMS Not Sent',
            description: data?.sms_error || 'SMS could not be sent. Check Twilio configuration.',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error sending test SMS:', error);
      toast({
        title: 'Test Failed',
        description: 'Failed to send test SMS',
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
          Notification Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Email Notifications */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <Label htmlFor="email-notifications" className="font-medium">Email Notifications</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Receive expiry reminders and product updates via email (once per day per product)
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

          {/* SMS Notifications */}
          <div className="p-4 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-green-500" />
                  <Label htmlFor="sms-notifications" className="font-medium">SMS Alerts</Label>
                  <Badge variant="secondary" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Urgent Only
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Get SMS alerts for products expiring today or tomorrow (urgent alerts only)
                </p>
              </div>
              <Switch
                id="sms-notifications"
                checked={prefs.phone_notifications}
                onCheckedChange={(checked) =>
                  setPrefs({ ...prefs, phone_notifications: checked })
                }
              />
            </div>

            {prefs.phone_notifications && (
              <div className="space-y-2 pl-6 border-l-2 border-green-200">
                <Label htmlFor="phone-number" className="text-sm font-medium">Phone Number</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="+911234567890"
                  value={prefs.phone_number}
                  onChange={(e) => setPrefs({ ...prefs, phone_number: e.target.value })}
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g., +91 for India, +1 for USA)
                </p>
              </div>
            )}
          </div>

          {/* Reminder Days */}
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
            <p className="text-xs text-muted-foreground">
              Get notified this many days before your products expire (1-30 days)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={loading} className="flex-1 min-w-[120px]">
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
          <Button 
            onClick={testEmailNotification} 
            disabled={loading || !prefs.email_notifications} 
            variant="outline"
          >
            Test Email
          </Button>
          <Button 
            onClick={testSMSNotification} 
            disabled={loading || !prefs.phone_notifications || !prefs.phone_number} 
            variant="outline"
          >
            Test SMS
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Notification Types
          </h4>
          <ul className="space-y-1 text-muted-foreground text-xs">
            <li>• <strong>Email:</strong> Product added, removed, expiring soon, expired</li>
            <li>• <strong>SMS:</strong> Only urgent alerts (expires today/tomorrow, or already expired)</li>
            <li>• Standard SMS rates may apply based on your carrier</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
