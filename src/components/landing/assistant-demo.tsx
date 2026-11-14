"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Hand, Sparkle } from "lucide-react";
import { cx } from "@/components/ui";

interface Msg {
  id: number;
  from: "you" | "ai";
  text: string;
  note?: string;
  kind?: "answer" | "booking" | "handoff";
}

const SUGGESTIONS = [
  {
    label: "Is 2 PM free tomorrow?",
    answer: "Yes — 2:00 PM tomorrow is open for a Cleaning with Maria, 60 minutes, ₱800. Shall I request it?",
    kind: "booking" as const,
    note: "Checked real availability",
  },
  {
    label: "How much is whitening?",
    answer: "Whitening is ₱2,500 for a 60 minute session. I can request a slot whenever you're ready.",
    kind: "answer" as const,
    note: "From your services list",
  },
  {
    label: "Is it safe while pregnant?",
    answer: "I don't have that information, so I'm passing you to the team. Maria will reply here shortly.",
    kind: "handoff" as const,
    note: "Handed to staff",
  },
  {
    label: "Where are you located?",
    answer: "We're at 12 Katipunan Avenue, Quezon City. Open Tuesday to Saturday, 10 AM to 7 PM.",
    kind: "answer" as const,
    note: "From your knowledge base",
  },
];

let nextId = 1;

export function AssistantDemo() {
  const [conv, setConv] = useState<Msg[]>([
    {
      id: 0,
      from: "ai",
      text: "Hi! I'm the receptionist at Glow Studio. Ask me about services, prices or free times.",
    },
  ]);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [conv, busy]);

  function ask(s: (typeof SUGGESTIONS)[number]) {
    if (busy) return;
    setBusy(true);
    setConv((c) => [...c, { id: nextId++, from: "you", text: s.label }]);
    timer.current = window.setTimeout(() => {
      setConv((c) => [...c, { id: nextId++, from: "ai", text: s.answer, note: s.note, kind: s.kind }]);
      setBusy(false);
    }, 640);
  }

  return (
    <div className="mx-auto w-full max-w-[520px] text-left">
      <div className="overflow-hidden rounded-[22px] border border-line bg-bg-elevated shadow-[var(--shadow-float)]">
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span className="grid size-9 place-items-center rounded-full bg-avatar text-[13px] font-semibold" aria-hidden>
            GS
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] leading-tight font-semibold">Glow Studio</p>
            <p className="text-[13px] text-ink-3">Website chat</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-[13px] leading-none font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden /> AI on
          </span>
        </header>

        <div className="h-[280px] space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          {conv.map((m) =>
            m.from === "you" ? (
              <p key={m.id} className="bubble-anim ml-auto w-fit max-w-[86%] rounded-[18px] rounded-br-[6px] bg-primary px-4 py-2.5 text-[15.5px] leading-relaxed text-primary-ink">
                {m.text}
              </p>
            ) : (
              <div key={m.id} className="bubble-anim flex gap-2">
                <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-primary" aria-hidden>
                  {m.kind === "handoff" ? <Hand size={12} strokeWidth={2} /> : <Sparkle size={12} strokeWidth={2} />}
                </span>
                <div className="min-w-0">
                  <p
                    className={cx(
                      "w-fit rounded-[18px] rounded-bl-[6px] px-4 py-2.5 text-[15.5px] leading-relaxed",
                      m.kind === "handoff" ? "border border-dashed border-field-line bg-bg" : "bg-surface-2",
                    )}
                  >
                    {m.text}
                  </p>
                  {m.note && (
                    <p
                      className={cx(
                        "mt-1.5 flex items-center gap-1.5 text-[13px]",
                        m.kind === "handoff" ? "text-warn-ink" : "text-ink-3",
                      )}
                    >
                      {m.kind === "handoff" ? <Hand size={12} aria-hidden /> : <Check size={12} className="text-primary" aria-hidden />}
                      {m.note}
                    </p>
                  )}
                  {m.kind === "booking" && (
                    <span className="mt-2 flex w-fit items-center gap-1.5 rounded-full border border-warn-line bg-warn-soft px-3 py-1.5 text-[13px] leading-none font-medium text-warn-ink">
                      <CalendarDays size={13} aria-hidden /> Appointment request · Pending
                    </span>
                  )}
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex items-center gap-1.5 pl-10" role="status" aria-label="Assistant is replying">
              <span className="typing-dot size-1.5 rounded-full bg-ink-3" />
              <span className="typing-dot size-1.5 rounded-full bg-ink-3" style={{ animationDelay: "160ms" }} />
              <span className="typing-dot size-1.5 rounded-full bg-ink-3" style={{ animationDelay: "320ms" }} />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line px-4 py-4">
          <p className="mb-2.5 text-[14px] font-medium text-ink-2">Tap a question to try it</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => ask(s)}
                disabled={busy}
                className="press min-h-10 rounded-full border border-line-strong bg-bg px-4 py-2 text-[15px] text-ink hover:border-primary hover:bg-accent-soft hover:text-primary disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-4 flex max-w-[42ch] items-start justify-center gap-1.5 text-center text-[14px] leading-relaxed text-ink-3">
        <ArrowUpRight size={14} className="mt-0.5 shrink-0" aria-hidden />
        Scripted preview. Real replies come from your services, hours and FAQs.
      </p>
    </div>
  );
}
