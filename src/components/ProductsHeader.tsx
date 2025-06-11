
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { Plus, ScanLine, Bell } from "lucide-react";

interface ProductsHeaderProps {
  showNotificationSettings: boolean;
  setShowNotificationSettings: (show: boolean) => void;
  setShowScanner: (show: boolean) => void;
  onAddProduct: () => void;
}

export function ProductsHeader({ 
  showNotificationSettings, 
  setShowNotificationSettings, 
  setShowScanner, 
  onAddProduct 
}: ProductsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Products in Pantry</h1>
        <p className="text-gray-600">Manage your grocery inventory</p>
      </div>
      <div className="flex gap-2">
        <Dialog open={showNotificationSettings} onOpenChange={setShowNotificationSettings}>
          <DialogTrigger asChild>
            <Button variant="outline" size="lg">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Notification Settings</DialogTitle>
            </DialogHeader>
            <NotificationPreferences />
          </DialogContent>
        </Dialog>
        <Button onClick={() => setShowScanner(true)} variant="outline" size="lg">
          <ScanLine className="w-4 h-4 mr-2" />
          Scan Barcode
        </Button>
        <Button onClick={onAddProduct} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>
    </div>
  );
}
