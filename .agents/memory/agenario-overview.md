---
name: Agenario project overview
description: Key facts about the Agenario full-stack app — stack, required env vars, critical file locations.
---

**What it is:** AI-powered production review board for vibe-coded apps. 10 Groq agents analyze a GitHub repo / code paste and return a 0–100 readiness score.

**Required env vars:** DATABASE_URL, SESSION_SECRET, GROQ_API_KEY, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

**AI model:** `llama-3.3-70b-versatile` via Groq SDK, JSON mode, 10 agents in `Promise.all`

**Payments:** Razorpay — no webhooks, signature verified client-side via HMAC SHA256 on `/api/billing/verify`

**Auth:** bcryptjs + express-session (PostgreSQL-backed). Session table created manually (see connect-pg-simple-bundling.md).

**Plans:** Free = 1 scan/month (enforced server-side). Pro = unlimited.

**Key file:** `artifacts/api-server/src/lib/agents.ts` — all 10 agent prompts live here.
