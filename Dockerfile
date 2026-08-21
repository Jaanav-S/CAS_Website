# syntax=docker/dockerfile:1

# ---- deps: install exactly what package-lock pins ------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build: compile the Next.js standalone server ------------------------
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# A build-time value is only needed so `next build` does not error on missing
# env; the real secrets are supplied at runtime.
ENV AUTH_SECRET=build-time-placeholder-value-ignored
RUN npm run build

# ---- run: a tiny image with just the standalone output -------------------
FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user, owning the uploads directory it writes to.
RUN addgroup -g 1001 -S nodejs \
  && adduser -u 1001 -S nextjs -G nodejs \
  && mkdir -p /app/uploads \
  && chown -R nextjs:nodejs /app

# Standalone bundle plus the assets it does not include on its own.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
