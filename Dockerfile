# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install dependencies
RUN npm ci --only=production && npm ci

# Copy source code
COPY tsconfig.json vite.config.ts drizzle.config.ts tailwind.config.ts postcss.config.js components.json ./
COPY shared ./shared
COPY client ./client
COPY server ./server
COPY script ./script

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache dumb-init

# Copy package files
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create directories for runtime data
RUN mkdir -p /app/runs /app/logs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["/sbin/dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.cjs"]

# Expose port
EXPOSE 3000

# Labels
LABEL maintainer="Aurora Pipeline"
LABEL description="Aurora Pipeline - AI-powered content generation system"
LABEL version="1.0.0"
