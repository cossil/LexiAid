# 🔑 Gemini API Key Fix

## 🚨 Issue

The application is using the wrong API key format:
- ❌ Current: `GOOGLE_API_KEY=AQ.Ab8RN6...` (OAuth token - doesn't work)
- ✅ Should be: `GOOGLE_API_KEY=AIzaSy...` (Gemini API key)

Also, the old Gemini API key `AIzaSyC3KsJ4...` was exposed in the security incident and should be revoked.

---

## ✅ Solution

### Step 1: Revoke Old Gemini API Key

1. Go to: https://aistudio.google.com/app/apikey
2. Find key: `AIzaSyC3KsJ4-sO--nEx9OiQS7Ir6QhHfWW9354`
3. Click **Delete** or **Revoke**
4. Confirm deletion

### Step 2: Generate NEW Gemini API Key

1. Still on: https://aistudio.google.com/app/apikey
2. Click "**Create API Key**"
3. Select project: `ai-tutor-dev-457802`
4. Copy the new key (starts with `AIza`)
5. **Save it securely** - you'll need it for both local and VPS

**Example format**: `AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567`

### Step 3: Update Local backend/.env

Open: `C:\Ai\aitutor_37\backend\.env`

**Change line 27 from**:
```env
GOOGLE_API_KEY=AQ.Ab8RN6IgnSJso5fj4Cfx4Tk8obnm6rP44GmI4Eu9BmqI145cug
```

**To**:
```env
GOOGLE_API_KEY=AIzaSy_YOUR_NEW_KEY_HERE
```

### Step 4: Restart Local Application

```bash
cd C:\Ai\aitutor_37\backend
# Stop current server (Ctrl+C)
python -m flask run --host=0.0.0.0 --port=5000
```

### Step 5: Test Answer Formulation

1. Open frontend: http://localhost:5173
2. Go to Answer Formulation page
3. Try to refine an answer
4. Should work without 401 errors

---

## 🔍 Why This Happened

### Two Different Authentication Methods

**1. Gemini API Key** (for AI generation):
- Format: `AIzaSy...`
- Used by: LangChain, Gemini models
- Get from: https://aistudio.google.com/app/apikey
- Purpose: AI text generation

**2. OAuth2 Access Token** (for Google Cloud APIs):
- Format: `ya29...` or `AQ...`
- Used by: Google Cloud services
- Get from: OAuth2 flow
- Purpose: Temporary authentication
- **Not suitable for server applications**

### What You Did Wrong

When you went to Google AI Studio and created a "new key", you might have:
1. Created an OAuth2 token instead of API key
2. Or copied the wrong value

### Correct Process

1. Go to: https://aistudio.google.com/app/apikey
2. Click "**Create API Key**" (not "Get OAuth token")
3. Select your project
4. Copy the key that starts with `AIza`

---

## 📋 Quick Fix Commands

### Update backend/.env

```bash
cd C:\Ai\aitutor_37\backend
notepad .env
```

**Find and replace**:
```env
# OLD (wrong format)
GOOGLE_API_KEY=AQ.Ab8RN6IgnSJso5fj4Cfx4Tk8obnm6rP44GmI4Eu9BmqI145cug

# NEW (correct format)
GOOGLE_API_KEY=AIzaSy_YOUR_NEW_KEY_HERE
```

**Save and close**

### Restart Application

```bash
cd C:\Ai\aitutor_37\backend
python -m flask run --host=0.0.0.0 --port=5000
```

---

## ✅ Verification

After fixing, you should see:

### ✅ Success Logs
```
Token verified successfully
Processing chunk 1/1
TTS successfully synthesized
INFO:werkzeug:127.0.0.1 - - [12/Oct/2025 16:25:36] "POST /api/v2/answer-formulation/refine HTTP/1.1" 200 -
```

### ❌ No More Errors
You should NOT see:
```
401 API keys are not supported by this API
CREDENTIALS_MISSING
```

---

## 🔐 Security Note

### Keys to Keep Secure

1. **Gemini API Key** (NEW):
   - Format: `AIzaSy...`
   - Keep in: `backend/.env` (NOT committed to Git)
   - Use for: AI generation

2. **Firebase Admin SDK**:
   - Format: JSON file
   - Keep in: `secrets/` folder
   - Use for: Authentication, Firestore

3. **Service Account**:
   - Format: JSON file
   - Keep in: `secrets/` folder
   - Use for: Google Cloud services

### Never Commit These Files

Ensure `.gitignore` includes:
```
backend/.env
.env
secrets/
credentials/
*.json
```

---

## 🆘 Troubleshooting

### Issue: Still Getting 401 Error

**Check**:
1. API key format starts with `AIza`
2. API key is correctly copied (no extra spaces)
3. Backend restarted after changing .env
4. Using `GOOGLE_API_KEY` not `GEMINI_API_KEY`

### Issue: "Invalid API Key"

**Solution**:
1. Verify key is active in Google AI Studio
2. Ensure project is correct
3. Check for typos in .env file

### Issue: "Quota Exceeded"

**Solution**:
1. Check API quota in Google Cloud Console
2. Enable billing if required
3. Request quota increase if needed

---

## 📞 After Local Fix

Once local is working, you'll need to update VPS with the same new API key.

**VPS Update**:
1. SSH to VPS
2. Edit `backend/.env`
3. Update `GOOGLE_API_KEY` with new key
4. Restart containers: `docker-compose restart`

---

## ✅ Checklist

- [ ] Revoke old Gemini API key (`AIzaSyC3KsJ4...`)
- [ ] Generate NEW Gemini API key
- [ ] Update local `backend/.env`
- [ ] Restart local Flask application
- [ ] Test Answer Formulation feature
- [ ] Update VPS `backend/.env`
- [ ] Restart VPS containers
- [ ] Test VPS Answer Formulation

---

**Estimated Time**: 5 minutes

**Start with Step 1: Generate NEW Gemini API Key**
