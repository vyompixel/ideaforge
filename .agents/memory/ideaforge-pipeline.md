---
name: IdeaForge AI pipeline
description: How the two-stage generation pipeline and AI fallback work in IdeaForge
---

## Rule
Gemini is the primary model (`gemini-2.5-flash` via `GEMINI_API_KEY`). OpenRouter Nemotron (`nvidia/nemotron-3-super-120b-a12b:free` via `OPENROUTER_API_KEY`) is the fallback. Fallback is triggered by BOTH API call failures AND JSON parse failures from Gemini — not just network errors.

**Why:** LLMs often return valid responses but with malformed JSON or extra prose. Catching parse errors in the fallback layer prevents hard failures when Gemini output is unparseable.

**How to apply:** In `pipeline.ts`, `callAIWithParse()` tries Gemini, then runs `extractJson()` on the result. If either throws, it falls back to OpenRouter for the same prompt. The `tweakWebapp()` function uses the same pattern.

## Iframe sandbox
WebApp result renders generated HTML in an iframe with `sandbox="allow-scripts"` only. No `allow-same-origin` — that combination with untrusted AI-generated JS would allow script access to the host app context.

## extractJson strategy
1. All fenced code blocks (```json or ```)
2. Outermost { } object extraction
3. Raw text parse
4. Throws with first 500 chars of raw response on total failure
