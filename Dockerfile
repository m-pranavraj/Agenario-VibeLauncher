FROM node:20-slim

# Install Chromium runtime deps (minimal footprint)
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

# Install Chromium headless shell (smaller than full Chrome, ~150MB)
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
