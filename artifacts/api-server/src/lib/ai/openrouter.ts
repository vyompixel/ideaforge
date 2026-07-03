import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;

// Free Nemotron model on OpenRouter
const NEMOTRON_MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

let _openrouter: OpenAI | null = null;

export function getOpenRouterClient(): OpenAI {
  if (!_openrouter) {
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set");
    }
    _openrouter = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    });
  }
  return _openrouter;
}

export async function callOpenRouter(
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  const client = getOpenRouterClient();
  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const response = await client.chat.completions.create({
    model: NEMOTRON_MODEL,
    max_tokens: 8192,
    messages,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned empty response");
  return text;
}
