# Frontend Dockerfile for Railway
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

# Copy frontend app
COPY apps/frontend ./apps/frontend

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages first
RUN pnpm --filter "@zapninja/shared" build

# Build frontend
RUN pnpm --filter "@zapninja/frontend" build

# Production stage
FROM node:18-alpine AS production

# Install pnpm
RUN corepack enable

WORKDIR /app

# Copy built application
COPY --from=base /app/apps/frontend/.next/standalone ./
COPY --from=base /app/apps/frontend/.next/static ./.next/static
COPY --from=base /app/apps/frontend/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]