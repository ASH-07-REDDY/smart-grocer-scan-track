
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    
    // Generate AI image using OpenAI DALL-E
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(JSON.stringify({ 
        success: false,
        error: "OpenAI API key not configured" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create optimized prompts for better image generation
    const basePrompt = `professional product photograph of ${productName}`;
    const categoryContext = category ? ` ${category} item` : '';
    const stylePrompt = `, clean white background, commercial photography, high quality, centered, well-lit`;
    
    const prompt = `${basePrompt}${categoryContext}${stylePrompt}`;

    console.log(`Using optimized prompt: ${prompt}`);

    const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
        response_format: "url"
      }),
    });

    if (!imageResponse.ok) {
      const errorText = await imageResponse.text();
      console.error("OpenAI API error:", errorText);
      
      // Fallback with simpler prompt
      const fallbackPrompt = `${productName} product photo, white background`;
      console.log(`Retrying with fallback prompt: ${fallbackPrompt}`);
      
      const retryResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt: fallbackPrompt,
          n: 1,
          size: "1024x1024",
          quality: "standard",
          style: "natural"
        }),
      });

      if (!retryResponse.ok) {
        const retryErrorText = await retryResponse.text();
        console.error("OpenAI API retry failed:", retryErrorText);
        return new Response(JSON.stringify({ 
          success: false,
          error: "Failed to generate image after retry attempts" 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const retryImageData = await retryResponse.json();
      const retryImageUrl = retryImageData.data[0]?.url;

      if (!retryImageUrl) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "No image URL returned from retry attempt" 
        }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log("Image generated successfully on retry");
      return new Response(JSON.stringify({ 
        success: true, 
        imageUrl: retryImageUrl,
        prompt: fallbackPrompt
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const imageData = await imageResponse.json();
    const imageUrl = imageData.data[0]?.url;

    if (!imageUrl) {
      return new Response(JSON.stringify({ 
        success: false,
        error: "No image URL returned from OpenAI" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Image generated successfully");
    return new Response(JSON.stringify({ 
      success: true, 
      imageUrl: imageUrl,
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

serve(handler);
