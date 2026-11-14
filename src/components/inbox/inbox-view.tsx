"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowDownWideNarrow,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  Clock,
  Hand,
  Info,
  ListFilter,
  MessageSquare,
  MoreHorizontal,
  Paperclip,
  RotateCcw,
  Scissors,
  SendHorizontal,
  Sparkle,
  Tag,
  User,
  X,
  Zap,
} from "lucide-react";
import { Avatar, Badge, cx, EmptyState, statusLabel, statusTone } from "@/components/ui";
import { toast } from "@/components/toast";
import { RescheduleDialog } from "@/components/bookings/reschedule-dialog";
import { sendStaffReply, setAppointmentStatus, setConversationState } from "@/server/actions";

type Tag = "booking" | "ai_replied" | "new" | "resolved" | "replied" | "needs_reply";
interface Row { id: string; name: string; preview: string; ago: string; unread: boolean; tag: Tag; hasBooking: boolean }
interface Detail {
  id: string;
  status: "open" | "resolved";
  handledBy: "ai" | "human";
  unread: boolean;
  customer: { id: string; name: string };
  convCount: number;
  lastActive: string;
  messages: { id: string; sender: "customer" | "ai" | "staff" | "system"; body: string; simulated: boolean; time: string; day: string | null }[];
  bookings: { id: string; serviceId: string; service: string; staff: string; when: string; date: string; price: string; status: string }[];
}
type Filter = "all" | "new" | "booking" | "resolved";

export function InboxView({ list, detail, filter, query, mobileThread }: { list: Row[]; detail: Detail | null; filter: Filter; query: string; mobileThread: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sort, setSort] = useState<"recent" | "unread">("recent");
  const [showSearch, setShowSearch] = useState(!!query);

  const newCount = list.filter((c) => c.unread).length;
  let visible = list.filter((c) => (filter === "all" ? true : filter === "new" ? c.unread : filter === "booking" ? c.hasBooking : c.tag === "resolved"));
  if (sort === "unread") visible = [...visible].sort((a, b) => Number(b.unread) - Number(a.unread));
  const href = (p: { c?: string; f?: Filter; q?: string }) => {
    const s = new URLSearchParams();
    const f = p.f ?? filter;
    if (f !== "all") s.set("f", f);
    const qq = p.q ?? query;
    if (qq) s.set("q", qq);
    if (p.c) s.set("c", p.c);
    return `/app/inbox${s.size ? `?${s}` : ""}`;
  };

  // New widget messages arrive server-side; refresh the view every 10 s while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 10_000);
    return () => clearInterval(id);
  }, [router]);

  // Opening a conversation marks it read.
  useEffect(() => {
    if (detail?.unread) start(() => void setConversationState(detail.id, { unread: false }));
  }, [detail?.id, detail?.unread]);

  return (
    <div className="flex h-full min-h-0">
      <section aria-label="Conversations" className={cx("min-h-0 w-full shrink-0 flex-col border-r border-line bg-bg md:flex md:w-[340px] lg:w-[400px]", mobileThread ? "hidden" : "flex")}>
        <div className="flex items-center justify-between px-5 pt-6 pb-3">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[26px] leading-none font-semibold tracking-[-0.04em]">Inbox</h1>
            {newCount > 0 && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[13px] font-medium tabular-nums text-ink-2 tabular-nums">{newCount} new</span>}
          </div>
          <div className="flex items-center gap-0.5">
            <button aria-label="Search conversations" aria-pressed={showSearch} onClick={() => setShowSearch((s) => !s)} className={cx("press grid size-9 place-items-center rounded-full hover:bg-surface", showSearch ? "bg-surface-2 text-ink" : "text-ink-2")}>
              <ListFilter size={18} strokeWidth={1.75} />
            </button>
            <button
              aria-label={sort === "recent" ? "Sort: most recent. Switch to unread first" : "Sort: unread first. Switch to most recent"}
              onClick={() => setSort((s) => (s === "recent" ? "unread" : "recent"))}
              className={cx("press grid size-9 place-items-center rounded-full hover:bg-surface", sort === "unread" ? "bg-surface-2 text-ink" : "text-ink-2")}
            >
              <ArrowDownWideNarrow size={18} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        {showSearch && (
          <form
            className="mx-4 mb-3"
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get("q") as string;
              router.push(href({ q: v }));
            }}
          >
            <label htmlFor="inbox-q" className="sr-only">Search by customer name</label>
            <input id="inbox-q" name="q" defaultValue={query} autoFocus placeholder="Search by customer name" className="h-9 w-full rounded-full border border-line bg-surface px-4 text-[14.5px] outline-none transition-colors placeholder:text-ink-3 focus:border-line-strong focus:bg-bg" />
          </form>
        )}

        <div role="tablist" aria-label="Filter" className="mx-4 mb-2 flex items-center gap-1.5">
          {(
            [
              ["all", "All"],
              ["new", "New"],
              ["booking", "Booking"],
              ["resolved", "Resolved"],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              role="tab"
              aria-selected={filter === key}
              href={href({ f: key, c: detail?.id })}
              className={cx(
                "press flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14.5px]",
                filter === key ? "bg-primary font-medium text-primary-ink" : "text-ink-2 hover:bg-surface",
              )}
            >
              {label}
              {key === "new" && newCount > 0 && <span className={cx("rounded-full px-1.5 text-[12px] tabular-nums", filter === key ? "bg-bg/20" : "bg-surface-2 text-ink-3")}>{newCount}</span>}
            </Link>
          ))}
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {visible.length === 0 && (
            <li>
              <EmptyState
                icon={<MessageSquare size={20} />}
                title={query ? "No matches" : "Nothing here"}
                body={query ? `No conversations with a customer named “${query}”.` : "Conversations from your website chat will appear here."}
              />
            </li>
          )}
          {visible.map((c) => {
            const active = c.id === detail?.id;
            return (
              <li key={c.id}>
                <Link
                  href={href({ c: c.id })}
                  aria-current={active ? "true" : undefined}
                  className={cx("press relative grid w-full grid-cols-[auto_1fr_auto] items-start gap-x-3 rounded-2xl px-3 py-3 text-left", active ? "bg-surface-2" : "hover:bg-surface")}
                >
                  <span className="relative">
                    <Avatar name={c.name} />
                    {c.unread && <span className="absolute -top-0.5 -left-0.5 size-3 rounded-full border-2 border-bg bg-primary" aria-label="Unread" />}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className={cx("block truncate text-[15.5px]", c.unread ? "font-semibold" : "font-medium")}>{c.name}</span>
                    <span className="mt-0.5 line-clamp-2 text-[14px] leading-snug text-ink-3">{c.preview}</span>
                  </span>
                  <span className="flex h-full flex-col items-end justify-between gap-2 pt-0.5">
                    <span className="text-[12.5px] whitespace-nowrap text-ink-3">{c.ago}</span>
                    <TagChip tag={c.tag} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {detail ? (
        <Thread detail={detail} mobileHidden={!mobileThread} backHref={href({})} busy={pending} />
      ) : (
        <div className="hidden flex-1 md:block">
          <EmptyState icon={<MessageSquare size={20} />} title="No conversation selected" body="Pick a conversation from the list." />
        </div>
      )}
    </div>
  );
}

function Thread({ detail, mobileHidden, backHref, busy }: { detail: Detail; mobileHidden: boolean; backHref: string; busy: boolean }) {
  const [draft, setDraft] = useState("");
  const [sending, startSend] = useTransition();
  const [working, startWork] = useTransition();
  const [menu, setMenu] = useState(false);
  const [resched, setResched] = useState<Detail["bookings"][number] | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const aiOn = detail.handledBy === "ai";
  const booking = detail.bookings.at(-1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [detail.messages.length]);

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>, okText?: string) =>
    startWork(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Something went wrong.");
      else if (okText) toast.ok(okText);
      setMenu(false);
    });

  return (
    <section aria-label={`Conversation with ${detail.customer.name}`} className={cx("thread-anim min-h-0 min-w-0 flex-1 flex-col md:flex", mobileHidden ? "hidden" : "flex")}>
      <header className="material sticky top-0 z-10 flex shrink-0 items-center gap-3 border-b border-line px-3 py-2.5 md:px-5">
        <Link href={backHref} className="press -ml-0.5 grid size-9 place-items-center rounded-full text-ink-2 hover:bg-surface md:hidden" aria-label="Back to conversations">
          <ChevronLeft size={20} />
        </Link>
        <Avatar name={detail.customer.name} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15.5px] leading-tight font-semibold tracking-[-0.015em]">{detail.customer.name}</h2>
          <p className="truncate text-[13px] text-ink-3">
            {detail.convCount} conversation{detail.convCount === 1 ? "" : "s"} · Last active {detail.lastActive}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={`/app/customers?id=${detail.customer.id}`} aria-label="Customer details" className="press hidden size-9 place-items-center rounded-full border border-line text-ink-2 hover:bg-surface hover:text-ink sm:grid">
            <User size={17} strokeWidth={1.75} />
          </Link>
          <Link href={booking ? `/app/bookings?date=${booking.date}` : "/app/bookings"} aria-label="Open in bookings calendar" className="press hidden size-9 place-items-center rounded-full border border-line text-ink-2 hover:bg-surface hover:text-ink sm:grid">
            <CalendarDays size={17} strokeWidth={1.75} />
          </Link>
          <div className="relative">
            <button aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="press grid size-9 place-items-center rounded-full border border-line text-ink-2 hover:bg-surface hover:text-ink">
              <MoreHorizontal size={17} strokeWidth={1.75} />
            </button>
            {menu && (
              <div className="pop menu-anim absolute right-0 z-20 mt-2 w-[236px] overflow-hidden py-1">
                <MenuItem icon={<Hand size={16} />} onClick={() => act(() => setConversationState(detail.id, { handledBy: aiOn ? "human" : "ai" }), aiOn ? "You took over. AI replies are paused." : "Handed back to AI.")}>
                  {aiOn ? "Take over from AI" : "Hand back to AI"}
                </MenuItem>
                <MenuItem
                  icon={detail.status === "open" ? <Check size={16} /> : <RotateCcw size={16} />}
                  onClick={() => act(() => setConversationState(detail.id, { status: detail.status === "open" ? "resolved" : "open" }), detail.status === "open" ? "Conversation resolved." : "Conversation reopened.")}
                >
                  {detail.status === "open" ? "Mark as resolved" : "Reopen conversation"}
                </MenuItem>
                <MenuItem icon={<MessageSquare size={16} />} onClick={() => act(() => setConversationState(detail.id, { unread: true }))}>
                  Mark as unread
                </MenuItem>
                <Link href={`/app/customers?id=${detail.customer.id}`} className="flex items-center gap-2.5 px-4 py-2 text-[15px] hover:bg-surface sm:hidden">
                  <User size={16} /> Customer details
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-6" aria-busy={busy}>
        {detail.status === "resolved" && (
          <p className="mb-3 flex w-fit items-center gap-2 rounded-full bg-surface px-3.5 py-1.5 text-[13.5px] text-ink-3">
            <Check size={14} /> Resolved. Sending a reply reopens it.
          </p>
        )}
        <ol className="space-y-3">
          {detail.messages.map((m) => (
            <MessageRow key={m.id} m={m} name={detail.customer.name} />
          ))}
        </ol>

        {booking && (
          <div className="mt-3 flex gap-3">
            <span className="mt-1 grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent" aria-hidden>
              <Sparkle size={16} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 md:max-w-[720px]">
              <article className="overflow-hidden rounded-2xl border border-line bg-bg">
                <header className="flex items-center gap-2.5 border-b border-line bg-surface px-4 py-2.5">
                  <CalendarDays size={17} strokeWidth={1.75} aria-hidden />
                  <h3 className="flex-1 text-[15px] font-semibold">Appointment request</h3>
                  <Badge tone={statusTone(booking.status)}>{statusLabel[booking.status]}</Badge>
                </header>
                <dl className="space-y-1.5 px-4 py-3 text-[14.5px]">
                  <Row icon={<Scissors size={15} strokeWidth={1.6} />} label="Service">{booking.service} <span className="text-ink-3">· {booking.staff}</span></Row>
                  <Row icon={<Clock size={15} strokeWidth={1.6} />} label="Time">{booking.when}</Row>
                  <Row icon={<Tag size={15} strokeWidth={1.6} />} label="Price">{booking.price}</Row>
                </dl>
                <p className="flex items-center gap-2 border-t border-line px-4 py-2.5 text-[13.5px] text-ink-3">
                  <Info size={15} strokeWidth={1.6} aria-hidden />
                  {booking.status === "pending"
                    ? "Awaiting staff approval. The customer will be notified once confirmed."
                    : booking.status === "confirmed"
                      ? "Confirmed. It's on the bookings calendar."
                      : `This request is ${statusLabel[booking.status].toLowerCase()}.`}
                </p>
              </article>
              {booking.status === "pending" && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    disabled={working}
                    onClick={() => act(() => setAppointmentStatus(booking.id, "confirmed"), "Booking confirmed and added to the calendar.")}
                    className="press flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[14.5px] font-medium text-primary-ink transition-colors hover:bg-primary-hover disabled:opacity-50"
                  >
                    <Check size={16} /> Approve &amp; confirm
                  </button>
                  <button
                    disabled={working}
                    onClick={() => act(() => setAppointmentStatus(booking.id, "declined"), "Request declined.")}
                    className="press flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-[14.5px] transition-colors hover:bg-surface disabled:opacity-50"
                  >
                    <X size={16} /> Decline
                  </button>
                  <button onClick={() => setResched(booking)} className="press flex h-9 items-center gap-1.5 rounded-full border border-line-strong px-4 text-[14.5px] transition-colors hover:bg-surface">
                    <CalendarDays size={16} strokeWidth={1.75} /> Reschedule
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!aiOn && (
        <p className="mx-4 mb-1.5 flex items-center gap-1.5 text-[13px] text-ink-3 md:mx-6">
          <Hand size={13} aria-hidden /> You&apos;re handling this conversation. AI replies are paused.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body) return;
          startSend(async () => {
            const r = await sendStaffReply(detail.id, body);
            if (r.ok) setDraft("");
            else toast.error(r.error);
          });
        }}
        className="mx-3 mb-3 flex items-center gap-1 rounded-[24px] border border-line bg-bg p-1.5 pl-2 transition-[border-color,box-shadow] focus-within:border-line-strong focus-within:shadow-[var(--shadow-sm)] md:mx-5 md:mb-4"
      >
        <button type="button" aria-label="Attach file (coming soon)" title="Attachments are coming soon" disabled className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3/60">
          <Paperclip size={17} strokeWidth={1.75} />
        </button>
        <label htmlFor="composer" className="sr-only">Message {detail.customer.name}</label>
        <input
          id="composer"
          value={draft}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${detail.customer.name}...`}
          className="h-9 min-w-0 flex-1 bg-transparent px-2 text-[15.5px] outline-none placeholder:text-ink-3"
        />
        <button
          type="button"
          aria-pressed={aiOn}
          title={aiOn ? "AI answers this conversation. Click to take over." : "You're handling this. Click to hand back to AI."}
          onClick={() => act(() => setConversationState(detail.id, { handledBy: aiOn ? "human" : "ai" }), aiOn ? "You took over. AI replies are paused." : "Handed back to AI.")}
          className={cx("press flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-[13.5px] font-medium transition-colors", aiOn ? "bg-accent-soft text-accent" : "bg-surface text-ink-3")}
        >
          <Zap size={14} strokeWidth={2} /> AI {aiOn ? "on" : "off"}
        </button>
        <button type="submit" disabled={sending || !draft.trim()} aria-label="Send message" className="press grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-ink transition-colors hover:bg-primary-hover disabled:opacity-40">
          <SendHorizontal size={17} />
        </button>
      </form>
      {resched && <RescheduleDialog appointment={{ id: resched.id, serviceId: resched.serviceId, date: resched.date, label: `${resched.service} for ${detail.customer.name}` }} onClose={() => setResched(null)} />}
    </section>
  );
}

function MenuItem({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14.5px] hover:bg-surface">
      <span className="text-ink-3">{icon}</span> {children}
    </button>
  );
}

function MessageRow({ m, name }: { m: Detail["messages"][number]; name: string }) {
  return (
    <>
      {m.day && (
        <li className="flex justify-center py-2" aria-hidden>
          <span className="rounded-full bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-3">{m.day}</span>
        </li>
      )}
      {m.sender === "system" ? (
        <li className="py-1 text-center text-[12.5px] text-ink-3">{m.body} · {m.time}</li>
      ) : m.sender === "customer" ? (
        <li className="flex gap-2.5">
          <Avatar name={name} size="sm" />
          <div className="min-w-0">
            <p className="inline-block rounded-[18px] rounded-bl-[6px] bg-surface px-3.5 py-2 text-[15.5px] leading-relaxed break-words whitespace-pre-wrap">{m.body}</p>
            <p className="mt-1 pl-1 text-[12px] text-ink-3">{m.time}</p>
          </div>
        </li>
      ) : (
        <li className="flex flex-col items-end">
          <div
            className={cx(
              "flex max-w-[520px] gap-2.5 rounded-[18px] rounded-br-[6px] px-3.5 py-2.5 text-[15.5px] leading-relaxed",
              m.sender === "ai" ? "bg-surface" : "bg-primary text-primary-ink",
            )}
          >
            <span className={cx("mt-0.5 shrink-0", m.sender === "ai" ? "text-accent" : "text-primary-ink/70")} aria-hidden>
              {m.sender === "ai" ? <Sparkle size={16} strokeWidth={1.8} /> : <User size={16} strokeWidth={1.8} />}
            </span>
            <p className="min-w-0 break-words whitespace-pre-wrap">
              <span className="sr-only">{m.sender === "ai" ? "AI reply: " : "Staff reply: "}</span>
              {m.body}
            </p>
          </div>
          <p className="mt-1 flex items-center gap-1.5 pr-1 text-[12px] text-ink-3">
            {m.sender === "staff" && <span>Staff ·</span>}
            {m.simulated && <span title="Produced by the FAQ matcher, not a language model">FAQ match ·</span>}
            {m.time} <CheckCheck size={13} strokeWidth={1.75} aria-hidden />
          </p>
        </li>
      )}
    </>
  );
}

function TagChip({ tag }: { tag: Tag }) {
  const base = "flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap";
  if (tag === "booking") return <span className={cx(base, "bg-accent-soft text-accent")}><CalendarDays size={11} strokeWidth={2} /> Booking</span>;
  if (tag === "ai_replied") return <span className={cx(base, "bg-surface-2 text-ink-2")}><Sparkle size={11} strokeWidth={2} /> AI</span>;
  if (tag === "new") return <span className={cx(base, "bg-accent-soft text-accent")}><span className="size-1.5 rounded-full bg-primary" /> New</span>;
  if (tag === "needs_reply") return <span className={cx(base, "bg-warn-soft text-warn-ink")}><Hand size={11} strokeWidth={2} /> Reply</span>;
  if (tag === "replied") return <span className={cx(base, "bg-surface-2 text-ink-2")}><User size={11} strokeWidth={2} /> Replied</span>;
  return <span className={cx(base, "bg-surface-2 text-ink-3")}><Check size={11} strokeWidth={2.2} /> Resolved</span>;
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <dt className="text-ink-3">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
