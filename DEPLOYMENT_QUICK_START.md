# LexiAid Deployment Quick Start

Fast deployment guide for the LexiAid full stack application with Traefik.

---

## Prerequisites Checklist

- [ ] Traefik running on `hankellnet` network
- [ ] DNS configured: `lexiaid.hankell.com.br` and `api.lexiaid.hankell.com.br`
- [ ] Backend `.env` file configured
- [ ] Google Cloud credentials in `backend/credentials/`

---

## 5-Step Deployment

### 1. Verify Prerequisites

```bash
# Check Traefik is running
docker ps | grep traefik

# Verify network exists
docker network inspect hankellnet

# Check DNS (from external machine)
nslookup lexiaid.hankell.com.br
nslookup api.lexiaid.hankell.com.br
```

### 2. Configure Environment

```bash
# Navigate to project root
cd /path/to/aitutor_37

# Verify backend .env exists
ls -la backend/.env

# Verify credentials exist
ls -la backend/credentials/service-account.json
```

### 3. Build Images

```bash
# Build both services
docker-compose build

# This will take 3-5 minutes on first build
```

### 4. Deploy Services

**For Docker Swarm:**
```bash
docker stack deploy -c docker-compose.yml lexiaid
```

**For Docker Compose:**
```bash
docker-compose up -d
```

### 5. Verify Deployment

```bash
# Check services are running
docker ps | grep lexiaid

# Test health endpoints
curl https://api.lexiaid.hankell.com.br/health
curl https://lexiaid.hankell.com.br/health

# View logs
docker logs lexiaid-backend
docker logs lexiaid-frontend
```

---

## Expected Results

### Service Status

```bash
$ docker ps | grep lexiaid
lexiaid-backend    lexiaid-backend:latest    Up 2 minutes    Healthy
lexiaid-frontend   lexiaid-frontend:latest   Up 2 minutes    Healthy
```

### Health Check Responses

**Backend:**
```bash
$ curl https://api.lexiaid.hankell.com.br/health
{"status": "healthy"}
```

**Frontend:**
```bash
$ curl https://lexiaid.hankell.com.br/health
healthy
```

### SSL Certificates

Both domains should have valid Let's Encrypt certificates:
- ✅ `lexiaid.hankell.com.br`
- ✅ `api.lexiaid.hankell.com.br`

---

## Common Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update and redeploy
git pull
docker-compose build
docker-compose up -d
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Common issues:
# - Missing .env file
# - Invalid credentials
# - Network not found
```

### Can't Access via Domain

```bash
# Verify Traefik routing
docker logs traefik | grep lexiaid

# Check DNS
dig lexiaid.hankell.com.br
dig api.lexiaid.hankell.com.br

# Test from server
curl http://localhost:80/health  # Frontend
curl http://localhost:5000/health  # Backend
```

### SSL Certificate Not Issued

```bash
# Check Traefik logs
docker logs traefik | grep letsencrypt

# Verify DNS is pointing to server
# Wait 5-10 minutes for certificate issuance
```

---

## Service URLs

- **Frontend:** https://lexiaid.hankell.com.br
- **Backend API:** https://api.lexiaid.hankell.com.br

---

## Next Steps

1. Configure monitoring and alerting
2. Set up automated backups
3. Configure log aggregation
4. Set up CI/CD pipeline
5. Review security settings

---

**For detailed documentation, see:** [DOCKER_DEPLOYMENT_GUIDE.md](./DOCKER_DEPLOYMENT_GUIDE.md)
