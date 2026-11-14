import "server-only";
import { after } from "next/server";
import { inngest, inngestEnabled } from "../inngest/client";
import { deliverOutboxRow, pendingOutboxIds } from "./outbox";

/**
 * Call after a transaction that wrote notification_outbox rows has committed.
 * With Inngest: one event, delivered and retried in the background.
 * Without Inngest: delivered after the response is sent (next/server `after`).
 * Either way the sweep job / next kick picks up anything left pending.
 */
export function kickOutbox(businessId: string) {
  if (process.env.OUTBOX_DELIVERY === "off") return;
  const work = async () => {
    if (inngestEnabled()) {
      try {
        await inngest.send({ name: "reception/outbox.kick", data: { businessId } });
        return;
      } catch (e) {
        console.warn("[outbox] Inngest send failed, delivering inline", e);
      }
    }
    for (const id of await pendingOutboxIds({ businessId, limit: 20 }))
      await deliverOutboxRow(id).catch((e) => console.error("[outbox] delivery failed", id, e));
  };
  try {
    after(work);
  } catch {
    void work().catch((e) => console.error("[outbox]", e));
  }
}
