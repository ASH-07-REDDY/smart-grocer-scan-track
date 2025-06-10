
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";

interface EditProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: any;
  onUpdateProduct: (product: any) => void;
}

export function EditProductDialog({ open, onOpenChange, product, onUpdateProduct }: EditProductDialogProps) {
  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    category: "",
    quantity: "",
    quantityType: "pieces",
    expiryDate: "",
    amount: "",
    barcode: "",
    image: ""
  });

  const categories = ["Fruits", "Vegetables", "Dairy", "Meat", "Pantry", "Frozen", "Beverages"];
  const quantityTypes = ["pieces", "kg", "grams", "litres", "ml", "packets", "boxes"];

  useEffect(() => {
    if (product) {
      setFormData({
        id: product.id,
        name: product.name || "",
        category: product.category || "",
        quantity: product.quantity?.toString() || "",
        quantityType: product.quantityType || "pieces",
        expiryDate: product.expiryDate || "",
        amount: product.amount?.replace('₹', '') || "",
        barcode: product.barcode || "",
        image: product.image || ""
      });
    }
  }, [product]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData({ ...formData, image: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProduct({
      ...formData,
      quantity: parseInt(formData.quantity),
      amount: formData.amount.startsWith('₹') ? formData.amount : `₹${formData.amount}`,
      image: formData.image || "/placeholder.svg"
    });
  };

  return (
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
                {formData.image ? (
                  <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
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
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={formData.quantityType} onValueChange={(value) => setFormData({ ...formData, quantityType: value })}>
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
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode (Optional)</Label>
            <Input
              id="barcode"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="Enter barcode"
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
  );
}
