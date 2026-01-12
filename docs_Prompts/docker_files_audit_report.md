# Docker Files Audit Report

## Executive Summary

This audit analyzed all Docker-related files in the LexiAid codebase. The analysis identifies **3 actively used files**, **3 VPS infrastructure files**, and **11 obsolete files** that can be safely deleted.

---

## Files by Category

### ✅ ACTIVELY USED (Keep)

| File | Location | Purpose | Used By |
|------|----------|---------|---------|
| `Dockerfile` | Root | **Frontend** - Multi-stage build: Node.js builder → Nginx production. Serves React app on port 80. | `docker-compose.yml` line 70 |
| `docker-compose.yml` | Root | **Master orchestrator** - Defines both backend and frontend services, volumes, networks, Traefik labels. | Local build + VPS deployment |
| `Dockerfile` | `backend/` | **Backend** - Multi-stage build: Python 3.12 → Gunicorn on port 5000. Includes `ffmpeg` for audio processing. | `docker-compose.yml` line 13 |

---

### ⚠️ VPS INFRASTRUCTURE (Keep on VPS)

These files configure VPS-level services (separate from LexiAid application). They are **not used locally** but are needed on the VPS.

| File | Location | Purpose | Domain |
|------|----------|---------|--------|
| `traefik.yaml` | `backend/` | Traefik reverse proxy + SSL via Let's Encrypt. Routes traffic to `api.hankell.com.br` and `lexiaid.hankell.com.br`. | `*.hankell.com.br` |
| `portainer.yaml` | `backend/` | Portainer CE container management UI. | `portainer.hankell.com.br` |
| `n8n.yaml` | `backend/` | n8n workflow automation (gitignored - contains secrets). | `n8n.hankell.com.br` |

> [!NOTE]
> These VPS infrastructure files should be deployed separately via `docker stack deploy -c <file>.yaml <stack-name>`.

---

### 🗑️ OBSOLETE - CAN BE DELETED

#### `docs_Prompts/docker-compose.yml`
**Reason**: Copy made for analysis purposes. Not used in any deployment.

#### `backend/OLD_VPS Docker files/` (8 files)

| File | Reason for Deletion |
|------|---------------------|
| `Dockerfile.frontend` | Duplicate of root `Dockerfile` |
| `VPS_Backend_docker-compose.yml` | Replaced by root `docker-compose.yml` - VPS now uses same file |
| `VPS_Backend_Dockerfile` | Identical to `backend/Dockerfile` |
| `VPS_Backend_.dockerignore` | Obsolete - not referenced by any Dockerfile |
| `VPS_Backend_.env` | Obsolete - VPS uses `backend/.env` |
| `VPS_Dockerfile` | Old version - missing `ffmpeg` dependency |
| `VPS_.dockerignore` | Obsolete - not referenced by any Dockerfile |
| `VPS_Backend_requirements.txt` | Outdated - VPS uses `backend/requirements.txt` |
| `VPS_requirements.txt` | Outdated - VPS uses `backend/requirements.txt` |
| `docker-compose.yml.backup.*` | Backup file - no longer needed |
| `cors-config.json` | Obsolete - CORS now configured via Traefik labels |
| `nginx.conf` | Obsolete - root directory has `nginx.conf` for frontend |

#### `backend/OLD_VPS files/` (2 files)

| File | Reason for Deletion |
|------|---------------------|
| `.env_VPS` | Duplicate of `VPS_Backend_.env` |
| `Dockerfile_VPS` | Duplicate of `VPS_Backend_Dockerfile` |

---

## Critical Issues Found

### ⚠️ Healthcheck Path Mismatch

| File | Healthcheck Path | Status |
|------|------------------|--------|
| `backend/Dockerfile` (line 89) | `/health` | ❌ Incorrect |
| `docker-compose.yml` (line 59) | `/api/health` | ❌ Incorrect |
| `backend/app.py` (route) | `/health` | ✅ Actual route |

**Impact**: Docker healthcheck in `docker-compose.yml` will fail because it targets `/api/health` but the actual route is `/health`.

**Recommendation**: Update `docker-compose.yml` line 59 to use `/health`:
```yaml
test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:5000/health', timeout=5)"]
```

---

## Recommended Actions

### Immediate Cleanup

```powershell
# Delete obsolete directories
Remove-Item -Recurse -Force "c:\Ai\aitutor_37\backend\OLD_VPS Docker files"
Remove-Item -Recurse -Force "c:\Ai\aitutor_37\backend\OLD_VPS files"

# Delete analysis copy
Remove-Item "c:\Ai\aitutor_37\docs_Prompts\docker-compose.yml"
```

### Fix Healthcheck (Priority: High)

Update `docker-compose.yml` line 59 to match the actual route in `app.py`.

---

## File Reference Table

| File | Path | Lines | Bytes | Status |
|------|------|-------|-------|--------|
| `Dockerfile` | Root | 92 | 2950 | ✅ Active |
| `docker-compose.yml` | Root | 125 | 4586 | ✅ Active |
| `Dockerfile` | `backend/` | 106 | 3167 | ✅ Active |
| `traefik.yaml` | `backend/` | 73 | 2590 | ⚠️ VPS Infra |
| `portainer.yaml` | `backend/` | 60 | 1693 | ⚠️ VPS Infra |
| `n8n.yaml` | `backend/` | ~250 | ~9000 | ⚠️ VPS Infra (gitignored) |
| `docker-compose.yml` | `docs_Prompts/` | 110 | 3969 | 🗑️ Delete |
| Multiple files | `backend/OLD_VPS Docker files/` | - | ~18KB | 🗑️ Delete |
| 2 files | `backend/OLD_VPS files/` | - | ~5.5KB | 🗑️ Delete |

**Total files to delete**: 11 files (~27KB)
