# Agenario — 512MB Deployment Configuration

## Dockerfile

Create at project root (`Agenario-VibeLauncher/Dockerfile`):

```dockerfile
FROM node:20-slim

# Install Chromium runtime deps (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates procps \
    libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libatspi2.0-0 libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json
COPY lib/db/package.json ./lib/db/package.json
COPY lib/api-spec/package.json ./lib/api-spec/package.json

# Install pnpm
RUN npm install -g pnpm@latest

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install Chromium headless shell (smaller than full Chrome)
RUN npx playwright install chromium-headless-shell

# Copy source
COPY . .

# Build API server
RUN pnpm --filter @workspace/api-server run build

# Create upload dirs
RUN mkdir -p /app/uploads/screenshots /app/uploads/videos \
    && chmod 777 /app/uploads/screenshots /app/uploads/videos

ENV NODE_ENV=production
ENV PORT=8080
ENV SANDBOX_ENABLED=true
ENV SANDBOX_IN_DOCKER=true
ENV CHROMIUM_MAX_MB=200
ENV CHROMIUM_MIN_MEM_MB=150

EXPOSE 8080

CMD ["node", "--enable-source-maps", "--max-old-space-size=384", "./artifacts/api-server/dist/index.mjs"]
```

## render.yaml

```yaml
services:
  - type: web
    name: agenario-api
    runtime: docker
    plan: starter
    region: oregon
    healthCheckPath: /api/health/deep
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 8080
      - key: DATABASE_URL
        fromDatabase:
          name: agenario-db
          property: connectionString
      - key: SESSION_SECRET
        generateValue: true
      - key: SANDBOX_ENABLED
        value: "true"
      - key: GROQ_API_KEY
        sync: false
    initialDeployHook: pnpm dlx tsx scripts/seed-fix-templates.ts

databases:
  - name: agenario-db
    plan: starter
```

## How It Works on 512MB

1. **Build time**: `npx playwright install chromium-headless-shell` downloads ~150MB browser
2. **Runtime**: Node starts with `--max-old-space-size=384` (leaves 128MB for Chromium)
3. **Chromium**: Launched once, shared across all scans, `--single-process` mode
4. **Memory guard**: If free RAM < 80MB, Chromium is killed and restarted on next scan
5. **Screenshots**: Streamed to disk, base64 encoded only for critical findings
6. **Fallback**: If Chromium can't launch, HTTP probes still work (just no screenshots)
