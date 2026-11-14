-- Row-level security (defence in depth).
-- The staff app reads and writes through the restricted role "reception_app" inside a transaction
-- that first runs set_config('app.business_id', <id>, true). Without that setting it sees nothing.
-- The owner role (migrations, auth, public booking, background jobs) owns the tables and bypasses RLS.
-- The role's LOGIN password is set outside migrations by scripts/setup-app-role.mts.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reception_app') THEN
    CREATE ROLE reception_app NOLOGIN;
  END IF;
END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO reception_app;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION app_business_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.business_id', true), '')::uuid $$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION app_business_id() TO reception_app;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'staff', 'service', 'working_hours', 'availability_exception', 'customer', 'conversation', 'message',
    'appointment', 'knowledge_entry', 'handoff', 'notification_outbox', 'ai_usage', 'audit_log', 'booking_draft'
  ] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO reception_app', t);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I TO reception_app USING (business_id = app_business_id()) WITH CHECK (business_id = app_business_id())',
      t
    );
  END LOOP;
END $$;
--> statement-breakpoint
GRANT SELECT, UPDATE ON "business" TO reception_app;
--> statement-breakpoint
ALTER TABLE "business" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "business";
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "business" TO reception_app
  USING (id = app_business_id()) WITH CHECK (id = app_business_id());
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "staff_service" TO reception_app;
--> statement-breakpoint
ALTER TABLE "staff_service" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "staff_service";
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "staff_service" TO reception_app
  USING (EXISTS (SELECT 1 FROM "service" s WHERE s.id = service_id AND s.business_id = app_business_id()))
  WITH CHECK (
    EXISTS (SELECT 1 FROM "service" s WHERE s.id = service_id AND s.business_id = app_business_id())
    AND EXISTS (SELECT 1 FROM "staff" st WHERE st.id = staff_id AND st.business_id = app_business_id())
  );
--> statement-breakpoint
-- Team list: members of this business's organization, and only their name + email.
GRANT SELECT ON "member" TO reception_app;
--> statement-breakpoint
ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "member";
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "member" FOR SELECT TO reception_app
  USING (organization_id = (SELECT b.organization_id FROM "business" b WHERE b.id = app_business_id()));
--> statement-breakpoint
GRANT SELECT (id, name, email) ON "user" TO reception_app;
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS tenant_isolation ON "user";
--> statement-breakpoint
CREATE POLICY tenant_isolation ON "user" FOR SELECT TO reception_app
  USING (id IN (SELECT m.user_id FROM "member" m));
