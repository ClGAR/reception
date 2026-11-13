import { headers } from "next/headers";
import { requireBusiness, can } from "@/server/context";
import { settingsData } from "@/server/queries";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata = { title: "Settings · Reception" };

export default async function SettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const sp = await searchParams;
  const { business, role } = await requireBusiness();
  const data = await settingsData(business);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const tabs = ["business", "availability", "team", "ai", "notifications", "widget", "usage"] as const;
  const tab = tabs.includes(sp.tab as (typeof tabs)[number]) ? (sp.tab as (typeof tabs)[number]) : "business";

  return (
    <SettingsView
      tab={tab}
      origin={origin}
      perms={{ business: can(role, "settings:business"), operational: can(role, "settings:operational"), team: can(role, "team:manage") }}
      business={{
        name: business.name,
        slug: business.slug,
        type: business.type,
        phone: business.phone ?? "",
        email: business.email ?? "",
        address: business.address ?? "",
        parking: business.parking ?? "",
        cancellationPolicy: business.cancellationPolicy ?? "",
        timezone: business.timezone,
        requireApproval: business.requireApproval,
        aiEnabled: business.aiEnabled,
        aiMonthlyMessageLimit: business.aiMonthlyMessageLimit,
        leadTimeMinutes: business.leadTimeMinutes,
        maxDaysAhead: business.maxDaysAhead,
        slotStepMinutes: business.slotStepMinutes,
        widgetToken: business.widgetToken,
        widgetGreeting: business.widgetGreeting,
        widgetAllowedOrigins: business.widgetAllowedOrigins,
        notifyEmail: business.notifyEmail,
      }}
      hours={data.hours.map((h) => ({ weekday: h.weekday, startMinute: h.startMinute, endMinute: h.endMinute }))}
      closures={data.exceptions.filter((e) => e.staffId === null && e.startMinute === null).map((e) => ({ id: e.id, date: e.date, reason: e.reason ?? "" }))}
      team={data.team}
      usage={{ aiMessages: data.aiMessagesThisMonth, openHandoffs: data.openHandoffs }}
      integrations={{ ai: !!process.env.AI_PROVIDER && !!process.env.AI_MODEL, email: !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM }}
    />
  );
}

// Per-user / per-request data: opt out of the static shell (Cache Components).
export const instant = false;
