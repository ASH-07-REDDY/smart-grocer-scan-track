import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, category, productId } = await req.json();

    if (!productName || !productId) {
      return new Response(JSON.stringify({ success: false, error: "Missing productName or productId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log(`Generating AI image for product: ${productName} (${category})`);

    const prompt = generatePrompt(productName, category);
    console.log("Prompt for image generation:", prompt);

    // Use Lovable AI Gateway with Gemini model
    let result = await generateWithLovableGateway(prompt);
    
    if (!result.success) {
      // Retry with simpler prompt
      console.log("Retrying with simple fallback prompt...");
      result = await generateWithLovableGateway(`${productName}, product photo, white background`);
    }

    if (!result.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to generate image",
        details: result.error 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    // Upload to Supabase Storage
    console.log("Uploading image to Supabase storage...");
    const uploadedUrl = await uploadToSupabase(result.imageUrl, productId);
    
    console.log(`Image successfully generated and uploaded: ${uploadedUrl}`);
    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: uploadedUrl,
      provider: "Lovable AI Gateway (Gemini)"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "An error occurred during image generation",
      provider: "Error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
});

// ---------------------- PROMPT GENERATOR ----------------------
function generatePrompt(name: string, category: string): string {
  const stylePrompt = ", clean white background, commercial photography, centered, high resolution, professional lighting";
  const categoryPrompt = category ? `, ${category} product` : "";
  return `Professional product photo of ${name}${categoryPrompt}${stylePrompt}`;
}

// ---------------------- LOVABLE AI GATEWAY IMAGE GENERATOR ----------------------
async function generateWithLovableGateway(prompt: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("LOVABLE_API_KEY not found");
    return { success: false, error: "Missing LOVABLE_API_KEY" };
  }

  try {
    console.log(`Generating image with Lovable Gateway, prompt: ${prompt}`);
    
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
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
      })
    });

    const data = await res.json();
    console.log("Lovable Gateway response status:", res.status);
    
    if (!res.ok) {
      console.error("Lovable Gateway API error:", data);
      return { success: false, error: data.error?.message || `HTTP ${res.status}` };
    }

    // Extract image from response
    const images = data.choices?.[0]?.message?.images;
    if (images && images.length > 0 && images[0]?.image_url?.url) {
      console.log("Lovable Gateway image generation successful");
      return { success: true, imageUrl: images[0].image_url.url };
    } else {
      console.error("No image in response:", data);
      return { success: false, error: "No image generated" };
    }
  } catch (e) {
    console.error("Lovable Gateway fetch error:", e);
    return { success: false, error: e.message };
  }
}

// ---------------------- SUPABASE STORAGE UPLOAD ----------------------
async function uploadToSupabase(imageUrl: string, productId: string): Promise<string> {
  try {
    let uint8Array: Uint8Array;

    if (imageUrl.startsWith('data:image/')) {
      // Handle base64 images
      console.log("Processing base64 image");
      const base64Data = imageUrl.split(',')[1];
      const binaryString = atob(base64Data);
      uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
    } else {
      // Handle URL images
      console.log(`Downloading image from URL: ${imageUrl}`);
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
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    console.log("Upload successful:", data);

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log("Public URL generated:", publicUrl);
    return publicUrl;

  } catch (error) {
    console.error("Upload to Supabase failed:", error);
    throw error;
  }
}
