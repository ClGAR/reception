// AI receptionist flow tests with a deterministic mock model. FICTIONAL test tenant, cleaned up after.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { replyToConversation } from "@/server/ai/receptionist";
import { setModelOverride } from "@/server/ai/provider";
import { addDays, localToUtc, todayIn } from "@/lib/time";

const orgs: string[] = [];
let biz: typeof s.business.$inferSelect;
let cleaningId: string;
let spaId: string;
let staffId: string;
let dayOffset = 2;
/** Each test books on its own day, so earlier requests don't block later tests. */
const nextDate = () => addDays(todayIn("Asia/Manila"), dayOffset++);

const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };
type Step = { content: unknown[]; finishReason: { unified: "stop" | "tool-calls"; raw: undefined }; usage: typeof usage; warnings: [] };
const text = (t: string): Step => ({ content: [{ type: "text", text: t }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] });
const call = (toolName: string, input: unknown): Step => ({
  content: [{ type: "tool-call", toolCallId: randomUUID(), toolName, input: JSON.stringify(input) }],
  finishReason: { unified: "tool-calls", raw: undefined },
  usage,
  warnings: [],
});

let modelCalls = 0;
function script(steps: Step[]) {
  let i = 0;
  setModelOverride({
    label: "mock",
    model: new MockLanguageModelV4({
      doGenerate: async () => {
        modelCalls++;
        return steps[Math.min(i++, steps.length - 1)] as never;
      },
    }),
  });
}

async function newConversation() {
  const [cust] = await db.insert(s.customer).values({ businessId: biz.id, name: "Website visitor" }).returning();
  const [conv] = await db.insert(s.conversation).values({ businessId: biz.id, customerId: cust.id, publicToken: randomBytes(16).toString("hex") }).returning();
  return conv;
}
/** One customer turn: save their message, then let the receptionist answer with the scripted model. */
async function turn(convId: string, body: string, steps?: Step[]) {
  await new Promise((r) => setTimeout(r, 5)); // distinct timestamps
  await db.insert(s.message).values({ businessId: biz.id, conversationId: convId, sender: "customer", body });
  if (steps) script(steps);
  const out = await replyToConversation(biz, convId);
  const msgs = await db.select().from(s.message).where(eq(s.message.conversationId, convId)).orderBy(asc(s.message.createdAt));
  return { out, reply: msgs.at(-1)!.body };
}
const apptsOf = (convId: string) => db.select().from(s.appointment).where(eq(s.appointment.conversationId, convId));
const draftOf = async (convId: string) => (await db.select().from(s.bookingDraft).where(eq(s.bookingDraft.conversationId, convId)))[0];

beforeAll(async () => {
  const orgId = randomUUID();
  orgs.push(orgId);
  await db.insert(s.organization).values({ id: orgId, name: "TEST ai", slug: `test-ai-${randomBytes(3).toString("hex")}`, createdAt: new Date() });
  [biz] = await db
    .insert(s.business)
    .values({ organizationId: orgId, name: "TEST AI Salon", slug: `test-ai-${randomBytes(3).toString("hex")}`, widgetToken: randomBytes(12).toString("hex"), leadTimeMinutes: 0, isDemo: true })
    .returning();
  const [st] = await db.insert(s.staff).values({ businessId: biz.id, name: "Test Staff" }).returning();
  staffId = st.id;
  const [cleaning, spa] = await db
    .insert(s.service)
    .values([
      { businessId: biz.id, name: "Cleaning", durationMinutes: 60, priceCentavos: 80000 },
      { businessId: biz.id, name: "Hair Spa", durationMinutes: 60, priceCentavos: 90000 },
    ])
    .returning();
  cleaningId = cleaning.id;
  spaId = spa.id;
  await db.insert(s.staffService).values([
    { staffId: st.id, serviceId: cleaning.id },
    { staffId: st.id, serviceId: spa.id },
  ]);
  // 9:00–12:00 every day, 30-minute steps → 9:00, 9:30 … 11:00
  await db.insert(s.workingHours).values([0, 1, 2, 3, 4, 5, 6].map((wd) => ({ businessId: biz.id, staffId: null, weekday: wd, startMinute: 540, endMinute: 720 })));
  await db.insert(s.knowledgeEntry).values({ businessId: biz.id, category: "parking", question: "Is there parking?", answer: "Yes, free basement parking." });
});

afterEach(() => setModelOverride(undefined));

afterAll(async () => {
  await db.delete(s.appointment).where(eq(s.appointment.businessId, biz.id));
  await db.delete(s.organization).where(inArray(s.organization.id, orgs));
});

describe("booking flow (server-enforced)", () => {
  it("service → date → real slots → pick → contact → server summary → yes → pending request", async () => {
    const date = nextDate();
    const c = await newConversation();
    let r = await turn(c.id, "Hi, I'd like a cleaning", [call("selectService", { serviceId: cleaningId }), text("Sure! Which date would you like?")]);
    expect(r.reply).toBe("Sure! Which date would you like?");

    r = await turn(c.id, `How about ${date}?`, [call("checkAvailability", { date }), text("I have 9:00 AM, 9:30 AM or 10:00 AM. Which works?")]);
    expect(r.reply).toMatch(/9:00 AM/);
    expect((await draftOf(c.id)).offeredMinutes).toContain(540);

    r = await turn(c.id, "9:30 please", [call("selectSlot", { time: "9:30 AM" }), text("Great. May I have your full name and email or mobile?")]);
    expect((await draftOf(c.id)).minute).toBe(570);

    r = await turn(c.id, "Test Person, test.person@example.test", [
      call("setContactDetails", { name: "Test Person", email: "test.person@example.test" }),
      call("reviewBooking", {}),
      text("All good, booked!"), // model text is ignored: the server writes the summary
    ]);
    expect(r.reply).toMatch(/^Here's your appointment request:/);
    expect(r.reply).toMatch(/Cleaning \(60 mins, ₱800\)/);
    expect(r.reply).toMatch(/9:30 AM/);
    expect(r.reply).toMatch(/Shall I send this request\?/);
    expect(await apptsOf(c.id)).toHaveLength(0); // nothing submitted yet

    const before = modelCalls;
    r = await turn(c.id, "yes");
    expect(modelCalls).toBe(before); // the server handles the confirmation, no model call
    expect(r.out).toMatchObject({ kind: "replied", mode: "rules" });
    expect(r.reply).toMatch(/isn't confirmed yet/);
    const appts = await apptsOf(c.id);
    expect(appts).toHaveLength(1);
    expect(appts[0]).toMatchObject({ status: "pending", source: "chat" });
    expect((await draftOf(c.id)).stage).toBe("submitted");

    // Repeated "yes" or repeated tool calls never create a second request.
    await turn(c.id, "yes", [call("reviewBooking", {}), text("Your request is with our team.")]);
    expect(await apptsOf(c.id)).toHaveLength(1);
  });

  it("the model cannot submit: there is no submit tool, and reviewBooking without details fails", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "book me a cleaning now", [call("selectService", { serviceId: cleaningId }), call("reviewBooking", {}), call("createBookingRequest", {}), text("Which date?")]);
    expect(await apptsOf(c.id)).toHaveLength(0);
    expect((await draftOf(c.id)).stage).toBe("collecting");
  });

  it("invented times are replaced with real ones", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    const r = await turn(c.id, date, [call("checkAvailability", { date }), text("I can fit you in at 3:45 PM!")]);
    expect(r.out).toMatchObject({ mode: "rules" });
    expect(r.reply).not.toMatch(/3:45/);
    expect(r.reply).toMatch(/9:00 AM/);
  });

  it("invented prices and false 'confirmed' claims are replaced", async () => {
    const date = nextDate();
    const c = await newConversation();
    let r = await turn(c.id, "how much is cleaning", [text("Cleaning is just ₱500 today!")]);
    expect(r.reply).not.toMatch(/₱500/);
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    await turn(c.id, date, [call("checkAvailability", { date }), text("9:00 AM is open.")]);
    r = await turn(c.id, "9am", [call("selectSlot", { time: "9:00 AM" }), text("Your appointment is confirmed!")]);
    expect(r.reply).not.toMatch(/confirmed!/);
    expect(r.reply).toMatch(/full name and your email or mobile/);
  });

  it("selecting a time that was never offered is refused", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    await turn(c.id, date, [call("checkAvailability", { date }), text("9:00 AM is open.")]);
    await turn(c.id, "4pm", [call("selectSlot", { time: "4:00 PM" }), text("Sorry, 4:00 PM isn't available. I have 9:00 AM.")]);
    expect((await draftOf(c.id)).minute).toBeNull();
  });

  it("customer says no at the summary and changes time: draft reopens, booking uses the new time", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    await turn(c.id, date, [call("checkAvailability", { date }), text("I have 10:00 AM or 10:30 AM.")]);
    await turn(c.id, "10am, Test Change, change@example.test", [
      call("selectSlot", { time: "10:00 AM" }),
      call("setContactDetails", { name: "Test Change", email: "change@example.test" }),
      call("reviewBooking", {}),
      text("x"),
    ]);
    expect((await draftOf(c.id)).stage).toBe("awaiting_confirmation");
    let r = await turn(c.id, "wait, change it to 10:30 please", [call("selectSlot", { time: "10:30 AM" }), call("reviewBooking", {}), text("x")]);
    expect(await apptsOf(c.id)).toHaveLength(0);
    expect(r.reply).toMatch(/10:30 AM/);
    r = await turn(c.id, "yes");
    const appts = await apptsOf(c.id);
    expect(appts).toHaveLength(1);
    expect(appts[0].startsAt.toISOString()).toBe(localToUtc(date, 630, "Asia/Manila").toISOString());
  });

  it("changing the service resets the chosen time", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    await turn(c.id, date, [call("checkAvailability", { date }), text("9:00 AM is open.")]);
    await turn(c.id, "9am", [call("selectSlot", { time: "9:00 AM" }), text("Name and email please?")]);
    await turn(c.id, "actually make it a hair spa", [call("selectService", { serviceId: spaId }), text("Sure. Same date?")]);
    const d = await draftOf(c.id);
    expect(d.serviceId).toBe(spaId);
    expect(d.minute).toBeNull();
    expect(d.offeredMinutes).toEqual([]);
  });

  it("slot taken between summary and 'yes': honest message with refreshed times, no booking", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    await turn(c.id, date, [call("checkAvailability", { date }), text("11:00 AM is open.")]);
    await turn(c.id, "11, Test Race, race@example.test", [
      call("selectSlot", { time: "11:00 AM" }),
      call("setContactDetails", { name: "Test Race", email: "race@example.test" }),
      call("reviewBooking", {}),
      text("x"),
    ]);
    // Someone else takes 11:00 (a confirmed booking for the only staff member).
    const [other] = await db.insert(s.customer).values({ businessId: biz.id, name: "Other", email: "other@example.test" }).returning();
    const start = localToUtc(date, 660, "Asia/Manila");
    const end = new Date(start.getTime() + 3600_000);
    await db.insert(s.appointment).values({ businessId: biz.id, customerId: other.id, serviceId: cleaningId, staffId, startsAt: start, endsAt: end, blockEndsAt: end, status: "confirmed", priceCentavos: 80000 });
    const r = await turn(c.id, "yes");
    expect(r.reply).toMatch(/just taken/);
    expect(await apptsOf(c.id)).toHaveLength(0);
    expect((await draftOf(c.id)).stage).toBe("collecting");
  });

  it("all models fail mid-booking: the server still gives the correct next step (no fake answers)", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    await turn(c.id, date, [call("checkAvailability", { date }), text("9:00 AM is open.")]);
    setModelOverride({ label: "mock", model: new MockLanguageModelV4({ doGenerate: async () => { throw new Error("provider down"); } }) });
    const r = await turn(c.id, "what times again?");
    expect(r.out).toMatchObject({ kind: "replied", mode: "rules" });
    expect(r.reply).toMatch(/9:00 AM/);
  });
});

describe("conversation safety", () => {
  it("human takeover: no automated reply", async () => {
    const date = nextDate();
    const c = await newConversation();
    await db.update(s.conversation).set({ handledBy: "human" }).where(eq(s.conversation.id, c.id));
    const r = await turn(c.id, "Hello?", [text("should never be sent")]);
    expect(r.out).toEqual({ kind: "skipped", reason: "human" });
  });

  it("provider failure with no booking in progress: safe fallback + staff handoff", async () => {
    const date = nextDate();
    const c = await newConversation();
    setModelOverride({ label: "mock", model: new MockLanguageModelV4({ doGenerate: async () => { throw new Error("down"); } }) });
    const r = await turn(c.id, "Book a cleaning tomorrow");
    expect(r.out.kind).toBe("handoff");
    expect(r.reply).not.toMatch(/confirm/i);
    const [conv] = await db.select().from(s.conversation).where(eq(s.conversation.id, c.id));
    expect(conv.handledBy).toBe("human");
  });

  it("handoffToStaff tool pauses AI and notifies staff", async () => {
    const date = nextDate();
    const c = await newConversation();
    const r = await turn(c.id, "Can I talk to a person?", [call("handoffToStaff", { reason: "Customer asked for a person" }), text("Sure, a team member will reply here.")]);
    expect(r.out.kind).toBe("handoff");
    const notes = await db.select().from(s.notificationOutbox).where(eq(s.notificationOutbox.kind, "handoff.requested"));
    expect(notes.some((n) => (n.payload as { conversationId: string }).conversationId === c.id)).toBe(true);
  });

  it("no provider: FAQ answer stored as simulated; medical → handoff", async () => {
    const date = nextDate();
    setModelOverride(null);
    const a = await newConversation();
    expect((await turn(a.id, "Do you have parking?")).out.kind).toBe("replied");
    const [m] = await db.select().from(s.message).where(eq(s.message.conversationId, a.id)).orderBy(asc(s.message.createdAt)).offset(1);
    expect(m).toMatchObject({ sender: "ai", simulated: true });
    const b = await newConversation();
    expect((await turn(b.id, "My tooth has bad pain and swelling, what medicine should I take?")).out.kind).toBe("handoff");
  });

  it("AI disabled: no reply", async () => {
    const date = nextDate();
    const c = await newConversation();
    await db.insert(s.message).values({ businessId: biz.id, conversationId: c.id, sender: "customer", body: "Hi" });
    expect(await replyToConversation({ ...biz, aiEnabled: false }, c.id)).toEqual({ kind: "skipped", reason: "ai_disabled" });
  });
});

describe("eval-driven fixes", () => {
  it("re-checking the same date keeps the chosen time", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    await turn(c.id, date, [call("checkAvailability", { date }), text("9:00 AM is open.")]);
    await turn(c.id, "9am", [call("selectSlot", { time: "9:00 AM" }), text("Name and email please?")]);
    await turn(c.id, "Test Keep, keep@example.test", [call("checkAvailability", { date }), call("setContactDetails", { name: "Test Keep", email: "keep@example.test" }), call("reviewBooking", {}), text("x")]);
    expect((await draftOf(c.id)).minute).toBe(540);
    expect((await draftOf(c.id)).stage).toBe("awaiting_confirmation");
  });

  it("a reply listing more than 4 times is replaced by a short list", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    const r = await turn(c.id, `${date} please`, [call("checkAvailability", { date }), text("9:00 AM, 9:30 AM, 10:00 AM, 10:30 AM, 11:00 AM")]);
    expect(r.out).toMatchObject({ mode: "rules", note: "listed more than 4 times" });
    expect(new Set(r.reply.match(/\d{1,2}:\d{2} [AP]M/g)).size).toBeLessThanOrEqual(4);
  });
});

describe("model outage mid-booking", () => {
  it("server reads the chosen time and contact itself and still reaches the summary", async () => {
    const date = nextDate();
    const c = await newConversation();
    await turn(c.id, "cleaning", [call("selectService", { serviceId: cleaningId }), text("Which date?")]);
    await turn(c.id, date, [call("checkAvailability", { date }), text("9:00 AM or 10:00 AM?")]);
    setModelOverride({ label: "mock", model: new MockLanguageModelV4({ doGenerate: async () => { throw new Error("rate limited"); } }) });
    let r = await turn(c.id, "10:00 AM please");
    expect((await draftOf(c.id)).minute).toBe(600);
    expect(r.reply).toMatch(/full name/);
    r = await turn(c.id, "I'm Test Outage, outage@example.test");
    expect(r.reply).toMatch(/Shall I send this request/);
    r = await turn(c.id, "yes");
    expect(await apptsOf(c.id)).toHaveLength(1);
    expect(r.reply).toMatch(/isn't confirmed yet/);
  });
});
