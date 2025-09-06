# Backend Dockerfile for Railway
FROM node:18-alpine AS base

# Install pnpm
RUN corepack enable

# Set working directory
WORKDIR /app

# Copy root workspace files for dependency resolution
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

# Copy packages for dependency resolution
COPY packages ./packages

# Copy backend app
COPY apps/backend ./apps/backend

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages first
RUN pnpm --filter "@zapninja/shared" build
RUN pnpm --filter "@zapninja/database" build
RUN pnpm --filter "@zapninja/ai-services" build
RUN pnpm --filter "@zapninja/whatsapp-core" build

# Build backend
RUN pnpm --filter "@zapninja/backend" build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN corepack enable

WORKDIR /app

# Copy built application
COPY --from=base /app/apps/backend/dist ./dist
COPY --from=base /app/apps/backend/package.json ./
COPY --from=base /app/packages ./packages

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S zapninja -u 1001

# Change ownership
RUN chown -R zapninja:nodejs /app
USER zapninja

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

EXPOSE 3000

CMD ["node", "dist/main.js"]