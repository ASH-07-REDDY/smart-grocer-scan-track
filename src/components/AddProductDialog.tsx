
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Scan } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddProduct: (product: any) => void;
  categories: Category[];
  initialBarcodeData?: any;
}

// Product images for common items
const productImages = {
  "Organic Bananas": "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400",
  "Bananas": "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400",
  "Milk": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
  "Whole Milk": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400",
  "Chicken": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400",
  "Chicken Breast": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400",
  "Apples": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400",
  "Bread": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
  "Eggs": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400",
  "Rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400",
  "Tomatoes": "https://images.unsplash.com/photo-1546470427-e9e3c520c9ba?w=400",
  "Onions": "https://images.unsplash.com/photo-1583983088295-726262f04d7e?w=400",
  "Potatoes": "https://images.unsplash.com/photo-1582515073490-39981397c445?w=400",
  "Cheese": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32b?w=400",
  "Yogurt": "https://images.unsplash.com/photo-1567806215840-fb4d7fd3b5b6?w=400",
  "Orange Juice": "https://images.unsplash.com/photo-1592504002016-481c7de84e26?w=400",
  "Pasta": "https://images.unsplash.com/photo-1621996346565-e3dbc6d2c5f7?w=400",
};

export function AddProductDialog({ open, onOpenChange, onAddProduct, categories, initialBarcodeData }: AddProductDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    category_id: "",
    quantity: "",
    quantity_type: "pieces",
    expiry_date: "",
    amount: "",
    image_url: "",
    barcode: ""
  });

  const quantityTypes = ["pieces", "kg", "grams", "litres", "ml", "packets", "boxes"];

  // Populate form with barcode data when available
  useEffect(() => {
    if (initialBarcodeData && open) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + (initialBarcodeData.default_expiry_days || 30));
      
      setFormData(prev => ({
        ...prev,
        name: initialBarcodeData.product_name || "",
        barcode: initialBarcodeData.barcode || "",
        expiry_date: expiryDate.toISOString().split('T')[0],
        // Try to match category by name
        category_id: categories.find(cat => 
          cat.name.toLowerCase() === initialBarcodeData.category?.toLowerCase()
        )?.id || "",
      }));

      // Auto-suggest image based on product name
      const matchedImage = Object.entries(productImages).find(([key]) => 
        initialBarcodeData.product_name?.toLowerCase().includes(key.toLowerCase()) || 
        key.toLowerCase().includes(initialBarcodeData.product_name?.toLowerCase())
      );
      
      if (matchedImage) {
        setFormData(prev => ({ ...prev, image_url: matchedImage[1] }));
      }
    }
  }, [initialBarcodeData, open, categories]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData({ ...formData, image_url: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name });
    
    // Auto-suggest image based on product name
    const matchedImage = Object.entries(productImages).find(([key]) => 
      name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(name.toLowerCase())
    );
    
    if (matchedImage && !formData.image_url) {
      setFormData(prev => ({ ...prev, image_url: matchedImage[1] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddProduct({
      ...formData,
      quantity: parseInt(formData.quantity),
      amount: parseFloat(formData.amount) || 0,
      image_url: formData.image_url || "/placeholder.svg"
    });
    setFormData({
      name: "",
      category_id: "",
      quantity: "",
      quantity_type: "pieces",
      expiry_date: "",
      amount: "",
      image_url: "",
      barcode: ""
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {initialBarcodeData && <Scan className="w-5 h-5" />}
            {initialBarcodeData ? "Add Scanned Product" : "Add New Product"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Barcode Display */}
          {initialBarcodeData && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-800">
                Scanned Barcode: {initialBarcodeData.barcode}
              </div>
              <div className="text-xs text-green-600">
                Product details have been pre-filled from our database
              </div>
            </div>
          )}

          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Product Image</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {formData.image_url ? (
                  <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="flex-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter product name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Barcode Field */}
          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode (Optional)</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Enter barcode manually"
              readOnly={!!initialBarcodeData}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
                required
                min="1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantityType">Unit</Label>
              <Select value={formData.quantity_type} onValueChange={(value) => setFormData({ ...formData, quantity_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quantityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="amount">Total Price (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                required
              />
              <div className="text-xs text-gray-500">
                Enter total price for {formData.quantity} {formData.quantity_type}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
