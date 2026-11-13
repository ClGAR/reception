import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth-schema";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const id = () => uuid("id").primaryKey().defaultRandom();
const bizRef = () =>
  uuid("business_id")
    .notNull()
    .references(() => business.id, { onDelete: "cascade" });

export const appointmentStatus = pgEnum("appointment_status", [
  "pending",
  "confirmed",
  "declined",
  "cancelled",
  "completed",
  "no_show",
]);
export const messageSender = pgEnum("message_sender", ["customer", "ai", "staff", "system"]);
export const conversationStatus = pgEnum("conversation_status", ["open", "resolved"]);
export const handler = pgEnum("conversation_handler", ["ai", "human"]);
export const outboxStatus = pgEnum("outbox_status", ["pending", "sent", "dry_run", "failed"]);

/** One business per Better Auth organization. The organization is the tenant boundary. */
export const business = pgTable("business", {
  id: id(),
  organizationId: text("organization_id")
    .notNull()
    .unique()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull().default("salon"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  parking: text("parking"),
  cancellationPolicy: text("cancellation_policy"),
  timezone: text("timezone").notNull().default("Asia/Manila"),
  requireApproval: boolean("require_approval").notNull().default(true),
  aiEnabled: boolean("ai_enabled").notNull().default(true),
  aiMonthlyMessageLimit: integer("ai_monthly_message_limit").notNull().default(2000),
  leadTimeMinutes: integer("lead_time_minutes").notNull().default(60),
  maxDaysAhead: integer("max_days_ahead").notNull().default(30),
  slotStepMinutes: integer("slot_step_minutes").notNull().default(30),
  widgetToken: text("widget_token").notNull().unique(),
  widgetAllowedOrigins: text("widget_allowed_origins").array().notNull().default(sql`'{}'::text[]`),
  widgetGreeting: text("widget_greeting").notNull().default("Hi! How can we help you today?"),
  notifyEmail: boolean("notify_email").notNull().default(true),
  onboardingCompletedAt: ts("onboarding_completed_at"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const staff = pgTable(
  "staff",
  {
    id: id(),
    businessId: bizRef(),
    name: text("name").notNull(),
    title: text("title"),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("staff_business_idx").on(t.businessId)],
);

export const service = pgTable(
  "service",
  {
    id: id(),
    businessId: bizRef(),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferMinutes: integer("buffer_minutes").notNull().default(0),
    priceCentavos: integer("price_centavos").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("service_business_idx").on(t.businessId),
    check("service_duration_ck", sql`${t.durationMinutes} between 5 and 600`),
    check("service_buffer_ck", sql`${t.bufferMinutes} between 0 and 240`),
    check("service_price_ck", sql`${t.priceCentavos} >= 0`),
  ],
);

export const staffService = pgTable(
  "staff_service",
  {
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.staffId, t.serviceId] })],
);

/** Weekly hours. staffId null = business opening hours. Minutes from local midnight. */
export const workingHours = pgTable(
  "working_hours",
  {
    id: id(),
    businessId: bizRef(),
    staffId: uuid("staff_id").references(() => staff.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(), // 0 = Sunday
    startMinute: smallint("start_minute").notNull(),
    endMinute: smallint("end_minute").notNull(),
  },
  (t) => [
    index("hours_business_idx").on(t.businessId),
    check("hours_weekday_ck", sql`${t.weekday} between 0 and 6`),
    check("hours_range_ck", sql`${t.startMinute} >= 0 and ${t.endMinute} <= 1440 and ${t.startMinute} < ${t.endMinute}`),
  ],
);

/** Closures and exceptions. No minutes = closed all day. staffId null = whole business. */
export const availabilityException = pgTable(
  "availability_exception",
  {
    id: id(),
    businessId: bizRef(),
    staffId: uuid("staff_id").references(() => staff.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startMinute: smallint("start_minute"),
    endMinute: smallint("end_minute"),
    reason: text("reason"),
  },
  (t) => [index("exception_business_date_idx").on(t.businessId, t.date)],
);

export const customer = pgTable(
  "customer",
  {
    id: id(),
    businessId: bizRef(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    consentAt: ts("consent_at"),
    lastActivityAt: ts("last_activity_at").notNull().defaultNow(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("customer_business_idx").on(t.businessId, t.lastActivityAt),
    uniqueIndex("customer_business_email_uidx").on(t.businessId, t.email),
  ],
);

export const conversation = pgTable(
  "conversation",
  {
    id: id(),
    businessId: bizRef(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "cascade" }),
    status: conversationStatus("status").notNull().default("open"),
    handledBy: handler("handled_by").notNull().default("ai"),
    unread: boolean("unread").notNull().default(true),
    channel: text("channel").notNull().default("widget"),
    publicToken: text("public_token").notNull().unique(),
    summary: text("summary"),
    lastMessageAt: ts("last_message_at").notNull().defaultNow(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("conversation_business_idx").on(t.businessId, t.lastMessageAt)],
);

export const message = pgTable(
  "message",
  {
    id: id(),
    businessId: bizRef(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    sender: messageSender("sender").notNull(),
    body: text("body").notNull(),
    staffUserId: text("staff_user_id").references(() => user.id, { onDelete: "set null" }),
    /** true when produced by the labelled development simulation, not a real model */
    simulated: boolean("simulated").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("message_conversation_idx").on(t.conversationId, t.createdAt)],
);

/**
 * Appointments. [starts_at, block_ends_at) = service time + buffer; the exclusion constraint
 * (migration 0001) forbids two CONFIRMED appointments overlapping for the same staff member.
 */
export const appointment = pgTable(
  "appointment",
  {
    id: id(),
    businessId: bizRef(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customer.id, { onDelete: "restrict" }),
    serviceId: uuid("service_id")
      .notNull()
      .references(() => service.id, { onDelete: "restrict" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "restrict" }),
    conversationId: uuid("conversation_id").references(() => conversation.id, { onDelete: "set null" }),
    startsAt: ts("starts_at").notNull(),
    endsAt: ts("ends_at").notNull(),
    blockEndsAt: ts("block_ends_at").notNull(),
    status: appointmentStatus("status").notNull().default("pending"),
    priceCentavos: integer("price_centavos").notNull(),
    source: text("source").notNull().default("booking_page"),
    notes: text("notes"),
    idempotencyKey: text("idempotency_key"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("appointment_business_time_idx").on(t.businessId, t.startsAt),
    index("appointment_staff_time_idx").on(t.staffId, t.startsAt),
    uniqueIndex("appointment_idempotency_uidx").on(t.businessId, t.idempotencyKey),
    check("appointment_range_ck", sql`${t.startsAt} < ${t.endsAt} and ${t.endsAt} <= ${t.blockEndsAt}`),
  ],
);

export const knowledgeEntry = pgTable(
  "knowledge_entry",
  {
    id: id(),
    businessId: bizRef(),
    category: text("category").notNull(), // hours | pricing | location | parking | policy | promo | faq
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    active: boolean("active").notNull().default(true),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("knowledge_business_idx").on(t.businessId)],
);

export const handoff = pgTable("handoff", {
  id: id(),
  businessId: bizRef(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversation.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  resolvedAt: ts("resolved_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: id(),
    businessId: bizRef(),
    kind: text("kind").notNull(),
    payload: jsonb("payload").notNull(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    status: outboxStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    readAt: ts("read_at"),
    sentAt: ts("sent_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("outbox_business_idx").on(t.businessId, t.createdAt)],
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: id(),
    businessId: bizRef(),
    conversationId: uuid("conversation_id").references(() => conversation.id, { onDelete: "set null" }),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    simulated: boolean("simulated").notNull().default(false),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("ai_usage_business_idx").on(t.businessId, t.createdAt)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    businessId: bizRef(),
    actorUserId: text("actor_user_id").references(() => user.id, { onDelete: "set null" }),
    actorType: text("actor_type").notNull(), // staff | customer | ai | system
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    data: jsonb("data"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_business_idx").on(t.businessId, t.createdAt)],
);

/**
 * Per-conversation booking draft. The AI can only change it through validated tools,
 * and the server (not the model) decides when a request may be submitted.
 */
export const bookingDraft = pgTable("booking_draft", {
  conversationId: uuid("conversation_id")
    .primaryKey()
    .references(() => conversation.id, { onDelete: "cascade" }),
  businessId: bizRef(),
  serviceId: uuid("service_id").references(() => service.id, { onDelete: "set null" }),
  date: date("date"),
  /** Times the customer was actually shown for `date` (local minutes). */
  offeredMinutes: integer("offered_minutes").array().notNull().default(sql`'{}'::integer[]`),
  minute: integer("minute"),
  customerName: text("customer_name"),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  /** collecting → awaiting_confirmation → submitted */
  stage: text("stage").notNull().default("collecting"),
  summaryShownAt: ts("summary_shown_at"),
  appointmentId: uuid("appointment_id").references(() => appointment.id, { onDelete: "set null" }),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});
