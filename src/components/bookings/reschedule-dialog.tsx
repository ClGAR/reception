"use client";

import { useEffect, useState, useTransition } from "react";
import { Button, Dialog, Field, Input, cx } from "@/components/ui";
import { toast } from "@/components/toast";
import { reschedule, staffSlots } from "@/server/actions";
import { minuteLabel } from "@/lib/time";

export function RescheduleDialog({ appointment, onClose }: { appointment: { id: string; serviceId: string; date: string; label: string }; onClose: () => void }) {
  const [date, setDate] = useState(appointment.date);
  const [slots, setSlots] = useState<{ minute: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [saving, start] = useTransition();

  useEffect(() => {
    let live = true;
    staffSlots(appointment.serviceId, date, appointment.id).then((r) => {
      if (!live) return;
      if (r.ok) {
        setSlots(r.data ?? []);
        setError(null);
      } else setError(r.error);
    });
    return () => {
      live = false;
    };
  }, [date, appointment.serviceId, appointment.id]);

  return (
    <Dialog open onClose={onClose} title="Reschedule appointment">
      <p className="mb-4 text-[14px] text-muted">{appointment.label}</p>
      <Field label="Date" htmlFor="rs-date">
        <Input id="rs-date" type="date" value={date} onChange={(e) => {
            setSlots(null);
            setPicked(null);
            setDate(e.target.value);
          }} />
      </Field>
      <p className="mt-4 mb-2 text-[13.5px] font-medium">Available times</p>
      {error && <p role="alert" className="text-[13.5px] text-danger-ink">{error}</p>}
      {!slots && !error && <p className="text-[13.5px] text-muted">Checking availability…</p>}
      {slots && slots.length === 0 && <p className="text-[13.5px] text-muted">No open times on this date. Try another day.</p>}
      {slots && slots.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Available times">
          {slots.map((s) => (
            <button
              key={s.minute}
              role="radio"
              aria-checked={picked === s.minute}
              onClick={() => setPicked(s.minute)}
              className={cx("h-9 rounded-md border text-[13.5px] transition-colors", picked === s.minute ? "border-primary bg-primary text-primary-ink" : "border-line hover:bg-surface")}
            >
              {minuteLabel(s.minute)}
            </button>
          ))}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="primary"
          disabled={picked === null}
          loading={saving}
          onClick={() =>
            start(async () => {
              const r = await reschedule(appointment.id, date, picked!);
              if (r.ok) {
                toast.ok("Appointment moved.");
                onClose();
              } else toast.error(r.error);
            })
          }
        >
          Move appointment
        </Button>
      </div>
    </Dialog>
  );
}
