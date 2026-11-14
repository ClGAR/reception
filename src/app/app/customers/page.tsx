import Link from "next/link";
import { ChevronLeft, Search, Users } from "lucide-react";
import { requireBusiness } from "@/server/context";
import { customerDetail, customersList } from "@/server/queries";
import { fmtDate, fmtTime, relative, peso } from "@/lib/time";
import { Avatar, Badge, EmptyState } from "@/components/ui";
import { cx, statusLabel, statusTone } from "@/lib/cx";
import { CustomerNotes } from "@/components/customers/notes";

export const metadata = { title: "Customers · Reception" };

export default async function CustomersPage({ searchParams }: PageProps<"/app/customers">) {
  const sp = await searchParams;
  const { business } = await requireBusiness();
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const list = await customersList(business, q);
  const id = typeof sp.id === "string" && /^[0-9a-f-]{36}$/.test(sp.id) ? sp.id : undefined;
  const detail = id ? await customerDetail(business, id) : null;
  const tz = business.timezone;

  return (
    <div className="flex h-full min-h-0">
      <section className={cx("min-h-0 w-full flex-col border-r border-line md:flex md:w-[400px] md:shrink-0", detail ? "hidden" : "flex")} aria-label="Customer list">
        <div className="px-6 pt-7 pb-4">
          <h1 className="text-[24px] font-semibold tracking-[-0.01em]">Customers</h1>
          <p className="mt-1 text-[14.5px] text-ink-3">{list.length} {list.length === 1 ? "customer" : "customers"}{q && ` matching “${q}”`}</p>
          <form className="relative mt-4" action="/app/customers">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" aria-hidden />
            <label htmlFor="cq" className="sr-only">Search customers</label>
            <input id="cq" name="q" defaultValue={q} placeholder="Name, email or phone" className="h-10 w-full rounded-md border border-line bg-bg pr-3 pl-9 text-[15.5px] outline-none focus:border-accent" />
          </form>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto border-t border-line">
          {list.length === 0 && (
            <li>
              <EmptyState icon={<Users size={20} />} title={q ? "No matches" : "No customers yet"} body={q ? "Try a different name, email or phone number." : "Customers are added when they chat or book."} />
            </li>
          )}
          {list.map(({ customer: c, bookings, conversations }) => (
            <li key={c.id} className="border-b border-line">
              <Link href={`/app/customers?${new URLSearchParams({ ...(q ? { q } : {}), id: c.id })}`} aria-current={c.id === id ? "true" : undefined} className={cx("flex items-center gap-3 px-6 py-3 hover:bg-surface", c.id === id && "bg-surface-2")}>
                <Avatar name={c.name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{c.name}</span>
                  <span className="block truncate text-[14px] text-ink-3">{c.email ?? c.phone ?? "No contact details"}</span>
                </span>
                <span className="shrink-0 text-right text-[13.5px] text-ink-3">
                  {relative(c.lastActivityAt)}
                  <span className="block">{bookings} {bookings === 1 ? "booking" : "bookings"} · {conversations} {conversations === 1 ? "chat" : "chats"}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={cx("min-h-0 flex-1 overflow-y-auto", detail ? "block" : "hidden md:block")} aria-label="Customer details">
        {!detail ? (
          <EmptyState icon={<Users size={20} />} title="Select a customer" body="See their conversations, bookings and notes." />
        ) : (
          <div className="mx-auto max-w-[760px] px-4 py-6 md:px-8">
            <Link href={`/app/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`} className="mb-4 inline-flex items-center gap-1 text-[15px] text-ink-3 md:hidden">
              <ChevronLeft size={16} /> All customers
            </Link>
            <div className="flex items-center gap-4">
              <Avatar name={detail.customer.name} size="lg" />
              <div className="min-w-0">
                <h2 className="truncate text-[22px] font-semibold">{detail.customer.name}</h2>
                <p className="text-[14.5px] text-ink-3">Customer since {fmtDate(detail.customer.createdAt, tz, { year: "numeric" })} · Last active {relative(detail.customer.lastActivityAt)}</p>
              </div>
            </div>
            <dl className="mt-6 grid gap-4 rounded-2xl border border-line px-5 py-4 text-[15px] sm:grid-cols-2">
              <div><dt className="text-[13.5px] text-ink-3">Email</dt><dd className="mt-0.5 break-all">{detail.customer.email ?? "—"}</dd></div>
              <div><dt className="text-[13.5px] text-ink-3">Phone</dt><dd className="mt-0.5">{detail.customer.phone ?? "—"}</dd></div>
              <div className="sm:col-span-2">
                <dt className="text-[13.5px] text-ink-3">Data consent</dt>
                <dd className="mt-0.5">{detail.customer.consentAt ? `Given ${fmtDate(detail.customer.consentAt, tz, { year: "numeric" })} when booking or chatting` : "Not recorded"}</dd>
              </div>
            </dl>

            <h3 className="mt-8 mb-2 text-[15px] font-semibold">Notes</h3>
            <CustomerNotes id={detail.customer.id} initial={detail.customer.notes ?? ""} />

            <h3 className="mt-8 mb-2 text-[15px] font-semibold">Bookings</h3>
            {detail.bookings.length === 0 ? (
              <p className="text-[15px] text-ink-3">No bookings yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {detail.bookings.map((b) => (
                  <li key={b.appointment.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[15px]">
                    <span className="min-w-0 flex-1">
                      {b.serviceName} <span className="text-ink-3">· {b.staffName}</span>
                      <span className="block text-[14px] text-ink-3">{fmtDate(b.appointment.startsAt, tz, { year: "numeric" })}, {fmtTime(b.appointment.startsAt, tz)} · {peso(b.appointment.priceCentavos)}</span>
                    </span>
                    <Badge tone={statusTone(b.appointment.status)}>{statusLabel[b.appointment.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="mt-8 mb-2 text-[15px] font-semibold">Conversations</h3>
            {detail.conversations.length === 0 ? (
              <p className="text-[15px] text-ink-3">No conversations yet.</p>
            ) : (
              <ul className="divide-y divide-line rounded-2xl border border-line">
                {detail.conversations.map(({ conversation: c, last }) => (
                  <li key={c.id}>
                    <Link href={`/app/inbox?c=${c.id}`} className="flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-surface">
                      <span className="min-w-0 flex-1 truncate">{last}</span>
                      <span className="shrink-0 text-[13.5px] text-ink-3">{relative(c.lastMessageAt)}</span>
                      <Badge tone={c.status === "resolved" ? "neutral" : "accent"}>{c.status === "resolved" ? "Resolved" : "Open"}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
