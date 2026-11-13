"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Mail, Scissors, Tag, User } from "lucide-react";
import { Badge, Button, cx, Dialog, Select, statusLabel, statusTone } from "@/components/ui";
import { toast } from "@/components/toast";
import { RescheduleDialog } from "./reschedule-dialog";
import { setAppointmentStatus } from "@/server/actions";
import { addDays, minuteLabel } from "@/lib/time";

export interface CalEvent {
  id: string;
  serviceId: string;
  date: string;
  startMinute: number;
  endMinute: number;
  time: string;
  status: string;
  customer: string;
  contact: string;
  service: string;
  staff: string;
  staffId: string;
  price: string;
  source: string;
  notes: string | null;
  past: boolean;
}

interface Props {
  view: "day" | "week";
  date: string;
  start: string;
  days: string[];
  today: string;
  dayStart: number;
  dayEnd: number;
  staff: { id: string; name: string }[];
  services: { id: string; name: string }[];
  filters: { staffId?: string; serviceId?: string };
  pendingCount: number;
  events: CalEvent[];
}

const HOUR = 64; // px per hour
const dayName = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", ...opts }).format(new Date(`${d}T12:00:00Z`));

export function BookingsCalendar(p: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<CalEvent | null>(null);
  const qs = (patch: Record<string, string | undefined>) => {
    const s = new URLSearchParams();
    const merged = { view: p.view, date: p.date, staff: p.filters.staffId, service: p.filters.serviceId, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) s.set(k, v);
    return `/app/bookings?${s}`;
  };
  const step = p.view === "day" ? 1 : 7;
  const title =
    p.view === "day"
      ? dayName(p.date, { weekday: "long", month: "long", day: "numeric" })
      : `${dayName(p.days[0], { month: "short", day: "numeric" })} – ${dayName(p.days[6], { month: "short", day: "numeric", year: "numeric" })}`;
  const hours = Array.from({ length: (p.dayEnd - p.dayStart) / 60 }, (_, i) => p.dayStart + i * 60);
  const columns =
    p.view === "day"
      ? (p.filters.staffId ? p.staff.filter((s) => s.id === p.filters.staffId) : p.staff).map((s) => ({ key: s.id, label: s.name, sub: "", date: p.date, staffId: s.id }))
      : p.days.map((d) => ({ key: d, label: dayName(d, { weekday: "short" }), sub: dayName(d, { day: "numeric" }), date: d, staffId: undefined as string | undefined }));
  const pending = p.events.filter((e) => e.status === "pending");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-4 md:px-8 md:pt-6">
        <h1 className="mr-2 text-[24px] font-semibold tracking-[-0.01em]">Bookings</h1>
        <div className="flex items-center gap-1">
          <Link href={qs({ date: addDays(p.date, -step) })} aria-label={`Previous ${p.view}`} className="grid size-9 place-items-center rounded-md border border-line hover:bg-surface">
            <ChevronLeft size={18} />
          </Link>
          <Link href={qs({ date: p.today })} className="flex h-9 items-center rounded-md border border-line px-3 text-[14px] hover:bg-surface">
            Today
          </Link>
          <Link href={qs({ date: addDays(p.date, step) })} aria-label={`Next ${p.view}`} className="grid size-9 place-items-center rounded-md border border-line hover:bg-surface">
            <ChevronRight size={18} />
          </Link>
        </div>
        <p className="text-[15px] font-medium" aria-live="polite">{title}</p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="f-staff">Filter by staff</label>
          <Select id="f-staff" value={p.filters.staffId ?? ""} onChange={(e) => router.push(qs({ staff: e.target.value || undefined }))} className="h-9 w-[150px] text-[13.5px]">
            <option value="">All staff</option>
            {p.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <label className="sr-only" htmlFor="f-svc">Filter by service</label>
          <Select id="f-svc" value={p.filters.serviceId ?? ""} onChange={(e) => router.push(qs({ service: e.target.value || undefined }))} className="h-9 w-[150px] text-[13.5px]">
            <option value="">All services</option>
            {p.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div role="tablist" aria-label="View" className="flex rounded-md border border-line p-0.5">
            {(["day", "week"] as const).map((v) => (
              <Link key={v} role="tab" aria-selected={p.view === v} href={qs({ view: v })} className={cx("rounded px-3 py-1 text-[13.5px] capitalize", p.view === v ? "bg-surface-2 font-medium" : "text-muted hover:text-ink")}>
                {v}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line bg-warn-soft/40 px-4 py-2.5 text-[13.5px] md:px-8">
          <span className="font-medium">{pending.length} waiting for approval:</span>
          {pending.map((e) => (
            <button key={e.id} onClick={() => setSelected(e)} className="rounded-md border border-[#ecdcaa] bg-bg px-2 py-0.5 hover:bg-surface">
              {e.customer} · {dayName(e.date, { weekday: "short" })} {minuteLabel(e.startMinute)}
            </button>
          ))}
        </div>
      )}

      {/* Desktop/tablet grid */}
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <div className="min-w-[760px]">
          <div className="sticky top-0 z-10 grid border-b border-line bg-bg" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(0,1fr))` }}>
            <span />
            {columns.map((c) => (
              <Link
                key={c.key}
                href={p.view === "week" ? qs({ view: "day", date: c.date }) : "#"}
                className={cx("border-l border-line px-3 py-2.5 text-[13.5px]", c.date === p.today && p.view === "week" && "text-accent-strong")}
              >
                <span className="font-medium">{c.label}</span> {c.sub && <span className={cx("ml-1 tabular-nums", c.date === p.today && "rounded bg-accent-strong px-1.5 py-0.5 text-white")}>{c.sub}</span>}
              </Link>
            ))}
          </div>
          {columns.length === 0 ? (
            <p className="px-8 py-16 text-center text-[14px] text-muted">No active staff yet. Add staff in Services.</p>
          ) : (
            <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(0,1fr))` }}>
              <div>
                {hours.map((h) => (
                  <div key={h} style={{ height: HOUR }} className="pr-2 text-right text-[12px] text-muted -translate-y-2">
                    {minuteLabel(h).replace(":00", "")}
                  </div>
                ))}
              </div>
              {columns.map((c) => (
                <div key={c.key} className={cx("relative border-l border-line", c.date === p.today && p.view === "week" && "bg-surface/40")}>
                  {hours.map((h) => (
                    <div key={h} style={{ height: HOUR }} className="border-b border-line/70" />
                  ))}
                  {p.events
                    .filter((e) => e.date === c.date && (!c.staffId || e.staffId === c.staffId))
                    .map((e) => {
                      const top = ((e.startMinute - p.dayStart) / 60) * HOUR;
                      const h = Math.max(26, ((e.endMinute - e.startMinute) / 60) * HOUR - 3);
                      return (
                        <button
                          key={e.id}
                          onClick={() => setSelected(e)}
                          style={{ top, height: h }}
                          className={cx(
                            "absolute inset-x-1 overflow-hidden rounded-md border px-2 py-1 text-left text-[12.5px] leading-tight transition-colors",
                            e.status === "pending" && "border-dashed border-[#d9bf6a] bg-warn-soft hover:bg-[#f1e3b5]",
                            e.status === "confirmed" && "border-[#c5d5c7] bg-accent-soft hover:bg-[#cfdccf]",
                            (e.status === "completed" || e.status === "no_show") && "border-line bg-surface text-muted",
                          )}
                        >
                          <span className="block truncate font-medium">{e.customer}</span>
                          <span className="block truncate text-ink/70">{minuteLabel(e.startMinute)} · {e.service}</span>
                          {p.view === "week" && h > 52 && <span className="block truncate text-ink/60">{e.staff}</span>}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile agenda */}
      <div className="min-h-0 flex-1 overflow-y-auto md:hidden">
        {p.days.map((d) => {
          const list = p.events.filter((e) => e.date === d);
          return (
            <section key={d} className="border-b border-line px-4 py-3">
              <h2 className={cx("mb-2 text-[13.5px] font-medium", d === p.today && "text-accent-strong")}>{dayName(d, { weekday: "long", month: "short", day: "numeric" })}</h2>
              {list.length === 0 ? (
                <p className="text-[13.5px] text-muted">No bookings</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((e) => (
                    <li key={e.id}>
                      <button onClick={() => setSelected(e)} className="flex w-full items-center gap-3 rounded-md border border-line px-3 py-2.5 text-left">
                        <span className="w-[64px] shrink-0 text-[13.5px] font-medium tabular-nums">{minuteLabel(e.startMinute)}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px]">{e.customer}</span>
                          <span className="block truncate text-[12.5px] text-muted">{e.service} · {e.staff}</span>
                        </span>
                        <Badge tone={statusTone(e.status)}>{statusLabel[e.status]}</Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {selected && <EventDialog event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function EventDialog({ event: e, onClose }: { event: CalEvent; onClose: () => void }) {
  const [busy, start] = useTransition();
  const [resched, setResched] = useState(false);
  const go = (to: "confirmed" | "declined" | "cancelled" | "completed" | "no_show", msg: string) =>
    start(async () => {
      const r = await setAppointmentStatus(e.id, to);
      if (r.ok) {
        toast.ok(msg);
        onClose();
      } else toast.error(r.error);
    });
  if (resched)
    return <RescheduleDialog appointment={{ id: e.id, serviceId: e.serviceId, date: e.date, label: `${e.service} for ${e.customer}` }} onClose={onClose} />;
  return (
    <Dialog open onClose={onClose} title="Appointment">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[17px] font-semibold">{e.customer}</p>
          {e.contact && <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted"><Mail size={13} /> {e.contact}</p>}
        </div>
        <Badge tone={statusTone(e.status)}>{statusLabel[e.status]}</Badge>
      </div>
      <dl className="space-y-2 text-[14px]">
        <div className="flex items-center gap-3"><dt className="text-muted"><CalendarDays size={16} /><span className="sr-only">Date</span></dt><dd>{dayName(e.date, { weekday: "long", month: "long", day: "numeric" })}</dd></div>
        <div className="flex items-center gap-3"><dt className="text-muted"><Clock size={16} /><span className="sr-only">Time</span></dt><dd>{e.time}</dd></div>
        <div className="flex items-center gap-3"><dt className="text-muted"><Scissors size={16} /><span className="sr-only">Service</span></dt><dd>{e.service}</dd></div>
        <div className="flex items-center gap-3"><dt className="text-muted"><User size={16} /><span className="sr-only">Staff</span></dt><dd>{e.staff}</dd></div>
        <div className="flex items-center gap-3"><dt className="text-muted"><Tag size={16} /><span className="sr-only">Price</span></dt><dd>{e.price}</dd></div>
      </dl>
      {e.notes && <p className="mt-3 rounded-md bg-surface px-3 py-2 text-[13.5px]">{e.notes}</p>}
      <p className="mt-3 text-[12.5px] text-muted">Booked via {e.source === "chat" ? "chat" : e.source === "staff" ? "staff" : "booking page"}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        {e.status === "pending" && (
          <>
            <Button onClick={() => go("declined", "Request declined.")} disabled={busy}>Decline</Button>
            <Button onClick={() => setResched(true)} disabled={busy}>Reschedule</Button>
            <Button variant="primary" onClick={() => go("confirmed", "Booking confirmed.")} loading={busy}>Approve &amp; Confirm</Button>
          </>
        )}
        {e.status === "confirmed" && (
          <>
            <Button variant="danger" onClick={() => go("cancelled", "Booking cancelled.")} disabled={busy}>Cancel booking</Button>
            {e.past ? (
              <>
                <Button onClick={() => go("no_show", "Marked as no-show.")} disabled={busy}>No-show</Button>
                <Button variant="primary" onClick={() => go("completed", "Marked as completed.")} loading={busy}>Mark completed</Button>
              </>
            ) : (
              <Button variant="primary" onClick={() => setResched(true)} disabled={busy}>Reschedule</Button>
            )}
          </>
        )}
        {!["pending", "confirmed"].includes(e.status) && <Button onClick={onClose}>Close</Button>}
      </div>
    </Dialog>
  );
}
