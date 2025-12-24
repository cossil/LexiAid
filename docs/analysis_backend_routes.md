# Backend Routes Analysis (Golden Source)

**Authority:** Verified against `backend/app.py` and `backend/routes/*.py` (Dec 23, 2025)

This document enumerates the **active** backend API surface area and highlights **security-critical** and **consistency** findings. A route is considered active if it is:
- Declared via `@app.route(...)` in `backend/app.py`, or
- Declared on a blueprint that is registered in `backend/app.py`, or
- Declared via `@sock.route(...)` (WebSocket).

---

## 1) Authoritative Registration Map (What is actually reachable)

### 1.1 Blueprints registered in `backend/app.py` (Active)
Registered with these URL prefixes:
- `document_bp` → `/api/documents` → `backend/routes/document_routes.py`
- `tts_bp` → `/api/tts` → `backend/routes/tts_routes.py`
- `stt_bp` → `/api/stt` → `backend/routes/stt_routes.py`
- `user_bp` → `/api/users` → `backend/routes/user_routes.py`
- `progress_bp` → `/api/progress` → `backend/routes/progress_routes.py`
- `answer_formulation_bp` → `/api/v2/answer-formulation` → `backend/routes/answer_formulation_routes.py`
- `feedback_bp` → `/api/feedback` → `backend/routes/feedback_routes.py`
- `admin_bp` → `/api/admin` → `backend/routes/admin_routes.py`

### 1.2 Direct routes in `backend/app.py` (Active)
- `POST /api/v2/agent/chat` (auth-protected)
- `GET /api/v2/agent/history` (auth-protected)
- `GET /api/health` (unauthenticated)
- `POST /api/tts/synthesize` (auth-protected)
- `GET /api/diagnostics/firestore` (**unauthenticated; security risk**)

### 1.3 WebSocket routes in `backend/app.py` (Active)
- `WS /api/stt/stream` (**unauthenticated; resource-abuse risk**)

---

## 2) Authentication / Authorization Model (Verified)

### 2.1 Central auth decorator: `@require_auth`
- Defined in `backend/decorators/auth.py`.
- Validates Firebase ID token from `Authorization: Bearer ...`.
- Populates:
  - `g.user_id`
  - `g.user_email`

### 2.2 Admin authorization: `@require_admin`
- Defined in `backend/decorators/admin_auth.py`.
- Uses env var `ADMIN_EMAILS` (comma-separated), loaded at module import:
  - Compared case-insensitively against `g.user_email`.
- Must be applied **after** `@require_auth` (because it relies on `g.user_email`).

---

## 3) Admin Routes (Verified Secure)

**File:** `backend/routes/admin_routes.py`

All admin endpoints are protected by **both** decorators in the correct order:
- `GET /api/admin/stats` → `@require_auth` then `@require_admin`
- `GET /api/admin/users` → `@require_auth` then `@require_admin`
- `GET /api/admin/feedback` → `@require_auth` then `@require_admin`
- `POST /api/admin/users/sync` → `@require_auth` then `@require_admin`

**Behavior note:** If `ADMIN_EMAILS` is not configured, admin endpoints will be effectively inaccessible (always 403 for non-admin).

---

## 4) User Routes (`/api/users/*`)

**File:** `backend/routes/user_routes.py`

### 4.1 Data healing endpoint (Verified)
- `POST /api/users/init`
  - Verifies token via `AuthService.verify_id_token`.
  - Calls `FirestoreService.ensure_user_profile(user_id, email, display_name)`.
  - Purpose: create missing Firestore profile for Auth users (e.g., Google sign-in / legacy users).

### 4.2 Debug print statements (Security risk)
`backend/routes/user_routes.py` contains `print(...)` calls that log request payload and user identifiers during profile update.

**Risk:** user PII and preferences can leak to logs.

---

## 5) Document Routes (`/api/documents/*`)

**File:** `backend/routes/document_routes.py`

### 5.1 Upload
- `POST /api/documents/upload`
  - Auth: **local** `@auth_required` decorator (defined in this file).
  - Stores doc metadata in Firestore, uploads original file to GCS, runs DUA or native text extraction depending on format.
  - Pre-generates TTS assets to GCS when content exists:
    - `tts_audio_gcs_uri`
    - `tts_timepoints_gcs_uri`

### 5.2 List + read
- `GET /api/documents` → returns list of documents for the user.
- `GET /api/documents/<id>?include_content=true` → returns doc metadata + best-available content.

### 5.3 Download (Stub)
- `GET /api/documents/<id>/download` currently returns a placeholder temp file (TODOs remain for real GCS retrieval).

### 5.4 TTS assets for documents
- `GET /api/documents/<id>/tts-assets`
  - Auth: local `@auth_required`.
  - Returns signed URLs for pre-generated assets (MP3 + timepoints JSON).

### 5.5 Duplicate auth decorator (Tech debt)
The document blueprint uses a custom `auth_required` that overlaps with the centralized `@require_auth`.

**Impact:** inconsistent `g` population (notably `g.user_email` is not set by the local decorator) and duplicated token verification logic.

---

## 6) Agent Routes (`/api/v2/agent/*`) (Direct in `backend/app.py`)

### 6.1 Chat
- `POST /api/v2/agent/chat`
  - Auth: `@require_auth`.
  - Supports JSON (text) and multipart form-data (audio).
  - Invokes the Supervisor graph and persists state via SQLite checkpointers.

### 6.2 History
- `GET /api/v2/agent/history?thread_id=...`
  - Auth: `@require_auth`.
  - Reads graph checkpoint state and returns normalized history.

---

## 7) Answer Formulation Routes (`/api/v2/answer-formulation/*`)

**File:** `backend/routes/answer_formulation_routes.py`

- `POST /api/v2/answer-formulation/refine`
  - Auth: imports and uses `auth_required` from `backend/routes/document_routes.py`.
  - Invokes `ANSWER_FORMULATION_GRAPH` and returns refined answer.
  - Optionally generates TTS via `TTS_SERVICE` and returns base64 audio + timepoints.

- `POST /api/v2/answer-formulation/edit`
  - Auth: same `auth_required` from `document_routes.py`.
  - Loads prior state from `ANSWER_FORMULATION_CHECKPOINTER` and applies edit.

**Tech debt:** Auth implementation for this feature is coupled to `document_routes.py` rather than using the centralized `@require_auth`.

---

## 8) Feedback Routes (`/api/feedback/*`)

**File:** `backend/routes/feedback_routes.py`

- `POST /api/feedback`
  - Auth: `@require_auth`.
  - Validates payload and writes feedback to Firestore.

---

## 9) STT / TTS “auxiliary” blueprints vs primary implementations

### 9.1 Realtime STT (Primary path)
- Primary realtime STT is implemented as a WebSocket route:
  - `WS /api/stt/stream` in `backend/app.py`.

### 9.2 STT REST routes
- `backend/routes/stt_routes.py` defines REST endpoints under `/api/stt/*` (e.g. `/transcribe`, `/languages`).
- They are reachable (blueprint is registered) but are separate from the realtime streaming path.

### 9.3 TTS blueprint routes
- `backend/routes/tts_routes.py` defines `/api/tts/voices` and uses a `TTSTool` from `app.config['TOOLS']`.
- **On-demand synthesis used by the frontend** is implemented in `backend/app.py` at:
  - `POST /api/tts/synthesize`

---

## 10) Security Findings (Verified)

### 10.1 Unauthenticated diagnostics endpoint (High risk)
- `GET /api/diagnostics/firestore` is defined in `backend/app.py` with **no `@require_auth`**.
- It returns environment/config information and attempts to expose credential metadata.

### 10.2 Unauthenticated WebSocket STT endpoint (High risk)
- `WS /api/stt/stream` is accessible without auth.

**Impact:** potential abuse of Google STT resources and increased operational cost.

### 10.3 Logging of sensitive data (High risk)
- Debug `print(...)` statements in `backend/routes/user_routes.py` log request payload fields.

---

## Summary

- Admin endpoints: **secure** via `@require_auth` + `@require_admin`.
- Major risks:
  - Unauthenticated `/api/diagnostics/firestore`.
  - Unauthenticated `WS /api/stt/stream`.
  - Sensitive debug prints in user profile update.
- Major tech debt:
  - Duplicate/inconsistent auth decorators (`auth_required` vs `require_auth`).
  - Mixed TTS implementations (blueprint “voices” vs app-level “synthesize”).
