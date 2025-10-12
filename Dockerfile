# ============================================
# Multi-Stage Dockerfile for LexiAid Frontend
# ============================================
# This Dockerfile creates an optimized production image for the React frontend
# using a multi-stage build to minimize final image size.

# ============================================
# Stage 1: Builder - Build React Application
# ============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Set environment variables for build optimization
ENV NODE_ENV=production \
    NPM_CONFIG_LOGLEVEL=warn

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
# Explicitly include devDependencies (like vite) even in production mode
RUN npm install --include=dev

# Copy source code
COPY . .

# Accept build argument for backend API URL
ARG VITE_BACKEND_API_URL
ENV VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL}

# Build the application
# Vite will output to /app/dist by default
RUN npm run build

# ============================================
# Stage 2: Final - Nginx Production Server
# ============================================
FROM nginx:stable-alpine AS final

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default Nginx configuration
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from builder stage
# Vite outputs to 'dist' directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Create a non-root user for Nginx (security best practice)
# Note: Running Nginx as non-root requires additional configuration
# For simplicity, we keep root but this can be enhanced for production
# RUN addgroup -g 1000 -S appgroup && \
#     adduser -u 1000 -S appuser -G appgroup && \
#     chown -R appuser:appgroup /usr/share/nginx/html && \
#     chown -R appuser:appgroup /var/cache/nginx && \
#     chown -R appuser:appgroup /var/log/nginx && \
#     touch /var/run/nginx.pid && \
#     chown -R appuser:appgroup /var/run/nginx.pid

# Switch to non-root user
# USER appuser

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
