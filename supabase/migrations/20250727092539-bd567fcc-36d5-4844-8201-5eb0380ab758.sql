-- Create waste_items table for tracking wasted products
CREATE TABLE public.waste_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT,
  quantity INTEGER,
  quantity_type TEXT,
  amount NUMERIC,
  waste_reason TEXT NOT NULL,
  waste_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waste_items ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own waste items" 
ON public.waste_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own waste items" 
ON public.waste_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own waste items" 
ON public.waste_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own waste items" 
ON public.waste_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_waste_items_updated_at
BEFORE UPDATE ON public.waste_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();