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
    console.log("Prompt for OpenAI:", prompt);

    // First Attempt
    let result = await generateWithOpenAI(prompt);
    if (!result.success) {
      // Second attempt with simpler fallback prompt
      console.log("Retrying with simple fallback prompt...");
      result = await generateWithOpenAI(`${productName}, product photo, white background`);
    }

    // Final fallback super simple
    if (!result.success) {
      console.log("Final fallback attempt...");
      result = await generateWithOpenAI(`product photo`);
    }

    if (!result.success) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Failed to generate image with OpenAI",
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
      provider: "OpenAI DALL-E 3"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message,
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

// ---------------------- OPENAI IMAGE GENERATOR ----------------------
async function generateWithOpenAI(prompt: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.error("OpenAI API key not found");
    return { success: false, error: "Missing API key" };
  }

  try {
    console.log(`Generating image with prompt: ${prompt}`);
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url"
      })
    });

    const data = await res.json();
    console.log("OpenAI response status:", res.status);

    if (res.ok && data.data && data.data[0]?.url) {
      console.log("OpenAI image generation successful");
      return { success: true, imageUrl: data.data[0].url };
    } else {
      console.error("OpenAI response error:", data);
      return { success: false, error: data.error?.message || "Unknown OpenAI error" };
    }
  } catch (e) {
    console.error("OpenAI fetch error:", e);
    return { success: false, error: e.message };
  }
}

// ---------------------- SUPABASE STORAGE UPLOAD ----------------------
async function uploadToSupabase(imageUrl: string, productId: string): Promise<string> {
  try {
    console.log(`Downloading image from OpenAI: ${imageUrl}`);
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const uint8Array = new Uint8Array(imageBuffer);

    const bucket = "product-images";
    const fileName = `${productId}.png`;

    console.log(`Uploading to Supabase: ${bucket}/${fileName}`);
    
    // Upload using Supabase client
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, uint8Array, {
        contentType: "image/png",
        upsert: true // This allows overwriting existing files
      });

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Failed to upload to Supabase: ${error.message}`);
    }

    console.log("Upload successful:", data);

    // Get the public URL
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