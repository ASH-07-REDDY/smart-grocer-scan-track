
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ScanLine } from "lucide-react";
import { BarcodeScanner } from "@/components/BarcodeScanner";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  category_id: string;
  quantity: number;
  quantity_type: string;
  expiry_date: string;
  amount: number;
  image_url: string;
  barcode: string;
}

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onUpdateProduct: (product: any) => void;
  categories: Category[];
}

export function EditProductDialog({ open, onOpenChange, product, onUpdateProduct, categories }: EditProductDialogProps) {
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    category_id: "",
    quantity: "",
    quantity_type: "pieces",
    expiry_date: "",
    amount: "",
    image_url: "",
    barcode: ""
  });
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const quantityTypes = ["pieces", "kg", "grams", "litres", "ml", "packets", "boxes"];

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.name || "",
        category_id: product.category_id || "",
        quantity: product.quantity?.toString() || "",
        quantity_type: product.quantity_type || "pieces",
        expiry_date: product.expiry_date || "",
        amount: product.amount?.toString() || "",
        image_url: product.image_url || "",
        barcode: product.barcode || ""
      });
    }
  }, [product]);

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

  const handleBarcodeScanned = (barcode: string, productData?: any) => {
    setFormData({ ...formData, barcode });
    setShowBarcodeScanner(false);
    
    // If product data is available, optionally update other fields
    if (productData) {
      const categoryMatch = categories.find(c => 
        c.name.toLowerCase() === productData.category?.toLowerCase()
      );
      
      setFormData(prev => ({
        ...prev,
        barcode,
        // Only update if fields are empty
        name: prev.name || productData.product_name || prev.name,
        category_id: prev.category_id || categoryMatch?.id || prev.category_id,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProduct({
      ...formData,
      quantity: parseInt(formData.quantity),
      amount: parseFloat(formData.amount) || 0,
      image_url: formData.image_url || "/placeholder.svg"
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <Label htmlFor="barcode">Barcode</Label>
              <div className="flex gap-2">
                <Input
                  id="barcode"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="Enter barcode or scan"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBarcodeScanner(true)}
                  className="px-3"
                >
                  <ScanLine className="w-4 h-4" />
                </Button>
              </div>
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
                  Total price for {formData.quantity} {formData.quantity_type}
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
                Update Product
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={showBarcodeScanner}
        onOpenChange={setShowBarcodeScanner}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </>
  );
}
