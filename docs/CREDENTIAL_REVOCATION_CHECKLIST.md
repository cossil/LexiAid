# 🔴 CREDENTIAL REVOCATION CHECKLIST

## Status: URGENT - Complete Within 1 Hour

---

## ✅ COMPLETED

- [x] **Phase 1**: Remove .env from current Git branch
- [x] **Phase 2**: Purge .env from entire Git history
- [x] **Phase 3**: Force push to GitHub (history rewritten)
- [x] **Verification**: Confirmed .env not in any commit

---

## 🔴 PENDING - DO NOW

### 1. Google Cloud Service Account (HIGHEST PRIORITY)

**Why Critical**: Full access to all Google Cloud services

**Steps**:
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Select project: `ai-tutor-dev-457802` (or your project)
3. Find the compromised service account
4. Click ⋮ (three dots) → **Delete**
5. Confirm deletion

**Create New Service Account**:
1. Click "**+ CREATE SERVICE ACCOUNT**"
2. Name: `lexiaid-backend-prod-v2`
3. Description: "Backend production service account (post-security-incident)"
4. Click "Create and Continue"
5. Grant roles:
   - ✅ Storage Admin
   - ✅ Cloud Speech-to-Text Admin
   - ✅ Cloud Text-to-Speech Admin
   - ✅ Document AI API User
   - ✅ Cloud Firestore User
6. Click "Continue" → "Done"
7. Click on new service account
8. Go to "**KEYS**" tab
9. Click "**ADD KEY**" → "Create new key"
10. Select "**JSON**"
11. Click "**CREATE**"
12. Save file as: `service-account-key-NEW.json`

**Update Local**:
```bash
# Backup old key
mv backend/credentials/service-account-key.json backend/credentials/service-account-key-OLD.json

# Copy new key
cp ~/Downloads/service-account-key-NEW.json backend/credentials/service-account-key.json
```

**Update .env**:
```bash
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/credentials/service-account-key.json
```

---

### 2. Google Gemini API Key

**Why Critical**: Access to AI generation API

**Steps**:
1. Go to: https://aistudio.google.com/app/apikey
2. Find your current API key
3. Click **Delete** or **Revoke**
4. Confirm deletion
5. Click "**Create API Key**"
6. Select project: `ai-tutor-dev-457802`
7. Copy new API key

**Update .env**:
```bash
GOOGLE_API_KEY=<NEW_KEY_HERE>
```

---

### 3. Review Firestore Security Rules

**Why Important**: Ensure database is properly secured

**Steps**:
1. Go to: https://console.firebase.google.com/
2. Select project: `ai-tutor-dev-457802`
3. Go to **Firestore Database** → **Rules**
4. Verify rules require authentication
5. Click "**Publish**" if changes made

**Recommended Rules**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /documents/{documentId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

### 4. Review GCS Bucket Permissions

**Why Important**: Ensure storage is not publicly accessible

**Steps**:
1. Go to: https://console.cloud.google.com/storage/
2. Select bucket from `GCS_BUCKET_NAME`
3. Click "**Permissions**" tab
4. Verify:
   - ✅ Public access: **OFF**
   - ✅ Only service account has access
5. If unsure, click "**Remove public access**"

---

### 5. Document AI Processor (Optional)

**Why Low Priority**: Processor access is limited

**Steps** (if concerned):
1. Go to: https://console.cloud.google.com/ai/document-ai/processors
2. Review processor permissions
3. If needed, create new processor
4. Update `LAYOUT_PROCESSOR_ID` in .env

---

## 📋 UPDATE DEPLOYMENTS

### Local Development

```bash
cd c:\Ai\aitutor_37

# Edit .env with new credentials
notepad backend\.env

# Update these fields:
# GOOGLE_API_KEY=<new_key>
# FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/app/credentials/service-account-key.json

# Test local startup
cd backend
python app.py
```

### VPS Production

```bash
# SSH into VPS
ssh root@your-vps-ip

# Navigate to project
cd /path/to/lexiaid

# Backup old .env
cp backend/.env backend/.env.OLD

# Edit .env
nano backend/.env
# Update GOOGLE_API_KEY and other credentials

# Update service account file
rm backend/credentials/service-account-key.json
nano backend/credentials/service-account-key.json
# Paste new JSON content

# Restart containers
docker-compose down
docker-compose up -d

# Check logs
docker logs lexiaid-backend

# Test health endpoint
curl https://api.lexiaid.hankell.com.br/health
```

---

## ✅ VERIFICATION

### Test New Credentials Locally

```bash
cd backend

# Test service account
python -c "
from google.cloud import storage
import os
os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = 'credentials/service-account-key.json'
client = storage.Client()
print(f'✅ Service Account OK: {client.project}')
"

# Test Gemini API
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv('GOOGLE_API_KEY')
print(f'✅ API Key loaded: {api_key[:10]}...')
"

# Start app
python app.py
# Should start without errors
```

### Test VPS Production

```bash
# Health check
curl https://api.lexiaid.hankell.com.br/health

# Should return: {"status": "healthy"}
```

---

## 🔒 PREVENTION MEASURES

### 1. Enable GitHub Secret Scanning

1. Go to: https://github.com/cossil/LexiAid/settings/security_analysis
2. Enable:
   - ✅ **Secret scanning**
   - ✅ **Push protection**

### 2. Add Pre-commit Hook

Already created in `.git/hooks/pre-commit` (if not, create it):

```bash
#!/bin/bash
if git diff --cached --name-only | grep -E "\.env$"; then
    echo "❌ ERROR: Attempting to commit .env file!"
    exit 1
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

### 3. Verify .gitignore

```bash
# Check .gitignore
cat .gitignore | grep -E "\.env"

# Should show:
# backend/.env
# .env
```

---

## 📊 MONITORING

### Google Cloud Audit Logs

1. Go to: https://console.cloud.google.com/logs/
2. Filter for unusual activity:
   - Service account usage
   - API key usage
   - Failed authentication attempts
3. Look for access from unknown IPs

### Set Up Alerts

1. Go to: https://console.cloud.google.com/monitoring/
2. Create alert for:
   - Unusual API usage spikes
   - Service account activity
   - Storage access patterns

---

## 📝 TIMELINE

| Time | Action | Status |
|------|--------|--------|
| 12:00 PM | Incident discovered | ✅ DONE |
| 12:05 PM | Removed from Git | ✅ DONE |
| 12:10 PM | Purged from history | ✅ DONE |
| 12:15 PM | Force pushed to GitHub | ✅ DONE |
| 12:20 PM | Delete service account | 🔴 PENDING |
| 12:25 PM | Create new service account | 🔴 PENDING |
| 12:30 PM | Revoke Gemini API key | 🔴 PENDING |
| 12:35 PM | Create new API key | 🔴 PENDING |
| 12:40 PM | Update local .env | 🔴 PENDING |
| 12:45 PM | Update VPS .env | 🔴 PENDING |
| 12:50 PM | Restart VPS containers | 🔴 PENDING |
| 12:55 PM | Test local deployment | 🔴 PENDING |
| 1:00 PM | Test VPS deployment | 🔴 PENDING |

---

## ⚠️ IMPORTANT NOTES

1. **Old credentials are NOW INVALID**: After revocation, old keys will stop working
2. **Update BOTH local and VPS**: Ensure consistency across environments
3. **Test before closing**: Verify everything works with new credentials
4. **Monitor for 24 hours**: Watch for unauthorized access attempts
5. **Document incident**: Keep this checklist for future reference

---

## 🆘 IF YOU ENCOUNTER ISSUES

### Service Account Errors
```
Error: Could not authenticate with service account
Solution: Verify JSON file path and format
```

### API Key Errors
```
Error: Invalid API key
Solution: Ensure new key is correctly copied to .env
```

### VPS Connection Issues
```
Error: Cannot connect to VPS
Solution: Check SSH credentials and VPS status
```

### Container Startup Failures
```
Error: Container exits immediately
Solution: Check docker logs for specific error
```

---

## 📞 NEXT STEPS AFTER COMPLETION

1. ✅ Mark all items as complete
2. ✅ Test local development
3. ✅ Test VPS production
4. ✅ Enable GitHub secret scanning
5. ✅ Set up monitoring alerts
6. ✅ Document incident in team log
7. ✅ Review with team members

---

**Current Status**: 🟡 Git cleanup complete, credential revocation in progress

**Last Updated**: 2025-10-12 12:15 PM
