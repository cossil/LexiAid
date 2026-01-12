# Final Code Cleanup Plan

> **Date**: 2026-01-12  
> **Purpose**: Clean up legacy code, standardize auth patterns, and improve logging  
> **Status**: Planning — Analysis Complete

---

## Summary

Three cleanup tasks identified through code analysis:

| Task | Target | Scope |
|------|--------|-------|
| Legacy Code Removal | `app.py` | 3 lines (comments) |
| Auth Decorator Standardization | `user_routes.py` | 5 endpoints |
| Logging Standardization | `tts_service.py`, `stt_service.py` | 41 print statements |

---

## Task 1: Legacy Code Cleanup (app.py)

### Dead Code Location

**File**: [app.py](file:///c:/Ai/aitutor_37/backend/app.py#L66-L68)

```python
# Lines 66-68
# Note: AiTutorAgent (ReAct-based) was previously imported here but is no longer used by the application.
# The LangGraph-based Supervisor architecture (supervisor_graph.py) now handles all agent functionality.
# Kept for reference or potential future use. Can be removed if not needed.
```

### Recommended Action

**DELETE** lines 66-68. These comments provide no value and reference deprecated code that has already been removed.

---

## Task 2: Standardize Auth Decorators (user_routes.py)

### How `@require_auth` Works

The decorator ([auth.py](file:///c:/Ai/aitutor_37/backend/decorators/auth.py)) stores user data in Flask's `g` object:

```python
# Line 67-68 of auth.py
g.user_id = user_id
g.user_email = token_data.get('email')
```

**Usage Pattern**: After applying `@require_auth`, access user data via `g.user_id` and `g.user_email`.

### Endpoints Requiring Refactoring

| Route | Method | Current Auth Pattern | Lines |
|-------|--------|---------------------|-------|
| `/` (DELETE) | DELETE | Manual token extraction | 103-116 |
| `/init` | POST | Manual token extraction | 142-155 |
| `/profile` | PUT | Manual token extraction | 179-192 |
| `/verify-email` | POST | Manual token extraction | 255-265 |
| `/profile` | GET | Manual token extraction | 281-309 |

### Refactoring Template

**Before** (current pattern):
```python
@user_bp.route('/profile', methods=['PUT'])
def update_user_profile():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({'status': 'error', 'message': 'No authorization token'}), 401
    
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    success, user_data = auth_svc.verify_id_token(token)
    if not success or not user_data:
        return jsonify({'status': 'error', 'message': 'Invalid token'}), 401
    
    user_id = user_data['uid']
    # ... rest of function
```

**After** (standardized):
```python
from flask import g
from backend.decorators.auth import require_auth

@user_bp.route('/profile', methods=['PUT'])
@require_auth
def update_user_profile():
    user_id = g.user_id  # Populated by @require_auth
    # ... rest of function
```

### Note: `create_user()` Exception

The `POST /` endpoint (`create_user`) at line 56 should **NOT** use `@require_auth` because it creates new users who don't yet have authentication.

---

## Task 3: Logging Standardization

### Current State

Services use `print()` for debugging instead of the proper Flask logger.

### Files to Update

| File | Print Statements | Categories |
|------|-----------------|------------|
| [tts_service.py](file:///c:/Ai/aitutor_37/backend/services/tts_service.py) | 19 | Diagnostic (9), Init (4), Runtime (6) |
| [stt_service.py](file:///c:/Ai/aitutor_37/backend/services/stt_service.py) | 22 | Init (3), Runtime (19) |

### Conversion Strategy

| Print Category | Logger Level | Example |
|---------------|--------------|---------|
| Diagnostic startup | `logging.debug()` | Module import checks |
| Success messages | `logging.info()` | "Client initialized successfully" |
| Warnings | `logging.warning()` | "Audio encoding is None" |
| Errors | `logging.error()` | "ERROR initializing client" |
| Debug/trace info | `logging.debug()` | Processing step details |

### Special Consideration: tts_service.py Diagnostic Block

Lines 7-25 contain a diagnostic block that runs at **module import time**. Options:

1. **Remove entirely** (recommended) — This is startup debugging that's no longer needed
2. **Convert to logging** — May cause issues if logging isn't configured at import time
3. **Wrap in conditional** — `if os.getenv('DEBUG_TTS'): ...`

---

## Implementation Order

1. **Task 1**: Remove legacy comments (low risk, immediate)
2. **Task 2**: Refactor auth decorators (medium risk, requires testing)
3. **Task 3**: Standardize logging (low risk, tedious but safe)

---

## Estimated Effort

| Task | Lines Changed | Complexity |
|------|---------------|------------|
| Legacy Code Removal | 3 deleted | Low |
| Auth Standardization | ~60 refactored | Medium |
| Logging Standardization | ~41 converted | Low |

---

## Verification Plan

### Task 1 Verification
```bash
python -c "from backend.app import app; print('OK')"
```

### Task 2 Verification
- Test each refactored endpoint with valid/invalid tokens
- Confirm `g.user_id` is correctly populated

### Task 3 Verification
- Start server and confirm no `print()` output to console
- Verify logs appear in configured log handlers