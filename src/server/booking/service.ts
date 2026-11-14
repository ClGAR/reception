import "server-only";
import { and, eq, gte, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { kickOutbox } from "../notify/queue";
import {
  appointment,
  auditLog,
  availabilityException,
  business as businessT,
  customer,
  notificationOutbox,
  service,
  staff,
  staffService,
  workingHours,
} from "../db/schema";
import { addDays, localToUtc } from "@/lib/time";
import { canTransition, computeSlots, type Slot } from "./availability";

type Business = typeof businessT.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class BookingError extends Error {
  constructor(
    message: string,
    public code: "slot_unavailable" | "invalid" | "conflict" | "not_found" | "transition",
  ) {
    super(message);
  }
}

async function qualifiedStaff(q: Tx | typeof db, businessId: string, serviceId: string) {
  const rows = await q
    .select({ id: staff.id })
    .from(staffService)
    .innerJoin(staff, eq(staff.id, staffService.staffId))
    .where(and(eq(staffService.serviceId, serviceId), eq(staff.businessId, businessId), eq(staff.active, true)));
  return rows.map((r) => r.id);
}

/** Slots for a service on a business-local date. Pending + confirmed appointments both block. */
export async function getSlots(
  biz: Business,
  serviceId: string,
  date: string,
  opts: { q?: Tx | typeof db; excludeAppointmentId?: string; onlyStaffId?: string } = {},
): Promise<Slot[]> {
  const q = opts.q ?? db;
  const [svc] = await q
    .select()
    .from(service)
    .where(and(eq(service.id, serviceId), eq(service.businessId, biz.id), eq(service.active, true)));
  if (!svc) return [];
  let staffIds = await qualifiedStaff(q, biz.id, serviceId);
  if (opts.onlyStaffId) staffIds = staffIds.filter((s) => s === opts.onlyStaffId);
  if (!staffIds.length) return [];

  const dayStart = localToUtc(date, 0, biz.timezone);
  const dayEnd = localToUtc(addDays(date, 1), 0, biz.timezone);
  const [hours, exceptions, busy] = await Promise.all([
    q.select().from(workingHours).where(eq(workingHours.businessId, biz.id)),
    q
      .select()
      .from(availabilityException)
      .where(and(eq(availabilityException.businessId, biz.id), eq(availabilityException.date, date))),
    q
      .select({ staffId: appointment.staffId, startsAt: appointment.startsAt, blockEndsAt: appointment.blockEndsAt })
      .from(appointment)
      .where(
        and(
          eq(appointment.businessId, biz.id),
          inArray(appointment.staffId, staffIds),
          inArray(appointment.status, ["pending", "confirmed"]),
          lt(appointment.startsAt, new Date(dayEnd.getTime() + 24 * 3600_000)),
          gte(appointment.blockEndsAt, new Date(dayStart.getTime() - 24 * 3600_000)),
          opts.excludeAppointmentId ? ne(appointment.id, opts.excludeAppointmentId) : undefined,
        ),
      ),
  ]);

  return computeSlots({
    date,
    timezone: biz.timezone,
    durationMinutes: svc.durationMinutes,
    bufferMinutes: svc.bufferMinutes,
    staffIds,
    hours,
    exceptions,
    busy,
    now: new Date(),
    leadTimeMinutes: biz.leadTimeMinutes,
    maxDaysAhead: biz.maxDaysAhead,
    stepMinutes: biz.slotStepMinutes,
  });
}

/** Serialize booking writes per staff member inside a transaction. */
async function lockStaff(tx: Tx, staffIds: string[]) {
  for (const id of [...staffIds].sort()) await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${id}))`);
}

export interface RequestInput {
  serviceId: string;
  date: string;
  minute: number;
  customer: { name: string; email?: string | null; phone?: string | null };
  notes?: string | null;
  source: "booking_page" | "chat" | "staff";
  conversationId?: string | null;
  idempotencyKey?: string | null;
  existingCustomerId?: string | null;
}

/**
 * Create an appointment request. Re-checks availability inside a transaction while holding
 * per-staff advisory locks, so two simultaneous requests can't take the same last slot.
 */
export async function createBookingRequest(biz: Business, input: RequestInput) {
  if (input.idempotencyKey) {
    const [existing] = await db
      .select()
      .from(appointment)
      .where(and(eq(appointment.businessId, biz.id), eq(appointment.idempotencyKey, input.idempotencyKey)));
    if (existing) return existing;
  }
  const created = await db.transaction(async (tx) => {
    const [svc] = await tx
      .select()
      .from(service)
      .where(and(eq(service.id, input.serviceId), eq(service.businessId, biz.id), eq(service.active, true)));
    if (!svc) throw new BookingError("That service is no longer available.", "not_found");
    await lockStaff(tx, await qualifiedStaff(tx, biz.id, svc.id));

    const slots = await getSlots(biz, svc.id, input.date, { q: tx });
    const slot = slots.find((s) => s.minute === input.minute);
    if (!slot) throw new BookingError("Sorry, that time was just taken. Please pick another time.", "slot_unavailable");

    const email = input.customer.email?.trim().toLowerCase() || null;
    let cust = email
      ? (await tx.select().from(customer).where(and(eq(customer.businessId, biz.id), eq(customer.email, email))))[0]
      : undefined;
    if (!cust && input.existingCustomerId) {
      // Chat visitor: fill in the anonymous customer record created by the widget.
      [cust] = await tx
        .update(customer)
        .set({ name: input.customer.name.trim(), email, phone: input.customer.phone || null, consentAt: new Date(), lastActivityAt: new Date() })
        .where(and(eq(customer.id, input.existingCustomerId), eq(customer.businessId, biz.id)))
        .returning();
    }
    if (!cust) {
      [cust] = await tx
        .insert(customer)
        .values({ businessId: biz.id, name: input.customer.name.trim(), email, phone: input.customer.phone || null, consentAt: new Date() })
        .returning();
    } else {
      await tx
        .update(customer)
        .set({ lastActivityAt: new Date(), phone: input.customer.phone || cust.phone })
        .where(eq(customer.id, cust.id));
    }

    const status = biz.requireApproval ? "pending" : "confirmed";
    const [appt] = await tx
      .insert(appointment)
      .values({
        businessId: biz.id,
        customerId: cust.id,
        serviceId: svc.id,
        staffId: slot.staffIds[0],
        conversationId: input.conversationId ?? null,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        blockEndsAt: slot.blockEndsAt,
        status,
        priceCentavos: svc.priceCentavos,
        source: input.source,
        notes: input.notes || null,
        idempotencyKey: input.idempotencyKey ?? null,
      })
      .returning();

    await tx.insert(notificationOutbox).values({
      businessId: biz.id,
      kind: status === "pending" ? "booking.requested" : "booking.confirmed",
      payload: { appointmentId: appt.id, customer: cust.name, service: svc.name, startsAt: appt.startsAt.toISOString() },
      dedupeKey: `booking.created:${appt.id}`,
    });
    await tx.insert(auditLog).values({
      businessId: biz.id,
      actorType: input.source === "staff" ? "staff" : "customer",
      action: "appointment.created",
      entity: "appointment",
      entityId: appt.id,
      data: { status, source: input.source },
    });
    return appt;
  });
  kickOutbox(biz.id);
  return created;
}

function isExclusionViolation(e: unknown) {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23P01" || err?.cause?.code === "23P01";
}

/** Change status following the legal transition table. Confirmations rely on the DB exclusion constraint. */
export async function transitionAppointment(biz: Business, id: string, to: string, actorUserId: string) {
  try {
    const changed = await db.transaction(async (tx) => {
      const [appt] = await tx
        .select()
        .from(appointment)
        .where(and(eq(appointment.id, id), eq(appointment.businessId, biz.id)))
        .for("update");
      if (!appt) throw new BookingError("Appointment not found.", "not_found");
      if (appt.status === to) return appt; // idempotent
      if (!canTransition(appt.status, to))
        throw new BookingError(`Can't change a ${appt.status} appointment to ${to}.`, "transition");
      const [updated] = await tx
        .update(appointment)
        .set({ status: to as typeof appt.status, updatedAt: new Date() })
        .where(eq(appointment.id, id))
        .returning();
      await tx.insert(auditLog).values({
        businessId: biz.id,
        actorUserId,
        actorType: "staff",
        action: `appointment.${to}`,
        entity: "appointment",
        entityId: id,
        data: { from: appt.status },
      });
      await tx
        .insert(notificationOutbox)
        .values({
          businessId: biz.id,
          kind: `booking.${to}`,
          payload: { appointmentId: id },
          dedupeKey: `booking.${to}:${id}`,
        })
        .onConflictDoNothing();
      return updated;
    });
    kickOutbox(biz.id);
    return changed;
  } catch (e) {
    if (isExclusionViolation(e))
      throw new BookingError("This time overlaps another confirmed appointment for the same staff member.", "conflict");
    throw e;
  }
}

export async function rescheduleAppointment(biz: Business, id: string, date: string, minute: number, actorUserId: string) {
  try {
    const moved = await db.transaction(async (tx) => {
      const [appt] = await tx
        .select()
        .from(appointment)
        .where(and(eq(appointment.id, id), eq(appointment.businessId, biz.id)))
        .for("update");
      if (!appt) throw new BookingError("Appointment not found.", "not_found");
      if (!["pending", "confirmed"].includes(appt.status))
        throw new BookingError("Only pending or confirmed appointments can be rescheduled.", "transition");
      await lockStaff(tx, await qualifiedStaff(tx, biz.id, appt.serviceId));
      const slots = await getSlots(biz, appt.serviceId, date, { q: tx, excludeAppointmentId: id });
      const slot = slots.find((s) => s.minute === minute);
      if (!slot) throw new BookingError("That time isn't available.", "slot_unavailable");
      const staffId = slot.staffIds.includes(appt.staffId) ? appt.staffId : slot.staffIds[0];
      const [updated] = await tx
        .update(appointment)
        .set({ startsAt: slot.startsAt, endsAt: slot.endsAt, blockEndsAt: slot.blockEndsAt, staffId, updatedAt: new Date() })
        .where(eq(appointment.id, id))
        .returning();
      await tx.insert(auditLog).values({
        businessId: biz.id,
        actorUserId,
        actorType: "staff",
        action: "appointment.rescheduled",
        entity: "appointment",
        entityId: id,
        data: { from: appt.startsAt.toISOString(), to: slot.startsAt.toISOString() },
      });
      await tx
        .insert(notificationOutbox)
        .values({
          businessId: biz.id,
          kind: "booking.rescheduled",
          payload: { appointmentId: id, from: appt.startsAt.toISOString() },
          dedupeKey: `booking.rescheduled:${id}:${slot.startsAt.toISOString()}`,
        })
        .onConflictDoNothing();
      return updated;
    });
    kickOutbox(biz.id);
    return moved;
  } catch (e) {
    if (isExclusionViolation(e))
      throw new BookingError("This time overlaps another confirmed appointment for the same staff member.", "conflict");
    throw e;
  }
}
