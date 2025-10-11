# LexiAid Docker Deployment

Complete Docker deployment solution for the LexiAid AI-powered learning platform.

---

## 🚀 Quick Start

```bash
# 1. Verify prerequisites
docker ps | grep traefik
docker network inspect hankellnet

# 2. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your credentials

# 3. Deploy
docker-compose up -d

# 4. Verify
curl https://lexiaid.hankell.com.br/health
curl https://api.lexiaid.hankell.com.br/health
```

---

## 📋 Documentation Index

### Quick Start Guides
- **[Deployment Quick Start](./DEPLOYMENT_QUICK_START.md)** - 5-step deployment guide
- **[Backend Quick Start](./backend/DOCKER_QUICK_START.md)** - Backend-specific guide
- **[Frontend Quick Start](./DOCKER_FRONTEND_QUICK_START.md)** - Frontend-specific guide

### Comprehensive Guides
- **[Full Deployment Guide](./DOCKER_DEPLOYMENT_GUIDE.md)** - Complete deployment documentation
- **[Backend Deployment](./backend/DOCKER_DEPLOYMENT.md)** - Backend deep dive
- **[Frontend Deployment](./DOCKER_FRONTEND_GUIDE.md)** - Frontend deep dive

### Implementation Summaries
- **[Docker Compose Summary](./docs/DOCKER_COMPOSE_IMPLEMENTATION_SUMMARY.md)** - Master orchestration details
- **[Backend Implementation](./docs/DOCKER_IMPLEMENTATION_SUMMARY.md)** - Backend Docker details
- **[Frontend Implementation](./docs/DOCKER_FRONTEND_IMPLEMENTATION_SUMMARY.md)** - Frontend Docker details

### Analysis & Configuration
- **[Environment Loading Analysis](./docs/ENV_LOADING_ANALYSIS.md)** - How .env files are loaded
- **[Security Cleanup Report](./docs/SECURITY_CLEANUP_REPORT.md)** - Security considerations

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Internet                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Traefik Reverse Proxy                   │
│              (SSL Termination + Routing)                 │
│                  Network: hankellnet                     │
└──────────────┬──────────────────────┬───────────────────┘
               │                      │
               ▼                      ▼
┌──────────────────────┐  ┌──────────────────────────────┐
│      Frontend        │  │         Backend              │
│  lexiaid.hankell     │  │  api.lexiaid.hankell         │
│    .com.br           │  │    .com.br                   │
├──────────────────────┤  ├──────────────────────────────┤
│  Nginx (Port 80)     │  │  Flask + Gunicorn (Port 5000)│
│  React SPA (Vite)    │  │  Python 3.12                 │
│  ~25MB Image         │  │  ~800MB Image                │
└──────────────────────┘  └──────────────────────────────┘
                              │
                              ├─ Google Cloud Storage
                              ├─ Firebase/Firestore
                              ├─ Document AI
                              └─ Text-to-Speech
```

---

## 📦 Components

### Backend
- **Technology:** Python 3.12, Flask, Gunicorn
- **Image Size:** ~800MB
- **Port:** 5000 (internal)
- **Domain:** `api.lexiaid.hankell.com.br`
- **Resources:** 2 CPU cores, 2GB RAM

### Frontend
- **Technology:** React 18, Vite, Nginx
- **Image Size:** ~25MB
- **Port:** 80 (internal)
- **Domain:** `lexiaid.hankell.com.br`
- **Resources:** 0.5 CPU cores, 256MB RAM

### Traefik (External)
- **Purpose:** Reverse proxy, SSL termination
- **Network:** `hankellnet`
- **SSL:** Let's Encrypt automatic certificates
- **Entrypoint:** `websecure` (HTTPS)

---

## 🔧 Configuration Files

### Docker Files

| File | Location | Purpose |
|------|----------|---------|
| `docker-compose.yml` | Root | Master orchestration |
| `Dockerfile` | Root | Frontend build |
| `Dockerfile` | `backend/` | Backend build |
| `nginx.conf` | Root | Nginx SPA configuration |
| `.dockerignore` | Root | Frontend build exclusions |
| `.dockerignore` | `backend/` | Backend build exclusions |

### Environment Files

| File | Location | Purpose |
|------|----------|---------|
| `.env` | `backend/` | Backend environment variables |
| `.env.example` | `backend/` | Backend template |
| `.env` | Root (optional) | Frontend build variables |

---

## 🌐 Domains & Routing

### Production URLs

- **Frontend:** https://lexiaid.hankell.com.br
- **Backend API:** https://api.lexiaid.hankell.com.br

### Health Check Endpoints

- **Frontend:** https://lexiaid.hankell.com.br/health
- **Backend:** https://api.lexiaid.hankell.com.br/health

### DNS Configuration Required

```
lexiaid.hankell.com.br     → Server IP (A Record)
api.lexiaid.hankell.com.br → Server IP (A Record)
```

---

## 🔐 Security Features

### Network Security
- ✅ HTTPS-only access via Traefik
- ✅ Automatic SSL certificates (Let's Encrypt)
- ✅ Network isolation (hankellnet)
- ✅ No direct port exposure

### Container Security
- ✅ Non-root user execution (where applicable)
- ✅ Read-only credential mounts
- ✅ Resource limits prevent DoS
- ✅ Health checks for automatic recovery

### Data Security
- ✅ Environment variables not in images
- ✅ Credentials stored outside containers
- ✅ Persistent volumes for sensitive data
- ✅ Security headers (Nginx)

---

## 📊 Resource Requirements

### Minimum Server Specs
- **CPU:** 4 cores
- **RAM:** 4GB
- **Disk:** 20GB
- **OS:** Linux (Ubuntu 20.04+ recommended)

### Recommended Server Specs
- **CPU:** 8 cores
- **RAM:** 8GB
- **Disk:** 50GB SSD
- **OS:** Linux (Ubuntu 22.04 LTS)

### Resource Allocation

| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|--------------|-------------|----------------|
| Backend | 2 cores | 2048MB | 0.5 cores | 512MB |
| Frontend | 0.5 cores | 256MB | 0.1 cores | 64MB |
| **Total** | **2.5 cores** | **2304MB** | **0.6 cores** | **576MB** |

---

## 🚦 Deployment Checklist

### Prerequisites
- [ ] Docker installed (20.10+)
- [ ] Docker Compose installed (1.29+)
- [ ] Traefik running on `hankellnet` network
- [ ] DNS configured and propagated
- [ ] Google Cloud project set up
- [ ] Firebase project configured

### Configuration
- [ ] `backend/.env` file created and configured
- [ ] Google Cloud credentials in `backend/credentials/`
- [ ] Frontend environment variables set (if needed)
- [ ] Traefik `letsencryptresolver` configured

### Deployment
- [ ] Images built successfully
- [ ] Services started without errors
- [ ] Health checks passing
- [ ] SSL certificates issued
- [ ] Frontend accessible via HTTPS
- [ ] Backend API accessible via HTTPS

### Post-Deployment
- [ ] Logs being generated
- [ ] Volumes created and mounted
- [ ] Monitoring configured
- [ ] Backup strategy in place

---

## 🛠️ Common Commands

### Deployment

```bash
# Build and deploy
docker-compose up -d --build

# Deploy without building
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Monitoring

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check service status
docker-compose ps

# Monitor resource usage
docker stats lexiaid-backend lexiaid-frontend
```

### Maintenance

```bash
# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build

# Scale frontend
docker-compose up -d --scale frontend=3

# Update services
git pull
docker-compose build
docker-compose up -d
```

---

## 🐛 Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Verify environment
docker exec lexiaid-backend env
docker exec lexiaid-frontend ls -la /usr/share/nginx/html
```

### Can't Access via Domain

```bash
# Verify Traefik routing
docker logs traefik | grep lexiaid

# Check DNS
nslookup lexiaid.hankell.com.br
nslookup api.lexiaid.hankell.com.br

# Test locally
curl http://localhost:80/health
curl http://localhost:5000/health
```

### SSL Certificate Issues

```bash
# Check Traefik logs
docker logs traefik | grep letsencrypt

# Verify certificate resolver
docker exec traefik cat /etc/traefik/traefik.yml | grep letsencryptresolver

# Wait 5-10 minutes for certificate issuance
```

---

## 📚 Additional Resources

### Official Documentation
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)

### LexiAid Documentation
- [Backend API Documentation](./backend/README.md)
- [Frontend Documentation](./README.md)
- [Development Guide](./docs/DEVELOPMENT.md)

---

## 🤝 Support

### Getting Help

1. Check the troubleshooting section in deployment guides
2. Review container logs: `docker-compose logs -f`
3. Verify configuration files
4. Check DNS and network connectivity

### Common Issues

- **Port conflicts:** Change port mappings in docker-compose.yml
- **Network not found:** Create `hankellnet` network
- **SSL not working:** Verify Traefik configuration
- **Backend errors:** Check `.env` file and credentials

---

## 📝 License

This project is part of the LexiAid AI-powered learning platform.

---

## 🎯 Next Steps

After successful deployment:

1. **Configure Monitoring**
   - Set up Prometheus + Grafana
   - Configure alerting

2. **Set Up Backups**
   - Automated database backups
   - Volume snapshots

3. **Implement CI/CD**
   - Automated builds
   - Automated deployments

4. **Optimize Performance**
   - CDN for frontend
   - Database optimization
   - Caching strategies

---

**Last Updated:** 2025-10-11  
**Status:** ✅ Production Ready  
**Deployment Type:** Docker Compose with Traefik  
**SSL:** Let's Encrypt Automatic Certificates
