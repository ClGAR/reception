import "server-only";
import type { LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";

export type ModelChoice = { model: LanguageModel; label: string };

/**
 * Configurable models. Nothing is hardcoded: pick cheap, reliable models for reception work.
 *   AI_PROVIDER=openai-compatible  AI_BASE_URL=...  AI_API_KEY=...  AI_MODEL=primary,backup1,backup2
 *   AI_PROVIDER=anthropic          AI_API_KEY=...   AI_MODEL=...
 * AI_MODEL may list backups (comma-separated); they are tried in order when one fails.
 * Unset → empty list, and the app uses the labelled FAQ-matching mode instead.
 */
export function getModels(): ModelChoice[] {
  const provider = process.env.AI_PROVIDER;
  const ids = (process.env.AI_MODEL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!provider || !ids.length || !process.env.AI_API_KEY) return [];
  if (provider === "anthropic") {
    const p = createAnthropic({ apiKey: process.env.AI_API_KEY });
    return ids.map((id) => ({ model: p(id), label: `anthropic/${id}` }));
  }
  if (provider === "openai-compatible") {
    if (!process.env.AI_BASE_URL) return [];
    const p = createOpenAICompatible({ name: "llm", baseURL: process.env.AI_BASE_URL, apiKey: process.env.AI_API_KEY });
    return ids.map((id) => ({ model: p.chatModel(id), label: id }));
  }
  return [];
}

/** Test hook: lets tests inject a mock model without env vars. */
let override: ModelChoice | null | undefined;
export function setModelOverride(m: ModelChoice | null | undefined) {
  override = m;
}
export function resolveModels(): ModelChoice[] {
  if (override !== undefined) return override ? [override] : [];
  return getModels();
}
/** First configured model, or null in FAQ mode. */
export function resolveModel(): ModelChoice | null {
  return resolveModels()[0] ?? null;
}
