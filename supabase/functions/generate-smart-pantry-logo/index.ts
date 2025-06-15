import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Generating Smart Pantry logo...");
    
    // Create a detailed prompt for the logo
    const prompt = `professional minimalist logo design for "Smart Pantry" app, modern smart home kitchen pantry with AI technology elements, clean geometric design, kitchen pantry shelves with digital smart elements, blue and green gradient colors, tech-forward, food storage, grocery management, flat design style, simple icon, white background, vector art style, 1024x1024 pixels`;

    console.log(`Using prompt: ${prompt}`);

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

    console.log("Attempting logo generation with OpenAI...");
    
    // Use gpt-image-1 model for better results
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
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
      console.log("OpenAI response received for logo");
      
      // gpt-image-1 returns base64 data directly
      if (data.data && data.data[0] && data.data[0].b64_json) {
        const base64Image = data.data[0].b64_json;
        const imageUrl = `data:image/png;base64,${base64Image}`;
        console.log("Smart Pantry logo generated successfully");
        
        return new Response(JSON.stringify({
          success: true,
          imageUrl: imageUrl,
          description: "Smart Pantry logo generated with OpenAI"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      // Fallback for URL response
      if (data.data && data.data[0] && data.data[0].url) {
        console.log("Logo generated with URL response");
        return new Response(JSON.stringify({
          success: true,
          imageUrl: data.data[0].url,
          description: "Smart Pantry logo generated with OpenAI"
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      console.error("Unexpected OpenAI response format:", data);
    } else {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
    }

    // If logo generation fails
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to generate Smart Pantry logo with OpenAI"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in logo generation:", error);
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