import "server-only";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import * as schema from "./schema";
import { db as ownerDb, type DB } from ".";

export type TenantDb = Parameters<Parameters<DB["transaction"]>[0]>[0];

let appDb: DB | undefined;

/**
 * The staff app's connection: the restricted "reception_app" role, where Postgres row-level security
 * only shows rows of the business set below (migration 0003_rls). Without DATABASE_URL_APP (local dev
 * before scripts/setup-app-role.mts) it falls back to the owner role, where RLS doesn't apply.
 */
function tenantPool(): DB {
  if (appDb) return appDb;
  const url = process.env.DATABASE_URL_APP;
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL_APP is not set: refusing to run tenant queries without row-level security.");
    console.warn("[db] DATABASE_URL_APP not set; tenant queries run without row-level security.");
    appDb = ownerDb;
  } else {
    appDb = drizzle({ client: new Pool({ connectionString: url }), schema });
  }
  return appDb;
}

/** Run `fn` in a transaction scoped to one business. Every query inside sees only that business's rows. */
export function withTenant<T>(businessId: string, fn: (db: TenantDb) => Promise<T>): Promise<T> {
  return tenantPool().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.business_id', ${businessId}, true)`);
    return fn(tx);
  });
}
