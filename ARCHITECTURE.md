# Architecture (Stage 3)

Next.js 16 App Router (Cache Components on) · TypeScript strict · Tailwind v4 · Neon Postgres + Drizzle · Better Auth (email/password + organization plugin) · Zod · Vitest.

## Tenancy
- One Better Auth **organization** = one tenant. `business` has a unique `organization_id`.
- `src/server/context.ts` resolves the business from the session + `member` row on every request. Client input never chooses the business.
- Roles: `owner` (everything), `admin` = Manager (services, knowledge, hours, bookings, inbox), `member` = Reception staff (inbox, bookings, customer notes). `can()` + `authorize()` enforce this in every server action.
- Every query and mutation filters by `business_id`. Integration tests prove cross-tenant reads/writes fail.
- Postgres RLS: not enabled yet. The app connects with one Neon role, so RLS would need `SET app.business_id` per transaction; planned as defence in depth (see Limitations).

## Booking engine
- `src/server/booking/availability.ts`: pure function. Business hours ∩ staff hours − closures − pending/confirmed bookings (incl. buffer), lead time, max days ahead, slot step. Timezone-aware (stored UTC, shown in business tz, default Asia/Manila).
- `src/server/booking/service.ts`: DB layer. Requests run in a transaction holding per-staff `pg_advisory_xact_lock`, so two simultaneous requests can't take the last slot. Idempotency keys stop duplicate submits.
- Migration `0001_booking_exclusion.sql`: `EXCLUDE USING gist (staff_id WITH =, tstzrange(starts_at, block_ends_at) WITH &&) WHERE status = 'confirmed'`. The database itself refuses double confirmations.
- Status machine: pending → confirmed | declined | cancelled; confirmed → cancelled | completed | no_show. Every change writes `audit_log` and an outbox row (deduped by key).

## AI receptionist (`src/server/ai/`)
- `provider.ts`: model from env (`AI_PROVIDER` = `openai-compatible` | `anthropic`, `AI_MODEL`, `AI_BASE_URL`, `AI_API_KEY`). Nothing hardcoded; pick a cheap model.
- `receptionist.ts`: AI SDK v7 `generateText` with server tools scoped to one business: `getBusinessInformation`, `listServices`, `checkAvailability`, `createBookingRequest` (Zod-validated, requires `customerAgreed: true`, goes through the booking engine, idempotent per slot), `handoffToStaff`.
- Guardrails in the system prompt: only tool facts, no medical advice, never claim confirmed while pending, customer text is not instructions. Max 6 steps, 400 output tokens, 30 s timeout, 1 retry.
- Skips when staff took over or AI is off; hands off when the monthly limit is hit; on provider error saves a safe fallback + handoff (never a booking claim). Token usage → `ai_usage`.
- No provider configured → `faq.ts` keyword matcher. Replies stored with `simulated = true` and labelled "FAQ match" in the inbox and widget. Medical-sounding questions always hand off.
- Privacy: a production provider must have a data processing agreement. Don't route real customer chats through free/unknown routers.

## Website widget
- `public/widget.js` → injects a button + iframe (`/widget/[token]`) inside a shadow root, so host CSS can't touch it.
- `src/proxy.ts` sets `frame-ancestors` per business from Settings → Chat widget → Allowed websites; unknown tokens get `'none'`.
- `src/server/widget-actions.ts`: public server actions. Widget token picks the business; a random per-visitor conversation token (stored in the iframe's localStorage) picks the thread. Rate-limited per IP. The widget polls every 8 s for staff replies; the inbox refreshes every 10 s.
- `public/demo-site.html`: fictional host page for demos.

## Notifications
- `notification_outbox` rows are created inside the same transaction as the booking change. The bell menu reads them. Email is dry-run unless `RESEND_API_KEY` + `EMAIL_FROM` are set. Inngest delivery is Stage 4.

## Routes
`/` marketing · `/login` `/register` `/forgot-password` `/reset-password` · `/onboarding` · `/app/{overview,inbox,bookings,customers,services,knowledge,settings}` · `/b/[slug]` public booking · `/privacy` (draft).

## Deviations from the brief
- UI primitives are hand-written (`src/components/ui.tsx`, native `<dialog>`) instead of shadcn/Radix, to keep dependencies small. Swap in later if needed.
- Motion library not added yet: only CSS entrances (dropdowns, dialogs, drawer, toasts) with a reduced-motion override.

## Limitations / next
- Inngest workers, real email, Playwright E2E suite: Stage 4.
- Rate limiting on public endpoints is in-memory per instance; needs a shared store before scaling.
- Data Privacy Act: privacy notice is a draft; DPO, retention policy and processing agreements still to do.
