import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, generationsTable } from "@workspace/db";
import {
  CreateGenerationBody,
  GetGenerationParams,
  DeleteGenerationParams,
  TweakGenerationParams,
  TweakGenerationBody,
} from "@workspace/api-zod";
import { runGenerationPipeline, tweakWebapp } from "../../lib/ai/pipeline.js";
import { logger } from "../../lib/logger.js";

const router: IRouter = Router();

// POST /generations — create + run pipeline synchronously
router.post("/generations", async (req, res): Promise<void> => {
  const parsed = CreateGenerationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { idea, outputType } = parsed.data;

  // Insert with pending status
  const [gen] = await db
    .insert(generationsTable)
    .values({ idea, outputType, status: "pending" })
    .returning();

  try {
    // Run two-stage AI pipeline with live status updates
    const { title, plan, result } = await runGenerationPipeline(
      idea,
      outputType as "doc" | "ppt" | "charts" | "webapp",
      async (status) => {
        await db
          .update(generationsTable)
          .set({ status, updatedAt: new Date() })
          .where(eq(generationsTable.id, gen.id));
      },
    );

    // Update to done
    const [done] = await db
      .update(generationsTable)
      .set({
        status: "done",
        title,
        plan: plan as Record<string, unknown>,
        result: result as Record<string, unknown>,
        updatedAt: new Date(),
      })
      .where(eq(generationsTable.id, gen.id))
      .returning();

    res.status(201).json(toResponse(done));
  } catch (err) {
    req.log.error({ err }, "Generation pipeline failed");
    const [failed] = await db
      .update(generationsTable)
      .set({
        status: "error",
        errorMessage: err instanceof Error ? err.message : String(err),
        updatedAt: new Date(),
      })
      .where(eq(generationsTable.id, gen.id))
      .returning();

    res.status(500).json({ error: failed.errorMessage ?? "Generation failed" });
  }
});

// GET /generations — list recent 20
router.get("/generations", async (_req, res): Promise<void> => {
  const gens = await db
    .select()
    .from(generationsTable)
    .orderBy(desc(generationsTable.createdAt))
    .limit(20);

  res.json(gens.map(toResponse));
});

// GET /generations/stats
router.get("/generations/stats", async (_req, res): Promise<void> => {
  const [total] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generationsTable);

  const byTypeRows = await db
    .select({
      outputType: generationsTable.outputType,
      count: sql<number>`count(*)::int`,
    })
    .from(generationsTable)
    .where(eq(generationsTable.status, "done"))
    .groupBy(generationsTable.outputType);

  const byType = { doc: 0, ppt: 0, charts: 0, webapp: 0 } as Record<string, number>;
  for (const row of byTypeRows) {
    byType[row.outputType] = row.count;
  }

  const [recent] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(generationsTable)
    .where(sql`created_at > now() - interval '24 hours'`);

  res.json({
    total: total?.count ?? 0,
    byType,
    recentCount: recent?.count ?? 0,
  });
});

// GET /generations/:id
router.get("/generations/:id", async (req, res): Promise<void> => {
  const params = GetGenerationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [gen] = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.id, params.data.id));

  if (!gen) {
    res.status(404).json({ error: "Generation not found" });
    return;
  }

  res.json(toResponse(gen));
});

// DELETE /generations/:id
router.delete("/generations/:id", async (req, res): Promise<void> => {
  const params = DeleteGenerationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(generationsTable)
    .where(eq(generationsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Generation not found" });
    return;
  }

  res.sendStatus(204);
});

// POST /generations/:id/tweak
router.post("/generations/:id/tweak", async (req, res): Promise<void> => {
  const params = TweakGenerationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = TweakGenerationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [gen] = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.id, params.data.id));

  if (!gen) {
    res.status(404).json({ error: "Generation not found" });
    return;
  }

  if (gen.outputType !== "webapp") {
    res.status(400).json({ error: "Tweaking is only supported for webapp generations" });
    return;
  }

  if (gen.status !== "done" || !gen.result) {
    res.status(400).json({ error: "Generation is not complete yet" });
    return;
  }

  const { message } = body.data;
  const currentResult = gen.result as { title?: string; html?: string; css?: string; js?: string; readme?: string };

  try {
    const updatedResult = await tweakWebapp(currentResult, message);

    const [updated] = await db
      .update(generationsTable)
      .set({
        result: updatedResult,
        updatedAt: new Date(),
      })
      .where(eq(generationsTable.id, gen.id))
      .returning();

    res.json(toResponse(updated));
  } catch (err) {
    req.log.error({ err }, "Tweak failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Tweak failed" });
  }
});

function toResponse(gen: typeof generationsTable.$inferSelect) {
  return {
    id: gen.id,
    outputType: gen.outputType,
    status: gen.status,
    idea: gen.idea,
    title: gen.title,
    plan: gen.plan,
    result: gen.result,
    errorMessage: gen.errorMessage,
    createdAt: gen.createdAt.toISOString(),
    updatedAt: gen.updatedAt.toISOString(),
  };
}

export default router;
