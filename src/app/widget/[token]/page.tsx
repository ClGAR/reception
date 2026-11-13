import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { business } from "@/server/db/schema";
import { resolveModel } from "@/server/ai/provider";
import { ChatWidget } from "@/components/widget/chat-widget";

export const metadata = { title: "Chat", robots: { index: false } };

/** Rendered inside the iframe that /widget.js injects, so host-page CSS can't leak in. */
export default async function WidgetPage({ params }: PageProps<"/widget/[token]">) {
  const { token } = await params;
  const [biz] = await db.select().from(business).where(eq(business.widgetToken, token));
  if (!biz) notFound();
  return (
    <ChatWidget
      token={token}
      businessName={biz.name}
      greeting={biz.widgetGreeting}
      bookingUrl={`/b/${biz.slug}`}
      aiMode={resolveModel() ? "model" : "faq"}
      aiEnabled={biz.aiEnabled}
    />
  );
}

export const instant = false;
