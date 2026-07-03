# IdeaForge

A student project generator: paste your project idea, pick an output type (Doc, PPT, Charts, or Webapp), and AI produces a ready-to-submit deliverable in under a minute.

## Run & Operate

- `pnpm --filter @workspace/ideaforge run dev` — run the frontend (port auto-assigned)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port auto-assigned)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (auto-provisioned)
- Required env: `GEMINI_API_KEY` — Google Gemini API key
- Required env: `OPENROUTER_API_KEY` — OpenRouter API key (Nemotron fallback)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + shadcn/ui
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- AI: Gemini 2.5 Flash (primary) → OpenRouter Nemotron (fallback)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/db/src/schema/generations.ts` — generations table schema
- `artifacts/api-server/src/lib/ai/pipeline.ts` — two-stage AI pipeline (plan → generate)
- `artifacts/api-server/src/lib/ai/gemini.ts` — Gemini client using GEMINI_API_KEY
- `artifacts/api-server/src/lib/ai/openrouter.ts` — OpenRouter client using OPENROUTER_API_KEY
- `artifacts/api-server/src/routes/generations/index.ts` — generation CRUD + tweak endpoints
- `artifacts/ideaforge/src/pages/` — Home, Result, History pages
- `artifacts/ideaforge/src/components/results/` — DocResult, PptResult, ChartsResult, WebAppResult

## Architecture decisions

- **Synchronous generation**: POST /generations blocks until done (~20-30s). Keeps the API simple for a demo/college project. Status updates (planning → generating → done) are written to DB during the call.
- **Gemini-first with OpenRouter fallback**: both API errors AND JSON parse failures from Gemini trigger fallback to OpenRouter Nemotron. extractJson handles multiple code fence patterns, outermost-object extraction, and raw JSON.
- **Webapp output is sandboxed**: iframe uses `sandbox="allow-scripts"` only (no `allow-same-origin`) to prevent AI-generated JS from accessing the host app context.
- **Output stored as JSONB**: plan and result are stored as jsonb in Postgres; each output type has a well-defined shape interpreted client-side.

## Product

- **Home** (`/`): Paste idea → pick output type (Doc, PPT, Charts, Webapp) → Generate
- **Result** (`/generations/:id`): View the generated deliverable with type-specific renderer + download
  - Doc: rendered Markdown + download as .md
  - PPT: slide deck viewer with navigation + download JSON
  - Charts: Recharts-rendered charts + download
  - Webapp: iframe preview + tweak chat box + download files
- **History** (`/history`): Grid of past generations with stats, delete, and re-view

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After any change to `lib/api-spec/openapi.yaml`, run `pnpm --filter @workspace/api-spec run codegen`
- After any change to `lib/db/src/schema/`, run `pnpm run typecheck:libs` then `pnpm --filter @workspace/db run push`
- The Gemini model used is `gemini-2.5-flash`; OpenRouter fallback uses `nvidia/nemotron-3-super-120b-a12b:free`
- POST /generations is synchronous and can take 20-60s depending on AI response times

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
