# Testing checklist

## Automated (`npm test`): 65 passing on 2026-11-13
- Availability engine: hours, duration at close, buffers, closures, staff hours, lead time, date limits, multi-staff merge.
- Status transitions.
- DB: simultaneous requests for the last slot (one wins), idempotency, exclusion constraint on double confirmation, illegal transitions.
- Tenant isolation: another business can't change, see slots for, or book a different business's records.
- AI (mock model): full booking via tools stays pending, unavailable time refused, human takeover = no reply, provider error = safe fallback + handoff, handoff tool notifies staff, FAQ mode labelled, AI disabled = no reply.

## Manual demo run (done in browser 2026-11-13)
- [x] Log in as demo owner
- [x] Inbox loads from Neon, matches mockup layout at 1440×810
- [x] Public booking `/b/glow-studio`: service → real slots → details + consent → "Request sent" (not confirmed)
- [x] Request appears on Overview + bell; Approve → toast, calendar, audit log
- [x] Knowledge test panel answers with source; unknown → honest handoff text
- [x] 390 px: no horizontal scroll on landing and inbox
- [x] Widget on fictional host page (`/demo-site.html`): FAQ answer, unknown → handoff, staff reply shows in widget
- [x] `frame-ancestors`: allowed sites for a real token, `'none'` for an unknown token
- [ ] Real model replies: needs AI provider keys in `.env`

## Booking-flow tests (mock model, deterministic)
- Full flow service → date → real slots → pick → contact → server summary → yes → pending request; repeated yes = still one request
- Model has no submit path; invented times/prices and "confirmed" claims replaced; >4 times replaced
- Unoffered time refused; "no, change it" reopens; service change resets time; same-date recheck keeps time
- Slot taken between summary and yes → honest message, no booking
- All models down mid-booking → server still reaches summary and books on yes

## Playwright (`npm run test:e2e`): 11 passing on 2026-11-13 (production build, FAQ mode, fresh seed)
- Public booking → staff approves on Overview → customer record + calendar show Confirmed
- Two browsers submit the same slot at once → exactly one succeeds, other sees "just taken"
- Times blocked by an existing request (and overlapping ones) are not shown
- Widget visitor → inbox → staff reply (takeover) → visitor sees it
- Approve the seeded chat request from the inbox
- Other business's owner can't see conversation, customer or bookings; signed-out → login
- 390 px: no horizontal scroll on public pages and all 7 app pages; inbox list → thread

## Live model evaluation (`npm run test:eval`)
- See `tests/eval/RESULTS.md`. Free FreeLLMAPI models are rate-limited; results vary run to run.

## Still to automate (Stage 4)
- Playwright: register → email verification → onboarding (needs a dry-run email capture)
- Screenshot sweep at 1920, 1440, 768, 390
