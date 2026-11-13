// Dev helper: print the demo business's widget token (public value, safe to embed).
import { eq } from "drizzle-orm";
import { db } from "../src/server/db";
import { business } from "../src/server/db/app-schema";
const [b] = await db.select({ t: business.widgetToken }).from(business).where(eq(business.slug, process.argv[2] ?? "glow-studio"));
console.log(b?.t ?? "not found");
process.exit(0);
