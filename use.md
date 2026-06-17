# Agenario — Complete Setup Guide

Everything you need: run locally, deploy to Vercel + Render, connect your domain.

---

## Part 1 — Run Locally in VS Code

### Prerequisites

- **Node.js 20+** → [nodejs.org](https://nodejs.org)
- **pnpm 9+** → `npm install -g pnpm`
- **PostgreSQL 15+** → local install or Docker (see below)
- **Git** → [git-scm.com](https://git-scm.com)
- **VS Code** → [code.visualstudio.com](https://code.visualstudio.com)

### Step 1 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/agenario.git
cd agenario
pnpm install
```

### Step 2 — Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL (local)
DATABASE_URL=postgresql://postgres:password@localhost:5432/agenario

# Session (any long random string)
SESSION_SECRET=change-this-to-a-random-64-char-string

# AI — free at console.groq.com
GROQ_API_KEY=gsk_...

# Payments — free test keys at dashboard.razorpay.com
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Optional: Cerebras AI fallback
# CEREBRAS_API_KEY=...
```

> **Never commit `.env`.** It is already in `.gitignore`.

### Step 3 — Database Setup

**Option A — Local Postgres:**
```bash
# Create the database
psql -U postgres -c "CREATE DATABASE agenario;"

# Push schema
pnpm --filter @workspace/db run push

# Create the session table (required — do NOT skip)
psql -U postgres -d agenario -c "
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON    NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
"
```

**Option B — Docker Postgres:**
```bash
docker run -d --name agenario-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=agenario \
  -p 5432:5432 postgres:16

# Then run the push + session table SQL above
pnpm --filter @workspace/db run push
```

### Step 4 — Run

Open **two terminals** in VS Code (`Ctrl+Shift+5` for split terminal):

**Terminal 1 — API Server** (port 8080):
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend** (port 5173):
```bash
pnpm --filter @workspace/agenario run dev
```

Open **http://localhost:5173** → the frontend proxies `/api/*` to port 8080 automatically.

### Recommended VS Code Extensions

Install these from the Extensions panel (`Ctrl+Shift+X`):
- **ESLint** — `dbaeumer.vscode-eslint`
- **Tailwind CSS IntelliSense** — `bradlc.vscode-tailwindcss`
- **Prettier** — `esbenp.prettier-vscode`

### Useful Commands

| Command | What it does |
|---|---|
| `pnpm run typecheck` | TypeScript check across all packages |
| `pnpm run build` | Full build (types + bundle) |
| `pnpm --filter @workspace/db run push` | Push DB schema changes |
| `pnpm --filter @workspace/db run studio` | Drizzle Studio (visual DB browser at port 4983) |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks from OpenAPI spec |

---

## Part 2 — Deploy Backend on Render

The API server (`artifacts/api-server`) runs as a Node.js web service on Render.

### Step 1 — Create a Render Account

Go to [render.com](https://render.com) and sign up (free tier available).

### Step 2 — Create a Postgres Database on Render

1. Dashboard → **New** → **PostgreSQL**
2. Name it `agenario-db`, choose the free region
3. Click **Create Database**
4. Copy the **External Database URL** (looks like `postgresql://user:pass@host/agenario`)

### Step 3 — Set Up the Session Table on Render's DB

Connect to your Render DB and run:
```sql
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON    NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
```

You can use [TablePlus](https://tableplus.com), `psql`, or the Render Shell.

### Step 4 — Create the Web Service

1. Dashboard → **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Root Directory**: `artifacts/api-server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install -g pnpm && pnpm install --frozen-lockfile && pnpm run build`
   - **Start Command**: `node dist/index.mjs`
   - **Port**: `8080`

### Step 5 — Environment Variables on Render

In the service dashboard → **Environment** tab, add:

```
DATABASE_URL        = <your Render Postgres external URL>
SESSION_SECRET      = <long random string, min 64 chars>
GROQ_API_KEY        = gsk_...
RAZORPAY_KEY_ID     = rzp_live_...
RAZORPAY_KEY_SECRET = ...
NODE_ENV            = production
PORT                = 8080
```

> For production use **live** Razorpay keys (not test keys).

### Step 6 — Note Your Backend URL

After deploy, Render gives you a URL like `https://agenario-api.onrender.com`. Copy it — you'll need it for the frontend.

---

## Part 3 — Deploy Frontend on Vercel

### Step 1 — Create a Vercel Account

Go to [vercel.com](https://vercel.com) and sign up.

### Step 2 — Import the Project

1. Click **Add New → Project**
2. Import your GitHub repo
3. Set **Root Directory** to `artifacts/agenario`
4. Framework: **Vite** (auto-detected)

### Step 3 — Environment Variables on Vercel

In Project Settings → **Environment Variables**, add:

```
VITE_API_URL = https://agenario-api.onrender.com
```

### Step 4 — Configure API Proxy

Update `artifacts/agenario/vite.config.ts` to use the production API URL:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

> For production (Vercel), API calls should go directly to your Render URL. Update `artifacts/agenario/src/lib/api.ts` to use `process.env.VITE_API_URL` as the base when set.

### Step 5 — Deploy

Click **Deploy**. Vercel builds and deploys in ~2 minutes. You'll get a URL like `https://agenario.vercel.app`.

---

## Part 4 — Connect Your Domain (agenario.tech)

### On Vercel (Frontend)

1. Project → **Settings** → **Domains**
2. Add `agenario.tech` and `www.agenario.tech`
3. Vercel gives you DNS records to add

### On Your DNS Provider (e.g. Namecheap, Cloudflare, GoDaddy)

Add these records:

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | `76.76.21.21` (Vercel IP) |
| `CNAME` | `www` | `cname.vercel-dns.com` |

> If using **Cloudflare**: set the proxy to **DNS only** (grey cloud) initially to let Vercel verify, then re-enable after.

### On Render (Backend API)

1. Go to your Render web service → **Settings** → **Custom Domain**
2. Add `api.agenario.tech`
3. Add a `CNAME` DNS record:

| Type | Name | Value |
|------|------|-------|
| `CNAME` | `api` | `your-service.onrender.com` |

4. Update your Vercel environment variable:
   ```
   VITE_API_URL = https://api.agenario.tech
   ```

### SSL

Both Vercel and Render provision SSL certificates automatically (Let's Encrypt). No action needed.

---

## Part 5 — Production Checklist

Before going live, verify:

- [ ] `SESSION_SECRET` is a long random string (not `change-this-...`)
- [ ] Razorpay is using **live keys** (not test keys)
- [ ] `DATABASE_URL` points to the Render Postgres (not local)
- [ ] `NODE_ENV=production` is set on Render
- [ ] Session table exists in production DB
- [ ] `GROQ_API_KEY` has quota available at console.groq.com
- [ ] `www.agenario.tech` redirects to `agenario.tech` (set in Vercel Domains)
- [ ] Test a full sign-up → scan → payment flow end-to-end

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Cannot connect to database` | Check `DATABASE_URL` and ensure Postgres is running |
| `Session error / 500 on login` | Session table missing — run the CREATE TABLE SQL |
| `Groq API errors` | Check key and quota at console.groq.com |
| `Port already in use` | `lsof -ti:8080 \| xargs kill` |
| `pnpm: command not found` | `npm install -g pnpm` |
| Render cold starts slow | Free tier sleeps after 15 min — upgrade to paid for always-on |
| Vercel build fails | Check Root Directory is set to `artifacts/agenario` |
