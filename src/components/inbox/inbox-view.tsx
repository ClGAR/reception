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
      <section aria-label="Conversations" className={cx("min-h-0 w-full shrink-0 flex-col border-r border-line md:flex md:w-[340px] lg:w-[408px]", mobileThread ? "hidden" : "flex")}>
        <div className="flex items-center justify-between px-6 pt-7 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Inbox</h1>
            {newCount > 0 && <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[13px] font-medium text-accent-strong">{newCount} new</span>}
          </div>
          <div className="flex items-center gap-1">
            <button aria-label="Search conversations" aria-pressed={showSearch} onClick={() => setShowSearch((s) => !s)} className={cx("grid size-9 place-items-center rounded-md hover:bg-surface", showSearch && "bg-surface")}>
              <ListFilter size={19} strokeWidth={1.75} />
            </button>
            <button
              aria-label={sort === "recent" ? "Sort: most recent. Switch to unread first" : "Sort: unread first. Switch to most recent"}
              onClick={() => setSort((s) => (s === "recent" ? "unread" : "recent"))}
              className={cx("grid size-9 place-items-center rounded-md hover:bg-surface", sort === "unread" && "bg-surface")}
            >
              <ArrowDownWideNarrow size={19} strokeWidth={1.75} />
            </button>
          </div>
        </div>
        {showSearch && (
          <form
            className="mx-6 mb-3"
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get("q") as string;
              router.push(href({ q: v }));
            }}
          >
            <label htmlFor="inbox-q" className="sr-only">Search by customer name</label>
            <input id="inbox-q" name="q" defaultValue={query} autoFocus placeholder="Search by customer name" className="h-9 w-full rounded-md border border-line bg-bg px-3 text-[14px] outline-none focus:border-accent" />
          </form>
        )}

        <div role="tablist" aria-label="Filter" className="mx-6 flex items-center gap-1 border-b border-line pb-3">
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
              className={cx("flex items-center gap-2 rounded-md px-3.5 py-1.5 text-[15px] transition-colors", filter === key ? "bg-surface-2 font-medium" : "hover:bg-surface")}
            >
              {label}
              {key === "new" && newCount > 0 && <span className="rounded bg-surface-2 px-1.5 text-[12px] text-muted">{newCount}</span>}
            </Link>
          ))}
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pt-2">
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
              <li key={c.id} className="border-b border-line last:border-0">
                <Link
                  href={href({ c: c.id })}
                  aria-current={active ? "true" : undefined}
                  className={cx("relative grid w-full grid-cols-[auto_1fr_auto] items-start gap-x-4 rounded-lg py-4 pr-3 pl-7 text-left transition-colors", active ? "bg-surface-2" : "hover:bg-surface")}
                >
                  {c.unread && <span className="absolute top-1/2 left-2.5 size-2 -translate-y-1/2 rounded-full bg-live" aria-label="Unread" />}
                  <Avatar name={c.name} />
                  <span className="min-w-0 pt-0.5">
                    <span className="block truncate text-[16.5px] font-semibold">{c.name}</span>
                    <span className="mt-1 line-clamp-2 text-[15px] leading-snug text-ink/80">{c.preview}</span>
                  </span>
                  <span className="flex h-full flex-col items-end justify-between gap-2 pt-0.5">
                    <span className="text-[14px] whitespace-nowrap text-muted">{c.ago}</span>
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
    <section aria-label={`Conversation with ${detail.customer.name}`} className={cx("min-h-0 min-w-0 flex-1 flex-col md:flex", mobileHidden ? "hidden" : "flex")}>
      <header className="flex items-center gap-4 border-b border-line px-4 py-4 md:px-7">
        <Link href={backHref} className="-ml-1 rounded-md p-1 md:hidden" aria-label="Back to conversations">
          <ChevronLeft size={22} />
        </Link>
        <Avatar name={detail.customer.name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[22px] font-semibold tracking-[-0.01em]">{detail.customer.name}</h2>
          <p className="truncate text-[14px] text-muted">
            Customer · {detail.convCount} conversation{detail.convCount === 1 ? "" : "s"} · Last active {detail.lastActive}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/app/customers?id=${detail.customer.id}`} aria-label="Customer details" className="hidden size-[46px] place-items-center rounded-md border border-line hover:bg-surface sm:grid">
            <User size={19} strokeWidth={1.75} />
          </Link>
          <Link href={booking ? `/app/bookings?date=${booking.date}` : "/app/bookings"} aria-label="Open in bookings calendar" className="hidden size-[46px] place-items-center rounded-md border border-line hover:bg-surface sm:grid">
            <CalendarDays size={19} strokeWidth={1.75} />
          </Link>
          <div className="relative">
            <button aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="grid size-[46px] place-items-center rounded-md border border-line hover:bg-surface">
              <MoreHorizontal size={19} strokeWidth={1.75} />
            </button>
            {menu && (
              <div className="menu-anim absolute right-0 z-20 mt-2 w-[230px] rounded-lg border border-line bg-bg py-1 shadow-[0_12px_40px_-12px_rgba(33,40,38,0.25)]">
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
                <Link href={`/app/customers?id=${detail.customer.id}`} className="flex items-center gap-2.5 px-4 py-2 text-[14px] hover:bg-surface sm:hidden">
                  <User size={16} /> Customer details
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-3 md:px-7" aria-busy={busy}>
        {detail.status === "resolved" && (
          <p className="mb-3 flex items-center gap-2 rounded-md bg-surface px-3 py-2 text-[13.5px] text-muted">
            <Check size={15} /> Resolved. Sending a reply reopens it.
          </p>
        )}
        <ol className="space-y-3">
          {detail.messages.map((m) => (
            <MessageRow key={m.id} m={m} name={detail.customer.name} />
          ))}
        </ol>

        {booking && (
          <div className="mt-3 flex gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-accent" aria-hidden>
              <Sparkle size={18} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 md:max-w-[732px]">
              <article className="overflow-hidden rounded-lg border border-line bg-bg">
                <header className="flex items-center gap-3 bg-surface px-5 py-2.5">
                  <CalendarDays size={20} strokeWidth={1.75} aria-hidden />
                  <h3 className="flex-1 text-[17px] font-semibold">Appointment request</h3>
                  <Badge tone={statusTone(booking.status)}>{statusLabel[booking.status]}</Badge>
                </header>
                <dl className="space-y-1.5 px-6 py-2.5 text-[15px]">
                  <Row icon={<Scissors size={17} strokeWidth={1.6} />} label="Service">{booking.service} <span className="text-muted">· {booking.staff}</span></Row>
                  <Row icon={<Clock size={17} strokeWidth={1.6} />} label="Time">{booking.when}</Row>
                  <Row icon={<Tag size={17} strokeWidth={1.6} />} label="Price">{booking.price}</Row>
                </dl>
                <p className="mx-6 flex items-center gap-3 border-t border-line py-2.5 text-[14px] text-muted">
                  <Info size={17} strokeWidth={1.6} aria-hidden />
                  {booking.status === "pending"
                    ? "Awaiting staff approval. The customer will be notified once confirmed."
                    : booking.status === "confirmed"
                      ? "Confirmed. It's on the bookings calendar."
                      : `This request is ${statusLabel[booking.status].toLowerCase()}.`}
                </p>
              </article>
              {booking.status === "pending" && (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    disabled={working}
                    onClick={() => act(() => setAppointmentStatus(booking.id, "confirmed"), "Booking confirmed and added to the calendar.")}
                    className="flex h-11 items-center gap-2 rounded-md bg-accent-strong px-5 text-[15.5px] font-medium text-white transition-colors hover:bg-[#344a41] disabled:opacity-60"
                  >
                    <Check size={18} /> Approve &amp; Confirm
                  </button>
                  <button
                    disabled={working}
                    onClick={() => act(() => setAppointmentStatus(booking.id, "declined"), "Request declined.")}
                    className="flex h-11 items-center gap-2 rounded-md border border-line bg-bg px-5 text-[15.5px] transition-colors hover:bg-surface disabled:opacity-60"
                  >
                    <X size={18} /> Decline
                  </button>
                  <button onClick={() => setResched(booking)} className="flex h-11 items-center gap-2 rounded-md border border-line bg-bg px-5 text-[15.5px] transition-colors hover:bg-surface">
                    <CalendarDays size={18} strokeWidth={1.75} /> Reschedule
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {!aiOn && (
        <p className="mx-4 mb-2 flex items-center gap-2 text-[13px] text-muted md:mx-7">
          <Hand size={14} aria-hidden /> You&apos;re handling this conversation. AI replies are paused.
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
        className="mx-4 mb-4 flex h-[62px] items-center rounded-lg border border-line bg-bg pr-2 shadow-[0_1px_2px_rgba(33,40,38,0.04)] focus-within:border-accent md:mx-7 md:mb-5"
      >
        <button type="button" aria-label="Attach file (coming soon)" title="Attachments are coming soon" disabled className="grid h-full w-14 shrink-0 place-items-center border-r border-line text-ink/50">
          <Paperclip size={20} strokeWidth={1.75} />
        </button>
        <label htmlFor="composer" className="sr-only">Message {detail.customer.name}</label>
        <input
          id="composer"
          value={draft}
          maxLength={2000}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${detail.customer.name}...`}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-[16px] outline-none placeholder:text-muted"
        />
        <button
          type="button"
          aria-pressed={aiOn}
          title={aiOn ? "AI answers this conversation. Click to take over." : "You're handling this. Click to hand back to AI."}
          onClick={() => act(() => setConversationState(detail.id, { handledBy: aiOn ? "human" : "ai" }), aiOn ? "You took over. AI replies are paused." : "Handed back to AI.")}
          className={cx("mr-2 flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[15px] transition-colors", aiOn ? "bg-accent-soft text-accent-strong" : "bg-surface text-muted")}
        >
          <Zap size={17} strokeWidth={1.75} /> AI {aiOn ? "on" : "off"}
        </button>
        <button type="submit" disabled={sending || !draft.trim()} aria-label="Send message" className="grid size-11 shrink-0 place-items-center rounded-md bg-accent-strong text-white transition-colors hover:bg-[#344a41] disabled:opacity-60">
          <SendHorizontal size={19} />
        </button>
      </form>
      {resched && <RescheduleDialog appointment={{ id: resched.id, serviceId: resched.serviceId, date: resched.date, label: `${resched.service} for ${detail.customer.name}` }} onClose={() => setResched(null)} />}
    </section>
  );
}

function MenuItem({ icon, children, onClick }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-[14px] hover:bg-surface">
      {icon} {children}
    </button>
  );
}

function MessageRow({ m, name }: { m: Detail["messages"][number]; name: string }) {
  return (
    <>
      {m.day && (
        <li className="flex items-center gap-4 py-1" aria-hidden>
          <span className="h-px flex-1 bg-line" />
          <span className="rounded-md bg-surface px-3 py-1 text-[13px] text-muted">{m.day}</span>
          <span className="h-px flex-1 bg-line" />
        </li>
      )}
      {m.sender === "system" ? (
        <li className="text-center text-[13px] text-muted">{m.body} · {m.time}</li>
      ) : m.sender === "customer" ? (
        <li className="flex gap-4">
          <Avatar name={name} />
          <div className="min-w-0">
            <p className="inline-block rounded-xl rounded-tl-md bg-surface px-4 py-2 text-[16px] break-words whitespace-pre-wrap">{m.body}</p>
            <p className="mt-1 pl-1 text-[13px] text-muted">{m.time}</p>
          </div>
        </li>
      ) : (
        <li className="flex flex-col items-end">
          <div className={cx("flex max-w-[480px] gap-3 rounded-xl rounded-tr-md px-4 py-2.5 text-[16px] leading-[1.38]", m.sender === "ai" ? "bg-surface" : "bg-accent-soft/60")}>
            <span className="mt-0.5 shrink-0 text-ink/70" aria-hidden>
              {m.sender === "ai" ? <Sparkle size={18} strokeWidth={1.6} /> : <User size={18} strokeWidth={1.6} />}
            </span>
            <p className="min-w-0 break-words whitespace-pre-wrap">
              <span className="sr-only">{m.sender === "ai" ? "AI reply: " : "Staff reply: "}</span>
              {m.body}
            </p>
          </div>
          <p className="mt-1 flex items-center gap-2 pr-1 text-[13px] text-muted">
            {m.sender === "staff" && <span>Staff ·</span>}
            {m.simulated && <span title="Produced by the FAQ matcher, not a language model">FAQ match ·</span>}
            {m.time} <CheckCheck size={15} strokeWidth={1.75} aria-hidden />
          </p>
        </li>
      )}
    </>
  );
}

function TagChip({ tag }: { tag: Tag }) {
  const base = "flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[13.5px] whitespace-nowrap";
  if (tag === "booking") return <span className={cx(base, "bg-accent-soft/70 text-ink/85")}><CalendarDays size={14} strokeWidth={1.75} /> Booking</span>;
  if (tag === "ai_replied") return <span className={cx(base, "bg-surface text-ink/85")}><Sparkle size={14} strokeWidth={1.75} /> AI replied</span>;
  if (tag === "new") return <span className={cx(base, "bg-accent-soft/70 text-ink/85")}><span className="size-2 rounded-full bg-live" /> New</span>;
  if (tag === "needs_reply") return <span className={cx(base, "bg-warn-soft text-warn-ink")}><Hand size={14} strokeWidth={1.75} /> Needs reply</span>;
  if (tag === "replied") return <span className={cx(base, "bg-surface text-ink/85")}><User size={14} strokeWidth={1.75} /> Replied</span>;
  return <span className={cx(base, "bg-surface text-ink/85")}><Check size={14} strokeWidth={2} /> Resolved</span>;
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <dt className="text-ink/70">
        {icon}
        <span className="sr-only">{label}</span>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
