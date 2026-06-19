---
name: Agenario project overview
description: Key facts about the Agenario full-stack app — stack, required env vars, critical file locations, and key session decisions.
---

**What it is:** AI-powered production review board for vibe-coded apps. 10 Groq agents analyze a GitHub repo / code paste and return a 0–100 readiness score.

**Required env vars:** DATABASE_URL, SESSION_SECRET, GROQ_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

**AI model:** `llama-3.3-70b-versatile` via Groq SDK, JSON mode, 10 agents in `Promise.all`

**Payments:** Razorpay — no webhooks, signature verified client-side via HMAC SHA256 on `/api/billing/verify`

**Auth:** bcryptjs + express-session (PostgreSQL-backed). Session table created manually (see connect-pg-simple-bundling.md).

**Plans:** Free = 5 scans/month (enforced server-side). Creator = ₹299/mo unlimited.

**Key file:** `artifacts/api-server/src/lib/agents.ts` — all 10 agent prompts live here.

## Workflow note

- **Correct backend workflow:** `artifacts/api-server: API Server` (port 8080). The `Backend API` workflow conflicts with it — ignore it.
- **Correct frontend workflow:** `artifacts/agenario: web`.

## Zod in api-server

`api-server` does NOT have `zod` or `zod/v4` in its own package.json — esbuild will fail to bundle if you import from `zod` directly in api-server routes. Use `@workspace/api-zod` Zod schemas or plain manual validation.

## Phone OTP Registration (added)

- DB columns added via raw SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE; ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;`
- Backend endpoint: `POST /api/auth/send-otp` — OTP stored in `req.session.pendingOtp`, 10-min expiry, dev mode returns `devOtp` in response
- Frontend: 2-step register form (Details → Verify Phone), +91 prefix, data-testid attributes on all inputs
- Rate limiter: 5 OTP sends / 10 min / IP (applied in app.ts)
- Session type for `pendingOtp` declared in `artifacts/api-server/src/types.d.ts`

## playwright-proof.ts TypeScript suppression

`playwright-core` types are missing at the package level — suppressed with `// @ts-ignore` on the dynamic import line.

## Shareable score badge (added)

`ShareBadgeButton` component in scan-results.tsx — copies Markdown/HTML/plain badge to clipboard. Uses shields.io URL format.
