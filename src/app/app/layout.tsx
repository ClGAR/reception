import { AppShell } from "@/components/shell/app-shell";
import { requireBusiness } from "@/server/context";
import { notifications, sidebarCounts } from "@/server/queries";
import { relative } from "@/lib/time";
import { Toaster } from "@/components/toast";

const kindText: Record<string, (p: Record<string, string>) => string> = {
  "booking.requested": (p) => `New booking request: ${p.customer ?? "A customer"} – ${p.service ?? "service"}`,
  "booking.confirmed": () => "A booking was confirmed",
  "booking.declined": () => "A booking request was declined",
  "booking.cancelled": () => "A booking was cancelled",
  "handoff.requested": (p) => `${p.customer ?? "A customer"} asked for a staff member`,
};

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { business, user, role } = await requireBusiness();
  const [counts, notes] = await Promise.all([sidebarCounts(business), notifications(business)]);
  return (
    <AppShell
      businessName={business.name}
      userName={user.name}
      userEmail={user.email}
      role={role}
      counts={counts}
      aiLimit={business.aiMonthlyMessageLimit}
      notifications={notes.map((n) => ({
        id: n.id,
        kind: n.kind,
        text: (kindText[n.kind] ?? (() => n.kind))(n.payload as Record<string, string>),
        ago: relative(n.createdAt),
        unread: !n.readAt,
      }))}
    >
      {children}
      <Toaster />
    </AppShell>
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
