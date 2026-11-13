# Reception

AI receptionist + booking SaaS for appointment businesses in the Philippines (MVP).

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill in the Neon URLs and `BETTER_AUTH_SECRET`.
3. `npm run db:migrate` then `npm run db:seed` (fictional demo data only).
4. `npm run dev -- -p 3107` and open http://localhost:3107

Demo login: `owner@glowstudio.test` (owner) or `staff@glowstudio.test` (reception staff), password = `DEMO_PASSWORD` in `.env`.
Public booking page: `/b/glow-studio`. A second fictional tenant, `/b/smile-lab`, exists for isolation tests.

## Scripts
| Command | What it does |
|---|---|
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint |
| `npm test` | Vitest: unit + integration (integration tests hit the dev Neon DB and clean up after themselves) |
| `npm run build` | Production build |
| `npm run db:generate` / `db:migrate` | Drizzle migrations |
| `npm run db:seed` | Reset and reseed the fictional demo businesses |

See `ARCHITECTURE.md`, `DESIGN.md` and `TESTING.md`.
