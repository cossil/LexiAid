# 🚀 VPS Production Update Instructions

## Files to Transfer

You need to transfer these 2 files to your VPS:

1. **backend/.env** - Environment variables with new credentials
2. **Service account JSON** - New Firebase Admin SDK key

---

## Method 1: Using SCP (Secure Copy)

### Step 1: Transfer backend/.env

```bash
# From your local machine (Windows PowerShell or Git Bash)
scp C:\Ai\aitutor_37\backend\.env root@YOUR_VPS_IP:/root/lexiaid_temp/.env

# Replace YOUR_VPS_IP with actual IP (e.g., 192.168.1.100 or vps.example.com)
```

### Step 2: Transfer Service Account JSON

```bash
# Transfer the Firebase Admin SDK key
scp C:\Ai\aitutor_37\secrets\firebase-admin-sdk-NEW.json root@YOUR_VPS_IP:/root/lexiaid_temp/service-account-key.json

# Or if you're using the Google Cloud service account:
scp C:\Ai\aitutor_37\secrets\ai-tutor-dev-457802-b386544b4d0f.json root@YOUR_VPS_IP:/root/lexiaid_temp/service-account-key.json
```

---

## Method 2: Manual Copy-Paste (If SCP Doesn't Work)

### Step 1: SSH into VPS

```bash
ssh root@YOUR_VPS_IP
```

### Step 2: Create Temp Directory

```bash
mkdir -p /root/lexiaid_temp
cd /root/lexiaid_temp
```

### Step 3: Create .env File

```bash
nano .env
```

**Copy and paste the entire content from your local `backend/.env` file:**

```env
# LexiAid Backend Environment Variables
# SECURITY: This file contains sensitive credentials. Never commit to Git!

# --- Google Cloud Configuration ---

# Google Cloud Project ID
GCP_PROJECT_ID=ai-tutor-dev-457802
GOOGLE_CLOUD_PROJECT_ID=ai-tutor-dev-457802

# Firestore Database Name
FIRESTORE_DATABASE_NAME=ai-tutor-dev-457802

# Google Cloud Location (Region)
GCP_LOCATION=us-central1

# --- Firebase Admin SDK ---
# IMPORTANT: Update this path for Docker container
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/credentials/service-account-key.json

# Alternative environment variable
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/service-account-key.json

# --- Google Cloud Storage ---
GCS_BUCKET_NAME=ai-tutor-docs-cossil-4930

# --- Document AI Configuration ---
DOCUMENT_AI_PROCESSOR_ID=faf244b2d3fd6cf2
LAYOUT_PROCESSOR_ID=faf244b2d3fd6cf2
DOCUMENT_AI_LOCATION=us
GOOGLE_DOCUMENT_AI_PROCESSOR_NAME=projects/ai-tutor-dev-457802/locations/us/processors/faf244b2d3fd6cf2

# --- Google Gemini API Key (NEW) ---
GOOGLE_API_KEY=AQ.Ab8RN6IgnSJso5fj4Cfx4Tk8obnm6rP44GmI4Eu9BmqI145cug

# --- TTS/STT Configuration ---
TTS_DEFAULT_VOICE_NAME=en-US-Wavenet-D
TTS_DEFAULT_SPEAKING_RATE=1.0
TTS_DEFAULT_PITCH=0
STT_DEFAULT_LANGUAGE_CODE=en-US
STT_DEFAULT_MODEL=latest_short

# --- Flask Configuration ---
FLASK_APP=app.py
FLASK_ENV=production
PORT=5000
```

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Create Service Account JSON

```bash
nano service-account-key.json
```

**Copy and paste the entire JSON content from your service account file.**

**Save and exit**: Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Locate LexiAid Project on VPS

```bash
# Common locations:
cd /root/lexiaid
# or
cd /opt/lexiaid
# or
cd /home/lexiaid

# If you don't know the location, search for it:
find / -name "docker-compose.yml" -path "*/lexiaid/*" 2>/dev/null
```

**Note the path** - you'll need it for the next steps.

---

## Step 6: Backup Current Credentials

```bash
# Navigate to your LexiAid project directory
cd /path/to/lexiaid  # Replace with actual path

# Backup current .env
cp backend/.env backend/.env.BACKUP_$(date +%Y%m%d_%H%M%S)

# Backup current service account
cp backend/credentials/service-account-key.json backend/credentials/service-account-key.BACKUP_$(date +%Y%m%d_%H%M%S)

# Verify backups were created
ls -la backend/.env.BACKUP*
ls -la backend/credentials/service-account-key.BACKUP*
```

---

## Step 7: Copy New Credentials

```bash
# Still in /path/to/lexiaid directory

# Copy new .env
cp /root/lexiaid_temp/.env backend/.env

# Copy new service account JSON
cp /root/lexiaid_temp/service-account-key.json backend/credentials/service-account-key.json

# Verify files were copied
ls -la backend/.env
ls -la backend/credentials/service-account-key.json
```

---

## Step 8: Verify File Contents

```bash
# Check .env has new credentials
head -20 backend/.env

# Should show new GOOGLE_API_KEY starting with: AQ.Ab8RN6...

# Check service account JSON is valid
cat backend/credentials/service-account-key.json | head -5

# Should show JSON with "type": "service_account"
```

---

## Step 9: Set Correct Permissions

```bash
# Ensure files have correct permissions
chmod 600 backend/.env
chmod 600 backend/credentials/service-account-key.json

# Verify permissions
ls -la backend/.env
ls -la backend/credentials/service-account-key.json

# Should show: -rw------- (600)
```

---

## Step 10: Restart Docker Containers

```bash
# Stop containers
docker-compose down

# Verify containers are stopped
docker ps | grep lexiaid

# Start containers with new credentials
docker-compose up -d

# Wait 30 seconds for startup
sleep 30
```

---

## Step 11: Verify Backend Started Successfully

```bash
# Check container status
docker ps | grep lexiaid-backend

# Should show: Up X seconds (healthy)

# Check logs for errors
docker logs lexiaid-backend --tail 50

# Look for:
# ✅ "AuthService initialized successfully"
# ✅ "FirestoreService initialized successfully"
# ✅ "All graphs initialized"
# ✅ "Running on http://0.0.0.0:5000"

# Should NOT see:
# ❌ "invalid_grant: account not found"
# ❌ "Failed to initialize"
```

---

## Step 12: Test Health Endpoint

```bash
# Test from VPS
curl http://localhost:5000/health

# Should return: {"status":"healthy"} or similar

# Test from external (replace with your domain)
curl https://api.lexiaid.hankell.com.br/health

# Should return: {"status":"healthy"}
```

---

## Step 13: Test Authentication

```bash
# Check authentication logs
docker logs lexiaid-backend -f

# In another terminal or from your local machine:
# Try to access the frontend and sign in
# Watch the logs for authentication attempts

# Should see:
# ✅ "Token verified successfully for user: <user_id>"

# Should NOT see:
# ❌ "invalid_grant: account not found"
```

---

## Step 14: Cleanup Temp Files

```bash
# Remove temporary files (contains sensitive data)
rm -rf /root/lexiaid_temp

# Verify removal
ls /root/lexiaid_temp
# Should show: No such file or directory
```

---

## ✅ Success Criteria

Your VPS update is successful if:

- [x] Docker containers are running
- [x] Backend logs show no errors
- [x] Health endpoint returns 200 OK
- [x] Authentication works (no 401 errors)
- [x] Frontend can connect to backend
- [x] Users can sign in successfully

---

## 🚨 Troubleshooting

### Issue: Container Won't Start

```bash
# Check detailed logs
docker logs lexiaid-backend

# Common issues:
# 1. Invalid JSON in service account file
# 2. Wrong file path in .env
# 3. Missing environment variables
```

### Issue: Authentication Still Fails

```bash
# Verify service account file exists in container
docker exec lexiaid-backend ls -la /app/credentials/

# Should show: service-account-key.json

# Verify file is valid JSON
docker exec lexiaid-backend cat /app/credentials/service-account-key.json | head -5

# Should show valid JSON
```

### Issue: Environment Variables Not Loaded

```bash
# Check if .env is loaded
docker exec lexiaid-backend env | grep GOOGLE_API_KEY

# Should show: GOOGLE_API_KEY=AQ.Ab8RN6...

# If empty, check docker-compose.yml has:
# env_file:
#   - ./backend/.env
```

---

## 📞 Need Help?

If you encounter issues:

1. **Check container logs**: `docker logs lexiaid-backend`
2. **Verify file paths**: Ensure paths match between .env and actual files
3. **Restart containers**: `docker-compose restart`
4. **Check permissions**: Files should be readable by container user

---

## 🎯 Quick Command Reference

```bash
# SSH to VPS
ssh root@YOUR_VPS_IP

# Navigate to project
cd /path/to/lexiaid

# View logs
docker logs lexiaid-backend -f

# Restart containers
docker-compose restart

# Check container status
docker ps

# Test health
curl http://localhost:5000/health

# Check environment variables
docker exec lexiaid-backend env | grep GOOGLE
```

---

**Ready to proceed? Start with Step 1!**
