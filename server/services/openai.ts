import OpenAI from "openai";

// Default URL should include /v1 for OpenAI-compatible API
// Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues on Windows
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:3b";

// Normalize base URL - replace localhost with 127.0.0.1 and ensure it ends with /v1 for OpenAI client
const normalizeURL = (url: string): string => {
  // Replace localhost with 127.0.0.1 to avoid IPv6 resolution issues
  url = url.replace(/localhost/g, '127.0.0.1');
  // Ensure it ends with /v1 for OpenAI client
  return url.endsWith('/v1') ? url : url.replace(/\/+$/, '') + '/v1';
};

const normalizedBaseURL = normalizeURL(OLLAMA_BASE_URL);

// Ollama doesn't require an API key, but we include it for compatibility
const ollama = new OpenAI({
  baseURL: normalizedBaseURL,
  apiKey: "ollama", // Dummy key - Ollama doesn't require authentication
});

async function checkOllamaAvailability(): Promise<boolean> {
  try {
    // Remove /v1 and trailing slashes to get base URL for /api/tags
    // Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues
    const baseUrl = normalizedBaseURL
      .replace('/v1', '')
      .replace(/\/+$/, '') || 'http://127.0.0.1:11434';
    const url = `${baseUrl}/api/tags`;
    
    console.log(`[DEBUG] Checking Ollama availability at: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Ollama API returned status ${response.status} for ${url}`);
      return false;
    }
    
    const data = await response.json() as { models?: Array<{ name?: string }> };
    const hasModels = (data.models?.length ?? 0) > 0;
    
    if (hasModels) {
      console.log(`✅ Found ${data.models!.length} model(s) in Ollama`);
      console.log(`[DEBUG] Models: ${data.models!.map(m => m.name).join(', ')}`);
    } else {
      console.warn("⚠️ Ollama is running but no models found");
    }
    
    return hasModels;
  } catch (error: any) {
    console.error("Ollama availability check error:", error?.message || error);
    console.error("Full error:", error);
    return false;
  }
}

// Check availability on startup
checkOllamaAvailability().then(available => {
  if (available) {
    console.log(`✅ Ollama is available at ${OLLAMA_BASE_URL}`);
    console.log(`📦 Using model: ${OLLAMA_MODEL}`);
  } else {
    console.warn(`⚠️  Ollama not detected at ${OLLAMA_BASE_URL}`);
    console.warn(`💡 To set up Ollama:`);
    console.warn(`   1. Install: https://ollama.ai/download`);
    console.warn(`   2. Run: ollama pull ${OLLAMA_MODEL}`);
    console.warn(`   3. Ensure Ollama is running on port 11434`);
  }
});

export interface ChatResponse {
  message: string;
  suggestions?: string[];
}

export async function getChatResponse(message: string, _context?: any): Promise<ChatResponse> {
  // Check if Ollama is available
  const isAvailable = await checkOllamaAvailability();
  
  if (!isAvailable) {
    console.warn("Ollama not available. Using fallback response.");
    return {
      message: "I'm currently unable to connect to the AI service. Please ensure Ollama is installed and running. You can install it from https://ollama.ai and run 'ollama pull llama3.2:3b'. I can still help you with property valuations and market analysis through our ML models.",
      suggestions: [
        "Try our property valuation tool",
        "Check market insights",
        "View property portfolio",
        "Get heatmap data"
      ]
    };
  }

  try {
    const systemPrompt = `You are SarmayaGhar AI, an expert real estate investment advisor for the Pakistani market. You specialize in:

1. Property valuation and market analysis
2. Investment strategies and ROI calculations
3. Rental yield predictions
4. Market trends and predictions
5. Pakistani real estate regulations and taxes
6. Location-specific advice for Karachi, Lahore, and Islamabad

Always provide practical, actionable advice based on current Pakistani real estate market conditions. Use PKR currency and local units (marla, kanal). Be concise but informative.

Context: Pakistani real estate market is recovering in 2025 with interest rates dropping from 22% to 12-13%. Property values are expected to rise 10-15% annually.

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "message": "your response here",
  "suggestions": ["suggestion1", "suggestion2", "suggestion3", "suggestion4"]
}

Do not include any text before or after the JSON.`;

    const response = await ollama.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from Ollama");
    }

    let parsed: any;
    try {
      // Try to find JSON object in the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        // If no JSON found, treat entire response as message
        parsed = { message: content };
      }
    } catch (parseError) {
      // If JSON parsing fails, use the content as message
      console.warn("Failed to parse JSON response, using raw content:", parseError);
      parsed = { message: content };
    }
    
    return {
      message: parsed.message || parsed.response || content,
      suggestions: parsed.suggestions || [
        "Best ROI areas in major cities?",
        "Market trends for 2025?",
        "Commercial vs residential investment?",
        "Property tax implications?"
      ]
    };
  } catch (error: any) {
    console.error("Ollama API error:", error);
    
    // Enhanced fallback response
    const fallbackResponses = {
      "investment": "For investment advice, I recommend checking our property valuation tool and market insights. Premium areas like DHA, Clifton, and Gulberg typically offer good ROI.",
      "valuation": "Our ML-powered property valuation tool can provide accurate price estimates. Try entering your property details for a comprehensive analysis.",
      "market": "The Pakistani real estate market is showing positive trends in 2025. Check our market insights section for detailed analysis.",
      "default": "I'm experiencing technical difficulties with the AI service. Please try our property valuation tool or check the market insights section for immediate assistance."
    };

    let responseMessage = fallbackResponses.default;
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes("investment") || lowerMessage.includes("roi")) {
      responseMessage = fallbackResponses.investment;
    } else if (lowerMessage.includes("valuation") || lowerMessage.includes("price")) {
      responseMessage = fallbackResponses.valuation;
    } else if (lowerMessage.includes("market") || lowerMessage.includes("trend")) {
      responseMessage = fallbackResponses.market;
    }
    
    return {
      message: responseMessage,
      suggestions: [
        "Best investment areas in Karachi?",
        "Current market trends in Lahore?",
        "ROI expectations for Islamabad?",
        "Property tax rates in Pakistan?"
      ]
    };
  }
}

export async function analyzePakistaniPropertyMarket(propertyData: any): Promise<any> {
  // Check if Ollama is available
  const isAvailable = await checkOllamaAvailability();
  
  if (!isAvailable) {
    console.warn("Ollama not available for property analysis. Using fallback analysis.");
    return {
      investment_score: 75,
      market_outlook: "stable",
      roi_prediction: "8-12%",
      strengths: ["Good location", "Stable market conditions", "Potential for growth"],
      risks: ["Market volatility", "Economic factors"],
      recommendation: "hold"
    };
  }

  try {
    const prompt = `Analyze this Pakistani property for investment potential. Provide insights in JSON format with the following structure:
    {
      "investment_score": number (1-100),
      "market_outlook": "bullish|bearish|stable",
      "roi_prediction": "percentage",
      "strengths": ["list of strengths"],
      "risks": ["list of risks"],
      "recommendation": "buy|hold|avoid"
    }
    
    IMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON.
    
    Property data: ${JSON.stringify(propertyData)}`;

    const response = await ollama.chat.completions.create({
      model: OLLAMA_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from Ollama");
    }

    // Try to extract JSON from the response
    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.warn("Failed to parse JSON response:", parseError);
      throw parseError;
    }

    return parsed;
  } catch (error) {
    console.error("Property analysis error:", error);
    // Return fallback analysis
    return {
      investment_score: 70,
      market_outlook: "stable",
      roi_prediction: "8-12%",
      strengths: ["Good location", "Market recovery", "Interest rate improvements"],
      risks: ["Economic uncertainty", "Market volatility"],
      recommendation: "hold"
    };
  }
}
