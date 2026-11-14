"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CalendarClock, Check, MessageSquare, Sparkle, X, Zap } from "lucide-react";
import { cx } from "@/components/ui";

interface Props {
  counts: { unread: number; pending: number; aiMessages: number; unreadNotifications: number };
  aiLimit: number;
}

/**
 * A status assistant, not a chatbot. Every line here is a real count that
 * links to the screen where the work happens — nothing is invented.
 */
export function FloatingAssistant({ counts, aiLimit }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const attention = counts.unread + counts.pending;
  const pct = aiLimit ? Math.min(100, (counts.aiMessages / aiLimit) * 100) : 0;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="fixed right-4 bottom-[calc(58px+12px+env(safe-area-inset-bottom))] z-40 lg:right-6 lg:bottom-6"
    >
      {open && (
        <div
          id="assistant-panel"
          role="dialog"
          aria-label="Reception assistant"
          className="assist-anim pop absolute right-0 bottom-full mb-3 w-[348px] max-w-[calc(100vw-32px)] overflow-hidden"
        >
          <header className="flex items-start gap-3 border-b border-line px-4 py-3.5">
            <span className="relative mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
              <Sparkle size={16} strokeWidth={1.9} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] leading-tight font-semibold tracking-[-0.01em]">Assistant</p>
              <p className="mt-0.5 text-[13px] text-ink-3">
                {attention > 0 ? `${attention} thing${attention === 1 ? "" : "s"} need${attention === 1 ? "s" : ""} you` : "Watching the queue"}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="press -mt-1 -mr-1 grid size-8 place-items-center rounded-full text-ink-3 hover:bg-surface hover:text-ink"
            >
              <X size={15} />
            </button>
          </header>

          <div className="px-2 py-2">
            <p className="px-2 pt-1 pb-1.5 text-[13px] font-medium text-ink-3">Needs a person</p>
            <Row
              href="/app/inbox?f=new"
              icon={<MessageSquare size={16} strokeWidth={1.8} />}
              label="Unread conversations"
              count={counts.unread}
              onClick={() => setOpen(false)}
            />
            <Row
              href="/app/bookings"
              icon={<CalendarClock size={16} strokeWidth={1.8} />}
              label="Booking requests"
              count={counts.pending}
              onClick={() => setOpen(false)}
            />
            {attention === 0 && (
              <p className="mx-2 my-1 flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-[13.5px] leading-relaxed text-ink-3">
                <Check size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
                Nothing is waiting. The AI is answering from your approved answers and will hand over anything it can&apos;t.
              </p>
            )}
          </div>

          <div className="border-t border-line px-4 py-3">
            <div className="flex items-baseline justify-between text-[12.5px]">
              <span className="font-medium text-ink-2">AI messages this month</span>
              <span className="text-ink-3 tabular-nums">
                {counts.aiMessages.toLocaleString()} / {aiLimit.toLocaleString()}
              </span>
            </div>
            <div
              className="mt-2 h-1 overflow-hidden rounded-full bg-track"
              role="progressbar"
              aria-valuenow={counts.aiMessages}
              aria-valuemax={aiLimit}
              aria-label="AI messages used this month"
            >
              <div className="h-full rounded-full bg-accent transition-[width] duration-700 ease-[var(--ease-out)]" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Link
                href="/app/settings?tab=usage"
                onClick={() => setOpen(false)}
                className="press inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink"
              >
                <Zap size={12} strokeWidth={2} aria-hidden /> Usage &amp; plan
              </Link>
              <Link
                href="/app/knowledge"
                onClick={() => setOpen(false)}
                className="press inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"
              >
                What it knows <ArrowUpRight size={12} aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="assistant-panel"
        className={cx(
          "press group flex h-11 items-center gap-2.5 rounded-full border border-line bg-bg-elevated pr-3.5 pl-3 shadow-[var(--shadow-pop)]",
          open ? "text-ink" : "text-ink-2 hover:text-ink",
        )}
      >
        <span className="relative grid size-6 place-items-center">
          <span className="assist-dot absolute inset-0 rounded-full bg-accent-soft" aria-hidden />
          <Sparkle size={15} strokeWidth={2} className="relative text-accent" aria-hidden />
        </span>
        <span className="text-[14.5px] font-medium">Assist</span>
        {attention > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[12px] font-semibold tabular-nums text-primary-ink tabular-nums">
            {attention}
          </span>
        )}
      </button>
    </div>
  );
}

function Row({
  href,
  icon,
  label,
  count,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  const idle = count === 0;
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cx(
        "press flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-[14.5px]",
        idle ? "text-ink-3" : "text-ink hover:bg-surface",
      )}
    >
      <span className={cx("shrink-0", idle ? "text-line-strong" : "text-ink-3")} aria-hidden>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      <span className={cx("text-[13px] tabular-nums", idle ? "text-ink-3" : "font-semibold text-ink")}>
        {count}
      </span>
      <ArrowUpRight size={13} className="shrink-0 text-line-strong" aria-hidden />
    </Link>
  );
}
