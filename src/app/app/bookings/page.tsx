import { requireBusiness } from "@/server/context";
import { allWorkingHours, bookingsInRange, staffAndServices } from "@/server/queries";
import { addDays, fmtTime, isValidDate, localParts, peso, todayIn, weekdayOf } from "@/lib/time";
import { BookingsCalendar } from "@/components/bookings/calendar";

export const metadata = { title: "Bookings · Reception" };

const isPast = (d: Date) => d.getTime() < Date.now();

export default async function BookingsPage({ searchParams }: PageProps<"/app/bookings">) {
  const sp = await searchParams;
  const { business } = await requireBusiness();
  const tz = business.timezone;
  const today = todayIn(tz);
  const date = typeof sp.date === "string" && isValidDate(sp.date) ? sp.date : today;
  const view = sp.view === "day" ? "day" : "week";
  const staffId = typeof sp.staff === "string" && /^[0-9a-f-]{36}$/.test(sp.staff) ? sp.staff : undefined;
  const serviceId = typeof sp.service === "string" && /^[0-9a-f-]{36}$/.test(sp.service) ? sp.service : undefined;
  // Week starts Monday.
  const start = view === "day" ? date : addDays(date, -((weekdayOf(date) + 6) % 7));
  const days = view === "day" ? 1 : 7;

  const [rows, { staff, services }, hours] = await Promise.all([
    bookingsInRange(business, start, days, { staffId, serviceId }),
    staffAndServices(business),
    allWorkingHours(business),
  ]);
  const open = hours.length ? Math.min(...hours.map((h) => h.startMinute)) : 8 * 60;
  const close = hours.length ? Math.max(...hours.map((h) => h.endMinute)) : 20 * 60;
  const pendingCount = rows.filter((r) => r.appointment.status === "pending").length;

  return (
    <BookingsCalendar
      view={view}
      date={date}
      start={start}
      days={Array.from({ length: days }, (_, i) => addDays(start, i))}
      today={today}
      dayStart={Math.floor(open / 60) * 60}
      dayEnd={Math.ceil(close / 60) * 60}
      staff={staff.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))}
      services={services.map((s) => ({ id: s.id, name: s.name }))}
      filters={{ staffId, serviceId }}
      pendingCount={pendingCount}
      events={rows.map((r) => {
        const s = localParts(r.appointment.startsAt, tz);
        const e = localParts(r.appointment.endsAt, tz);
        return {
          id: r.appointment.id,
          serviceId: r.appointment.serviceId,
          date: s.date,
          startMinute: s.minute,
          endMinute: e.date === s.date ? e.minute : 1440,
          time: `${fmtTime(r.appointment.startsAt, tz)} – ${fmtTime(r.appointment.endsAt, tz)}`,
          status: r.appointment.status,
          customer: r.customerName,
          contact: [r.customerPhone, r.customerEmail].filter(Boolean).join(" · "),
          service: r.serviceName,
          staff: r.staffName,
          staffId: r.appointment.staffId,
          price: peso(r.appointment.priceCentavos),
          source: r.appointment.source,
          notes: r.appointment.notes,
          past: isPast(r.appointment.startsAt),
        };
      })}
    />
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
