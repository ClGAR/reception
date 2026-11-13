// Live model evaluation: runs each model in AI_MODEL through a full scripted booking conversation
// against a FICTIONAL temporary business and scores every step. Skipped unless EVAL_MODELS=1.
//   EVAL_MODELS=1 npx vitest run tests/eval
import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { replyToConversation } from "@/server/ai/receptionist";
import { setModelOverride } from "@/server/ai/provider";
import { timesIn } from "@/server/ai/flow-rules";
import { addDays, minuteLabel, todayIn, weekdayOf } from "@/lib/time";

const RUN = process.env.EVAL_MODELS === "1";
const models = (process.env.EVAL_MODEL_LIST ?? `${process.env.AI_MODEL},chain`).split(",").map((m) => m.trim()).filter(Boolean);
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let orgId: string;
let biz: typeof s.business.$inferSelect;
let spaId: string;
const results: { model: string; checks: Record<string, boolean>; ms: number[]; replaced: number; transcript: string[] }[] = [];

beforeAll(async () => {
  if (!RUN) return;
  orgId = randomUUID();
  await db.insert(s.organization).values({ id: orgId, name: "EVAL", slug: `eval-${randomBytes(3).toString("hex")}`, createdAt: new Date() });
  [biz] = await db
    .insert(s.business)
    .values({ organizationId: orgId, name: "Eval Salon (fictional)", slug: `eval-${randomBytes(3).toString("hex")}`, widgetToken: randomBytes(12).toString("hex"), leadTimeMinutes: 0, aiMonthlyMessageLimit: 100000, isDemo: true, parking: "Free parking in the basement for 2 hours." })
    .returning();
  const [st] = await db.insert(s.staff).values({ businessId: biz.id, name: "Eval Staff" }).returning();
  const svcs = await db
    .insert(s.service)
    .values([
      { businessId: biz.id, name: "Hair Spa", durationMinutes: 60, priceCentavos: 90000 },
      { businessId: biz.id, name: "Haircut", durationMinutes: 45, priceCentavos: 45000 },
    ])
    .returning();
  spaId = svcs[0].id;
  await db.insert(s.staffService).values(svcs.map((v) => ({ staffId: st.id, serviceId: v.id })));
  await db.insert(s.workingHours).values([0, 1, 2, 3, 4, 5, 6].map((wd) => ({ businessId: biz.id, staffId: null, weekday: wd, startMinute: 540, endMinute: 1140 })));
  await db.insert(s.knowledgeEntry).values({ businessId: biz.id, category: "parking", question: "Is there parking?", answer: "Yes, free basement parking for 2 hours." });
});

afterAll(async () => {
  if (!RUN) return;
  setModelOverride(undefined);
  const bizIds = [biz.id];
  await db.delete(s.appointment).where(eq(s.appointment.businessId, bizIds[0]));
  await db.delete(s.organization).where(eq(s.organization.id, orgId));
  const lines = [
    `# Model evaluation (${new Date().toISOString()})`,
    "",
    "| Model | Score | Asked date first | Real times only | Kept context after side question | Picked slot | Changed time | Summary shown | Booked on yes | Avg reply | Replies replaced by server |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...results.map((r) => {
      const c = r.checks;
      const score = Object.values(c).filter(Boolean).length;
      const y = (b: boolean) => (b ? "yes" : "**no**");
      return `| ${r.model === "chain" ? `**production chain** (${process.env.AI_MODEL})` : r.model} | ${score}/${Object.keys(c).length} | ${y(c.askedDate)} | ${y(c.realTimes)} | ${y(c.context)} | ${y(c.pickedSlot)} | ${y(c.changedTime)} | ${y(c.summary)} | ${y(c.booked)} | ${Math.round(r.ms.reduce((a, b) => a + b, 0) / Math.max(1, r.ms.length))} ms | ${r.replaced} |`;
    }),
    "",
    ...results.flatMap((r) => [`## ${r.model}`, "", "```", ...r.transcript, "```", ""]),
  ];
  writeFileSync("tests/eval/RESULTS.md", lines.join("\n"));
});

describe.skipIf(!RUN)("live model booking evaluation", () => {
  for (const modelId of models) {
    it(`${modelId} follows the booking flow`, { timeout: 240_000 }, async () => {
      // "chain" = the real production setup: every model in AI_MODEL, with fallback.
      if (modelId === "chain") setModelOverride(undefined);
      else {
        const p = createOpenAICompatible({ name: "llm", baseURL: process.env.AI_BASE_URL!, apiKey: process.env.AI_API_KEY });
        setModelOverride({ model: p.chatModel(modelId), label: modelId });
      }
      const [cust] = await db.insert(s.customer).values({ businessId: biz.id, name: "Website visitor" }).returning();
      const [conv] = await db.insert(s.conversation).values({ businessId: biz.id, customerId: cust.id, publicToken: randomBytes(16).toString("hex") }).returning();
      const r = { model: modelId, checks: {} as Record<string, boolean>, ms: [] as number[], replaced: 0, transcript: [] as string[] };
      results.push(r);
      const draft = async () => (await db.select().from(s.bookingDraft).where(eq(s.bookingDraft.conversationId, conv.id)))[0];
      const say = async (text: string) => {
        await db.insert(s.message).values({ businessId: biz.id, conversationId: conv.id, sender: "customer", body: text });
        const t = Date.now();
        const out = await replyToConversation(biz, conv.id);
        r.ms.push(Date.now() - t);
        if (out.kind === "replied" && out.mode === "rules") r.replaced++;
        const msgs = await db.select().from(s.message).where(eq(s.message.conversationId, conv.id)).orderBy(asc(s.message.createdAt));
        const reply = msgs.at(-1)!.body;
        r.transcript.push(`CUSTOMER: ${text}`, `AI (${out.kind}${out.kind === "replied" ? `/${out.mode}${out.note ? `: ${out.note}` : ""}` : ""}, ${Date.now() - t} ms): ${reply}`);
        await new Promise((res) => setTimeout(res, 1500)); // stay under free-tier rate limits
        return reply;
      };

      // Pick a date 3+ days out, by weekday name (tests date understanding).
      const target = addDays(todayIn(biz.timezone), 3);
      const dayName = DAYS[weekdayOf(target)];

      let reply = await say("Hi! I'd like to book a hair spa please.");
      let d = await draft();
      r.checks.askedDate = d?.serviceId === spaId && !/\b(name|email)\b/i.test(reply) && timesIn(reply).length === 0;

      reply = await say(`This ${dayName} (${target}) please, afternoon if possible.`);
      d = await draft();
      const shown = timesIn(reply);
      r.checks.realTimes = d?.date === target && d.offeredMinutes.length > 0 && shown.length > 0 && shown.every((m) => d!.offeredMinutes.includes(m) || [540, 1140].includes(m));

      reply = await say("Oh, is there parking there?");
      d = await draft();
      r.checks.context = /parking/i.test(reply) && d?.date === target && d.serviceId === spaId;

      const pick = d?.offeredMinutes.find((m) => m >= 780) ?? d?.offeredMinutes[0];
      reply = await say(`Great, ${pick !== undefined ? minuteLabel(pick) : "2:00 PM"} works for me.`);
      d = await draft();
      r.checks.pickedSlot = d?.minute === pick;

      const change = d?.offeredMinutes.find((m) => m !== pick && m >= 840) ?? d?.offeredMinutes.find((m) => m !== pick);
      reply = await say(`Sorry, can we make it ${change !== undefined ? minuteLabel(change) : "3:00 PM"} instead?`);
      d = await draft();
      r.checks.changedTime = d?.minute === change;

      reply = await say("I'm Eval Tester, eval.tester@example.test");
      d = await draft();
      r.checks.summary = d?.stage === "awaiting_confirmation" && /Shall I send this request/.test(reply);

      reply = await say("Yes please");
      const appts = await db.select().from(s.appointment).where(eq(s.appointment.conversationId, conv.id));
      r.checks.booked = appts.length === 1 && appts[0].status === "pending" && /isn't confirmed yet/.test(reply);
    });
  }
});
