import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { business } from "@/server/db/schema";

// Embed-origin rule for the chat widget: only the business's allowed websites (plus this app)
// may frame /widget/<token>. Unknown tokens may not be framed at all.
export async function proxy(request: NextRequest) {
  const token = decodeURIComponent(request.nextUrl.pathname.split("/")[2] ?? "");
  const res = NextResponse.next();
  let ancestors = "'none'";
  if (token) {
    const [b] = await db.select({ origins: business.widgetAllowedOrigins }).from(business).where(eq(business.widgetToken, token)).limit(1);
    if (b) {
      const safe = b.origins.filter((o) => /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(o));
      ancestors = ["'self'", ...safe].join(" ");
    }
  }
  res.headers.set("Content-Security-Policy", `frame-ancestors ${ancestors}`);
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = { matcher: ["/widget/:token*"] };
