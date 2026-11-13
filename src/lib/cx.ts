// Plain helpers usable from both server and client components.
export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function statusTone(s: string) {
  return s === "pending" ? "warn" : s === "confirmed" ? "accent" : s === "declined" || s === "no_show" ? "danger" : "neutral";
}

export const statusLabel: Record<string, string> = {
  pending: "Pending approval",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
  no_show: "No-show",
};
