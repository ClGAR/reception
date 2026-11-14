import "server-only";
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { withTenant } from "./db/tenant";
import {
  aiUsage,
  appointment,
  auditLog,
  conversation,
  customer,
  handoff,
  knowledgeEntry,
  member,
  message,
  notificationOutbox,
  service,
  staff,
  staffService,
  user,
  workingHours,
  availabilityException,
  business as businessT,
} from "./db/schema";
import { addDays, localToUtc, todayIn } from "@/lib/time";

type Business = typeof businessT.$inferSelect;

export async function sidebarCounts(biz: Business) {
  return withTenant(biz.id, async (db) => {
    const [[conv], [pend]] = await Promise.all([
      db.select({ n: count() }).from(conversation).where(and(eq(conversation.businessId, biz.id), eq(conversation.unread, true))),
      db.select({ n: count() }).from(appointment).where(and(eq(appointment.businessId, biz.id), eq(appointment.status, "pending"))),
    ]);
    const monthStart = localToUtc(todayIn(biz.timezone).slice(0, 8) + "01", 0, biz.timezone);
    const [[ai], [notes]] = await Promise.all([
      db.select({ n: count() }).from(aiUsage).where(and(eq(aiUsage.businessId, biz.id), gte(aiUsage.createdAt, monthStart))),
      db
        .select({ n: count() })
        .from(notificationOutbox)
        .where(and(eq(notificationOutbox.businessId, biz.id), isNull(notificationOutbox.readAt))),
    ]);
    return { unread: conv.n, pending: pend.n, aiMessages: ai.n, unreadNotifications: notes.n };
  });
}

export async function notifications(biz: Business) {
  return withTenant(biz.id, async (db) => {
    return db
      .select()
      .from(notificationOutbox)
      .where(eq(notificationOutbox.businessId, biz.id))
      .orderBy(desc(notificationOutbox.createdAt))
      .limit(12);
  });
}

export async function inboxList(biz: Business, q?: string) {
  return withTenant(biz.id, async (db) => {
    const rows = await db
      .select({
        id: conversation.id,
        status: conversation.status,
        handledBy: conversation.handledBy,
        unread: conversation.unread,
        lastMessageAt: conversation.lastMessageAt,
        customerName: customer.name,
        customerId: customer.id,
        last: sql<string>`coalesce((select body from ${message} m where m.conversation_id = "conversation"."id" and m.sender = 'customer' order by m.created_at desc limit 1), (select body from ${message} m where m.conversation_id = "conversation"."id" order by m.created_at desc limit 1))`,
        lastSender: sql<string>`(select sender from ${message} m where m.conversation_id = "conversation"."id" order by m.created_at desc limit 1)`,
        bookingStatus: sql<string | null>`(select status from ${appointment} a where a.conversation_id = "conversation"."id" order by a.created_at desc limit 1)`,
      })
      .from(conversation)
      .innerJoin(customer, eq(customer.id, conversation.customerId))
      .where(and(eq(conversation.businessId, biz.id), q ? ilike(customer.name, `%${q}%`) : undefined))
      .orderBy(desc(conversation.lastMessageAt))
      .limit(100);
    return rows;
  });
}

export async function conversationDetail(biz: Business, id: string) {
  return withTenant(biz.id, async (db) => {
    const [conv] = await db
      .select({ conversation, customer })
      .from(conversation)
      .innerJoin(customer, eq(customer.id, conversation.customerId))
      .where(and(eq(conversation.id, id), eq(conversation.businessId, biz.id)));
    if (!conv) return null;
    const [messages, bookings, [{ n: convCount }]] = await Promise.all([
      db.select().from(message).where(eq(message.conversationId, id)).orderBy(asc(message.createdAt)),
      db
        .select({ appointment, serviceName: service.name, staffName: staff.name })
        .from(appointment)
        .innerJoin(service, eq(service.id, appointment.serviceId))
        .innerJoin(staff, eq(staff.id, appointment.staffId))
        .where(and(eq(appointment.conversationId, id), eq(appointment.businessId, biz.id)))
        .orderBy(asc(appointment.createdAt)),
      db.select({ n: count() }).from(conversation).where(eq(conversation.customerId, conv.customer.id)),
    ]);
    return { ...conv, messages, bookings, convCount };
  });
}

export async function overview(biz: Business) {
  return withTenant(biz.id, async (db) => {
    const today = todayIn(biz.timezone);
    const start = localToUtc(today, 0, biz.timezone);
    const end = localToUtc(addDays(today, 1), 0, biz.timezone);
    const monthStart = localToUtc(today.slice(0, 8) + "01", 0, biz.timezone);
    const [[newInq], [pending], [awaiting], [ai], todays, pendingList, activity] = await Promise.all([
      db.select({ n: count() }).from(conversation).where(and(eq(conversation.businessId, biz.id), eq(conversation.unread, true))),
      db.select({ n: count() }).from(appointment).where(and(eq(appointment.businessId, biz.id), eq(appointment.status, "pending"))),
      db
        .select({ n: count() })
        .from(conversation)
        .where(and(eq(conversation.businessId, biz.id), eq(conversation.handledBy, "human"), eq(conversation.status, "open"))),
      db
        .select({ n: count() })
        .from(aiUsage)
        .where(and(eq(aiUsage.businessId, biz.id), gte(aiUsage.createdAt, monthStart))),
      db
        .select({ appointment, customerName: customer.name, serviceName: service.name, staffName: staff.name })
        .from(appointment)
        .innerJoin(customer, eq(customer.id, appointment.customerId))
        .innerJoin(service, eq(service.id, appointment.serviceId))
        .innerJoin(staff, eq(staff.id, appointment.staffId))
        .where(
          and(
            eq(appointment.businessId, biz.id),
            eq(appointment.status, "confirmed"),
            gte(appointment.startsAt, start),
            lt(appointment.startsAt, end),
          ),
        )
        .orderBy(asc(appointment.startsAt)),
      db
        .select({ appointment, customerName: customer.name, serviceName: service.name })
        .from(appointment)
        .innerJoin(customer, eq(customer.id, appointment.customerId))
        .innerJoin(service, eq(service.id, appointment.serviceId))
        .where(and(eq(appointment.businessId, biz.id), eq(appointment.status, "pending")))
        .orderBy(asc(appointment.startsAt))
        .limit(6),
      db
        .select({ auditLog, actor: user.name })
        .from(auditLog)
        .leftJoin(user, eq(user.id, auditLog.actorUserId))
        .where(eq(auditLog.businessId, biz.id))
        .orderBy(desc(auditLog.createdAt))
        .limit(8),
    ]);
    return { newInquiries: newInq.n, pending: pending.n, awaitingStaff: awaiting.n, aiMessages: ai.n, todays, pendingList, activity };
  });
}

export async function bookingsInRange(biz: Business, from: string, days: number, f: { staffId?: string; serviceId?: string }) {
  return withTenant(biz.id, async (db) => {
    const start = localToUtc(from, 0, biz.timezone);
    const end = localToUtc(addDays(from, days), 0, biz.timezone);
    return db
      .select({
        appointment,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        serviceName: service.name,
        staffName: staff.name,
      })
      .from(appointment)
      .innerJoin(customer, eq(customer.id, appointment.customerId))
      .innerJoin(service, eq(service.id, appointment.serviceId))
      .innerJoin(staff, eq(staff.id, appointment.staffId))
      .where(
        and(
          eq(appointment.businessId, biz.id),
          gte(appointment.startsAt, start),
          lt(appointment.startsAt, end),
          inArray(appointment.status, ["pending", "confirmed", "completed", "no_show"]),
          f.staffId ? eq(appointment.staffId, f.staffId) : undefined,
          f.serviceId ? eq(appointment.serviceId, f.serviceId) : undefined,
        ),
      )
      .orderBy(asc(appointment.startsAt));
  });
}

export async function staffAndServices(biz: Business) {
  return withTenant(biz.id, async (db) => {
    const [staffRows, services, links] = await Promise.all([
      db.select().from(staff).where(eq(staff.businessId, biz.id)).orderBy(asc(staff.name)),
      db.select().from(service).where(eq(service.businessId, biz.id)).orderBy(asc(service.name)),
      db
        .select({ staffId: staffService.staffId, serviceId: staffService.serviceId })
        .from(staffService)
        .innerJoin(service, eq(service.id, staffService.serviceId))
        .where(eq(service.businessId, biz.id)),
    ]);
    return { staff: staffRows, services, links };
  });
}

export async function customersList(biz: Business, q?: string) {
  return withTenant(biz.id, async (db) => {
    const term = q?.trim();
    return db
      .select({
        customer,
        bookings: sql<number>`(select count(*)::int from ${appointment} a where a.customer_id = "customer"."id")`,
        conversations: sql<number>`(select count(*)::int from ${conversation} c where c.customer_id = "customer"."id")`,
      })
      .from(customer)
      .where(
        and(
          eq(customer.businessId, biz.id),
          term ? or(ilike(customer.name, `%${term}%`), ilike(customer.email, `%${term}%`), ilike(customer.phone, `%${term}%`)) : undefined,
        ),
      )
      .orderBy(desc(customer.lastActivityAt))
      .limit(200);
  });
}

export async function customerDetail(biz: Business, id: string) {
  return withTenant(biz.id, async (db) => {
    const [c] = await db.select().from(customer).where(and(eq(customer.id, id), eq(customer.businessId, biz.id)));
    if (!c) return null;
    const [bookings, convs] = await Promise.all([
      db
        .select({ appointment, serviceName: service.name, staffName: staff.name })
        .from(appointment)
        .innerJoin(service, eq(service.id, appointment.serviceId))
        .innerJoin(staff, eq(staff.id, appointment.staffId))
        .where(and(eq(appointment.customerId, id), eq(appointment.businessId, biz.id)))
        .orderBy(desc(appointment.startsAt)),
      db
        .select({
          conversation,
          last: sql<string>`(select body from ${message} m where m.conversation_id = "conversation"."id" order by m.created_at desc limit 1)`,
        })
        .from(conversation)
        .where(and(eq(conversation.customerId, id), eq(conversation.businessId, biz.id)))
        .orderBy(desc(conversation.lastMessageAt)),
    ]);
    return { customer: c, bookings, conversations: convs };
  });
}

export async function knowledge(biz: Business) {
  return withTenant(biz.id, async (db) => {
    return db.select().from(knowledgeEntry).where(eq(knowledgeEntry.businessId, biz.id)).orderBy(asc(knowledgeEntry.category), asc(knowledgeEntry.question));
  });
}

export async function settingsData(biz: Business) {
  return withTenant(biz.id, async (db) => {
    const [hours, exceptions, team, [usage], openHandoffs] = await Promise.all([
      db.select().from(workingHours).where(and(eq(workingHours.businessId, biz.id), isNull(workingHours.staffId))).orderBy(asc(workingHours.weekday)),
      db.select().from(availabilityException).where(eq(availabilityException.businessId, biz.id)).orderBy(asc(availabilityException.date)),
      db
        .select({ memberId: member.id, role: member.role, name: user.name, email: user.email })
        .from(member)
        .innerJoin(user, eq(user.id, member.userId))
        .where(eq(member.organizationId, biz.organizationId)),
      db
        .select({ n: count() })
        .from(aiUsage)
        .where(and(eq(aiUsage.businessId, biz.id), gte(aiUsage.createdAt, localToUtc(todayIn(biz.timezone).slice(0, 8) + "01", 0, biz.timezone)))),
      db.select({ n: count() }).from(handoff).where(and(eq(handoff.businessId, biz.id), isNull(handoff.resolvedAt))),
    ]);
    return { hours, exceptions, team, aiMessagesThisMonth: usage.n, openHandoffs: openHandoffs[0].n };
  });
}

export async function setupProgress(biz: Business) {
  return withTenant(biz.id, async (db) => {
    const [[svc], [stf], [hrs], [kb]] = await Promise.all([
      db.select({ n: count() }).from(service).where(eq(service.businessId, biz.id)),
      db.select({ n: count() }).from(staffService).innerJoin(staff, eq(staff.id, staffService.staffId)).where(eq(staff.businessId, biz.id)),
      db.select({ n: count() }).from(workingHours).where(eq(workingHours.businessId, biz.id)),
      db.select({ n: count() }).from(knowledgeEntry).where(eq(knowledgeEntry.businessId, biz.id)),
    ]);
    return [
      { label: "Add business details", done: !!biz.address || !!biz.phone, href: "/app/settings" },
      { label: "Add services and prices", done: svc.n > 0, href: "/app/services" },
      { label: "Assign staff to services", done: stf.n > 0, href: "/app/services" },
      { label: "Set opening hours", done: hrs.n > 0, href: "/app/settings?tab=availability" },
      { label: "Teach the AI your FAQs", done: kb.n > 0, href: "/app/knowledge" },
    ];
  });
}

export async function allWorkingHours(biz: Business) {
  return withTenant(biz.id, async (db) => db.select().from(workingHours).where(eq(workingHours.businessId, biz.id)));
}
