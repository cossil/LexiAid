# API & Data Models (Golden Source)

**Authority:** Verified against backend code (`backend/app.py`, `backend/routes/*`, `backend/services/*`) and Firestore rules (`firestore.rules`) (Dec 23, 2025)

This document captures:
- The **authoritative API surface** (reachable routes)
- The **authoritative Firestore schema** (collections + fields that the backend actually reads/writes)
- The **ownership model** (what the backend enforces vs what the frontend assumes)

---

## 1) Schema Ownership (What is authoritative)

- **Backend is the schema authority** for:
  - Firestore user profiles: defaults + enforcement (`FirestoreService.create_user`, `ensure_user_profile`)
  - Firestore documents metadata and processing fields (`document_routes.py`)
  - Feedback persistence (`FirestoreService.save_feedback`)

- **Frontend is not the schema authority** for documents:
  - The frontend obtains documents via REST (`GET /api/documents`, `GET /api/documents/:id`), not direct Firestore SDK reads.

- **Important exception (shared ownership):**
  - The frontend reads and writes `users/{uid}` preferences via backend endpoints, but the backend enforces defaults and shape.

---

## 2) Firestore Data Model (Verified from backend writes/reads)

### 2.1 Global note: Firestore security rules
`firestore.rules` currently allows **any authenticated user** to read/write **any document**:

```txt
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

**Implication:** The backend API’s ownership checks are not sufficient to protect Firestore data if clients can access Firestore directly. This is a major security risk.

### 2.2 Collection: `users`
- **Path:** `users/{userId}` (root-level collection)
- **Primary writers:** backend (`FirestoreService.create_user`, `ensure_user_profile`, `update_user`, `update_user_preferences`)

**Backend-enforced defaults** (from `FirestoreService.create_user`):
- `preferences` default keys:
  - `fontSize`, `fontFamily`, `lineSpacing`, `wordSpacing`, `textColor`, `backgroundColor`, `highContrast`
  - `uiTtsEnabled`, `ttsVoice`, `ttsSpeed`, `ttsPitch`
- `gamification` default keys:
  - `points`, `streak`, `level`, `badges`
- Timestamps:
  - `createdAt`, `lastLogin` (Python `datetime`)

### 2.3 Collection: `documents`
- **Path:** `documents/{docId}` (root-level collection; NOT nested under users)
- **Primary writers:** backend (`document_routes.py` → `FirestoreService.save_document`, `update_document`)

**Observed fields written/used by backend** (non-exhaustive, but evidence-backed):
- Identity / ownership:
  - `id` (uuid / document id)
  - `user_id` (sometimes legacy `userId` exists; `FirestoreService.get_user_documents` queries both)
- Metadata:
  - `name`
  - `original_filename`
  - `file_type`
  - `content_length`
- Storage:
  - `gcs_uri` (GCS URI of original upload)
- Processing:
  - `status` (e.g., `uploading`, `uploaded`, `processing_dua`, `processed_dua`, etc.)
  - `dua_narrative_content`
  - `ocr_text_content` (legacy / deprecated path)
  - `processing_error`
- TTS pre-generation:
  - `tts_audio_gcs_uri`
  - `tts_timepoints_gcs_uri`
- Timestamps:
  - `created_at`, `updated_at` (stored as ISO strings by `document_routes.py`)

**Known internal inconsistency:** `FirestoreService.save_document` sets a separate `processing_status` field defaulting to `'completed'`, while the rest of the code relies primarily on `status`. Treat `status` as the primary workflow field.

### 2.4 Collection: `document_contents`
- **Path:** `document_contents/{docId}` (root-level collection)
- **Purpose:** Store larger content separately to avoid Firestore document size limits.
- **Writer:** backend (`FirestoreService.save_document_content`)
- **Reader:** backend (`FirestoreService.get_document_content_from_subcollection`), used as a fallback in `DocumentRetrievalService`.

### 2.5 Collection: `feedback_reports`
- **Path:** `feedback_reports/{feedbackId}` (root-level collection)
- **Writer:** backend (`FirestoreService.save_feedback`)
- **Fields (backend enforced):**
  - `user_id`, `email`, `type`, `description`, `browser_info`, `status`, `created_at`

---

## 3) Database / Environment “Schema Truth” Notes

### 3.1 Firestore database name selection mismatch risk
- **Backend** (`FirestoreService._initialize`) reads:
  - `GCP_PROJECT_ID`
  - `FIRESTORE_DATABASE_NAME`
  - If `FIRESTORE_DATABASE_NAME` is `'default'` or `'(default)'`, it **overrides** to `ai-tutor-dev-457802`.

- **Frontend** (`src/firebase/config.ts`) initializes Firestore using:
  - `VITE_FIREBASE_DATABASE_NAME || 'default'`

**Risk:** Backend and frontend can silently point at different named Firestore databases if environment variables diverge.

### 3.2 Admin allowlist source of truth
- **Backend authority:** `ADMIN_EMAILS` env var consumed by `backend/decorators/admin_auth.py`.
- **Frontend:** `src/config/admin.ts` is explicitly UX-only.

---

## 4) Backend API Surface (Verified reachable endpoints)

### 4.1 Direct routes in `backend/app.py`
- `GET /api/health` (no auth)
- `POST /api/v2/agent/chat` (auth: `@require_auth`)
- `GET /api/v2/agent/history` (auth: `@require_auth`)
- `POST /api/tts/synthesize` (auth: `@require_auth`)
- `GET /api/diagnostics/firestore` (**no auth; security risk**)
- `WS /api/stt/stream` (**no auth; resource-abuse risk**)

### 4.2 `documents` API (`backend/routes/document_routes.py`)
- `POST /api/documents/upload` (auth: local `auth_required`)
- `GET /api/documents` (auth: local `auth_required`)
- `GET /api/documents/{id}?include_content=true|false` (auth: local `auth_required`)
- `DELETE /api/documents/{id}` (auth: local `auth_required`)
- `GET /api/documents/{id}/tts-assets` (auth: local `auth_required`)
- `GET /api/documents/{id}/download` (uses `_get_user_from_token`; currently stub placeholder)

### 4.3 `users` API (`backend/routes/user_routes.py`)
- `POST /api/users` (no auth; creates Auth user then Firestore user profile)
- `DELETE /api/users` (auth via token verify inside handler)
- `POST /api/users/init` (auth via token verify inside handler; calls `ensure_user_profile`)
- `GET /api/users/profile` (auth via token verify inside handler)
- `PUT /api/users/profile` (auth via token verify inside handler)
- `POST /api/users/verify-email` (auth via token verify inside handler)

### 4.4 Answer formulation (`backend/routes/answer_formulation_routes.py`)
- `POST /api/v2/answer-formulation/refine` (auth: `auth_required` imported from `document_routes.py`)
- `POST /api/v2/answer-formulation/edit` (auth: `auth_required` imported from `document_routes.py`)

### 4.5 Feedback (`backend/routes/feedback_routes.py`)
- `POST /api/feedback` (auth: `@require_auth`)

### 4.6 Admin (`backend/routes/admin_routes.py`)
All require both:
- `@require_auth` then `@require_admin`

Endpoints:
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `GET /api/admin/feedback`
- `POST /api/admin/users/sync`

### 4.7 Registered but functionally incomplete / legacy paths
These blueprints are registered, but depend on `app.config['TOOLS']` entries that are **not initialized** in `backend/app.py`:
- `GET /api/tts/voices` (`backend/routes/tts_routes.py` expects `TOOLS['TTSTool']`)
- `/api/stt/transcribe`, `/api/stt/languages` (`backend/routes/stt_routes.py` expects `TOOLS['STTTool']`)

`/api/progress` is currently a placeholder response.

---

## 5) Request/Response Contracts (Evidence-backed highlights)

### 5.1 `POST /api/tts/synthesize`
- **Request JSON:** `{ text, voice_name?, speaking_rate?, pitch? }`
- **Response JSON:** `{ audio_content: <base64 mp3>, timepoints: [...] }`

### 5.2 `GET /api/documents/{id}/tts-assets`
- **Response JSON:** `{ audio_url: string, timepoints_url: string }`

### 5.3 `POST /api/v2/agent/chat`
- Supports JSON and multipart (audio).
- Returns a structured object including `final_agent_response` and quiz state fields.

---

## 6) Known Data/Contract Risks (Verified)

- **Firestore global rules are overly permissive** for authenticated users.
- **Unauthenticated resource endpoints:**
  - `GET /api/diagnostics/firestore`
  - `WS /api/stt/stream`
- **Field naming drift in Firestore documents:** `userId` vs `user_id`.
- **Status naming drift:** `processing_status` exists but primary control flow uses `status`.
- **Quiz snippet permission gap:** `DocumentRetrievalService.get_document_content_for_quiz(..., user_id=None)` explicitly does not enforce ownership.
