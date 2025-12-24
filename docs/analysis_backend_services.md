# Backend Services Analysis (Golden Source)

**Authority:** Verified against `backend/app.py`, `backend/services/*`, and active route call sites in `backend/routes/*` (Dec 23, 2025)

This document describes backend “services” as concrete Python components initialized in `backend/app.py` and consumed by reachable routes/graphs.

---

## 1) Service Inventory (Verified)

`backend/app.py` initializes these services (via `initialize_component(...)`) into `app.config['SERVICES']` and/or dedicated keys:

- `AuthService` (`backend/services/auth_service.py`)
- `FirestoreService` (`backend/services/firestore_service.py`)
- `StorageService` (`backend/services/storage_service.py`)
- `DocAIService` (`backend/services/doc_ai_service.py`)
- `DocumentRetrievalService` (`backend/services/doc_retrieval_service.py`)
- `TTSService` (`backend/services/tts_service.py`)
- `STTService` (`backend/services/stt_service.py`)

Additionally (graph-layer “services”):
- `ANSWER_FORMULATION_GRAPH` and `ANSWER_FORMULATION_CHECKPOINTER` are injected into `app.config` by `DatabaseManager`.

---

## 2) Per-Service Consumption (Evidence-only)

### 2.1 AuthService (Active)
**Where used:**
- Central auth decorator `backend/decorators/auth.py::require_auth` uses `current_app.config['AUTH_SERVICE']`.
- Several blueprint modules also perform token verification manually using the Auth service.

**Key output:** `g.user_id` and (via `require_auth`) `g.user_email`.

### 2.2 FirestoreService (Active)
**Where used:**
- Documents: `backend/routes/document_routes.py` (create/update/get/list/delete documents; get TTS asset URIs).
- Users: `backend/routes/user_routes.py` (create user profile, `ensure_user_profile`, update preferences, delete user data).
- Feedback/admin: `backend/routes/feedback_routes.py`, `backend/routes/admin_routes.py`.

**Important data model note:** `documents` are stored at root-level `documents/{docId}` (not nested under `users`).

### 2.3 StorageService (Active)
**Where used:**
- Document upload saves original files to GCS.
- TTS asset pre-generation uploads MP3 + timepoints JSON.
- `GET /api/documents/<id>/tts-assets` returns signed URLs using `StorageService.get_signed_url`.

### 2.4 DocumentRetrievalService (Active)
**Where used:**
- Supervisor routing and quiz start use document snippet retrieval.
- Chat graph uses it to retrieve document content for grounded answering.

**Security note:** `get_document_content_for_quiz(..., user_id=None)` does not enforce ownership in the service itself.

### 2.5 TTSService (Active)
**Where used:**
- `POST /api/tts/synthesize` (defined in `backend/app.py`) calls `TTSService.synthesize_text(...)` and returns base64 MP3 + timepoints.
- Pre-generated TTS during upload in `backend/routes/document_routes.py`.
- Answer formulation endpoints generate per-response TTS.

**Audio engine verified behavior:**
- Requests LINEAR16 (`AudioEncoding.LINEAR16`) from Google TTS.
- Decodes each chunk using `AudioSegment.from_wav(...)`.
- Stitches lossless PCM chunks.
- Exports final audio as MP3.

**Operational risk:** `backend/services/tts_service.py` contains extensive import-time diagnostic `print(...)` statements.

### 2.6 STTService (Active)
**Where used:**
- WebSocket streaming endpoint `/api/stt/stream` uses the Speech client for realtime recognition.
- Agent chat endpoint can transcribe audio in “review” mode and “direct_send” mode.

**Operational risk:** STT service writes debug audio files to `backend/debug_audio/`.

### 2.7 DocAIService (Initialized, but not proven active in request path)
**What’s verified:**
- `DocAIService` is instantiated in `backend/app.py` and stored at `app.config['DOCAI_SERVICE']`.
- `backend/routes/document_routes.py` retrieves it in `get_document_details(...)` (assigns `doc_ai_service = current_app.config.get('DOCAI_SERVICE')`) but does **not** call it.

**Conclusion:** `DocAIService` is **initialized** but not clearly consumed by any reachable route/graph in the current codebase.

---

## 3) `app.config['TOOLS']` (Registered, but not populated)

`backend/app.py` initializes `app.config['TOOLS'] = {}` but no code populates `TTSTool` or `STTTool`.

**Implication:**
- `backend/routes/tts_routes.py` and `backend/routes/stt_routes.py` reference `TOOLS['TTSTool']` / `TOOLS['STTTool']` and therefore appear **functionally incomplete** for production.

---

## 4) Summary (Key Risks)

- **Unauthenticated cost surface:** `WS /api/stt/stream` is not protected by `@require_auth`.
- **PII/log leakage:** `print(...)` statements exist in auth/profile code and diagnostics.
- **Zombie initialization:** `DocAIService` is initialized but not proven used in active request paths.
- **Legacy tool registry:** `TOOLS`-based STT/TTS routes are registered but not wired.
