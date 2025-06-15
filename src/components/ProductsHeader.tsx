
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { useAutoImageAssignment } from "@/hooks/useAutoImageAssignment";
import { Plus, ScanLine, Bell, Images } from "lucide-react";

interface Product {
  id: string;
  name: string;
  category_id: string;
  image_url: string;
  categories?: { name: string };
}

interface ProductsHeaderProps {
  showNotificationSettings: boolean;
  setShowNotificationSettings: (show: boolean) => void;
  setShowScanner: (show: boolean) => void;
  onAddProduct: () => void;
  products?: Product[];
  getCategoryName?: (categoryId: string) => string;
}

export function ProductsHeader({ 
  showNotificationSettings, 
  setShowNotificationSettings, 
  setShowScanner, 
  onAddProduct,
  products = [],
  getCategoryName = () => "Unknown"
}: ProductsHeaderProps) {
  const { bulkAssignImages, downloading } = useAutoImageAssignment();

  const handleBulkImageAssignment = async () => {
    if (products.length === 0) return;
    
    const productData = products.map(product => ({
      id: product.id,
      name: product.name,
      category: getCategoryName(product.category_id),
      currentImage: product.image_url
    }));

    await bulkAssignImages(productData);
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Smart Pantry</h1>
        <p className="text-gray-600">Intelligent grocery inventory management</p>
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
        <Button 
          onClick={handleBulkImageAssignment} 
          variant="outline" 
          size="lg"
          disabled={downloading || products.length === 0}
          title="Generate AI images for all products"
        >
          <Images className={`w-4 h-4 mr-2 ${downloading ? 'animate-spin' : ''}`} />
          {downloading ? 'Generating...' : 'Generate Images'}
        </Button>
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
