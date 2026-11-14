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
    <div className="mx-auto w-full max-w-[460px] text-left">
      <div className="overflow-hidden rounded-[22px] border border-line bg-bg-elevated shadow-[var(--shadow-float)]">
        <header className="flex items-center gap-2.5 border-b border-line px-3.5 py-2.5">
          <span className="grid size-7 place-items-center rounded-full bg-avatar text-[10px] font-semibold" aria-hidden>
            GS
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] leading-tight font-semibold">Glow Studio</p>
            <p className="text-[10.5px] text-muted">Website chat</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden /> AI on
          </span>
        </header>

        <div className="h-[228px] space-y-2.5 overflow-y-auto px-3.5 py-3.5" aria-live="polite">
          {conv.map((m) =>
            m.from === "you" ? (
              <p key={m.id} className="bubble-anim ml-auto w-fit max-w-[86%] rounded-[14px] rounded-br-[4px] bg-surface px-3 py-2 text-[12.5px] leading-relaxed">
                {m.text}
              </p>
            ) : (
              <div key={m.id} className="bubble-anim flex gap-2">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
                  {m.kind === "handoff" ? <Hand size={12} strokeWidth={2} /> : <Sparkle size={12} strokeWidth={2} />}
                </span>
                <div className="min-w-0">
                  <p
                    className={cx(
                      "w-fit rounded-[14px] rounded-bl-[4px] border px-3 py-2 text-[12.5px] leading-relaxed",
                      m.kind === "handoff" ? "border-dashed border-line-strong bg-bg" : "border-line bg-bg",
                    )}
                  >
                    {m.text}
                  </p>
                  {m.note && (
                    <p
                      className={cx(
                        "mt-1 flex items-center gap-1 text-[10.5px]",
                        m.kind === "handoff" ? "text-warn-ink" : "text-muted",
                      )}
                    >
                      {m.kind === "handoff" ? <Hand size={10} aria-hidden /> : <Check size={10} className="text-accent" aria-hidden />}
                      {m.note}
                    </p>
                  )}
                  {m.kind === "booking" && (
                    <span className="mt-1.5 flex w-fit items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1 text-[10.5px] font-medium">
                      <CalendarDays size={10} aria-hidden /> Appointment request · Pending
                    </span>
                  )}
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex items-center gap-1.5 pl-8" aria-label="Assistant is replying">
              <span className="typing-dot size-1.5 rounded-full bg-muted" />
              <span className="typing-dot size-1.5 rounded-full bg-muted" style={{ animationDelay: "160ms" }} />
              <span className="typing-dot size-1.5 rounded-full bg-muted" style={{ animationDelay: "320ms" }} />
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line px-3.5 py-3">
          <p className="mb-2 text-[10.5px] font-semibold tracking-[0.08em] text-muted uppercase">Try one</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => ask(s)}
                disabled={busy}
                className="press rounded-full border border-line bg-bg px-2.5 py-1 text-[11.5px] text-ink-2 hover:border-line-strong hover:bg-surface hover:text-ink disabled:opacity-50"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mx-auto mt-3 flex max-w-[38ch] items-start justify-center gap-1.5 text-center text-[11.5px] leading-relaxed text-muted">
        <ArrowUpRight size={12} className="mt-0.5 shrink-0" aria-hidden />
        Scripted preview. Real replies come from your services, hours and FAQs.
      </p>
    </div>
  );
}
