import "server-only";
import type { LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Configurable model. Nothing is hardcoded: pick a cheap, reliable model for reception work.
 *   AI_PROVIDER=openai-compatible  AI_BASE_URL=...  AI_API_KEY=...  AI_MODEL=...
 *   AI_PROVIDER=anthropic          AI_API_KEY=...   AI_MODEL=...
 * Unset → null, and the app uses the labelled FAQ-matching mode instead.
 */
export function getModel(): { model: LanguageModel; label: string } | null {
  const provider = process.env.AI_PROVIDER;
  const modelId = process.env.AI_MODEL;
  if (!provider || !modelId) return null;
  if (provider === "anthropic") {
    if (!process.env.AI_API_KEY) return null;
    return { model: createAnthropic({ apiKey: process.env.AI_API_KEY })(modelId), label: `anthropic/${modelId}` };
  }
  if (provider === "openai-compatible") {
    if (!process.env.AI_BASE_URL) return null;
    const p = createOpenAICompatible({ name: "llm", baseURL: process.env.AI_BASE_URL, apiKey: process.env.AI_API_KEY });
    return { model: p.chatModel(modelId), label: modelId };
  }
  return null;
}

/** Test hook: lets tests inject a mock model without env vars. */
let override: { model: LanguageModel; label: string } | null | undefined;
export function setModelOverride(m: { model: LanguageModel; label: string } | null | undefined) {
  override = m;
}
export function resolveModel() {
  return override !== undefined ? override : getModel();
}
