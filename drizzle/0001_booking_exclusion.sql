-- Double-booking guard: no two CONFIRMED appointments may overlap for the same staff member.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_no_overlap"
  EXCLUDE USING gist ("staff_id" WITH =, tstzrange("starts_at", "block_ends_at", '[)') WITH &&)
  WHERE ("status" = 'confirmed');
