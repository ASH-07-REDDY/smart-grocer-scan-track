import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageRequest {
  productName: string;
  category?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, category }: ImageRequest = await req.json();
    
    console.log(`Generating image for product: ${productName}, category: ${category}`);
    
    // Create optimized prompt
    const basePrompt = `professional product photograph of ${productName}`;
    const categoryContext = category ? ` ${category} item` : '';
    const stylePrompt = `, clean white background, commercial photography, high quality, centered, well-lit, studio lighting`;
    const prompt = `${basePrompt}${categoryContext}${stylePrompt}`;

    console.log(`Using prompt: ${prompt}`);

    // Try OpenAI first and only
    const openaiResult = await generateWithOpenAI(prompt);
    if (openaiResult.success && openaiResult.imageUrl) {
      console.log("Image generated successfully with OpenAI");
      return new Response(JSON.stringify({
        success: true,
        imageUrl: openaiResult.imageUrl,
        provider: "OpenAI"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // If first attempt fails, try with a simpler prompt
    const simplePrompt = `${productName}, product photo, white background`;
    console.log(`Retrying with simple prompt: ${simplePrompt}`);
    
    const simpleOpenaiResult = await generateWithOpenAI(simplePrompt);
    if (simpleOpenaiResult.success && simpleOpenaiResult.imageUrl) {
      console.log("Image generated successfully with simple prompt");
      return new Response(JSON.stringify({
        success: true,
        imageUrl: simpleOpenaiResult.imageUrl,
        provider: "OpenAI (Simple)"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // If all attempts fail
    console.log("All OpenAI generation attempts failed");
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to generate image with OpenAI",
      provider: "None"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in simple image generation:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      provider: "Error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function generateWithOpenAI(prompt: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.log("OpenAI API key not available");
    return { success: false };
  }

  try {
    console.log("Attempting OpenAI generation with prompt:", prompt);
    
    // Use gpt-image-1 model for better results
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
        output_format: "png"
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log("OpenAI response received:", JSON.stringify(data, null, 2));
      
      // gpt-image-1 returns base64 data directly
      if (data.data && data.data[0] && data.data[0].b64_json) {
        const base64Image = data.data[0].b64_json;
        const imageUrl = `data:image/png;base64,${base64Image}`;
        console.log("OpenAI generation successful - base64 image received");
        return { success: true, imageUrl };
      }
      
      // Fallback for URL response
      if (data.data && data.data[0] && data.data[0].url) {
        console.log("OpenAI generation successful - URL received");
        return { success: true, imageUrl: data.data[0].url };
      }
      
      console.error("Unexpected OpenAI response format:", data);
    } else {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
    }

    return { success: false };
  } catch (error) {
    console.error("OpenAI generation error:", error);
    return { success: false };
  }
}

// Remove Hugging Face function since we only use OpenAI

serve(handler);