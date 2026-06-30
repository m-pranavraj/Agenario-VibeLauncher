# Agenario Operations & Troubleshooting Runbook

This runbook outlines commands and operational details for managing, running, and troubleshooting the Agenario services.

---

## Local Development & Operations

### 1. Zero-Config Services Launch
Start the entire stack (PostgreSQL database, migrations, frontend dashboard, and backend server) in one command:
```bash
docker-compose up --build
```
This automatically provisions PostgreSQL 16 on port `5432` and configures local connections.

### 2. Database Migrations
When schema tables (`users`, `scans`, `teams`, `conversations`) change, generate and push migrations using:
```bash
# Generate SQL migration file
pnpm --filter @workspace/db generate

# Run migration on database
pnpm --filter @workspace/db migrate
```

### 3. Running Unit Tests
Execute the entire test suite (107 test cases across all engines, cache, and auth):
```bash
pnpm --filter @workspace/api-server test
```

---

## Environment Configuration

Configure the following variables in your `.env` file:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection URI |
| `SENTRY_DSN` | Sentry integration URL for capturing server-side exceptions |
| `TWILIO_ACCOUNT_SID` | Twilio SID for OTP verification SMS |
| `TWILIO_AUTH_TOKEN` | Twilio token for OTP verification SMS |
| `TWILIO_PHONE_NUMBER` | Twilio SMS sender phone number |
| `MSG91_AUTH_KEY` | MSG91 auth key for OTP verification |
| `MSG91_TEMPLATE_ID` | MSG91 template ID for OTP verification |
| `GROQ_API_KEY` | Groq key for fast Llama-3.1 security patches |
| `OPENAI_API_KEY` | OpenAI API key fallback for GPT-4o-mini |

---

## Troubleshooting

### 1. SMTP / Ethereal Mail Firewall
- **Issue:** Email delivery times out or fails in secure network zones.
- **Fix:** Agenario automatically resolves SMTP hosts manually to prefer IPv4 over IPv6. In environments where SMTP outbound is blocked (e.g., Render/AWS firewall), specify `MAIL_PROXY_URL` in env to route mails through a Vercel serverless mail proxy.

### 2. Playwright Zombie Browser Processes
- **Issue:** Running multiple live proofs results in left-over chrome/chromium processes.
- **Fix:** The sandbox and proof engines register global `process.on('SIGINT')` and `process.on('exit')` listeners to invoke `.close()` on all browser pools automatically. If manual cleanup is required:
  ```bash
  taskkill /F /IM chrome.exe /T
  # Or on Linux:
  pkill -f chromium
  ```

### 3. Sandbox Ineligible Errors
- **Issue:** Sandbox reports "Ineligible" status for zip/github scans.
- **Fix:** Check that the repository contains a `package.json` with a valid `start` script, or is recognized as a supported web framework (Next.js, Vite, Express, Remix).

### 4. Rate Limit Too Strict
- **Issue:** Getting 429 errors on auth or scan endpoints.
- **Fix:** The default limits are: 200 req/15min global, 20 auth/15min, 30 scans/hr. Adjust in `app.ts` or set `RATE_LIMIT_UNAUTHENTICATED=500` and `RATE_LIMIT_USER=100`.

### 5. Session Cookie Not Persisting
- **Issue:** User logged out after refresh.
- **Fix:** In production, `SameSite=None; Secure` cookies are required. Verify `NODE_ENV=production` is set and `SESSION_SECRET` is a 64-char hex string.

---

## Production Deployment

### Render Deployment
```bash
# 1. Set build command:
pnpm run build:vercel

# 2. Set start command:
node --loader ts-node/esm artifacts/api-server/src/server.ts

# 3. Required env vars:
DATABASE_URL, SESSION_SECRET, RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, FRONTEND_URL
```

### Database Backup & Restore
```bash
# Backup (production):
pg_dump -h host -U user agenario > agenario-backup-$(date +%Y%m%d).sql

# Restore:
psql -h host -U user agenario < agenario-backup.sql
```

### Health Check Endpoints
- `GET /api/health` — Basic health check
- `GET /api/health/deep` — Full health check with DB/SMS status (requires implementation)

### Scaling Guidelines
- **CPU**: Each concurrent scan uses ~500MB RAM and 0.5 CPU cores
- **Memory**: Allocate 2GB RAM minimum per instance for Playwright browser pool
- **Database**: Enable connection pooling (PgBouncer) for >100 concurrent users

---

## Incident Response

### Security Vulnerability Reported
1. Validate the finding against the user's scan report
2. If confirmed, create private security advisory via GitHub
3. Patch within 24 hours, deploy immediately
4. Notify affected users via email if scan data exposed

### PII Exposure in Logs
1. Run `git log -S "exposed_value"` to check git history
2. Rotate affected secrets immediately
3. Filter logs to remove sensitive entries
4. Add pattern to `.envfilter` in logger.js to prevent future leaks

### Scan Queue Backlog
1. Check `SELECT * FROM scans WHERE status = 'running'` for stuck jobs
2. Restart workers: `pkill -f 'scanQueue'` or redeploy
3. Clear stuck locks: `DELETE FROM scan_engine_results WHERE scan_id IN (SELECT id FROM scans WHERE status = 'running' AND completed_at < NOW() - INTERVAL '30 minutes')`
