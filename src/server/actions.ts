"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "./auth";
import { AuthError, authorize, getSession } from "./context";
import { db } from "./db";
import {
  auditLog,
  availabilityException,
  business,
  conversation,
  customer,
  handoff,
  knowledgeEntry,
  message,
  notificationOutbox,
  service,
  staff,
  staffService,
  workingHours,
} from "./db/schema";
import { BookingError, getSlots, rescheduleAppointment, transitionAppointment } from "./booking/service";
import { answerFromKnowledge } from "./ai/faq";
import { isValidDate } from "@/lib/time";

export type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof AuthError || e instanceof BookingError || e instanceof z.ZodError)
      return { ok: false, error: e instanceof z.ZodError ? (e.issues[0]?.message ?? "Invalid input.") : e.message };
    console.error("[action]", e);
    return { ok: false, error: "Something went wrong. Nothing was changed. Please try again." };
  }
}

const uuid = z.string().uuid();

/* ---------- Inbox ---------- */

export async function sendStaffReply(conversationId: string, body: string) {
  return run(async () => {
    const { business: biz, user } = await authorize("conversation:reply");
    const text = z.string().trim().min(1, "Write a message first.").max(2000).parse(body);
    const [conv] = await db
      .select()
      .from(conversation)
      .where(and(eq(conversation.id, uuid.parse(conversationId)), eq(conversation.businessId, biz.id)));
    if (!conv) throw new AuthError("Conversation not found.");
    await db.insert(message).values({ businessId: biz.id, conversationId: conv.id, sender: "staff", body: text, staffUserId: user.id });
    // A staff reply is a takeover: automated replies stop for this conversation.
    await db
      .update(conversation)
      .set({ lastMessageAt: new Date(), handledBy: "human", unread: false, status: "open" })
      .where(eq(conversation.id, conv.id));
    revalidatePath("/app/inbox");
  });
}

export async function setConversationState(
  conversationId: string,
  patch: { handledBy?: "ai" | "human"; status?: "open" | "resolved"; unread?: boolean },
) {
  return run(async () => {
    const { business: biz, user } = await authorize("conversation:reply");
    const p = z
      .object({ handledBy: z.enum(["ai", "human"]).optional(), status: z.enum(["open", "resolved"]).optional(), unread: z.boolean().optional() })
      .parse(patch);
    const [conv] = await db
      .update(conversation)
      .set(p)
      .where(and(eq(conversation.id, uuid.parse(conversationId)), eq(conversation.businessId, biz.id)))
      .returning();
    if (!conv) throw new AuthError("Conversation not found.");
    if (p.handledBy === "human") {
      await db.insert(handoff).values({ businessId: biz.id, conversationId: conv.id, reason: "Staff took over" });
    }
    if (p.handledBy === "ai" || p.status === "resolved") {
      await db
        .update(handoff)
        .set({ resolvedAt: new Date() })
        .where(and(eq(handoff.conversationId, conv.id), isNull(handoff.resolvedAt)));
    }
    if (p.handledBy || p.status)
      await db.insert(auditLog).values({
        businessId: biz.id,
        actorUserId: user.id,
        actorType: "staff",
        action: p.status ? `conversation.${p.status}` : `conversation.handled_by_${p.handledBy}`,
        entity: "conversation",
        entityId: conv.id,
      });
    revalidatePath("/app", "layout");
  });
}

/* ---------- Bookings ---------- */

export async function setAppointmentStatus(id: string, to: "confirmed" | "declined" | "cancelled" | "completed" | "no_show") {
  return run(async () => {
    const { business: biz, user } = await authorize("booking:manage");
    const appt = await transitionAppointment(biz, uuid.parse(id), z.enum(["confirmed", "declined", "cancelled", "completed", "no_show"]).parse(to), user.id);
    if (appt.conversationId && (to === "confirmed" || to === "declined")) {
      await db.insert(message).values({
        businessId: biz.id,
        conversationId: appt.conversationId,
        sender: "system",
        body: to === "confirmed" ? "Appointment confirmed by staff." : "Appointment request declined by staff.",
      });
    }
    revalidatePath("/app", "layout");
    return { status: appt.status };
  });
}

export async function staffSlots(appointmentServiceId: string, date: string, excludeAppointmentId?: string) {
  return run(async () => {
    const { business: biz } = await authorize("booking:manage");
    if (!isValidDate(date)) throw new BookingError("Pick a valid date.", "invalid");
    const slots = await getSlots(biz, uuid.parse(appointmentServiceId), date, { excludeAppointmentId });
    return slots.map((s) => ({ minute: s.minute, startsAt: s.startsAt.toISOString() }));
  });
}

export async function reschedule(id: string, date: string, minute: number) {
  return run(async () => {
    const { business: biz, user } = await authorize("booking:manage");
    if (!isValidDate(date)) throw new BookingError("Pick a valid date.", "invalid");
    await rescheduleAppointment(biz, uuid.parse(id), date, z.number().int().min(0).max(1439).parse(minute), user.id);
    revalidatePath("/app", "layout");
  });
}

/* ---------- Customers ---------- */

export async function updateCustomerNotes(id: string, notes: string) {
  return run(async () => {
    const { business: biz } = await authorize("customer:edit");
    await db
      .update(customer)
      .set({ notes: z.string().max(2000).parse(notes) || null })
      .where(and(eq(customer.id, uuid.parse(id)), eq(customer.businessId, biz.id)));
    revalidatePath("/app/customers");
  });
}

/* ---------- Services & staff ---------- */

const serviceInput = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(80),
  description: z.string().trim().max(400).optional().default(""),
  durationMinutes: z.coerce.number().int().min(5, "Duration must be at least 5 minutes.").max(600),
  bufferMinutes: z.coerce.number().int().min(0).max(240),
  price: z.coerce.number().min(0, "Price can't be negative.").max(1_000_000),
  active: z.boolean(),
  staffIds: z.array(uuid),
});

export async function saveService(id: string | null, input: z.input<typeof serviceInput>) {
  return run(async () => {
    const { business: biz } = await authorize("service:manage");
    const v = serviceInput.parse(input);
    const ownStaff = await db.select({ id: staff.id }).from(staff).where(and(eq(staff.businessId, biz.id), inArray(staff.id, v.staffIds.length ? v.staffIds : [crypto.randomUUID()])));
    const values = {
      name: v.name,
      description: v.description || null,
      durationMinutes: v.durationMinutes,
      bufferMinutes: v.bufferMinutes,
      priceCentavos: Math.round(v.price * 100),
      active: v.active,
    };
    await db.transaction(async (tx) => {
      let svcId = id;
      if (svcId) {
        const [u] = await tx.update(service).set(values).where(and(eq(service.id, uuid.parse(svcId)), eq(service.businessId, biz.id))).returning();
        if (!u) throw new AuthError("Service not found.");
        await tx.delete(staffService).where(eq(staffService.serviceId, u.id));
      } else {
        const [c] = await tx.insert(service).values({ ...values, businessId: biz.id }).returning();
        svcId = c.id;
      }
      if (ownStaff.length) await tx.insert(staffService).values(ownStaff.map((s) => ({ staffId: s.id, serviceId: svcId! })));
    });
    revalidatePath("/app/services");
  });
}

export async function saveStaff(id: string | null, input: { name: string; title: string; active: boolean }) {
  return run(async () => {
    const { business: biz } = await authorize("service:manage");
    const v = z.object({ name: z.string().trim().min(2).max(80), title: z.string().trim().max(80), active: z.boolean() }).parse(input);
    if (id) await db.update(staff).set({ ...v, title: v.title || null }).where(and(eq(staff.id, uuid.parse(id)), eq(staff.businessId, biz.id)));
    else await db.insert(staff).values({ ...v, title: v.title || null, businessId: biz.id });
    revalidatePath("/app/services");
  });
}

/* ---------- Knowledge ---------- */

const kbInput = z.object({
  category: z.enum(["hours", "pricing", "location", "parking", "policy", "promo", "faq"]),
  question: z.string().trim().min(3, "Add the question customers ask.").max(200),
  answer: z.string().trim().min(2, "Add the approved answer.").max(1500),
  active: z.boolean(),
});

export async function saveKnowledge(id: string | null, input: z.input<typeof kbInput>) {
  return run(async () => {
    const { business: biz } = await authorize("knowledge:manage");
    const v = kbInput.parse(input);
    if (id)
      await db
        .update(knowledgeEntry)
        .set({ ...v, updatedAt: new Date() })
        .where(and(eq(knowledgeEntry.id, uuid.parse(id)), eq(knowledgeEntry.businessId, biz.id)));
    else await db.insert(knowledgeEntry).values({ ...v, businessId: biz.id });
    revalidatePath("/app/knowledge");
  });
}

export async function deleteKnowledge(id: string) {
  return run(async () => {
    const { business: biz } = await authorize("knowledge:manage");
    await db.delete(knowledgeEntry).where(and(eq(knowledgeEntry.id, uuid.parse(id)), eq(knowledgeEntry.businessId, biz.id)));
    revalidatePath("/app/knowledge");
  });
}

export async function testKnowledge(question: string) {
  return run(async () => {
    const { business: biz } = await authorize("conversation:reply");
    return answerFromKnowledge(biz, z.string().trim().min(2, "Type a question.").max(500).parse(question));
  });
}

/* ---------- Settings ---------- */

export async function updateBusiness(input: Record<string, unknown>) {
  return run(async () => {
    const isProfile = "name" in input || "address" in input;
    const { business: biz } = await authorize(isProfile ? "settings:business" : "settings:operational");
    const v = z
      .object({
        name: z.string().trim().min(2).max(80),
        type: z.enum(["salon", "barbershop", "dental", "aesthetic", "car_detailing", "other"]),
        phone: z.string().trim().max(40),
        email: z.union([z.literal(""), z.string().email("Enter a valid email.")]),
        address: z.string().trim().max(200),
        parking: z.string().trim().max(400),
        cancellationPolicy: z.string().trim().max(600),
        timezone: z.string().refine((tz) => Intl.supportedValuesOf("timeZone").includes(tz) || tz === "UTC", "Unknown timezone."),
        requireApproval: z.boolean(),
        aiEnabled: z.boolean(),
        aiMonthlyMessageLimit: z.coerce.number().int().min(0).max(100000),
        leadTimeMinutes: z.coerce.number().int().min(0).max(10080),
        maxDaysAhead: z.coerce.number().int().min(1).max(365),
        slotStepMinutes: z.coerce.number().int().refine((n) => [10, 15, 20, 30, 60].includes(n), "Pick 10, 15, 20, 30 or 60."),
        widgetGreeting: z.string().trim().min(2).max(200),
        widgetAllowedOrigins: z.array(z.string().url("Each origin must be a full URL like https://example.com")).max(10),
        notifyEmail: z.boolean(),
      })
      .partial()
      .parse(input);
    const clean = Object.fromEntries(Object.entries(v).map(([k, val]) => [k, val === "" ? null : val]));
    await db.update(business).set(clean).where(eq(business.id, biz.id));
    revalidatePath("/app", "layout");
  });
}

export async function saveHours(rows: { weekday: number; startMinute: number; endMinute: number }[]) {
  return run(async () => {
    const { business: biz } = await authorize("settings:operational");
    const v = z
      .array(
        z
          .object({ weekday: z.number().int().min(0).max(6), startMinute: z.number().int().min(0).max(1440), endMinute: z.number().int().min(0).max(1440) })
          .refine((r) => r.startMinute < r.endMinute, "Closing time must be after opening time."),
      )
      .parse(rows);
    await db.transaction(async (tx) => {
      await tx.delete(workingHours).where(and(eq(workingHours.businessId, biz.id), isNull(workingHours.staffId)));
      if (v.length) await tx.insert(workingHours).values(v.map((r) => ({ ...r, businessId: biz.id, staffId: null })));
    });
    revalidatePath("/app/settings");
  });
}

export async function addClosure(input: { date: string; reason: string }) {
  return run(async () => {
    const { business: biz } = await authorize("settings:operational");
    if (!isValidDate(input.date)) throw new BookingError("Pick a valid date.", "invalid");
    await db.insert(availabilityException).values({ businessId: biz.id, date: input.date, reason: input.reason.slice(0, 120) || null });
    revalidatePath("/app/settings");
  });
}

export async function removeClosure(id: string) {
  return run(async () => {
    const { business: biz } = await authorize("settings:operational");
    await db.delete(availabilityException).where(and(eq(availabilityException.id, uuid.parse(id)), eq(availabilityException.businessId, biz.id)));
    revalidatePath("/app/settings");
  });
}

export async function rotateWidgetToken() {
  return run(async () => {
    const { business: biz } = await authorize("settings:business");
    await db.update(business).set({ widgetToken: randomBytes(18).toString("base64url") }).where(eq(business.id, biz.id));
    revalidatePath("/app/settings");
  });
}

export async function inviteMember(email: string, role: "admin" | "member") {
  return run(async () => {
    const { business: biz } = await authorize("team:manage");
    await auth.api.createInvitation({
      headers: await headers(),
      body: { email: z.string().email("Enter a valid email.").parse(email), role: z.enum(["admin", "member"]).parse(role), organizationId: biz.organizationId },
    });
    revalidatePath("/app/settings");
  });
}

export async function markNotificationsRead() {
  return run(async () => {
    const { business: biz } = await authorize("conversation:reply");
    await db
      .update(notificationOutbox)
      .set({ readAt: new Date() })
      .where(and(eq(notificationOutbox.businessId, biz.id), isNull(notificationOutbox.readAt)));
    revalidatePath("/app", "layout");
  });
}

/* ---------- Onboarding ---------- */

const onboardingInput = z.object({
  name: z.string().trim().min(2, "Enter your business name.").max(80),
  type: z.enum(["salon", "barbershop", "dental", "aesthetic", "car_detailing", "other"]),
  phone: z.string().trim().max(40),
  address: z.string().trim().max(200),
  timezone: z.string().default("Asia/Manila"),
  requireApproval: z.boolean(),
  hours: z.array(z.object({ weekday: z.number().int().min(0).max(6), startMinute: z.number().int(), endMinute: z.number().int() })),
  services: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(80),
        durationMinutes: z.coerce.number().int().min(5).max(600),
        price: z.coerce.number().min(0).max(1_000_000),
      }),
    )
    .max(20),
  staff: z.array(z.string().trim().min(2).max(80)).max(20),
  faqs: z.array(z.object({ question: z.string().trim().min(3).max(200), answer: z.string().trim().min(2).max(1500) })).max(20),
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "business";
}

export async function completeOnboarding(input: z.input<typeof onboardingInput>) {
  return run(async () => {
    const session = await getSession();
    if (!session) throw new AuthError("Please sign in again.");
    if (!session.user.emailVerified) throw new AuthError("Verify your email before creating a business.");
    const v = onboardingInput.parse(input);
    let slug = slugify(v.name);
    const taken = await db.select({ id: business.id }).from(business).where(eq(business.slug, slug));
    if (taken.length) slug = `${slug}-${randomBytes(2).toString("hex")}`;

    const org = await auth.api.createOrganization({ headers: await headers(), body: { name: v.name, slug } });
    if (!org) throw new Error("Organization create failed");
    await auth.api.setActiveOrganization({ headers: await headers(), body: { organizationId: org.id } });

    await db.transaction(async (tx) => {
      const [biz] = await tx
        .insert(business)
        .values({
          organizationId: org.id,
          name: v.name,
          slug,
          type: v.type,
          phone: v.phone || null,
          address: v.address || null,
          timezone: v.timezone,
          requireApproval: v.requireApproval,
          widgetToken: randomBytes(18).toString("base64url"),
          onboardingCompletedAt: new Date(),
        })
        .returning();
      if (v.hours.length) await tx.insert(workingHours).values(v.hours.map((h) => ({ ...h, businessId: biz.id, staffId: null })));
      const staffRows = v.staff.length ? await tx.insert(staff).values(v.staff.map((name) => ({ name, businessId: biz.id }))).returning() : [];
      const svcRows = v.services.length
        ? await tx
            .insert(service)
            .values(v.services.map((s) => ({ name: s.name, durationMinutes: s.durationMinutes, priceCentavos: Math.round(s.price * 100), businessId: biz.id })))
            .returning()
        : [];
      // Every staff member can do every service by default; refine later in Services.
      const links = staffRows.flatMap((st) => svcRows.map((sv) => ({ staffId: st.id, serviceId: sv.id })));
      if (links.length) await tx.insert(staffService).values(links);
      if (v.faqs.length) await tx.insert(knowledgeEntry).values(v.faqs.map((f) => ({ ...f, category: "faq", businessId: biz.id })));
      await tx.insert(auditLog).values({ businessId: biz.id, actorUserId: session.user.id, actorType: "staff", action: "business.created", entity: "business", entityId: biz.id });
    });
  });
}
