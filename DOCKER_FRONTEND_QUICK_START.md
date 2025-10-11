# Frontend Docker Quick Start

Quick reference for building and running the LexiAid frontend with Docker.

---

## Prerequisites Checklist

- [ ] Docker installed and running
- [ ] Node.js 20+ (for local development)
- [ ] Environment variables configured (if needed)

---

## Quick Start (3 Steps)

### 1. Build the Image

```bash
docker build -t lexiaid-frontend:latest .
```

### 2. Run the Container

**Using Docker:**

```bash
docker run -d --name lexiaid-frontend -p 80:80 lexiaid-frontend:latest
```

**Using Docker Compose:**

```bash
docker-compose -f docker-compose.frontend.yml up -d
```

### 3. Verify It's Running

```bash
# Check container status
docker ps

# View logs
docker logs lexiaid-frontend

# Test the application
curl http://localhost:80/health

# Open in browser
# Navigate to: http://localhost
```

---

## Common Commands

### Container Management

```bash
# Start container
docker start lexiaid-frontend

# Stop container
docker stop lexiaid-frontend

# Restart container
docker restart lexiaid-frontend

# Remove container
docker rm lexiaid-frontend

# View logs (follow mode)
docker logs -f lexiaid-frontend
```

### Docker Compose Commands

```bash
# Start services
docker-compose -f docker-compose.frontend.yml up -d

# Stop services
docker-compose -f docker-compose.frontend.yml down

# View logs
docker-compose -f docker-compose.frontend.yml logs -f

# Rebuild and restart
docker-compose -f docker-compose.frontend.yml up -d --build
```

### Debugging

```bash
# Execute commands inside container
docker exec -it lexiaid-frontend sh

# Check Nginx configuration
docker exec lexiaid-frontend nginx -t

# View Nginx logs
docker exec lexiaid-frontend cat /var/log/nginx/error.log

# Check file structure
docker exec lexiaid-frontend ls -la /usr/share/nginx/html
```

---

## Environment Variables

### Build-Time Variables (Vite)

Variables must be prefixed with `VITE_` and set at **build time**:

```bash
# Method 1: Create .env file
cat > .env << EOF
VITE_BACKEND_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=your-api-key
EOF

# Then build
docker build -t lexiaid-frontend:latest .

# Method 2: Use --build-arg
docker build \
  --build-arg VITE_BACKEND_API_URL=http://localhost:5000 \
  -t lexiaid-frontend:latest .
```

**Important:** Environment variables are baked into the build. To change them, you must rebuild the image.

---

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker logs lexiaid-frontend

# Verify Nginx config
docker exec lexiaid-frontend nginx -t
```

### Port Already in Use

```bash
# Find process using port 80
lsof -i :80  # macOS/Linux
netstat -ano | findstr :80  # Windows

# Use different port
docker run -p 8080:80 lexiaid-frontend:latest
```

### 404 on Routes

**Cause:** SPA routing not configured

**Solution:** Verify `nginx.conf` has:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### API Calls Failing

**Cause:** Backend URL not set correctly

**Solution:** Rebuild with correct backend URL:
```bash
docker build --build-arg VITE_BACKEND_API_URL=http://backend:5000 -t lexiaid-frontend:latest .
```

---

## Production Deployment

### Build for Production

```bash
# Build with version tag
docker build -t lexiaid-frontend:v1.0.0 .

# Tag for registry
docker tag lexiaid-frontend:v1.0.0 gcr.io/your-project/lexiaid-frontend:v1.0.0

# Push to registry
docker push gcr.io/your-project/lexiaid-frontend:v1.0.0
```

### Run in Production

```bash
docker run -d \
  --name lexiaid-frontend \
  -p 80:80 \
  --restart unless-stopped \
  --memory="128m" \
  --cpus="0.5" \
  lexiaid-frontend:v1.0.0
```

---

## Full Stack Setup

### Run Frontend + Backend Together

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

### Using Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    image: lexiaid-backend:latest
    ports:
      - "5000:5000"
    networks:
      - lexiaid-network

  frontend:
    image: lexiaid-frontend:latest
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

## Performance Tips

### Optimize Build Time

```bash
# Use BuildKit for faster builds
DOCKER_BUILDKIT=1 docker build -t lexiaid-frontend:latest .

# Use cache from previous build
docker build --cache-from lexiaid-frontend:latest -t lexiaid-frontend:latest .
```

### Reduce Image Size

The multi-stage build already reduces size from ~400MB to ~25MB.

**Current optimization:**
- ✅ Multi-stage build
- ✅ Alpine base image
- ✅ .dockerignore file
- ✅ Only production dependencies

---

## Security Best Practices

1. **Never commit .env to Git**
   ```bash
   # Verify it's in .gitignore
   git check-ignore .env
   ```

2. **Run as non-root** (already configured in Dockerfile)

3. **Use specific image tags** (not `latest` in production)

4. **Scan images for vulnerabilities**
   ```bash
   docker scan lexiaid-frontend:latest
   ```

5. **Use HTTPS in production** (add reverse proxy like Traefik)

---

## Image Information

- **Builder Stage:** ~400MB (Node.js + dependencies)
- **Final Image:** ~25MB (Nginx + static files)
- **Build Time:** 2-4 minutes (first), 30s (cached)
- **Startup Time:** <2 seconds
- **Memory Usage:** ~10-20MB (idle)

---

## Next Steps

- Review full documentation: [DOCKER_FRONTEND_GUIDE.md](./DOCKER_FRONTEND_GUIDE.md)
- Set up CI/CD pipeline
- Configure monitoring and logging
- Deploy to cloud platform

---

**Need Help?** Check the full deployment guide or container logs for detailed error messages.
