# Consultant Questions - Detailed Answers

## Overview
This document provides comprehensive answers to the deployment consultant's questions regarding the LexiAid VPS deployment on Hostinger.

---

## Question 1: Backend Startup Command

### Answer

**Dockerfile CMD/ENTRYPOINT**: The backend uses **Gunicorn** as the WSGI server.

**Location**: `backend/Dockerfile` line 92-100

**Exact Command**:
```dockerfile
CMD ["gunicorn", \
     "--workers", "4", \
     "--worker-class", "sync", \
     "--bind", "0.0.0.0:5000", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "--log-level", "info", \
     "app:app"]
```

### Configuration Details

**WSGI Server**: Gunicorn 21.2.0 (installed in builder stage, line 39)

**Key Parameters**:
- **Workers**: 4 processes (should be adjusted based on VPS CPU cores)
- **Worker Class**: `sync` (synchronous workers)
- **Bind Address**: `0.0.0.0:5000` (all interfaces, port 5000)
- **Timeout**: 120 seconds (for long-running AI operations)
- **Logging**: Both access and error logs to stdout/stderr (`-`)
- **Log Level**: `info`
- **Application**: `app:app` (module:variable from `backend/app.py`)

### Python Version

**Builder Stage**: Python 3.12-slim (line 10)
**Final Stage**: Python 3.12-slim (line 44)

**CRITICAL**: The Dockerfile uses Python 3.12, but the consultant mentioned the container might be running Python 3.11. This is a **major discrepancy** that needs investigation.

### How to Verify on VPS

**Check actual Python version in running container**:
```bash
# Get container ID
docker ps | grep lexiaid-backend

# Check Python version
docker exec <container_id> python --version

# Expected output: Python 3.12.x
```

**Check Gunicorn is running**:
```bash
# Check process inside container
docker exec <container_id> ps aux | grep gunicorn

# Expected: Multiple gunicorn processes (master + 4 workers)
```

**Check if app.py is being executed directly (wrong)**:
```bash
docker exec <container_id> ps aux | grep "python.*app.py"

# Should return nothing - if it shows results, the CMD is not being used
```

### Alternative Startup Methods (Not Used)

The application **does not use**:
- ❌ `flask run` - Development server (not production-ready)
- ❌ `python app.py` - Direct execution (only for local development)
- ❌ `uwsgi` - Alternative WSGI server (not installed)

### Development vs Production

**Local Development** (from `app.py` line 800):
```python
if __name__ == '__main__':
    port = int(os.getenv('PORT', 8081))
    app.run(debug=True, host='0.0.0.0', port=port)
```

**Production** (Docker):
- Uses Gunicorn (production WSGI server)
- 4 worker processes for concurrency
- 120s timeout for AI operations
- Proper logging to stdout/stderr

---

## Question 2: Production Logging Configuration

### Answer

**Logging Destination**: All logs are sent to **stdout/stderr** to be captured by Docker.

### Gunicorn Logging

**Configuration** (from Dockerfile):
```dockerfile
"--access-logfile", "-",      # Access logs to stdout
"--error-logfile", "-",       # Error logs to stderr
"--log-level", "info",        # Log level: info
```

The `-` means stdout/stderr, which Docker captures automatically.

### Application Logging

**Python Logging** (from `app.py` and service files):
- Uses standard Python `logging` module
- No custom logging configuration file
- Logs go to stdout by default
- Each module configures its own logger

**Example from services**:
```python
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
```

### How to Access Logs on VPS

**View live logs**:
```bash
# All logs from backend container
docker logs -f lexiaid-backend

# Last 100 lines
docker logs --tail 100 lexiaid-backend

# Logs since specific time
docker logs --since 30m lexiaid-backend

# Filter for errors only
docker logs lexiaid-backend 2>&1 | grep -i error
```

**View startup errors specifically**:
```bash
# Check container status
docker ps -a | grep lexiaid-backend

# If container is stopped/restarting, view logs
docker logs lexiaid-backend | head -50

# Check for Python tracebacks
docker logs lexiaid-backend 2>&1 | grep -A 20 "Traceback"
```

**Check Gunicorn worker logs**:
```bash
# Gunicorn logs worker starts/stops
docker logs lexiaid-backend | grep -i "worker"

# Expected output:
# [INFO] Starting gunicorn 21.2.0
# [INFO] Listening at: http://0.0.0.0:5000
# [INFO] Using worker: sync
# [INFO] Booting worker with pid: X
```

### Persistent Logs (Optional)

**Current Setup**: Logs are **not persisted** to files inside the container.

**If you need persistent logs**, modify `docker-compose.yml`:

```yaml
services:
  backend:
    volumes:
      - lexiaid-backend-logs:/app/logs
    command: >
      gunicorn
      --workers 4
      --bind 0.0.0.0:5000
      --timeout 120
      --access-logfile /app/logs/access.log
      --error-logfile /app/logs/error.log
      --log-level info
      app:app
```

**Then access logs**:
```bash
# View logs from volume
docker exec lexiaid-backend cat /app/logs/error.log
docker exec lexiaid-backend tail -f /app/logs/access.log
```

### Error Trace File

**Special Error Logging** (from `app.py` line 802-805):
```python
with open('error_trace.log', 'a') as f:
    f.write(f"Timestamp: {datetime.now()}\n")
    f.write(traceback.format_exc())
```

This creates `error_trace.log` in `/app/` directory for critical ModuleNotFoundError.

**Check if this file exists**:
```bash
docker exec lexiaid-backend ls -la /app/error_trace.log
docker exec lexiaid-backend cat /app/error_trace.log
```

### Debug Logging

**Enable DEBUG level** (if needed for troubleshooting):

**Option 1: Environment variable**:
```bash
# Add to backend/.env
LOG_LEVEL=DEBUG
```

**Option 2: Modify Dockerfile CMD**:
```dockerfile
"--log-level", "debug",
```

Then rebuild and redeploy.

---

## Question 3: Environment Variable Management

### Answer

**Method**: Environment variables are supplied via **`.env` file** loaded in `docker-compose.yml`.

### Docker Compose Configuration

**Location**: `docker-compose.yml` lines 29-32

```yaml
services:
  backend:
    env_file:
      - ./backend/.env
```

This loads all variables from `backend/.env` into the container.

### Required Environment Variables

**Location**: `backend/.env.example` (template file)

**Critical Variables**:

**Google Cloud Platform**:
```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GCP_PROJECT_ID=your-project-id  # Alias
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/credentials/service-account-key.json
GCS_BUCKET_NAME=your-bucket-name
```

**Document AI**:
```bash
DOCUMENT_AI_LOCATION=us
LAYOUT_PROCESSOR_ID=your-processor-id
GOOGLE_DOCUMENT_AI_PROCESSOR_NAME=projects/PROJECT_ID/locations/us/processors/PROCESSOR_ID
```

**Firebase**:
```bash
FIRESTORE_DATABASE_NAME=ai-tutor-dev-457802
```

**Google API**:
```bash
GOOGLE_API_KEY=your-gemini-api-key
```

**TTS/STT Defaults**:
```bash
TTS_DEFAULT_VOICE_NAME=en-US-Wavenet-D
TTS_DEFAULT_SPEAKING_RATE=1.0
TTS_DEFAULT_PITCH=0
STT_DEFAULT_LANGUAGE_CODE=en-US
STT_DEFAULT_MODEL=latest_short
```

**Flask**:
```bash
FLASK_APP=app.py
FLASK_ENV=production
PORT=5000
```

### Service Account Credentials

**Volume Mount** (from `docker-compose.yml` line 38):
```yaml
volumes:
  - ./backend/credentials:/app/credentials:ro
```

The service account JSON file must be placed in:
- **Host**: `./backend/credentials/service-account-key.json`
- **Container**: `/app/credentials/service-account-key.json`

**Critical**: The file must exist and be readable by the container user (appuser, UID 1000).

### How to Verify on VPS

**Check if .env file exists**:
```bash
# On VPS host
ls -la /path/to/lexiaid/backend/.env

# Should show the file with proper permissions
```

**Check environment variables inside container**:
```bash
# View all environment variables
docker exec lexiaid-backend env | sort

# Check specific variables
docker exec lexiaid-backend env | grep GOOGLE_CLOUD_PROJECT_ID
docker exec lexiaid-backend env | grep GCS_BUCKET_NAME
docker exec lexiaid-backend env | grep FIREBASE_SERVICE_ACCOUNT_KEY_PATH
```

**Verify service account file**:
```bash
# Check if file exists in container
docker exec lexiaid-backend ls -la /app/credentials/

# Expected output:
# -r--r--r-- 1 appuser appuser XXXX date service-account-key.json

# Verify it's valid JSON
docker exec lexiaid-backend python -c "import json; json.load(open('/app/credentials/service-account-key.json'))"

# Should print nothing if valid, error if invalid
```

**Test Google Cloud authentication**:
```bash
# Inside container, test if credentials work
docker exec lexiaid-backend python -c "
from google.cloud import storage
import os
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = '/app/credentials/service-account-key.json'
client = storage.Client()
print('Authentication successful!')
print(f'Project: {client.project}')
"
```

### Frontend Environment Variables

**Build-time variables** (from `Dockerfile` and build process):
```bash
VITE_BACKEND_API_URL=https://api.lexiaid.hankell.com.br
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

**Important**: Frontend variables are **baked into the build** at build time, not runtime.

### Common Issues

**Issue 1: Missing .env file**
```bash
# Symptom: Container starts but crashes immediately
# Solution: Create backend/.env from .env.example
cp backend/.env.example backend/.env
# Then edit with actual values
```

**Issue 2: Wrong credentials path**
```bash
# Symptom: Google Cloud API errors
# Check: FIREBASE_SERVICE_ACCOUNT_KEY_PATH points to /app/credentials/...
# Verify: File exists at that path in container
```

**Issue 3: Environment variables not loaded**
```bash
# Symptom: Variables are undefined in app
# Check: docker-compose.yml has env_file section
# Verify: .env file is in correct location
```

---

## Question 4: Dependency Versioning

### Answer

**Dependency Management**: The project uses **both** `requirements.in` (high-level) and `requirements.txt` (pinned versions).

### Current Setup

**High-Level Dependencies** (`requirements.in`):
- Specifies minimum versions with `>=`
- 49 lines of core dependencies
- Example: `Flask>=2.0.0`, `langchain>=0.1.0`

**Pinned Dependencies** (`requirements.txt`):
- 234 lines of exact versions
- Includes all transitive dependencies
- Example: `Flask==3.1.1`, `langchain==0.3.25`

### Critical Library Versions

**From `requirements.txt`**:

**Flask & Core**:
```
Flask==3.1.1
flask-cors==5.0.1
Werkzeug==3.1.3
gunicorn==21.2.0  # Installed in Dockerfile
```

**LangChain/LangGraph**:
```
langchain==0.3.25
langchain-core==0.3.62
langchain-google-genai==2.1.4
langchain-google-vertexai==2.0.24
langgraph==0.4.7
langgraph-checkpoint==2.0.26
langgraph-checkpoint-sqlite==2.0.8
```

**Google Cloud**:
```
google-cloud-aiplatform==1.94.0
google-cloud-documentai==3.5.0
google-cloud-firestore==2.20.2
google-cloud-speech==2.32.0
google-cloud-storage==2.19.0
google-cloud-texttospeech==2.27.0
google-auth==2.40.1
```

**Firebase**:
```
firebase-admin==6.8.0
```

**Data Processing**:
```
pydantic==2.11.5
pydantic-core==2.33.2
numpy==2.2.6
pandas==2.2.3
```

### Python Version Mismatch Issue

**Dockerfile Specification**: Python 3.12-slim (lines 10, 44)
**Consultant Report**: Container running Python 3.11

**This is a CRITICAL issue** that must be resolved.

### How to Verify Python Version on VPS

**Check running container**:
```bash
# Python version
docker exec lexiaid-backend python --version

# Expected: Python 3.12.x
# If shows 3.11.x, there's a problem
```

**Check base image**:
```bash
# Inspect the image
docker inspect lexiaid-backend:latest | grep -i python

# Check image layers
docker history lexiaid-backend:latest | grep python
```

**Check Dockerfile used for build**:
```bash
# On VPS, view the Dockerfile
cat /path/to/lexiaid/backend/Dockerfile | grep "FROM python"

# Should show: FROM python:3.12-slim
```

### Possible Causes of Version Mismatch

1. **Old image cached**: VPS is using an old image built with Python 3.11
2. **Dockerfile modified**: Someone changed the Dockerfile on VPS
3. **Wrong build context**: Building from wrong directory/branch
4. **Base image issue**: Docker pulled wrong Python image

### How to Fix Python Version Mismatch

**Step 1: Verify Dockerfile**:
```bash
cd /path/to/lexiaid
cat backend/Dockerfile | head -15
# Line 10 should say: FROM python:3.12-slim AS builder
# Line 44 should say: FROM python:3.12-slim AS final
```

**Step 2: Rebuild with correct version**:
```bash
# Remove old images
docker rmi lexiaid-backend:latest

# Rebuild from scratch (no cache)
docker-compose build --no-cache backend

# Verify build
docker run --rm lexiaid-backend:latest python --version
# Should output: Python 3.12.x
```

**Step 3: Redeploy**:
```bash
docker-compose down
docker-compose up -d backend
```

### Dependency Version Verification

**Check installed packages in container**:
```bash
# List all installed packages with versions
docker exec lexiaid-backend pip list

# Check specific packages
docker exec lexiaid-backend pip show flask
docker exec lexiaid-backend pip show langchain
docker exec lexiaid-backend pip show langgraph
docker exec lexiaid-backend pip show google-cloud-storage
```

**Compare with requirements.txt**:
```bash
# Export installed packages
docker exec lexiaid-backend pip freeze > vps-requirements.txt

# Compare with project requirements.txt
diff requirements.txt vps-requirements.txt
```

**If versions don't match**:
```bash
# Rebuild container to reinstall dependencies
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Dependency Lock File (Recommended)

**Current Status**: `requirements.txt` serves as the lock file (234 pinned versions)

**How it was generated** (likely):
```bash
# From requirements.in
pip-compile requirements.in -o requirements.txt
```

**To regenerate** (if needed):
```bash
# Install pip-tools
pip install pip-tools

# Regenerate requirements.txt
pip-compile requirements.in --upgrade

# Or keep existing versions
pip-compile requirements.in
```

### Critical Dependencies for Debugging

**If startup fails, check these first**:

1. **Flask & Gunicorn**: Web server
2. **firebase-admin**: Authentication and Firestore
3. **google-cloud-***: All Google Cloud services
4. **langchain/langgraph**: AI agent functionality
5. **pydantic**: Data validation

**Test imports in container**:
```bash
docker exec lexiaid-backend python -c "
import flask
import firebase_admin
import google.cloud.storage
import langchain
import langgraph
print('All critical imports successful!')
"
```

### Platform-Specific Dependencies

**Windows-specific** (in requirements.txt):
```
pywin32==310
```

**This will fail on Linux VPS**. Check if it's causing issues:
```bash
docker exec lexiaid-backend pip show pywin32
# Should show: WARNING: Package(s) not found: pywin32
```

**Solution**: Remove from requirements.txt for Linux deployment:
```bash
# Create Linux-specific requirements
grep -v "pywin32" requirements.txt > requirements-linux.txt

# Update Dockerfile to use requirements-linux.txt
```

---

## Summary & Next Steps

### Immediate Actions Required

1. **Verify Python Version**:
   ```bash
   docker exec lexiaid-backend python --version
   ```
   If not 3.12.x, rebuild container with correct Dockerfile.

2. **Check Logs**:
   ```bash
   docker logs lexiaid-backend | head -100
   ```
   Look for startup errors, import failures, or Gunicorn worker crashes.

3. **Verify Environment Variables**:
   ```bash
   docker exec lexiaid-backend env | grep -E "(GOOGLE|FIREBASE|GCS)"
   ```
   Ensure all required variables are set.

4. **Test Service Account**:
   ```bash
   docker exec lexiaid-backend ls -la /app/credentials/
   docker exec lexiaid-backend cat /app/credentials/service-account-key.json | head -5
   ```
   Verify file exists and is valid JSON.

### Diagnostic Commands Summary

**Container Status**:
```bash
docker ps -a | grep lexiaid
docker logs --tail 50 lexiaid-backend
docker inspect lexiaid-backend
```

**Inside Container**:
```bash
docker exec lexiaid-backend python --version
docker exec lexiaid-backend pip list
docker exec lexiaid-backend env | sort
docker exec lexiaid-backend ls -la /app/
docker exec lexiaid-backend ps aux
```

**Test Application**:
```bash
# Health check
curl http://localhost:5000/health

# From outside VPS
curl https://api.lexiaid.hankell.com.br/health
```

### Files to Provide to Consultant

If issues persist, collect and send:

1. **Full container logs**:
   ```bash
   docker logs lexiaid-backend > backend-logs.txt
   ```

2. **Environment variables** (sanitized):
   ```bash
   docker exec lexiaid-backend env | grep -v "KEY\|SECRET\|PASSWORD" > env-vars.txt
   ```

3. **Installed packages**:
   ```bash
   docker exec lexiaid-backend pip freeze > installed-packages.txt
   ```

4. **Container inspection**:
   ```bash
   docker inspect lexiaid-backend > container-inspect.json
   ```

5. **Python version and path**:
   ```bash
   docker exec lexiaid-backend python --version > python-info.txt
   docker exec lexiaid-backend which python >> python-info.txt
   docker exec lexiaid-backend python -c "import sys; print(sys.path)" >> python-info.txt
   ```

---

## Additional Resources

- **Backend Dockerfile**: `backend/Dockerfile`
- **Docker Compose**: `docker-compose.yml`
- **Environment Template**: `backend/.env.example`
- **Requirements**: `requirements.txt` (pinned), `requirements.in` (high-level)
- **Application Entry**: `backend/app.py`
- **Deployment Docs**: `backend/DOCKER_DEPLOYMENT.md`, `backend/DOCKER_QUICK_START.md`
