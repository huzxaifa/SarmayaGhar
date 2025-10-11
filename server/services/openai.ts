import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface ChatResponse {
  message: string;
  suggestions?: string[];
}

export async function getChatResponse(message: string, context?: any): Promise<ChatResponse> {
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
      model: "gpt-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500,
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
        "Market crash prediction for 2025?",
        "Commercial vs residential investment?",
        "Property tax implications?"
      ]
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    
    // Fallback response
    return {
      message: "I'm sorry, I'm experiencing technical difficulties. Please try again later. In the meantime, I can help you with property valuations, market analysis, and investment advice for the Pakistani real estate market.",
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
      model: "gpt-5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    return content ? JSON.parse(content) : null;
  } catch (error) {
    console.error("Property analysis error:", error);
    return null;
  }
}
