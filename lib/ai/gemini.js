import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export function getGeminiModel(modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash") {
  if (!genAI) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }
  return genAI.getGenerativeModel({ model: modelName });
}
