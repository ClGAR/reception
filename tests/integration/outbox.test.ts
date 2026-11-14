// Notification outbox → email, against the dev Neon database with a FICTIONAL tenant (deleted afterwards).
// Addresses are *.test, so nothing is ever delivered; EMAIL_CAPTURE_FILE records what would be sent.
import { randomBytes, randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { createBookingRequest, rescheduleAppointment, transitionAppointment } from "@/server/booking/service";
import { deliverOutboxRow, pendingOutboxIds, queueReminders } from "@/server/notify/outbox";
import { addDays, todayIn } from "@/lib/time";

const capture = join(tmpdir(), `reception-emails-${randomBytes(4).toString("hex")}.jsonl`);
const mails = (): { to: string; subject: string; text: string }[] =>
  existsSync(capture) ? readFileSync(capture, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

let biz: typeof s.business.$inferSelect;
let svcId: string;
let orgId: string;
let actor: string;

async function deliverAll() {
  const ids = await pendingOutboxIds({ businessId: biz.id });
  return Promise.all(ids.map((id) => deliverOutboxRow(id)));
}

describe("notification outbox", () => {
  beforeAll(async () => {
    process.env.EMAIL_CAPTURE_FILE = capture;
    orgId = randomUUID();
    await db.insert(s.organization).values({ id: orgId, name: "TEST outbox", slug: `test-outbox-${randomBytes(3).toString("hex")}`, createdAt: new Date() });
    [biz] = await db
      .insert(s.business)
      .values({
        organizationId: orgId,
        name: "TEST Outbox Salon",
        slug: `test-outbox-${randomBytes(3).toString("hex")}`,
        widgetToken: randomBytes(12).toString("hex"),
        email: "owner@outbox-salon.test",
        requireApproval: true,
        leadTimeMinutes: 0,
        isDemo: true,
      })
      .returning();
    const [st] = await db.insert(s.staff).values({ businessId: biz.id, name: "Ana" }).returning();
    const [svc] = await db.insert(s.service).values({ businessId: biz.id, name: "Cleaning", durationMinutes: 60, priceCentavos: 80000 }).returning();
    svcId = svc.id;
    await db.insert(s.staffService).values({ staffId: st.id, serviceId: svc.id });
    await db.insert(s.workingHours).values([0, 1, 2, 3, 4, 5, 6].map((wd) => ({ businessId: biz.id, staffId: null, weekday: wd, startMinute: 600, endMinute: 720 })));
    const [u] = await db.select({ id: s.user.id }).from(s.user).limit(1);
    actor = u.id;
  });

  afterAll(async () => {
    await db.delete(s.business).where(eq(s.business.organizationId, orgId));
    await db.delete(s.organization).where(eq(s.organization.id, orgId));
    rmSync(capture, { force: true });
    delete process.env.EMAIL_CAPTURE_FILE;
  });

  it("a new request emails the customer (not confirmed) and the business, exactly once", async () => {
    const date = addDays(todayIn(biz.timezone), 2);
    const appt = await createBookingRequest(biz, {
      serviceId: svcId,
      date,
      minute: 600,
      customer: { name: "Maria Test", email: "maria@customer.test" },
      source: "booking_page",
    });
    expect(appt.status).toBe("pending");
    expect(await deliverAll()).toEqual(["dry_run"]);
    expect(await deliverAll()).toEqual([]); // nothing left: no double send
    const sent = mails();
    expect(sent.map((m) => m.to).sort()).toEqual(["maria@customer.test", "owner@outbox-salon.test"]);
    const toCustomer = sent.find((m) => m.to === "maria@customer.test")!;
    expect(toCustomer.subject).toMatch(/^Request received: Cleaning/);
    expect(toCustomer.text).toMatch(/not confirmed yet/);
    expect(sent.find((m) => m.to === "owner@outbox-salon.test")!.subject).toBe("New request: Maria Test, Cleaning");

    await transitionAppointment(biz, appt.id, "confirmed", actor);
    await deliverAll();
    expect(mails().at(-1)).toMatchObject({ to: "maria@customer.test", subject: expect.stringMatching(/^Confirmed: Cleaning/) });

    await rescheduleAppointment(biz, appt.id, date, 660, actor);
    await deliverAll();
    expect(mails().at(-1)).toMatchObject({ to: "maria@customer.test", subject: expect.stringMatching(/^New time: Cleaning/) });
  });

  it("queues one reminder about a day ahead, and only once", async () => {
    const [appt] = await db
      .select()
      .from(s.appointment)
      .where(and(eq(s.appointment.businessId, biz.id), eq(s.appointment.status, "confirmed")));
    const dayBefore = new Date(appt.startsAt.getTime() - 24 * 3600_000);
    const first = await queueReminders(dayBefore);
    const mine = await db.select().from(s.notificationOutbox).where(inArray(s.notificationOutbox.id, first));
    expect(mine.filter((r) => r.businessId === biz.id)).toHaveLength(1);
    expect(await queueReminders(dayBefore)).toEqual([]);
    await deliverOutboxRow(mine.find((r) => r.businessId === biz.id)!.id);
    expect(mails().at(-1)).toMatchObject({ to: "maria@customer.test", subject: expect.stringMatching(/^Reminder: Cleaning tomorrow/) });
  });
});
