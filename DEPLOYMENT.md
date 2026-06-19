# Deploying Agenario to Vercel

## What this sets up

- **Frontend** (React + Vite SPA) → Vercel static CDN  
- **API** (Express server) → Vercel Serverless Function (`/api/handler.mjs`), 60 s max duration, 1 GB RAM  
- Both served from a single Vercel project at the same domain  

---

## Prerequisites

1. [Vercel account](https://vercel.com) (Pro recommended — AI scan responses can take >10 s on large repos)  
2. [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`  
3. Node.js 20+ and pnpm installed locally  
4. A PostgreSQL database reachable from Vercel functions (Neon, Supabase, or Railway Postgres)  

---

## Step 1 — Push code to GitHub

Vercel deploys from Git. Push this repository to GitHub (or GitLab/Bitbucket):

```bash
git init          # if not already a git repo
git add -A
git commit -m "chore: prepare for Vercel deployment"
git remote add origin https://github.com/YOUR_USERNAME/agenario.git
git push -u origin main
```

---

## Step 2 — Import project in Vercel dashboard

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository**  
2. Select your GitHub repo  
3. Leave **Root Directory** as the default (workspace root)  
4. Vercel will detect `vercel.json` automatically — **do not override Framework Preset**  

---

## Step 3 — Set environment variables

In **Vercel → Project → Settings → Environment Variables**, add all of these for **Production** (and Staging if needed):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (e.g. `postgresql://user:pass@host:5432/db?sslmode=require`) |
| `SESSION_SECRET` | Long random string (e.g. `openssl rand -hex 32`) |
| `GROQ_API_KEY` | Your Groq API key |
| `RAZORPAY_KEY_ID` | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `FRONTEND_URL` | Your Vercel deployment URL (e.g. `https://agenario.vercel.app`) |
| `NODE_ENV` | `production` |

**Do not add** `PORT` — Vercel functions ignore it.

---

## Step 4 — Database setup

On your PostgreSQL provider, run the Drizzle schema push once:

```bash
# From your local machine (with DATABASE_URL set to production DB)
DATABASE_URL="postgresql://..." pnpm --filter @workspace/db run push
```

Also create the session table (required by connect-pg-simple):

```sql
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    varchar NOT NULL COLLATE "default",
  "sess"   json    NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
```

---

## Step 5 — Deploy

Trigger a deploy from the Vercel dashboard by pushing to `main`, or run:

```bash
vercel --prod
```

Vercel will run `pnpm install --frozen-lockfile && pnpm run build:vercel` which:
1. Bundles `artifacts/api-server/src/vercel.ts` → `api/handler.mjs` (serverless Express wrapper)  
2. Builds `artifacts/agenario` → `artifacts/agenario/dist/public` (static frontend)

---

## Step 6 — Verify

After deploy, visit:
- `https://your-project.vercel.app/` — landing page  
- `https://your-project.vercel.app/api/healthz` — should return `{"status":"ok"}`  
- `https://your-project.vercel.app/register` — create an account  

---

## Limitations / Notes

| Item | Note |
|---|---|
| **Function timeout** | Vercel Hobby = 10 s; **Pro = 60 s** (set in `vercel.json`). AI scan with 10 parallel Groq agents can take 15–45 s — use Pro. |
| **Cron jobs** | The in-process `node-cron` scheduler won't fire in serverless functions. Add a Vercel Cron in `vercel.json` or use an external scheduler (Upstash, GitHub Actions). |
| **File uploads** | `express-fileupload` stores files in memory — fine for serverless, but files do not persist between invocations. |
| **Cold starts** | First request after idle may be slow (1–3 s). Vercel Pro has "Fluid Compute" which mitigates this. |
| **Replit-only plugins** | The Vite config already guards `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-runtime-error-modal` behind `process.env.REPL_ID` — they won't load on Vercel. |

---

## Rollback to Replit

If you need to run on Replit again, nothing changes — the Replit workflows and `.replit` config are still intact. Just restart the workflows in the Replit workspace.
