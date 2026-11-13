CREATE TABLE "booking_draft" (
	"conversation_id" uuid PRIMARY KEY NOT NULL,
	"business_id" uuid NOT NULL,
	"service_id" uuid,
	"date" date,
	"offered_minutes" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"minute" integer,
	"customer_name" text,
	"customer_email" text,
	"customer_phone" text,
	"stage" text DEFAULT 'collecting' NOT NULL,
	"summary_shown_at" timestamp with time zone,
	"appointment_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "booking_draft" ADD CONSTRAINT "booking_draft_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_draft" ADD CONSTRAINT "booking_draft_business_id_business_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."business"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_draft" ADD CONSTRAINT "booking_draft_service_id_service_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."service"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_draft" ADD CONSTRAINT "booking_draft_appointment_id_appointment_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointment"("id") ON DELETE set null ON UPDATE no action;