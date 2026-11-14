import { Bell, Check, Sparkle } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { cx } from "@/lib/cx";

/*
  "Everything your front desk needs": each card shows a small working picture of the feature
  (after the "marketing feature bento" pattern on 21st.dev, rebuilt in our tokens).
  All data is the fictional demo salon.
*/

const HOURS = ["9", "11", "1", "3", "5"];

function Timeline() {
  // Start/length in hours from 9 AM, on a 9 AM – 6 PM day.
  const rows: { name: string; blocks: { start: number; len: number; kind: "booked" | "request" }[] }[] = [
    { name: "Joy", blocks: [{ start: 1, len: 1, kind: "booked" }, { start: 5, len: 1, kind: "request" }, { start: 7, len: 0.75, kind: "booked" }] },
    { name: "Carlo", blocks: [{ start: 0, len: 2, kind: "booked" }, { start: 3, len: 2, kind: "booked" }] },
    { name: "Bea", blocks: [{ start: 2, len: 1, kind: "booked" }, { start: 6, len: 1.5, kind: "booked" }] },
  ];
  return (
    <div aria-hidden className="rounded-[14px] border border-line bg-surface/70 p-4">
      <div className="grid grid-cols-[52px_1fr] text-[12px] text-ink-3 tabular-nums">
        <span />
        <div className="relative flex justify-between pb-2">
          {HOURS.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.name} className="grid grid-cols-[52px_1fr] items-center">
            <span className="text-[13px] font-medium text-ink-2">{r.name}</span>
            <div className="relative h-8 rounded-[8px] bg-bg ring-1 ring-line">
              {r.blocks.map((b) => (
                <span
                  key={b.start}
                  className={cx(
                    "absolute inset-y-1 rounded-[6px]",
                    b.kind === "booked" ? "bg-surface-2 ring-1 ring-line-strong" : "bg-primary shadow-[0_6px_16px_-6px_rgba(53,85,240,0.7)]",
                  )}
                  style={{ left: `${(b.start / 9) * 100}%`, width: `${(b.len / 9) * 100}%` }}
                />
              ))}
              {r.name === "Joy" && (
                <span className="absolute -top-2.5 rounded-full bg-accent-soft px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap text-primary" style={{ left: "calc(55.5% + 4px)" }}>
                  New request · 2 PM
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Takeover() {
  return (
    <div aria-hidden className="space-y-2.5 text-[14px]">
      <p className="w-fit max-w-[90%] rounded-[16px] rounded-bl-[6px] bg-surface-2 px-3.5 py-2">
        <Sparkle size={13} className="mr-1.5 inline text-primary" />
        Hair color is ₱2,500. Want a time this weekend?
      </p>
      <div className="flex items-center gap-2 py-1 text-[12.5px] text-ink-3">
        <span className="h-px flex-1 bg-line" />
        You took over · AI paused
        <span className="h-px flex-1 bg-line" />
      </div>
      <p className="ml-auto w-fit max-w-[90%] rounded-[16px] rounded-br-[6px] bg-primary px-3.5 py-2 text-primary-ink">Hi Ana! Saturday 3 PM works with Carlo.</p>
    </div>
  );
}

function Alerts() {
  return (
    <div aria-hidden className="relative pt-1 pb-6">
      <div className="absolute inset-x-6 top-5 h-14 rounded-[14px] border border-line bg-bg" />
      <div className="absolute inset-x-3 top-3 h-14 rounded-[14px] border border-line bg-bg" />
      <div className="relative flex items-start gap-3 rounded-[14px] border border-line bg-bg px-3.5 py-3 shadow-[var(--shadow-pop)]">
        <span className="relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
          <Bell size={15} />
          <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-bg bg-primary" />
        </span>
        <span className="min-w-0 text-[14px] leading-snug">
          <span className="block font-medium">Ana Cruz needs a person</span>
          <span className="text-[13px] text-ink-3">Asked about a skin condition · 2 min ago</span>
        </span>
      </div>
    </div>
  );
}

function AfterHours() {
  // Example day, messages per hour. Shop closes at 7 PM (index 10).
  const bars = [3, 5, 7, 6, 8, 6, 5, 6, 7, 8, 9, 10, 8, 6, 4];
  const closeAt = 10;
  return (
    <div aria-hidden>
      <div className="flex h-24 items-end gap-1.5">
        {bars.map((v, i) => (
          <span key={i} className={cx("flex-1 rounded-t-[4px]", i >= closeAt ? "bg-primary" : "bg-surface-2 ring-1 ring-line ring-inset")} style={{ height: `${v * 10}%` }} />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[12px] text-ink-3 tabular-nums">
        <span>9 AM</span>
        <span className="font-medium text-primary">Closed 7 PM →</span>
        <span>11 PM</span>
      </div>
    </div>
  );
}

function Snippet() {
  return (
    <div aria-hidden className="overflow-hidden rounded-[14px] border border-line bg-surface/70">
      <div className="flex items-center justify-between border-b border-line px-3.5 py-2 text-[12.5px] text-ink-3">
        <span>your-website.html</span>
        <span className="flex items-center gap-1 text-success">
          <Check size={13} /> Added
        </span>
      </div>
      <pre className="overflow-x-auto px-3.5 py-3 font-mono text-[12.5px] leading-relaxed text-ink-2">
        <code>
          <span className="text-ink-3">{"<"}</span>
          <span className="text-primary">script</span> src=<span className="text-success">&quot;…/widget.js&quot;</span>
          {"\n  "}data-reception=<span className="text-success">&quot;your-widget-token&quot;</span> async
          <span className="text-ink-3">{"></"}</span>
          <span className="text-primary">script</span>
          <span className="text-ink-3">{">"}</span>
        </code>
      </pre>
    </div>
  );
}

const CARDS = [
  { span: "md:col-span-2", visual: <Timeline />, title: "Everyone's day on one timeline", body: "Free times come from each person's own schedule. The system refuses two confirmed bookings in the same slot." },
  { span: "", visual: <Takeover />, title: "Take over in one tap", body: "Step into any chat. The AI goes quiet until you hand it back." },
  { span: "", visual: <Alerts />, title: "Alerts in plain words", body: "When a customer needs a person, you're told who and why." },
  { span: "", visual: <AfterHours />, title: "Answers after closing time", body: "Many customers message at night. They get an answer right away, not tomorrow. (Illustrative day.)" },
  { span: "", visual: <Snippet />, title: "One line on your website", body: "Paste it once and the chat appears on every page. We can do it for you." },
];

export function FeatureBento() {
  return (
    <section aria-labelledby="features-title" className="border-t border-line bg-surface">
      <div className="mx-auto max-w-[1120px] px-5 py-16 md:px-8 md:py-20">
        <Reveal className="grid gap-4 md:grid-cols-[1.2fr_1fr] md:items-end">
          <h2 id="features-title" className="font-display max-w-[16ch] text-[clamp(30px,4.2vw,48px)] leading-[1.04] font-semibold tracking-[-0.035em]">
            Everything your front desk does, made easier.
          </h2>
          <p className="max-w-[44ch] text-[17px] leading-relaxed text-ink-2 md:justify-self-end">
            Built for busy shops, not tech teams. If you can use Facebook Messenger, you can use Reception.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal key={c.title} delay={i * 50} className={cx("min-w-0", c.span)}>
              <article className="lift flex h-full min-w-0 flex-col rounded-[20px] border border-line bg-bg p-5 md:p-6">
                <div className="flex min-w-0 flex-1 flex-col justify-center">{c.visual}</div>
                <h3 className="mt-6 text-[18px] font-semibold tracking-[-0.015em]">{c.title}</h3>
                <p className="mt-1.5 text-[15.5px] leading-relaxed text-ink-2">{c.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
