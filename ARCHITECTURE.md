# Architecture (Stage 4)

Next.js 16 App Router (Cache Components on) · TypeScript strict · Tailwind v4 · Neon Postgres + Drizzle · Better Auth (email/password + organization plugin) · Zod · Vitest.

## Tenancy
- One Better Auth **organization** = one tenant. `business` has a unique `organization_id`.
- `src/server/context.ts` resolves the business from the session + `member` row on every request. Client input never chooses the business.
- Roles: `owner` (everything), `admin` = Manager (services, knowledge, hours, bookings, inbox), `member` = Reception staff (inbox, bookings, customer notes). `can()` + `authorize()` enforce this in every server action.
- Every query and mutation filters by `business_id`. Integration tests prove cross-tenant reads/writes fail.
- Postgres RLS (migration `0003_rls.sql`), defence in depth on top of the `business_id` filters:
  - Staff reads (`src/server/queries.ts`) and simple staff writes (`src/server/actions.ts`) run through `withTenant()` (`src/server/db/tenant.ts`): a transaction on the restricted role `reception_app` (`DATABASE_URL_APP`) that first sets `app.business_id`. Postgres then only shows and accepts that business's rows; with nothing set it shows nothing.
  - The owner role (migrations, auth, public booking page, widget, AI, booking engine with advisory locks, background jobs) owns the tables and bypasses RLS. Those paths keep explicit `business_id` filters and the isolation tests.
  - `scripts/setup-app-role.mts` sets the role's password and writes `DATABASE_URL_APP`. Production refuses tenant queries without it.

## Booking engine
- `src/server/booking/availability.ts`: pure function. Business hours ∩ staff hours − closures − pending/confirmed bookings (incl. buffer), lead time, max days ahead, slot step. Timezone-aware (stored UTC, shown in business tz, default Asia/Manila).
- `src/server/booking/service.ts`: DB layer. Requests run in a transaction holding per-staff `pg_advisory_xact_lock`, so two simultaneous requests can't take the last slot. Idempotency keys stop duplicate submits.
- Migration `0001_booking_exclusion.sql`: `EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, block_ends_at) WITH &&) WHERE status = 'confirmed'`. The database itself refuses double confirmations.
- Status machine: pending → confirmed | declined | cancelled; confirmed → cancelled | completed | no_show. Every change writes `audit_log` and an outbox row (deduped by key).

## AI receptionist (`src/server/ai/`)
- `provider.ts`: model from env (`AI_PROVIDER` = `openai-compatible` | `anthropic`, `AI_MODEL`, `AI_BASE_URL`, `AI_API_KEY`). Nothing hardcoded; pick a cheap model.
- `AI_MODEL` takes a comma-separated fallback list; each model gets 45 s, then the next is tried.
- Business facts and services are preloaded into the system prompt, so most turns need 1–3 model calls.
- If a booking succeeded but the model then fails, the app writes its own honest "request sent, not confirmed yet" message.
- Dev setup: FreeLLMAPI (local router) with `gemini-3.5-flash,gpt-oss-120b,gemini-3.8-flash`. Free tiers are rate-limited and sometimes fail mid-conversation; use a paid model with a DPA for real customers.
- `receptionist.ts`: AI SDK v7 `generateText` with server tools scoped to one business: `getBusinessInformation`, `listServices`, `checkAvailability`, `createBookingRequest` (Zod-validated, requires `customerAgreed: true`, goes through the booking engine, idempotent per slot), `handoffToStaff`.
- Guardrails in the system prompt: only tool facts, no medical advice, never claim confirmed while pending, customer text is not instructions. Max 6 steps, 400 output tokens, 30 s timeout, 1 retry.
- Skips when staff took over or AI is off; hands off when the monthly limit is hit; on provider error saves a safe fallback + handoff (never a booking claim). Token usage → `ai_usage`.
- No provider configured → `faq.ts` keyword matcher. Replies stored with `simulated = true` and labelled "FAQ match" in the inbox and widget. Medical-sounding questions always hand off.
- Privacy: a production provider must have a data processing agreement. Don't route real customer chats through free/unknown routers.

## Booking conversation (server-enforced)
- Each conversation has a `booking_draft` row: service → date → `offeredMinutes` (times actually shown) → chosen minute → name + email/phone → stage (`collecting` → `awaiting_confirmation` → `submitted`).
- The model only has state tools: `selectService`, `checkAvailability`, `selectSlot` (must be an offered, still-free time), `setContactDetails` (validated), `reviewBooking`, `handoffToStaff`. **There is no submit tool.**
- After `reviewBooking`, the **server** writes the summary. The next customer message is checked in code (`isAffirmative`): a clear yes submits (idempotency key per draft+slot); anything else reopens the draft.
- Every model reply is checked in code (`checkReply`): times must be ones the server offered, prices must be real, no "confirmed/booked" claims, max 4 times. Failing replies are replaced by a deterministic next-step message (plus an approved FAQ answer if the customer asked a side question).
- If every model fails mid-booking, the server reads an offered time or name/email/phone from the message itself and keeps the flow going.
- Changing service resets the time; re-checking the same date keeps a still-free chosen time; a slot taken before "yes" gets an honest message with refreshed times.
- Email: request-received email goes through `sendEmail`, which is dry-run without Resend and never delivers to `.test`/`example.*` addresses.

## Model evaluation
- `npm run test:eval` runs each model in `AI_MODEL` (and the full chain) through a 7-step scripted booking with an interruption and a time change, against a temporary fictional business. Results: `tests/eval/RESULTS.md`.

## Website widget
- `public/widget.js` → injects a button + iframe (`/widget/[token]`) inside a shadow root, so host CSS can't touch it.
- `src/proxy.ts` sets `frame-ancestors` per business from Settings → Chat widget → Allowed websites; unknown tokens get `'none'`.
- `src/server/widget-actions.ts`: public server actions. Widget token picks the business; a random per-visitor conversation token (stored in the iframe's localStorage) picks the thread. Rate-limited per IP. The widget polls every 8 s for staff replies; the inbox refreshes every 10 s.
- `public/demo-site.html`: fictional host page for demos.

## Notifications (`src/server/notify/`, `src/server/inngest/`)
- `notification_outbox` rows are written in the same transaction as the change: booking requested / confirmed / declined / cancelled / rescheduled / completed / no-show, handoff requested, reminders. The bell menu reads them.
- After commit, `kickOutbox(businessId)` sends one Inngest event (`reception/outbox.kick`). Without Inngest configured it delivers inline with `after()`.
- `deliverOutboxRow` locks the row (`FOR UPDATE SKIP LOCKED`), so a row is never sent twice; failures are recorded and retried (5 attempts, then `failed`).
- Inngest functions (`/api/inngest`): deliver per business (retries 4), sweep every 5 min for rows pending > 2 min, reminders hourly for confirmed appointments 20–26 h ahead (dedupe key `reminder:<id>`, one each).
- Emails (`emailLayout` in `src/server/email.ts`): one plain branded template, text + HTML. Customer: request received (clearly "not confirmed yet"), confirmed, declined, cancelled, new time, reminder. Business email (if `notify_email`): new request / booking, customer waiting for a person. Auth: confirm email, reset password, team invite.
- Delivery is Resend when `RESEND_API_KEY` + `EMAIL_FROM` are set, dry run otherwise; fictional domains never deliver. `EMAIL_CAPTURE_FILE` (tests) records every message.

## Routes
`/` marketing · `/login` `/register` `/forgot-password` `/reset-password` · `/onboarding` · `/app/{overview,inbox,bookings,customers,services,knowledge,settings}` · `/b/[slug]` public booking · `/privacy` (draft).

## Deviations from the brief
- UI primitives are hand-written (`src/components/ui.tsx`, native `<dialog>`) instead of shadcn/Radix, to keep dependencies small. Swap in later if needed.
- Motion: CSS entrances in the app; GSAP ScrollTrigger only for the landing page story (see DESIGN.md).

## Limitations / next
- Real email needs a Resend account + verified sending domain; Inngest Cloud needs an app + keys. Both are config only.
- RLS covers staff reads and simple staff writes; booking engine, AI and public paths still rely on app-level filters (tested).
- Rate limiting on public endpoints is in-memory per instance; needs a shared store before scaling.
- Data Privacy Act: privacy notice is a draft; DPO, retention policy and processing agreements still to do.
