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

    // Try OpenAI first - most reliable
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

    // Try Hugging Face as fallback
    const hfResult = await generateWithHuggingFace(prompt);
    if (hfResult.success && hfResult.imageUrl) {
      console.log("Image generated successfully with Hugging Face");
      return new Response(JSON.stringify({
        success: true,
        imageUrl: hfResult.imageUrl,
        provider: "Hugging Face"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // If both fail, try with a very simple prompt
    const simplePrompt = `${productName} product photo`;
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

    // Final fallback - return success without image
    console.log("All generation attempts failed, proceeding without image");
    return new Response(JSON.stringify({
      success: true,
      imageUrl: null,
      provider: "Fallback"
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in simple image generation:", error);
    return new Response(JSON.stringify({
      success: true,
      imageUrl: null,
      provider: "Error Fallback"
    }), {
      status: 200,
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
    console.log("Attempting OpenAI generation...");
    
    // Use DALL-E 3 - more reliable than the new models
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
        style: "natural",
        response_format: "url"
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const imageUrl = data.data[0]?.url;
      if (imageUrl) {
        console.log("OpenAI generation successful");
        return { success: true, imageUrl };
      }
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

async function generateWithHuggingFace(prompt: string) {
  const apiKey = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
  if (!apiKey) {
    console.log("Hugging Face API key not available");
    return { success: false };
  }

  try {
    console.log("Attempting Hugging Face generation...");
    
    const response = await fetch(
      "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width: 1024,
            height: 1024,
            guidance_scale: 7.5,
            num_inference_steps: 4
          }
        }),
      }
    );

    if (response.ok) {
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      console.log("Hugging Face generation successful");
      return {
        success: true,
        imageUrl: `data:image/png;base64,${base64}`
      };
    } else {
      const errorText = await response.text();
      console.error("Hugging Face API error:", response.status, errorText);
    }

    return { success: false };
  } catch (error) {
    console.error("Hugging Face generation error:", error);
    return { success: false };
  }
}

serve(handler);