# 🚨 GCP Security Alert Response Plan

## Alert Details

**Date**: October 13, 2025  
**Alert Type**: Publicly accessible Google API key  
**Project**: ai-tutor-dev (id: ai-tutor-dev-457802)  
**Exposed Key**: `AIzaSyBLVREytbAcmjQpPBeUYv5SVSDsCrr3Vss`  
**Location**: GitHub commit `fdb6c39ff1e3d512bead6defa77f119bb9a10e19`

---

## 🔍 Risk Assessment

### Key Type: Firebase Web API Key

**Risk Level**: 🟡 **MEDIUM** (not HIGH)

**Why This Key is Different**:
- ✅ Firebase Web API keys are **designed to be public**
- ✅ They're embedded in frontend JavaScript (visible to all users)
- ✅ Security is enforced by **Firebase Security Rules**, not the key
- ✅ The key itself doesn't grant access - it just identifies your project

**However**:
- 🚨 The `.env` file also contained **backend credentials** (more dangerous)
- 🚨 Even though we cleaned Git history, Google cached the old commit
- 🚨 Best practice is still to rotate the key

---

## ✅ What We Already Did (Oct 12, 2025)

### Previous Security Incident Response:
1. ✅ Removed `.env` from Git repository
2. ✅ Purged `.env` from entire Git history using `git-filter-repo`
3. ✅ Force pushed to rewrite GitHub history
4. ✅ Revoked old service account
5. ✅ Created new service account
6. ✅ Updated all backend credentials

**Status**: Git history is clean, but Google's cache still shows old commit.

---

## 🎯 Action Plan

### Phase 1: Verify Current Status (5 min)

#### Check 1: Verify .env Not in Git History
```bash
cd C:\Ai\aitutor_37
git log --all --full-history --oneline -- .env
# Should return: No results
```

#### Check 2: Verify Commit Doesn't Exist Locally
```bash
git log --all --oneline | findstr fdb6c39f
# Should return: No results
```

#### Check 3: Try to Access Old Commit on GitHub
```
https://github.com/cossil/LexiAid/commit/fdb6c39ff1e3d512bead6defa77f119bb9a10e19
# Should return: 404 Not Found
```

**Expected Result**: All checks should confirm the commit is gone.

---

### Phase 2: Regenerate Firebase Web API Key (10 min)

Even though this key is "safe" to be public, let's rotate it for best practices.

#### Step 1: Go to Firebase Console

```
https://console.firebase.google.com/project/ai-tutor-dev-457802/settings/general
```

#### Step 2: Find Web App Configuration

1. Scroll to "Your apps" section
2. Find your Web app
3. Click the gear icon (⚙️) → "App settings"

#### Step 3: Regenerate API Key

**Option A: Delete and Recreate App** (Clean slate)
1. Click "Delete app"
2. Confirm deletion
3. Click "Add app" → Web (</>) icon
4. Register new app with same name
5. Copy new configuration

**Option B: Restrict Existing Key** (Faster)
1. Go to: https://console.cloud.google.com/apis/credentials?project=ai-tutor-dev-457802
2. Find API key: `AIzaSyBLVREytbAcmjQpPBeUYv5SVSDsCrr3Vss`
3. Click on it
4. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add: `https://lexiaid.hankell.com.br/*`
   - Add: `http://localhost:5173/*` (for development)
5. Under "API restrictions":
   - Select "Restrict key"
   - Choose only: Firebase APIs (Authentication, Firestore, Storage)
6. Click "Save"

#### Step 4: Update Frontend Configuration

**If you created new key (Option A)**:

Update your frontend `.env` or build configuration:

```env
# Root .env (for local development)
VITE_FIREBASE_API_KEY=NEW_KEY_HERE
VITE_FIREBASE_AUTH_DOMAIN=ai-tutor-dev-457802.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-tutor-dev-457802
VITE_FIREBASE_STORAGE_BUCKET=ai-tutor-dev-457802.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=459030890739
VITE_FIREBASE_APP_ID=NEW_APP_ID_HERE
```

**If you restricted existing key (Option B)**:
- No code changes needed
- Key still works but only from your domains

---

### Phase 3: Contact GitHub Support (Optional, 15 min)

Since the commit was removed but Google still found it, GitHub may have cached it.

#### Option 1: Request Cache Purge

Email GitHub Support:
```
To: support@github.com
Subject: Request to purge cached commit containing sensitive data

Hello,

I recently removed sensitive data from my repository using git-filter-repo 
and force-pushed to rewrite history. However, Google Cloud Platform is still 
detecting the old commit in their cache.

Repository: https://github.com/cossil/LexiAid
Commit SHA: fdb6c39ff1e3d512bead6defa77f119bb9a10e19
File: .env

This commit no longer exists in the repository history, but appears to be 
cached. Could you please purge this commit from your cache?

The sensitive credentials have already been rotated.

Thank you.
```

#### Option 2: Use GitHub's Sensitive Data Removal Form

1. Go to: https://support.github.com/contact/sensitive-data
2. Fill out the form with:
   - Repository: `cossil/LexiAid`
   - Commit: `fdb6c39ff1e3d512bead6defa77f119bb9a10e19`
   - File: `.env`
   - Reason: "Contains exposed API keys and credentials"

---

### Phase 4: Respond to Google Cloud (5 min)

#### Acknowledge the Alert

Go to: https://console.cloud.google.com/

Look for the security alert and acknowledge it with:

**Response Template**:
```
Thank you for the alert. We have taken the following actions:

1. Removed the .env file from Git repository and purged from history
2. Revoked and regenerated all backend service account credentials
3. Restricted the Firebase Web API key to authorized domains only
4. Contacted GitHub to purge cached commit
5. Implemented prevention measures (secret scanning, pre-commit hooks)

The exposed Firebase Web API key is now restricted to our production 
domain (lexiaid.hankell.com.br) and localhost for development.

All sensitive backend credentials (service accounts, API keys) have 
been rotated and are no longer valid.
```

---

### Phase 5: Implement Prevention Measures (20 min)

#### 1. Enable GitHub Secret Scanning

```
https://github.com/cossil/LexiAid/settings/security_analysis
```

Enable:
- ✅ Secret scanning
- ✅ Push protection

#### 2. Add Pre-commit Hook

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Prevent committing .env files

if git diff --cached --name-only | grep -E "\.env$|\.env\..*$"; then
    echo "❌ ERROR: Attempting to commit .env file!"
    echo "Environment files should never be committed."
    echo "Use .env.example instead."
    exit 1
fi

# Check for common API key patterns
if git diff --cached | grep -E "AIza[0-9A-Za-z_-]{35}"; then
    echo "❌ ERROR: Potential API key detected!"
    echo "Please remove API keys before committing."
    exit 1
fi

exit 0
```

Make executable:
```bash
chmod +x .git/hooks/pre-commit
```

#### 3. Update .gitignore

Ensure `.gitignore` includes:
```
# Environment files
.env
.env.*
!.env.example
backend/.env
backend/.env.*
!backend/.env.example

# Credentials
secrets/
credentials/
*.json
!package.json
!package-lock.json
!tsconfig.json
```

#### 4. Create .env.example Files

**Root `.env.example`**:
```env
# Firebase Web SDK (Frontend)
VITE_FIREBASE_API_KEY=your_firebase_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_BACKEND_API_URL=http://localhost:5000
```

**Backend `.env.example`**:
```env
# Google Cloud
GCP_PROJECT_ID=your-project-id
GOOGLE_CLOUD_PROJECT_ID=your-project-id
FIRESTORE_DATABASE_NAME=your-database-name
GCP_LOCATION=us-central1

# Firebase Admin SDK
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=/path/to/service-account-key.json
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Google Cloud Storage
GCS_BUCKET_NAME=your-bucket-name

# Gemini API
GOOGLE_API_KEY=your_gemini_api_key_here

# Document AI
DOCUMENT_AI_PROCESSOR_ID=your_processor_id
LAYOUT_PROCESSOR_ID=your_processor_id
DOCUMENT_AI_LOCATION=us
```

---

## 📋 Execution Checklist

### Immediate Actions (30 min)
- [ ] Verify commit is gone from Git history
- [ ] Try to access old commit on GitHub (should be 404)
- [ ] Restrict Firebase Web API key to authorized domains
- [ ] Acknowledge Google Cloud security alert
- [ ] Contact GitHub support to purge cache

### Follow-up Actions (1 hour)
- [ ] Enable GitHub secret scanning
- [ ] Add pre-commit hooks
- [ ] Update .gitignore
- [ ] Create .env.example files
- [ ] Document incident in team log
- [ ] Review with team

### Verification (15 min)
- [ ] Test frontend with restricted API key
- [ ] Verify local development still works
- [ ] Verify production deployment works
- [ ] Check GitHub secret scanning is active
- [ ] Confirm no more security alerts

---

## 🔍 Understanding Firebase Web API Keys

### Why They're "Safe" to Be Public

**Firebase Web API keys are NOT secret**:
- They're embedded in every web app's JavaScript
- Anyone can view them in browser DevTools
- They're in every mobile app binary
- Google expects them to be public

**Security is enforced by**:
1. **Firebase Security Rules** (Firestore, Storage)
2. **Firebase Authentication** (user tokens)
3. **Domain restrictions** (optional, recommended)
4. **API restrictions** (which APIs the key can access)

**Example**: Your frontend code has:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBLVREytbAcmjQpPBeUYv5SVSDsCrr3Vss", // Public
  authDomain: "ai-tutor-dev-457802.firebaseapp.com",
  projectId: "ai-tutor-dev-457802",
  // ...
};
```

This is **normal and expected**. The key just identifies your project.

### What IS Dangerous

**Backend credentials** (these were also in your .env):
- ❌ Service account JSON keys
- ❌ Gemini API keys for backend
- ❌ Database passwords
- ❌ Secret keys for JWT signing

These should **NEVER** be public.

---

## 🎯 Recommended Approach

### Option 1: Minimal (Fastest - 15 min)

1. ✅ Verify commit is gone (already done)
2. ✅ Restrict Firebase key to your domains
3. ✅ Acknowledge Google alert
4. ✅ Enable GitHub secret scanning

**Result**: Secure enough, minimal effort

### Option 2: Thorough (Recommended - 1 hour)

1. ✅ Everything from Option 1
2. ✅ Regenerate Firebase Web API key
3. ✅ Update frontend configuration
4. ✅ Contact GitHub support
5. ✅ Add all prevention measures

**Result**: Maximum security, peace of mind

### Option 3: Paranoid (Overkill - 2 hours)

1. ✅ Everything from Option 2
2. ✅ Create entirely new Firebase project
3. ✅ Migrate all data
4. ✅ Update all configurations
5. ✅ Delete old project

**Result**: Nuclear option, probably unnecessary

---

## 📞 Quick Commands

### Verify Git History is Clean
```bash
cd C:\Ai\aitutor_37
git log --all --full-history --oneline -- .env
git log --all --oneline | findstr fdb6c39f
```

### Check GitHub for Old Commit
```bash
# Try to access (should fail)
curl -I https://github.com/cossil/LexiAid/commit/fdb6c39ff1e3d512bead6defa77f119bb9a10e19
```

### Restrict API Key (via gcloud CLI)
```bash
# Install gcloud CLI first
gcloud auth login
gcloud config set project ai-tutor-dev-457802

# List API keys
gcloud services api-keys list

# Update key restrictions (example)
gcloud services api-keys update KEY_ID \
  --allowed-referrers="https://lexiaid.hankell.com.br/*,http://localhost:5173/*"
```

---

## ✅ Success Criteria

After completing the action plan:

- [ ] Old commit returns 404 on GitHub
- [ ] Firebase Web API key restricted to authorized domains
- [ ] Google Cloud security alert acknowledged
- [ ] GitHub secret scanning enabled
- [ ] Pre-commit hooks installed
- [ ] .env.example files created
- [ ] Frontend works with restricted key
- [ ] No new security alerts

---

## 📝 Timeline

| Time | Action | Status |
|------|--------|--------|
| Oct 12 | Initial security incident | ✅ Resolved |
| Oct 12 | Removed .env from Git | ✅ Done |
| Oct 12 | Purged Git history | ✅ Done |
| Oct 12 | Revoked backend credentials | ✅ Done |
| Oct 13 | **GCP alert received** | 🔴 **Current** |
| Oct 13 | Restrict Firebase key | ⏳ Pending |
| Oct 13 | Acknowledge alert | ⏳ Pending |
| Oct 13 | Contact GitHub | ⏳ Pending |
| Oct 13 | Enable prevention | ⏳ Pending |

---

**Recommended: Start with Option 1 (Minimal) to quickly resolve the alert, then implement Option 2 (Thorough) for long-term security.**
