import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const systemPromptsTable = pgTable("system_prompts", {
  id: serial("id").primaryKey(),
  modality: text("modality", { enum: ["image", "text", "audio", "video"] }).notNull(),
  version: text("version").notNull(),
  prompt: text("prompt").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSystemPromptSchema = createInsertSchema(systemPromptsTable).omit({ id: true, createdAt: true });
export type InsertSystemPrompt = z.infer<typeof insertSystemPromptSchema>;
export type SystemPrompt = typeof systemPromptsTable.$inferSelect;
