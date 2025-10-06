# -------------------------
#  Base image
# -------------------------
FROM node:20-alpine AS base

WORKDIR /app

# -------------------------
#  Dependencies
# -------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependency files
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Install dependencies based on lock file
RUN \
  if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# -------------------------
#  Builder
# -------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Next.js telemetry disable (optional)
ENV NEXT_TELEMETRY_DISABLED 1

# ✅ Добавляем переменные окружения для сборки
ARG NEXT_PUBLIC_VEXA_API_URL
ARG NEXT_PUBLIC_VEXA_WS_URL
ENV NEXT_PUBLIC_VEXA_API_URL=${NEXT_PUBLIC_VEXA_API_URL}
ENV NEXT_PUBLIC_VEXA_WS_URL=${NEXT_PUBLIC_VEXA_WS_URL}

# Build the app
RUN \
  if [ -f yarn.lock ]; then yarn build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm run build; \
  else echo "Lockfile not found." && exit 1; \
  fi

# -------------------------
#  Runner
# -------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# ✅ Добавляем переменные окружения в runtime
ENV NEXT_PUBLIC_VEXA_API_URL=${NEXT_PUBLIC_VEXA_API_URL}
ENV NEXT_PUBLIC_VEXA_WS_URL=${NEXT_PUBLIC_VEXA_WS_URL}

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

# Run the app
CMD ["node", "server.js"]
