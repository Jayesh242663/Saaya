# ======================================================
# STAGE 1: Build client bundle
# ======================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install all dependencies including devDependencies for build
RUN npm install

# Copy application source code
COPY . .

# Build the client production bundle into dist/
RUN npm run build

# ======================================================
# STAGE 2: Lightweight Production Runtime
# ======================================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Copy dependency definitions
COPY package*.json ./

# Install only production runtime dependencies
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend server code
COPY server ./server

# Run as non-root node user for container security
USER node

# Expose standard port
EXPOSE 3000

# Container liveness healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start standalone Node production server
CMD ["node", "server/server.js"]
