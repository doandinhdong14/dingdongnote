# Multi-stage Dockerfile for DingDongNote Backend API on Railway
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root monorepo files
COPY package*.json tsconfig.base.json ./
COPY packages/contracts/package*.json ./packages/contracts/
COPY packages/contracts/tsconfig.json ./packages/contracts/
COPY packages/contracts/src ./packages/contracts/src
COPY apps/api/package*.json ./apps/api/
COPY apps/api/tsconfig.json ./apps/api/
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/src ./apps/api/src

# Install dependencies and build
RUN npm ci
RUN npm --workspace=packages/contracts run build
RUN npm --workspace=apps/api run prisma:generate
RUN npm --workspace=apps/api run build

# Runner stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/contracts/package*.json ./packages/contracts/
COPY --from=builder /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=builder /app/apps/api/package*.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
