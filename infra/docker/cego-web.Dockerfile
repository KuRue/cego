# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json ./
COPY apps/cego-web/package*.json ./apps/cego-web/
COPY packages/db/package*.json ./packages/db/
COPY packages/telegram/package*.json ./packages/telegram/

RUN --mount=type=cache,target=/root/.npm npm --prefix packages/db ci
RUN --mount=type=cache,target=/root/.npm npm --prefix packages/telegram ci
RUN --mount=type=cache,target=/root/.npm npm --prefix apps/cego-web ci

FROM deps AS builder
WORKDIR /app
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/apps/cego-web/.next/cache npm --prefix apps/cego-web run build

FROM deps AS migrator
WORKDIR /app
COPY . .
ENV NODE_ENV=production
CMD ["npm", "--prefix", "packages/db", "run", "db:migrate"]

FROM node:24-alpine AS runner
WORKDIR /app

ARG CEGO_BUILD_SHA=unknown

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV CEGO_BUILD_SHA=${CEGO_BUILD_SHA}

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /data/uploads \
  && chown -R nextjs:nodejs /data

COPY --from=builder --chown=nextjs:nodejs /app/apps/cego-web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/cego-web/public ./apps/cego-web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/cego-web/.next/static ./apps/cego-web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/infra/docker/runner-entrypoint.cjs ./infra/docker/runner-entrypoint.cjs

EXPOSE 3000
USER nextjs
CMD ["node", "infra/docker/runner-entrypoint.cjs"]
