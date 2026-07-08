import OpenAI from "openai";
import { logger } from "../logger.js";

const apiKey = process.env.OPENROUTER_API_KEY;

// Llama 3.3 70B — strong JSON instruction-following, supports response_format JSON mode
const FALLBACK_MODEL = "meta-llama/llama-3.3-70b-instruct:free";

// Mandatory JSON prefix injected into every system prompt so callers cannot disable JSON mode
const JSON_MANDATE =
  "You MUST respond with valid JSON only — no prose, no markdown fences, no explanation. Your entire response must be a single JSON object.\n\n";

// Default system prompt when no caller-supplied one is given
const DEFAULT_SYSTEM_PROMPT =
  JSON_MANDATE + "You are a helpful assistant.";

// Conservative token limit known to be accepted on free routes
const MAX_TOKENS = 16384;

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
  extraSystemContext?: string,
): Promise<string> {
  const client = getOpenRouterClient();

  // Always prepend the JSON mandate — callers may only add context, not override the constraint
  const systemContent = extraSystemContext
    ? JSON_MANDATE + extraSystemContext
    : DEFAULT_SYSTEM_PROMPT;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    { role: "user", content: prompt },
  ];

  // Attempt 1: response_format json_object (enforced at API level)
  try {
    const response = await client.chat.completions.create({
      model: FALLBACK_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
      response_format: { type: "json_object" },
    });
    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("OpenRouter returned empty response");
    return text;
  } catch (err) {
    // Attempt 2: some provider routes reject response_format — retry with prompt-only enforcement
    logger.warn({ err }, "OpenRouter JSON-mode request failed, retrying without response_format");
    const response = await client.chat.completions.create({
      model: FALLBACK_MODEL,
      max_tokens: MAX_TOKENS,
      messages,
    });
    const text = response.choices[0]?.message?.content;
    if (!text) throw new Error("OpenRouter returned empty response on retry");
    return text;
  }
}
