# Agenario 10/10 Transformation Roadmap

## Phase 0: Trust & Honesty Foundation (CRITICAL — Do First)

### 0.1 Remove Fake Proof Injection
**File:** `artifacts/api-server/src/lib/playwright-proof.ts:867-923`
**Action:** Delete the entire block that generates fabricated "LTL Verified" and "Cross-Language Taint Map" proofs when `results.length < 3`. Replace with: if fewer than 3 real findings exist, return only real findings. Never fabricate.

### 0.2 Rename or Remove 7 Fake Engines
**Action:** Rename all "quantum-era" engines to honest descriptions or remove them:

| Current Name | New Name (if keeping) | Recommendation |
|---|---|---|
| `kardashev-latency.ts` | `async-pattern-detector.ts` | **Remove** — adds no value |
| `thermodynamic-entropy.ts` | `memory-operation-counter.ts` | **Remove** — adds no value |
| `agi-alignment.ts` | `reward-loop-detector.ts` | **Rename + keep** — real pattern detection |
| `fhe-readiness.ts` | `crypto-agility-checker.ts` | **Remove** — misleading |
| `zk-attestation.ts` | `ast-merkle-tree.ts` | **Rename** — it's a real Merkle tree |
| `bft-consensus.ts` | `graph-resilience.ts` | **Rename** — real graph analysis |
| `dna-storage-compiler.ts` | (remove) | **Remove** |
| `post-quantum-readiness.ts` | (remove) | **Remove** |
| `neuromorphic-drift.ts` | (remove) | **Remove** |
| `tensor-payload-signature.ts` | (remove) | **Remove** |
| `gpu-ast-integrity.ts` | (remove) | **Remove** |
| `architectural-decay.ts` | (remove) | **Remove** |
| `legacy-crypto.ts` | (remove) | **Remove** |
| `cyclical-dependency.ts` | `circular-import-detector.ts` | **Rename** — real cycle detection |

### 0.3 Remove Hardcoded Social Proof
**File:** `artifacts/agenario/src/pages/pricing.tsx:229`
**Action:** Replace `"1,247+ apps scanned this month"` with real data from `GET /api/public/stats`. If no data exists, show nothing or `"Join founders who trust Agenario"`.

### 0.4 Remove Hardcoded Coupon Codes from Source
**File:** `artifacts/api-server/src/routes/billing.ts:40-45`
**Action:** Move coupon codes to a database table or environment variable. Source code should not contain business logic secrets.

### 0.5 Fix Console.log of Reset Tokens
**File:** `artifacts/api-server/src/routes/auth.ts:301-304`
**Action:** Remove `console.log` of full password reset URLs. Log only a masked version: `[PASSWORD RESET] User: ${email}, Link: ${resetUrl.slice(0, 30)}...`

---

## Phase 1: Security Hardening

### 1.1 Remove Session Secret Fallback
**File:** `artifacts/api-server/src/app.ts:191`
**Action:** Change from:
```
secret: process.env["SESSION_SECRET"] ?? "dev-secret-change-me"
```
To:
```typescript
const secret = process.env["SESSION_SECRET"];
if (!secret) {
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("SESSION_SECRET env var is required in production");
  }
  secret = crypto.randomBytes(32).toString("hex");
  logger.warn("SESSION_SECRET not set — using random secret (dev only)");
}
```

### 1.2 Fix Google OAuth Empty Password Hash
**File:** `artifacts/api-server/src/routes/auth.ts:556`
**Action:** Add a guard preventing login for OAuth-only users without password hash, or generate a random unguessable placeholder:
```typescript
passwordHash: "", // Google SSO users
```
→
```typescript
passwordHash: crypto.randomBytes(32).toString("hex"), // SSO users have random hash
```

### 1.3 Remove `--no-sandbox` in Production
**File:** `artifacts/api-server/src/lib/playwright-proof.ts:103-104`
**Action:** Conditionally set based on environment:
```typescript
const isProduction = process.env["NODE_ENV"] === "production";
const args = [
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--disable-extensions",
  "--single-process",
  "--no-zygote",
  ...(isProduction ? [] : ["--no-sandbox"]),
];
```

### 1.4 Add Browser Pool Cleanup
**File:** `artifacts/api-server/src/lib/playwright-proof.ts`
**Action:** Add process exit handler:
```typescript
process.on("exit", () => {
  if (globalBrowserPool) globalBrowserPool.close().catch(() => {});
});
process.on("SIGINT", () => {
  if (globalBrowserPool) globalBrowserPool.close().catch(() => {});
  process.exit(0);
});
```

### 1.5 Fix CSP `unsafe-inline`
**File:** `artifacts/api-server/src/app.ts:31`
**Action:** Remove `unsafe-inline` from scriptSrc. Use nonces or hashes instead:
```typescript
scriptSrc: ["'self'", "https://checkout.razorpay.com"],
```

---

## Phase 2: Database Normalization

### 2.1 Split Scans Table
**Current:** 73 columns on `scans` table
**Target:** < 20 columns on `scans`, engine results in separate tables

**New schema:**
```sql
-- Core scan info only
CREATE TABLE scans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  cert_id TEXT UNIQUE,
  source_type TEXT NOT NULL,
  source_input TEXT NOT NULL,
  app_description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  score INTEGER,
  summary TEXT,
  launch_verdict TEXT,
  framework TEXT,
  vibe_tool TEXT,
  business_type TEXT,
  issue_counts JSONB,
  sandbox_meta JSONB,
  cert_id TEXT,
  unlocked_by_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- All engine results in a key-value table
CREATE TABLE scan_engine_results (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  engine_name TEXT NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scan_id, engine_name)
);

-- Proof evidence
CREATE TABLE scan_proofs (
  id SERIAL PRIMARY KEY,
  scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  confidence INTEGER,
  url TEXT,
  steps JSONB,
  observed TEXT,
  impact TEXT,
  screenshot TEXT,
  video_url TEXT,
  code_ref TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Add Proper Indexes
```sql
CREATE INDEX idx_scans_user_id ON scans(user_id);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_scans_created_at ON scans(created_at);
CREATE INDEX idx_scans_cert_id ON scans(cert_id);
CREATE INDEX idx_engine_results_scan_id ON scan_engine_results(scan_id);
CREATE INDEX idx_engine_results_engine ON scan_engine_results(engine_name);
CREATE INDEX idx_proofs_scan_id ON scan_proofs(scan_id);
CREATE INDEX idx_proofs_severity ON scan_proofs(severity);
```

---

## Phase 3: Test Coverage

### 3.1 Unit Tests (Target: 80% coverage)
**Location:** `artifacts/api-server/src/lib/__tests__/`

**Priority test files to create:**
```
__tests__/auth.test.ts          — Registration, login, OAuth, password reset
__tests__/billing.test.ts       — Coupon validation, order creation, signature verification
__tests__/scanner.test.ts       — (exists) Expand to cover all severity levels
__tests__/secret-scanner.test.ts — Regex patterns, false positive handling
__tests__/csg-builder.test.ts   — Graph construction, Tarjan SCC, BFS
__tests__/vibe-taint.test.ts    — Taint path detection, sanitization tracking
__tests__/playwright-proof.test.ts — HTTP probes, browser launch, proof dedup
__tests__/sandbox-runner.test.ts — Eligibility, install, start, timeout
__tests__/tier-gate.test.ts     — Plan limits, scan counting
__tests__/ingestion.test.ts     — GitHub clone, ZIP extraction, route detection
__tests__/dempster-shafer.test.ts — Evidence fusion, conflict detection
```

### 3.2 E2E Tests (Playwright)
**Location:** `artifacts/agenario/e2e/`

**Tests to create:**
```
e2e/auth.spec.ts         — Register → Login → Dashboard → Logout
e2e/scan-flow.spec.ts    — New scan → Progress → Results → Export
e2e/billing.spec.ts      — Pricing → Coupon → Checkout (test mode)
e2e/admin.spec.ts        — Admin stats, user management
e2e/api-keys.spec.ts     — Create → Use → Revoke
```

### 3.3 Integration Tests
**Location:** `artifacts/api-server/src/routes/__tests__/`

```
__tests__/scans-api.test.ts     — POST /scans, GET /scans/:id, SSE progress
__tests__/auth-api.test.ts      — All auth endpoints with session
__tests__/billing-api.test.ts   — Order → Verify → Plan upgrade
__tests__/automation-api.test.ts — Create → Claim → Submit
```

---

## Phase 4: Feature Completion

### 4.1 Real OTP Delivery
**File:** `artifacts/api-server/src/routes/auth.ts:18`
**Action:** Integrate Twilio or MSG91:
```typescript
// In send-otp route:
if (!process.env.TWILIO_SID) {
  res.status(503).json({ error: "SMS not configured" });
  return;
}
await twilioClient.messages.create({
  body: `Your Agenario code: ${otp}`,
  from: process.env.TWILIO_PHONE,
  to: phone,
});
```

### 4.2 Enterprise Plan Features
**File:** `artifacts/agenario/src/pages/pricing.tsx`
**Action:** Build team workspace:
- `artifacts/api-server/src/routes/teams.ts` — CRUD for teams
- `team_members` table — user-team relationships with roles
- Team-scoped scans (teamId on scans table)
- Shared API keys per team

### 4.3 Real GitHub Actions Integration
**Action:** Create `.github/workflows/agenario-scan.yml` template and document it properly:
```yaml
- name: Agenario Security Scan
  run: |
    curl -X POST https://api.agenario.tech/api/scans \
      -H "Authorization: Bearer ${{ secrets.AGENARIO_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{"sourceType":"github","sourceInput":"${{ github.repository }}"}'
```

### 4.4 Conversations/Messages API
**Schema exists:** `conversations.ts`, `messages.ts`
**Action:** Build REST API:
- `POST /conversations` — Start new conversation
- `GET /conversations` — List user conversations
- `GET /conversations/:id/messages` — Get messages
- `POST /conversations/:id/messages` — Send message (with AI response)

### 4.5 Real-Time Monitoring Dashboard
**File:** `artifacts/agenario/src/pages/monitoring.tsx`
**Action:** Connect to existing `/api/monitoring/overview` and `/api/monitoring/portfolio` endpoints with real-time SSE updates.

---

## Phase 5: Code Quality & Hygiene

### 5.1 Clean Up Dead Files
**Delete:**
```
scripts/check-encoding.mjs
scripts/check2.mjs
scripts/fix-arrow.mjs
scripts/fix-emoji.mjs
scripts/fix-emoji2.mjs
scripts/fix-emoji3.mjs
scripts/fix-emoji4.mjs
scripts/fix-encoding.js
scripts/fix-encoding.mjs
scripts/fix-encoding2.mjs
scripts/fix-encoding3.mjs
lib/db/kill_locks.js
lib/db/scratch_migrate_11.cjs
lib/db/temp_migration.js
artifacts/api-server/scratch-babel.ts
temp.txt
benchmark-corpus.md
evidence-top.txt
```

### 5.2 Add Prettier/Lint Configuration
**Create:** `.eslintrc.json` at root:
```json
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-unused-vars": "error",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 5.3 Add Git Hooks
**File:** `.husky/pre-commit.sh`
```bash
#!/bin/sh
pnpm run typecheck
pnpm run lint
```

### 5.4 Standardize Error Handling
**Action:** Create `artifacts/api-server/src/lib/errors.ts`:
```typescript
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}
```
Replace all `res.status(500).json({ error: ... })` with consistent error responses.

---

## Phase 6: Performance & Reliability

### 6.1 Add Response Caching
**File:** `artifacts/api-server/src/middlewares/cache.ts`
- Cache `GET /api/scans` for 5 seconds per user
- Cache `GET /api/public/stats` for 60 seconds
- Cache `GET /api/scans/:id` for 10 seconds

### 6.2 Add Request Queue for Scans
**Problem:** Multiple concurrent scans can overwhelm the system
**Action:** Implement a simple in-process queue:
```typescript
// lib/scan-queue.ts
class ScanQueue {
  private queue: ScanJob[] = [];
  private running = 0;
  private maxConcurrent = 3;

  async enqueue(job: ScanJob): Promise<void> {
    this.queue.push(job);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;
    this.running++;
    const job = this.queue.shift()!;
    try {
      await job.execute();
    } finally {
      this.running--;
      this.processNext();
    }
  }
}
```

### 6.3 Add Health Check Endpoint Enhancement
**File:** `artifacts/api-server/src/routes/health.ts`
**Action:** Add deep health check:
```typescript
router.get("/health/deep", async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    aiProvider: await checkAIProvider(),
    diskSpace: checkDiskSpace(),
    memoryUsage: process.memoryUsage(),
  };
  const healthy = Object.values(checks).every(c => c.status === "ok");
  res.status(healthy ? 200 : 503).json({ status: healthy ? "ok" : "degraded", checks });
});
```

### 6.4 Add Rate Limiting Per User
**Action:** Beyond IP-based rate limiting, add user-based limits:
```typescript
const userScanLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.session?.userId?.toString() || req.ip,
});
```

---

## Phase 7: Developer Experience

### 7.1 Add OpenAPI Documentation
**File:** `lib/api-spec/openapi.yaml` (exists but likely incomplete)
**Action:** Generate from Zod schemas using `@workspace/api-zod`:
```typescript
// scripts/generate-openapi.ts
import { generateOpenApiSpec } from 'zod-to-openapi';
import { scanSchema, userSchema } from '@workspace/api-zod';

const spec = generateOpenApiSpec([
  { name: 'Scan', schema: scanSchema },
  { name: 'User', schema: userSchema },
]);
fs.writeFileSync('openapi.json', JSON.stringify(spec, null, 2));
```

### 7.2 Add Docker Compose for Local Development
**Create:** `docker-compose.yml`
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: agenario
      POSTGRES_USER: agenario
      POSTGRES_PASSWORD: agenario
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
  
  api:
    build: .
    ports: ['5000:5000']
    env_file: .env
    depends_on: [postgres]
  
  frontend:
    working_dir: /app/artifacts/agenario
    build: .
    ports: ['5173:5173']
    environment:
      VITE_API_URL: http://localhost:5000/api

volumes:
  pgdata:
```

### 7.3 Add Database Migration System
**Action:** Replace manual migration scripts with proper Drizzle migrations:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

---

## Phase 8: Monitoring & Observability

### 8.1 Add Structured Logging
**Already using pino** — enhance with:
```typescript
// Add request duration tracking
// Add scan duration metrics
// Add error rate tracking
```

### 8.2 Add Prometheus Metrics Endpoint
**File:** `artifacts/api-server/src/routes/metrics.ts`
```typescript
import { Counter, Histogram, register } from 'prom-client';

const scanCounter = new Counter({ name: 'agenario_scans_total', help: 'Total scans', labelNames: ['source_type', 'status'] });
const scanDuration = new Histogram({ name: 'agenario_scan_duration_seconds', help: 'Scan duration' });

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

### 8.3 Add Error Tracking
**Action:** Integrate Sentry or similar:
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

---

## Phase 9: Documentation

### 9.1 API Documentation
**Action:** Serve OpenAPI spec at `/api/docs` using swagger-ui-express

### 9.2 Architecture Decision Records
**Create:** `docs/adr/` directory with:
- `001-use-drizzle-orm.md`
- `002-playwright-sandbox.md`
- `003-evidence-fusion.md`

### 9.3 Runbook
**Create:** `docs/runbook.md` with:
- Deployment procedures
- Database backup/restore
- Incident response
- Scaling guidelines

---

## Phase 10: Final Polish

### 10.1 Performance Audit
- Run `EXPLAIN ANALYZE` on all slow queries
- Add missing indexes
- Implement connection pooling optimization

### 10.2 Security Audit
- Run `npm audit` and fix all vulnerabilities
- Run OWASP ZAP against the deployed instance
- Penetration test the Playwright sandbox

### 10.3 Accessibility Audit
- Run axe-core on all frontend pages
- Fix color contrast issues
- Add proper ARIA labels

### 10.4 Mobile Responsiveness
- Test all pages on mobile viewports
- Fix layout issues on < 768px widths

---

## Execution Priority

| Phase | Impact | Effort | Priority |
|-------|--------|--------|----------|
| Phase 0: Trust & Honesty | CRITICAL | Low | **P0** |
| Phase 1: Security | CRITICAL | Low | **P0** |
| Phase 2: DB Normalization | High | Medium | **P1** |
| Phase 3: Test Coverage | High | High | **P1** |
| Phase 4: Feature Completion | Medium | High | **P2** |
| Phase 5: Code Quality | Medium | Low | **P1** |
| Phase 6: Performance | Medium | Medium | **P2** |
| Phase 7: DevX | Low | Medium | **P3** |
| Phase 8: Observability | Medium | Low | **P2** |
| Phase 9: Documentation | Low | Low | **P3** |
| Phase 10: Polish | Low | Medium | **P3** |

---

## Expected Outcome After Completion

| Dimension | Current | Target |
|-----------|---------|--------|
| Trust/Honesty | 3/10 | 10/10 |
| Security | 6/10 | 9/10 |
| Code Quality | 5/10 | 9/10 |
| Test Coverage | 1% | 80%+ |
| Architecture | 7/10 | 9/10 |
| Feature Completeness | 5/10 | 9/10 |
| Performance | 6/10 | 9/10 |
| **Overall** | **5.5/10** | **9.5/10** |
| **Willingness to Buy** | **4/10** | **9/10** |
