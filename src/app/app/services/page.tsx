import { requireBusiness, can } from "@/server/context";
import { staffAndServices } from "@/server/queries";
import { ServicesManager } from "@/components/services/services-manager";

export const metadata = { title: "Services · Reception" };

export default async function ServicesPage() {
  const { business, role } = await requireBusiness();
  const { staff, services, links } = await staffAndServices(business);
  return (
    <ServicesManager
      canEdit={can(role, "service:manage")}
      bookingUrl={`/b/${business.slug}`}
      staff={staff.map((s) => ({ id: s.id, name: s.name, title: s.title ?? "", active: s.active }))}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description ?? "",
        durationMinutes: s.durationMinutes,
        bufferMinutes: s.bufferMinutes,
        price: s.priceCentavos / 100,
        active: s.active,
        staffIds: links.filter((l) => l.serviceId === s.id).map((l) => l.staffId),
      }))}
    />
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
