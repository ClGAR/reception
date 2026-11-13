// Integration tests against the dev Neon database. Each run creates its own FICTIONAL tenants and deletes them.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { BookingError, createBookingRequest, getSlots, transitionAppointment } from "@/server/booking/service";
import { addDays, localToUtc, todayIn, weekdayOf } from "@/lib/time";

type Biz = typeof s.business.$inferSelect;
const created: string[] = [];

async function makeTenant(label: string, opts: { requireApproval?: boolean } = {}) {
  const orgId = randomUUID();
  await db.insert(s.organization).values({ id: orgId, name: `TEST ${label}`, slug: `test-${label}-${randomBytes(3).toString("hex")}`, createdAt: new Date() });
  created.push(orgId);
  const [biz] = await db
    .insert(s.business)
    .values({
      organizationId: orgId,
      name: `TEST ${label}`,
      slug: `test-${label}-${randomBytes(3).toString("hex")}`,
      widgetToken: randomBytes(12).toString("hex"),
      requireApproval: opts.requireApproval ?? true,
      leadTimeMinutes: 0,
      isDemo: true,
    })
    .returning();
  const [st] = await db.insert(s.staff).values({ businessId: biz.id, name: "Test Staff" }).returning();
  const [svc] = await db.insert(s.service).values({ businessId: biz.id, name: "Test Service", durationMinutes: 60, priceCentavos: 10000 }).returning();
  await db.insert(s.staffService).values({ staffId: st.id, serviceId: svc.id });
  // Open 10:00–11:00 every day: exactly ONE slot per day.
  await db.insert(s.workingHours).values([0, 1, 2, 3, 4, 5, 6].map((wd) => ({ businessId: biz.id, staffId: null, weekday: wd, startMinute: 600, endMinute: 660 })));
  return { biz, staff: st, svc };
}

let A: Awaited<ReturnType<typeof makeTenant>>;
let B: Awaited<ReturnType<typeof makeTenant>>;
let date: string;
let actor: string;

beforeAll(async () => {
  A = await makeTenant("a");
  B = await makeTenant("b");
  date = addDays(todayIn("Asia/Manila"), 2);
  actor = randomUUID();
  await db.insert(s.user).values({ id: actor, name: "Test Actor", email: `actor-${actor}@example.test`, emailVerified: true });
  void weekdayOf;
});

afterAll(async () => {
  const bizIds = (await db.select({ id: s.business.id }).from(s.business).where(inArray(s.business.organizationId, created))).map((b) => b.id);
  if (bizIds.length) await db.delete(s.appointment).where(inArray(s.appointment.businessId, bizIds));
  if (created.length) await db.delete(s.organization).where(inArray(s.organization.id, created));
  if (actor) await db.delete(s.user).where(eq(s.user.id, actor));
});

const request = (biz: Biz, svcId: string, name: string, key?: string) =>
  createBookingRequest(biz, {
    serviceId: svcId,
    date,
    minute: 600,
    customer: { name, email: `${name.toLowerCase().replace(/\s/g, ".")}@example.test` },
    source: "booking_page",
    idempotencyKey: key,
  });

describe("booking engine (database)", () => {
  it("offers the single open slot", async () => {
    const slots = await getSlots(A.biz, A.svc.id, date);
    expect(slots.map((x) => x.minute)).toEqual([600]);
  });

  it("two simultaneous requests for the last slot: exactly one wins", async () => {
    const results = await Promise.allSettled([request(A.biz, A.svc.id, "Racer One"), request(A.biz, A.svc.id, "Racer Two")]);
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(ok).toHaveLength(1);
    expect(failed).toHaveLength(1);
    expect(failed[0].reason).toBeInstanceOf(BookingError);
    expect((failed[0].reason as BookingError).code).toBe("slot_unavailable");
    // and the slot is no longer offered
    expect(await getSlots(A.biz, A.svc.id, date)).toEqual([]);
  });

  it("idempotency key returns the same appointment instead of a duplicate", async () => {
    const d2 = addDays(date, 1);
    const run = () =>
      createBookingRequest(A.biz, { serviceId: A.svc.id, date: d2, minute: 600, customer: { name: "Idem", email: "idem@example.test" }, source: "booking_page", idempotencyKey: "idem-key-1" });
    const first = await run();
    const second = await run();
    expect(second.id).toBe(first.id);
  });

  it("database exclusion constraint blocks two overlapping CONFIRMED appointments", async () => {
    const d3 = addDays(date, 2);
    const [cust] = await db.insert(s.customer).values({ businessId: A.biz.id, name: "Overlap", email: "overlap@example.test" }).returning();
    const start = localToUtc(d3, 600, "Asia/Manila");
    const end = new Date(start.getTime() + 3600_000);
    const rows = await db
      .insert(s.appointment)
      .values([1, 2].map(() => ({ businessId: A.biz.id, customerId: cust.id, serviceId: A.svc.id, staffId: A.staff.id, startsAt: start, endsAt: end, blockEndsAt: end, status: "pending" as const, priceCentavos: 1 })))
      .returning();
    const results = await Promise.allSettled(rows.map((r) => transitionAppointment(A.biz, r.id, "confirmed", actor)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rej = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect((rej.reason as BookingError).code).toBe("conflict");
  });

  it("illegal status transitions are refused", async () => {
    const [appt] = await db.select().from(s.appointment).where(eq(s.appointment.businessId, A.biz.id)).limit(1);
    await transitionAppointment(A.biz, appt.id, "declined", actor).catch(() => {});
    await expect(transitionAppointment(A.biz, appt.id, "confirmed", actor)).rejects.toMatchObject({ code: expect.stringMatching(/transition|conflict/) });
  });
});

describe("tenant isolation", () => {
  it("business B cannot change business A's appointment", async () => {
    const [appt] = await db.select().from(s.appointment).where(eq(s.appointment.businessId, A.biz.id)).limit(1);
    await expect(transitionAppointment(B.biz, appt.id, "cancelled", actor)).rejects.toMatchObject({ code: "not_found" });
  });

  it("business B cannot see slots for business A's service", async () => {
    expect(await getSlots(B.biz, A.svc.id, date)).toEqual([]);
  });

  it("business B cannot book business A's service", async () => {
    await expect(request(B.biz, A.svc.id, "Cross Tenant")).rejects.toMatchObject({ code: "not_found" });
  });
});
