import "server-only";
import { and, eq, gte, lt, lte, sql } from "drizzle-orm";
import { db } from "../db";
import { appointment, business, customer, notificationOutbox, service, staff } from "../db/schema";
import { emailLayout, sendEmail, type EmailMessage } from "../email";
import { fmtDate, fmtTime, peso } from "@/lib/time";

type Business = typeof business.$inferSelect;
type Row = typeof notificationOutbox.$inferSelect;

const MAX_ATTEMPTS = 5;
const appUrl = () => process.env.BETTER_AUTH_URL ?? "http://localhost:3107";

async function loadAppointment(id: string) {
  const [r] = await db
    .select({ appt: appointment, cust: customer, svc: service, stf: staff })
    .from(appointment)
    .innerJoin(customer, eq(customer.id, appointment.customerId))
    .innerJoin(service, eq(service.id, appointment.serviceId))
    .innerJoin(staff, eq(staff.id, appointment.staffId))
    .where(eq(appointment.id, id));
  return r;
}

/** Which emails one outbox row turns into. Empty = nothing to send (bell only). */
export async function emailsFor(row: Row, biz: Business): Promise<EmailMessage[]> {
  const p = row.payload as Record<string, string>;
  const out: EmailMessage[] = [];
  const staffInbox = biz.notifyEmail && biz.email ? biz.email : null;

  if (row.kind === "handoff.requested") {
    if (staffInbox)
      out.push({
        to: staffInbox,
        subject: `${p.customer ?? "A customer"} needs a person`,
        ...emailLayout({
          heading: "A customer is waiting for a reply",
          intro: `${p.customer ?? "A customer"} asked something the AI can't answer. Their message is in your inbox.`,
          details: p.reason ? [["Reason", p.reason]] : [],
          button: { label: "Open inbox", url: `${appUrl()}/app/inbox` },
        }),
      });
    return out;
  }

  if (!row.kind.startsWith("booking.") || !p.appointmentId) return out;
  const r = await loadAppointment(p.appointmentId);
  if (!r) return out;
  const tz = biz.timezone;
  const when = `${fmtDate(r.appt.startsAt, tz, { weekday: "long", month: "long", day: "numeric" })}, ${fmtTime(r.appt.startsAt, tz)}`;
  const details: [string, string][] = [
    ["Service", r.svc.name],
    ["When", when],
    ["With", r.stf.name],
    ["Price", peso(r.appt.priceCentavos)],
    ...(biz.address ? ([["Where", biz.address]] as [string, string][]) : []),
  ];
  const footer = `${biz.name}${biz.phone ? ` · ${biz.phone}` : ""}. ${biz.cancellationPolicy ?? ""}`.trim();
  const toCustomer = r.cust.email;
  const first = r.cust.name.split(/\s+/)[0] ?? r.cust.name;

  const customerMail: Record<string, { subject: string; heading: string; intro: string } | undefined> = {
    "booking.requested": {
      subject: `Request received: ${r.svc.name}, ${when}`,
      heading: "We got your request",
      intro: `Hi ${first}, thanks for booking with ${biz.name}. This is not confirmed yet. We'll email you as soon as the team approves it.`,
    },
    "booking.confirmed": {
      subject: `Confirmed: ${r.svc.name}, ${when}`,
      heading: "You're booked",
      intro: `Hi ${first}, your appointment at ${biz.name} is confirmed. See you then!`,
    },
    "booking.declined": {
      subject: `We couldn't book ${r.svc.name} on ${when}`,
      heading: "That time didn't work out",
      intro: `Hi ${first}, sorry, ${biz.name} couldn't take this booking. Please choose another time.`,
    },
    "booking.cancelled": {
      subject: `Cancelled: ${r.svc.name}, ${when}`,
      heading: "Your appointment was cancelled",
      intro: `Hi ${first}, your appointment at ${biz.name} has been cancelled. You can book a new time any day.`,
    },
    "booking.rescheduled": {
      subject: `New time: ${r.svc.name}, ${when}`,
      heading: "Your appointment has a new time",
      intro: `Hi ${first}, ${biz.name} moved your appointment. The new time is below.`,
    },
    "booking.reminder": {
      subject: `Reminder: ${r.svc.name} tomorrow, ${fmtTime(r.appt.startsAt, tz)}`,
      heading: "See you tomorrow",
      intro: `Hi ${first}, a quick reminder of your appointment at ${biz.name}. If you can't make it, please let them know.`,
    },
  };
  const kind = row.kind;
  const c = customerMail[kind];
  if (c && toCustomer) {
    const bookAgain = kind === "booking.declined" || kind === "booking.cancelled";
    out.push({
      to: toCustomer,
      subject: c.subject,
      ...emailLayout({ heading: c.heading, intro: c.intro, details, footer, button: bookAgain ? { label: "Book another time", url: `${appUrl()}/b/${biz.slug}` } : undefined }),
    });
  }
  // Rows written when a booking is created carry the customer's name; status changes don't.
  const created = (kind === "booking.requested" || kind === "booking.confirmed") && !!p.customer;
  if (created && staffInbox) {
    const pending = kind === "booking.requested";
    out.push({
      to: staffInbox,
      subject: pending ? `New request: ${r.cust.name}, ${r.svc.name}` : `New booking: ${r.cust.name}, ${r.svc.name}`,
      ...emailLayout({
        heading: pending ? "New booking request" : "New booking",
        intro: pending ? `${r.cust.name} asked for a time. Approve or decline it in Reception.` : `${r.cust.name} booked a free time.`,
        details: [["Customer", r.cust.name], ...details.slice(0, 4), ...(r.cust.phone ? ([["Phone", r.cust.phone]] as [string, string][]) : [])],
        button: { label: pending ? "Review request" : "Open calendar", url: `${appUrl()}/app/${pending ? "overview" : "bookings"}` },
      }),
    });
  }
  return out;
}

/**
 * Deliver one outbox row. The row is locked (SKIP LOCKED) for the duration, so two workers never
 * send the same email. Failures are recorded and re-thrown so Inngest retries; after
 * MAX_ATTEMPTS the row is marked failed.
 */
export async function deliverOutboxRow(id: string): Promise<"sent" | "dry_run" | "skipped"> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(notificationOutbox)
      .where(and(eq(notificationOutbox.id, id), eq(notificationOutbox.status, "pending")))
      .for("update", { skipLocked: true });
    if (!row) return "skipped";
    const [biz] = await tx.select().from(business).where(eq(business.id, row.businessId));
    try {
      const mails = biz ? await emailsFor(row, biz) : [];
      let delivered = false;
      for (const m of mails) delivered = (await sendEmail(m)).delivered || delivered;
      const status = delivered || mails.length === 0 ? "sent" : "dry_run";
      await tx
        .update(notificationOutbox)
        .set({ status, attempts: row.attempts + 1, sentAt: new Date(), lastError: null })
        .where(eq(notificationOutbox.id, id));
      return status;
    } catch (e) {
      const attempts = row.attempts + 1;
      await tx
        .update(notificationOutbox)
        .set({ attempts, lastError: String((e as Error).message ?? e).slice(0, 500), status: attempts >= MAX_ATTEMPTS ? "failed" : "pending" })
        .where(eq(notificationOutbox.id, id));
      if (attempts < MAX_ATTEMPTS) throw e;
      return "skipped";
    }
  });
}

/** Pending rows to deliver: one business (right after a change) or everything older than `olderThanMs` (sweep). */
export async function pendingOutboxIds(opts: { businessId?: string; olderThanMs?: number; limit?: number }) {
  const rows = await db
    .select({ id: notificationOutbox.id })
    .from(notificationOutbox)
    .where(
      and(
        eq(notificationOutbox.status, "pending"),
        lt(notificationOutbox.attempts, MAX_ATTEMPTS),
        opts.businessId ? eq(notificationOutbox.businessId, opts.businessId) : undefined,
        opts.olderThanMs ? lte(notificationOutbox.createdAt, new Date(Date.now() - opts.olderThanMs)) : undefined,
      ),
    )
    .orderBy(notificationOutbox.createdAt)
    .limit(opts.limit ?? 50);
  return rows.map((r) => r.id);
}

/**
 * Queue a reminder for every confirmed appointment starting 20–26 hours from now. The dedupe key
 * makes this safe to run every hour: each appointment gets one reminder.
 */
export async function queueReminders(now = new Date()) {
  const from = new Date(now.getTime() + 20 * 3600_000);
  const to = new Date(now.getTime() + 26 * 3600_000);
  const due = await db
    .select({ id: appointment.id, businessId: appointment.businessId })
    .from(appointment)
    .innerJoin(customer, eq(customer.id, appointment.customerId))
    .where(and(eq(appointment.status, "confirmed"), gte(appointment.startsAt, from), lt(appointment.startsAt, to), sql`${customer.email} is not null`));
  if (!due.length) return [];
  const inserted = await db
    .insert(notificationOutbox)
    .values(due.map((a) => ({ businessId: a.businessId, kind: "booking.reminder", payload: { appointmentId: a.id }, dedupeKey: `reminder:${a.id}`, readAt: new Date() })))
    .onConflictDoNothing()
    .returning({ id: notificationOutbox.id });
  return inserted.map((r) => r.id);
}

