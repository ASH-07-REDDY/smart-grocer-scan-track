-- Create weights table for real-time sensor data
CREATE TABLE public.weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.grocery_items(id) ON DELETE CASCADE,
  sensor_id TEXT NOT NULL,
  weight_value DECIMAL(10,3) NOT NULL, -- Weight in grams/kg with 3 decimal precision
  unit TEXT NOT NULL DEFAULT 'grams',
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  battery_level INTEGER CHECK (battery_level >= 0 AND battery_level <= 100),
  signal_strength INTEGER CHECK (signal_strength >= 0 AND signal_strength <= 100),
  temperature DECIMAL(5,2), -- Optional temperature reading
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.weights ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own weights" 
ON public.weights 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weights" 
ON public.weights 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weights" 
ON public.weights 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weights" 
ON public.weights 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_weights_user_id ON public.weights(user_id);
CREATE INDEX idx_weights_product_id ON public.weights(product_id);
CREATE INDEX idx_weights_sensor_id ON public.weights(sensor_id);
CREATE INDEX idx_weights_timestamp ON public.weights(timestamp DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_weights_updated_at
BEFORE UPDATE ON public.weights
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time functionality
ALTER TABLE public.weights REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weights;