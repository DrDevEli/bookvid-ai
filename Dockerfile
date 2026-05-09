# Multi-stage build for BookVid AI personal project
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/

# Install dependencies
RUN npm ci --only=production

# Build stage for client
FROM base AS client-builder
WORKDIR /app
COPY client/ ./client/
COPY shared/ ./shared/
RUN cd client && npm ci && npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    sqlite \
    ffmpeg \
    dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S bookvid -u 1001

WORKDIR /app

# Copy server dependencies and code
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY shared/ ./shared/
COPY scripts/ ./scripts/
COPY package*.json ./

# Copy built client files
COPY --from=client-builder /app/client/dist ./client/dist

# Create necessary directories
RUN mkdir -p data uploads/covers uploads/videos uploads/thumbnails uploads/audio uploads/temp
RUN mkdir -p server/uploads/library/backgrounds server/uploads/library/music server/uploads/library/videos

# Set ownership
RUN chown -R bookvid:nodejs /app

# Switch to non-root user
USER bookvid

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]