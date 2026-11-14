import Link from "next/link";
import { ArrowRight, CalendarCheck2, CalendarClock, Check, Circle, Hand, MessageSquare, Sparkle } from "lucide-react";
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
          <section aria-labelledby="setup-h" className="rounded-2xl border border-line">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 id="setup-h" className="text-[15px] font-semibold">Finish setting up</h2>
              <span className="text-[14px] text-ink-3">{setup.length - left.length} of {setup.length} done</span>
            </div>
            <ul className="divide-y divide-line">
              {setup.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="flex items-center gap-3 px-5 py-2.5 text-[15px] hover:bg-surface">
                    {s.done ? <Check size={16} className="text-accent" aria-label="Done" /> : <Circle size={16} className="text-ink-3" aria-label="To do" />}
                    <span className={s.done ? "text-ink-3 line-through" : ""}>{s.label}</span>
                    {!s.done && <ArrowRight size={15} className="ml-auto text-ink-3" aria-hidden />}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Today at a glance" className="grid grid-cols-2 overflow-hidden rounded-2xl border border-line lg:grid-cols-4">
          {stats.map(({ label, value, href, icon: Icon }, i) => (
            <Link
              key={label}
              href={href}
              className={`group flex flex-col gap-3 px-5 py-4 hover:bg-surface ${i % 2 ? "border-l border-line" : ""} ${i >= 2 ? "border-t border-line lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <span className="flex items-center gap-2 text-[14.5px] text-ink-3">
                <Icon size={16} strokeWidth={1.75} aria-hidden /> {label}
              </span>
              <span className="text-[30px] font-semibold tracking-[-0.02em] tabular-nums">{value}</span>
            </Link>
          ))}
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.55fr_1fr] xl:items-start">
          <div className="space-y-8">
            <section aria-labelledby="pending-h">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="pending-h" className="text-[16px] font-semibold">Needs your approval</h2>
                <Link href="/app/bookings?status=pending" className="text-[14.5px] text-ink-3 hover:text-ink">View all</Link>
              </div>
              <div className="rounded-2xl border border-line">
                {data.pendingList.length === 0 ? (
                  <p className="px-5 py-10 text-center text-[15px] text-ink-3">No requests waiting. New ones from chat and your booking page show up here.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.pendingList.map((p) => (
                      <li key={p.appointment.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[15.5px] font-medium">{p.customerName}</p>
                          <p className="text-[14.5px] text-ink-3">
                            {p.serviceName} · {fmtDate(p.appointment.startsAt, tz)}, <span className=" tabular-nums">{fmtTime(p.appointment.startsAt, tz)}</span>
                          </p>
                        </div>
                        <PendingActions id={p.appointment.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section aria-labelledby="activity-h">
              <h2 id="activity-h" className="mb-3 text-[16px] font-semibold">Recent activity</h2>
              {data.activity.length === 0 ? (
                <p className="text-[15px] text-ink-3">Nothing yet.</p>
              ) : (
                <ol className="divide-y divide-line rounded-2xl border border-line px-5">
                  {data.activity.map((a) => (
                    <li key={a.auditLog.id} className="flex items-baseline gap-3 py-2.5 text-[14.5px]">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden />
                      <span className="flex-1">
                        {actionText[a.auditLog.action] ?? a.auditLog.action}
                        {a.actor && <span className="text-ink-3"> · {a.actor}</span>}
                      </span>
                      <span className="shrink-0 text-[13px] text-ink-3">{relative(a.auditLog.createdAt)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <div className="space-y-8">
            <section aria-labelledby="today-h">
              <div className="mb-3 flex items-center justify-between">
                <h2 id="today-h" className="text-[16px] font-semibold">Today&apos;s bookings</h2>
                <Link href="/app/bookings" className="text-[14.5px] text-ink-3 hover:text-ink">Open calendar</Link>
              </div>
              <div className="rounded-2xl border border-line">
                {data.todays.length === 0 ? (
                  <p className="px-5 py-10 text-center text-[15px] text-ink-3">No confirmed bookings today.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {data.todays.map((t) => (
                      <li key={t.appointment.id} className="flex items-center gap-4 px-5 py-3">
                        <span className="w-[72px] shrink-0 text-[15px] font-medium tabular-nums">{fmtTime(t.appointment.startsAt, tz)}</span>
                        <div className="min-w-0">
                          <p className="truncate text-[15.5px]">{t.customerName}</p>
                          <p className="truncate text-[14px] text-ink-3">{t.serviceName} · {t.staffName}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section aria-labelledby="ai-h">
              <h2 id="ai-h" className="mb-3 text-[16px] font-semibold">Assistant</h2>
              <div className="rounded-2xl border border-line bg-surface/60 p-5">
                <div className="flex items-start gap-3">
                  <span className="relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <Sparkle size={15} strokeWidth={1.9} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] leading-tight font-semibold">
                      <span className="text-[24px] tracking-[-0.03em] tabular-nums">{data.aiMessages.toLocaleString()}</span>{" "}
                      messages answered
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-3">This month, from your approved answers</p>
                  </div>
                </div>
                <div
                  className="mt-4 h-1 overflow-hidden rounded-full bg-track"
                  role="progressbar"
                  aria-valuenow={data.aiMessages}
                  aria-valuemax={business.aiMonthlyMessageLimit}
                  aria-label="AI messages used this month"
                >
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-700 ease-[var(--ease-out)]"
                    style={{ width: `${business.aiMonthlyMessageLimit ? Math.min(100, (data.aiMessages / business.aiMonthlyMessageLimit) * 100) : 0}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[12.5px] text-ink-3 tabular-nums">
                  {business.aiMonthlyMessageLimit.toLocaleString()} included on Pro
                </p>

                <div className="mt-4 space-y-0.5 border-t border-line pt-2">
                  <Link href="/app/inbox?f=new" className="press -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-[14px] hover:bg-bg">
                    <MessageSquare size={15} className="text-ink-3" aria-hidden />
                    <span className="flex-1">Unread conversations</span>
                    <span className="font-semibold tabular-nums">{data.newInquiries}</span>
                  </Link>
                  <Link href="/app/inbox" className="press -mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-[14px] hover:bg-bg">
                    <Hand size={15} className="text-ink-3" aria-hidden />
                    <span className="flex-1">Awaiting a person</span>
                    <span className="font-semibold tabular-nums">{data.awaitingStaff}</span>
                  </Link>
                </div>

                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-3">
                  It answers from your services, hours and FAQs. Anything else is handed to you with the thread attached.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
