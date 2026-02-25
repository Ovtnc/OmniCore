# -----------------------------------------------------------------------------
# OmniCore - Production Multi-Stage Build
# Stage 1: Dependencies
# Stage 2: Build (Next.js + Prisma)
# Stage 3: Production runner (App veya Worker aynı image ile farklı CMD)
# -----------------------------------------------------------------------------

FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Prisma generate (client üretilir)
RUN pnpm exec prisma generate

# Next.js build (hatasız tamamlanmalı)
RUN pnpm build

# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
RUN apk add --no-cache curl
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Production bağımlılıkları (tsx worker için dependencies'ta olmalı)
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod

# Build çıktısı
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

# Prisma schema + generated client (migrate ve runtime için)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Worker için kaynak (tsx ile çalıştırılır)
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

EXPOSE 3000

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Varsayılan: Next.js sunucusu (docker-compose'da worker için CMD override)
CMD ["pnpm", "start"]
