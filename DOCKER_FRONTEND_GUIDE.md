# Docker Frontend Deployment Guide - LexiAid

Complete guide for building and deploying the LexiAid React frontend using Docker.

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Building the Image](#building-the-image)
4. [Running the Container](#running-the-container)
5. [Configuration](#configuration)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The LexiAid frontend is a React application built with Vite. This Docker setup uses:

- **Multi-stage build** for optimization
- **Node.js 20 Alpine** for building
- **Nginx Alpine** for serving static files
- **Production-ready** Nginx configuration with caching and security headers

### Image Specifications

- **Builder Stage:** ~400MB (Node.js + dependencies)
- **Final Image:** ~25MB (Nginx + static files)
- **Build Time:** ~2-4 minutes (first build), ~30s (cached)
- **Startup Time:** <2 seconds

---

## Quick Start

### Prerequisites

- Docker installed (version 20.10+)
- Docker Compose (optional)

### 3-Step Deployment

```bash
# 1. Build the image
docker build -t lexiaid-frontend:latest .

# 2. Run the container
docker run -d --name lexiaid-frontend -p 80:80 lexiaid-frontend:latest

# 3. Verify
curl http://localhost:80/health
```

**Or use Docker Compose:**

```bash
docker-compose -f docker-compose.frontend.yml up -d
```

---

## Building the Image

### Basic Build

```bash
docker build -t lexiaid-frontend:latest .
```

### Build with Custom Tag

```bash
docker build -t lexiaid-frontend:v1.0.0 .
```

### Build with Build Arguments

If you need to pass environment variables at build time:

```bash
docker build \
  --build-arg VITE_BACKEND_API_URL=https://api.example.com \
  -t lexiaid-frontend:latest .
```

**Note:** For Vite to use environment variables at build time, they must be prefixed with `VITE_` and defined in the Dockerfile.

### Build for Different Environments

```bash
# Development build
docker build --target builder -t lexiaid-frontend:dev .

# Production build (default)
docker build -t lexiaid-frontend:prod .
```

---

## Running the Container

### Option 1: Docker Run

**Basic:**
```bash
docker run -d \
  --name lexiaid-frontend \
  -p 80:80 \
  lexiaid-frontend:latest
```

**With Custom Port:**
```bash
docker run -d \
  --name lexiaid-frontend \
  -p 8080:80 \
  lexiaid-frontend:latest
```

**With Resource Limits:**
```bash
docker run -d \
  --name lexiaid-frontend \
  -p 80:80 \
  --memory="128m" \
  --cpus="0.5" \
  --restart unless-stopped \
  lexiaid-frontend:latest
```

### Option 2: Docker Compose

Create or use the provided `docker-compose.frontend.yml`:

```bash
# Start
docker-compose -f docker-compose.frontend.yml up -d

# Stop
docker-compose -f docker-compose.frontend.yml down

# View logs
docker-compose -f docker-compose.frontend.yml logs -f
```

---

## Configuration

### Environment Variables

The frontend uses environment variables prefixed with `VITE_`. These must be set **at build time**, not runtime.

#### Common Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_API_URL` | Backend API URL | `http://localhost:5000` |
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIza...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `my-project` |

#### Setting Build-Time Variables

**Method 1: Using .env file**

Create a `.env` file in the project root:

```bash
VITE_BACKEND_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-api-key
```

Then build:

```bash
docker build -t lexiaid-frontend:latest .
```

**Method 2: Using --build-arg**

```bash
docker build \
  --build-arg VITE_BACKEND_API_URL=https://api.production.com \
  -t lexiaid-frontend:latest .
```

### Nginx Configuration

The `nginx.conf` file includes:

- **SPA Routing:** All routes fallback to `index.html`
- **Caching:** Static assets cached for 1 year, HTML for 1 hour
- **Compression:** Gzip enabled for text files
- **Security Headers:** X-Frame-Options, X-Content-Type-Options, etc.
- **Health Check:** `/health` endpoint

#### Customizing Nginx

Edit `nginx.conf` before building:

```nginx
# Example: Add CORS headers
location / {
    add_header Access-Control-Allow-Origin *;
    try_files $uri $uri/ /index.html;
}
```

Then rebuild the image.

---

## Production Deployment

### Building for Production

```bash
# Tag with version
docker build -t lexiaid-frontend:v1.0.0 .

# Tag for registry
docker tag lexiaid-frontend:v1.0.0 gcr.io/your-project/lexiaid-frontend:v1.0.0

# Push to Google Container Registry
docker push gcr.io/your-project/lexiaid-frontend:v1.0.0
```

### Deploy to Google Cloud Run

```bash
gcloud run deploy lexiaid-frontend \
  --image gcr.io/your-project/lexiaid-frontend:v1.0.0 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 80
```

### Deploy to Kubernetes

Create `frontend-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lexiaid-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lexiaid-frontend
  template:
    metadata:
      labels:
        app: lexiaid-frontend
    spec:
      containers:
      - name: frontend
        image: lexiaid-frontend:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: lexiaid-frontend-service
spec:
  selector:
    app: lexiaid-frontend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

Deploy:

```bash
kubectl apply -f frontend-deployment.yaml
```

### Deploy with Docker Swarm

```bash
docker service create \
  --name lexiaid-frontend \
  --replicas 3 \
  --publish 80:80 \
  --limit-memory 128M \
  --limit-cpu 0.5 \
  lexiaid-frontend:latest
```

---

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

**Check logs:**
```bash
docker logs lexiaid-frontend
```

**Common causes:**
- Port 80 already in use
- Nginx configuration error
- Missing static files

**Solution:**
```bash
# Use different port
docker run -p 8080:80 lexiaid-frontend:latest

# Verify Nginx config
docker run --rm lexiaid-frontend:latest nginx -t
```

#### 2. 404 Errors on Routes

**Cause:** Nginx not configured for SPA routing

**Solution:** Verify `nginx.conf` has:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

#### 3. API Calls Failing

**Cause:** Backend URL not set correctly at build time

**Solution:** Rebuild with correct environment variable:
```bash
docker build --build-arg VITE_BACKEND_API_URL=http://backend:5000 -t lexiaid-frontend:latest .
```

#### 4. Static Assets Not Loading

**Check inside container:**
```bash
docker exec lexiaid-frontend ls -la /usr/share/nginx/html
```

**Verify build output:**
```bash
docker run --rm lexiaid-frontend:latest ls -la /usr/share/nginx/html
```

#### 5. CORS Errors

**Solution:** Add CORS headers to `nginx.conf`:

```nginx
location / {
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
    try_files $uri $uri/ /index.html;
}
```

#### 6. Health Check Failing

**Test manually:**
```bash
docker exec lexiaid-frontend curl http://localhost:80/health
```

**Expected output:**
```
healthy
```

### Debugging Commands

```bash
# View container logs
docker logs -f lexiaid-frontend

# Execute shell inside container
docker exec -it lexiaid-frontend sh

# Check Nginx configuration
docker exec lexiaid-frontend nginx -t

# View Nginx error logs
docker exec lexiaid-frontend cat /var/log/nginx/error.log

# Check running processes
docker exec lexiaid-frontend ps aux

# Test from inside container
docker exec lexiaid-frontend curl http://localhost:80
```

### Performance Issues

**Monitor resource usage:**
```bash
docker stats lexiaid-frontend
```

**Optimize Nginx:**

Edit `nginx.conf` to adjust worker processes:

```nginx
# At the top of nginx.conf (outside server block)
worker_processes auto;
worker_rlimit_nofile 8192;

events {
    worker_connections 4096;
}
```

---

## Best Practices

### Security

1. ✅ **Non-root user** - Container runs as `appuser` (UID 1000)
2. ✅ **Security headers** - X-Frame-Options, X-Content-Type-Options, etc.
3. ✅ **No secrets in image** - Environment variables set at build time
4. ✅ **Minimal base image** - Alpine Linux reduces attack surface
5. ⚠️ **HTTPS** - Use a reverse proxy (Traefik, Nginx Proxy Manager) for SSL

### Performance

1. ✅ **Multi-stage build** - 94% size reduction (400MB → 25MB)
2. ✅ **Gzip compression** - Enabled for all text files
3. ✅ **Asset caching** - 1 year for static assets, 1 hour for HTML
4. ✅ **Small base image** - Alpine Linux (~5MB base)

### Maintainability

1. ✅ **Health checks** - Container orchestration can detect failures
2. ✅ **Logging** - Nginx logs to stdout/stderr
3. ✅ **Documentation** - Comprehensive guides provided
4. ✅ **Version tagging** - Use semantic versioning

---

## Full Stack Deployment

To run both frontend and backend together:

### Option 1: Separate Containers with Network

```bash
# Create network
docker network create lexiaid-network

# Run backend
docker run -d \
  --name lexiaid-backend \
  --network lexiaid-network \
  -p 5000:5000 \
  lexiaid-backend:latest

# Run frontend
docker run -d \
  --name lexiaid-frontend \
  --network lexiaid-network \
  -p 80:80 \
  lexiaid-frontend:latest
```

### Option 2: Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: lexiaid-backend:latest
    container_name: lexiaid-backend
    ports:
      - "5000:5000"
    networks:
      - lexiaid-network
    env_file:
      - ./backend/.env

  frontend:
    image: lexiaid-frontend:latest
    container_name: lexiaid-frontend
    ports:
      - "80:80"
    networks:
      - lexiaid-network
    depends_on:
      - backend

networks:
  lexiaid-network:
    driver: bridge
```

Run:

```bash
docker-compose up -d
```

---

## Maintenance

### Updating the Application

```bash
# Pull latest code
git pull

# Rebuild image
docker build -t lexiaid-frontend:v1.1.0 .

# Stop old container
docker stop lexiaid-frontend
docker rm lexiaid-frontend

# Run new container
docker run -d --name lexiaid-frontend -p 80:80 lexiaid-frontend:v1.1.0
```

### Monitoring

**View logs:**
```bash
docker logs -f lexiaid-frontend
```

**Monitor resources:**
```bash
docker stats lexiaid-frontend
```

**Check health:**
```bash
curl http://localhost:80/health
```

---

## Additional Resources

- [Dockerfile](./Dockerfile) - Multi-stage production Dockerfile
- [nginx.conf](./nginx.conf) - Nginx configuration
- [.dockerignore](./.dockerignore) - Build context exclusions
- [Backend Docker Guide](./backend/DOCKER_DEPLOYMENT.md) - Backend deployment

---

**Last Updated:** 2025-10-11  
**Docker Version:** 20.10+  
**Node Version:** 20-alpine  
**Nginx Version:** stable-alpine  
**Status:** ✅ Production Ready
