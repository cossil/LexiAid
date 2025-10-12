# 🔧 Credential Configuration Fix

## 🚨 **Issues Found**

### Issue 1: Missing backend/.env file ✅ FIXED
**Problem**: App looks for `backend/.env` but you were editing root `.env`  
**Solution**: Created `backend/.env` with correct credentials

### Issue 2: Firebase Service Account Mismatch 🔴 CRITICAL
**Problem**: The error `invalid_grant: account not found` means:
- The NEW service account you created is NOT linked to your Firebase project
- Firebase Admin SDK cannot verify user authentication tokens

---

## 🎯 **Root Cause**

When you created a new Google Cloud service account, it was created in **Google Cloud IAM**, but it's **NOT automatically a Firebase Admin SDK service account**.

Firebase needs a **specific type** of service account that's linked to the Firebase project.

---

## ✅ **SOLUTION: Use Firebase Admin SDK Service Account**

### Option 1: Generate Firebase Admin SDK Key (RECOMMENDED)

**Steps**:

1. **Go to Firebase Console**:
   - Open: https://console.firebase.google.com/
   - Select project: `ai-tutor-dev-457802`

2. **Navigate to Service Accounts**:
   - Click ⚙️ (Settings) → **Project settings**
   - Click **Service accounts** tab

3. **Generate New Private Key**:
   - You'll see: "Firebase Admin SDK"
   - Click "**Generate new private key**"
   - Click "**Generate key**" in the dialog
   - A JSON file will download (e.g., `ai-tutor-dev-457802-firebase-adminsdk-xxxxx.json`)

4. **Save the Key**:
   ```bash
   # Move downloaded file to:
   C:\Ai\aitutor_37\secrets\ai-tutor-dev-457802-firebase-adminsdk-NEW.json
   ```

5. **Update backend/.env**:
   ```bash
   FIREBASE_SERVICE_ACCOUNT_KEY_PATH=C:\Ai\aitutor_37\secrets\ai-tutor-dev-457802-firebase-adminsdk-NEW.json
   GOOGLE_APPLICATION_CREDENTIALS=C:\Ai\aitutor_37\secrets\ai-tutor-dev-457802-firebase-adminsdk-NEW.json
   ```

---

### Option 2: Add Firebase Admin Role to Existing Service Account

**Steps**:

1. **Go to Google Cloud IAM**:
   - Open: https://console.cloud.google.com/iam-admin/iam
   - Select project: `ai-tutor-dev-457802`

2. **Find Your New Service Account**:
   - Look for the service account you just created
   - Email format: `xxxxx@ai-tutor-dev-457802.iam.gserviceaccount.com`

3. **Add Firebase Admin Role**:
   - Click ✏️ (Edit) next to the service account
   - Click "**+ ADD ANOTHER ROLE**"
   - Search for and add: **Firebase Admin SDK Administrator Service Agent**
   - Click "**Save**"

4. **Keep Current Configuration**:
   - Your current `backend/.env` should work after this

---

## 🔍 **Which Option to Choose?**

### **Option 1 (Recommended)**: Firebase Admin SDK Key
- ✅ Specifically designed for Firebase
- ✅ Has all necessary permissions by default
- ✅ Easier to set up
- ✅ More secure (limited scope)

### **Option 2**: Add roles to existing service account
- ⚠️ Requires manual role configuration
- ⚠️ May have broader permissions than needed
- ✅ Uses the service account you already created

---

## 📝 **Current Configuration Status**

### ✅ What's Working:
- Backend starts successfully
- All services initialize (TTS, STT, Storage, Document AI)
- Flask server runs on port 5000

### 🔴 What's NOT Working:
- Firebase authentication token verification
- User authentication (401 errors)
- API endpoints that require authentication

### 🎯 Root Cause:
The service account at:
```
C:\Ai\aitutor_37\secrets\ai-tutor-dev-457802-b386544b4d0f.json
```
Is a **Google Cloud service account** but NOT a **Firebase Admin SDK service account**.

---

## 🚀 **Quick Fix Steps**

### Step 1: Generate Firebase Admin SDK Key

```bash
# 1. Go to Firebase Console
https://console.firebase.com/project/ai-tutor-dev-457802/settings/serviceaccounts/adminsdk

# 2. Click "Generate new private key"
# 3. Download the JSON file
# 4. Save it as:
C:\Ai\aitutor_37\secrets\firebase-admin-sdk-NEW.json
```

### Step 2: Update backend/.env

The file has already been created at `backend/.env`. Just update this line:

```bash
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=C:\Ai\aitutor_37\secrets\firebase-admin-sdk-NEW.json
GOOGLE_APPLICATION_CREDENTIALS=C:\Ai\aitutor_37\secrets\firebase-admin-sdk-NEW.json
```

### Step 3: Restart Application

```bash
cd C:\Ai\aitutor_37\backend
python -m flask run --host=0.0.0.0 --port=5000
```

### Step 4: Test Authentication

- Open frontend: http://localhost:5173
- Try to sign in
- Check backend logs for authentication success

---

## 🔐 **Security Note**

### Files You Should Have:

1. **Firebase Admin SDK Key** (for authentication):
   - `secrets/firebase-admin-sdk-xxxxx.json`
   - Used by: Firebase Admin SDK
   - Purpose: User authentication, Firestore access

2. **Google Cloud Service Account** (for other services):
   - `secrets/ai-tutor-dev-457802-b386544b4d0f.json`
   - Used by: TTS, STT, Document AI, GCS
   - Purpose: Google Cloud API access

### You Can Use BOTH:
- Firebase Admin SDK key for authentication
- Google Cloud service account for other APIs

Or use **ONE Firebase Admin SDK key** for everything (simpler).

---

## 🧪 **Verification**

After fixing, you should see:

```bash
# Successful authentication
Verifying token: eyJhbGciOiJSUzI1NiIs...
Token verified successfully for user: <user_id>
INFO:werkzeug:127.0.0.1 - - [12/Oct/2025 13:46:24] "GET /api/documents HTTP/1.1" 200 -
```

Instead of:

```bash
# Failed authentication (current)
Unexpected error verifying token: ('invalid_grant: Invalid grant: account not found'
INFO:werkzeug:127.0.0.1 - - [12/Oct/2025 13:46:24] "GET /api/documents HTTP/1.1" 401 -
```

---

## 📋 **Checklist**

- [x] Created `backend/.env` file
- [ ] Generate Firebase Admin SDK key from Firebase Console
- [ ] Save key to `secrets/` folder
- [ ] Update `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` in `backend/.env`
- [ ] Restart Flask application
- [ ] Test user authentication
- [ ] Verify no more 401 errors

---

## 🆘 **Still Having Issues?**

If authentication still fails after using Firebase Admin SDK key:

1. **Check Firebase Project ID matches**:
   ```bash
   # In backend/.env
   GOOGLE_CLOUD_PROJECT_ID=ai-tutor-dev-457802
   FIRESTORE_DATABASE_NAME=ai-tutor-dev-457802
   ```

2. **Verify JSON key is valid**:
   ```bash
   python -c "import json; print(json.load(open('secrets/firebase-admin-sdk-NEW.json'))['project_id'])"
   # Should output: ai-tutor-dev-457802
   ```

3. **Check Firebase Authentication is enabled**:
   - Go to: https://console.firebase.google.com/project/ai-tutor-dev-457802/authentication
   - Ensure Email/Password provider is enabled

---

## 📞 **Next Steps**

1. **Generate Firebase Admin SDK key** (5 minutes)
2. **Update backend/.env** (1 minute)
3. **Restart application** (1 minute)
4. **Test authentication** (2 minutes)

**Total time**: ~10 minutes

---

**Let me know once you've generated the Firebase Admin SDK key and I'll help you verify everything is working!**
