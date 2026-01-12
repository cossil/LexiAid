# Deprecation Candidates

> **Purpose**: Identify components/dependencies that are no longer in active use  
> **Status**: Verified 2026-01-09

---

## Critical Deprecations

### 1. OCR Processing [DEPRECATED]

**Location**: [document_routes.py](file:///C:/Ai/aitutor_37/backend/routes/document_routes.py) lines 286-305

**Evidence**:
```python
if should_run_ocr:
    current_app.logger.warning(f"OCR functionality has been deprecated...")
    final_fs_update_payload['status'] = 'ocr_unavailable'
```

**Replacement**: DUA (Document Understanding Agent) now handles all document processing.

**Action**: Remove OCR service references from codebase.

---

### 2. Unused SocketIO Dependencies [DEAD CODE]

**Location**: Root [requirements.txt](file:///C:/Ai/aitutor_37/requirements.txt)

| Package | Line | Reason |
|---------|------|--------|
| `Flask-SocketIO==5.5.1` | 47 | App uses `flask-sock` |
| `python-socketio==5.13.0` | 174 | Not imported |
| `python-engineio==4.12.1` | 171 | Not imported |
| `bidict==0.23.1` | 15 | SocketIO dependency |

**Evidence**: `app.py` line 54:
```python
from flask_sock import Sock
```

No imports of `flask_socketio` found in codebase.

**Action**: Remove from root requirements.txt.

---

### 3. Vertex AI References [MIGRATED]

**Status**: Fully migrated to Gemini API (2026-01-07)

**Remaining References**:
- `backend/requirements.txt` line 19: `langchain-google-vertexai==2.0.24`
- Root `requirements.txt` line 102: `langchain-google-vertexai==2.0.24`

**Evidence**: All graph files now use:
- `google.generativeai` (DUA)
- `langchain_google_genai.ChatGoogleGenerativeAI`

**Action**: Remove `langchain-google-vertexai` after confirming no imports remain.

---

### 4. AiTutorAgent (ReAct) [LEGACY]

**Location**: [app.py](file:///C:/Ai/aitutor_37/backend/app.py) lines 66-68

**Evidence**:
```python
# Legacy ReAct-style agent - superseded by LangGraph supervisor
# from backend.agent import AiTutorAgent
```

**Replacement**: `SupervisorGraph` with sub-graphs.

**Action**: Remove legacy agent file if still exists.

---

## Dead Code Detection

### Services Not Retrieved from Config

| Service | Registered | Retrieved | Status |
|---------|------------|-----------|--------|
| `AuthService` | ✅ | ✅ | Active |
| `FirestoreService` | ✅ | ✅ | Active |
| `StorageService` | ✅ | ✅ | Active |
| `TTSService` | ✅ | ✅ | Active |
| `STTService` | ✅ | ✅ | Active |
| `DocumentRetrievalService` | ✅ | ✅ | Active |

All registered services are actively used.

---

## Frontend Deprecation Candidates

### None Identified

All imported components and hooks are actively used in the application.

---

## Recommendations

1. **Immediate**: Remove SocketIO dependencies from requirements.txt
2. **Short-term**: Clean up OCR service code paths
3. **Medium-term**: Remove Vertex AI packages after verification
4. **Low Priority**: Remove legacy agent comments
