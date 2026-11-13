# Testing checklist

## Automated (`npm test`): 28 passing on 2026-11-13
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

## Still to automate (Stage 4)
- Playwright E2E: register → verify → onboarding → service → booking → approve
- Screenshot sweep at 1920, 1440, 768, 390
