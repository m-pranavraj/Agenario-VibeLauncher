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
