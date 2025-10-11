# LexiAid Full Stack Deployment Guide

Complete guide for deploying the LexiAid application (frontend + backend) using Docker Compose with Traefik reverse proxy integration.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Architecture](#architecture)
4. [Configuration](#configuration)
5. [Deployment](#deployment)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Overview

This deployment uses Docker Compose to orchestrate both the frontend and backend services of the LexiAid application, with Traefik handling SSL termination and routing.

### Services

- **Backend (Flask API):** `api.lexiaid.hankell.com.br`
- **Frontend (React SPA):** `lexiaid.hankell.com.br`

### Key Features

- ✅ Automatic SSL certificates via Let's Encrypt
- ✅ Traefik reverse proxy integration
- ✅ Health checks for both services
- ✅ Resource limits and reservations
- ✅ Persistent volumes for data and logs
- ✅ Automatic container restart

---

## Prerequisites

### Required Infrastructure

1. **Traefik Reverse Proxy**
   - Must be running and accessible
   - Network: `hankellnet` (external)
   - Entrypoint: `websecure` (HTTPS)
   - Certificate resolver: `letsencryptresolver`

2. **Docker Environment**
   - Docker Engine 20.10+
   - Docker Compose 1.29+ (or Docker Compose V2)
   - Docker Swarm mode (for deploy labels) OR standard Docker Compose

3. **DNS Configuration**
   - `lexiaid.hankell.com.br` → Server IP
   - `api.lexiaid.hankell.com.br` → Server IP

4. **Network Setup**
   ```bash
   # Verify hankellnet network exists
   docker network ls | grep hankellnet
   
   # If not exists, create it
   docker network create hankellnet
   ```

---

## Architecture

### Network Topology

```
Internet
    ↓
Traefik (hankellnet)
    ↓
    ├─→ Frontend (lexiaid.hankell.com.br:80)
    │   └─→ Nginx serving React SPA
    │
    └─→ Backend (api.lexiaid.hankell.com.br:5000)
        └─→ Flask + Gunicorn API
```

### Service Communication

- **External → Frontend:** HTTPS via Traefik
- **External → Backend:** HTTPS via Traefik
- **Frontend → Backend:** Internal network (hankellnet)

---

## Configuration

### 1. Backend Environment Variables

Create or verify `backend/.env`:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
DOCUMENT_AI_LOCATION=us
LAYOUT_PROCESSOR_ID=your-processor-id

# Firebase Configuration
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/credentials/service-account.json

# Application Configuration
FLASK_ENV=production
FLASK_APP=app.py
```

### 2. Backend Credentials

Ensure Google Cloud credentials are in place:

```bash
# Create credentials directory if not exists
mkdir -p backend/credentials

# Copy your service account JSON file
cp /path/to/service-account.json backend/credentials/
```

### 3. Frontend Build Configuration

The frontend will be built with environment variables. If you need to set the backend API URL at build time:

**Option 1: Create `.env` in project root**

```bash
VITE_BACKEND_API_URL=https://api.lexiaid.hankell.com.br
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

**Option 2: Modify docker-compose.yml**

Add build args to frontend service:

```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile
    args:
      - VITE_BACKEND_API_URL=https://api.lexiaid.hankell.com.br
```

---

## Deployment

### Step 1: Verify Prerequisites

```bash
# Check Docker is running
docker --version
docker-compose --version

# Verify Traefik is running
docker ps | grep traefik

# Verify hankellnet network exists
docker network inspect hankellnet
```

### Step 2: Build Images

```bash
# Navigate to project root
cd /path/to/aitutor_37

# Build both services
docker-compose build

# Or build individually
docker-compose build backend
docker-compose build frontend
```

### Step 3: Deploy Services

**For Docker Swarm:**

```bash
# Deploy as a stack
docker stack deploy -c docker-compose.yml lexiaid

# Verify deployment
docker stack services lexiaid
docker stack ps lexiaid
```

**For Standard Docker Compose:**

```bash
# Start services
docker-compose up -d

# Verify services are running
docker-compose ps
docker-compose logs -f
```

### Step 4: Verify Deployment

```bash
# Check container status
docker ps | grep lexiaid

# Check logs
docker logs lexiaid-backend
docker logs lexiaid-frontend

# Test health endpoints
curl http://localhost:5000/health  # Backend (internal)
curl http://localhost:80/health    # Frontend (internal)

# Test via Traefik (external)
curl https://api.lexiaid.hankell.com.br/health
curl https://lexiaid.hankell.com.br/health
```

---

## Verification

### 1. Check Service Status

```bash
# Docker Swarm
docker stack ps lexiaid

# Docker Compose
docker-compose ps
```

Expected output:
```
NAME                  IMAGE                    STATUS
lexiaid-backend       lexiaid-backend:latest   Running
lexiaid-frontend      lexiaid-frontend:latest  Running
```

### 2. Verify Traefik Integration

```bash
# Check Traefik dashboard (if enabled)
# Navigate to: https://traefik.hankell.com.br

# Or check Traefik logs
docker logs traefik | grep lexiaid
```

You should see:
- Router: `lexiaid_backend` → `api.lexiaid.hankell.com.br`
- Router: `lexiaid_frontend` → `lexiaid.hankell.com.br`
- Both with SSL certificates from Let's Encrypt

### 3. Test Application Access

**Frontend:**
```bash
# Test HTTPS access
curl -I https://lexiaid.hankell.com.br

# Expected: 200 OK with HTML content
```

**Backend:**
```bash
# Test API endpoint
curl https://api.lexiaid.hankell.com.br/health

# Expected: {"status": "healthy"} or similar
```

### 4. Verify SSL Certificates

```bash
# Check certificate details
openssl s_client -connect lexiaid.hankell.com.br:443 -servername lexiaid.hankell.com.br < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Should show Let's Encrypt certificate with valid dates
```

---

## Troubleshooting

### Issue 1: Services Not Starting

**Check logs:**
```bash
# Docker Swarm
docker service logs lexiaid_backend
docker service logs lexiaid_frontend

# Docker Compose
docker-compose logs backend
docker-compose logs frontend
```

**Common causes:**
- Missing environment variables
- Invalid credentials
- Port conflicts
- Network issues

### Issue 2: Traefik Not Routing Traffic

**Verify Traefik can see the services:**
```bash
# Check Traefik logs
docker logs traefik | grep lexiaid

# Verify labels are applied
docker inspect lexiaid-backend | grep traefik
docker inspect lexiaid-frontend | grep traefik
```

**Common causes:**
- Services not on `hankellnet` network
- Traefik labels incorrect
- DNS not pointing to server

### Issue 3: SSL Certificate Issues

**Check certificate resolver:**
```bash
# Verify letsencryptresolver exists in Traefik config
docker exec traefik cat /etc/traefik/traefik.yml | grep letsencryptresolver
```

**Force certificate renewal:**
```bash
# Remove existing certificates (if needed)
docker exec traefik rm -rf /letsencrypt/acme.json

# Restart Traefik
docker restart traefik
```

### Issue 4: Backend Can't Connect to Google Cloud

**Verify credentials:**
```bash
# Check if credentials file exists in container
docker exec lexiaid-backend ls -la /app/credentials/

# Verify environment variables
docker exec lexiaid-backend env | grep GOOGLE
docker exec lexiaid-backend env | grep FIREBASE
```

**Test Google Cloud connection:**
```bash
# Execute inside container
docker exec -it lexiaid-backend python -c "
from google.cloud import storage
client = storage.Client()
print('Connection successful!')
"
```

### Issue 5: Frontend Can't Reach Backend

**Check network connectivity:**
```bash
# From frontend container
docker exec lexiaid-frontend curl http://backend:5000/health

# Or via external URL
docker exec lexiaid-frontend curl https://api.lexiaid.hankell.com.br/health
```

**Verify CORS configuration:**
```bash
# Check backend CORS settings
docker exec lexiaid-backend grep -r "CORS" /app/
```

---

## Maintenance

### Updating Services

**Update backend:**
```bash
# Pull latest code
git pull

# Rebuild and redeploy
docker-compose build backend
docker-compose up -d backend

# Or for Swarm
docker stack deploy -c docker-compose.yml lexiaid
```

**Update frontend:**
```bash
# Pull latest code
git pull

# Rebuild and redeploy
docker-compose build frontend
docker-compose up -d frontend
```

### Viewing Logs

```bash
# Real-time logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

### Scaling Services

**Docker Swarm:**
```bash
# Scale frontend to 3 replicas
docker service scale lexiaid_frontend=3

# Scale backend to 2 replicas
docker service scale lexiaid_backend=2
```

**Docker Compose:**
```bash
# Scale frontend
docker-compose up -d --scale frontend=3

# Note: Traefik will automatically load balance
```

### Backup Data

```bash
# Backup backend data volume
docker run --rm \
  -v lexiaid-backend-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backend-data-$(date +%Y%m%d).tar.gz /data

# Backup backend logs
docker run --rm \
  -v lexiaid-backend-logs:/logs \
  -v $(pwd):/backup \
  alpine tar czf /backup/backend-logs-$(date +%Y%m%d).tar.gz /logs
```

### Restore Data

```bash
# Restore backend data
docker run --rm \
  -v lexiaid-backend-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/backend-data-20251011.tar.gz -C /
```

### Resource Monitoring

```bash
# Monitor resource usage
docker stats lexiaid-backend lexiaid-frontend

# Check disk usage
docker system df

# Check volume sizes
docker volume ls
docker volume inspect lexiaid-backend-data
```

---

## Production Checklist

### Before Deployment

- [ ] DNS records configured and propagated
- [ ] Traefik running with Let's Encrypt configured
- [ ] `hankellnet` network exists
- [ ] Backend `.env` file configured
- [ ] Google Cloud credentials in place
- [ ] Frontend environment variables set
- [ ] Images built successfully
- [ ] Resource limits appropriate for server

### After Deployment

- [ ] Both services running
- [ ] Health checks passing
- [ ] SSL certificates issued
- [ ] Frontend accessible via HTTPS
- [ ] Backend API accessible via HTTPS
- [ ] Frontend can communicate with backend
- [ ] Google Cloud services working
- [ ] Logs are being generated
- [ ] Monitoring configured
- [ ] Backup strategy in place

---

## Quick Reference

### Common Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build

# Remove everything (including volumes)
docker-compose down -v
```

### Service URLs

- **Frontend:** https://lexiaid.hankell.com.br
- **Backend API:** https://api.lexiaid.hankell.com.br
- **Backend Health:** https://api.lexiaid.hankell.com.br/health
- **Frontend Health:** https://lexiaid.hankell.com.br/health

### Resource Limits

| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|--------------|-------------|----------------|
| Backend | 2 cores | 2048MB | 0.5 cores | 512MB |
| Frontend | 0.5 cores | 256MB | 0.1 cores | 64MB |

---

## Support

### Logs Location

- **Backend Logs:** Volume `lexiaid-backend-logs`
- **Frontend Logs:** Container stdout/stderr
- **Traefik Logs:** Traefik container logs

### Health Check Endpoints

- **Backend:** `http://localhost:5000/health` (internal)
- **Frontend:** `http://localhost:80/health` (internal)

### Network Information

- **Network Name:** `hankellnet`
- **Network Type:** External (bridge)
- **Services:** backend, frontend, traefik

---

**Last Updated:** 2025-10-11  
**Docker Compose Version:** 3.7  
**Deployment Type:** Production with Traefik  
**Status:** ✅ Ready for Production
