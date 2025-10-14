import OpenAI from "openai";

// Get API key from environment variables
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.warn("⚠️  OPENAI_API_KEY not found in environment variables. Chatbot functionality may be limited.");
}

// Initialize OpenAI client
const openai = apiKey ? new OpenAI({ 
  apiKey: apiKey
}) : null;

// Check if OpenAI is properly configured
if (!openai) {
  console.warn("⚠️  OpenAI client not initialized. Please set OPENAI_API_KEY in your .env file.");
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
}

export async function getChatResponse(message: string, _context?: any): Promise<ChatResponse> {
  // Check if OpenAI client is available
  if (!openai) {
    console.error("OpenAI client not initialized. API key may be missing.");
    return {
      message: "I'm currently unable to connect to the AI service. Please ensure the OpenAI API key is properly configured in the environment variables. I can still help you with property valuations and market analysis through our ML models.",
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

Context: Pakistani real estate market is recovering in 2025 with interest rates dropping from 22% to 12-13%. Property values are expected to rise 10-15% annually.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // Using gpt-4o as gpt-5 might not be available
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
      temperature: 0.7,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);
    
    return {
      message: parsed.message || parsed.response || content,
      suggestions: parsed.suggestions || [
        "Best ROI areas in major cities?",
        "Market trends for 2025?",
        "Commercial vs residential investment?",
        "Property tax implications?"
      ]
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    
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
  // Check if OpenAI client is available
  if (!openai) {
    console.warn("OpenAI client not available for property analysis. Using fallback analysis.");
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
    
    Property data: ${JSON.stringify(propertyData)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : null;
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
