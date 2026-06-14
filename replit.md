# Agenario

AI-powered production review board that analyzes vibe-coded apps with 10 specialized Groq agents and gives a readiness score before you ship.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/agenario run dev` — run the React frontend (port from env, proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `GROQ_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind + shadcn/ui + Framer Motion (dark navy/neon purple theme)
- API: Express 5 + express-session (PostgreSQL-backed via connect-pg-simple)
- DB: PostgreSQL + Drizzle ORM
- AI: Groq SDK (`llama-3.3-70b-versatile`) — 10 parallel analysis agents
- Payments: Razorpay (HMAC SHA256 signature verification)
- Auth: bcryptjs + express-session
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Where things live

- `artifacts/agenario/` — React + Vite frontend
  - `src/pages/home.tsx` — landing page (all sections, dark theme)
  - `src/pages/login.tsx`, `register.tsx` — auth forms
  - `src/pages/dashboard.tsx` — scan history, usage stats
  - `src/pages/new-scan.tsx` — submit repo/code for analysis
  - `src/pages/scan-results.tsx` — AI report with 10 agent results
  - `src/pages/pricing.tsx` — Razorpay checkout integration
  - `src/contexts/AuthContext.tsx` — global auth state
  - `src/lib/api.ts` — fetch-based API client
- `artifacts/api-server/src/routes/`
  - `auth.ts` — register, login, logout, me
  - `scans.ts` — list, create (triggers Groq agents), get by id
  - `billing.ts` — Razorpay create-order, verify, status
- `artifacts/api-server/src/lib/agents.ts` — 10 parallel Groq agents
- `lib/db/src/schema/index.ts` — users, scans, scan_issues tables
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for codegen)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval generates Zod schemas + React Query hooks; server validates with those same Zod schemas
- Sessions stored in PostgreSQL (`session` table created manually via SQL, not `createTableIfMissing` — the latter fails after esbuild bundling because it can't find `table.sql`)
- 10 Groq agents run in parallel via `Promise.all`, each analyzes a specific dimension (security, performance, auth, etc.)
- Free plan: 1 scan/month enforced server-side; Pro plan: unlimited scans
- Razorpay webhook-free: payment verified client-side via HMAC SHA256 signature check on `/api/billing/verify`

## Product

Users paste a GitHub URL or code snippet, Agenario runs 10 specialized AI agents in parallel (security audit, auth hardening, data exposure, performance, error handling, UX, scalability, dependency, environment, OWASP Top 10), returns a 0–100 readiness score with actionable issues, then optionally suggests 1-click fix prompts. Free tier: 1 scan/month. Pro tier: unlimited scans + priority queue via Razorpay payment.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `connect-pg-simple` with `createTableIfMissing: true` fails after esbuild bundling. Create the `session` table manually in the DB instead.
- esbuild bundles to ESM; the banner in `build.mjs` patches `globalThis.require`, `__filename`, `__dirname` for CJS-only packages like express.
- `pnpm run typecheck` (not `build`) to verify artifact packages — `build` needs `PORT`/`BASE_PATH` from workflow env.
- API routes must handle their full base path (`/api/...`) since the proxy does not rewrite paths.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
