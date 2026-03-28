# ============================================================
# QRestaurant Backend - Dockerfile
# Multi-stage build for optimized production image
# ============================================================

# ─── Base ────────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/

# ─── Development ─────────────────────────────────────────
FROM base AS development
RUN npm ci
COPY . .
RUN npx prisma generate
EXPOSE 4000
CMD ["npm", "run", "start:dev"]

# ─── Builder ─────────────────────────────────────────────
FROM base AS builder
RUN npm ci --only=production
COPY --from=development /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ─── Production ──────────────────────────────────────────
FROM node:20-alpine AS production
RUN apk add --no-cache openssl wget

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

# Copy built artifacts
COPY --from=builder --chown=nestjs:nestjs /app/dist ./dist
COPY --from=builder --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nestjs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nestjs /app/package.json ./package.json

# Create required directories
RUN mkdir -p uploads/temp uploads/menu uploads/categories logs && \
    chown -R nestjs:nestjs uploads logs

USER nestjs

EXPOSE 4000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js 2>&1"]
