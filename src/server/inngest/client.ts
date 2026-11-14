import { Inngest } from "inngest";

// Background jobs. Production: set INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY (Inngest Cloud).
// Local: run `npx inngest-cli@latest dev` and set INNGEST_DEV=1. Without either, the app delivers inline.
export const inngest = new Inngest({ id: "reception" });

export const inngestEnabled = () => !!process.env.INNGEST_EVENT_KEY || process.env.INNGEST_DEV === "1";
