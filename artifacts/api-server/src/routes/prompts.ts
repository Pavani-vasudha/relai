import { Router } from "express";
import { db, systemPromptsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { CreatePromptBody, UpdatePromptParams, UpdatePromptBody, DeletePromptParams, ActivatePromptParams } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router = Router();

router.get("/prompts", requireAuth, async (req, res): Promise<void> => {
  const prompts = await db.select().from(systemPromptsTable).orderBy(systemPromptsTable.createdAt);
  res.json(prompts);
});

router.post("/prompts", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePromptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { modality, version, prompt, isActive } = parsed.data;

  if (isActive) {
    // Deactivate other prompts for this modality
    await db
      .update(systemPromptsTable)
      .set({ isActive: false })
      .where(and(
        eq(systemPromptsTable.modality, modality),
        eq(systemPromptsTable.isActive, true)
      ));
  }

  const [created] = await db
    .insert(systemPromptsTable)
    .values({ modality, version, prompt, isActive: isActive ?? false })
    .returning();

  res.status(201).json(created);
});

router.put("/prompts/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = UpdatePromptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdatePromptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.modality != null) updates.modality = parsed.data.modality;
  if (parsed.data.version != null) updates.version = parsed.data.version;
  if (parsed.data.prompt != null) updates.prompt = parsed.data.prompt;
  if (parsed.data.isActive != null) updates.isActive = parsed.data.isActive;

  const [updated] = await db
    .update(systemPromptsTable)
    .set(updates)
    .where(eq(systemPromptsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Prompt not found" });
    return;
  }
  res.json(updated);
});

router.delete("/prompts/:id", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = DeletePromptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(systemPromptsTable)
    .where(eq(systemPromptsTable.id, params.data.id))
    .returning({ id: systemPromptsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Prompt not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/prompts/:id/activate", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const params = ActivatePromptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [target] = await db
    .select()
    .from(systemPromptsTable)
    .where(eq(systemPromptsTable.id, params.data.id))
    .limit(1);

  if (!target) {
    res.status(404).json({ error: "Prompt not found" });
    return;
  }

  // Deactivate other prompts of same modality
  await db
    .update(systemPromptsTable)
    .set({ isActive: false })
    .where(and(
      eq(systemPromptsTable.modality, target.modality),
      eq(systemPromptsTable.isActive, true)
    ));

  const [activated] = await db
    .update(systemPromptsTable)
    .set({ isActive: true })
    .where(eq(systemPromptsTable.id, params.data.id))
    .returning();

  res.json(activated);
});

export default router;
