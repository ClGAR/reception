// Dev helper: show chat bookings for the fictional demo visitor.
import { eq } from "drizzle-orm";
import { db } from "../src/server/db";
import { appointment, customer } from "../src/server/db/app-schema";
const rows = await db.select({ status: appointment.status, startsAt: appointment.startsAt, source: appointment.source }).from(appointment).innerJoin(customer, eq(customer.id, appointment.customerId)).where(eq(customer.email, "demo.visitor@example.test"));
console.log(JSON.stringify(rows));
process.exit(0);
