# 🚨 SECURITY INCIDENT RESPONSE - Exposed .env File

## Incident Summary
**Date**: 2025-10-12  
**Severity**: CRITICAL  
**Issue**: `.env` file with credentials committed to GitHub repository  
**Status**: IN PROGRESS - IMMEDIATE ACTION REQUIRED

---

## PHASE 1: IMMEDIATE REMOVAL (Execute NOW)

### Step 1: Remove .env from Current Branch

```bash
cd c:\Ai\aitutor_37

# Remove from Git tracking
git rm --cached backend/.env
git rm --cached .env

# Commit removal
git commit -m "SECURITY: Remove exposed .env file from repository"

# Push immediately
git push origin main
```

### Step 2: Purge from Git History

**⚠️ WARNING**: This rewrites Git history. Coordinate with all team members.

**Option A: Using git filter-repo (Recommended)**

```bash
# Install git-filter-repo (if not installed)
pip install git-filter-repo

# Backup repository first
cd ..
cp -r aitutor_37 aitutor_37_backup

# Navigate back
cd aitutor_37

# Remove file from all history
git filter-repo --path backend/.env --invert-paths --force
git filter-repo --path .env --invert-paths --force

# Force push to rewrite remote history
git push origin --force --all
git push origin --force --tags
```

**Option B: Using BFG Repo-Cleaner (Alternative)**

```bash
# Download BFG from https://rtyley.github.io/bfg-repo-cleaner/
# Or install via: choco install bfg-repo-cleaner

# Backup repository
cd ..
cp -r aitutor_37 aitutor_37_backup
cd aitutor_37

# Clone a fresh bare copy
cd ..
git clone --mirror https://github.com/YOUR_USERNAME/YOUR_REPO.git repo-mirror
cd repo-mirror

# Remove .env files
bfg --delete-files .env

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push --force
```

**Option C: Using git filter-branch (Built-in, but slower)**

```bash
# Backup first
cd ..
cp -r aitutor_37 aitutor_37_backup
cd aitutor_37

# Remove from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env .env" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push
git push origin --force --all
git push origin --force --tags
```

### Step 3: Verify Removal

```bash
# Search for .env in entire history
git log --all --full-history --oneline -- backend/.env
git log --all --full-history --oneline -- .env

# Should return: No results

# Check if file exists in any commit
git rev-list --all | xargs git grep -l "GOOGLE_API_KEY"

# Should return: No results
```

---

## PHASE 2: REVOKE ALL EXPOSED CREDENTIALS

### 🔴 CRITICAL: Revoke These Immediately

#### 1. Google Cloud Service Account

**Action**: Delete and recreate service account

**Steps**:
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
2. Select your project
3. Find the service account used in `.env`
4. Click "Delete" (⋮ menu → Delete)
5. Create new service account:
   - Click "Create Service Account"
   - Name: `lexiaid-backend-prod-new`
   - Grant roles:
     - Cloud Storage Admin
     - Cloud Speech-to-Text Admin
     - Cloud Text-to-Speech Admin
     - Document AI API User
     - Firestore User
   - Create and download new JSON key
6. Update `.env` with new key path
7. Update VPS with new credentials

**Verification**:
```bash
# Old key should fail
gcloud auth activate-service-account --key-file=old-key.json
# Should show: ERROR

# New key should work
gcloud auth activate-service-account --key-file=new-key.json
# Should show: Activated service account
```

#### 2. Google Gemini API Key

**Action**: Delete and regenerate API key

**Steps**:
1. Go to: https://aistudio.google.com/app/apikey
2. Find your current API key
3. Click "Delete" or "Revoke"
4. Click "Create API Key"
5. Copy new key
6. Update `GOOGLE_API_KEY` in `.env`
7. Update VPS environment variables

**Test**:
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=NEW_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"test"}]}]}'

# Should return: Valid response
```

#### 3. Firebase Configuration

**Action**: Regenerate Firebase config (if exposed)

**Steps**:
1. Go to: https://console.firebase.google.com/
2. Select your project
3. Go to Project Settings → General
4. Under "Your apps" → Web app
5. Click "Regenerate config" or create new app
6. Update frontend `.env` with new config:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

**Note**: Firebase API keys are safe for public exposure (they're in frontend), but regenerate if concerned.

#### 4. Firestore Security Rules

**Action**: Review and tighten security rules

**Steps**:
1. Go to: https://console.firebase.google.com/
2. Select project → Firestore Database → Rules
3. Ensure rules require authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Documents require authentication
    match /documents/{documentId} {
      allow read, write: if request.auth != null && 
        resource.data.user_id == request.auth.uid;
    }
    
    // Default: deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. Click "Publish"

#### 5. Google Cloud Storage Bucket

**Action**: Review bucket permissions

**Steps**:
1. Go to: https://console.cloud.google.com/storage/
2. Select your bucket (from `GCS_BUCKET_NAME`)
3. Click "Permissions" tab
4. Ensure:
   - Public access: OFF
   - Only service account has access
5. If compromised, consider:
   - Creating new bucket
   - Migrating data
   - Updating `GCS_BUCKET_NAME` in `.env`

#### 6. Document AI Processor

**Action**: Verify processor access

**Steps**:
1. Go to: https://console.cloud.google.com/ai/document-ai/processors
2. Check processor permissions
3. If concerned, create new processor:
   - Create new processor
   - Update `LAYOUT_PROCESSOR_ID` in `.env`
   - Update `GOOGLE_DOCUMENT_AI_PROCESSOR_NAME` in `.env`

---

## PHASE 3: UPDATE ALL DEPLOYMENTS

### Update Local Development

```bash
# Update backend/.env with all new credentials
nano backend/.env

# Verify new credentials work
cd backend
python app.py
# Should start without errors
```

### Update VPS Production

```bash
# SSH into VPS
ssh root@your-vps-ip

# Navigate to project
cd /path/to/lexiaid

# Update backend/.env
nano backend/.env
# Replace all old credentials with new ones

# Update service account file
rm backend/credentials/service-account-key.json
nano backend/credentials/service-account-key.json
# Paste new service account JSON

# Restart containers
docker-compose down
docker-compose up -d

# Verify
docker logs lexiaid-backend
curl https://api.lexiaid.hankell.com.br/health
```

### Update CI/CD (if applicable)

If you have GitHub Actions or other CI/CD:

1. Go to: Repository → Settings → Secrets and variables → Actions
2. Update all secrets:
   - `GOOGLE_API_KEY`
   - `GCP_SERVICE_ACCOUNT_KEY`
   - Any other exposed credentials
3. Re-run failed workflows

---

## PHASE 4: PREVENT FUTURE INCIDENTS

### 1. Verify .gitignore

```bash
# Check .gitignore includes .env
cat .gitignore | grep -E "\.env$|^\.env"

# Should show:
# backend/.env
# .env
```

### 2. Add Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing .env files

if git diff --cached --name-only | grep -E "\.env$"; then
    echo "ERROR: Attempting to commit .env file!"
    echo "This file contains secrets and should not be committed."
    echo "Add it to .gitignore and use .env.example instead."
    exit 1
fi
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

### 3. Use Git Secrets Tool

```bash
# Install git-secrets
# Windows: choco install git-secrets
# Mac: brew install git-secrets
# Linux: Follow https://github.com/awslabs/git-secrets

# Initialize in repository
cd c:\Ai\aitutor_37
git secrets --install

# Add patterns to detect
git secrets --add 'GOOGLE_API_KEY.*'
git secrets --add 'FIREBASE_SERVICE_ACCOUNT_KEY_PATH.*'
git secrets --add 'GCS_BUCKET_NAME.*'
git secrets --add '"private_key":'
git secrets --add '"client_email":'

# Scan existing commits
git secrets --scan-history
```

### 4. Use Environment Variable Management

**Option A: Use .env.example (Current approach)**

Ensure `backend/.env.example` exists with empty values:

```bash
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=
GCP_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=
GCS_BUCKET_NAME=

# Google API
GOOGLE_API_KEY=

# Document AI
DOCUMENT_AI_LOCATION=
LAYOUT_PROCESSOR_ID=
GOOGLE_DOCUMENT_AI_PROCESSOR_NAME=

# Firebase
FIRESTORE_DATABASE_NAME=

# TTS/STT
TTS_DEFAULT_VOICE_NAME=
TTS_DEFAULT_SPEAKING_RATE=
TTS_DEFAULT_PITCH=
STT_DEFAULT_LANGUAGE_CODE=
STT_DEFAULT_MODEL=
```

**Option B: Use Secret Management Service**

Consider using:
- **Google Secret Manager**: Store secrets in GCP
- **HashiCorp Vault**: Enterprise secret management
- **AWS Secrets Manager**: If using AWS
- **Azure Key Vault**: If using Azure

### 5. Enable GitHub Secret Scanning

1. Go to: Repository → Settings → Code security and analysis
2. Enable:
   - ✅ Secret scanning
   - ✅ Push protection
3. GitHub will alert you if secrets are detected

### 6. Add README Warning

Add to `README.md`:

```markdown
## ⚠️ Security Notice

**NEVER commit `.env` files to Git!**

1. Copy `backend/.env.example` to `backend/.env`
2. Fill in your credentials
3. The `.env` file is already in `.gitignore`
4. Only commit `.env.example` with empty values
```

---

## PHASE 5: MONITORING & VERIFICATION

### Monitor for Unauthorized Access

**Google Cloud Audit Logs**:
1. Go to: https://console.cloud.google.com/logs/
2. Filter for:
   - Service account activity
   - API key usage
   - Unusual access patterns
3. Look for:
   - Access from unknown IPs
   - Unusual API call volumes
   - Failed authentication attempts

**Firebase Authentication**:
1. Go to: https://console.firebase.google.com/
2. Check Authentication → Users
3. Look for:
   - Unexpected new users
   - Unusual sign-in locations

**Google Cloud Storage**:
1. Go to: https://console.cloud.google.com/storage/
2. Check bucket access logs
3. Look for:
   - Unauthorized downloads
   - Unusual file access patterns

### Set Up Alerts

**Google Cloud Monitoring**:
1. Go to: https://console.cloud.google.com/monitoring/
2. Create alerts for:
   - Unusual API usage
   - Service account activity
   - Storage access patterns
3. Send alerts to your email

**GitHub Notifications**:
1. Enable email notifications for:
   - Secret scanning alerts
   - Security advisories
   - Dependabot alerts

---

## CHECKLIST

### Immediate Actions (Within 1 Hour)
- [ ] Remove `.env` from current Git branch
- [ ] Push removal to GitHub
- [ ] Purge `.env` from Git history
- [ ] Force push history rewrite
- [ ] Verify removal from all commits

### Credential Revocation (Within 2 Hours)
- [ ] Delete old Google Cloud service account
- [ ] Create new service account
- [ ] Download new service account key
- [ ] Revoke old Gemini API key
- [ ] Generate new Gemini API key
- [ ] Review Firestore security rules
- [ ] Check GCS bucket permissions
- [ ] Verify Document AI processor access

### Update Deployments (Within 4 Hours)
- [ ] Update local `backend/.env`
- [ ] Update VPS `backend/.env`
- [ ] Update VPS service account file
- [ ] Restart VPS containers
- [ ] Test local development
- [ ] Test production deployment
- [ ] Update CI/CD secrets (if applicable)

### Prevention (Within 24 Hours)
- [ ] Verify `.gitignore` includes `.env`
- [ ] Add pre-commit hook
- [ ] Install git-secrets
- [ ] Enable GitHub secret scanning
- [ ] Add security notice to README
- [ ] Document incident in team log
- [ ] Review with team members

### Monitoring (Ongoing)
- [ ] Monitor Google Cloud audit logs
- [ ] Monitor Firebase authentication
- [ ] Monitor GCS access logs
- [ ] Set up alerting
- [ ] Review security weekly

---

## TEAM COMMUNICATION

### Notify Team Members

**Email Template**:

```
Subject: URGENT: Security Incident - Credentials Exposed

Team,

We have discovered that our .env file containing production credentials was accidentally committed to our GitHub repository.

IMMEDIATE ACTIONS TAKEN:
- Removed .env from repository
- Purged from Git history
- Revoking all exposed credentials

REQUIRED ACTIONS FOR ALL DEVELOPERS:
1. Pull latest changes: git pull origin main --force
2. DO NOT use old credentials
3. Request new credentials from [ADMIN]
4. Update your local .env file
5. Never commit .env files

NEW SECURITY MEASURES:
- Pre-commit hooks installed
- Git secrets scanning enabled
- GitHub secret scanning enabled

If you have any questions or concerns, please contact [ADMIN] immediately.

Thank you for your immediate attention to this matter.
```

---

## POST-INCIDENT REVIEW

### Questions to Answer

1. How did the `.env` file get committed despite `.gitignore`?
2. Was the file committed before `.gitignore` was added?
3. Who committed the file? (Check `git log`)
4. How long was it exposed on GitHub?
5. Were there any unauthorized access attempts?
6. What additional security measures are needed?

### Lessons Learned

1. **Prevention is key**: Pre-commit hooks and git-secrets
2. **Regular audits**: Review repository for sensitive files
3. **Secret management**: Consider using secret management services
4. **Team training**: Educate all developers on security practices
5. **Monitoring**: Set up alerts for unusual activity

---

## RESOURCES

- **Git Filter-Repo**: https://github.com/newren/git-filter-repo
- **BFG Repo-Cleaner**: https://rtyley.github.io/bfg-repo-cleaner/
- **Git Secrets**: https://github.com/awslabs/git-secrets
- **GitHub Secret Scanning**: https://docs.github.com/en/code-security/secret-scanning
- **Google Cloud Security**: https://cloud.google.com/security/best-practices
- **Firebase Security**: https://firebase.google.com/docs/rules

---

## INCIDENT LOG

| Date | Time | Action | Status | Notes |
|------|------|--------|--------|-------|
| 2025-10-12 | 11:57 | Incident discovered | OPEN | .env file found in GitHub |
| 2025-10-12 | 12:00 | Removal initiated | IN PROGRESS | Removing from Git |
| | | Credential revocation | PENDING | Waiting for completion |
| | | Deployment updates | PENDING | After credential revocation |
| | | Prevention measures | PENDING | After immediate response |

**Update this log as you complete each step.**
