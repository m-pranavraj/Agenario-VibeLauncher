# Agenario

AI-powered production review board for vibe-coded apps. Multi-dimensional analysis (security, compliance, revenue, UX, performance, reliability, and more) with a 0–100 launch readiness score, board-memo style report, and 1-click fix prompts.

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
- Frontend: React + Vite + Tailwind + shadcn/ui + Framer Motion (iOS black/frosted glass design system)
- API: Express 5 + express-session (PostgreSQL-backed via connect-pg-simple)
- DB: PostgreSQL + Drizzle ORM
- AI: Groq SDK (`llama-3.3-70b-versatile`) — 10 parallel analysis dimensions (security, compliance, revenue, performance, UX, reliability, data integrity, observability, AI code quality, founder blind spots)
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
  - `src/pages/scan-results.tsx` — board-memo style report: verdict, exec summary, top 3 action plan, full findings
  - `src/pages/pricing.tsx` — Razorpay checkout integration
  - `src/contexts/AuthContext.tsx` — global auth state
  - `src/lib/api.ts` — fetch-based API client
- `artifacts/api-server/src/routes/`
  - `auth.ts` — register, login, logout, me
  - `scans.ts` — list, create (triggers Groq agents), get by id
  - `billing.ts` — Razorpay create-order, verify, status
- `artifacts/api-server/src/lib/agents.ts` — 10 parallel Groq analysis dimensions (see roles above)
- `lib/db/src/schema/index.ts` — users, scans, scan_issues tables
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for codegen)

## Architecture decisions

- Contract-first API: OpenAPI spec → Orval generates Zod schemas + React Query hooks; server validates with those same Zod schemas
- Sessions stored in PostgreSQL (`session` table created manually via SQL, not `createTableIfMissing` — the latter fails after esbuild bundling because it can't find `table.sql`)
- 10 analysis dimensions run in parallel via `Promise.all` — security, compliance, revenue, performance, UX, reliability, data, observability, AI quality, founder blind spots
- Free plan: 2 scans/month enforced server-side; Creator: 12 scans/month; Enterprise: custom/unlimited
- Razorpay webhook-free: payment verified client-side via HMAC SHA256 signature check on `/api/billing/verify`
- Creator plan: ₹299/mo (29900 paise); Enterprise: custom via email

## Product

Users submit a GitHub repo, ZIP, URL, or description. Agenario runs multi-dimensional analysis (never reveals internal agent count or names in UI) across security, compliance (GDPR/OWASP/PCI-DSS), revenue intelligence, performance, UX, reliability, data integrity, observability, AI code quality, and founder blind spots. Returns a 0–100 readiness score, board-memo style executive summary, top 3 action plan, and 1-click fix prompts. Free tier: 2 scans/month. Creator: ₹299/mo with 12 scans/month. Enterprise: custom. Privacy: code never stored.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `connect-pg-simple` with `createTableIfMissing: true` fails after esbuild bundling. Create the `session` table manually in the DB instead.
- esbuild bundles to ESM; the banner in `build.mjs` patches `globalThis.require`, `__filename`, `__dirname` for CJS-only packages like express.
- `pnpm run typecheck` (not `build`) to verify artifact packages — `build` needs `PORT`/`BASE_PATH` from workflow env.
- API routes must handle their full base path (`/api/...`) since the proxy does not rewrite paths.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
