"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "@/components/toast";
import { setAppointmentStatus } from "@/server/actions";

export function PendingActions({ id }: { id: string }) {
  const [busy, start] = useTransition();
  const go = (to: "confirmed" | "declined") =>
    start(async () => {
      const r = await setAppointmentStatus(id, to);
      if (r.ok) toast.ok(to === "confirmed" ? "Booking confirmed." : "Request declined.");
      else toast.error(r.error);
    });
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="primary" disabled={busy} onClick={() => go("confirmed")}>
        <Check size={15} /> Approve
      </Button>
      <Button size="sm" disabled={busy} onClick={() => go("declined")}>
        <X size={15} /> Decline
      </Button>
    </div>
  );
}
