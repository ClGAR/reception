"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, CalendarCheck2, CalendarClock, Check, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button, Field, Input, Textarea, cx } from "@/components/ui";
import { publicOpenDays, publicSlots, submitPublicBooking } from "@/server/public-actions";
import { addDays } from "@/lib/time";

interface Svc { id: string; name: string; description: string; duration: number; price: string }
interface Props { slug: string; today: string; maxDaysAhead: number; requireApproval: boolean; businessName: string; cancellationPolicy: string | null; services: Svc[] }

const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-PH", { timeZone: "UTC", ...o }).format(new Date(`${d}T12:00:00Z`));
const steps = ["Service", "Date & time", "Your details"] as const;

export function BookingFlow(p: Props) {
  const [step, setStep] = useState(0);
  const [svc, setSvc] = useState<Svc | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<{ minute: number; label: string } | null>(null);
  const [done, setDone] = useState<{ status: "pending" | "confirmed"; service: string; when: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (done) return <Done {...done} businessName={p.businessName} />;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_280px]">
      <div>
        <ol className="mb-6 flex items-center gap-2 text-[13.5px]" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
              <span className={cx("grid size-6 place-items-center rounded-full text-[12px] font-medium", i < step ? "bg-accent-strong text-white" : i === step ? "bg-ink text-bg" : "bg-surface-2 text-muted")}>
                {i < step ? <Check size={13} /> : i + 1}
              </span>
              <span className={cx(i === step ? "font-medium" : "text-muted", "hidden sm:inline")}>{s}</span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden />}
            </li>
          ))}
        </ol>

        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="mb-4 inline-flex items-center gap-1 text-[14px] text-muted hover:text-ink">
            <ArrowLeft size={15} /> Back
          </button>
        )}

        {step === 0 && (
          <section aria-labelledby="s1">
            <h2 id="s1" className="mb-4 text-[20px] font-semibold">Choose a service</h2>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {p.services.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      setSvc(s);
                      setDate(null);
                      setSlot(null);
                      setStep(1);
                    }}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15.5px] font-medium">{s.name}</span>
                      {s.description && <span className="mt-0.5 block text-[13.5px] text-muted">{s.description}</span>}
                      <span className="mt-1 flex items-center gap-1.5 text-[13px] text-muted"><Clock size={13} aria-hidden /> {s.duration} min</span>
                    </span>
                    <span className="text-[15px] font-medium tabular-nums">{s.price}</span>
                    <ChevronRight size={18} className="text-muted" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {step === 1 && svc && (
          <DateTime
            {...p}
            svc={svc}
            date={date}
            setDate={setDate}
            slot={slot}
            notice={notice}
            onPick={(s) => {
              setSlot(s);
              setNotice(null);
              setStep(2);
            }}
          />
        )}

        {step === 2 && svc && date && slot && (
          <Details
            {...p}
            svc={svc}
            date={date}
            slot={slot}
            onDone={setDone}
            onTaken={(msg) => {
              setSlot(null);
              setNotice(msg);
              setStep(1);
            }}
          />
        )}
      </div>

      <aside className="h-fit rounded-lg border border-line bg-surface/50 px-5 py-4 text-[14px] md:sticky md:top-6" aria-label="Your booking">
        <p className="mb-3 text-[12.5px] font-medium tracking-[0.06em] text-muted">YOUR BOOKING</p>
        {svc ? (
          <dl className="space-y-2">
            <div><dt className="sr-only">Service</dt><dd className="font-medium">{svc.name}</dd><dd className="text-muted">{svc.duration} min · {svc.price}</dd></div>
            {date && <div className="flex items-center gap-2"><dt><CalendarClock size={15} aria-label="Date" /></dt><dd>{fmt(date, { weekday: "long", month: "long", day: "numeric" })}</dd></div>}
            {slot && <div className="flex items-center gap-2"><dt><Clock size={15} aria-label="Time" /></dt><dd>{slot.label}</dd></div>}
          </dl>
        ) : (
          <p className="text-muted">Pick a service to start.</p>
        )}
        {p.cancellationPolicy && <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-muted">{p.cancellationPolicy}</p>}
      </aside>
    </div>
  );
}

function DateTime(p: Props & { svc: Svc; date: string | null; setDate: (d: string) => void; slot: { minute: number } | null; notice: string | null; onPick: (s: { minute: number; label: string }) => void }) {
  const [weekStart, setWeekStart] = useState(p.today);
  const [open, setOpen] = useState<string[] | null>(null);
  const [slots, setSlots] = useState<{ minute: number; label: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  const last = addDays(p.today, p.maxDaysAhead);
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(weekStart, i)).filter((d) => d <= last), [weekStart, last]);

  useEffect(() => {
    start(async () => {
      const r = await publicOpenDays(p.slug, p.svc.id, weekStart, 14);
      if (r.ok) {
        setOpen(r.open);
        if (!p.date && r.open[0]) p.setDate(r.open[0]);
      } else setError(r.error);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, p.svc.id]);

  useEffect(() => {
    if (!p.date) return;
    start(async () => {
      const r = await publicSlots(p.slug, p.svc.id, p.date!);
      if (r.ok) {
        setSlots(r.slots);
        setError(null);
      } else setError(r.error);
    });
  }, [p.date, p.slug, p.svc.id, p.notice]);

  return (
    <section aria-labelledby="s2">
      <h2 id="s2" className="mb-4 text-[20px] font-semibold">Pick a date and time</h2>
      {p.notice && <p role="alert" className="mb-4 rounded-md bg-warn-soft px-3 py-2 text-[13.5px] text-warn-ink">{p.notice} Here are the times still open.</p>}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[14px] font-medium">{fmt(days[0] ?? weekStart, { month: "long", year: "numeric" })}</p>
        <div className="flex gap-1">
          <button aria-label="Earlier dates" disabled={weekStart <= p.today} onClick={() => {
            setOpen(null);
            setWeekStart(addDays(weekStart, -14) < p.today ? p.today : addDays(weekStart, -14));
          }} className="grid size-9 place-items-center rounded-md border border-line hover:bg-surface disabled:opacity-40">
            <ChevronLeft size={17} />
          </button>
          <button aria-label="Later dates" disabled={addDays(weekStart, 14) > last} onClick={() => {
            setOpen(null);
            setWeekStart(addDays(weekStart, 14));
          }} className="grid size-9 place-items-center rounded-md border border-line hover:bg-surface disabled:opacity-40">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7" role="radiogroup" aria-label="Date">
        {days.map((d) => {
          const isOpen = open?.includes(d) ?? false;
          const sel = p.date === d;
          return (
            <button
              key={d}
              role="radio"
              aria-checked={sel}
              disabled={!isOpen}
              onClick={() => {
                if (d === p.date) return;
                setSlots(null);
                p.setDate(d);
              }}
              className={cx(
                "flex flex-col items-center rounded-md border py-2 text-[13px] transition-colors",
                sel ? "border-accent-strong bg-accent-strong text-white" : isOpen ? "border-line hover:bg-surface" : "border-transparent text-muted/60 line-through",
                !open && "animate-pulse",
              )}
            >
              <span className={sel ? "text-white/80" : "text-muted"}>{fmt(d, { weekday: "short" })}</span>
              <span className="text-[16px] font-medium tabular-nums">{fmt(d, { day: "numeric" })}</span>
            </button>
          );
        })}
      </div>
      {open && open.length === 0 && <p className="mt-3 text-[13.5px] text-muted">No open dates in this range. Try later dates.</p>}

      {p.date && (
        <div className="mt-6">
          <p className="mb-3 text-[14px] font-medium">{fmt(p.date, { weekday: "long", month: "long", day: "numeric" })}</p>
          {error && <p role="alert" className="text-[13.5px] text-[#9b3b2b]">{error}</p>}
          {!slots && !error && <p className="text-[13.5px] text-muted">Loading times…</p>}
          {slots && slots.length === 0 && <p className="text-[13.5px] text-muted">Fully booked. Please pick another date.</p>}
          {slots && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Time">
              {slots.map((s) => (
                <button key={s.minute} role="radio" aria-checked={p.slot?.minute === s.minute} onClick={() => p.onPick(s)} className="h-10 rounded-md border border-line text-[14px] tabular-nums transition-colors hover:border-accent hover:bg-accent-soft/50">
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Details(p: Props & { svc: Svc; date: string; slot: { minute: number; label: string }; onDone: (d: { status: "pending" | "confirmed"; service: string; when: string }) => void; onTaken: (msg: string) => void }) {
  const [key] = useState(() => crypto.randomUUID());
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <section aria-labelledby="s3">
      <h2 id="s3" className="mb-4 text-[20px] font-semibold">Your details</h2>
      <form
        className="max-w-[460px] space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setError(null);
          start(async () => {
            const r = await submitPublicBooking(p.slug, {
              serviceId: p.svc.id,
              date: p.date,
              minute: p.slot.minute,
              name: String(f.get("name")),
              email: String(f.get("email")),
              phone: String(f.get("phone")),
              notes: String(f.get("notes")),
              consent: f.get("consent") === "on" ? true : (false as unknown as true),
              idempotencyKey: key,
            });
            if (r.ok) p.onDone({ status: r.status, ...r.summary });
            else if (r.code === "slot_unavailable") p.onTaken(r.error);
            else setError(r.error);
          });
        }}
      >
        <Field label="Full name" htmlFor="bk-name"><Input id="bk-name" name="name" autoComplete="name" required minLength={2} /></Field>
        <Field label="Email" htmlFor="bk-email" hint="We'll send updates about this appointment here."><Input id="bk-email" name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Mobile number (optional)" htmlFor="bk-phone"><Input id="bk-phone" name="phone" type="tel" autoComplete="tel" placeholder="+63 9XX XXX XXXX" /></Field>
        <Field label="Notes for the team (optional)" htmlFor="bk-notes"><Textarea id="bk-notes" name="notes" maxLength={500} /></Field>
        <label className="flex items-start gap-3 text-[13px] leading-relaxed text-ink/80">
          <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-[#3f574d]" />
          <span>I agree that {p.businessName} may use my name and contact details to manage this appointment, in line with the Data Privacy Act of 2012.</span>
        </label>
        {error && <p role="alert" className="rounded-md bg-[#fbf1ee] px-3 py-2 text-[13.5px] text-[#8a3324]">{error}</p>}
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full sm:w-auto">
          {p.requireApproval ? "Request appointment" : "Book appointment"}
        </Button>
        {p.requireApproval && <p className="text-[12.5px] text-muted">This is a request. {p.businessName} will confirm it.</p>}
      </form>
    </section>
  );
}

function Done({ status, service, when, businessName }: { status: "pending" | "confirmed"; service: string; when: string; businessName: string }) {
  const confirmed = status === "confirmed";
  return (
    <div className="mx-auto max-w-[460px] py-10 text-center" role="status">
      <span className={cx("mx-auto mb-5 grid size-14 place-items-center rounded-full", confirmed ? "bg-accent-soft text-accent-strong" : "bg-warn-soft text-warn-ink")}>
        {confirmed ? <CalendarCheck2 size={26} /> : <CalendarClock size={26} />}
      </span>
      <h2 className="text-[24px] font-semibold tracking-[-0.01em]">{confirmed ? "You're booked" : "Request sent"}</h2>
      <p className="mt-2 text-[15px] text-ink/80">{service} · {when}</p>
      <p className="mt-4 text-[14px] text-muted">
        {confirmed
          ? `${businessName} has your appointment. See you then.`
          : `This is not confirmed yet. ${businessName} will review it and email you once it's confirmed.`}
      </p>
    </div>
  );
}
