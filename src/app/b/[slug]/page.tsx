import { connection } from "next/server";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { MapPin, Phone } from "lucide-react";
import { db } from "@/server/db";
import { business, service, staffService } from "@/server/db/schema";
import { BookingFlow } from "@/components/booking/booking-flow";
import { peso, todayIn } from "@/lib/time";

export async function generateMetadata({ params }: PageProps<"/b/[slug]">) {
  await connection();
  const { slug } = await params;
  const [b] = await db.select({ name: business.name }).from(business).where(eq(business.slug, slug));
  return { title: b ? `Book at ${b.name}` : "Booking page not found" };
}

export default async function PublicBookingPage({ params }: PageProps<"/b/[slug]">) {
  await connection(); // request-time data: don't touch the DB during prerender
  const { slug } = await params;
  const [biz] = await db.select().from(business).where(eq(business.slug, slug));
  if (!biz) notFound();
  const services = await db
    .selectDistinct({ id: service.id, name: service.name, description: service.description, durationMinutes: service.durationMinutes, priceCentavos: service.priceCentavos })
    .from(service)
    .innerJoin(staffService, eq(staffService.serviceId, service.id))
    .where(and(eq(service.businessId, biz.id), eq(service.active, true)))
    .orderBy(asc(service.name));

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-[960px] flex-col gap-3 px-4 py-6 sm:flex-row sm:items-start md:px-6">
          <div className="min-w-0 flex-1">
            {biz.isDemo && <p className="mb-2 w-fit rounded-full bg-warn-soft px-2.5 py-1 text-[13px] leading-none font-medium text-warn-ink">Demo business · fictional</p>}
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.025em]">{biz.name}</h1>
            <p className="mt-2 flex flex-col gap-1.5 text-[15px] text-ink-2 sm:flex-row sm:flex-wrap sm:gap-x-5">
              {biz.address && <span className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-ink-3" aria-hidden /> {biz.address}</span>}
              {biz.phone && <a href={`tel:${biz.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 font-medium text-primary hover:underline"><Phone size={16} className="shrink-0" aria-hidden /> {biz.phone}</a>}
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[960px] px-4 py-8 md:px-6">
        {services.length === 0 ? (
          <p className="py-16 text-center text-[15px] text-ink-3">Online booking isn&apos;t open yet. Please contact the business directly.</p>
        ) : (
          <BookingFlow
            slug={biz.slug}
            today={todayIn(biz.timezone)}
            maxDaysAhead={biz.maxDaysAhead}
            requireApproval={biz.requireApproval}
            businessName={biz.name}
            cancellationPolicy={biz.cancellationPolicy}
            services={services.map((s) => ({ id: s.id, name: s.name, description: s.description ?? "", duration: s.durationMinutes, price: peso(s.priceCentavos) }))}
          />
        )}
      </main>
      <footer className="mx-auto max-w-[960px] px-4 pb-10 text-[13.5px] text-ink-3 md:px-6">
        Booking by Reception · Your details are shared only with {biz.name} to manage your appointment.
      </footer>
    </div>
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
