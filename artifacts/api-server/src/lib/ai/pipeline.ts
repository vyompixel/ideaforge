import { callGemini } from "./gemini.js";
import { callOpenRouter } from "./openrouter.js";
import { logger } from "../logger.js";

type OutputType = "doc" | "ppt" | "charts" | "webapp";

// Resilient JSON extraction — handles fenced blocks, prose before/after, and raw JSON
function extractJson(text: string): unknown {
  // 1. Try fenced code blocks (```json ... ``` or ``` ... ```)
  const fenceMatches = [...text.matchAll(/```(?:json|JSON)?\s*([\s\S]*?)```/g)];
  for (const m of fenceMatches) {
    try { return JSON.parse(m[1].trim()); } catch { /* try next */ }
  }

  // 2. Try extracting the outermost { } object
  const objStart = text.indexOf("{");
  const objEnd = text.lastIndexOf("}");
  if (objStart !== -1 && objEnd > objStart) {
    try { return JSON.parse(text.slice(objStart, objEnd + 1)); } catch { /* continue */ }
  }

  // 3. Try the whole trimmed text
  try { return JSON.parse(text.trim()); } catch { /* continue */ }

  throw new Error(`Could not extract valid JSON from model response. Raw (first 500 chars): ${text.slice(0, 500)}`);
}

// Try Gemini first for text; if API call OR JSON parse fails, fall back to OpenRouter
async function callAIWithParse(prompt: string): Promise<unknown> {
  let geminiText: string | null = null;
  try {
    geminiText = await callGemini(prompt);
    return extractJson(geminiText);
  } catch (geminiErr) {
    logger.warn({ err: geminiErr, hadText: geminiText !== null }, "Gemini stage failed, falling back to OpenRouter");
    const orText = await callOpenRouter(prompt);
    return extractJson(orText);
  }
}

// ─── Planner prompts ────────────────────────────────────────────────────────

function getPlannerPrompt(idea: string, outputType: OutputType): string {
  const base = `You are an expert academic project planner. A student has this project idea:\n"${idea}"\n\n`;

  const formats: Record<OutputType, string> = {
    doc: `${base}Create a detailed document plan. Return ONLY valid JSON in exactly this format:
{
  "title": "descriptive document title",
  "summary": "one-sentence overview of the document",
  "sections": [
    { "heading": "section title", "keyPoints": ["point 1", "point 2", "point 3"] }
  ]
}
Plan 5-8 meaningful sections. Be specific and practical for this project idea.`,

    ppt: `${base}Create a slide deck plan. Return ONLY valid JSON in exactly this format:
{
  "title": "presentation title",
  "theme": "brief style/color direction e.g. 'dark tech', 'bright academic', 'minimal corporate'",
  "slideOutline": [
    { "title": "slide title", "bulletPoints": ["bullet 1", "bullet 2", "bullet 3"], "notes": "speaker notes" }
  ]
}
Plan 8-12 slides including title slide, agenda, content slides, and conclusion. Be specific.`,

    charts: `${base}Create a data visualization plan. Return ONLY valid JSON in exactly this format:
{
  "title": "visualization set title",
  "context": "one-sentence description of what these charts illustrate",
  "charts": [
    { "name": "chart title", "type": "bar|line|pie|doughnut", "description": "what this chart shows and why it matters", "xAxis": "what the x-axis represents", "yAxis": "what the y-axis represents" }
  ]
}
Plan 3-5 meaningful charts that tell a data story about this project. Choose chart types that make sense for the data.`,

    webapp: `${base}Create a web app blueprint. Return ONLY valid JSON in exactly this format:
{
  "title": "app name",
  "tagline": "one-sentence value proposition",
  "description": "2-3 sentence app description",
  "features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"],
  "pages": ["page name: what it does"],
  "colorScheme": "describe primary color and overall aesthetic e.g. 'deep blue with white accents, modern minimal'",
  "targetUser": "who uses this app and why"
}
Be creative and specific. The app must be implementable in vanilla HTML/CSS/JS.`,
  };

  return formats[outputType];
}

// ─── Generator prompts ───────────────────────────────────────────────────────

function getGeneratorPrompt(plan: unknown, idea: string, outputType: OutputType): string {
  const planStr = JSON.stringify(plan, null, 2);
  const base = `You are an expert at generating complete, ready-to-submit student project deliverables.\n\nOriginal idea: "${idea}"\n\nPlan:\n${planStr}\n\n`;

  const formats: Record<OutputType, string> = {
    doc: `${base}Write the COMPLETE document in Markdown. Include all sections with detailed, substantive content — this must be ready to submit. Be thorough, specific, and professional.
Return ONLY valid JSON in exactly this format:
{
  "title": "document title",
  "content": "# Title\\n\\n## Section\\n\\nContent here..."
}
The content field must be a complete Markdown document with proper headings, paragraphs, and detail. Use \\n for newlines inside the JSON string.`,

    ppt: `${base}Generate the complete slide deck content. Each slide should have compelling, concise content.
Return ONLY valid JSON in exactly this format:
{
  "title": "presentation title",
  "slides": [
    { "id": 1, "title": "slide title", "layout": "title|bullets|content|two-column", "content": "main content or subtitle for title slides", "bullets": ["bullet 1", "bullet 2"], "notes": "speaker notes" }
  ]
}
Generate all slides from the plan. Use layout: "title" for the opening slide, "bullets" for bullet-point slides, "content" for prose slides. Make content specific and substantial.`,

    charts: `${base}Generate complete Chart.js-compatible data for all charts. Make data realistic and meaningful for the project topic.
Return ONLY valid JSON in exactly this format:
{
  "title": "visualization title",
  "description": "what story these charts tell",
  "charts": [
    {
      "name": "chart title",
      "type": "bar|line|pie|doughnut",
      "description": "what this shows",
      "config": {
        "labels": ["label1", "label2", "label3"],
        "datasets": [
          { "label": "dataset name", "data": [10, 20, 30] }
        ]
      }
    }
  ]
}
Generate all charts from the plan with realistic numeric data. For pie/doughnut charts, datasets should have one dataset with data summing to 100 or a meaningful total.`,

    webapp: `${base}Generate a COMPLETE, FUNCTIONAL vanilla HTML/CSS/JS web application. This must work when the HTML file is opened directly in a browser — no build step, no frameworks, no external dependencies (except CDN links if needed for specific libraries like Chart.js).

Requirements:
- Modern, polished design matching the colorScheme in the plan
- Fully functional interactive features
- Mobile-responsive
- All CSS inline in a <style> tag or separate field
- All JS inline in a <script> tag or separate field
- Include a detailed README explaining how to use and extend it

Return ONLY valid JSON in exactly this format:
{
  "title": "app name",
  "html": "<!DOCTYPE html>\\n<html>...",
  "css": "/* CSS here - can be empty string if styles are inline in HTML */",
  "js": "/* JS here - can be empty string if scripts are inline in HTML */",
  "readme": "# App Name\\n\\n## How to Use\\n\\n..."
}
Make the HTML complete and self-contained. Use \\n for newlines in JSON strings. The app must be impressive and fully functional.`,
  };

  return formats[outputType];
}

// ─── Main pipeline ───────────────────────────────────────────────────────────

export interface PipelineResult {
  title: string;
  plan: unknown;
  result: unknown;
}

export type OnStatusUpdate = (status: "planning" | "generating") => Promise<void>;

export async function tweakWebapp(
  currentResult: { title?: string; html?: string; css?: string; js?: string; readme?: string },
  message: string,
): Promise<Record<string, unknown>> {
  const prompt = `You are a web developer. A student has a vanilla HTML/CSS/JS web app and wants to make a change.

Current app title: "${currentResult.title ?? ""}"

Current HTML:
\`\`\`html
${currentResult.html ?? ""}
\`\`\`

Current CSS:
\`\`\`css
${currentResult.css ?? ""}
\`\`\`

Current JS:
\`\`\`javascript
${currentResult.js ?? ""}
\`\`\`

The student's requested change: "${message}"

Apply the change and return the updated app. Return ONLY valid JSON in exactly this format:
{
  "title": "app name",
  "html": "complete updated HTML",
  "css": "updated CSS",
  "js": "updated JS",
  "readme": "updated README"
}
Keep all existing functionality intact — only apply the requested change. Use \\n for newlines in JSON strings.`;

  return await callAIWithParse(prompt) as Record<string, unknown>;
}

export async function runGenerationPipeline(
  idea: string,
  outputType: OutputType,
  onStatus?: OnStatusUpdate,
): Promise<PipelineResult> {
  // Stage 1: Plan
  logger.info({ outputType }, "Stage 1: Running planner");
  await onStatus?.("planning");
  const plannerPrompt = getPlannerPrompt(idea, outputType);
  const plan = await callAIWithParse(plannerPrompt) as Record<string, unknown>;
  const planTitle = (plan.title as string) ?? "Project";

  // Stage 2: Generate
  logger.info({ outputType, planTitle }, "Stage 2: Running generator");
  await onStatus?.("generating");
  const generatorPrompt = getGeneratorPrompt(plan, idea, outputType);
  const result = await callAIWithParse(generatorPrompt) as Record<string, unknown>;
  const resultTitle = (result.title as string) ?? planTitle;

  return { title: resultTitle, plan, result };
}
