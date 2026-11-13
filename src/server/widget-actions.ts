"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { business, conversation, customer, message } from "./db/schema";
import { replyToConversation } from "./ai/receptionist";
import { fmtTime } from "@/lib/time";

// Public, unauthenticated endpoints for the website widget.
// Access = widget token (identifies the business) + conversation token (identifies the visitor's thread).
// Neither gives database access beyond that one business's public info and that one conversation.

const hits = new Map<string, number[]>();
async function limit(key: string, max: number, windowMs: number) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const k = `${key}:${ip}`;
  const now = Date.now();
  const list = (hits.get(k) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(k, list);
  if (list.length > max) throw new WidgetError("You're sending messages too quickly. Please wait a moment.");
}

class WidgetError extends Error {}

async function bizByToken(token: string) {
  const [b] = await db.select().from(business).where(eq(business.widgetToken, z.string().min(10).max(80).parse(token)));
  if (!b) throw new WidgetError("This chat isn't available.");
  return b;
}

async function convByToken(bizId: string, convToken: string) {
  const [c] = await db
    .select()
    .from(conversation)
    .where(and(eq(conversation.publicToken, z.string().min(10).max(80).parse(convToken)), eq(conversation.businessId, bizId)));
  return c ?? null;
}

export interface WidgetMessage { id: string; sender: "customer" | "ai" | "staff" | "system"; body: string; time: string; simulated: boolean }

async function load(bizTz: string, convId: string): Promise<WidgetMessage[]> {
  const rows = await db.select().from(message).where(eq(message.conversationId, convId)).orderBy(asc(message.createdAt));
  return rows.slice(-50).map((m) => ({ id: m.id, sender: m.sender, body: m.body, time: fmtTime(m.createdAt, bizTz), simulated: m.simulated }));
}

type R<T> = { ok: true; data: T } | { ok: false; error: string };
async function run<T>(fn: () => Promise<T>): Promise<R<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof WidgetError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: "Invalid request." };
    console.error("[widget]", e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Resume an existing thread, or return empty state (a thread is created on the first message). */
export async function widgetResume(token: string, convToken: string | null) {
  return run(async () => {
    await limit("w-resume", 60, 60_000);
    const biz = await bizByToken(token);
    const conv = convToken ? await convByToken(biz.id, convToken) : null;
    return {
      messages: conv ? await load(biz.timezone, conv.id) : [],
      handledBy: conv?.handledBy ?? "ai",
      convToken: conv ? conv.publicToken : null,
    };
  });
}

export async function widgetSend(token: string, convToken: string | null, text: string) {
  return run(async () => {
    await limit("w-send", 12, 60_000);
    const biz = await bizByToken(token);
    const body = z.string().trim().min(1).max(1000).parse(text);
    let conv = convToken ? await convByToken(biz.id, convToken) : null;
    if (!conv) {
      const [cust] = await db.insert(customer).values({ businessId: biz.id, name: "Website visitor" }).returning();
      [conv] = await db
        .insert(conversation)
        .values({ businessId: biz.id, customerId: cust.id, publicToken: randomBytes(24).toString("base64url"), channel: "widget" })
        .returning();
    }
    await db.insert(message).values({ businessId: biz.id, conversationId: conv.id, sender: "customer", body });
    await db.update(conversation).set({ lastMessageAt: new Date(), unread: true, status: "open" }).where(eq(conversation.id, conv.id));
    await db.update(customer).set({ lastActivityAt: new Date() }).where(eq(customer.id, conv.customerId));

    const outcome = await replyToConversation(biz, conv.id);
    const [fresh] = await db.select().from(conversation).where(eq(conversation.id, conv.id));
    return {
      convToken: conv.publicToken,
      messages: await load(biz.timezone, conv.id),
      handledBy: fresh.handledBy,
      outcome: outcome.kind,
    };
  });
}
