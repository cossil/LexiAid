# ⚡ VPS Quick Update - Copy & Paste Commands

## 🎯 Prerequisites

- VPS IP address: `_________________` (fill in)
- LexiAid path on VPS: `_________________` (fill in, usually `/root/lexiaid`)

---

## 📋 Quick Steps (Copy & Paste)

### 1️⃣ SSH into VPS

```bash
ssh root@YOUR_VPS_IP
```

### 2️⃣ Navigate to LexiAid

```bash
cd /path/to/lexiaid
# Common paths: /root/lexiaid or /opt/lexiaid
```

### 3️⃣ Backup Current Files

```bash
cp backend/.env backend/.env.OLD
cp backend/credentials/service-account-key.json backend/credentials/service-account-key.OLD
```

### 4️⃣ Update .env File

```bash
nano backend/.env
```

**Delete all content and paste this:**

```env
GCP_PROJECT_ID=ai-tutor-dev-457802
GOOGLE_CLOUD_PROJECT_ID=ai-tutor-dev-457802
FIRESTORE_DATABASE_NAME=ai-tutor-dev-457802
GCP_LOCATION=us-central1
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/credentials/service-account-key.json
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/service-account-key.json
GCS_BUCKET_NAME=ai-tutor-docs-cossil-4930
DOCUMENT_AI_PROCESSOR_ID=faf244b2d3fd6cf2
LAYOUT_PROCESSOR_ID=faf244b2d3fd6cf2
DOCUMENT_AI_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_NAME=projects/ai-tutor-dev-457802/locations/us/processors/faf244b2d3fd6cf2
GOOGLE_API_KEY=AQ.Ab8RN6IgnSJso5fj4Cfx4Tk8obnm6rP44GmI4Eu9BmqI145cug
TTS_DEFAULT_VOICE_NAME=en-US-Wavenet-D
TTS_DEFAULT_SPEAKING_RATE=1.0
TTS_DEFAULT_PITCH=0
STT_DEFAULT_LANGUAGE_CODE=en-US
STT_DEFAULT_MODEL=latest_short
FLASK_APP=app.py
FLASK_ENV=production
PORT=5000
```

**Save**: `Ctrl+X`, `Y`, `Enter`

### 5️⃣ Update Service Account JSON

```bash
nano backend/credentials/service-account-key.json
```

**Delete all content and paste your NEW service account JSON** (the entire file from `C:\Ai\aitutor_37\secrets\`)

**Save**: `Ctrl+X`, `Y`, `Enter`

### 6️⃣ Restart Containers

```bash
docker-compose down
docker-compose up -d
```

### 7️⃣ Verify

```bash
# Wait 30 seconds
sleep 30

# Check logs
docker logs lexiaid-backend --tail 50

# Test health
curl http://localhost:5000/health

# Should return: {"status":"healthy"}
```

---

## ✅ Success Indicators

You should see in logs:
- ✅ `AuthService initialized successfully`
- ✅ `FirestoreService initialized successfully`
- ✅ `All graphs initialized`
- ✅ `Running on http://0.0.0.0:5000`

You should NOT see:
- ❌ `invalid_grant: account not found`
- ❌ `Failed to initialize`

---

## 🚨 If Something Goes Wrong

### Rollback to Old Credentials

```bash
cd /path/to/lexiaid
cp backend/.env.OLD backend/.env
cp backend/credentials/service-account-key.OLD backend/credentials/service-account-key.json
docker-compose restart
```

### Check Detailed Logs

```bash
docker logs lexiaid-backend -f
```

### Verify Files in Container

```bash
docker exec lexiaid-backend ls -la /app/credentials/
docker exec lexiaid-backend env | grep GOOGLE_API_KEY
```

---

## 📞 Quick Commands

```bash
# View logs
docker logs lexiaid-backend -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Start
docker-compose up -d

# Status
docker ps | grep lexiaid

# Test
curl https://api.lexiaid.hankell.com.br/health
```

---

**Estimated Time**: 10-15 minutes

**Ready? Start with Step 1!**
