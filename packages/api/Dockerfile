# ── builder ───────────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/package.json

RUN pnpm install --frozen-lockfile --filter @bluecollar/api

COPY packages/api ./packages/api

RUN pnpm --filter @bluecollar/api build

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/api/package.json ./packages/api/package.json

RUN pnpm install --frozen-lockfile --filter @bluecollar/api --prod

COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY packages/api/prisma ./packages/api/prisma

WORKDIR /app/packages/api

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
