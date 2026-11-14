// Row-level security: the staff app's role sees only the business set for its transaction.
// Runs against the dev Neon database with two FICTIONAL tenants, deleted afterwards.
import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { withTenant } from "@/server/db/tenant";
import { customersList, knowledge } from "@/server/queries";

const enabled = !!process.env.DATABASE_URL_APP;
const orgs: string[] = [];

async function tenant(label: string) {
  const orgId = randomUUID();
  await db.insert(s.organization).values({ id: orgId, name: `TEST ${label}`, slug: `test-rls-${label}-${randomBytes(3).toString("hex")}`, createdAt: new Date() });
  orgs.push(orgId);
  const [biz] = await db
    .insert(s.business)
    .values({ organizationId: orgId, name: `TEST ${label}`, slug: `test-rls-${label}-${randomBytes(3).toString("hex")}`, widgetToken: randomBytes(12).toString("hex"), isDemo: true })
    .returning();
  await db.insert(s.customer).values({ businessId: biz.id, name: `Customer of ${label}` });
  await db.insert(s.knowledgeEntry).values({ businessId: biz.id, category: "faq", question: `Secret of ${label}?`, answer: "Only for this business." });
  return biz;
}

let A: typeof s.business.$inferSelect;
let B: typeof s.business.$inferSelect;

describe.skipIf(!enabled)("row-level security", () => {
  beforeAll(async () => {
    A = await tenant("a");
    B = await tenant("b");
  });
  afterAll(async () => {
    if (orgs.length) {
      const ids = (await db.select({ id: s.business.id }).from(s.business).where(inArray(s.business.organizationId, orgs))).map((r) => r.id);
      if (ids.length) await db.delete(s.business).where(inArray(s.business.id, ids));
      await db.delete(s.organization).where(inArray(s.organization.id, orgs));
    }
  });

  it("shows only the scoped business, even without a business_id filter", async () => {
    const rows = await withTenant(A.id, (t) => t.select().from(s.customer));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.businessId === A.id)).toBe(true);
    const bizRows = await withTenant(A.id, (t) => t.select({ id: s.business.id }).from(s.business));
    expect(bizRows).toEqual([{ id: A.id }]);
  });

  it("query helpers return nothing from another business when handed its id under the wrong scope", async () => {
    // Simulates a bug: B's id leaks into a query while the transaction is scoped to A.
    const leaked = await withTenant(A.id, (t) => t.select().from(s.knowledgeEntry).where(eq(s.knowledgeEntry.businessId, B.id)));
    expect(leaked).toEqual([]);
    expect((await knowledge(A)).map((k) => k.question)).toEqual(["Secret of a?"]);
    expect((await customersList(B)).map((c) => c.customer.name)).toEqual(["Customer of b"]);
  });

  it("refuses writes into another business", async () => {
    await expect(
      withTenant(A.id, (t) => t.insert(s.knowledgeEntry).values({ businessId: B.id, category: "faq", question: "Injected?", answer: "x" })),
    ).rejects.toThrow();
    const updated = await withTenant(A.id, (t) => t.update(s.customer).set({ notes: "hacked" }).where(eq(s.customer.businessId, B.id)).returning());
    expect(updated).toEqual([]);
  });

  it("fails closed when no business is set", async () => {
    const { Pool } = await import("@neondatabase/serverless");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL_APP });
    const { rows } = await pool.query("select count(*)::int as n from customer");
    await pool.end();
    expect(rows[0].n).toBe(0);
    const viaOwner = await db.execute(sql`select count(*)::int as n from customer where business_id in (${A.id}, ${B.id})`);
    expect((viaOwner.rows[0] as { n: number }).n).toBe(2);
  });
});
