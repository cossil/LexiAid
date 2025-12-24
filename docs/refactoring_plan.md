# Refactoring Plan – Golden Source

> **Synthesized**: 2024-01-10  
> **Sources**: docs_Comp, docs2, docsGPT52, docsopus45thinking2  
> **Estimated Effort**: ~90-110 minutes + testing

---

## Phase 1: Security (Immediate) – 5 min

### 1.1 Remove Debug Prints from user_routes.py

**File**: `backend/routes/user_routes.py`  
**Lines**: 195-196, 203-205, 208

**Action**: Remove all `print(f"DEBUG: ...")` statements.

**Risk**: ⚠️ **HIGH** – These expose user data in logs.

---

## Phase 2: Backend Cleanup – 30 min

### 2.1 Delete Empty Directory

```bash
rm -rf backend/agent/
```

### 2.2 Remove TTS Diagnostic Block

**File**: `backend/services/tts_service.py`  
**Lines**: 7-25

Remove entire diagnostic block:
```python
# START DIAGNOSTIC CODE
import sys
print("--- DIAGNOSTIC: START ---")
# ... diagnostic prints ...
print("--- DIAGNOSTIC: END ---")
# END DIAGNOSTIC CODE
```

### 2.3 Remove Document Routes Version Print

**File**: `backend/routes/document_routes.py`  
**Lines**: 26-28

Remove:
```python
print("\n***************************************************")
print("*** LOADING document_routes.py - VERSION MAY 12 20:55 ***")
print("***************************************************\n\n")
```

### 2.4 Clean app.py Comments

**File**: `backend/app.py`

Remove:
- Lines 66-68: Commented AiTutorAgent import
- Line 169: AdvancedDocumentLayoutTool deprecation comment

---

## Phase 3: Decorator Consolidation – 20 min

### 3.1 Update Document Routes

**File**: `backend/routes/document_routes.py`

1. **Add import** near top:
   ```python
   from backend.decorators import require_auth
   ```

2. **Remove** local `auth_required` function (lines 71-93)

3. **Remove** `_get_user_from_token` helper (lines 42-68)

4. **Replace** all `@auth_required` with `@require_auth`

**Affected routes**:
- `upload_document`
- `list_documents`
- `get_document`
- `delete_document`
- `get_tts_assets`

---

## Phase 4: Frontend Fixes – 20 min

### 4.1 Add Unmount Cleanup to useRealtimeStt

**File**: `src/hooks/useRealtimeStt.ts`

**Add** before return statement:
```tsx
useEffect(() => {
  return () => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // Ignore errors on unmount
      }
      wsRef.current = null;
    }
  };
}, []);
```

### 4.2 Refactor DocumentUpload to Use apiService (Optional)

**File**: `src/pages/DocumentUpload.tsx`

Replace direct `axios.post` with `apiService.uploadDocument()`.

**Note**: Verify `apiService.uploadDocument` supports progress callback.

### 4.3 Delete Unused Component

**File**: `src/components/MicrophoneButton.tsx`

**Action**: Delete file (no imports found).

---

## Phase 5: Infrastructure – 10 min

### 5.1 Remove Unused Logs Volume (Optional)

**File**: `docker-compose.yml`

**Option A – Remove**:
- Remove volume mount: `- lexiaid-backend-logs:/app/logs`
- Remove volume definition

**Option B – Utilize**:
- Configure Gunicorn to write logs to `/app/logs`

---

## Phase 6: Legacy Blueprint Cleanup (Future)

### 6.1 Remove progress_routes.py

**Prerequisite**: Confirm no frontend usage.

**Edits**:
- Remove import from `app.py`
- Remove blueprint registration
- Delete `backend/routes/progress_routes.py`

### 6.2 Remove DocAIService

**Prerequisite**: Confirm no hidden call sites.

**Edits**:
- Remove from `backend/services/__init__.py`
- Remove initialization from `app.py`
- Remove unused assignment in `document_routes.py`
- Delete `backend/services/doc_ai_service.py`

### 6.3 Normalize TTS Integration

**Prerequisite**: Update frontend to use `/api/tts/synthesize`.

**Edits**:
- Update `src/utils/ttsUtils.ts` to call correct endpoint
- Update response parsing
- Then remove `backend/routes/tts_routes.py`

---

## Verification Checklist

### After Each Phase:

- [ ] Backend starts without errors
- [ ] No console spam from removed prints
- [ ] Frontend builds successfully
- [ ] Docker compose build succeeds

### Functional Tests:

- [ ] Login/Logout works
- [ ] Document upload works (file and paste)
- [ ] Document view and TTS playback works
- [ ] Chat with document works
- [ ] Quiz start/answer works
- [ ] Answer formulation works
- [ ] STT dictation works
- [ ] Admin dashboard accessible (for admins)
- [ ] Settings update profile works

---

## Priority Summary

| Priority | Issue | Location | Effort |
|----------|-------|----------|--------|
| **HIGH** | Debug prints (security) | `user_routes.py` | 5 min |
| **MEDIUM** | Diagnostic prints | `tts_service.py` | 5 min |
| **MEDIUM** | Socket cleanup | `useRealtimeStt.ts` | 10 min |
| **LOW** | Duplicate decorator | `document_routes.py` | 15 min |
| **LOW** | Direct axios | `DocumentUpload.tsx` | 15 min |
| **LOW** | Unused volume | `docker-compose.yml` | 5 min |
| **LOW** | Empty directory | `backend/agent/` | 1 min |

---

## Rollback Plan

All changes are in version control:

```bash
# Rollback single file
git checkout -- path/to/file

# Rollback all changes
git reset --hard HEAD
```
