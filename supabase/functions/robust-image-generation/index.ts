import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { HfInference } from "https://esm.sh/@huggingface/inference@2.3.2";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImageRequest {
  productName: string;
  category?: string;
}

interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  provider?: string;
  error?: string;
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

    // Try multiple AI providers in order of preference
    const providers = [
      () => generateWithOpenAI(prompt),
      () => generateWithHuggingFace(prompt),
      () => generateWithReplicate(prompt)
    ];

    for (let i = 0; i < providers.length; i++) {
      try {
        console.log(`Attempting generation with provider ${i + 1}...`);
        const result = await providers[i]();
        
        if (result.success && result.imageUrl) {
          console.log(`Image generated successfully with provider ${i + 1} (${result.provider})`);
          return new Response(JSON.stringify({
            success: true,
            imageUrl: result.imageUrl,
            provider: result.provider,
            prompt: prompt
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      } catch (error) {
        console.error(`Provider ${i + 1} failed:`, error.message);
        continue;
      }
    }

    // If all providers fail, try with simplified prompts
    const simplePrompt = `${productName} product photo`;
    console.log(`All providers failed, trying simplified prompt: ${simplePrompt}`);
    
    for (let i = 0; i < providers.length; i++) {
      try {
        const result = await providers[i]().catch(() => ({ success: false }));
        if (result.success && result.imageUrl) {
          console.log(`Image generated with simplified prompt using provider ${i + 1}`);
          return new Response(JSON.stringify({
            success: true,
            imageUrl: result.imageUrl,
            provider: result.provider,
            prompt: simplePrompt
          }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      } catch (error) {
        console.error(`Simplified prompt failed with provider ${i + 1}:`, error.message);
        continue;
      }
    }

    // Final fallback - return success with null to avoid errors
    console.log("All generation attempts failed, returning graceful failure");
    return new Response(JSON.stringify({
      success: false,
      error: "Unable to generate image with any provider",
      fallback: true
    }), {
      status: 200, // Return 200 to avoid frontend errors
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in robust image generation:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Service temporarily unavailable",
      fallback: true
    }), {
      status: 200, // Return 200 to avoid frontend errors
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

async function generateWithOpenAI(prompt: string): Promise<GenerationResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    console.log("OpenAI API key not available");
    return { success: false, error: "API key not configured" };
  }

  try {
    // Try with gpt-image-1 first (most powerful)
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt: prompt,
        size: "1024x1024",
        quality: "high",
        output_format: "png"
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const imageData = data.data[0]?.b64_json;
      if (imageData) {
        return {
          success: true,
          imageUrl: `data:image/png;base64,${imageData}`,
          provider: "OpenAI GPT-Image-1"
        };
      }
    }

    // Fallback to DALL-E 3
    const dalleResponse = await fetch("https://api.openai.com/v1/images/generations", {
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

    if (dalleResponse.ok) {
      const dalleData = await dalleResponse.json();
      const imageUrl = dalleData.data[0]?.url;
      if (imageUrl) {
        return {
          success: true,
          imageUrl: imageUrl,
          provider: "OpenAI DALL-E 3"
        };
      }
    }

    return { success: false, error: "OpenAI generation failed" };
  } catch (error) {
    console.error("OpenAI error:", error);
    return { success: false, error: error.message };
  }
}

async function generateWithHuggingFace(prompt: string): Promise<GenerationResult> {
  const apiKey = Deno.env.get("HUGGING_FACE_ACCESS_TOKEN");
  if (!apiKey) {
    console.log("Hugging Face API key not available");
    return { success: false, error: "API key not configured" };
  }

  try {
    const hf = new HfInference(apiKey);
    
    // Try FLUX.1-schnell first (fast and high quality)
    const image = await hf.textToImage({
      inputs: prompt,
      model: 'black-forest-labs/FLUX.1-schnell',
    });

    if (image) {
      const arrayBuffer = await image.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      return {
        success: true,
        imageUrl: `data:image/png;base64,${base64}`,
        provider: "Hugging Face FLUX.1-schnell"
      };
    }

    return { success: false, error: "Hugging Face generation failed" };
  } catch (error) {
    console.error("Hugging Face error:", error);
    return { success: false, error: error.message };
  }
}

async function generateWithReplicate(prompt: string): Promise<GenerationResult> {
  const apiKey = Deno.env.get("REPLICATE_API_KEY");
  if (!apiKey) {
    console.log("Replicate API key not available");
    return { success: false, error: "API key not configured" };
  }

  try {
    const replicate = new Replicate({ auth: apiKey });
    
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt: prompt,
          go_fast: true,
          megapixels: "1",
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: 80,
          num_inference_steps: 4
        }
      }
    );

    if (output && Array.isArray(output) && output[0]) {
      return {
        success: true,
        imageUrl: output[0],
        provider: "Replicate FLUX-schnell"
      };
    }

    return { success: false, error: "Replicate generation failed" };
  } catch (error) {
    console.error("Replicate error:", error);
    return { success: false, error: error.message };
  }
}

serve(handler);