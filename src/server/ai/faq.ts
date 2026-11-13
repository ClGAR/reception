import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { business as businessT, knowledgeEntry, service } from "../db/schema";
import { peso } from "@/lib/time";

type Business = typeof businessT.$inferSelect;

export interface KnowledgeAnswer {
  answer: string;
  source: { kind: "knowledge" | "service"; id: string; title: string } | null;
  /** Deterministic keyword matching — NOT a language model. Shown as such in the UI. */
  mode: "faq-match";
  confident: boolean;
}

const STOP = new Set("a an the is are do does you your we our i me my for of to in on at and or can what how much when where there any have has be it this that with".split(" "));
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, "") : w.replace(/s$/, "")));

const MEDICAL = /\b(pain|bleed|bleeding|swollen|swelling|infection|fever|emergency|allerg|diagnos|prescri|medicine|pregnan)\w*/i;

/** Answer only from approved knowledge + service list. Never invents policy. */
export async function answerFromKnowledge(biz: Business, question: string): Promise<KnowledgeAnswer> {
  if (MEDICAL.test(question))
    return {
      answer:
        "I can't give medical advice. I'll pass this to our team so a qualified staff member can help. If this is an emergency, please call your doctor or go to the nearest emergency room.",
      source: null,
      mode: "faq-match",
      confident: false,
    };
  const [entries, services] = await Promise.all([
    db.select().from(knowledgeEntry).where(and(eq(knowledgeEntry.businessId, biz.id), eq(knowledgeEntry.active, true))),
    db.select().from(service).where(and(eq(service.businessId, biz.id), eq(service.active, true))),
  ]);
  const q = new Set(words(question));
  let best: { score: number; ans: KnowledgeAnswer } | null = null;
  for (const e of entries) {
    const w = words(`${e.question} ${e.category}`);
    const score = w.filter((x) => q.has(x)).length / Math.max(2, Math.sqrt(w.length));
    if (!best || score > best.score)
      best = { score, ans: { answer: e.answer, source: { kind: "knowledge", id: e.id, title: e.question }, mode: "faq-match", confident: true } };
  }
  for (const s of services) {
    const w = words(s.name);
    const hit = w.filter((x) => q.has(x)).length;
    const score = hit ? hit / Math.max(1, w.length) + 0.3 : 0;
    if (!best || score > best.score)
      best = {
        score,
        ans: {
          answer: `${s.name} is ${peso(s.priceCentavos)} and takes about ${s.durationMinutes} minutes.${s.description ? ` ${s.description}` : ""}`,
          source: { kind: "service", id: s.id, title: `Service: ${s.name}` },
          mode: "faq-match",
          confident: true,
        },
      };
  }
  if (!best || best.score < 0.5)
    return {
      answer: "I don't have approved information about that yet. I'll ask our team to get back to you.",
      source: null,
      mode: "faq-match",
      confident: false,
    };
  return best.ans;
}
