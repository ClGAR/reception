"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { toast } from "@/components/toast";
import { updateCustomerNotes } from "@/server/actions";

export function CustomerNotes({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saving, start] = useTransition();
  const dirty = value !== initial;
  return (
    <div>
      <label htmlFor="notes" className="sr-only">Internal notes</label>
      <Textarea id="notes" value={value} maxLength={2000} onChange={(e) => setValue(e.target.value)} placeholder="Preferences, allergies to products, anything staff should know. Only your team sees this." />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-[12.5px] text-muted">Only your team can see notes. Avoid medical details unless needed.</p>
        <Button
          size="sm"
          variant="primary"
          disabled={!dirty}
          loading={saving}
          onClick={() =>
            start(async () => {
              const r = await updateCustomerNotes(id, value);
              if (r.ok) toast.ok("Notes saved."); else toast.error(r.error);
            })
          }
        >
          Save notes
        </Button>
      </div>
    </div>
  );
}
