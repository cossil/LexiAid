# Tech Debt Cleanup Report
**Date:** January 12, 2026  
**Scope:** Dependency Management & Dead Code Removal

---

## Executive Summary

Two tech debt items were successfully resolved:
1. **Dependency Consolidation** - Eliminated redundant `requirements.txt` file
2. **TTS Route Migration** - Consolidated scattered route definitions into a single blueprint

---

## 1. Dependency Consolidation

### Problem
The project maintained two dependency files:
- `requirements.txt` (Root) — 224 packages, auto-generated pip freeze
- `backend/requirements.txt` — 62 packages, manually curated

### Analysis
| Aspect | Root File | Backend File |
|--------|-----------|--------------|
| Package count | 224 | 62 |
| Format | Pip freeze dump | Organized with comments |
| Used by Dockerfile | ❌ No | ✅ Yes |
| Contains dev tools | ✅ Yes | ❌ No |

The Dockerfile explicitly used only `backend/requirements.txt`:
```dockerfile
COPY backend/requirements.txt .
```

### Resolution

**Phase 1: Audit unused packages**  
Searched for imports of packages only in root file:
- `beautifulsoup4`, `pytesseract`, `matplotlib`, `pillow`, `graphviz`, `adk`, `mcp`
- **Result:** None were imported in the codebase

**Phase 2: Clean up backend/requirements.txt**
- Removed duplicate `langgraph` entry
- Pinned unpinned versions: `langgraph-checkpoint-sqlite==2.0.8`, `google-generativeai==0.8.4`, `gunicorn==21.2.0`

**Phase 3: Delete root file**
- Deleted `requirements.txt` from project root
- Verified `backend/requirements.txt` is now the only requirements file

### Outcome
✅ Single source of truth established  
✅ 224 → 61 packages (only production dependencies)

---

## 2. TTS Route Consolidation

### Problem
Initial report claimed duplicate TTS route between `app.py` and `tts_routes.py`.

### Analysis & Course Correction
Upon investigation, the consultant report and my analysis **agreed** on a key finding:

> There was no duplication. The blueprint was *incomplete*, not redundant.

| File | Endpoints |
|------|-----------|
| `app.py` (inline) | `/api/tts/synthesize` |
| `tts_routes.py` (blueprint) | `/api/tts/voices` only |

Both analyses independently concluded:
- ❌ Immediate deletion would break the frontend
- ✅ Migration to blueprint was required first

### Resolution

**Phase 1: Migration**  
Added `/synthesize` endpoint to `tts_routes.py`:
- Imported `TTSService`, `TTSServiceError`, `base64`
- Created `tts_synthesize()` function with full error handling
- Reused existing `before_request` authentication

**Phase 2: Cleanup**  
Removed inline route from `app.py`:
- Deleted 59 lines (lines 774-830)
- Blueprint registration unchanged

### Verification
```
@tts_bp.route('/synthesize', methods=['POST'])  → Line 45
@tts_bp.route('/voices', methods=['GET'])        → Line 103
```

Frontend endpoint `/api/tts/synthesize` unchanged — no client-side changes required.

### Outcome
✅ All TTS routes consolidated in single blueprint  
✅ 59 lines of code removed from `app.py`  
✅ Frontend "Read Aloud" feature confirmed working

---

## Files Modified

| File | Change |
|------|--------|
| `backend/requirements.txt` | Pinned versions, removed duplicate |
| `requirements.txt` (root) | **Deleted** |
| `backend/routes/tts_routes.py` | Added `/synthesize` endpoint |
| `backend/app.py` | Removed inline TTS route |

---

## Lessons Learned

1. **Verify before deleting** - The "redundancy" claim was partially incorrect; proper analysis prevented breaking changes
2. **Pip freeze ≠ requirements** - Auto-generated freeze files include transitive and dev dependencies that bloat production images
3. **Blueprint consolidation** - Scattered route definitions across files create maintenance burden

---

## Recommendations for Future

1. **Add pre-commit hook** to prevent creating root-level requirements.txt
2. **Document blueprint ownership** in a CODEOWNERS file
3. **Consider `pip-compile`** for reproducible dependency management
