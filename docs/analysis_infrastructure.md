# Analysis: Infrastructure

> **Files**: Dockerfile, docker-compose.yml, requirements.txt, .gitignore  
> **Status**: [Active]  
> **Verified**: 2026-01-09

---

## Critical Findings

> [!CAUTION]
> **Healthcheck Path Mismatch**  
> - [backend/Dockerfile](file:///C:/Ai/aitutor_37/backend/Dockerfile) line 89: `/health`  
> - [docker-compose.yml](file:///C:/Ai/aitutor_37/docker-compose.yml) line 59: `/api/health`  
> - `app.py` line 735: Route is `/api/health`  
> 
> **Risk**: Standalone Dockerfile builds fail healthcheck. Mitigated by docker-compose override.

> [!WARNING]
> **Unused Dependencies in Root requirements.txt**  
> Lines 47, 171, 174, 15 contain:
> - `Flask-SocketIO==5.5.1`
> - `python-socketio==5.13.0`
> - `python-engineio==4.12.1`
> - `bidict==0.23.1`
> 
> These are NOT used - app uses `flask-sock`.

> [!NOTE]
> **Duplicate Requirements Files**  
> - [requirements.txt](file:///C:/Ai/aitutor_37/requirements.txt) (228 lines) - Root, appears outdated
> - [backend/requirements.txt](file:///C:/Ai/aitutor_37/backend/requirements.txt) (61 lines) - Used by Docker

---

## Docker Architecture

### Backend Dockerfile

**Base**: `python:3.12-slim`

**Critical Dependencies** (line 57):
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    ffmpeg \
```

`ffmpeg` is required for `pydub` audio processing.

**Runtime**:
- User: `appuser` (non-root)
- Port: 5000
- CMD: `gunicorn` with 4 workers

### Frontend Dockerfile

**Base**: `node:20-alpine` → `nginx:stable-alpine`

**Build Args** (lines 30-36):
- All `VITE_*` Firebase config
- `VITE_BACKEND_API_URL`

### docker-compose.yml

**Services**:
| Service | Image | Port |
|---------|-------|------|
| `backend` | `cossil/lexiaid-backend:latest` | 5000 |
| `frontend` | `cossil/lexiaid-frontend:latest` | 80 |

**Volumes**:
```yaml
volumes:
  - lexiaid-backend-data:/app/data      # SQLite DBs
  - lexiaid-backend-logs:/app/logs       # App logs  
  - ./backend/credentials:/app/credentials:ro
```

**Network**: `hankellnet` (external)

**Traefik Labels**: Configured for `api.hankell.com.br` and `lexiaid.hankell.com.br`.

---

## .gitignore Verification ✅

**SQLite Patterns** (lines 4-8):
```
*.db
*.sqlite
*.sqlite3
*.db-shm
*.db-wal
```

All checkpoint databases are correctly ignored.

**Other Patterns**:
- `backend/.env`, `.env` - Secrets
- `backend/debug_audio/` - Temp audio files
- `*.log` - Log files

---

## Requirements.txt Comparison

### backend/requirements.txt (Docker Uses This)

| Package | Version | Status |
|---------|---------|--------|
| `flask-sock` | 0.7.0 | ✅ Active |
| `pydub` | 0.25.1 | ✅ Active |
| `langchain-google-genai` | 2.1.4 | ✅ Active |
| `langgraph` | 0.4.7 | ✅ Active |
| `google-generativeai` | Not listed | ⚠️ Used by DUA |

### Root requirements.txt (NOT Used by Docker)

| Package | Version | Status |
|---------|---------|--------|
| `Flask-SocketIO` | 5.5.1 | ❌ Unused |
| `python-socketio` | 5.13.0 | ❌ Unused |
| `google-genai` | 1.15.0 | ✅ Active (DUA) |

---

## Volume Mapping Verification ✅

**docker-compose.yml** maps `/app/data` which aligns with:

**DatabaseManager path resolution** (`app.py` lines 214-220):
```python
if os.getenv('DATA_DIR'):
    base_dir = os.getenv('DATA_DIR')
elif os.path.exists('/app/data'):
    base_dir = '/app/data'
else:
    base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
```

All SQLite checkpointers write to `/app/data/*.db` in Docker.

---

## Recommendations

1. **Fix healthcheck path** in `backend/Dockerfile`:
   ```dockerfile
   CMD python -c "import requests; requests.get('http://localhost:5000/api/health', timeout=5)"
   ```

2. **Remove unused dependencies** from root `requirements.txt`:
   - `Flask-SocketIO`, `python-socketio`, `python-engineio`, `bidict`

3. **Add google-generativeai** to `backend/requirements.txt`:
   - Required by DUA graph (`import google.generativeai as genai`)

4. **Consider consolidating** to single requirements.txt source of truth
