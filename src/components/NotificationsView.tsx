
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Package, Trash2, CheckCircle, AlertTriangle, TrashIcon } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'expiry' | 'expired' | 'product_added' | 'product_removed';
  is_read: boolean;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
  expiry_date: string;
}

export function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expiringProducts, setExpiringProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    
    // Fetch existing notifications
    const { data: notificationsData, error: notificationsError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
    } else {
      const typedNotifications = (notificationsData || []).map(notification => ({
        ...notification,
        type: notification.type as 'expiry' | 'expired' | 'product_added' | 'product_removed'
      }));
      setNotifications(typedNotifications);
    }

    // Fetch products expiring soon (not expired)
    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const { data: productsData, error: productsError } = await supabase
      .from('grocery_items')
      .select('id, name, expiry_date')
      .eq('user_id', user.id)
      .gte('expiry_date', today.toISOString().split('T')[0])  // Only future dates
      .lte('expiry_date', threeDaysFromNow.toISOString().split('T')[0]);

    if (productsError) {
      console.error('Error fetching expiring products:', productsError);
    } else {
      setExpiringProducts(productsData || []);
    }

    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user?.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    } else {
      // Update local state
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user?.id);

    if (error) {
      console.error('Error deleting notification:', error);
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    } else {
      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      toast({
        title: "Success",
        description: "Notification deleted",
      });
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    } else {
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    }
  };

  const deleteAllNotifications = async () => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user?.id);

    if (error) {
      console.error('Error deleting all notifications:', error);
      toast({
        title: "Error",
        description: "Failed to delete all notifications",
        variant: "destructive",
      });
    } else {
      setNotifications([]);
      toast({
        title: "Success",
        description: "All notifications deleted",
      });
    }
  };

  const deleteReadNotifications = async () => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user?.id)
      .eq('is_read', true);

    if (error) {
      console.error('Error deleting read notifications:', error);
      toast({
        title: "Error",
        description: "Failed to delete read notifications",
        variant: "destructive",
      });
    } else {
      setNotifications(prev => prev.filter(n => !n.is_read));
      toast({
        title: "Success",
        description: "Read notifications deleted",
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'expiry':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'product_added':
        return <Package className="w-5 h-5 text-green-500" />;
      case 'product_removed':
        return <Trash2 className="w-5 h-5 text-red-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case 'expiry':
        return 'destructive';
      case 'expired':
        return 'destructive';
      case 'product_added':
        return 'default';
      case 'product_removed':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            Stay updated with expiry alerts and inventory changes
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline">
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark All Read ({unreadCount})
            </Button>
          )}
          {notifications.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={deleteReadNotifications}>
                  Delete Read Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={deleteAllNotifications}
                  className="text-red-600 focus:text-red-600"
                >
                  Delete All Notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unread Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiringProducts.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{notifications.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    notification.is_read 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{notification.title}</h4>
                          <Badge variant={getNotificationBadgeVariant(notification.type)} className="text-xs">
                            {notification.type.replace('_', ' ')}
                          </Badge>
                          {!notification.is_read && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!notification.is_read && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNotification(notification.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expiring Products */}
      {expiringProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Products Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringProducts.map((product) => {
                const expiryDate = new Date(product.expiry_date);
                const today = new Date();
                const diffTime = expiryDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-gray-600">
                        Expires: {expiryDate.toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays} days`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
