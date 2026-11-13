"use server";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { business, service } from "./db/schema";
import { BookingError, createBookingRequest, getSlots } from "./booking/service";
import { addDays, fmtDate, fmtTime, isValidDate, todayIn } from "@/lib/time";

// Simple per-IP limiter for public endpoints (per server instance). Swap for a shared store before scaling out.
const hits = new Map<string, number[]>();
async function limit(key: string, max: number, windowMs = 60_000) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const k = `${key}:${ip}`;
  const now = Date.now();
  const list = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(k, list);
  if (list.length > max) throw new BookingError("Too many requests. Please wait a minute and try again.", "invalid");
}

async function bizBySlug(slug: string) {
  const [b] = await db.select().from(business).where(eq(business.slug, z.string().max(60).parse(slug)));
  if (!b) throw new BookingError("This booking page doesn't exist.", "not_found");
  return b;
}

export async function publicSlots(slug: string, serviceId: string, date: string) {
  try {
    await limit("slots", 60);
    const biz = await bizBySlug(slug);
    if (!isValidDate(date)) throw new BookingError("Pick a valid date.", "invalid");
    const slots = await getSlots(biz, z.string().uuid().parse(serviceId), date);
    return { ok: true as const, slots: slots.map((s) => ({ minute: s.minute, label: fmtTime(s.startsAt, biz.timezone) })) };
  } catch (e) {
    return { ok: false as const, error: e instanceof BookingError ? e.message : "Couldn't load times. Please try again." };
  }
}

/** Which of the next N days have at least one open slot (for the date picker). */
export async function publicOpenDays(slug: string, serviceId: string, from: string, days = 14) {
  try {
    await limit("days", 30);
    const biz = await bizBySlug(slug);
    if (!isValidDate(from)) throw new BookingError("Invalid date.", "invalid");
    const id = z.string().uuid().parse(serviceId);
    const dates = Array.from({ length: Math.min(days, 21) }, (_, i) => addDays(from, i));
    const results = await Promise.all(dates.map(async (d) => [d, (await getSlots(biz, id, d)).length > 0] as const));
    return { ok: true as const, open: results.filter(([, o]) => o).map(([d]) => d) };
  } catch (e) {
    return { ok: false as const, error: e instanceof BookingError ? e.message : "Couldn't load dates." };
  }
}

const bookingInput = z.object({
  serviceId: z.string().uuid(),
  date: z.string().refine(isValidDate, "Pick a valid date."),
  minute: z.number().int().min(0).max(1439),
  name: z.string().trim().min(2, "Enter your name.").max(80),
  email: z.string().trim().email("Enter a valid email.").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((p) => p === "" || /^[+\d][\d\s-]{6,}$/.test(p), "Enter a valid phone number."),
  notes: z.string().trim().max(500).optional(),
  consent: z.literal(true, { message: "Please agree so we can contact you about this appointment." }),
  idempotencyKey: z.string().min(8).max(64),
});

export async function submitPublicBooking(slug: string, input: z.input<typeof bookingInput>) {
  try {
    await limit("book", 8);
    const biz = await bizBySlug(slug);
    const v = bookingInput.parse(input);
    const appt = await createBookingRequest(biz, {
      serviceId: v.serviceId,
      date: v.date,
      minute: v.minute,
      customer: { name: v.name, email: v.email, phone: v.phone || null },
      notes: v.notes,
      source: "booking_page",
      idempotencyKey: `web:${v.idempotencyKey}`,
    });
    const [svc] = await db.select().from(service).where(and(eq(service.id, appt.serviceId), eq(service.businessId, biz.id)));
    return {
      ok: true as const,
      status: appt.status as "pending" | "confirmed",
      summary: { service: svc?.name ?? "", when: `${fmtDate(appt.startsAt, biz.timezone, { weekday: "long", month: "long" })}, ${fmtTime(appt.startsAt, biz.timezone)}` },
    };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false as const, error: e.issues[0]?.message ?? "Check your details.", code: "invalid" as const };
    if (e instanceof BookingError) return { ok: false as const, error: e.message, code: e.code };
    console.error("[public booking]", e);
    return { ok: false as const, error: "We couldn't submit your request. Nothing was booked. Please try again.", code: "error" as const };
  }
}

export async function todayFor(slug: string) {
  const biz = await bizBySlug(slug);
  return todayIn(biz.timezone);
}
