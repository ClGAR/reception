import "server-only";
import { inngest } from "./client";
import { deliverOutboxRow, pendingOutboxIds, queueReminders } from "../notify/outbox";

/** Right after a booking change: deliver that business's pending notifications. Retried by Inngest. */
export const deliverBusinessOutbox = inngest.createFunction(
  { id: "deliver-business-outbox", triggers: [{ event: "reception/outbox.kick" }], retries: 4 },
  async ({ event, step }) => {
    const ids = await step.run("find-pending", () => pendingOutboxIds({ businessId: (event.data as { businessId: string }).businessId, limit: 20 }));
    for (const id of ids) await step.run(`deliver-${id}`, () => deliverOutboxRow(id));
    return { delivered: ids.length };
  },
);

/** Safety net: anything still pending after 2 minutes (lost event, provider outage) is retried. */
export const sweepOutbox = inngest.createFunction(
  { id: "sweep-outbox", triggers: [{ cron: "*/5 * * * *" }], retries: 2 },
  async ({ step }) => {
    const ids = await step.run("find-stale", () => pendingOutboxIds({ olderThanMs: 2 * 60_000, limit: 50 }));
    for (const id of ids) await step.run(`deliver-${id}`, () => deliverOutboxRow(id).catch(() => "will-retry"));
    return { swept: ids.length };
  },
);

/** Hourly: email a reminder about 24 hours before each confirmed appointment (once each). */
export const appointmentReminders = inngest.createFunction(
  { id: "appointment-reminders", triggers: [{ cron: "0 * * * *" }], retries: 2 },
  async ({ step }) => {
    const ids = await step.run("queue-reminders", () => queueReminders());
    for (const id of ids) await step.run(`deliver-${id}`, () => deliverOutboxRow(id).catch(() => "will-retry"));
    return { reminders: ids.length };
  },
);

export const functions = [deliverBusinessOutbox, sweepOutbox, appointmentReminders];
