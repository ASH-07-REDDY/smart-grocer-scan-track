import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecipeRequest {
  ingredients: string[];
  userMessage: string;
  conversationHistory?: { role: string; content: string }[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ingredients, userMessage, conversationHistory = [] }: RecipeRequest = await req.json();
    
    console.log("AI Recipe Chat request:", { ingredients, userMessage });

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

    const systemPrompt = `You are a creative and helpful chef assistant for Smart Pantry app. 
Your job is to suggest delicious, practical recipes based on available ingredients.

Available ingredients in the user's pantry: ${ingredients.join(", ")}

Guidelines:
- Always suggest NEW and UNIQUE recipes - never repeat suggestions
- Provide detailed step-by-step cooking instructions
- Include cooking time, servings, and difficulty level
- Be creative and suggest variations when possible
- If asked for a specific recipe, provide complete instructions
- Use markdown formatting for better readability
- Be friendly and encouraging
- Suggest substitutions if some ingredients are missing
- Include tips for best results

When providing a recipe, use this format:
## 🍳 Recipe Name
**Difficulty:** Easy/Medium/Hard | **Time:** X mins | **Servings:** X

### Ingredients:
- List each ingredient with quantity

### Instructions:
1. Step by step instructions
2. Continue steps...

### Chef's Tips:
- Helpful tips for best results`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      { role: "user", content: userMessage }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: messages,
        temperature: 0.8, // Higher temperature for more creative recipes
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ 
        success: false,
        error: "Failed to get AI response" 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";

    console.log("AI Recipe response generated successfully");

    return new Response(JSON.stringify({ 
      success: true,
      response: aiResponse
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error) {
    console.error("Error in AI recipe chat:", error);
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
