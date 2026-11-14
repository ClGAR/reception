"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { Copy, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Badge, Button, Field, Input, Select, Switch, Textarea, cx } from "@/components/ui";
import { toast } from "@/components/toast";
import { addClosure, inviteMember, removeClosure, rotateWidgetToken, saveHours, updateBusiness } from "@/server/actions";
import { minuteLabel } from "@/lib/time";

type Biz = {
  name: string; slug: string; type: string; phone: string; email: string; address: string; parking: string; cancellationPolicy: string;
  timezone: string; requireApproval: boolean; aiEnabled: boolean; aiMonthlyMessageLimit: number; leadTimeMinutes: number; maxDaysAhead: number;
  slotStepMinutes: number; widgetToken: string; widgetGreeting: string; widgetAllowedOrigins: string[]; notifyEmail: boolean;
};
interface Props {
  tab: "business" | "availability" | "team" | "ai" | "notifications" | "widget" | "usage";
  origin: string;
  perms: { business: boolean; operational: boolean; team: boolean };
  business: Biz;
  hours: { weekday: number; startMinute: number; endMinute: number }[];
  closures: { id: string; date: string; reason: string }[];
  team: { memberId: string; role: string; name: string; email: string }[];
  usage: { aiMessages: number; openHandoffs: number };
  integrations: { ai: boolean; email: boolean };
}

const tabs = [
  ["business", "Business profile"],
  ["availability", "Availability"],
  ["team", "Team"],
  ["ai", "AI behavior"],
  ["notifications", "Notifications"],
  ["widget", "Chat widget"],
  ["usage", "Usage & plan"],
] as const;

export function SettingsView(p: Props) {
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <nav aria-label="Settings sections" className="shrink-0 border-b border-line px-4 pt-6 pb-3 md:w-[230px] md:border-r md:border-b-0 md:px-3 md:pt-7">
        <h1 className="mb-4 px-3 text-[24px] font-semibold tracking-[-0.01em]">Settings</h1>
        <ul className="flex gap-1 overflow-x-auto md:flex-col">
          {tabs.map(([k, l]) => (
            <li key={k}>
              <Link href={`/app/settings?tab=${k}`} aria-current={p.tab === k ? "page" : undefined} className={cx("block rounded-md px-3 py-2 text-[15px] whitespace-nowrap", p.tab === k ? "bg-accent-soft font-semibold text-primary" : "text-ink/80 hover:bg-surface")}>
                {l}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="min-w-0 flex-1 px-4 py-6 md:px-10 md:py-8">
        <div className="max-w-[680px]">
          {p.tab === "business" && <BusinessTab {...p} />}
          {p.tab === "availability" && <AvailabilityTab {...p} />}
          {p.tab === "team" && <TeamTab {...p} />}
          {p.tab === "ai" && <AiTab {...p} />}
          {p.tab === "notifications" && <NotificationsTab {...p} />}
          {p.tab === "widget" && <WidgetTab {...p} />}
          {p.tab === "usage" && <UsageTab {...p} />}
        </div>
      </div>
    </div>
  );
}

function Section({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-[17px] font-semibold">{title}</h2>
      {body && <p className="mt-1 text-[14.5px] text-ink-3">{body}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ReadOnly({ show }: { show: boolean }) {
  return show ? <p className="mb-5 rounded-md bg-surface px-3 py-2 text-[14.5px] text-ink-3">You can view these settings. Only the owner can change them.</p> : null;
}

function useSave() {
  const [saving, start] = useTransition();
  const save = (patch: Partial<Biz>, msg = "Saved.") =>
    start(async () => {
      const r = await updateBusiness(patch);
      if (r.ok) toast.ok(msg); else toast.error(r.error);
    });
  return { saving, save };
}

function BusinessTab({ business: b, perms }: Props) {
  const [v, setV] = useState(b);
  const { saving, save } = useSave();
  const dis = !perms.business;
  return (
    <Section title="Business profile" body="Shown on your booking page and used by the AI for location and contact questions.">
      <ReadOnly show={dis} />
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save({ name: v.name, type: v.type, phone: v.phone, email: v.email, address: v.address, parking: v.parking, cancellationPolicy: v.cancellationPolicy, timezone: v.timezone });
        }}
      >
        <fieldset disabled={dis} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" htmlFor="b-name"><Input id="b-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
            <Field label="Business type" htmlFor="b-type">
              <Select id="b-type" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
                <option value="salon">Salon</option><option value="barbershop">Barbershop</option><option value="dental">Dental clinic</option>
                <option value="aesthetic">Aesthetic clinic</option><option value="car_detailing">Car detailing</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Phone" htmlFor="b-phone"><Input id="b-phone" type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
            <Field label="Email" htmlFor="b-email"><Input id="b-email" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
          </div>
          <Field label="Address" htmlFor="b-addr"><Input id="b-addr" value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></Field>
          <Field label="Parking" htmlFor="b-park"><Textarea id="b-park" value={v.parking} onChange={(e) => setV({ ...v, parking: e.target.value })} /></Field>
          <Field label="Cancellation policy" htmlFor="b-cancel"><Textarea id="b-cancel" value={v.cancellationPolicy} onChange={(e) => setV({ ...v, cancellationPolicy: e.target.value })} /></Field>
          <Field label="Timezone" htmlFor="b-tz" hint="All bookings are shown in this timezone.">
            <Select id="b-tz" value={v.timezone} onChange={(e) => setV({ ...v, timezone: e.target.value })}>
              {["Asia/Manila", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Tokyo", "UTC"].map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
          <Button type="submit" variant="primary" loading={saving}>Save profile</Button>
        </fieldset>
      </form>
    </Section>
  );
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = Array.from({ length: 48 }, (_, i) => i * 30);

function AvailabilityTab({ business: b, hours, closures, perms }: Props) {
  const dis = !perms.operational;
  const [rows, setRows] = useState(() =>
    [1, 2, 3, 4, 5, 6, 0].map((wd) => {
      const h = hours.find((x) => x.weekday === wd);
      return { weekday: wd, open: !!h, startMinute: h?.startMinute ?? 540, endMinute: h?.endMinute ?? 1080 };
    }),
  );
  const [rules, setRules] = useState({ requireApproval: b.requireApproval, leadTimeMinutes: b.leadTimeMinutes, maxDaysAhead: b.maxDaysAhead, slotStepMinutes: b.slotStepMinutes });
  const [closure, setClosure] = useState({ date: "", reason: "" });
  const [saving, start] = useTransition();
  const { saving: savingRules, save } = useSave();
  const bad = rows.some((r) => r.open && r.startMinute >= r.endMinute);
  return (
    <>
      <Section title="Opening hours" body="Customers can only book inside these hours. Staff can have narrower hours.">
        {dis && <p className="mb-5 rounded-md bg-surface px-3 py-2 text-[14.5px] text-ink-3">Only owners and managers can change availability.</p>}
        <fieldset disabled={dis}>
          <ul className="divide-y divide-line rounded-lg border border-line">
            {rows.map((r, i) => (
              <li key={r.weekday} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <span className="w-[110px] text-[15px]">{DAYS[r.weekday]}</span>
                <Switch checked={r.open} onChange={(x) => setRows(rows.map((y, j) => (j === i ? { ...y, open: x } : y)))} label={`Open on ${DAYS[r.weekday]}`} />
                {r.open ? (
                  <span className="flex items-center gap-2">
                    <Select aria-label={`${DAYS[r.weekday]} opening time`} className="h-9 w-[136px] text-[14.5px]" value={r.startMinute} onChange={(e) => setRows(rows.map((y, j) => (j === i ? { ...y, startMinute: Number(e.target.value) } : y)))}>
                      {TIMES.map((t) => <option key={t} value={t}>{minuteLabel(t)}</option>)}
                    </Select>
                    <span className="text-ink-3">to</span>
                    <Select aria-label={`${DAYS[r.weekday]} closing time`} className="h-9 w-[136px] text-[14.5px]" value={r.endMinute} onChange={(e) => setRows(rows.map((y, j) => (j === i ? { ...y, endMinute: Number(e.target.value) } : y)))}>
                      {[...TIMES.slice(1), 1440].map((t) => <option key={t} value={t}>{t === 1440 ? "Midnight" : minuteLabel(t)}</option>)}
                    </Select>
                  </span>
                ) : (
                  <span className="text-[14.5px] text-ink-3">Closed</span>
                )}
              </li>
            ))}
          </ul>
          {bad && <p role="alert" className="mt-2 text-[14px] text-danger-ink">Closing time must be after opening time.</p>}
          <Button
            className="mt-4"
            variant="primary"
            disabled={bad}
            loading={saving}
            onClick={() =>
              start(async () => {
                const r = await saveHours(rows.filter((x) => x.open).map(({ weekday, startMinute, endMinute }) => ({ weekday, startMinute, endMinute })));
                if (r.ok) toast.ok("Opening hours saved."); else toast.error(r.error);
              })
            }
          >
            Save hours
          </Button>
        </fieldset>
      </Section>

      <Section title="Booking rules">
        <fieldset disabled={dis} className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-md border border-line px-4 py-3">
            <span>
              <span className="block text-[15px] font-medium">Staff approves each request</span>
              <span className="block text-[14px] text-ink-3">Off: bookings are confirmed instantly when the slot is free.</span>
            </span>
            <Switch checked={rules.requireApproval} onChange={(x) => setRules({ ...rules, requireApproval: x })} label="Staff approves each request" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Minimum notice (min)" htmlFor="r-lead"><Input id="r-lead" type="number" min={0} value={rules.leadTimeMinutes} onChange={(e) => setRules({ ...rules, leadTimeMinutes: Number(e.target.value) })} /></Field>
            <Field label="Book up to (days ahead)" htmlFor="r-max"><Input id="r-max" type="number" min={1} max={365} value={rules.maxDaysAhead} onChange={(e) => setRules({ ...rules, maxDaysAhead: Number(e.target.value) })} /></Field>
            <Field label="Time slot step" htmlFor="r-step">
              <Select id="r-step" value={rules.slotStepMinutes} onChange={(e) => setRules({ ...rules, slotStepMinutes: Number(e.target.value) })}>
                {[10, 15, 20, 30, 60].map((n) => <option key={n} value={n}>Every {n} min</option>)}
              </Select>
            </Field>
          </div>
          <Button variant="primary" loading={savingRules} onClick={() => save(rules, "Booking rules saved.")}>Save rules</Button>
        </fieldset>
      </Section>

      <Section title="Closures and holidays" body="No bookings are offered on these dates.">
        <fieldset disabled={dis}>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              start(async () => {
                const r = await addClosure(closure);
                if (r.ok) {
                  toast.ok("Closure added.");
                  setClosure({ date: "", reason: "" });
                } else toast.error(r.error);
              });
            }}
          >
            <Field label="Date" htmlFor="c-date"><Input id="c-date" type="date" required value={closure.date} onChange={(e) => setClosure({ ...closure, date: e.target.value })} /></Field>
            <div className="min-w-[200px] flex-1"><Field label="Reason (optional)" htmlFor="c-reason"><Input id="c-reason" value={closure.reason} placeholder="e.g. Rizal Day" onChange={(e) => setClosure({ ...closure, reason: e.target.value })} /></Field></div>
            <Button type="submit"><Plus size={15} /> Add</Button>
          </form>
          {closures.length > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-lg border border-line">
              {closures.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-2.5 text-[15px]">
                  <span className=" tabular-nums">{c.date}</span>
                  <span className="flex-1 text-ink-3">{c.reason}</span>
                  <Button size="sm" variant="ghost" aria-label={`Remove closure on ${c.date}`} onClick={() => start(async () => { const r = await removeClosure(c.id); if (r.ok) toast.ok("Closure removed."); else toast.error(r.error); })}>
                    <Trash2 size={15} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      </Section>
    </>
  );
}

const roleName = (r: string) => (r === "owner" ? "Owner" : r === "admin" ? "Manager" : "Reception staff");

function TeamTab({ team, perms }: Props) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [busy, start] = useTransition();
  return (
    <Section title="Team" body="Owners manage the business and team. Managers handle services, knowledge and hours. Reception staff handle conversations and bookings.">
      <ul className="divide-y divide-line rounded-lg border border-line">
        {team.map((m) => (
          <li key={m.memberId} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{m.name}</span>
              <span className="block truncate text-[14px] text-ink-3">{m.email}</span>
            </span>
            <Badge tone={m.role === "owner" ? "accent" : "neutral"}>{roleName(m.role)}</Badge>
          </li>
        ))}
      </ul>
      {perms.team ? (
        <form
          className="mt-6 flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await inviteMember(email, role);
              if (r.ok) {
                toast.ok(`Invitation created for ${email}.`);
                setEmail("");
              } else toast.error(r.error);
            });
          }}
        >
          <div className="min-w-[220px] flex-1"><Field label="Invite by email" htmlFor="inv-email"><Input id="inv-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field></div>
          <Field label="Role" htmlFor="inv-role">
            <Select id="inv-role" value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")} className="w-[170px]">
              <option value="member">Reception staff</option>
              <option value="admin">Manager</option>
            </Select>
          </Field>
          <Button type="submit" variant="primary" loading={busy}>Send invite</Button>
        </form>
      ) : (
        <p className="mt-4 text-[14.5px] text-ink-3">Only the owner can invite people.</p>
      )}
    </Section>
  );
}

function AiTab({ business: b, perms, integrations }: Props) {
  const [v, setV] = useState({ aiEnabled: b.aiEnabled, aiMonthlyMessageLimit: b.aiMonthlyMessageLimit });
  const { saving, save } = useSave();
  return (
    <Section title="AI behavior" body="The AI answers only from your Knowledge page and service list. It never confirms a booking by itself.">
      <div className="mb-5 rounded-md border border-line px-4 py-3 text-[14.5px]">
        <span className="font-medium">Model provider: </span>
        {integrations.ai ? <Badge tone="success">Connected</Badge> : <Badge tone="warn">Not connected</Badge>}
        <p className="mt-1.5 text-ink-3">
          {integrations.ai
            ? "Replies come from the configured model."
            : "Without a provider, chat replies use keyword matching against your Knowledge page and are labelled as such. Set AI_PROVIDER and AI_MODEL on the server to connect one."}
        </p>
      </div>
      <fieldset disabled={!perms.operational} className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-md border border-line px-4 py-3">
          <span>
            <span className="block text-[15px] font-medium">Automatic replies</span>
            <span className="block text-[14px] text-ink-3">Off: every new message waits for staff.</span>
          </span>
          <Switch checked={v.aiEnabled} onChange={(x) => setV({ ...v, aiEnabled: x })} label="Automatic replies" />
        </div>
        <Field label="Monthly AI message limit" htmlFor="ai-lim" hint="When reached, new messages go to staff instead.">
          <Input id="ai-lim" type="number" min={0} value={v.aiMonthlyMessageLimit} onChange={(e) => setV({ ...v, aiMonthlyMessageLimit: Number(e.target.value) })} className="max-w-[200px]" />
        </Field>
        <div className="rounded-md bg-surface px-4 py-3 text-[14.5px] leading-relaxed text-ink/80">
          <p className="font-medium text-ink">Always on</p>
          <ul className="mt-1 list-disc pl-5">
            <li>No medical diagnoses or treatment advice. Health questions go to staff.</li>
            <li>Bookings are requests until staff confirm (or your rules auto-confirm a free slot).</li>
            <li>Unknown answers get an honest reply and a staff handoff.</li>
          </ul>
        </div>
        <Button variant="primary" loading={saving} onClick={() => save(v, "AI settings saved.")}>Save AI settings</Button>
      </fieldset>
    </Section>
  );
}

function NotificationsTab({ business: b, perms, integrations }: Props) {
  const [notify, setNotify] = useState(b.notifyEmail);
  const { saving, save } = useSave();
  return (
    <Section title="Notifications" body="New requests, approvals and handoffs always appear in the bell menu and on Overview.">
      <div className="mb-5 rounded-md border border-line px-4 py-3 text-[14.5px]">
        <span className="font-medium">Email delivery: </span>
        {integrations.email ? <Badge tone="success">Connected</Badge> : <Badge tone="warn">Dry run</Badge>}
        <p className="mt-1.5 text-ink-3">{integrations.email ? "Emails are sent through Resend." : "No email provider is set up, so no emails are sent. Messages are logged on the server instead."}</p>
      </div>
      <fieldset disabled={!perms.operational} className="space-y-4">
        <div className="flex items-center justify-between gap-4 rounded-md border border-line px-4 py-3">
          <span>
            <span className="block text-[15px] font-medium">Email staff about new booking requests</span>
            <span className="block text-[14px] text-ink-3">Sent to the owner and managers.</span>
          </span>
          <Switch checked={notify} onChange={setNotify} label="Email staff about new booking requests" />
        </div>
        <Button variant="primary" loading={saving} onClick={() => save({ notifyEmail: notify })}>Save</Button>
      </fieldset>
    </Section>
  );
}

function WidgetTab({ business: b, perms, origin }: Props) {
  const [greeting, setGreeting] = useState(b.widgetGreeting);
  const [origins, setOrigins] = useState(b.widgetAllowedOrigins.join("\n"));
  const { saving, save } = useSave();
  const [rotating, start] = useTransition();
  const snippet = `<script src="${origin}/widget.js" data-reception="${b.widgetToken}" async></script>`;
  return (
    <>
      <Section title="Booking page" body="Share this link anywhere: Facebook page, Instagram bio, Google profile.">
        <div className="flex items-center gap-2">
          <Input readOnly value={`${origin}/b/${b.slug}`} aria-label="Booking page link" />
          <Button onClick={() => navigator.clipboard.writeText(`${origin}/b/${b.slug}`).then(() => toast.ok("Link copied."))}><Copy size={15} /> Copy</Button>
        </div>
      </Section>
      <Section title="Website chat widget" body="Paste this before the closing </body> tag on your website.">
        <p className="mb-4 text-[14px] text-ink-3">
          Preview it on <a href={`/widget/${b.widgetToken}`} target="_blank" className="underline underline-offset-2">its own page</a>. The widget only loads on the websites listed below.
        </p>
        <pre className="overflow-x-auto rounded-md border border-line bg-surface px-3 py-3 text-[13.5px]"><code>{snippet}</code></pre>
        <div className="mt-2 flex gap-2">
          <Button size="sm" onClick={() => navigator.clipboard.writeText(snippet).then(() => toast.ok("Snippet copied."))}><Copy size={14} /> Copy snippet</Button>
          {perms.business && (
            <Button size="sm" variant="ghost" loading={rotating} onClick={() => { if (confirm("Make a new widget token? Sites using the old snippet will stop working.")) start(async () => { const r = await rotateWidgetToken(); if (r.ok) toast.ok("New token created."); else toast.error(r.error); }); }}>
              <RefreshCw size={14} /> New token
            </Button>
          )}
        </div>
        <fieldset disabled={!perms.operational} className="mt-6 space-y-4">
          <Field label="Greeting" htmlFor="w-greet"><Input id="w-greet" value={greeting} onChange={(e) => setGreeting(e.target.value)} maxLength={200} /></Field>
          <Field label="Allowed websites" htmlFor="w-origins" hint="One per line, e.g. https://yoursalon.ph. The widget only loads on these sites.">
            <Textarea id="w-origins" value={origins} onChange={(e) => setOrigins(e.target.value)} />
          </Field>
          <Button variant="primary" loading={saving} onClick={() => save({ widgetGreeting: greeting, widgetAllowedOrigins: origins.split(/\s+/).filter(Boolean) }, "Widget settings saved.")}>Save widget settings</Button>
        </fieldset>
      </Section>
    </>
  );
}

function UsageTab({ business: b, usage }: Props) {
  const pct = b.aiMonthlyMessageLimit ? Math.min(100, (usage.aiMessages / b.aiMonthlyMessageLimit) * 100) : 0;
  return (
    <Section title="Usage & plan" body="Counts reset on the 1st of each month.">
      <div className="rounded-lg border border-line px-5 py-4">
        <p className="text-[15px] font-medium">Pro Plan</p>
        <p className="mt-1 text-[14.5px] text-ink-3">₱4,999/month plus a one-time setup fee. Final quotation confirmed with you.</p>
        <p className="mt-4 text-[15px] tabular-nums">{usage.aiMessages.toLocaleString()} / {b.aiMonthlyMessageLimit.toLocaleString()} AI messages this month</p>
        <div className="mt-2 h-1.5 rounded-full bg-track" role="progressbar" aria-valuenow={usage.aiMessages} aria-valuemax={b.aiMonthlyMessageLimit} aria-label="AI messages used">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-4 text-[14.5px] text-ink-3">Open staff handoffs: {usage.openHandoffs}</p>
      </div>
      <p className="mt-4 text-[14.5px] text-ink-3">Online payment isn&apos;t set up. To change plans, contact us and we&apos;ll update your account.</p>
    </Section>
  );
}
