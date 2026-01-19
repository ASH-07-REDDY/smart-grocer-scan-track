import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecognitionRequest {
  imageData: string;
  mode?: 'comprehensive' | 'fast';
}

interface RecognitionResult {
  productName: string;
  confidence: number;
  category?: string;
  brand?: string;
  details?: string;
  suggestions?: string[];
  actualProductImage?: string;
  needsImage?: boolean;
  nutritionalInfo?: {
    calories?: string;
    protein?: string;
    fat?: string;
    carbs?: string;
    fiber?: string;
  };
  storageInfo?: string;
  shelfLife?: string;
  usageTips?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, mode = 'comprehensive' }: RecognitionRequest = await req.json();

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting AI product recognition with Gemini, mode:', mode);

    const result = await recognizeWithGemini(imageData, mode);

    console.log('Recognition result:', result);

    // Generate product image if needed
    if (result.needsImage && result.productName && result.productName !== 'Unknown Product' && result.confidence > 0.5) {
      console.log('Generating product image for:', result.productName);
      
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        const imageResponse = await supabase.functions.invoke('enhanced-product-image-generation', {
          body: {
            productName: result.productName,
            brand: result.brand,
            category: result.category,
            style: 'professional-product-photo',
            prompt: `Professional product photo of ${result.productName}${result.brand ? ` by ${result.brand}` : ''}, studio lighting, white background`
          }
        });

        if (imageResponse.data && imageResponse.data.imageUrl) {
          result.actualProductImage = imageResponse.data.imageUrl;
          console.log('Product image generated successfully');
        }
      } catch (imageError) {
        console.log('Product image generation skipped:', imageError);
      }
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in AI product recognition:', error);
    return new Response(
      JSON.stringify({ error: 'Recognition failed', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function recognizeWithGemini(imageData: string, mode: string): Promise<RecognitionResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  console.log('Calling Gemini Vision API via Lovable Gateway...');

  const systemPrompt = mode === 'comprehensive' ? `You are an expert product identification AI with deep knowledge of consumer products, food items, household goods, electronics, and retail products.

CRITICAL INSTRUCTIONS:
1. Analyze the image with extreme precision
2. Read ALL visible text, brand names, logos, and packaging
3. Identify specific product variants (size, flavor, model, etc.)
4. Look for barcodes, ingredient lists, and labels
5. Provide comprehensive product information

You MUST respond with a valid JSON object containing:
{
  "productName": "Exact product name with brand and variant",
  "confidence": 0.95,
  "category": "Specific category (Fruits, Vegetables, Dairy, Beverages, Snacks, Meat, Frozen, Bakery, Canned, Condiments, Grains, Personal Care, Cleaning, Electronics, Other)",
  "brand": "Brand name if visible",
  "details": "Detailed description including size, flavor, ingredients, etc.",
  "suggestions": ["Alternative name 1", "Alternative name 2"],
  "needsImage": true,
  "nutritionalInfo": {
    "calories": "estimated calories per serving",
    "protein": "protein content",
    "fat": "fat content",
    "carbs": "carbohydrate content",
    "fiber": "fiber content"
  },
  "storageInfo": "How to store this product (refrigerate, freeze, room temp)",
  "shelfLife": "Expected shelf life after opening",
  "usageTips": ["Tip 1 for using this product", "Tip 2", "Recipe idea"]
}

Be as informative as possible. Provide nutritional estimates even if not visible on packaging.
NEVER respond with "Unknown Product" unless the image is completely unrecognizable.` : 
`Identify the product in this image. Respond with JSON: {"productName": "name", "confidence": 0.8, "category": "category", "needsImage": true}`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this product image carefully. Identify the product, brand, category, and provide comprehensive information including nutritional estimates, storage tips, and usage suggestions.'
            },
            {
              type: 'image_url',
              image_url: { url: imageData }
            }
          ]
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Gemini API error:', errorData);
    throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    // Try to parse as JSON
    let parsed;
    
    // Check if response is wrapped in markdown code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[1]);
    } else {
      // Try direct parse
      parsed = JSON.parse(content);
    }
    
    return {
      productName: parsed.productName || "Unknown Product",
      confidence: Math.min(parsed.confidence || 0.7, 1),
      category: parsed.category,
      brand: parsed.brand,
      details: parsed.details,
      suggestions: parsed.suggestions,
      needsImage: parsed.needsImage !== false,
      nutritionalInfo: parsed.nutritionalInfo,
      storageInfo: parsed.storageInfo,
      shelfLife: parsed.shelfLife,
      usageTips: parsed.usageTips
    };
  } catch (parseError) {
    console.error('Failed to parse Gemini response:', parseError);
    console.log('Raw response:', content);
    
    // Extract what we can from text response
    return {
      productName: extractProductName(content),
      confidence: 0.6,
      details: content.substring(0, 300),
      category: "General",
      needsImage: true
    };
  }
}

function extractProductName(text: string): string {
  // Try to extract product name from text
  const patterns = [
    /product[:\s]+["']?([^"'\n,]+)["']?/i,
    /this is [a]?\s*["']?([^"'\n,]+)["']?/i,
    /identified as\s*["']?([^"'\n,]+)["']?/i,
    /appears to be\s*["']?([^"'\n,]+)["']?/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }
  
  // Return first line as fallback
  return text.split('\n')[0].substring(0, 50).trim() || "Product";
}
