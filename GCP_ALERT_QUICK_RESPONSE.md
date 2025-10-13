# ⚡ GCP Security Alert - Quick Response

## 🎯 TL;DR

**Alert**: Firebase Web API key found in old GitHub commit  
**Risk Level**: 🟡 MEDIUM (not critical)  
**Why**: Firebase Web keys are designed to be public  
**Action**: Restrict key + acknowledge alert

---

## ✅ Quick Fix (15 minutes)

### Step 1: Restrict the API Key (10 min)

1. **Go to Google Cloud Console**:
   ```
   https://console.cloud.google.com/apis/credentials?project=ai-tutor-dev-457802
   ```

2. **Find the key**: `AIzaSyBLVREytbAcmjQpPBeUYv5SVSDsCrr3Vss`

3. **Click on it** and configure:

   **Application restrictions**:
   - Select: "HTTP referrers (web sites)"
   - Add allowed referrers:
     - `https://lexiaid.hankell.com.br/*`
     - `http://localhost:5173/*`
     - `http://localhost:*` (for local dev)

   **API restrictions**:
   - Select: "Restrict key"
   - Choose these APIs:
     - ✅ Identity Toolkit API (Firebase Auth)
     - ✅ Cloud Firestore API
     - ✅ Firebase Storage API
     - ✅ Token Service API

4. **Click "Save"**

### Step 2: Acknowledge Google Alert (2 min)

1. Go to: https://console.cloud.google.com/
2. Look for security notification
3. Click "Acknowledge" or "Dismiss"
4. Add note: "Key restricted to authorized domains. Backend credentials already rotated."

### Step 3: Enable GitHub Secret Scanning (3 min)

1. Go to: https://github.com/cossil/LexiAid/settings/security_analysis
2. Enable:
   - ✅ **Secret scanning**
   - ✅ **Push protection**

---

## 🔍 Why This Happened

**The exposed key is a Firebase Web API key**, which is:
- ✅ Designed to be public (it's in your frontend JavaScript)
- ✅ Protected by Firebase Security Rules, not the key itself
- ✅ Safe to expose (every Firebase app does this)

**However**:
- We already removed the `.env` file from Git history on Oct 12
- Google's cache still shows the old commit
- Best practice is to restrict the key anyway

---

## 📋 Verification

After restricting the key, test:

### Test Frontend Still Works
```bash
# Local development
npm run dev
# Open http://localhost:5173
# Try to sign in - should work
```

### Test Production
```bash
# Open production site
https://lexiaid.hankell.com.br
# Try to sign in - should work
```

### If Authentication Fails
The key might be too restricted. Add more referrers:
- `http://localhost:*`
- `http://127.0.0.1:*`
- Your VPS IP if needed

---

## 🚨 What About Other Credentials?

**Already handled on Oct 12**:
- ✅ Backend service account: Revoked and regenerated
- ✅ Gemini API key: Updated
- ✅ Git history: Cleaned and purged
- ✅ GitHub: Force pushed to rewrite history

**This alert is about the Firebase Web key**, which is the least sensitive.

---

## 📞 If You Need Help

**Full detailed guide**: See `docs/GCP_SECURITY_ALERT_RESPONSE.md`

**Quick support**:
- Google Cloud Support: https://console.cloud.google.com/support
- GitHub Support: support@github.com
- Firebase Support: https://firebase.google.com/support

---

## ✅ Success Checklist

- [ ] API key restricted to authorized domains
- [ ] Google alert acknowledged
- [ ] GitHub secret scanning enabled
- [ ] Frontend tested (local)
- [ ] Frontend tested (production)
- [ ] No authentication errors

---

**Estimated Time**: 15 minutes  
**Priority**: Medium (not urgent, but should be done today)

**Start with Step 1: Restrict the API Key**
