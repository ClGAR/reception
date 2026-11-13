import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { business, member } from "./db/schema";

export type Role = "owner" | "admin" | "member";

const permissions = {
  "conversation:reply": ["owner", "admin", "member"],
  "booking:manage": ["owner", "admin", "member"],
  "customer:edit": ["owner", "admin", "member"],
  "service:manage": ["owner", "admin"],
  "knowledge:manage": ["owner", "admin"],
  "settings:operational": ["owner", "admin"],
  "settings:business": ["owner"],
  "team:manage": ["owner"],
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof permissions;

export function can(role: Role, p: Permission) {
  return (permissions[p] as readonly Role[]).includes(role);
}

export class AuthError extends Error {}

export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/**
 * Resolve the signed-in user's business from their session — never from client input.
 * Membership is checked against the database on every request.
 */
export const getContext = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const orgId = (session.session as { activeOrganizationId?: string | null }).activeOrganizationId ?? null;
  const rows = await db
    .select({ business, role: member.role })
    .from(member)
    .innerJoin(business, eq(business.organizationId, member.organizationId))
    .where(orgId ? and(eq(member.userId, session.user.id), eq(member.organizationId, orgId)) : eq(member.userId, session.user.id))
    .limit(1);
  const row = rows[0];
  if (!row) return { user: session.user, business: null, role: null } as const;
  return { user: session.user, business: row.business, role: row.role as Role } as const;
});

/** For pages: redirect to login/onboarding when needed. */
export async function requireBusiness() {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (!ctx.business || !ctx.role) redirect("/onboarding");
  return { user: ctx.user, business: ctx.business, role: ctx.role };
}

/** For server actions: throw instead of redirect. */
export async function authorize(p: Permission) {
  const ctx = await getContext();
  if (!ctx?.business || !ctx.role) throw new AuthError("Not signed in to a business.");
  if (!can(ctx.role, p)) throw new AuthError("You don't have permission to do that.");
  return { user: ctx.user, business: ctx.business, role: ctx.role };
}
