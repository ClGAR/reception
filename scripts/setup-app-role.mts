// Gives the restricted "reception_app" role (created by migration 0003_rls) a login password and
// writes its pooled connection string to .env as DATABASE_URL_APP. Re-run to rotate the password.
// Usage: npx tsx --env-file=.env scripts/setup-app-role.mts   (prints no secrets)
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

const ownerUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const pooled = process.env.DATABASE_URL;
if (!ownerUrl || !pooled) throw new Error("DATABASE_URL and DATABASE_URL_UNPOOLED must be set");

const password = randomBytes(32).toString("base64url"); // only [A-Za-z0-9_-], safe as a SQL literal
const pool = new Pool({ connectionString: ownerUrl });
await pool.query(`ALTER ROLE reception_app WITH LOGIN PASSWORD '${password}'`);
await pool.end();

const url = new URL(pooled);
url.username = "reception_app";
url.password = password;

const env = readFileSync(".env", "utf8");
const line = `DATABASE_URL_APP="${url.toString()}"`;
const next = /^DATABASE_URL_APP=.*$/m.test(env) ? env.replace(/^DATABASE_URL_APP=.*$/m, line) : `${env.trimEnd()}\n${line}\n`;
writeFileSync(".env", next);
console.log("reception_app can log in; DATABASE_URL_APP written to .env");
