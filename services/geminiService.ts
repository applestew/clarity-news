
import { GoogleGenAI, Type } from "@google/genai";
import { NewsArticle, UserProfile, FilterScope } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY });

export const fetchCuratedNews = async (
    profile: UserProfile, 
    scope: FilterScope = 'top10', 
    searchQuery: string = '',
    regionFilter: string = '',
    excludeTitles: string[] = []
): Promise<NewsArticle[]> => {
  try {
    // Construction of the prompt based on User Profile and Filters
    const isIndia = profile.country.toLowerCase() === 'india';
    
    let sourceInstruction = "";
    let scopeInstruction = "";
    // OPTIMIZATION: Reduced count to 5 to improve speed significantly (target < 10s)
    let countInstruction = "Find exactly 5 top news stories.";

    // 1. Handle Source Instructions
    if (isIndia && (scope === 'domestic' || scope === 'state' || scope === 'top10')) {
        const sourcesList = "'The Hindu', 'The Indian Express', 'NDTV', 'Hindustan Times', 'News18', 'Scroll.in', 'India Today', 'The Wire', 'Press Trust of India (PTI)', 'Deccan Herald', 'Livemint', 'Firstpost'";
        sourceInstruction = `Use these trusted sources: ${sourcesList}.`;
    } else {
        sourceInstruction = `Use verified news outlets in ${profile.country}.`;
    }

    // 2. Handle Scope/Filter Instructions
    switch (scope) {
        case 'domestic':
            scopeInstruction = `Focus on major national news in ${profile.country}.`;
            break;
        case 'world':
            scopeInstruction = `Focus on major global events.`;
            break;
        case 'state':
            scopeInstruction = `Focus on news from "${regionFilter}" in ${profile.country}.`;
            countInstruction = "Find 4-5 significant stories."; 
            break;
        case 'search':
            scopeInstruction = `Search for: "${searchQuery}".`;
            countInstruction = "Find 5 relevant stories."; 
            break;
        case 'top10':
        default:
            scopeInstruction = `Find the 5 most critical news stories for ${profile.country}.`;
            break;
    }

    const topicInstruction = (scope === 'top10' && profile.topics.length > 0)
        ? `Prioritize: ${profile.topics.slice(0, 3).join(', ')}.` 
        : "";
    
    const excludeInstruction = excludeTitles.length > 0 
        ? `DO NOT include these stories: ${JSON.stringify(excludeTitles.slice(-10))}. Find different/newer ones.` 
        : "";

    // STEP 1: Grounded Search
    const searchPrompt = `
      Task: ${countInstruction}
      Scope: ${scopeInstruction}
      Sources: ${sourceInstruction}
      ${topicInstruction}
      ${excludeInstruction}
      
      Requirement: Get original article links. Find the main article image URL from metadata if possible.
    `;

    // Step 1: Get Real Information via Google Search Grounding
    const searchResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawNewsText = searchResponse.text;

    // EXTRACT GROUNDING CHUNKS TO GET REAL URLS
    const groundingChunks = searchResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    let verifiedLinksList = "NO VERIFIED LINKS FOUND";
    if (groundingChunks.length > 0) {
        verifiedLinksList = groundingChunks
            .map((chunk: any, index: number) => {
                if (chunk.web) {
                    return `[${index}] URL: ${chunk.web.uri} (Title: "${chunk.web.title}")`;
                }
                return null;
            })
            .filter(Boolean)
            .join("\n");
    }
    
    // Step 2: Structure the raw information into our strict schema
    // OPTIMIZATION: Simplified instructions to reduce generation time.
    const structuredResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Convert this news data into JSON.
      
      INPUT: ${rawNewsText}
      
      VERIFIED LINKS:
      ${verifiedLinksList}
      
      RULES:
      1. 'sourceUrl': Pick the BEST MATCH from "VERIFIED LINKS" based on content/topic. Do NOT just match title text.
      2. 'keyPoints': 4-6 comprehensive, standalone bullet points covering all key facts.
      3. 'timeline': Max 2 major events.
      4. 'biasScore': 0=Left, 50=Center, 100=Right.
      5. 'importanceScore': 1 (Low) to 10 (High Impact).
      6. 'imageUrl': Extract the actual main image URL if found in the search results/metadata.
      
      User Context: ${profile.country}.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              keyPoints: { 
                  type: Type.ARRAY, 
                  items: { type: Type.STRING }
              },
              source: { type: Type.STRING },
              sourceUrl: { type: Type.STRING },
              imageUrl: { type: Type.STRING },
              category: { type: Type.STRING },
              country: { type: Type.STRING },
              newsType: { type: Type.STRING },
              bias: { type: Type.STRING, enum: ["Left", "Center", "Right"] },
              biasScore: { type: Type.NUMBER },
              importanceScore: { type: Type.NUMBER },
              timeline: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        date: { type: Type.STRING },
                        event: { type: Type.STRING }
                    }
                }
              }
            },
            required: ["title", "summary", "source", "bias", "importanceScore", "keyPoints", "timeline", "category", "country", "newsType"],
          },
        },
      },
    });

    const rawData = JSON.parse(structuredResponse.text || "[]");
    
    // Hydrate with client-side only fields and Fix URLs
    return rawData.map((item: any, index: number) => {
      let finalUrl = item.sourceUrl;
      
      const isInvalid = !finalUrl || 
                        finalUrl === 'undefined' || 
                        finalUrl.split('/').length < 3 || 
                        finalUrl.includes('vertexaisearch') ||
                        finalUrl.includes('google.com/search');

      if (isInvalid) {
        finalUrl = `https://www.google.com/search?q=${encodeURIComponent(item.title + " " + item.source + " news")}`;
      }
      
      // IMAGE STRATEGY:
      // 1. Use extracted URL if valid (from Google Search metadata)
      // 2. Fallback to a Web Search Image Proxy (Bing) to get a REAL image matching the title.
      //    This ensures "genuine" photos instead of AI generation.
      let mainImage = item.imageUrl;
      
      // Helper to get a real image from web search results
      const getRealImage = (query: string, width: number, height: number) => {
          const cleanQuery = query.replace(/[^\w\s]/gi, '').split(' ').slice(0, 8).join(' ');
          return `https://tse2.mm.bing.net/th?q=${encodeURIComponent(cleanQuery + " news")}&w=${width}&h=${height}&c=7&rs=1&p=0`;
      };

      if (!mainImage || mainImage.length < 10 || mainImage.includes('pollinations')) {
          mainImage = getRealImage(item.title, 800, 450);
      }

      // Generate RELATED visuals using the same Real Image strategy
      // This uses the specific key point to find a relevant real photo
      const relatedImages = (item.keyPoints || []).slice(0, 3).map((point: string) => {
          const cleanPoint = point.replace(/[^\w\s]/gi, '').split(' ').slice(0, 6).join(' ');
          return `https://tse2.mm.bing.net/th?q=${encodeURIComponent(cleanPoint + " context")}&w=500&h=300&c=7&rs=1&p=0`;
      });

      // Normalize Importance Score (Fix for 90/10 bug)
      let impact = item.importanceScore || 5;
      if (impact > 10) {
          impact = Math.round(impact / 10);
          if (impact === 0) impact = 1;
      }

      return {
        ...item,
        id: `news-${index}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        verified: true,
        imageUrl: mainImage,
        relatedImages: relatedImages,
        sourceUrl: finalUrl,
        importanceScore: impact // Use normalized score
      };
    });

  } catch (error) {
    console.error("Failed to fetch news from Gemini:", error);
    return [];
  }
};

export const analyzeDetoxProgress = async (readHistoryCount: number, userName: string): Promise<string> => {
    try {
        // Reduced maxOutputTokens to return just a quick sentence
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `User ${userName} read ${readHistoryCount} articles. Give 1 short encouraging detox tip.`,
            config: { maxOutputTokens: 30 }
        });
        return response.text || "Stay mindful.";
    } catch (e) {
        return "Balance is key.";
    }
}
