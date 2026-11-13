// DEVELOPMENT-ONLY SEED. Every business, person and message here is FICTIONAL.
// Run: npm run db:seed   (needs DEMO_PASSWORD in .env; emails use the reserved .test domain)
import { randomBytes, randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/server/db";
import * as authS from "../src/server/db/auth-schema";
import * as appS from "../src/server/db/app-schema";
const s = { ...authS, ...appS };
import { addDays, localToUtc, todayIn, weekdayOf } from "../src/lib/time";

const TZ = "Asia/Manila";
const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error("Set DEMO_PASSWORD in .env first.");

const token = () => randomBytes(18).toString("base64url");

async function reset() {
  const demo = await db.select({ id: s.business.id, org: s.business.organizationId }).from(s.business).where(eq(s.business.isDemo, true));
  if (demo.length) {
    const ids = demo.map((d) => d.id);
    await db.delete(s.appointment).where(inArray(s.appointment.businessId, ids));
    await db.delete(s.organization).where(inArray(s.organization.id, demo.map((d) => d.org)));
  }
  await db.delete(s.user).where(inArray(s.user.email, ["owner@glowstudio.test", "staff@glowstudio.test", "owner@smilelab.test"]));
}

async function makeUser(email: string, name: string) {
  const id = randomUUID();
  await db.insert(s.user).values({ id, email, name, emailVerified: true });
  await db.insert(s.account).values({
    id: randomUUID(),
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(password!),
  });
  return id;
}

/** next date (from tomorrow) that is not Sunday */
function nextOpenDay(from: string) {
  let d = addDays(from, 1);
  while (weekdayOf(d) === 0) d = addDays(d, 1);
  return d;
}

async function seedGlow() {
  const ownerId = await makeUser("owner@glowstudio.test", "Jamie Dela Cruz");
  const staffUserId = await makeUser("staff@glowstudio.test", "Rica Lim");
  const orgId = randomUUID();
  await db.insert(s.organization).values({ id: orgId, name: "Glow Studio Salon", slug: "glow-studio", createdAt: new Date() });
  await db.insert(s.member).values([
    { id: randomUUID(), organizationId: orgId, userId: ownerId, role: "owner", createdAt: new Date() },
    { id: randomUUID(), organizationId: orgId, userId: staffUserId, role: "member", createdAt: new Date() },
  ]);
  const [biz] = await db
    .insert(s.business)
    .values({
      organizationId: orgId,
      name: "Glow Studio Salon",
      slug: "glow-studio",
      type: "salon",
      phone: "+63 917 000 0000",
      email: "hello@glowstudio.test",
      address: "2F Example Building, 123 Sample St., Makati City",
      parking: "Free parking for 2 hours at the basement of Example Building.",
      cancellationPolicy: "Free cancellation up to 6 hours before your appointment. Late cancellations may be charged 50%.",
      widgetToken: token(),
      widgetAllowedOrigins: ["http://localhost:3107"],
      onboardingCompletedAt: new Date(),
      isDemo: true,
    })
    .returning();

  const staffRows = await db
    .insert(s.staff)
    .values([
      { businessId: biz.id, name: "Bea Villanueva", title: "Senior stylist" },
      { businessId: biz.id, name: "Carlo Mendoza", title: "Stylist & colorist" },
      { businessId: biz.id, name: "Joy Ramos", title: "Aesthetician" },
    ])
    .returning();
  const [bea, carlo, joy] = staffRows;

  const svcRows = await db
    .insert(s.service)
    .values([
      { businessId: biz.id, name: "Cleaning", description: "Deep facial cleaning with extraction and mask.", durationMinutes: 60, priceCentavos: 80000 },
      { businessId: biz.id, name: "Haircut & Style", description: "Wash, cut and blow-dry.", durationMinutes: 45, bufferMinutes: 15, priceCentavos: 45000 },
      { businessId: biz.id, name: "Hair Color", description: "Single-process color. Price may vary with hair length.", durationMinutes: 120, bufferMinutes: 15, priceCentavos: 250000 },
      { businessId: biz.id, name: "Hair Spa", description: "Deep conditioning treatment with scalp massage.", durationMinutes: 60, priceCentavos: 90000 },
      { businessId: biz.id, name: "Manicure", description: "Classic manicure with polish.", durationMinutes: 45, priceCentavos: 30000 },
    ])
    .returning();
  const [cleaning, haircut, color, spa, mani] = svcRows;
  await db.insert(s.staffService).values([
    { staffId: joy.id, serviceId: cleaning.id },
    { staffId: joy.id, serviceId: mani.id },
    { staffId: bea.id, serviceId: haircut.id },
    { staffId: bea.id, serviceId: spa.id },
    { staffId: carlo.id, serviceId: haircut.id },
    { staffId: carlo.id, serviceId: color.id },
    { staffId: carlo.id, serviceId: spa.id },
  ]);
  // Mon–Sat 9:00–19:00, Sunday closed. Joy works 10:00–18:00.
  const hours = [1, 2, 3, 4, 5, 6].flatMap((wd) => [
    { businessId: biz.id, staffId: null, weekday: wd, startMinute: 540, endMinute: 1140 },
    { businessId: biz.id, staffId: joy.id, weekday: wd, startMinute: 600, endMinute: 1080 },
  ]);
  await db.insert(s.workingHours).values(hours);

  await db.insert(s.knowledgeEntry).values([
    { businessId: biz.id, category: "hours", question: "What are your opening hours?", answer: "We're open Monday to Saturday, 9:00 AM to 7:00 PM. We're closed on Sundays." },
    { businessId: biz.id, category: "location", question: "Where are you located?", answer: "2F Example Building, 123 Sample St., Makati City." },
    { businessId: biz.id, category: "parking", question: "Is there parking?", answer: "Yes, free parking for 2 hours at the basement of Example Building." },
    { businessId: biz.id, category: "policy", question: "What is your cancellation policy?", answer: "Free cancellation up to 6 hours before your appointment. Late cancellations may be charged 50%." },
    { businessId: biz.id, category: "faq", question: "Do you offer home service?", answer: "We don't offer home service at the moment. All services are done at our studio." },
    { businessId: biz.id, category: "faq", question: "What payment methods do you accept?", answer: "Cash, GCash, Maya and major credit cards." },
    { businessId: biz.id, category: "promo", question: "Do you have promos?", answer: "Hair Spa is 10% off on weekdays before 12 NN this month." },
  ]);

  const now = Date.now();
  const ago = (min: number) => new Date(now - min * 60_000);
  const today = todayIn(TZ);
  const tomorrow = nextOpenDay(today);

  type Conv = {
    name: string;
    email: string;
    phone?: string;
    lastMin: number;
    unread: boolean;
    status?: "open" | "resolved";
    handledBy?: "ai" | "human";
    msgs: [s: "customer" | "ai" | "staff", body: string, minAgo: number][];
  };
  const convs: Conv[] = [
    {
      name: "Maria Santos", email: "maria.santos@example.test", phone: "+63 917 111 0001", lastMin: 2, unread: true,
      msgs: [
        ["customer", "Hi! Is 2 PM available tomorrow for a cleaning?", 4],
        ["ai", "Yes, we have a slot available tomorrow at 2:00 PM for a Cleaning (60 mins, ₱800). Would you like me to request this appointment for you?", 4],
        ["customer", "Yes, please! Book it for me.", 3],
      ],
    },
    {
      name: "John Reyes", email: "john.reyes@example.test", lastMin: 18, unread: true,
      msgs: [
        ["customer", "How much is cleaning?", 19],
        ["ai", "Our Cleaning service is ₱800 and takes about 60 minutes. Would you like to check available times?", 18],
      ],
    },
    {
      name: "Ana Cruz", email: "ana.cruz@example.test", lastMin: 27, unread: true, handledBy: "human",
      msgs: [["customer", "I'd like an appointment for a hair color this weekend.", 27]],
    },
    {
      name: "Liza Pascual", email: "liza.pascual@example.test", lastMin: 60, unread: false,
      msgs: [
        ["customer", "Do you also offer home service?", 61],
        ["ai", "We don't offer home service at the moment. All services are done at our studio. I can help you book a visit if you'd like.", 60],
      ],
    },
    {
      name: "David Romero", email: "david.romero@example.test", lastMin: 120, unread: false, status: "resolved", handledBy: "human",
      msgs: [
        ["customer", "Can I reschedule my booking tomorrow?", 135],
        ["staff", "Done! You're now booked for Friday at 11:00 AM. See you then!", 120],
      ],
    },
  ];

  const custIds: Record<string, string> = {};
  for (const c of convs) {
    const [cust] = await db
      .insert(s.customer)
      .values({ businessId: biz.id, name: c.name, email: c.email, phone: c.phone ?? null, lastActivityAt: ago(c.lastMin), consentAt: ago(c.lastMin + 5) })
      .returning();
    custIds[c.name] = cust.id;
    const [conv] = await db
      .insert(s.conversation)
      .values({
        businessId: biz.id, customerId: cust.id, unread: c.unread, status: c.status ?? "open", handledBy: c.handledBy ?? "ai",
        publicToken: token(), lastMessageAt: ago(c.lastMin), createdAt: ago(c.msgs[0][2]),
      })
      .returning();
    await db.insert(s.message).values(
      c.msgs.map(([sender, body, m]) => ({
        businessId: biz.id, conversationId: conv.id, sender, body, createdAt: ago(m),
        staffUserId: sender === "staff" ? staffUserId : null,
      })),
    );
    if (c.name === "Maria Santos") {
      const start = localToUtc(tomorrow, 14 * 60, TZ);
      const end = new Date(start.getTime() + 60 * 60_000);
      const [appt] = await db
        .insert(s.appointment)
        .values({
          businessId: biz.id, customerId: cust.id, serviceId: cleaning.id, staffId: joy.id, conversationId: conv.id,
          startsAt: start, endsAt: end, blockEndsAt: end, status: "pending", priceCentavos: 80000, source: "chat",
        })
        .returning();
      await db.insert(s.notificationOutbox).values({
        businessId: biz.id, kind: "booking.requested", dedupeKey: `booking.created:${appt.id}`, status: "dry_run",
        payload: { appointmentId: appt.id, customer: c.name, service: "Cleaning", startsAt: start.toISOString() },
        createdAt: ago(3),
      });
    }
  }

  // Extra customers with confirmed bookings spread over this week.
  const extra = [
    ["Paolo Garcia", "paolo.garcia@example.test"],
    ["Kim Bautista", "kim.bautista@example.test"],
    ["Rhea Navarro", "rhea.navarro@example.test"],
  ];
  for (const [name, email] of extra) {
    const [c] = await db.insert(s.customer).values({ businessId: biz.id, name, email, lastActivityAt: ago(60 * 24) }).returning();
    custIds[name] = c.id;
  }
  const book = (who: string, svc: typeof cleaning, st: typeof bea, date: string, minute: number, status: "confirmed" | "completed" = "confirmed") => {
    const start = localToUtc(date, minute, TZ);
    const end = new Date(start.getTime() + svc.durationMinutes * 60_000);
    return {
      businessId: biz.id, customerId: custIds[who], serviceId: svc.id, staffId: st.id, startsAt: start, endsAt: end,
      blockEndsAt: new Date(end.getTime() + svc.bufferMinutes * 60_000), status, priceCentavos: svc.priceCentavos, source: "booking_page",
    };
  };
  const day = (n: number) => {
    let d = today;
    for (let i = 0; i < n; i++) d = nextOpenDay(d);
    return d;
  };
  const todayOpen = weekdayOf(today) !== 0;
  const t0 = todayOpen ? today : day(1);
  await db.insert(s.appointment).values([
    book("Paolo Garcia", haircut, bea, t0, 10 * 60),
    book("Kim Bautista", color, carlo, t0, 13 * 60),
    book("Rhea Navarro", mani, joy, t0, 16 * 60),
    book("David Romero", haircut, carlo, day(1), 11 * 60),
    book("Liza Pascual", spa, bea, day(2), 15 * 60),
    book("Paolo Garcia", cleaning, joy, day(3), 11 * 60),
  ]);
  await db.insert(s.aiUsage).values(
    Array.from({ length: 6 }, () => ({ businessId: biz.id, model: "seed", inputTokens: 0, outputTokens: 0, simulated: true })),
  );
  return biz;
}

async function seedSmile() {
  const ownerId = await makeUser("owner@smilelab.test", "Dr. Sam Reyes");
  const orgId = randomUUID();
  await db.insert(s.organization).values({ id: orgId, name: "Smile Lab Dental", slug: "smile-lab", createdAt: new Date() });
  await db.insert(s.member).values({ id: randomUUID(), organizationId: orgId, userId: ownerId, role: "owner", createdAt: new Date() });
  const [biz] = await db
    .insert(s.business)
    .values({
      organizationId: orgId, name: "Smile Lab Dental", slug: "smile-lab", type: "dental",
      widgetToken: token(), onboardingCompletedAt: new Date(), isDemo: true, address: "Unit 4, Sample Plaza, Quezon City",
    })
    .returning();
  const [doc] = await db.insert(s.staff).values({ businessId: biz.id, name: "Dr. Sam Reyes", title: "Dentist" }).returning();
  const [svc] = await db
    .insert(s.service)
    .values({ businessId: biz.id, name: "Dental Cleaning", durationMinutes: 45, bufferMinutes: 15, priceCentavos: 150000 })
    .returning();
  await db.insert(s.staffService).values({ staffId: doc.id, serviceId: svc.id });
  await db.insert(s.workingHours).values([1, 2, 3, 4, 5].map((wd) => ({ businessId: biz.id, staffId: null, weekday: wd, startMinute: 540, endMinute: 1020 })));
  await db.insert(s.customer).values({ businessId: biz.id, name: "Private Patient", email: "patient@example.test" });
  return biz;
}

await reset();
const glow = await seedGlow();
const smile = await seedSmile();
console.log(`Seeded fictional demo businesses: ${glow.slug}, ${smile.slug}`);
process.exit(0);
