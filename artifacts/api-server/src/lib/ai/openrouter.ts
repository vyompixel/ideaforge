import OpenAI from "openai";
import { logger } from "../logger.js";

const apiKey = process.env.OPENROUTER_API_KEY;

// Model chain — tried in order until one succeeds.
// All are free on OpenRouter and have good JSON instruction-following.
const FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",   // strong, supports json_object mode
  "deepseek/deepseek-chat-v3-0324:free",       // excellent quality, different provider pool
  "google/gemini-2.0-flash-exp:free",           // Google-hosted, separate rate limits
  "mistralai/mistral-7b-instruct:free",         // small but reliable last resort
];

// Mandatory JSON prefix injected into every system prompt
const JSON_MANDATE =
  "You MUST respond with valid JSON only — no prose, no markdown fences, no explanation. Your entire response must be a single JSON object.\n\n";

const DEFAULT_SYSTEM_PROMPT = JSON_MANDATE + "You are a helpful assistant.";

// Conservative token limit known to be accepted across free routes
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

  // Always prepend the JSON mandate — callers may add context but cannot disable the constraint
  const systemContent = extraSystemContext
    ? JSON_MANDATE + extraSystemContext
    : DEFAULT_SYSTEM_PROMPT;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
    { role: "user", content: prompt },
  ];

  let lastErr: unknown;

  for (const model of FALLBACK_MODELS) {
    // Attempt A: with response_format json_object (API-level enforcement)
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: MAX_TOKENS,
        messages,
        response_format: { type: "json_object" },
      });
      const text = response.choices[0]?.message?.content;
      if (!text) throw new Error(`${model} returned empty response`);
      logger.info({ model }, "OpenRouter model succeeded");
      return text;
    } catch (errA) {
      const status = (errA as { status?: number }).status;
      if (status === 429 || status === 503) {
        // Rate-limited or unavailable — skip to next model immediately
        logger.warn({ model, status }, "OpenRouter model rate-limited/unavailable, trying next model");
        lastErr = errA;
        continue;
      }
      // Attempt B: provider rejected response_format — retry same model without it
      try {
        logger.warn({ model, err: errA }, "OpenRouter JSON-mode rejected, retrying without response_format");
        const response = await client.chat.completions.create({
          model,
          max_tokens: MAX_TOKENS,
          messages,
        });
        const text = response.choices[0]?.message?.content;
        if (!text) throw new Error(`${model} returned empty response on retry`);
        logger.info({ model }, "OpenRouter model succeeded (no response_format)");
        return text;
      } catch (errB) {
        const statusB = (errB as { status?: number }).status;
        if (statusB === 429 || statusB === 503) {
          logger.warn({ model, statusB }, "OpenRouter model rate-limited on retry, trying next model");
          lastErr = errB;
          continue;
        }
        lastErr = errB;
        continue; // unexpected error — still try next model
      }
    }
  }

  throw new Error(
    `All OpenRouter fallback models exhausted. Last error: ${(lastErr as Error)?.message ?? String(lastErr)}`
  );
}
