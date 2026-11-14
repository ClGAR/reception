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
        <p className="mb-3 text-[14px] font-medium text-primary sm:hidden">
          Step {step + 1} of {steps.length} · {steps[step]}
        </p>
        <ol className="mb-6 flex items-center gap-2 text-[14.5px]" aria-label="Steps">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-2" aria-current={i === step ? "step" : undefined}>
              <span className={cx("grid size-7 place-items-center rounded-full text-[13px] font-medium", i < step ? "bg-primary text-primary-ink" : i === step ? "bg-accent-soft text-primary ring-1 ring-primary" : "bg-surface-2 text-ink-3")}>
                {i < step ? <Check size={13} /> : i + 1}
              </span>
              <span className={cx(i === step ? "font-medium" : "text-ink-3", "hidden sm:inline")}>{s}</span>
              {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line" aria-hidden />}
            </li>
          ))}
        </ol>

        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="press mb-4 -ml-2 inline-flex h-10 items-center gap-1.5 rounded-[10px] px-2 text-[15px] font-medium text-primary hover:bg-accent-soft">
            <ArrowLeft size={16} /> Back
          </button>
        )}

        {step === 0 && (
          <section aria-labelledby="s1">
            <h2 id="s1" className="mb-4 text-[20px] font-semibold">Choose a service</h2>
            <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
              {p.services.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      setSvc(s);
                      setDate(null);
                      setSlot(null);
                      setStep(1);
                    }}
                    className="flex min-h-[72px] w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[17px] font-semibold">{s.name}</span>
                      {s.description && <span className="mt-0.5 block text-[14.5px] text-ink-3">{s.description}</span>}
                      <span className="mt-1 flex items-center gap-1.5 text-[14px] text-ink-3"><Clock size={13} aria-hidden /> {s.duration} min</span>
                    </span>
                    <span className="text-[17px] font-semibold tabular-nums">{s.price}</span>
                    <ChevronRight size={18} className="text-ink-3" aria-hidden />
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

      <aside className="h-fit rounded-[14px] border border-line bg-surface px-5 py-4 text-[15px] md:sticky md:top-6" aria-label="Your booking">
        <p className="mb-3 text-[15px] font-semibold text-ink">Your booking</p>
        {svc ? (
          <dl className="space-y-2">
            <div><dt className="sr-only">Service</dt><dd className="font-medium">{svc.name}</dd><dd className="text-ink-3">{svc.duration} min · {svc.price}</dd></div>
            {date && <div className="flex items-center gap-2"><dt><CalendarClock size={15} aria-label="Date" /></dt><dd>{fmt(date, { weekday: "long", month: "long", day: "numeric" })}</dd></div>}
            {slot && <div className="flex items-center gap-2"><dt><Clock size={15} aria-label="Time" /></dt><dd>{slot.label}</dd></div>}
          </dl>
        ) : (
          <p className="text-ink-3">Pick a service to start.</p>
        )}
        {p.cancellationPolicy && <p className="mt-4 border-t border-line pt-3 text-[13.5px] text-ink-3">{p.cancellationPolicy}</p>}
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
      {p.notice && <p role="alert" className="mb-4 rounded-[10px] bg-warn-soft px-3.5 py-2.5 text-[14.5px] text-warn-ink">{p.notice} Here are the times still open.</p>}
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[15px] font-medium">{fmt(days[0] ?? weekStart, { month: "long", year: "numeric" })}</p>
        <div className="flex gap-1">
          <button aria-label="Earlier dates" disabled={weekStart <= p.today} onClick={() => {
            setOpen(null);
            setWeekStart(addDays(weekStart, -14) < p.today ? p.today : addDays(weekStart, -14));
          }} className="press grid size-11 place-items-center rounded-[10px] border border-line-strong hover:bg-surface disabled:opacity-40">
            <ChevronLeft size={17} />
          </button>
          <button aria-label="Later dates" disabled={addDays(weekStart, 14) > last} onClick={() => {
            setOpen(null);
            setWeekStart(addDays(weekStart, 14));
          }} className="press grid size-11 place-items-center rounded-[10px] border border-line-strong hover:bg-surface disabled:opacity-40">
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
                "flex min-h-[60px] flex-col items-center justify-center rounded-[10px] border py-2 text-[14px] transition-colors",
                sel ? "border-primary bg-primary text-primary-ink" : isOpen ? "border-line-strong hover:border-primary hover:bg-accent-soft" : "border-transparent text-ink-3/60 line-through",
                !open && "animate-pulse",
              )}
            >
              <span className={sel ? "text-primary-ink/85" : "text-ink-3"}>{fmt(d, { weekday: "short" })}</span>
              <span className="text-[18px] font-semibold tabular-nums">{fmt(d, { day: "numeric" })}</span>
            </button>
          );
        })}
      </div>
      {open && open.length === 0 && <p className="mt-3 text-[14.5px] text-ink-3">No open dates in this range. Try later dates.</p>}

      {p.date && (
        <div className="mt-6">
          <p className="mb-3 text-[15px] font-medium">{fmt(p.date, { weekday: "long", month: "long", day: "numeric" })}</p>
          {error && <p role="alert" className="text-[14.5px] text-danger-ink">{error}</p>}
          {!slots && !error && <p className="text-[14.5px] text-ink-3">Loading times…</p>}
          {slots && slots.length === 0 && <p className="text-[14.5px] text-ink-3">Fully booked. Please pick another date.</p>}
          {slots && slots.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Time">
              {slots.map((s) => (
                <button key={s.minute} role="radio" aria-checked={p.slot?.minute === s.minute} onClick={() => p.onPick(s)} className="h-12 rounded-[10px] border border-line-strong text-[16px] tabular-nums transition-colors hover:border-accent hover:bg-accent-soft/50">
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
        <label className="flex items-start gap-3 text-[14px] leading-relaxed text-ink-2">
          <input type="checkbox" name="consent" required className="mt-0.5 size-5 shrink-0 accent-primary" />
          <span>I agree that {p.businessName} may use my name and contact details to manage this appointment, in line with the Data Privacy Act of 2012.</span>
        </label>
        {error && <p role="alert" className="rounded-[10px] bg-danger-soft px-3.5 py-2.5 text-[14.5px] text-danger-ink">{error}</p>}
        <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full sm:w-auto">
          {p.requireApproval ? "Request appointment" : "Book appointment"}
        </Button>
        {p.requireApproval && <p className="text-[13.5px] text-ink-3">This is a request. {p.businessName} will confirm it.</p>}
      </form>
    </section>
  );
}

function Done({ status, service, when, businessName }: { status: "pending" | "confirmed"; service: string; when: string; businessName: string }) {
  const confirmed = status === "confirmed";
  return (
    <div className="mx-auto max-w-[460px] py-10 text-center" role="status">
      <span className={cx("mx-auto mb-5 grid size-14 place-items-center rounded-full", confirmed ? "bg-success-soft text-success" : "bg-warn-soft text-warn-ink")}>
        {confirmed ? <CalendarCheck2 size={26} /> : <CalendarClock size={26} />}
      </span>
      <h2 className="text-[24px] font-semibold tracking-[-0.01em]">{confirmed ? "You're booked" : "Request sent"}</h2>
      <p className="mt-2 text-[15px] text-ink-2">{service} · {when}</p>
      <p className="mt-4 text-[15px] text-ink-3">
        {confirmed
          ? `${businessName} has your appointment. See you then.`
          : `This is not confirmed yet. ${businessName} will review it and email you once it's confirmed.`}
      </p>
    </div>
  );
}
