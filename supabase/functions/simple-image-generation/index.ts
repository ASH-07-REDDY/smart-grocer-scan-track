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
    console.error("OpenAI API key not available - check OPENAI_API_KEY secret");
    return { success: false, error: "API key not configured" };
  }

  try {
    console.log("Attempting OpenAI generation with prompt:", prompt);
    console.log("API key available:", apiKey ? "Yes" : "No");
    
    // Use dall-e-3 model which is more reliable
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "url"
      }),
    });

    console.log("OpenAI API response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("OpenAI response structure:", Object.keys(data));
      
      // Standard DALL-E response with URLs
      if (data.data && data.data[0] && data.data[0].url) {
        console.log("OpenAI generation successful - URL received");
        return { success: true, imageUrl: data.data[0].url };
      }
      
      // Fallback for base64 response (if any)
      if (data.data && data.data[0] && data.data[0].b64_json) {
        const base64Image = data.data[0].b64_json;
        const imageUrl = `data:image/png;base64,${base64Image}`;
        console.log("OpenAI generation successful - base64 image received");
        return { success: true, imageUrl };
      }
      
      console.error("Unexpected OpenAI response format:", JSON.stringify(data, null, 2));
      return { success: false, error: "Unexpected response format" };
    } else {
      const errorText = await response.text();
      console.error("OpenAI API error - Status:", response.status, "Response:", errorText);
      
      // Parse error details if possible
      try {
        const errorData = JSON.parse(errorText);
        console.error("OpenAI error details:", errorData);
        return { success: false, error: errorData.error?.message || errorText };
      } catch {
        return { success: false, error: errorText };
      }
    }

  } catch (error) {
    console.error("OpenAI generation network error:", error.message);
    return { success: false, error: error.message };
  }
}

// Remove Hugging Face function since we only use OpenAI

serve(handler);