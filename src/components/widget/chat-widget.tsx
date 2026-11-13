"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, Hand, Loader2, SendHorizontal, Sparkle, X } from "lucide-react";
import { cx } from "@/lib/cx";
import { widgetResume, widgetSend, type WidgetMessage } from "@/server/widget-actions";

interface Props { token: string; businessName: string; greeting: string; bookingUrl: string; aiMode: "model" | "faq"; aiEnabled: boolean }

const store = {
  get(k: string) {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  set(k: string, v: string) {
    try { localStorage.setItem(k, v); } catch { /* private mode */ }
  },
};

export function ChatWidget(p: Props) {
  const key = `reception:conv:${p.token}`;
  const [conv, setConv] = useState<string | null>(null);
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const [handledBy, setHandledBy] = useState<"ai" | "human">("ai");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, start] = useTransition();
  const [pendingText, setPendingText] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Resume the visitor's thread, then poll for staff replies.
  useEffect(() => {
    let live = true;
    const tick = async () => {
      const r = await widgetResume(p.token, store.get(key));
      if (!live || !r.ok) return;
      setMessages(r.data.messages);
      setHandledBy(r.data.handledBy);
      setConv(r.data.convToken);
    };
    tick();
    const id = setInterval(tick, 8000);
    return () => {
      live = false;
      clearInterval(id);
    };
  }, [p.token, key]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, pendingText]);

  const send = () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setError(null);
    setPendingText(text);
    start(async () => {
      const r = await widgetSend(p.token, conv, text);
      setPendingText(null);
      if (!r.ok) {
        setError(r.error);
        setDraft(text);
        return;
      }
      store.set(key, r.data.convToken);
      setConv(r.data.convToken);
      setMessages(r.data.messages);
      setHandledBy(r.data.handledBy);
    });
  };

  return (
    <div className="flex h-dvh flex-col bg-bg text-ink">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-accent-soft text-accent-strong" aria-hidden>
          <Sparkle size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{p.businessName}</p>
          <p className="text-[12px] text-muted">{handledBy === "human" ? "A team member will reply here" : "Usually replies instantly"}</p>
        </div>
        <button aria-label="Close chat" onClick={() => window.parent.postMessage({ reception: "close" }, "*")} className="grid size-8 place-items-center rounded-md hover:bg-surface">
          <X size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        <ol className="space-y-3">
          <Bubble sender="ai" body={p.greeting} />
          {messages.map((m) =>
            m.sender === "system" ? (
              <li key={m.id} className="text-center text-[12px] text-muted">{m.body}</li>
            ) : (
              <Bubble key={m.id} sender={m.sender} body={m.body} time={m.time} note={m.simulated ? "Automated answer from the business's FAQ" : undefined} />
            ),
          )}
          {pendingText && <Bubble sender="customer" body={pendingText} />}
          {sending && (
            <li className="flex items-center gap-2 text-[13px] text-muted">
              <Loader2 size={14} className="animate-spin" /> Typing…
            </li>
          )}
        </ol>
        {handledBy === "human" && messages.length > 0 && (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-[12px] text-muted">
            <Hand size={13} /> You&apos;re chatting with the {p.businessName} team
          </p>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-line px-3 pt-2 pb-3">
        <a href={p.bookingUrl} target="_blank" rel="noopener" className="mb-2 flex items-center justify-center gap-1.5 rounded-md border border-line py-1.5 text-[13px] hover:bg-surface">
          <CalendarDays size={14} /> Book an appointment online
        </a>
        {error && <p role="alert" className="mb-2 text-[12.5px] text-[#8a3324]">{error}</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex items-center gap-2 rounded-lg border border-line px-2 focus-within:border-accent"
        >
          <label htmlFor="w-input" className="sr-only">Message</label>
          <input id="w-input" value={draft} maxLength={1000} onChange={(e) => setDraft(e.target.value)} placeholder="Type your message…" className="h-11 min-w-0 flex-1 bg-transparent px-1 text-[15px] outline-none placeholder:text-muted" />
          <button type="submit" disabled={!draft.trim() || sending} aria-label="Send" className="grid size-9 place-items-center rounded-md bg-accent-strong text-white disabled:opacity-50">
            <SendHorizontal size={17} />
          </button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted">
          {!p.aiEnabled ? "Replies come from our team." : p.aiMode === "faq" ? "Automated answers use this business's FAQ." : "AI replies use only this business's approved info."} Don&apos;t share sensitive health details.
        </p>
      </div>
    </div>
  );
}

function Bubble({ sender, body, time, note }: { sender: "customer" | "ai" | "staff"; body: string; time?: string; note?: string }) {
  const mine = sender === "customer";
  return (
    <li className={cx("flex flex-col", mine ? "items-end" : "items-start")}>
      <p className={cx("max-w-[85%] rounded-xl px-3.5 py-2 text-[14.5px] leading-snug break-words whitespace-pre-wrap", mine ? "rounded-tr-md bg-accent-strong text-white" : "rounded-tl-md bg-surface")}>
        <span className="sr-only">{mine ? "You: " : sender === "staff" ? "Staff: " : "Assistant: "}</span>
        {body}
      </p>
      {(time || note) && (
        <span className="mt-1 px-1 text-[11px] text-muted">
          {sender === "staff" ? "Team · " : ""}
          {time}
          {note ? ` · ${note}` : ""}
        </span>
      )}
    </li>
  );
}
