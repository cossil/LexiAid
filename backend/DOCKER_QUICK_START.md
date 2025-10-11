# Docker Quick Start Guide

Quick reference for building and running the LexiAid backend with Docker.

---

## Prerequisites Checklist

- [ ] Docker installed and running
- [ ] `.env` file created in `backend/` directory (copy from `.env.example`)
- [ ] Google Cloud service account JSON file available
- [ ] All required environment variables configured

---

## Quick Start (3 Steps)

### 1. Build the Image

```bash
cd backend
docker build -t lexiaid-backend:latest .
```

### 2. Run the Container

**Using Docker Compose (Recommended):**

```bash
docker-compose up -d
```

**Using Docker Run:**

```bash
docker run -d \
  --name lexiaid-backend \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/credentials:/app/credentials:ro \
  -v lexiaid-data:/app/data \
  lexiaid-backend:latest
```

### 3. Verify It's Running

```bash
# Check container status
docker ps

# View logs
docker logs lexiaid-backend

# Test the API
curl http://localhost:5000/health
```

---

## Common Commands

### Container Management

```bash
# Start container
docker start lexiaid-backend

# Stop container
docker stop lexiaid-backend

# Restart container
docker restart lexiaid-backend

# Remove container
docker rm lexiaid-backend

# View logs (follow mode)
docker logs -f lexiaid-backend
```

### Docker Compose Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild and restart
docker-compose up -d --build

# Stop and remove volumes
docker-compose down -v
```

### Debugging

```bash
# Execute commands inside container
docker exec -it lexiaid-backend bash

# Check environment variables
docker exec lexiaid-backend env

# Verify .env file
docker exec lexiaid-backend cat /app/.env

# Check file structure
docker exec lexiaid-backend ls -la /app
```

---

## Environment Setup

### Required Files

1. **`.env`** - Environment variables (in `backend/` directory)
2. **`credentials/service-account.json`** - Google Cloud credentials

### Minimal .env Example

```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=your-project-id
DOCUMENT_AI_LOCATION=us
LAYOUT_PROCESSOR_ID=your-processor-id

# Firebase
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/credentials/service-account.json

# Application
FLASK_ENV=production
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker logs lexiaid-backend

# Verify environment variables
docker exec lexiaid-backend env | grep GOOGLE
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Use different port
docker run -p 5001:5000 ...
```

### Can't Connect to Container

```bash
# Check if container is running
docker ps

# Check port mapping
docker port lexiaid-backend

# Test from inside container
docker exec lexiaid-backend curl http://localhost:5000/health
```

---

## Production Deployment

### Build for Production

```bash
# Build with version tag
docker build -t lexiaid-backend:v1.0.0 .

# Tag for registry
docker tag lexiaid-backend:v1.0.0 gcr.io/your-project/lexiaid-backend:v1.0.0

# Push to registry
docker push gcr.io/your-project/lexiaid-backend:v1.0.0
```

### Run in Production

```bash
docker run -d \
  --name lexiaid-backend \
  -p 5000:5000 \
  --restart unless-stopped \
  --env-file .env \
  -v /path/to/credentials:/app/credentials:ro \
  -v lexiaid-data:/app/data \
  --memory="2g" \
  --cpus="2.0" \
  lexiaid-backend:v1.0.0
```

---

## Performance Tuning

### Adjust Worker Count

Edit `docker-compose.yml`:

```yaml
command: ["gunicorn", "--workers", "8", "--bind", "0.0.0.0:5000", "--timeout", "120", "app:app"]
```

Or override at runtime:

```bash
docker run ... lexiaid-backend:latest \
  gunicorn --workers 8 --bind 0.0.0.0:5000 app:app
```

### Resource Limits

```bash
docker run -d \
  --memory="2g" \
  --memory-swap="2g" \
  --cpus="2.0" \
  ...
```

---

## Data Persistence

### Backup Data Volume

```bash
docker run --rm \
  -v lexiaid-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data
```

### Restore Data Volume

```bash
docker run --rm \
  -v lexiaid-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/backup-20251010.tar.gz -C /
```

---

## Security Best Practices

1. **Never commit `.env` to Git**
   ```bash
   # Verify it's in .gitignore
   git check-ignore .env
   ```

2. **Use read-only mounts for credentials**
   ```bash
   -v $(pwd)/credentials:/app/credentials:ro
   ```

3. **Run as non-root** (already configured in Dockerfile)

4. **Use secrets in production** (not environment variables)

5. **Scan images for vulnerabilities**
   ```bash
   docker scan lexiaid-backend:latest
   ```

---

## Next Steps

- Review full documentation: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- Set up monitoring and logging
- Configure CI/CD pipeline
- Deploy to cloud platform (GCP Cloud Run, AWS ECS, etc.)

---

**Need Help?** Check the full deployment guide or container logs for detailed error messages.
