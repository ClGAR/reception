import Link from "next/link";
import { ArrowRight, CalendarCheck2, CalendarClock, Check, Circle, Hand, MessageSquare } from "lucide-react";
import { requireBusiness } from "@/server/context";
import { overview, setupProgress } from "@/server/queries";
import { fmtDate, fmtTime, relative, todayIn } from "@/lib/time";
import { PageHeader } from "@/components/ui";
import { PendingActions } from "@/components/bookings/pending-actions";

export const metadata = { title: "Overview · Reception" };

const actionText: Record<string, string> = {
  "appointment.created": "New appointment request",
  "appointment.confirmed": "Appointment confirmed",
  "appointment.declined": "Appointment declined",
  "appointment.cancelled": "Appointment cancelled",
  "appointment.completed": "Appointment completed",
  "appointment.no_show": "Marked as no-show",
  "appointment.rescheduled": "Appointment rescheduled",
  "conversation.resolved": "Conversation resolved",
  "conversation.open": "Conversation reopened",
  "conversation.handled_by_human": "Staff took over a conversation",
  "conversation.handled_by_ai": "Conversation handed back to AI",
  "business.created": "Business created",
};

export default async function OverviewPage() {
  const { business, user } = await requireBusiness();
  const [data, setup] = await Promise.all([overview(business), setupProgress(business)]);
  const tz = business.timezone;
  const left = setup.filter((s) => !s.done);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "New inquiries", value: data.newInquiries, href: "/app/inbox?f=new", icon: MessageSquare },
    { label: "Pending requests", value: data.pending, href: "/app/bookings?status=pending", icon: CalendarClock },
    { label: "Confirmed today", value: data.todays.length, href: `/app/bookings?date=${todayIn(tz)}`, icon: CalendarCheck2 },
    { label: "Awaiting staff", value: data.awaitingStaff, href: "/app/inbox", icon: Hand },
  ];

  return (
    <div>
      <PageHeader title={`${greet}, ${user.name.split(" ")[0]}`} description={`${fmtDate(new Date(), tz, { weekday: "long", month: "long" })} · ${business.name}`} />
      <div className="space-y-8 px-4 py-6 md:px-8">
        {left.length > 0 && (
          <section aria-labelledby="setup-h" className="rounded-lg border border-line">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 id="setup-h" className="text-[15px] font-semibold">Finish setting up</h2>
              <span className="text-[13px] text-muted">{setup.length - left.length} of {setup.length} done</span>
            </div>
            <ul className="divide-y divide-line">
              {setup.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="flex items-center gap-3 px-5 py-2.5 text-[14px] hover:bg-surface">
                    {s.done ? <Check size={16} className="text-accent" aria-label="Done" /> : <Circle size={16} className="text-muted" aria-label="To do" />}
                    <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
                    {!s.done && <ArrowRight size={15} className="ml-auto text-muted" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Today at a glance" className="grid grid-cols-2 overflow-hidden rounded-lg border border-line lg:grid-cols-4">
          {stats.map(({ label, value, href, icon: Icon }, i) => (
            <Link
              key={label}
              href={href}
              className={`group flex flex-col gap-3 px-5 py-4 hover:bg-surface ${i % 2 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <span className="flex items-center gap-2 text-[13.5px] text-muted">
                <Icon size={16} strokeWidth={1.75} aria-hidden /> {label}
              </span>
              <span className="text-[30px] font-semibold tracking-[-0.02em] tabular-nums">{value}</span>
            </Link>
          ))}
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.25fr_1fr]">
          <section aria-labelledby="pending-h">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="pending-h" className="text-[16px] font-semibold">Needs your approval</h2>
              <Link href="/app/bookings?status=pending" className="text-[13.5px] text-muted hover:text-ink">View all</Link>
            </div>
            <div className="rounded-lg border border-line">
              {data.pendingList.length === 0 ? (
                <p className="px-5 py-10 text-center text-[14px] text-muted">No requests waiting. New ones from chat and your booking page show up here.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.pendingList.map((p) => (
                    <li key={p.appointment.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-medium">{p.customerName}</p>
                        <p className="text-[13.5px] text-muted">
                          {p.serviceName} · {fmtDate(p.appointment.startsAt, tz)}, {fmtTime(p.appointment.startsAt, tz)}
                        </p>
                      </div>
                      <PendingActions id={p.appointment.id} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section aria-labelledby="today-h">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="today-h" className="text-[16px] font-semibold">Today&apos;s bookings</h2>
              <Link href="/app/bookings" className="text-[13.5px] text-muted hover:text-ink">Open calendar</Link>
            </div>
            <div className="rounded-lg border border-line">
              {data.todays.length === 0 ? (
                <p className="px-5 py-10 text-center text-[14px] text-muted">No confirmed bookings today.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {data.todays.map((t) => (
                    <li key={t.appointment.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-[72px] shrink-0 text-[14px] font-medium tabular-nums">{fmtTime(t.appointment.startsAt, tz)}</span>
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px]">{t.customerName}</p>
                        <p className="truncate text-[13px] text-muted">{t.serviceName} · {t.staffName}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <h2 className="mt-8 mb-3 text-[16px] font-semibold">Recent activity</h2>
            {data.activity.length === 0 ? (
              <p className="text-[14px] text-muted">Nothing yet.</p>
            ) : (
              <ol className="space-y-2.5">
                {data.activity.map((a) => (
                  <li key={a.auditLog.id} className="flex items-baseline gap-3 text-[14px]">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-line" aria-hidden />
                    <span className="flex-1">
                      {actionText[a.auditLog.action] ?? a.auditLog.action}
                      {a.actor && <span className="text-muted"> · {a.actor}</span>}
                    </span>
                    <span className="shrink-0 text-[12.5px] text-muted">{relative(a.auditLog.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
