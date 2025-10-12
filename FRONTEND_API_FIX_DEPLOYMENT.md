# 🔧 Frontend API Connection Fix - Deployment Guide

## ✅ Changes Made

### 1. Updated `docker-compose.yml`
Added build arguments to pass the backend API URL to the frontend during build:

```yaml
frontend:
  build:
    context: .
    dockerfile: Dockerfile
    args:
      - VITE_BACKEND_API_URL=https://api.hankell.com.br
```

### 2. Updated `Dockerfile`
Added ARG and ENV declarations to accept the backend URL during build:

```dockerfile
ARG VITE_BACKEND_API_URL
ENV VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL}
```

---

## 🚀 Deployment Steps

### Local Testing (Optional)

Test the fix locally before deploying to VPS:

```bash
cd C:\Ai\aitutor_37

# Build with the new configuration
docker-compose build --no-cache frontend

# Run locally
docker-compose up frontend

# Test in browser
# Open: http://localhost
# Check console - should NOT see localhost:5000 errors
```

---

### VPS Production Deployment

#### Step 1: Transfer Updated Files to VPS

**Option A: Using Git (Recommended)**

```bash
# On local machine
cd C:\Ai\aitutor_37

# Commit changes
git add docker-compose.yml Dockerfile
git commit -m "fix: Configure frontend build args for production API URL"
git push origin main

# On VPS
ssh root@YOUR_VPS_IP
cd /path/to/lexiaid
git pull origin main
```

**Option B: Using SCP**

```bash
# From local machine
scp C:\Ai\aitutor_37\docker-compose.yml root@YOUR_VPS_IP:/path/to/lexiaid/
scp C:\Ai\aitutor_37\Dockerfile root@YOUR_VPS_IP:/path/to/lexiaid/
```

#### Step 2: Rebuild Frontend on VPS

```bash
# SSH into VPS
ssh root@YOUR_VPS_IP

# Navigate to project
cd /path/to/lexiaid

# Stop current containers
docker-compose down

# Remove old frontend image (force clean build)
docker rmi lexiaid-frontend:latest

# Rebuild frontend with new configuration
docker-compose build --no-cache frontend

# Start all services
docker-compose up -d

# Wait 30 seconds for startup
sleep 30
```

#### Step 3: Verify Deployment

```bash
# Check container status
docker ps | grep lexiaid

# Should show both containers running:
# lexiaid-frontend
# lexiaid-backend

# Check frontend logs
docker logs lexiaid-frontend

# Check backend logs
docker logs lexiaid-backend
```

#### Step 4: Test in Browser

1. Open: https://lexiaid.hankell.com.br
2. Sign in with your credentials
3. Open browser Developer Console (F12)
4. Go to Network tab
5. Try to access documents or other features

**Expected Results**:
- ✅ API calls go to: `https://api.hankell.com.br`
- ✅ No `localhost:5000` errors
- ✅ No `net::ERR_CONNECTION_REFUSED` errors
- ✅ Data loads successfully

---

## 🔍 Verification Checklist

### Before Deployment
- [x] `docker-compose.yml` updated with build args
- [x] `Dockerfile` updated with ARG and ENV
- [x] Changes committed to Git (if using Git)

### After Deployment
- [ ] Frontend container running
- [ ] Backend container running
- [ ] Frontend accessible at https://lexiaid.hankell.com.br
- [ ] Backend accessible at https://api.hankell.com.br/health
- [ ] No console errors about localhost:5000
- [ ] API calls use correct production URL
- [ ] Authentication works
- [ ] Data fetching works

---

## 🐛 Troubleshooting

### Issue: Frontend Still Calls localhost:5000

**Cause**: Old frontend image cached

**Solution**:
```bash
# On VPS
docker-compose down
docker rmi lexiaid-frontend:latest
docker-compose build --no-cache frontend
docker-compose up -d
```

### Issue: Build Fails

**Cause**: Missing build argument

**Solution**:
Verify `docker-compose.yml` has:
```yaml
args:
  - VITE_BACKEND_API_URL=https://api.hankell.com.br
```

### Issue: Environment Variable Not Set

**Cause**: ARG not converted to ENV in Dockerfile

**Solution**:
Verify `Dockerfile` has both:
```dockerfile
ARG VITE_BACKEND_API_URL
ENV VITE_BACKEND_API_URL=${VITE_BACKEND_API_URL}
```

### Issue: API Calls Still Fail

**Cause**: Backend not accessible or CORS issue

**Solution**:
```bash
# Test backend directly
curl https://api.hankell.com.br/health

# Should return: {"status":"healthy"}

# Check backend logs for CORS errors
docker logs lexiaid-backend | grep -i cors
```

---

## 📋 Quick Commands Reference

### VPS Deployment

```bash
# Full deployment sequence
ssh root@YOUR_VPS_IP
cd /path/to/lexiaid
git pull origin main
docker-compose down
docker rmi lexiaid-frontend:latest
docker-compose build --no-cache frontend
docker-compose up -d
docker logs -f lexiaid-frontend
```

### Check Status

```bash
# Container status
docker ps

# Frontend logs
docker logs lexiaid-frontend --tail 50

# Backend logs
docker logs lexiaid-backend --tail 50

# Test endpoints
curl https://lexiaid.hankell.com.br
curl https://api.hankell.com.br/health
```

### Rollback (If Needed)

```bash
# Revert to previous version
git checkout HEAD~1 docker-compose.yml Dockerfile
docker-compose down
docker-compose build --no-cache frontend
docker-compose up -d
```

---

## 🎯 What This Fix Does

### Problem
The frontend was built with `VITE_BACKEND_API_URL` pointing to `http://localhost:5000` (or undefined), causing it to try connecting to localhost when deployed on the VPS.

### Solution
By passing `VITE_BACKEND_API_URL=https://api.hankell.com.br` as a build argument:
1. Vite reads the environment variable during build
2. The production URL is baked into the compiled JavaScript
3. The frontend correctly calls the production API

### Why Build Args?
Vite environment variables must be set **at build time**, not runtime. The compiled JavaScript bundle contains the hardcoded API URL, so we must pass it during `docker build`.

---

## 🔐 Security Note

The backend URL (`https://api.hankell.com.br`) is **not sensitive** - it's a public endpoint. It's safe to hardcode it in the frontend build.

However, ensure your backend has proper:
- ✅ CORS configuration (allows requests from frontend domain)
- ✅ Authentication (Firebase tokens)
- ✅ Rate limiting
- ✅ Input validation

---

## ✅ Success Criteria

After deployment, you should see:

### Browser Console (No Errors)
```
✅ Fetching documents from https://api.hankell.com.br/api/documents
✅ User profile loaded from https://api.hankell.com.br/api/users/profile
```

### Network Tab
```
✅ Status: 200 OK
✅ Request URL: https://api.hankell.com.br/api/...
✅ Response: Valid JSON data
```

### Application Behavior
```
✅ Login works
✅ Documents load
✅ User profile displays
✅ All features functional
```

---

## 📞 Next Steps

1. **Deploy to VPS** using the commands above
2. **Test thoroughly** in production
3. **Monitor logs** for any issues
4. **Update VPS credentials** (from earlier security incident)

---

**Estimated Deployment Time**: 10-15 minutes

**Ready to deploy? Follow the VPS Production Deployment steps above!**
