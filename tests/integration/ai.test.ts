// AI receptionist tests with a deterministic mock model (no real provider). FICTIONAL test tenant, cleaned up after.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { replyToConversation } from "@/server/ai/receptionist";
import { setModelOverride } from "@/server/ai/provider";
import { addDays, todayIn } from "@/lib/time";

const orgs: string[] = [];
let biz: typeof s.business.$inferSelect;
let svcId: string;
const date = addDays(todayIn("Asia/Manila"), 3);

const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
const text = (t: string) => ({ content: [{ type: "text" as const, text: t }], finishReason: { unified: "stop" as const, raw: undefined }, usage, warnings: [] });
const call = (toolName: string, input: unknown) => ({
  content: [{ type: "tool-call" as const, toolCallId: randomUUID(), toolName, input: JSON.stringify(input) }],
  finishReason: { unified: "tool-calls" as const, raw: undefined },
  usage,
  warnings: [],
});
function scripted(steps: ReturnType<typeof text | typeof call>[]) {
  let i = 0;
  return { label: "mock", model: new MockLanguageModelV4({ doGenerate: async () => steps[Math.min(i++, steps.length - 1)] }) };
}

async function newConversation(firstMessage: string) {
  const [cust] = await db.insert(s.customer).values({ businessId: biz.id, name: "Website visitor" }).returning();
  const [conv] = await db.insert(s.conversation).values({ businessId: biz.id, customerId: cust.id, publicToken: randomBytes(16).toString("hex") }).returning();
  await db.insert(s.message).values({ businessId: biz.id, conversationId: conv.id, sender: "customer", body: firstMessage });
  return conv;
}
const messagesOf = (id: string) => db.select().from(s.message).where(eq(s.message.conversationId, id)).orderBy(asc(s.message.createdAt));

beforeAll(async () => {
  const orgId = randomUUID();
  orgs.push(orgId);
  await db.insert(s.organization).values({ id: orgId, name: "TEST ai", slug: `test-ai-${randomBytes(3).toString("hex")}`, createdAt: new Date() });
  [biz] = await db
    .insert(s.business)
    .values({ organizationId: orgId, name: "TEST AI Salon", slug: `test-ai-${randomBytes(3).toString("hex")}`, widgetToken: randomBytes(12).toString("hex"), leadTimeMinutes: 0, isDemo: true })
    .returning();
  const [st] = await db.insert(s.staff).values({ businessId: biz.id, name: "Test Staff" }).returning();
  const [svc] = await db.insert(s.service).values({ businessId: biz.id, name: "Cleaning", durationMinutes: 60, priceCentavos: 80000 }).returning();
  svcId = svc.id;
  await db.insert(s.staffService).values({ staffId: st.id, serviceId: svc.id });
  await db.insert(s.workingHours).values([0, 1, 2, 3, 4, 5, 6].map((wd) => ({ businessId: biz.id, staffId: null, weekday: wd, startMinute: 540, endMinute: 1080 })));
  await db.insert(s.knowledgeEntry).values({ businessId: biz.id, category: "parking", question: "Is there parking?", answer: "Yes, free basement parking." });
});

afterEach(() => setModelOverride(undefined));

afterAll(async () => {
  await db.delete(s.appointment).where(eq(s.appointment.businessId, biz.id));
  await db.delete(s.organization).where(inArray(s.organization.id, orgs));
});

describe("AI receptionist", () => {
  it("books through server tools: list → availability → request (pending, never 'confirmed')", async () => {
    const conv = await newConversation("Hi, can I book a cleaning at 2 PM? I'm Test Person, test.person@example.test");
    setModelOverride(
      scripted([
        call("listServices", {}),
        call("checkAvailability", { serviceId: svcId, date }),
        call("createBookingRequest", { serviceId: svcId, date, minute: 840, customerName: "Test Person", customerEmail: "test.person@example.test", customerAgreed: true }),
        text("Your request for 2:00 PM is in. Our team will confirm it shortly."),
      ]),
    );
    const out = await replyToConversation(biz, conv.id);
    expect(out.kind).toBe("replied");
    const [appt] = await db.select().from(s.appointment).where(and(eq(s.appointment.conversationId, conv.id)));
    expect(appt.status).toBe("pending");
    expect(appt.source).toBe("chat");
    const [cust] = await db.select().from(s.customer).where(eq(s.customer.id, conv.customerId));
    expect(cust.email).toBe("test.person@example.test");
    expect(cust.consentAt).not.toBeNull();
    const msgs = await messagesOf(conv.id);
    expect(msgs.at(-1)).toMatchObject({ sender: "ai", simulated: false });
    const usageRows = await db.select().from(s.aiUsage).where(eq(s.aiUsage.conversationId, conv.id));
    expect(usageRows[0]).toMatchObject({ model: "mock", inputTokens: 40 });
  });

  it("rejects a booking for a time the engine doesn't offer", async () => {
    const conv = await newConversation("Book me at 11 PM please. Test Late, late@example.test");
    setModelOverride(
      scripted([
        call("createBookingRequest", { serviceId: svcId, date, minute: 1380, customerName: "Test Late", customerEmail: "late@example.test", customerAgreed: true }),
        text("Sorry, 11 PM isn't available."),
      ]),
    );
    await replyToConversation(biz, conv.id);
    expect(await db.select().from(s.appointment).where(eq(s.appointment.conversationId, conv.id))).toHaveLength(0);
  });

  it("human takeover: no automated reply while staff handle the conversation", async () => {
    const conv = await newConversation("Hello?");
    await db.update(s.conversation).set({ handledBy: "human" }).where(eq(s.conversation.id, conv.id));
    setModelOverride(scripted([text("should never be sent")]));
    const out = await replyToConversation(biz, conv.id);
    expect(out).toEqual({ kind: "skipped", reason: "human" });
    expect((await messagesOf(conv.id)).filter((m) => m.sender === "ai")).toHaveLength(0);
  });

  it("provider failure: safe fallback, staff handoff, no booking", async () => {
    const conv = await newConversation("Book a cleaning tomorrow");
    setModelOverride({
      label: "mock",
      model: new MockLanguageModelV4({
        doGenerate: async () => {
          throw new Error("provider down");
        },
      }),
    });
    const out = await replyToConversation(biz, conv.id);
    expect(out.kind).toBe("handoff");
    const [c] = await db.select().from(s.conversation).where(eq(s.conversation.id, conv.id));
    expect(c.handledBy).toBe("human");
    const last = (await messagesOf(conv.id)).at(-1)!;
    expect(last.body).not.toMatch(/confirm/i);
    expect(await db.select().from(s.handoff).where(eq(s.handoff.conversationId, conv.id))).toHaveLength(1);
  });

  it("handoffToStaff tool pauses AI and notifies staff", async () => {
    const conv = await newConversation("Can I talk to a person?");
    setModelOverride(scripted([call("handoffToStaff", { reason: "Customer asked for a person" }), text("Sure, a team member will reply here.")]));
    const out = await replyToConversation(biz, conv.id);
    expect(out.kind).toBe("handoff");
    const notes = await db.select().from(s.notificationOutbox).where(eq(s.notificationOutbox.kind, "handoff.requested"));
    expect(notes.some((n) => (n.payload as { conversationId: string }).conversationId === conv.id)).toBe(true);
  });

  it("no provider: FAQ answer is stored as simulated (labelled), unknown → handoff", async () => {
    setModelOverride(null);
    const known = await newConversation("Do you have parking?");
    expect((await replyToConversation(biz, known.id)).kind).toBe("replied");
    expect((await messagesOf(known.id)).at(-1)).toMatchObject({ sender: "ai", simulated: true, body: "Yes, free basement parking." });

    const medical = await newConversation("My tooth has bad pain and swelling, what medicine should I take?");
    expect((await replyToConversation(biz, medical.id)).kind).toBe("handoff");
  });

  it("AI disabled for the business: no reply, goes to staff", async () => {
    const conv = await newConversation("Hi");
    setModelOverride(scripted([text("nope")]));
    const out = await replyToConversation({ ...biz, aiEnabled: false }, conv.id);
    expect(out).toEqual({ kind: "skipped", reason: "ai_disabled" });
  });
});
