import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DownloadRequest {
  productName: string;
  category: string;
  productId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, category, productId }: DownloadRequest = await req.json();
    
    console.log(`Downloading image for product: ${productName}, category: ${category}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get appropriate image URL based on product and category
    const imageUrl = getProductImageUrl(productName, category);
    
    if (!imageUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: "No appropriate image found"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Selected image URL: ${imageUrl}`);

    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBlob = await imageResponse.blob();
    const fileName = `${productId}-${Date.now()}.jpg`;
    
    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, imageBlob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    console.log(`Image uploaded successfully: ${publicUrl}`);

    // Update the product with the new image URL
    const { error: updateError } = await supabase
      .from('grocery_items')
      .update({ image_url: publicUrl })
      .eq('id', productId);

    if (updateError) {
      console.error('Update error:', updateError);
      // Don't throw here, image was still uploaded successfully
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: publicUrl,
      fileName: fileName
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in download-product-image:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

function getProductImageUrl(productName: string, category: string): string | null {
  const name = productName.toLowerCase();
  const cat = category.toLowerCase();

  // Specific product mappings
  const specificProducts: Record<string, string> = {
    // Fruits
    'apple': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400&h=400&fit=crop',
    'banana': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
    'orange': 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=400&fit=crop',
    'grapes': 'https://images.unsplash.com/photo-1537640538966-79f369143ea8?w=400&h=400&fit=crop',
    'strawberry': 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400&h=400&fit=crop',
    'mango': 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&h=400&fit=crop',

    // Vegetables
    'tomato': 'https://images.unsplash.com/photo-1546470427-e2a5f3a9b142?w=400&h=400&fit=crop',
    'potato': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400&h=400&fit=crop',
    'onion': 'https://images.unsplash.com/photo-1587049633312-d628ae50a8ae?w=400&h=400&fit=crop',
    'carrot': 'https://images.unsplash.com/photo-1582515073490-39981397c445?w=400&h=400&fit=crop',
    'brinjal': 'https://images.unsplash.com/photo-1659261200833-ec8761558af7?w=400&h=400&fit=crop',
    'eggplant': 'https://images.unsplash.com/photo-1659261200833-ec8761558af7?w=400&h=400&fit=crop',
    'bell pepper': 'https://images.unsplash.com/photo-1525607551862-4d265363f543?w=400&h=400&fit=crop',
    'capsicum': 'https://images.unsplash.com/photo-1525607551862-4d265363f543?w=400&h=400&fit=crop',

    // Dairy
    'milk': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    'cheese': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop',
    'yogurt': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop',
    'yoghurt': 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=400&fit=crop',
    'butter': 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400&h=400&fit=crop',

    // Grains & Cereals
    'rice': 'https://images.unsplash.com/photo-1586201375761-83865001e26c?w=400&h=400&fit=crop',
    'wheat': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop',
    'bread': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    'pasta': 'https://images.unsplash.com/photo-1551892589-865f69869476?w=400&h=400&fit=crop',

    // Meat & Protein
    'chicken': 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&h=400&fit=crop',
    'beef': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop',
    'fish': 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=400&fit=crop',
    'egg': 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',
    'eggs': 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',

    // Beverages
    'coffee': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
    'tea': 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=400&fit=crop',
    'juice': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop',
    'water': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',

    // Snacks
    'chips': 'https://images.unsplash.com/photo-1621047390073-d83fcb1c64c2?w=400&h=400&fit=crop',
    'cookies': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop',
    'biscuits': 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400&h=400&fit=crop',
    'nuts': 'https://images.unsplash.com/photo-1579113800032-c38bd7635818?w=400&h=400&fit=crop',
  };

  // Check for specific product matches first
  for (const [product, url] of Object.entries(specificProducts)) {
    if (name.includes(product) || product.includes(name)) {
      return url;
    }
  }

  // Category-based fallbacks
  const categoryImages: Record<string, string> = {
    'fruits': 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&h=400&fit=crop',
    'vegetables': 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop',
    'dairy': 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop',
    'meat': 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=400&h=400&fit=crop',
    'beverages': 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop',
    'snacks': 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
    'bakery': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
    'grains': 'https://images.unsplash.com/photo-1586201375761-83865001e26c?w=400&h=400&fit=crop',
    'cereals': 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=400&fit=crop',
  };

  // Check category matches
  for (const [category, url] of Object.entries(categoryImages)) {
    if (cat.includes(category) || category.includes(cat)) {
      return url;
    }
  }

  // Default fallback
  return 'https://images.unsplash.com/photo-1586985289688-ca3cf47d3e6e?w=400&h=400&fit=crop';
}

serve(handler);