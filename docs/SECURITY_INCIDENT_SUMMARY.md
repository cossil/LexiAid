# 🚨 SECURITY INCIDENT - Quick Action Guide

## EXECUTE THESE COMMANDS IMMEDIATELY

### Option 1: Run Emergency Script (Fastest)

```bash
# From project root
cd c:\Ai\aitutor_37

# Run emergency removal script
.\emergency_remove_env.bat
```

### Option 2: Manual Commands

```bash
cd c:\Ai\aitutor_37

# Remove from Git
git rm --cached backend/.env
git rm --cached .env

# Commit
git commit -m "SECURITY: Remove exposed .env file"

# Push
git push origin main
```

---

## ⚠️ THIS IS NOT ENOUGH!

The file is still in Git history. Anyone can still access it.

---

## COMPLETE REMOVAL (Required)

### Install git-filter-repo

```bash
pip install git-filter-repo
```

### Backup Repository

```bash
cd c:\Ai
xcopy aitutor_37 aitutor_37_backup /E /I /H
```

### Purge from History

```bash
cd c:\Ai\aitutor_37

# Remove from all history
git filter-repo --path backend/.env --invert-paths --force
git filter-repo --path .env --invert-paths --force

# Force push (rewrites history)
git push origin --force --all
git push origin --force --tags
```

### Verify Removal

```bash
# Should return nothing
git log --all --full-history --oneline -- backend/.env
git log --all --full-history --oneline -- .env
```

---

## REVOKE CREDENTIALS (CRITICAL)

### 1. Google Cloud Service Account
- Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
- Delete old service account
- Create new one
- Download new JSON key

### 2. Google Gemini API Key
- Go to: https://aistudio.google.com/app/apikey
- Delete old key
- Create new key

### 3. Update Deployments
- Update local `backend/.env`
- Update VPS `backend/.env`
- Update VPS credentials file
- Restart containers

---

## CREDENTIALS TO REVOKE

From your exposed `.env` file, revoke:

- ✅ `GOOGLE_API_KEY` - Gemini API key
- ✅ `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` - Service account JSON
- ✅ `GCS_BUCKET_NAME` - Review bucket permissions
- ✅ `GOOGLE_CLOUD_PROJECT_ID` - Review project access
- ✅ Any other API keys or secrets

---

## TIMELINE

| Priority | Action | Time |
|----------|--------|------|
| 🔴 URGENT | Remove from current branch | 5 minutes |
| 🔴 URGENT | Purge from Git history | 10 minutes |
| 🔴 URGENT | Revoke service account | 15 minutes |
| 🔴 URGENT | Revoke API keys | 10 minutes |
| 🟡 HIGH | Update local deployment | 15 minutes |
| 🟡 HIGH | Update VPS deployment | 20 minutes |
| 🟢 MEDIUM | Add prevention measures | 30 minutes |
| 🟢 MEDIUM | Monitor for unauthorized access | Ongoing |

**Total Critical Time: ~1 hour**

---

## FULL DOCUMENTATION

See `docs/SECURITY_INCIDENT_RESPONSE.md` for:
- Complete step-by-step instructions
- All credential revocation procedures
- Deployment update guides
- Prevention measures
- Monitoring setup
- Team communication templates

---

## QUESTIONS?

If you encounter any issues:

1. **Git errors**: Check if you have uncommitted changes
2. **Push rejected**: Use `--force` (history rewrite required)
3. **Credential issues**: Generate completely new credentials
4. **VPS access**: Ensure you have SSH access and credentials

---

## AFTER COMPLETION

- [ ] Verify .env removed from GitHub
- [ ] Verify .env purged from history
- [ ] Confirm all credentials revoked
- [ ] Test local development with new credentials
- [ ] Test VPS production with new credentials
- [ ] Enable GitHub secret scanning
- [ ] Add pre-commit hooks
- [ ] Document incident in team log

---

## STATUS

**Current Status**: 🔴 INCIDENT OPEN - IMMEDIATE ACTION REQUIRED

Update this after completing each phase.
