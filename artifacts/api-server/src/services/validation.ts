import crypto from "crypto";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, systemPromptsTable, assetValidationsTable, projectConfigsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const COST_PER_INPUT_TOKEN = 0.000005; // $5 per 1M input tokens (gpt-5.2)
const COST_PER_OUTPUT_TOKEN = 0.000015; // $15 per 1M output tokens

export interface PreCheckResults {
  blurScore: number | null;
  isDuplicate: boolean;
  piiDetected: boolean;
  piiItems: string[];
}

export interface ValidationOutput {
  status: "PASS" | "FAIL";
  reasons: string[];
  confidence: number;
  tokensUsed: number;
  cost: number;
  latency: number;
  rawResponse: string;
  preCheckResults: PreCheckResults;
}

// Simple PII patterns
const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "email", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { name: "phone_us", regex: /\b(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/g },
  { name: "ssn", regex: /\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/g },
  { name: "credit_card", regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
];

export function detectPII(text: string): { detected: boolean; items: string[] } {
  const items: string[] = [];
  for (const { name, regex } of PII_PATTERNS) {
    regex.lastIndex = 0;
    if (regex.test(text)) {
      items.push(name);
    }
  }
  return { detected: items.length > 0, items };
}

export function hashContent(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export async function checkDuplicate(projectId: number, hash: string): Promise<boolean> {
  const existing = await db
    .select({ id: assetValidationsTable.id })
    .from(assetValidationsTable)
    .where(
      and(
        eq(assetValidationsTable.projectId, projectId),
        eq(assetValidationsTable.assetHash, hash)
      )
    )
    .limit(1);
  return existing.length > 0;
}

// Simple blur detection mock — for images we give a random score 0–1
// In a real implementation, this would use sharp or jimp
export function detectBlur(assetContent: string, assetType: string): number | null {
  if (assetType !== "image") return null;
  // Mock: use content length as a proxy for image complexity
  const len = assetContent.length;
  const score = Math.min(1, Math.max(0, (len % 100) / 100));
  return Math.round(score * 100) / 100;
}

export async function runAIValidation(params: {
  projectId: number;
  assetContent: string;
  assetType: string;
  validationRules: string;
  promptOverride?: string | null;
  model?: string | null;
}): Promise<{ status: "PASS" | "FAIL"; reasons: string[]; confidence: number; tokensUsed: number; cost: number; latency: number; rawResponse: string }> {
  const { projectId, assetContent, assetType, validationRules, promptOverride, model } = params;

  // Get active system prompt for this modality
  let systemPromptText = `You are an AI asset quality validator. Your job is to evaluate the given asset against the provided validation rules and return a structured JSON response.

Always respond with valid JSON in this exact format:
{
  "status": "PASS" or "FAIL",
  "reasons": ["reason1", "reason2"],
  "confidence": 0.0 to 1.0
}`;

  if (!promptOverride) {
    try {
      const [activePrompt] = await db
        .select()
        .from(systemPromptsTable)
        .where(
          and(
            eq(systemPromptsTable.modality, assetType as "image" | "text" | "audio" | "video"),
            eq(systemPromptsTable.isActive, true)
          )
        )
        .limit(1);
      if (activePrompt) {
        systemPromptText = activePrompt.prompt;
      }
    } catch (err) {
      logger.warn({ err }, "Failed to fetch system prompt, using default");
    }
  } else {
    systemPromptText = promptOverride;
  }

  const userMessage = `Asset Type: ${assetType}
Validation Rules: ${validationRules || "Standard quality validation"}

Asset Content:
${assetContent.length > 8000 ? assetContent.slice(0, 8000) + "... [truncated]" : assetContent}

Please evaluate this asset and respond with JSON only.`;

  const selectedModel = model ?? "gpt-5.2";
  const start = Date.now();

  try {
    const response = await openai.chat.completions.create({
      model: selectedModel,
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPromptText },
        { role: "user", content: userMessage },
      ],
    });

    const latency = Date.now() - start;
    const rawResponse = response.choices[0]?.message?.content ?? "{}";
    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const tokensUsed = inputTokens + outputTokens;
    const cost = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN;

    let parsed: { status: "PASS" | "FAIL"; reasons: string[]; confidence: number };
    try {
      // Extract JSON from response (sometimes wrapped in markdown)
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : rawResponse;
      parsed = JSON.parse(jsonStr);
      if (!parsed.status || !["PASS", "FAIL"].includes(parsed.status)) {
        throw new Error("Invalid status");
      }
    } catch {
      logger.warn({ rawResponse }, "Failed to parse AI response, defaulting to FAIL");
      parsed = {
        status: "FAIL",
        reasons: ["Unable to parse AI validation response"],
        confidence: 0,
      };
    }

    return {
      status: parsed.status,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      tokensUsed,
      cost: Math.round(cost * 1_000_000) / 1_000_000,
      latency,
      rawResponse,
    };
  } catch (err) {
    const latency = Date.now() - start;
    logger.error({ err }, "AI validation failed");
    // Mock response when AI is unavailable
    return {
      status: "FAIL",
      reasons: ["AI validation service unavailable"],
      confidence: 0,
      tokensUsed: 0,
      cost: 0,
      latency,
      rawResponse: String(err),
    };
  }
}
