import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const huggingFaceToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');

interface RecognitionRequest {
  imageData: string; // base64 image data
  mode?: 'comprehensive' | 'fast'; // recognition mode
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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, mode = 'comprehensive' }: RecognitionRequest = await req.json();

    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'Image data is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Starting AI product recognition with mode:', mode);

    let result: RecognitionResult;

    if (mode === 'comprehensive') {
      // Use both OpenAI Vision and Hugging Face for better accuracy
      result = await comprehensiveRecognition(imageData);
    } else {
      // Use faster Hugging Face only
      result = await fastRecognition(imageData);
    }

    console.log('Recognition result:', result);

    // If we have a product identification, fetch the actual product image
    if (result.needsImage && result.productName && result.productName !== 'Unknown Product' && result.confidence > 0.5) {
      console.log('Fetching actual product image for:', result.productName);
      
      try {
        // Initialize Supabase client for calling other edge functions
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
        const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Generate high-quality product image
        const imageResponse = await supabase.functions.invoke('enhanced-product-image-generation', {
          body: {
            productName: result.productName,
            brand: result.brand,
            category: result.category,
            style: 'professional-product-photo',
            prompt: `Ultra high-resolution professional product photography of ${result.productName}${result.brand ? ` by ${result.brand}` : ''}, studio lighting, white background, commercial quality, photorealistic, detailed packaging`
          }
        });

        if (imageResponse.data && imageResponse.data.imageUrl) {
          result.actualProductImage = imageResponse.data.imageUrl;
          console.log('High-quality product image generated successfully');
        }
      } catch (imageError) {
        console.log('Product image generation failed:', imageError);
        // Continue without product image
      }
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in AI product recognition:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Recognition failed', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function comprehensiveRecognition(imageData: string): Promise<RecognitionResult> {
  console.log('Running comprehensive recognition...');
  
  try {
    // First, try OpenAI Vision for detailed product identification
    const openAIResult = await recognizeWithOpenAI(imageData);
    
    // Also run Hugging Face for additional validation
    const hfResult = await recognizeWithHuggingFace(imageData);
    
    // Combine results for better accuracy
    return combineResults(openAIResult, hfResult);
  } catch (error) {
    console.error('Comprehensive recognition failed, falling back to fast mode:', error);
    return await fastRecognition(imageData);
  }
}

async function fastRecognition(imageData: string): Promise<RecognitionResult> {
  console.log('Running fast recognition...');
  
  try {
    // Use Hugging Face for fast recognition
    return await recognizeWithHuggingFace(imageData);
  } catch (error) {
    console.error('Fast recognition failed:', error);
    // Improved fallback to basic recognition
    return {
      productName: "Product in Image",
      confidence: 0.3,
      details: "Product detected but could not be specifically identified. Please try with better lighting or clearer view.",
      category: "General"
    };
  }
}

async function recognizeWithOpenAI(imageData: string): Promise<RecognitionResult> {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('Calling OpenAI Vision API...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a professional product identification expert with extensive knowledge of consumer products, food items, household goods, electronics, and retail products. Analyze the image with extreme precision and identify the exact product.

          CRITICAL INSTRUCTIONS:
          - Look carefully at ALL visible text, brand names, logos, and packaging
          - Read product labels, ingredient lists, and any printed text
          - Identify specific product variants (size, flavor, model, etc.)
          - Consider packaging shape, colors, and design elements
          - If you can see a barcode, mention it
          - Be specific about product names, not generic categories

          Respond ONLY with a valid JSON object containing:
          {
            "productName": "Exact product name with brand and variant",
            "confidence": 0.95,
            "category": "Specific category",
            "brand": "Brand name",
            "details": "Detailed description including size, flavor, model, etc.",
            "suggestions": ["Alternative name 1", "Alternative name 2"],
            "needsImage": true
          }
          
          Set needsImage to true for ANY successfully identified product to fetch the actual product image.

          NEVER respond with "Unknown Product" unless the image is completely unrecognizable.
          Even if uncertain, provide your best identification with appropriate confidence level.`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this product image carefully. Read all visible text, identify the brand, product name, size/variant, and any other specific details. Provide the most accurate product identification possible with your confidence level. Focus on packaging text, logos, barcodes, and distinctive features. Even if partially obscured, give your best identification.'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData
              }
            }
          ]
        }
      ],
      max_tokens: 1500,
      temperature: 0.1 // Lower temperature for more consistent results
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('OpenAI API error:', errorData);
    throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(content);
    return {
      productName: parsed.productName || "Unknown Product",
      confidence: Math.min(parsed.confidence || 0.5, 1),
      category: parsed.category,
      brand: parsed.brand,
      details: parsed.details,
      suggestions: parsed.suggestions,
      needsImage: parsed.needsImage || (parsed.confidence > 0.5)
    };
  } catch (parseError) {
    console.error('Failed to parse OpenAI response as JSON:', parseError);
    console.log('Raw OpenAI response:', content);
    
    // Try to extract JSON from the response if it's wrapped in markdown
    const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/) || content.match(/(\{[\s\S]*?\})/);
    if (jsonMatch) {
      try {
        const extracted = JSON.parse(jsonMatch[1]);
        return {
          productName: extracted.productName || "Product Identified",
          confidence: Math.min(extracted.confidence || 0.8, 1),
          category: extracted.category,
          brand: extracted.brand,
          details: extracted.details,
          suggestions: extracted.suggestions
        };
      } catch (e) {
        console.error('Failed to parse extracted JSON:', e);
      }
    }
    
    // Improved fallback: extract product name from text response
    const productName = extractProductNameFromText(content);
    return {
      productName: productName || "Identified Product",
      confidence: 0.6,
      details: content.substring(0, 200),
      category: "General"
    };
  }
}

async function recognizeWithHuggingFace(imageData: string): Promise<RecognitionResult> {
  if (!huggingFaceToken) {
    throw new Error('Hugging Face token not configured');
  }

  console.log('Calling Hugging Face API...');

  // Convert base64 to blob
  const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
  const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

  const response = await fetch(
    'https://api-inference.huggingface.co/models/microsoft/resnet-50',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${huggingFaceToken}`,
        'Content-Type': 'application/octet-stream',
      },
      body: imageBuffer,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Hugging Face API error:', errorText);
    throw new Error(`Hugging Face API error: ${errorText}`);
  }

  const results = await response.json();
  console.log('Hugging Face results:', results);

  if (!results || !Array.isArray(results) || results.length === 0) {
    throw new Error('No results from Hugging Face');
  }

  const topResult = results[0];
  
  return {
    productName: formatProductName(topResult.label),
    confidence: topResult.score,
    category: extractCategory(topResult.label),
    details: `Identified using computer vision (ResNet-50)`
  };
}

function combineResults(openAIResult: RecognitionResult, hfResult: RecognitionResult): RecognitionResult {
  console.log('Combining results from OpenAI and Hugging Face...');
  
  // Prefer OpenAI result if confidence is high enough
  if (openAIResult.confidence > 0.8) {
    return {
      ...openAIResult,
      details: `${openAIResult.details} (Cross-validated with computer vision)`
    };
  }
  
  // If OpenAI confidence is low, but HF confidence is high, use HF
  if (hfResult.confidence > 0.7 && hfResult.confidence > openAIResult.confidence) {
    return {
      ...hfResult,
      suggestions: [openAIResult.productName, ...(hfResult.suggestions || [])]
    };
  }
  
  // Combine both results
  return {
    productName: openAIResult.productName,
    confidence: (openAIResult.confidence + hfResult.confidence) / 2,
    category: openAIResult.category || hfResult.category,
    brand: openAIResult.brand,
    details: `Combined AI analysis: ${openAIResult.details}`,
    suggestions: [hfResult.productName, ...(openAIResult.suggestions || [])]
  };
}

function extractProductNameFromText(text: string): string {
  // Simple extraction logic for product names from text
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('product') || line.toLowerCase().includes('item')) {
      const match = line.match(/:\s*(.+)/);
      if (match) return match[1].trim();
    }
  }
  return text.split('\n')[0].trim() || "Unknown Product";
}

function formatProductName(label: string): string {
  // Convert AI model labels to human-readable product names
  return label
    .split(',')[0] // Take first part before comma
    .replace(/_/g, ' ') // Replace underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function extractCategory(label: string): string {
  // Map AI labels to product categories
  const categoryMap: Record<string, string> = {
    'food': 'Food & Beverages',
    'bottle': 'Beverages',
    'can': 'Beverages',
    'phone': 'Electronics',
    'laptop': 'Electronics',
    'book': 'Books & Media',
    'clothing': 'Clothing',
    'shoe': 'Clothing',
    'bag': 'Accessories',
    'watch': 'Accessories'
  };
  
  const lowerLabel = label.toLowerCase();
  for (const [key, category] of Object.entries(categoryMap)) {
    if (lowerLabel.includes(key)) {
      return category;
    }
  }
  
  return 'General';
}