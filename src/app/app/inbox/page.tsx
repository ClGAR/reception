import { requireBusiness } from "@/server/context";
import { conversationDetail, inboxList } from "@/server/queries";
import { InboxView } from "@/components/inbox/inbox-view";
import { addDays, fmtDate, fmtTime, localParts, peso, relative, todayIn } from "@/lib/time";

export const metadata = { title: "Inbox · Reception" };

export default async function InboxPage({ searchParams }: PageProps<"/app/inbox">) {
  const sp = await searchParams;
  const { business } = await requireBusiness();
  const filter = (["all", "new", "booking", "resolved"].includes(String(sp.f)) ? sp.f : "all") as "all" | "new" | "booking" | "resolved";
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const list = await inboxList(business, q || undefined);
  const selectedId = typeof sp.c === "string" ? sp.c : list[0]?.id;
  const detail = selectedId && /^[0-9a-f-]{36}$/.test(selectedId) ? await conversationDetail(business, selectedId) : null;
  const tz = business.timezone;
  const today = todayIn(tz);

  const dayLabel = (d: Date) => {
    const ld = localParts(d, tz).date;
    return ld === today ? "Today" : ld === addDays(today, -1) ? "Yesterday" : fmtDate(d, tz);
  };
  const whenLabel = (s: Date, e: Date) => {
    const ld = localParts(s, tz).date;
    const day = ld === today ? "Today" : ld === addDays(today, 1) ? "Tomorrow" : fmtDate(s, tz);
    return `${day}, ${fmtTime(s, tz)} – ${fmtTime(e, tz)} (${Math.round((e.getTime() - s.getTime()) / 60000)} mins)`;
  };

  return (
    <InboxView
      key={detail?.conversation.id ?? "none"}
      filter={filter}
      query={q}
      mobileThread={typeof sp.c === "string"}
      list={list.map((c) => ({
        id: c.id,
        name: c.customerName,
        preview: c.last ?? "",
        ago: relative(c.lastMessageAt),
        unread: c.unread,
        tag:
          c.status === "resolved"
            ? "resolved"
            : c.bookingStatus === "pending"
              ? "booking"
              : c.lastSender === "ai"
                ? "ai_replied"
                : c.lastSender === "customer"
                  ? "new"
                  : "replied",
        hasBooking: !!c.bookingStatus,
      }))}
      detail={
        detail && {
          id: detail.conversation.id,
          status: detail.conversation.status,
          handledBy: detail.conversation.handledBy,
          unread: detail.conversation.unread,
          customer: { id: detail.customer.id, name: detail.customer.name },
          convCount: detail.convCount,
          lastActive: relative(detail.conversation.lastMessageAt),
          messages: detail.messages.map((m, i, arr) => ({
            id: m.id,
            sender: m.sender,
            body: m.body,
            simulated: m.simulated,
            time: fmtTime(m.createdAt, tz),
            day: i === 0 || dayLabel(arr[i - 1].createdAt) !== dayLabel(m.createdAt) ? dayLabel(m.createdAt) : null,
          })),
          bookings: detail.bookings.map((b) => ({
            id: b.appointment.id,
            serviceId: b.appointment.serviceId,
            service: b.serviceName,
            staff: b.staffName,
            when: whenLabel(b.appointment.startsAt, b.appointment.endsAt),
            date: localParts(b.appointment.startsAt, tz).date,
            price: peso(b.appointment.priceCentavos),
            status: b.appointment.status,
          })),
        }
      }
    />
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
