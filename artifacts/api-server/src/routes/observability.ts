import { Router } from "express";
import { db, assetValidationsTable, projectsTable } from "@workspace/db";
import { eq, and, sum, avg, count, desc } from "drizzle-orm";
import { GetObservabilityQueryParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/observability", requireAuth, async (req, res): Promise<void> => {
  const params = GetObservabilityQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const conditions = [];
  if (params.data.projectId != null) {
    conditions.push(eq(assetValidationsTable.projectId, params.data.projectId));
  }
  if (params.data.result != null) {
    conditions.push(eq(assetValidationsTable.validationResult, params.data.result as "PASS" | "FAIL"));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const records = await db
    .select({
      id: assetValidationsTable.id,
      projectId: assetValidationsTable.projectId,
      projectName: projectsTable.name,
      assetName: assetValidationsTable.assetName,
      validationResult: assetValidationsTable.validationResult,
      reasons: assetValidationsTable.reasons,
      tokensUsed: assetValidationsTable.tokensUsed,
      cost: assetValidationsTable.cost,
      latency: assetValidationsTable.latency,
      confidence: assetValidationsTable.confidence,
      createdAt: assetValidationsTable.createdAt,
    })
    .from(assetValidationsTable)
    .leftJoin(projectsTable, eq(assetValidationsTable.projectId, projectsTable.id))
    .where(whereClause)
    .orderBy(desc(assetValidationsTable.createdAt))
    .limit(500);

  const [agg] = await db
    .select({
      totalCost: sum(assetValidationsTable.cost),
      totalTokens: sum(assetValidationsTable.tokensUsed),
      avgLatency: avg(assetValidationsTable.latency),
      totalRecords: count(assetValidationsTable.id),
    })
    .from(assetValidationsTable)
    .where(whereClause);

  const [passCnt] = await db
    .select({ passCount: count(assetValidationsTable.id) })
    .from(assetValidationsTable)
    .where(
      conditions.length > 0
        ? and(...conditions, eq(assetValidationsTable.validationResult, "PASS"))
        : eq(assetValidationsTable.validationResult, "PASS")
    );

  const totalRecords = Number(agg?.totalRecords ?? 0);
  const passCount = Number(passCnt?.passCount ?? 0);

  res.json({
    records: records.map(r => ({
      ...r,
      projectName: r.projectName ?? "Unknown",
      tokensUsed: Number(r.tokensUsed),
      cost: Number(r.cost),
      confidence: Number(r.confidence),
    })),
    metrics: {
      totalCost: Math.round(Number(agg?.totalCost ?? 0) * 1_000_000) / 1_000_000,
      totalTokens: Number(agg?.totalTokens ?? 0),
      avgLatency: Math.round(Number(agg?.avgLatency ?? 0)),
      totalRecords,
      passCount,
      failCount: totalRecords - passCount,
    },
  });
});

export default router;
