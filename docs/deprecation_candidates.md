# Deprecation Candidates – Golden Source

> **Synthesized**: 2024-01-10  
> **Sources**: docs_Comp, docs2, docsGPT52, docsopus45thinking2  
> **Verified Against**: Actual codebase

---

## 1. Verified Dead Code (Safe to Delete)

### Backend

| Item | Type | Location | Evidence | Risk |
|------|------|----------|----------|------|
| `backend/agent/` | Directory | Backend | Empty directory (verified) | None |

---

## 2. Dead Code Blocks (In Active Files)

### Security Priority – REMOVE IMMEDIATELY

| File | Lines | Description | Risk |
|------|-------|-------------|------|
| `user_routes.py` | 195-208 | Debug prints exposing user data | ⚠️ **HIGH** |

### Cleanup Priority – REMOVE

| File | Lines | Description | Risk |
|------|-------|-------------|------|
| `tts_service.py` | 7-25 | Diagnostic print block | Low |
| `document_routes.py` | 26-28 | Version print statement | Low |
| `app.py` | 66-68 | Commented AiTutorAgent import | None |
| `app.py` | 169 | Stale AdvancedDocumentLayoutTool comment | None |

---

## 3. Legacy/Unused Blueprints

### `backend/routes/progress_routes.py` – PLACEHOLDER

**Status**: Registered but returns placeholder data only.

**Evidence**:
- Returns: `"Progress data for user {user_id} will be here."`
- No frontend references to `/api/progress`

**Action**: ⚠️ **EVALUATE** – Either implement or remove.

### `backend/routes/tts_routes.py` – BROKEN DEPENDENCY

**Status**: Registered but depends on unpopulated `TOOLS['TTSTool']`.

**Evidence**:
- Expects `current_app.config['TOOLS'].get('TTSTool')`
- `app.py` initializes `app.config['TOOLS'] = {}` but never populates it

**Blocking**: `src/utils/ttsUtils.ts` calls `/api/tts/voices`. Must update frontend before removal.

### `backend/routes/stt_routes.py` – BROKEN DEPENDENCY

**Status**: Registered but depends on unpopulated `TOOLS['STTTool']`.

**Evidence**:
- Expects `current_app.config['TOOLS'].get('STTTool')`
- Real STT uses WebSocket `/api/stt/stream` in `app.py`

---

## 4. Unused Services

### `backend/services/doc_ai_service.py` – ZOMBIE SERVICE

**Status**: Initialized but never called.

**Evidence**:
- `app.py` sets `app.config['DOCAI_SERVICE']`
- `document_routes.py` assigns `doc_ai_service = current_app.config.get('DOCAI_SERVICE')` but never uses it

**Action**: ✅ **SAFE TO REMOVE** after updating imports.

---

## 5. Frontend Candidates

### `src/components/MicrophoneButton.tsx` – UNUSED

**Status**: File exists but no imports found.

**Evidence**:
- `grep "import.*MicrophoneButton"` returns 0 results
- Not used by any routed page

**Action**: ✅ **SAFE TO DELETE**

### `src/components/AudioReview.tsx` – DEV-ONLY

**Status**: Only used by dev route `/dev/audio-review`.

**Evidence**:
- Imported in `App.tsx` for dev-only route
- Not used in production paths

**Action**: ⚠️ **KEEP** – Intentionally dev-only.

---

## 6. FALSE POSITIVES – DO NOT DELETE

### `backend/diagnostics/langgraph_patch.py`

**Peer Claim**: "Suspected dead code"

**Reality**: **ACTIVE PRODUCTION CODE**

**Evidence**:
- Imported at `app.py` line 130
- Auto-executes `install_patch()` on import
- Fixes SqliteSaver serialization bug for complex objects

**Action**: ❌ **DO NOT DELETE**

---

## 7. Infrastructure Debt

### Unused Docker Volume

**File**: `docker-compose.yml`

**Volume**: `lexiaid-backend-logs:/app/logs`

**Issue**: Mounted but Gunicorn logs to stdout (`--access-logfile "-"`).

**Action**: ⚠️ **EVALUATE** – Either configure logging or remove volume.

---

## 8. Duplicate Code to Consolidate

### Duplicate Auth Decorator

**File**: `backend/routes/document_routes.py` (lines 71-93)

**Issue**: Local `@auth_required` duplicates `backend/decorators/auth.py`.

**Action**: ✅ **REFACTOR** – Use centralized `@require_auth`.

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Dead directories | 1 | Delete |
| Dead code blocks | 5 | Remove |
| Legacy blueprints | 3 | Evaluate/Remove |
| Unused services | 1 | Remove |
| Unused components | 1 | Delete |
| False positives | 1 | **Keep** |
| Duplicate code | 1 | Consolidate |
| Unused infra | 1 | Evaluate |
