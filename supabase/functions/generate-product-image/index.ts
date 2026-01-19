import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageRequest {
  productName: string;
  category?: string;
}

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, category }: ImageRequest = await req.json();
    
    console.log(`Generating image for product: ${productName}, category: ${category}`);
    
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ 
        success: false,
        error: "AI service not configured" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create optimized prompts for better image generation
    const categoryContext = category ? ` ${category} item` : '';
    const prompt = `Professional product photography of ${productName}${categoryContext}, clean white background, commercial photography, high quality, centered, well-lit, studio lighting, e-commerce style`;

    console.log(`Using prompt: ${prompt}`);

    // Use Lovable AI Gateway with Gemini model
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", errorText);
      
      // Retry with simpler prompt
      console.log("Retrying with simpler prompt...");
      const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: `${productName} product photo, white background`
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!retryResponse.ok) {
        const retryErrorText = await retryResponse.text();
        console.error("Retry failed:", retryErrorText);
        return new Response(JSON.stringify({ 
          success: false,
          error: "Failed to generate image after retry" 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const retryData = await retryResponse.json();
      const retryImages = retryData.choices?.[0]?.message?.images;
      
      if (retryImages && retryImages.length > 0 && retryImages[0]?.image_url?.url) {
        const imageUrl = retryImages[0].image_url.url;
        console.log("Image generated successfully on retry");
        
        // Upload to Supabase Storage
        const uploadedUrl = await uploadToSupabase(imageUrl, productName);
        
        return new Response(JSON.stringify({ 
          success: true, 
          imageUrl: uploadedUrl,
          prompt: `${productName} product photo`
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ 
        success: false,
        error: "No image generated on retry" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const data = await response.json();
    const images = data.choices?.[0]?.message?.images;

    if (!images || images.length === 0 || !images[0]?.image_url?.url) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "No image generated" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const imageUrl = images[0].image_url.url;
    console.log("Image generated successfully");
    
    // Upload to Supabase Storage
    const uploadedUrl = await uploadToSupabase(imageUrl, productName);
    
    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: uploadedUrl,
      prompt: prompt
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error generating product image:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function uploadToSupabase(imageUrl: string, productName: string): Promise<string> {
  try {
    let uint8Array: Uint8Array;
    const productId = `${productName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;

    if (imageUrl.startsWith('data:image/')) {
      console.log("Processing base64 image");
      const base64Data = imageUrl.split(',')[1];
      const binaryString = atob(base64Data);
      uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
    } else {
      console.log(`Downloading image from URL`);
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      uint8Array = new Uint8Array(imageBuffer);
    }

    const bucket = "product-images";
    const fileName = `${productId}.png`;

    console.log(`Uploading to Supabase: ${bucket}/${fileName}`);
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, uint8Array, {
        contentType: "image/png",
        upsert: true
      });

    if (error) {
      console.error("Supabase upload error:", error);
      // Return the original URL if upload fails
      return imageUrl;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log("Public URL generated:", publicUrl);
    return publicUrl;

  } catch (error) {
    console.error("Upload to Supabase failed:", error);
    // Return original URL as fallback
    return imageUrl;
  }
}

serve(handler);
