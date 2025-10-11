# Docker Deployment Guide for LexiAid Backend

This guide provides instructions for building and deploying the LexiAid Flask backend using Docker.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Building the Docker Image](#building-the-docker-image)
3. [Running the Container](#running-the-container)
4. [Environment Variables](#environment-variables)
5. [Production Deployment](#production-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Docker installed (version 20.10 or higher recommended)
- Docker Compose (optional, for orchestration)
- A `.env` file with all required environment variables
- Google Cloud service account credentials (JSON file)

---

## Building the Docker Image

### Basic Build

From the `backend/` directory:

```bash
docker build -t lexiaid-backend:latest .
```

### Build with Custom Tag

```bash
docker build -t lexiaid-backend:v1.0.0 .
```

### Build with Build Arguments (if needed)

```bash
docker build --build-arg PYTHON_VERSION=3.12 -t lexiaid-backend:latest .
```

---

## Running the Container

### Option 1: Using Environment Variables Directly

```bash
docker run -d \
  --name lexiaid-backend \
  -p 5000:5000 \
  -e GOOGLE_CLOUD_PROJECT_ID="your-project-id" \
  -e DOCUMENT_AI_LOCATION="us" \
  -e LAYOUT_PROCESSOR_ID="your-processor-id" \
  -e FIREBASE_SERVICE_ACCOUNT_KEY_PATH="/app/credentials/service-account.json" \
  -v $(pwd)/credentials:/app/credentials:ro \
  -v lexiaid-data:/app/data \
  lexiaid-backend:latest
```

### Option 2: Using .env File

**Important:** The application expects the `.env` file to be in the `/app/` directory inside the container.

```bash
docker run -d \
  --name lexiaid-backend \
  -p 5000:5000 \
  --env-file .env \
  -v $(pwd)/credentials:/app/credentials:ro \
  -v lexiaid-data:/app/data \
  lexiaid-backend:latest
```

### Option 3: Using Docker Compose (Recommended)

Create a `docker-compose.yml` file in the `backend/` directory:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    image: lexiaid-backend:latest
    container_name: lexiaid-backend
    ports:
      - "5000:5000"
    env_file:
      - .env
    volumes:
      # Mount Google Cloud credentials (read-only)
      - ./credentials:/app/credentials:ro
      # Persist database files
      - lexiaid-data:/app/data
      # Persist logs
      - lexiaid-logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:5000/health', timeout=5)"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  lexiaid-data:
    driver: local
  lexiaid-logs:
    driver: local
```

Run with Docker Compose:

```bash
docker-compose up -d
```

---

## Environment Variables

### Required Environment Variables

The following environment variables must be set for the application to function:

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLOUD_PROJECT_ID` | Your Google Cloud Project ID | `ai-tutor-dev-457802` |
| `DOCUMENT_AI_LOCATION` | Document AI processor location | `us` or `eu` |
| `LAYOUT_PROCESSOR_ID` | Document AI processor ID | `abc123def456` |
| `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` | Path to Firebase service account JSON | `/app/credentials/service-account.json` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FLASK_ENV` | Flask environment | `production` |
| `FLASK_APP` | Flask application entry point | `app.py` |
| `PORT` | Application port | `5000` |

### Setting Up .env File

Create a `.env` file in the `backend/` directory:

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

**Security Note:** Never commit the `.env` file to version control. Add it to `.gitignore`.

---

## Production Deployment

### Using Docker Secrets (Docker Swarm)

For production deployments using Docker Swarm:

```bash
# Create secrets
echo "your-project-id" | docker secret create gcp_project_id -
docker secret create firebase_credentials /path/to/service-account.json

# Deploy with secrets
docker service create \
  --name lexiaid-backend \
  --secret gcp_project_id \
  --secret firebase_credentials \
  -e GOOGLE_CLOUD_PROJECT_ID_FILE=/run/secrets/gcp_project_id \
  -e FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/run/secrets/firebase_credentials \
  -p 5000:5000 \
  lexiaid-backend:latest
```

### Using Kubernetes

Create a Kubernetes deployment:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lexiaid-secrets
type: Opaque
stringData:
  GOOGLE_CLOUD_PROJECT_ID: "your-project-id"
  DOCUMENT_AI_LOCATION: "us"
  LAYOUT_PROCESSOR_ID: "your-processor-id"
---
apiVersion: v1
kind: Secret
metadata:
  name: firebase-credentials
type: Opaque
data:
  service-account.json: <base64-encoded-json>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lexiaid-backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lexiaid-backend
  template:
    metadata:
      labels:
        app: lexiaid-backend
    spec:
      containers:
      - name: backend
        image: lexiaid-backend:latest
        ports:
        - containerPort: 5000
        envFrom:
        - secretRef:
            name: lexiaid-secrets
        volumeMounts:
        - name: firebase-creds
          mountPath: /app/credentials
          readOnly: true
        - name: data
          mountPath: /app/data
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
      volumes:
      - name: firebase-creds
        secret:
          secretName: firebase-credentials
      - name: data
        persistentVolumeClaim:
          claimName: lexiaid-data-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: lexiaid-backend-service
spec:
  selector:
    app: lexiaid-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 5000
  type: LoadBalancer
```

### Scaling Considerations

The Dockerfile is configured with 4 Gunicorn workers by default. Adjust based on:

- **CPU cores:** General rule is `(2 * num_cores) + 1`
- **Memory:** Each worker consumes ~200-500MB depending on workload
- **Concurrent requests:** More workers = more concurrent request handling

To override workers at runtime:

```bash
docker run -d \
  --name lexiaid-backend \
  -p 5000:5000 \
  --env-file .env \
  lexiaid-backend:latest \
  gunicorn --workers 8 --bind 0.0.0.0:5000 --timeout 120 app:app
```

---

## Troubleshooting

### Container Fails to Start

**Check logs:**
```bash
docker logs lexiaid-backend
```

**Common issues:**
1. Missing environment variables
2. Invalid Google Cloud credentials
3. Port 5000 already in use

### Application Can't Find .env File

The Dockerfile copies all files from `backend/` to `/app/` in the container. Ensure:
1. The `.env` file exists in the `backend/` directory before building
2. The `.env` file is not excluded by `.dockerignore`

**Verify file exists in container:**
```bash
docker exec lexiaid-backend ls -la /app/.env
```

### Google Cloud Authentication Errors

**Verify credentials are mounted:**
```bash
docker exec lexiaid-backend ls -la /app/credentials/
```

**Check environment variable:**
```bash
docker exec lexiaid-backend env | grep FIREBASE
```

### Database Connection Issues

The application creates SQLite databases in `/app/data/db/`. Ensure:
1. The `/app/data` directory is writable
2. A volume is mounted for persistence

**Check permissions:**
```bash
docker exec lexiaid-backend ls -la /app/data/
```

### Health Check Failing

The health check requires a `/health` endpoint. If it doesn't exist:

1. Remove the health check from the Dockerfile
2. Or implement a simple health endpoint in `app.py`:

```python
@app.route('/health')
def health():
    return jsonify({"status": "healthy"}), 200
```

### Performance Issues

**Monitor resource usage:**
```bash
docker stats lexiaid-backend
```

**Increase worker timeout for long-running AI operations:**
```bash
# In docker-compose.yml
command: ["gunicorn", "--workers", "4", "--bind", "0.0.0.0:5000", "--timeout", "300", "app:app"]
```

---

## Best Practices

1. **Never include `.env` in the image:** Use environment variables or secrets management
2. **Use volumes for persistent data:** Database files, logs, uploaded files
3. **Implement health checks:** Ensure container orchestration can detect failures
4. **Use multi-stage builds:** Reduces final image size (already implemented)
5. **Run as non-root user:** Security best practice (already implemented)
6. **Set resource limits:** Prevent container from consuming all host resources
7. **Use specific image tags:** Avoid `latest` in production

---

## Image Size Optimization

The multi-stage build significantly reduces image size:

- **Builder stage:** ~1.5GB (includes build tools)
- **Final stage:** ~800MB (runtime only)

**Further optimization:**
- Use `python:3.12-alpine` for even smaller images (requires additional build dependencies)
- Remove unnecessary packages from `requirements.txt`
- Use `.dockerignore` to exclude unnecessary files (already implemented)

---

## Maintenance

### Updating the Application

```bash
# Rebuild the image
docker build -t lexiaid-backend:v1.1.0 .

# Stop and remove old container
docker stop lexiaid-backend
docker rm lexiaid-backend

# Run new container
docker run -d --name lexiaid-backend -p 5000:5000 --env-file .env lexiaid-backend:v1.1.0
```

### Backup Database

```bash
# Create backup of data volume
docker run --rm -v lexiaid-data:/data -v $(pwd):/backup alpine tar czf /backup/lexiaid-data-backup.tar.gz /data
```

### Restore Database

```bash
# Restore from backup
docker run --rm -v lexiaid-data:/data -v $(pwd):/backup alpine tar xzf /backup/lexiaid-data-backup.tar.gz -C /
```

---

**Last Updated:** 2025-10-10  
**Dockerfile Version:** Multi-stage, Python 3.12, Gunicorn 21.2.0
