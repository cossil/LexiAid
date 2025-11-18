# Backend Routes Analysis

Thinking...
- Review each Flask blueprint under `backend/routes` to understand exposed endpoints, required services, and external side effects.
- Capture authentication patterns, request payloads, and integration points with LangGraph or Google services.
- Note unfinished/deprecated routes that may impact deprecation analysis later.

Plan
1. Summarize the primary routes grouped by blueprint (documents, tts, stt, users, progress, answer-formulation).
2. For each, document purpose, request/response structure, upstream dependencies, and side effects.
3. Highlight any noteworthy logging/error handling behaviors and pending TODOs.

Execute
- Sections below cover each blueprint file located in `backend/routes/`.

## `document_routes.py`
- **Purpose**: Handles document upload, listing, retrieval, deletion, and legacy DUA processing.
- **Endpoints**:
  - `POST /api/documents/upload`: Accepts multipart file uploads, stores metadata in Firestore, uploads binaries to GCS, invokes Document Understanding Agent (`run_dua_processing_for_document`), pre-generates TTS assets when narrative available. Requires Auth header.
  - `GET /api/documents`: Lists user-owned documents via Firestore; uses `@auth_required` decorator to set `g.user_id`.
  - `DELETE /api/documents/<id>`: Verifies ownership, deletes Firestore entry and GCS blob.
- **Inputs**: Bearer token, multipart form data (`file`, optional `name`), query params for listing.
- **Outputs**: JSON with processing status, DUA narrative snippets, or standard list payload. Deletes return HTTP 204.
- **Side Effects**: Kicks off Doc AI, TTS pre-generation, writes to Firestore/Storage, logs aggressively with print statements.
- **Notes**: Auth helper duplicates logic also needed by other blueprints; consider centralizing.

## `answer_formulation_routes.py`
- **Purpose**: REST facade for the Answer Formulation LangGraph (refine/edit flows).
- **Endpoints**:
  - `POST /api/v2/answer-formulation/refine`: Requires JSON body with `transcript`, optional `question`, `session_id`. Invokes graph via `current_app.config['ANSWER_FORMULATION_GRAPH']`, returns refined answer + fidelity metrics + base64 TTS audio.
  - `POST /api/v2/answer-formulation/edit`: Accepts `session_id` and `edit_command`, loads prior state from Sqlite checkpointer, routes graph into edit branch, and returns updated answer with TTS audio.
- **Inputs**: `Authorization` header (enforced by `@auth_required`), JSON body.
- **Outputs**: Structured response containing `refined_answer`, `iteration_count`, optional `fidelity_score`, `audio_content_base64`, `timepoints`.
- **Side Effects**: Logs each request, reads from LangGraph checkpointer, synthesizes TTS through `TTSService`.

## `tts_routes.py`
- **Purpose**: Provide TTS voice listing (other endpoints may exist but only `/voices` implemented).
- **Endpoints**: `GET /api/tts/voices` returns available voices through `current_app.config['TOOLS']['TTSTool']`. Uses `before_request` hook to validate tokens.
- **Inputs**: Optional `language_code` query param, Authorization header.
- **Outputs**: `{ status: 'success', voices: [...] }` or error JSON.
- **Side Effects**: None beyond hitting TTSTool; logs when Auth service missing.
- **Notes**: `tts_service` placeholder unused; blueprint TODO mentions initialization wiring.

## `stt_routes.py`
- **Purpose**: Wrapper around Speech-to-Text tool for one-off transcription and listing supported languages.
- **Endpoints**:
  - `POST /api/stt/transcribe`: Accepts audio file upload, detects format, calls `STTTool.transcribe_audio`, returns transcript + confidence.
  - `GET /api/stt/languages`: Returns supported languages from STT tool.
- **Inputs**: Authorization header, multipart file (for transcribe), optional `language_code` parameter.
- **Outputs**: JSON status payloads.
- **Side Effects**: Calls Google Speech via STT tool, logs errors.
- **Notes**: Blueprint-level auth helper duplicates logic similar to TTS routes.

## `user_routes.py`
- **Purpose**: Fetch user profile information.
- **Endpoints**: `GET /api/users/profile` verifies token, fetches Firestore profile, merges with Firebase Auth `displayName`, returns user data.
- **Inputs**: Authorization header.
- **Outputs**: `{ status: 'success', data: {...} }` or error.
- **Side Effects**: Calls AuthService + FirestoreService; fallback to Firebase Auth data when Firestore doc missing.

## `progress_routes.py`
- **Purpose**: Placeholder for progress tracking.
- **Endpoints**: `GET /api/progress` currently returns hard-coded message after verifying token.
- **Notes**: TODO comments indicate need to wire Firestore service and real data.

## Cross-cutting Notes
1. **Auth Duplication**: Multiple blueprints embed similar `_get_user_from_token` helpers; consolidating into shared decorator would reduce drift.
2. **Logging Strategy**: Many routes rely on `print` rather than `logging`. Consider standardizing for production readiness.
3. **Service Access**: Routes expect services under `current_app.config['SERVICES']`; missing initialization leads to runtime `KeyError`. Add startup checks to fail fast.
4. **Deprecated Legacy Paths**: Comments flag OCR as deprecated and DocumentUnderstandingGraph removed from supervisor; ensure documentation matches current route behavior to avoid confusion.
