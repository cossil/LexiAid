# 🔧 Service Account Permission Fix

## 🎯 Issue

The error `401 API keys are not supported by this API` occurs because:
- You're using `ChatGoogleGenerativeAI` which expects either an API key OR service account
- Your service account might not have the correct permissions for Vertex AI

## ✅ Solution: Add Vertex AI Role to Service Account

### Step 1: Go to IAM Console

```
https://console.cloud.google.com/iam-admin/iam?project=ai-tutor-dev-457802
```

### Step 2: Find Your Service Account

Look for the service account you created:
- Email format: `xxxxx@ai-tutor-dev-457802.iam.gserviceaccount.com`
- It's the one in your JSON file at: `C:\Ai\aitutor_37\secrets\ai-tutor-dev-457802-b386544b4d0f.json`

### Step 3: Add Vertex AI Permission

1. Click the **✏️ Edit** (pencil icon) next to your service account
2. Click **+ ADD ANOTHER ROLE**
3. Search for and add **ONE** of these roles:
   - **Vertex AI User** (recommended)
   - OR **Generative Language API User**
   - OR **AI Platform User**
4. Click **SAVE**

### Step 4: Remove API Key from .env (Optional)

Since you're using service account authentication, you can comment out the API key:

Edit `backend/.env`:
```env
# --- Google Gemini API Key ---
# Not needed when using service account authentication
# GOOGLE_API_KEY=AIzaSyC3KsJ4-sO--nEx9OiQS7Ir6QhHfWW9354
```

### Step 5: Restart Application

```bash
cd C:\Ai\aitutor_37\backend
python -m flask run --host=0.0.0.0 --port=5000
```

### Step 6: Test

Try Answer Formulation feature - should work now!

---

## 🔍 Alternative: Create API Key in Google Cloud Console

If you prefer using an API key instead of service account:

### Step 1: Go to Credentials

```
https://console.cloud.google.com/apis/credentials?project=ai-tutor-dev-457802
```

### Step 2: Create API Key

1. Click **+ CREATE CREDENTIALS**
2. Select **API Key**
3. Copy the key (starts with `AIza`)

### Step 3: Restrict the Key (Important for Security)

1. Click **RESTRICT KEY**
2. Under **API restrictions**:
   - Select **Restrict key**
   - Choose: **Generative Language API**
3. Under **Application restrictions** (optional):
   - Select **IP addresses**
   - Add your server IPs
4. Click **SAVE**

### Step 4: Update .env

```env
GOOGLE_API_KEY=AIzaSy_YOUR_NEW_KEY_HERE
```

### Step 5: Restart and Test

```bash
cd C:\Ai\aitutor_37\backend
python -m flask run --host=0.0.0.0 --port=5000
```

---

## 📋 Which Method to Use?

### Use Service Account If:
- ✅ You want better security
- ✅ You're deploying to production
- ✅ You want consistent authentication across all services
- ✅ You don't want to manage multiple credentials

### Use API Key If:
- ✅ You want simpler local development
- ✅ You're just testing
- ✅ You prefer separate credentials for different services

---

## 🔍 How to Check Which Service Account You Have

Open your service account JSON file:

```bash
notepad C:\Ai\aitutor_37\secrets\ai-tutor-dev-457802-b386544b4d0f.json
```

Look for the `client_email` field:
```json
{
  "type": "service_account",
  "project_id": "ai-tutor-dev-457802",
  "client_email": "xxxxx@ai-tutor-dev-457802.iam.gserviceaccount.com",
  ...
}
```

Use that email to find it in the IAM console.

---

## ✅ Recommended Approach

**For your setup, I recommend**:

1. ✅ Use service account (you already have it)
2. ✅ Add **Vertex AI User** role
3. ✅ Remove/comment out `GOOGLE_API_KEY` from .env
4. ✅ Restart application
5. ✅ Test Answer Formulation

This is:
- More secure
- Easier to manage
- Consistent with your other services
- Better for production deployment

---

## 🆘 Troubleshooting

### Issue: Still Getting 401 Error

**Check**:
1. Service account has **Vertex AI User** role
2. `GOOGLE_APPLICATION_CREDENTIALS` points to correct JSON file
3. JSON file is valid and readable
4. Application restarted after changes

### Issue: "Permission Denied"

**Solution**:
Add these roles to service account:
- Vertex AI User
- Generative Language API User

### Issue: "API Not Enabled"

**Solution**:
1. Go to: https://console.cloud.google.com/apis/library?project=ai-tutor-dev-457802
2. Search for: "Generative Language API"
3. Click **ENABLE**

---

## 📞 Next Steps

1. **Choose your method** (Service Account recommended)
2. **Add permissions** or **create API key**
3. **Update .env** if needed
4. **Restart application**
5. **Test Answer Formulation**

---

**Estimated Time**: 5 minutes

**Start with: Add Vertex AI User role to your service account**
