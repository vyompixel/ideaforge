import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

let _gemini: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!_gemini) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    _gemini = new GoogleGenAI({ apiKey });
  }
  return _gemini;
}

export async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      maxOutputTokens: 65536,
      ...(systemInstruction ? { systemInstruction } : {}),
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned empty response");
  return text;
}
