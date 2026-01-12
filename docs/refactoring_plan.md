# Refactoring Plan

> **Purpose**: Actionable improvements identified during audit  
> **Priority**: High → Medium → Low  
> **Verified**: 2026-01-09

---

## High Priority

### 1. Fix Dockerfile Healthcheck Path

**Problem**: Backend Dockerfile healthcheck uses wrong path.

**Location**: [backend/Dockerfile](file:///C:/Ai/aitutor_37/backend/Dockerfile) line 89

**Current**:
```dockerfile
CMD python -c "import requests; requests.get('http://localhost:5000/health', timeout=5)"
```

**Fix**:
```dockerfile
CMD python -c "import requests; requests.get('http://localhost:5000/api/health', timeout=5)"
```

**Impact**: Prevents container restart loops in standalone builds.

---

### 2. Remove Unused SocketIO Dependencies

**Problem**: Root requirements.txt contains unused packages.

**Location**: [requirements.txt](file:///C:/Ai/aitutor_37/requirements.txt)

**Remove**:
- Line 47: `Flask-SocketIO==5.5.1`
- Line 15: `bidict==0.23.1`
- Line 171: `python-engineio==4.12.1`
- Line 174: `python-socketio==5.13.0`

**Impact**: Reduces image size, avoids dependency confusion.

---

### 3. Add google-generativeai to Backend Requirements

**Problem**: DUA graph imports `google.generativeai` but it's not in backend/requirements.txt.

**Location**: [backend/requirements.txt](file:///C:/Ai/aitutor_37/backend/requirements.txt)

**Add**:
```
google-generativeai>=0.5.0
```

**Note**: Currently works via transitive dependency from `google-genai`, but should be explicit.

---

## Medium Priority

### 4. Add WebSocket Authentication

**Problem**: STT WebSocket endpoint has no auth validation.

**Location**: [app.py](file:///C:/Ai/aitutor_37/backend/app.py) line 322

**Current**:
```python
@sock.route('/ws/stt/stream')
def stt_stream(ws):
```

**Recommended Fix**:
```python
@sock.route('/ws/stt/stream')
def stt_stream(ws):
    # Validate token from query param or first message
    token = request.args.get('token')
    if not validate_token(token):
        ws.close(reason=1008)
        return
```

---

### 5. Consolidate Requirements Files

**Problem**: Two requirements.txt files cause confusion.

**Options**:
1. **Keep Split**: Use root for dev tools, backend for runtime (document clearly)
2. **Consolidate**: Single backend/requirements.txt (simpler)

**Recommendation**: Option 1 with clear README documentation.

---

### 6. Remove Duplicate TTS Route

**Problem**: TTS synthesis duplicated in app.py and tts_routes.py.

**Location**: [app.py](file:///C:/Ai/aitutor_37/backend/app.py) lines 741-797

**Action**: Remove inline route, use only `tts_bp`.

---

## Low Priority

### 7. Replace print() with logging

**Problem**: Debug print statements in services.

**Locations**:
- `tts_service.py` lines 9-24
- `stt_service.py` various lines

**Action**: Replace with `logging.debug()` or `logging.info()`.

---

### 8. Clean Up Legacy Comments

**Problem**: Commented code referencing old implementations.

**Locations**:
- `app.py` lines 66-68 (AiTutorAgent)
- Various OCR references in document_routes.py

**Action**: Remove after confirming no active usage.

---

### 9. Standardize Auth Pattern in user_routes

**Problem**: Inconsistent token extraction vs decorator usage.

**Current**: Manual token extraction in user_routes.py
```python
token = request.headers.get('Authorization', '').replace('Bearer ', '')
```

**Recommended**: Use `@require_auth` decorator consistently.

---

## Verification Commands

After making changes, run:

```bash
# Check imports
grep -r "from flask_socketio" backend/
grep -r "import socketio" backend/

# Verify no Vertex AI imports
grep -r "vertexai" backend/graphs/

# Test healthcheck
curl http://localhost:5000/api/health
```
