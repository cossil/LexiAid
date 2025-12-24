# Backend Main Analysis (`backend/app.py` & Infrastructure) (Golden Source)

**Authority:** Verified against `backend/app.py`, `docker-compose.yml`, and `backend/Dockerfile` (Dec 23, 2025)

---

## 1) Backend Entry Point & Runtime Model

### Flask entrypoint
- **Primary application entry:** `backend/app.py` defines `app = Flask(__name__)` and registers all blueprints.
- **WSGI entry (Docker):** `backend/Dockerfile` runs `gunicorn ... backend.app:app`.

### Execution style
- The backend is structured as a **single module-level Flask app** (not an application factory).
- Most initialization (services, graph compilation, checkpointers) occurs at import/startup time.

---

## 2) Environment Configuration

### `.env` loading
- **Explicit `.env` load in `backend/app.py`:**
  - `backend/app.py` constructs `dotenv_path = <repo_root>/.env` and calls `load_dotenv(dotenv_path)` very early.
- **Docker also loads `.env`:**
  - `docker-compose.yml` uses `env_file: - .env` for the backend container.

### Service modules also call `load_dotenv()`
The following service modules call `load_dotenv()` without an explicit path:
- `backend/services/auth_service.py`
- `backend/services/firestore_service.py`
- `backend/services/storage_service.py`
- `backend/services/tts_service.py`
- `backend/services/stt_service.py`

**Verified reality:** In the normal production path (`backend/app.py` as entrypoint), the `.env` is already loaded before these services initialize, so the redundant `load_dotenv()` calls are generally harmless.

**Risk (edge-case):** If a service module is imported/used outside of `backend/app.py` (or with a different working directory), the pathless `load_dotenv()` may search relative to CWD and load unexpected env values.

---

## 3) Networking / CORS

### Flask CORS config (server-side)
In `backend/app.py`, `flask_cors.CORS` is configured with:
- `origins="http://localhost:5173"`
- `supports_credentials=True`
- `methods=["GET","POST","PUT","DELETE","OPTIONS"]`
- `allow_headers=["*"]`

### Traefik CORS middleware (infrastructure-side)
In `docker-compose.yml`, the backend service includes Traefik labels configuring CORS headers for:
- `accessControlAllowOriginList=https://lexiaid.hankell.com.br`

**Risk:** Flask CORS is hard-coded to the dev origin (`http://localhost:5173`). In production behind Traefik, you may end up with competing/duplicated CORS headers. If Traefik does not fully override/normalize headers, browsers may reject responses.

---

## 4) Persistence & State (SQLite Checkpointers)

### Where DB files are written
`backend/app.py` uses `DatabaseManager._initialize` to select the directory for SQLite checkpoint files:
1) `DATA_DIR` env var if set
2) else `/app/data` if that path exists
3) else local fallback `backend/data`

### Docker volume wiring
- `docker-compose.yml` mounts `lexiaid-backend-data:/app/data`.

**Conclusion:** In Docker, checkpoint DB files are persisted to the named volume via `/app/data`.

### Databases created (verified in code)
`DatabaseManager` creates (at minimum):
- `quiz_checkpoints.db`
- `general_query_checkpoints.db`
- `supervisor_checkpoints.db`
- `document_understanding_checkpoints.db`
- `answer_formulation_sessions.db`

---

## 5) Logging

### Docker logs vs log volume
- `docker-compose.yml` mounts `lexiaid-backend-logs:/app/logs`.
- `backend/Dockerfile` configures Gunicorn to log to stdout/stderr:
  - `--access-logfile -`
  - `--error-logfile -`

**Conclusion:** The `/app/logs` volume is currently **mounted but not actively used** by Gunicorn or explicit Flask file handlers; operational logs are primarily captured via container stdout/stderr.

---

## 6) Service Initialization Pattern

### Service registry
`backend/app.py` initializes:
- `app.config['SERVICES'] = {}`
- `app.config['TOOLS'] = {}`

It then populates service instances using `initialize_component(...)`.

### Active services created at startup (verified)
- `AuthService`
- `FirestoreService`
- `StorageService`
- `DocAIService`
- `TTSService`
- `STTService`
- `DocumentRetrievalService` (stored in `SERVICES` under the key `DocRetrievalService`)

### Important dependency
- `DocumentRetrievalService` initialization is gated on `FirestoreService` and `StorageService` being available.

---

## 7) Blueprint Registration (Active)

Registered in `backend/app.py`:
- `/api/documents` → `backend/routes/document_routes.py`
- `/api/tts` → `backend/routes/tts_routes.py`
- `/api/stt` → `backend/routes/stt_routes.py`
- `/api/users` → `backend/routes/user_routes.py`
- `/api/progress` → `backend/routes/progress_routes.py`
- `/api/v2/answer-formulation` → `backend/routes/answer_formulation_routes.py`
- `/api/feedback` → `backend/routes/feedback_routes.py`
- `/api/admin` → `backend/routes/admin_routes.py`

---

## 8) LangGraph Reliability Measures (Active)

### LangGraph checkpointer monkeypatch
`backend/app.py` attempts to import:
- `backend.diagnostics.langgraph_patch`

`backend/diagnostics/langgraph_patch.py` auto-installs a monkeypatch on import (`install_patch()` is called at the bottom of the module).

**Verified purpose:** Reduce checkpoint persistence failures by deep-serializing objects before `SqliteSaver.put()`.

### `safe_supervisor_invoke`
`backend/app.py` defines `safe_supervisor_invoke(...)` that deep-serializes:
- Supervisor graph input before invoke
- Supervisor graph output after invoke

---

## 9) Healthchecks (Important Inconsistency)

### Application health endpoint (verified)
- `backend/app.py` defines: `GET /api/health`

### Docker Compose healthcheck (verified)
- `docker-compose.yml` healthcheck hits: `http://localhost:5000/api/health`

### Backend Dockerfile healthcheck (verified mismatch)
- `backend/Dockerfile` healthcheck hits: `http://localhost:5000/health`

**Conclusion:** The Dockerfile healthcheck path (`/health`) does **not** match the actual Flask health route (`/api/health`). In environments that rely on the Dockerfile healthcheck (rather than compose), this will report unhealthy.

---

## Summary (Verified)

- `.env` loading: **correct** (explicit in app + compose env_file), with **minor redundancy risk** in services.
- Data persistence: **correct** (`/app/data` volume is used by SQLite checkpointers).
- Log persistence: `/app/logs` volume is **currently unused** by the configured logging strategy.
- CORS: dev-only Flask CORS config may **conflict** with production Traefik CORS headers.
- LangGraph stability patch: **actively imported** and should be treated as production-critical.
- Healthchecks: **Dockerfile mismatch** (`/health` vs `/api/health`).
