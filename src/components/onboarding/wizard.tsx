"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, Input, Select, Switch, Textarea, cx } from "@/components/ui";
import { completeOnboarding } from "@/server/actions";
import { minuteLabel } from "@/lib/time";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMES = Array.from({ length: 48 }, (_, i) => i * 30);
const STEPS = ["Business", "Hours", "Services", "Staff", "FAQs"] as const;

export function OnboardingWizard({ ownerName }: { ownerName: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const [biz, setBiz] = useState({ name: "", type: "salon", phone: "", address: "", requireApproval: true });
  const [hours, setHours] = useState(() => [1, 2, 3, 4, 5, 6, 0].map((wd) => ({ weekday: wd, open: wd !== 0, startMinute: 540, endMinute: 1080 })));
  const [services, setServices] = useState([{ name: "", durationMinutes: 60, price: 0 }]);
  const [staff, setStaff] = useState([ownerName]);
  const [faqs, setFaqs] = useState([{ question: "", answer: "" }]);

  const next = () => {
    setError(null);
    if (step === 0 && biz.name.trim().length < 2) return setError("Enter your business name.");
    if (step === 1 && hours.some((h) => h.open && h.startMinute >= h.endMinute)) return setError("Closing time must be after opening time.");
    setStep((s) => s + 1);
  };
  const finish = () =>
    start(async () => {
      const r = await completeOnboarding({
        ...biz,
        type: biz.type as "salon",
        timezone: "Asia/Manila",
        hours: hours.filter((h) => h.open).map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute })),
        services: services.filter((s) => s.name.trim().length >= 2),
        staff: staff.map((s) => s.trim()).filter((s) => s.length >= 2),
        faqs: faqs.filter((f) => f.question.trim().length >= 3 && f.answer.trim().length >= 2),
      });
      if (r.ok) {
        router.push("/app/overview");
        router.refresh();
      } else setError(r.error);
    });

  return (
    <div>
      <p className="text-[13.5px] text-muted">Step {step + 1} of {STEPS.length}</p>
      <div className="mt-2 mb-8 flex gap-1.5" aria-hidden>
        {STEPS.map((s, i) => <span key={s} className={cx("h-1 flex-1 rounded-full", i <= step ? "bg-accent-strong" : "bg-surface-2")} />)}
      </div>

      {step === 0 && (
        <Step title="Tell us about your business" body="You can change all of this later in Settings.">
          <Field label="Business name" htmlFor="o-name"><Input id="o-name" value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} autoFocus /></Field>
          <Field label="Type of business" htmlFor="o-type">
            <Select id="o-type" value={biz.type} onChange={(e) => setBiz({ ...biz, type: e.target.value })}>
              <option value="salon">Salon</option><option value="barbershop">Barbershop</option><option value="dental">Dental clinic</option>
              <option value="aesthetic">Aesthetic clinic</option><option value="car_detailing">Car detailing</option><option value="other">Other</option>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" htmlFor="o-phone"><Input id="o-phone" type="tel" value={biz.phone} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} /></Field>
            <Field label="Timezone" htmlFor="o-tz" hint="Philippines"><Input id="o-tz" value="Asia/Manila" readOnly /></Field>
          </div>
          <Field label="Address" htmlFor="o-addr"><Input id="o-addr" value={biz.address} onChange={(e) => setBiz({ ...biz, address: e.target.value })} /></Field>
        </Step>
      )}

      {step === 1 && (
        <Step title="When are you open?" body="Customers can only book inside these hours.">
          <ul className="divide-y divide-line rounded-lg border border-line">
            {hours.map((h, i) => (
              <li key={h.weekday} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="w-10 text-[14px]">{DAYS[h.weekday]}</span>
                <Switch checked={h.open} onChange={(x) => setHours(hours.map((y, j) => (j === i ? { ...y, open: x } : y)))} label={`Open on ${DAYS[h.weekday]}`} />
                {h.open ? (
                  <span className="flex items-center gap-2">
                    <Select aria-label={`${DAYS[h.weekday]} opens`} className="h-9 w-[136px] text-[13.5px]" value={h.startMinute} onChange={(e) => setHours(hours.map((y, j) => (j === i ? { ...y, startMinute: Number(e.target.value) } : y)))}>
                      {TIMES.map((t) => <option key={t} value={t}>{minuteLabel(t)}</option>)}
                    </Select>
                    <span className="text-muted">to</span>
                    <Select aria-label={`${DAYS[h.weekday]} closes`} className="h-9 w-[136px] text-[13.5px]" value={h.endMinute} onChange={(e) => setHours(hours.map((y, j) => (j === i ? { ...y, endMinute: Number(e.target.value) } : y)))}>
                      {TIMES.slice(1).map((t) => <option key={t} value={t}>{minuteLabel(t)}</option>)}
                    </Select>
                  </span>
                ) : <span className="text-[13.5px] text-muted">Closed</span>}
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-4 rounded-md border border-line px-4 py-3">
            <span>
              <span className="block text-[14px] font-medium">Approve each booking request</span>
              <span className="block text-[13px] text-muted">Recommended. Turn off to confirm free slots instantly.</span>
            </span>
            <Switch checked={biz.requireApproval} onChange={(x) => setBiz({ ...biz, requireApproval: x })} label="Approve each booking request" />
          </div>
        </Step>
      )}

      {step === 2 && (
        <Step title="What can customers book?" body="Add a few now. You can add descriptions and buffers later.">
          {services.map((s, i) => (
            <div key={i} className="grid grid-cols-[1fr_96px_110px_auto] items-end gap-2">
              <Field label={i === 0 ? "Service" : ""} htmlFor={`s-n-${i}`}><Input id={`s-n-${i}`} aria-label="Service name" placeholder="e.g. Haircut" value={s.name} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} /></Field>
              <Field label={i === 0 ? "Minutes" : ""} htmlFor={`s-d-${i}`}><Input id={`s-d-${i}`} aria-label="Duration in minutes" type="number" min={5} step={5} value={s.durationMinutes} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, durationMinutes: Number(e.target.value) } : x)))} /></Field>
              <Field label={i === 0 ? "Price (₱)" : ""} htmlFor={`s-p-${i}`}><Input id={`s-p-${i}`} aria-label="Price in pesos" type="number" min={0} value={s.price} onChange={(e) => setServices(services.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))} /></Field>
              <Button type="button" variant="ghost" aria-label="Remove service" onClick={() => setServices(services.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
            </div>
          ))}
          <Button type="button" size="sm" onClick={() => setServices([...services, { name: "", durationMinutes: 60, price: 0 }])}><Plus size={15} /> Add service</Button>
        </Step>
      )}

      {step === 3 && (
        <Step title="Who does the work?" body="Each person gets their own column in the calendar. Everyone can do every service for now.">
          {staff.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input aria-label={`Staff member ${i + 1}`} value={s} onChange={(e) => setStaff(staff.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Name" />
              <Button type="button" variant="ghost" aria-label="Remove" onClick={() => setStaff(staff.filter((_, j) => j !== i))}><Trash2 size={15} /></Button>
            </div>
          ))}
          <Button type="button" size="sm" onClick={() => setStaff([...staff, ""])}><Plus size={15} /> Add person</Button>
        </Step>
      )}

      {step === 4 && (
        <Step title="Teach the AI a few answers" body="The AI only says what's written here and in your services. Skip if you like.">
          {faqs.map((f, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-line p-3">
              <Input aria-label="Question" placeholder="e.g. Do you have parking?" value={f.question} onChange={(e) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
              <Textarea aria-label="Answer" placeholder="Your approved answer" value={f.answer} onChange={(e) => setFaqs(faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
            </div>
          ))}
          <Button type="button" size="sm" onClick={() => setFaqs([...faqs, { question: "", answer: "" }])}><Plus size={15} /> Add question</Button>
        </Step>
      )}

      {error && <p role="alert" className="mt-4 rounded-md bg-[#fbf1ee] px-3 py-2 text-[13.5px] text-[#8a3324]">{error}</p>}
      <div className="mt-8 flex items-center justify-between border-t border-line pt-5">
        <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={step === 0}>Back</Button>
        <div className="flex gap-2">
          {step >= 2 && step < STEPS.length - 1 && <Button onClick={() => setStep((s) => s + 1)}>Skip</Button>}
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={next}>Continue</Button>
          ) : (
            <Button variant="primary" onClick={finish} loading={saving}>Finish setup</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Step({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{title}</h1>
      <p className="mt-1.5 mb-6 text-[14.5px] text-muted">{body}</p>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
