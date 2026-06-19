# Agenario — Developer Progress Document

> **Last updated:** June 14, 2026  
> **Status:** MVP fully built and running. Both frontend and backend live on Replit.  
> **One-liner:** Agenario is an AI-powered production review board that runs 10 specialized agents against a vibe-coded app and returns a 0–100 launch-readiness score with actionable fix prompts.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Database Schema](#4-database-schema)
5. [API Contract (OpenAPI)](#5-api-contract-openapi)
6. [Backend — API Server](#6-backend--api-server)
7. [AI Agents (Groq)](#7-ai-agents-groq)
8. [Frontend — React App](#8-frontend--react-app)
9. [Authentication Flow](#9-authentication-flow)
10. [Payments — Razorpay](#10-payments--razorpay)
11. [Environment Variables](#11-environment-variables)
12. [Running Locally](#12-running-locally)
13. [Codegen Workflow](#13-codegen-workflow)
14. [Known Gotchas](#14-known-gotchas)
15. [What's Left / Next Steps](#15-whats-left--next-steps)

---

## 1. Product Overview

Agenario lets developers submit their vibe-coded (AI-generated) apps for a full pre-launch review. Instead of shipping and discovering bugs in production, users get a structured AI audit from 10 specialized agents before they deploy.

**User journey:**
1. Sign up (free) → 1 scan per month
2. Submit a GitHub URL or paste raw code + optional app description
3. 10 Groq AI agents run in parallel, each analyzing a different risk dimension
4. Get a **0–100 Launch Readiness Score** + list of issues with **copy-paste fix prompts** for Cursor/Copilot
5. Upgrade to Creator/Pro/Team via Razorpay for unlimited scans

**Plans:**
| Plan | Price (INR) | Scans | Notes |
|------|-------------|-------|-------|
| Free | ₹0 | 1/month | No credit card |
| Creator | ₹499 | Unlimited | For indie hackers |
| Pro | ₹2,999 | Unlimited | Priority queue |
| Team | ₹4,999 | Unlimited | For agencies |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Wouter (routing) |
| Backend | Node.js 24, Express 5, TypeScript, Pino (logging), esbuild (ESM bundle) |
| Database | PostgreSQL via Drizzle ORM + drizzle-zod |
| AI | Groq SDK — `llama-3.3-70b-versatile`, JSON mode |
| Payments | Razorpay (India) — HMAC SHA256 signature verification |
| Auth | bcryptjs + express-session backed by PostgreSQL (connect-pg-simple) |
| Validation | Zod v4 (both server and client use same generated schemas) |
| API contract | OpenAPI 3.1 → Orval codegen → React Query hooks + Zod schemas |
| Package manager | pnpm workspaces |

---

## 3. Monorepo Structure

```
/
├── artifacts/
│   ├── agenario/                  # React + Vite frontend (serves at path /)
│   │   └── src/
│   │       ├── App.tsx            # Root: providers, Wouter router
│   │       ├── main.tsx           # Entry point
│   │       ├── index.css          # Tailwind + theme variables (dark navy/neon purple)
│   │       ├── contexts/
│   │       │   └── AuthContext.tsx # Global auth state (user, login, register, logout)
│   │       ├── lib/
│   │       │   ├── api.ts         # Typed fetch-based API client for all endpoints
│   │       │   └── utils.ts       # cn() for Tailwind class merging
│   │       ├── hooks/
│   │       │   ├── use-toast.ts   # Toast notification hook
│   │       │   └── use-mobile.tsx # Mobile viewport detection
│   │       ├── pages/
│   │       │   ├── home.tsx       # Landing page (hero, agents, pricing, features)
│   │       │   ├── login.tsx      # Email/password login form
│   │       │   ├── register.tsx   # Registration form
│   │       │   ├── dashboard.tsx  # Scan history + usage stats
│   │       │   ├── new-scan.tsx   # Submit a new scan
│   │       │   ├── scan-results.tsx # Per-agent results + score + fix prompts
│   │       │   ├── pricing.tsx    # Razorpay checkout UI
│   │       │   └── not-found.tsx  # 404 page
│   │       └── components/ui/     # ~60 shadcn/Radix UI components
│   │
│   └── api-server/                # Express 5 API (serves at path /api)
│       └── src/
│           ├── index.ts           # Start server, read PORT from env
│           ├── app.ts             # Express app: CORS, sessions, middleware, mount /api router
│           ├── types.d.ts         # Augments express-session: session.userId: number
│           ├── lib/
│           │   ├── agents.ts      # 10 Groq agents, runAllAgents(), score calculator
│           │   └── logger.ts      # Pino logger singleton
│           ├── routes/
│           │   ├── index.ts       # Aggregates all sub-routers
│           │   ├── health.ts      # GET /api/healthz
│           │   ├── auth.ts        # POST /register /login /logout, GET /me
│           │   ├── scans.ts       # GET /scans, POST /scans, GET /scans/:id
│           │   └── billing.ts     # POST /billing/create-order /billing/verify, GET /billing/status
│           └── middlewares/       # (reserved for future middleware)
│
├── lib/
│   ├── db/                        # @workspace/db — Drizzle ORM
│   │   └── src/
│   │       ├── index.ts           # Exports: db (Drizzle instance), pool (pg Pool)
│   │       └── schema/
│   │           ├── index.ts       # Re-exports all tables
│   │           ├── users.ts       # users table + insertUserSchema
│   │           ├── scans.ts       # scans table + insertScanSchema
│   │           └── scan-issues.ts # scan_issues table + insertScanIssueSchema
│   │
│   ├── api-spec/                  # @workspace/api-spec — Source of truth
│   │   ├── openapi.yaml           # Full OpenAPI 3.1 spec (all endpoints + schemas)
│   │   └── orval.config.ts        # Orval codegen config → outputs to api-zod & api-client-react
│   │
│   ├── api-zod/                   # @workspace/api-zod — Generated Zod schemas
│   │   └── src/
│   │       ├── index.ts           # Barrel export
│   │       └── generated/api.ts   # All Zod schemas (RegisterUserBody, CreateScanBody, etc.)
│   │
│   └── api-client-react/          # @workspace/api-client-react — Generated React Query hooks
│       └── src/
│           └── generated/         # useListScans(), useCreateScan(), etc.
│
├── scripts/                       # @workspace/scripts — utility scripts
├── pnpm-workspace.yaml            # Workspace package discovery + catalog pins
├── tsconfig.base.json             # Shared strict TS defaults
├── tsconfig.json                  # Root TS solution (libs only)
└── package.json                   # Root tooling (typecheck, build)
```

---

## 4. Database Schema

All tables are in PostgreSQL, managed by Drizzle ORM. Schema files are in `lib/db/src/schema/`.

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | auto-increment |
| `email` | text UNIQUE | stored lowercase |
| `name` | text | display name |
| `password_hash` | text | bcrypt (cost 12) |
| `plan` | text | `free` \| `creator` \| `pro` \| `team` |
| `razorpay_customer_id` | text nullable | set on payment |
| `created_at` | timestamptz | auto |
| `updated_at` | timestamptz | auto-updated on change |

### `scans`
| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `user_id` | integer | FK → users.id (not enforced in Drizzle yet) |
| `source_type` | text | `github` \| `code` \| `url` |
| `source_input` | text | GitHub URL or raw code |
| `app_description` | text nullable | optional context for agents |
| `status` | text | `pending` → `running` → `completed` \| `failed` |
| `score` | integer nullable | 0–100, set on completion |
| `summary` | text nullable | human-readable verdict |
| `issue_counts` | jsonb nullable | `{ critical, high, medium, low }` |
| `created_at` | timestamptz | auto |
| `completed_at` | timestamptz nullable | set when agents finish |

### `scan_issues`
| Column | Type | Notes |
|--------|------|-------|
| `id` | serial PK | |
| `scan_id` | integer | FK → scans.id |
| `agent_name` | text | e.g. "Security Launch Agent" |
| `severity` | text | `critical` \| `high` \| `medium` \| `low` |
| `title` | text | short issue title |
| `description` | text | full explanation |
| `fix_prompt` | text | ready-to-paste Cursor/Copilot prompt |

### `session` (managed by connect-pg-simple, not Drizzle)
> Created manually via SQL. Do NOT use `createTableIfMissing` in PgStore config — it fails after esbuild bundling.

```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```

---

## 5. API Contract (OpenAPI)

**Source of truth:** `lib/api-spec/openapi.yaml`  
**Base URL:** `/api`

### Auth Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/auth/register` | Register new user, sets session | No |
| POST | `/api/auth/login` | Login, sets session cookie | No |
| POST | `/api/auth/logout` | Destroys session | No |
| GET | `/api/auth/me` | Returns current user | Yes → 401 |

### Scan Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| GET | `/api/scans` | List all scans for current user | Yes |
| POST | `/api/scans` | Create scan + run 10 agents (synchronous) | Yes |
| GET | `/api/scans/:id` | Get scan detail + all issues | Yes |

**POST /api/scans body:**
```json
{
  "sourceType": "github",
  "sourceInput": "https://github.com/user/repo",
  "appDescription": "A SaaS dashboard for analytics"
}
```
`sourceType` can be: `github`, `code`, or `url`.

### Billing Endpoints
| Method | Path | Description | Auth Required |
|--------|------|-------------|---------------|
| POST | `/api/billing/create-order` | Create Razorpay order, returns `orderId` + `keyId` | Yes |
| POST | `/api/billing/verify` | Verify HMAC signature, upgrade user plan | Yes |
| GET | `/api/billing/status` | Get current plan | Yes |

**POST /api/billing/create-order body:**
```json
{ "plan": "creator" }
```
Valid plans: `creator`, `pro`, `team`

**POST /api/billing/verify body:**
```json
{
  "razorpayOrderId": "order_xxx",
  "razorpayPaymentId": "pay_xxx",
  "razorpaySignature": "sha256_hex",
  "plan": "creator"
}
```

### Health
| Method | Path | Response |
|--------|------|----------|
| GET | `/api/healthz` | `{ "status": "ok" }` |

---

## 6. Backend — API Server

**Package:** `@workspace/api-server`  
**Entry:** `artifacts/api-server/src/index.ts`  
**Build:** esbuild → `dist/index.mjs` (ESM bundle, ~3.3MB)  
**Runs on:** Port from `PORT` env var (default 8080 in workflow config)

### Middleware stack (in order, `app.ts`)

1. **Pino HTTP** — structured request/response logging (never use `console.log`)
2. **CORS** — `origin: true, credentials: true` (allows cookies from any origin in dev)
3. **express.json()** + **express.urlencoded()** — body parsing
4. **express-session** — PostgreSQL-backed sessions via connect-pg-simple
   - Cookie: `httpOnly: true`, `maxAge: 7 days`, `secure: true` in prod, `sameSite: none` in prod / `lax` in dev
5. **Router** mounted at `/api`

### Route files

**`routes/auth.ts`**
- Validates bodies with `RegisterUserBody` / `LoginUserBody` from `@workspace/api-zod`
- Hashes passwords with `bcrypt.hash(password, 12)`
- Sets `req.session.userId` on successful register/login
- `GET /auth/me` reads session, queries DB, returns user

**`routes/scans.ts`**
- `requireAuth()` helper checks `req.session.userId`, returns 401 if missing
- Free plan check: counts scans in current calendar month, blocks at ≥1
- Creates scan row with `status: "running"`, then calls `runAllAgents()`
- Saves all issues from all agents to `scan_issues` table
- Updates scan with final `score`, `summary`, `issueCounts`, `status: "completed"`
- Full response is synchronous (agents can take 10–30 seconds)

**`routes/billing.ts`**
- `PLAN_PRICES`: `creator` = ₹499, `pro` = ₹2,999, `team` = ₹4,999 (in paise)
- Creates Razorpay order → client opens Razorpay checkout modal
- Verify endpoint: `HMAC-SHA256(orderId + "|" + paymentId, RAZORPAY_KEY_SECRET)` must match signature
- On success: updates `users.plan` in DB

### Logging convention
Use `req.log` inside route handlers. Use `logger` (from `lib/logger.ts`) outside request context.  
**Never use `console.log` in server code.**

---

## 7. AI Agents (Groq)

**File:** `artifacts/api-server/src/lib/agents.ts`  
**Model:** `llama-3.3-70b-versatile` via Groq SDK  
**Mode:** JSON response format (`response_format: { type: "json_object" }`)

### The 10 Agents

| # | Agent Name | What it catches |
|---|-----------|----------------|
| 1 | **Functional QA Agent** | Broken user flows, missing validations, edge case crashes, missing error handling |
| 2 | **Cleanup Agent** | Dead code, unused files, duplicate components, AI-generated boilerplate |
| 3 | **Architecture Agent** | Poor structure, tight coupling, scalability bottlenecks, technical debt |
| 4 | **Security Launch Agent** | Exposed API keys, auth misconfigurations, insecure endpoints, XSS, SQL injection |
| 5 | **Performance Agent** | Large bundles, N+1 queries, missing caching, render-blocking resources |
| 6 | **UX Agent** | Missing loading states, poor mobile UX, accessibility violations, bad error messages |
| 7 | **Reliability Agent** | Missing error boundaries, no retry logic, race conditions, no fallback UI |
| 8 | **Observability Agent** | Missing logging, no error tracking, no analytics, no health checks |
| 9 | **Growth Agent** | Missing analytics events, no funnel tracking, missing SEO basics |
| 10 | **AI Smell Agent** | AI-specific anti-patterns: hallucinated APIs, duplicate logic, oversized files |

### How scoring works

All 10 agents run via `Promise.all()` simultaneously. Issues are collected and scored:

```
penalty = min(critical × 10, 50)
        + min(high × 5, 30)
        + min(medium × 2, 15)
        + min(low × 1, 5)

score = max(0, 100 - penalty)
```

Score interpretation:
- **80–100:** Good launch readiness
- **60–79:** Moderate launch risk
- **0–59:** High risk — do not deploy

### Issue response format (per agent)
```json
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "title": "Short specific issue title",
      "description": "Clear explanation of the problem",
      "fixPrompt": "Ready-to-paste Cursor/Copilot prompt to fix this"
    }
  ]
}
```
Each agent returns 2–5 issues. If an agent fails (network, timeout, Groq error), it returns an empty issues array and logs the error — it does not crash the overall scan.

---

## 8. Frontend — React App

**Package:** `@workspace/agenario`  
**Entry:** `artifacts/agenario/src/main.tsx`  
**Runs on:** Port from `PORT` env var (Vite dev server, proxied at `/`)

### Routing (Wouter)

| Path | Component | Auth guard |
|------|-----------|-----------|
| `/` | `home.tsx` | None |
| `/login` | `login.tsx` | Redirects to `/dashboard` if logged in |
| `/register` | `register.tsx` | Redirects to `/dashboard` if logged in |
| `/dashboard` | `dashboard.tsx` | Redirects to `/login` if not logged in |
| `/scans/new` | `new-scan.tsx` | Redirects to `/login` if not logged in |
| `/scans/:id` | `scan-results.tsx` | Redirects to `/login` if not logged in |
| `/pricing` | `pricing.tsx` | None (can be viewed, payment requires auth) |
| `*` | `not-found.tsx` | None |

Router is wrapped with `WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}` for path-based proxy compatibility.

### Key components

**`AuthContext.tsx`**
```tsx
const { user, loading, login, register, logout, refresh } = useAuth();
```
- Calls `GET /api/auth/me` on mount to restore session
- `user` is `null` when not authenticated, `User` object when authenticated
- `loading` is `true` until the initial `/me` check resolves

**`lib/api.ts`** — all API calls go through this typed client:
```ts
api.auth.register({ name, email, password })
api.auth.login({ email, password })
api.auth.logout()
api.auth.me()
api.scans.list()
api.scans.get(id)
api.scans.create({ sourceType, sourceInput, appDescription })
api.billing.createOrder(plan)
api.billing.verify({ razorpayOrderId, razorpayPaymentId, razorpaySignature, plan })
api.billing.status()
```
All requests include `credentials: "include"` for cookie-based auth.

### Page summaries

**`home.tsx`** — Full marketing landing page with:
- Animated hero section (Framer Motion) with before/after workflow comparison
- Dashboard mockup showing sample scan results
- All 10 agent cards with descriptions
- 3-step "how it works" section
- Pricing cards (Free / Creator / Pro / Team)
- Features grid (12 features)
- "For Who" section (5 user types)
- Dark navy + neon purple theme throughout

**`dashboard.tsx`** — Shows list of past scans with score badges, status, and links to results. Shows current plan + usage.

**`new-scan.tsx`** — Form with:
- Source type selector: GitHub URL / Paste Code / App URL
- Source input field (dynamic label)
- Optional app description textarea
- Runs `POST /api/scans`, shows loading state during analysis, redirects to results

**`scan-results.tsx`** — Shows:
- Readiness score (0–100) with color coding
- Summary text
- Issue count breakdown (critical / high / medium / low)
- Per-agent accordion/cards with issues sorted by severity
- Each issue shows: title, description, copy button for fixPrompt

**`pricing.tsx`** — Shows 4 plan cards. On upgrade:
1. Calls `POST /api/billing/create-order`
2. Opens Razorpay checkout modal (script loaded dynamically from `https://checkout.razorpay.com/v1/checkout.js`)
3. On payment success, calls `POST /api/billing/verify`
4. Updates local auth context on success

**`login.tsx` / `register.tsx`** — Clean dark-themed auth forms with:
- Form validation
- Error display
- Redirect to `/dashboard` on success
- Cross-links to each other

---

## 9. Authentication Flow

```
User → POST /api/auth/register
     ← { id, email, name, plan, createdAt }
     Session cookie set (connect-pg-simple → PostgreSQL session table)

User → GET /api/auth/me (with cookie)
     ← { id, email, name, plan, createdAt } | 401

User → POST /api/auth/logout
     ← { message: "Logged out" }
     Session destroyed in DB
```

Session cookie settings:
- `httpOnly: true` — not accessible to JS
- `maxAge: 7 days`
- `secure: true` in production only
- `sameSite: "none"` in production, `"lax"` in development

**Password hashing:** `bcrypt.hash(password, 12)` — 12 rounds

---

## 10. Payments — Razorpay

**Payment provider:** Razorpay (India, INR)  
**No webhooks** — payment is verified entirely via HMAC signature on the server.

### Full payment flow

```
Frontend                        Backend                      Razorpay
   |                               |                            |
   | POST /billing/create-order    |                            |
   |------------------------------>|                            |
   |                               | razorpay.orders.create()  |
   |                               |--------------------------->|
   |                               |<---------------------------|
   |<------------------------------|  { orderId, keyId, amount }|
   |                               |                            |
   | Open Razorpay modal           |                            |
   | (user pays with UPI/card)     |                            |
   |<------------------------------ payment success ------------|
   |  { orderId, paymentId, signature }                         |
   |                               |                            |
   | POST /billing/verify          |                            |
   |------------------------------>|                            |
   |                   HMAC-SHA256(orderId|paymentId, secret)   |
   |                   == signature? → update users.plan        |
   |<------------------------------|  { success: true, plan }   |
```

### Razorpay checkout script integration
The `pricing.tsx` page dynamically loads the Razorpay checkout SDK:
```ts
const script = document.createElement("script");
script.src = "https://checkout.razorpay.com/v1/checkout.js";
```

The checkout options pass:
- `key`: Razorpay publishable key (from create-order response)
- `amount`, `currency: "INR"`, `order_id`
- `handler(response)`: calls `/billing/verify` then refreshes auth context

---

## 11. Environment Variables

All must be set before starting either server.

| Variable | Used By | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | api-server, db lib | PostgreSQL connection string |
| `SESSION_SECRET` | api-server | Signing express-session cookies |
| `GROQ_API_KEY` | api-server | Groq LLM API for 10 agents |
| `RAZORPAY_KEY_ID` | api-server | Razorpay publishable key (also sent to frontend) |
| `RAZORPAY_KEY_SECRET` | api-server | For HMAC signature verification — NEVER sent to client |
| `PORT` | api-server, agenario | Injected by Replit workflow config |
| `BASE_PATH` | agenario (Vite) | Injected by Replit workflow config |
| `NODE_ENV` | api-server | Controls cookie security settings |

---

## 12. Running Locally

### Prerequisites
- Node.js 24+
- pnpm 10+
- PostgreSQL database (set `DATABASE_URL`)
- All env vars from section 11

### Start the API server
```bash
pnpm --filter @workspace/api-server run dev
```
This runs: `build` (esbuild) → `start` (node dist/index.mjs)  
Available at `localhost:8080` (or `localhost:80/api` via proxy)

### Start the frontend
```bash
pnpm --filter @workspace/agenario run dev
```
Available at `localhost:80` via proxy

### Database setup (first time)
```bash
# Push Drizzle schema to PostgreSQL
pnpm --filter @workspace/db run push

# Create the session table (connect-pg-simple, not managed by Drizzle)
psql "$DATABASE_URL" -c "
CREATE TABLE IF NOT EXISTS \"session\" (
  \"sid\" varchar NOT NULL COLLATE \"default\",
  \"sess\" json NOT NULL,
  \"expire\" timestamp(6) NOT NULL,
  CONSTRAINT \"session_pkey\" PRIMARY KEY (\"sid\") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS \"IDX_session_expire\" ON \"session\" (\"expire\");
"
```

### Typecheck all packages
```bash
pnpm run typecheck
```

---

## 13. Codegen Workflow

The API contract lives in `lib/api-spec/openapi.yaml`. Any time you add/modify an endpoint:

1. Edit `openapi.yaml`
2. Run codegen:
   ```bash
   pnpm --filter @workspace/api-spec run codegen
   ```
3. This generates:
   - `lib/api-zod/src/generated/api.ts` — Zod schemas for runtime validation
   - `lib/api-client-react/src/generated/` — React Query hooks
4. Use the generated Zod schemas in route handlers for input validation:
   ```ts
   import { RegisterUserBody } from "@workspace/api-zod";
   const parsed = RegisterUserBody.safeParse(req.body);
   ```
5. The frontend `lib/api.ts` is a manually maintained typed client (not generated), kept in sync with the OpenAPI spec manually.

**Do NOT change the `info.title` in `openapi.yaml`** — it controls generated file names.

---

## 14. Known Gotchas

### connect-pg-simple + esbuild bundling
`createTableIfMissing: true` in PgStore config breaks after esbuild bundling because the package tries to read `table.sql` from a path relative to itself, which doesn't exist in the bundle. **Solution:** Always create the session table via raw SQL (see section 12). The config in `app.ts` intentionally omits `createTableIfMissing`.

### Scan creation is synchronous
`POST /api/scans` runs all 10 Groq agents and waits for them all before responding. This can take 10–30 seconds. The client's loading state needs to handle this. **Future improvement:** switch to async (create scan row → return 202 → poll status).

### Free plan check is approximate
The free plan limit counts scans since the first day of the current calendar month using JS `Date` in UTC. This is done in-memory by filtering the DB results (not a DB-level query with date filtering). For scale, replace with a SQL `WHERE created_at >= date_trunc('month', now())`.

### Cookie cross-origin in production
Session cookie uses `sameSite: "none", secure: true` in production. This requires the API and frontend to be served from the same top-level domain (they are — both route through the Replit proxy). If you deploy to separate domains, you'll need to add explicit `domain:` to the cookie config.

### pnpm vs npm scripts
Never run `pnpm dev` at the workspace root — there's no root `dev` script by design. Always use `--filter @workspace/<name> run dev`.

### Verify artifacts with typecheck, not build
```bash
pnpm --filter @workspace/api-server run typecheck  # ✅
pnpm --filter @workspace/api-server run build       # ❌ needs PORT/BASE_PATH from workflow
```

---

## 15. What's Left / Next Steps

These are not built yet — prioritized roughly by impact:

### High priority
- [ ] **Async scan processing** — Return `202 Accepted` immediately, have client poll `GET /scans/:id` until `status === "completed"`. Add a loading/polling UI state in `scan-results.tsx`.
- [ ] **GitHub OAuth** — Let users sign in with GitHub so they can authorize private repo access for more accurate scanning
- [ ] **Real GitHub repo reading** — Currently agents analyze based on the URL/description. Integrate GitHub API (Octokit) to actually fetch and send file contents to agents for better accuracy.
- [ ] **Email on scan complete** — Send a summary email when async scan finishes (use Resend or Nodemailer)

### Medium priority
- [ ] **Razorpay webhooks** — Add `POST /api/billing/webhook` to handle payment events server-side (currently relying on client-side verification only)
- [ ] **Fix prompt "copy" toast** — Verify the clipboard copy + toast notification works correctly in `scan-results.tsx`
- [ ] **Scan share link** — Public read-only URL for a scan report (for sharing with team/clients)
- [ ] **Rate limiting** — Add express-rate-limit to auth endpoints to prevent brute force

### Low priority / Nice to have
- [ ] **Admin dashboard** — View all users, scans, revenue
- [ ] **Referral system** — Invite 3 friends → get 3 extra scans free
- [ ] **Scan history search/filter** — By date, score, status
- [ ] **Dark/light mode toggle** — Currently locked to dark mode
- [ ] **Mobile app** — Expo wrapper around the same API
- [ ] **Stripe alternative** — For international (non-India) users

---

## Appendix: Key File Quick Reference

| What you want to change | File to edit |
|------------------------|-------------|
| Add a new API endpoint | `lib/api-spec/openapi.yaml` → run codegen → `artifacts/api-server/src/routes/` |
| Change DB schema | `lib/db/src/schema/*.ts` → `pnpm --filter @workspace/db run push` |
| Edit AI agent prompts/roles | `artifacts/api-server/src/lib/agents.ts` |
| Change pricing | `artifacts/api-server/src/routes/billing.ts` (`PLAN_PRICES`) + `artifacts/agenario/src/pages/pricing.tsx` |
| Change landing page | `artifacts/agenario/src/pages/home.tsx` |
| Add a new frontend page | Create `artifacts/agenario/src/pages/yourpage.tsx` → add route in `artifacts/agenario/src/App.tsx` |
| Change session behavior | `artifacts/api-server/src/app.ts` |
| Change score formula | `artifacts/api-server/src/lib/agents.ts` (`runAllAgents` function) |
