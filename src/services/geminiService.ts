import { GoogleGenAI, Type } from "@google/genai";
import { NewsArticle, UserProfile, FilterScope } from "../types";

// DIRECT API KEY INTEGRATION
// This prevents the "Cannot read properties of undefined" error by bypassing environment checks.
const API_KEY = "AIzaSyCp_aH4O8RIfqFUwh_cMbM-lobCuA0MMhQ";

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Summarizes the news content using Gemini.
 */
export const summarizeContent = async (text: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Summarize this news content in 2 concise sentences for a mindfulness app: "${text.substring(0, 1000)}"`,
            config: { maxOutputTokens: 100 }
        });
        return response.text || "No summary available.";
    } catch (e) {
        console.error("GEMINI: Summarization failed", e);
        return "Summary unavailable.";
    }
};

/**
 * Categorizes the news into sentiment and checks for sensationalism.
 */
export const analyzeSentiment = async (headline: string): Promise<"positive" | "neutral" | "negative"> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Analyze this news headline for sentiment and credibility.
            
            Classify as:
            - POSITIVE: Genuine good news, constructive updates, scientific breakthroughs, or uplifting community stories.
            - NEGATIVE: Tragic news, accidents, toxic politics, clickbait, sensationalist claims.
            - NEUTRAL: Factual, objective, and dry reporting.
            
            Headline: "${headline}"`,
            config: { 
                maxOutputTokens: 20,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sentiment: { type: Type.STRING },
                        isSensational: { type: Type.BOOLEAN },
                        credibilityScore: { type: Type.NUMBER }
                    },
                    required: ["sentiment"]
                }
            }
        });
        const data = JSON.parse(response.text || "{}");
        const sentiment = (data.sentiment || "neutral").toLowerCase();
        
        if (data.isSensational === true || (data.credibilityScore !== undefined && data.credibilityScore < 0.4)) {
            return "negative";
        }

        if (sentiment.includes("positive")) return "positive";
        if (sentiment.includes("negative")) return "negative";
        return "neutral";
    } catch (e) {
        console.error("GEMINI: Sentiment Analysis Failed", e);
        return "neutral";
    }
}

/**
 * Rewrites a potentially sensationalist headline into a factual one.
 */
export const rewriteHeadline = async (headline: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Rewrite this news headline to be factual, calm, and non-sensational: "${headline}"`,
            config: { 
                maxOutputTokens: 100,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        rewritten: { type: Type.STRING }
                    },
                    required: ["rewritten"]
                }
            }
        });
        const data = JSON.parse(response.text || "{}");
        return data.rewritten || headline;
    } catch (e) {
        return headline;
    }
}

/**
 * Processes a raw NewsArticle with AI enrichment.
 */
export const processArticleDetox = async (article: NewsArticle): Promise<NewsArticle> => {
    try {
        // Run AI tasks in parallel for speed
        const [sentiment, rewrittenTitle, summary] = await Promise.all([
            analyzeSentiment(article.title),
            rewriteHeadline(article.title),
            (article.summary && article.summary.length > 50) ? Promise.resolve(article.summary) : summarizeContent(article.title + " " + (article.content || ""))
        ]);
        
        return {
            ...article,
            originalTitle: article.title,
            rewrittenTitle,
            sentiment,
            summary
        };
    } catch (e) {
        console.error("GEMINI: processArticleDetox failed", e);
        return article;
    }
};

/**
 * Generates an encouraging detox tip.
 */
export const analyzeDetoxProgress = async (readHistoryCount: number, userName: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `User ${userName} read ${readHistoryCount} articles. Give 1 short encouraging detox tip.`,
            config: { maxOutputTokens: 30 }
        });
        return response.text || "Stay mindful.";
    } catch (e) {
        return "Balance is key.";
    }
}
