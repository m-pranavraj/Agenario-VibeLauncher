# Running Agenario Locally (VS Code)

## Prerequisites

- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **pnpm 9+** — install with `npm install -g pnpm`
- **PostgreSQL** — local install or [Docker](#option-b-docker-postgres)

---

## 1. Clone & Install

```bash
git clone <your-repo-url>
cd agenario
pnpm install
```

---

## 2. Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:password@localhost:5432/agenario

# Session secret — use any long random string
SESSION_SECRET=your-secret-here-change-this

# Groq API key — get free at https://console.groq.com
GROQ_API_KEY=gsk_...

# Razorpay keys — get at https://dashboard.razorpay.com
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Optional: Cerebras API key for fallback model
# CEREBRAS_API_KEY=...
```

> **Never commit `.env` to git.** It's already in `.gitignore`.

---

## 3. Set Up the Database

### Option A — Local Postgres

```bash
# Create database
psql -U postgres -c "CREATE DATABASE agenario;"

# Push Drizzle schema (creates all tables)
pnpm --filter @workspace/db run push

# Create the session table manually (required)
psql -U postgres -d agenario -c "
CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR NOT NULL PRIMARY KEY,
  sess   JSON    NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
"
```

### Option B — Docker Postgres

```bash
docker run -d \
  --name agenario-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=agenario \
  -p 5432:5432 \
  postgres:16

# Then push schema
pnpm --filter @workspace/db run push

# Create session table (same SQL as above)
```

---

## 4. Run the App

Open **two terminals** side by side in VS Code:

**Terminal 1 — API Server** (port 8080):
```bash
pnpm --filter @workspace/api-server run dev
```

**Terminal 2 — Frontend** (port 5173):
```bash
pnpm --filter @workspace/agenario run dev
```

Then open **http://localhost:5173** in your browser.

> The frontend proxies `/api/*` requests to `http://localhost:8080` automatically via Vite config.

---

## 5. Useful Commands

| Command | What it does |
|---|---|
| `pnpm run typecheck` | TypeScript check across all packages |
| `pnpm run build` | Full build (typecheck + bundle) |
| `pnpm --filter @workspace/api-spec run codegen` | Regenerate API hooks from OpenAPI spec |
| `pnpm --filter @workspace/db run push` | Push DB schema changes |
| `pnpm --filter @workspace/db run studio` | Open Drizzle Studio (visual DB browser) |

---

## 6. Project Structure

```
agenario/
├── artifacts/
│   ├── agenario/          # React + Vite frontend (port 5173)
│   │   └── src/pages/     # All pages
│   └── api-server/        # Express API server (port 8080)
│       └── src/
│           ├── routes/    # API routes
│           └── lib/       # agents.ts, logger.ts, etc.
├── lib/
│   ├── db/src/schema/     # Drizzle ORM schema
│   └── api-spec/          # OpenAPI spec (source of truth)
└── .env                   # Your local env vars (not committed)
```

---

## 7. VS Code Recommended Extensions

- **ESLint** (`dbaeumer.vscode-eslint`)
- **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`)
- **Prisma** / **Drizzle** snippet support

Add a `.vscode/settings.json` to auto-format on save:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.validate": ["javascript", "typescript", "typescriptreact"]
}
```

---

## 8. Common Issues

| Problem | Fix |
|---|---|
| `Cannot connect to database` | Check `DATABASE_URL` in `.env` and ensure Postgres is running |
| `Session errors / 500 on login` | The `session` table might be missing — run the SQL in step 3 |
| `Groq API errors` | Check `GROQ_API_KEY` is valid and has quota at console.groq.com |
| `Port already in use` | Kill the process: `lsof -ti:8080 \| xargs kill` |
| `pnpm: command not found` | Run `npm install -g pnpm` first |
