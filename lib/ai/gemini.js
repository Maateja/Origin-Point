import { GoogleGenerativeAI } from "@google/generative-ai";

export function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your_gemini_api_key") return null;
  return new GoogleGenerativeAI(apiKey);
}

export const genAI = getGenAI();

export function getGeminiModel(modelName = "gemini-2.5-flash", options = {}) {
  const ai = getGenAI();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  return ai.getGenerativeModel({ model: modelName, ...options });
}
