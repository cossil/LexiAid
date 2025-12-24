# Active Dependency Graph (Golden Source)

**Authority:** Verified against live code in `src/` and `backend/` (Dec 23, 2025)

This document describes the **active** (reachable) dependency graph starting from the real entry points:
- **Frontend entry:** `src/main.tsx` → `src/App.tsx`
- **Backend entry:** `backend/app.py` (Flask app + blueprint registrations)

---

## 1) Frontend Dependency Tree (Active)

### Entry Point
- `src/main.tsx` renders `<App />`.

### Router + Providers
- `src/App.tsx`
  - **Global providers**
    - `AuthProvider` (`src/contexts/AuthContext.tsx`)
    - `AccessibilityProvider` (`src/contexts/AccessibilityContext.tsx`)
  - **Protected dashboard subtree**
    - `DocumentProvider` (`src/contexts/DocumentContext.tsx`)
    - `QuizProvider` (`src/contexts/QuizContext.tsx`)
  - **Dev-only route (development builds only)**
    - `/dev/deprecation-showcase` → lazy `src/pages/dev/DeprecationShowcase`

### Active Routes (from `src/App.tsx`)

#### Public
- `/` → `src/pages/LandingPage.tsx`
- `/about` → `src/pages/public/About.tsx`
- `/privacy` → `src/pages/public/Privacy.tsx`
- `/terms` → `src/pages/public/Terms.tsx`

#### Auth (wrapped in `PublicLayout`)
- `/auth/signin` → `src/pages/auth/SignIn.tsx`
- `/auth/signup` → `src/pages/auth/SignUp.tsx`
- `/auth/reset-password` → `src/pages/auth/ResetPassword.tsx`

#### Dashboard (wrapped in `ProtectedRoute` + `DashboardLayout`)
- `/dashboard` (index) → `src/pages/Dashboard.tsx`
- `/dashboard/upload` → `src/pages/DocumentUpload.tsx`
- `/dashboard/documents` → `src/pages/DocumentsList.tsx`
- `/dashboard/documents/:id` → `src/pages/DocumentView.tsx`
- `/dashboard/chat` → `src/pages/ChatPage.tsx`
- `/dashboard/answer-formulation` → `src/pages/AnswerFormulationPage.tsx`
- `/dashboard/feedback` → `src/pages/DashboardFeedback.tsx`
- `/dashboard/settings` → `src/pages/Settings.tsx`
- `/dashboard/admin` → `src/pages/admin/AdminDashboard.tsx`

### Frontend “service layer” / API calls
- `src/services/api.ts`
  - Axios baseURL: `import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000'`
  - Adds Firebase ID token via `Authorization: Bearer <idToken>` in a request interceptor.

### Frontend “feature hooks”
- **TTS playback:** `src/hooks/useTTSPlayer.ts`
  - Prefers **pre-generated** assets via `GET /api/documents/:id/tts-assets`.
  - Falls back to **on-demand** synthesis via `POST /api/tts/synthesize`.
- **Realtime STT:** `src/hooks/useRealtimeStt.ts`
  - WebSocket to `.../api/stt/stream`.

---

## 2) Backend Dependency Tree (Active)

### Entry Point
- `backend/app.py`

### Registered Blueprints (Active)
Registered in `backend/app.py`:
- `/api/documents/*` → `backend/routes/document_routes.py` (`document_bp`)
- `/api/tts/*` → `backend/routes/tts_routes.py` (`tts_bp`)
- `/api/stt/*` → `backend/routes/stt_routes.py` (`stt_bp`)
- `/api/users/*` → `backend/routes/user_routes.py` (`user_bp`)
- `/api/progress/*` → `backend/routes/progress_routes.py` (`progress_bp`)
- `/api/v2/answer-formulation/*` → `backend/routes/answer_formulation_routes.py` (`answer_formulation_bp`)
- `/api/feedback/*` → `backend/routes/feedback_routes.py` (`feedback_bp`)
- `/api/admin/*` → `backend/routes/admin_routes.py` (`admin_bp`)

### Direct (non-blueprint) routes in `backend/app.py`
- `POST /api/v2/agent/chat` (protected by `@require_auth`) → supervisor-based agent orchestration
- `GET /api/v2/agent/history` (protected by `@require_auth`) → reads supervisor checkpoint state
- `POST /api/tts/synthesize` (protected by `@require_auth`) → on-demand MP3 synthesis (base64) + timepoints
- `GET /api/health`

### WebSocket routes
- `WS /api/stt/stream` (implemented directly in `backend/app.py` via `flask_sock`)

### Authentication / authorization
- Primary decorator: `backend/decorators/auth.py` → `require_auth`
- Admin gating: `backend/decorators/__init__.py` exports `require_admin` (used by `backend/routes/admin_routes.py`)
- Note: `backend/routes/document_routes.py` also implements its own `auth_required` decorator (Firebase token verification via `AUTH_SERVICE`).

### Services initialized at app startup
In `backend/app.py`, `app.config['SERVICES']` is populated with:
- `AuthService`
- `FirestoreService`
- `StorageService`
- `DocAIService`
- `TTSService`
- `STTService`
- `DocumentRetrievalService` (stored under key `DocRetrievalService`)

### Graphs / Agent systems
- Supervisor orchestration
  - `backend/graphs/supervisor/*` (compiled in `backend/app.py`)
  - Drives `POST /api/v2/agent/chat`
- New chat graph
  - `backend/graphs/new_chat_graph.py` (compiled in `backend/app.py`)
  - Uses `DocumentRetrievalService` to fetch document content for RAG
- Quiz engine graph
  - `backend/graphs/quiz_engine_graph.py` (compiled in `backend/app.py`)
- Answer formulation graph
  - `backend/graphs/answer_formulation/graph.py` (compiled in `backend/app.py`)
  - Driven by blueprint routes `POST /api/v2/answer-formulation/refine` and `POST /api/v2/answer-formulation/edit`
- Document Understanding Agent (DUA)
  - `backend/graphs/document_understanding_agent/graph.py`
  - Invoked from `backend/routes/document_routes.py` on upload for eligible formats

---

## 3) Core User Flows (Verified)

### A) Document Upload & Processing

#### Frontend
- Route: `/dashboard/upload` → `src/pages/DocumentUpload.tsx`
- Upload request:
  - `POST {VITE_BACKEND_API_URL || http://localhost:8081}/api/documents/upload`
  - Headers: `Authorization: Bearer <Firebase ID token>`
  - Body: multipart form-data (`file`, `name`)

#### Backend
- Route: `POST /api/documents/upload` → `backend/routes/document_routes.py::upload_document`
  - Creates Firestore document metadata (initial status).
  - Uploads original file to GCS (via `StorageService`).
  - For eligible formats:
    - **DUA**: runs `run_dua_processing_for_document(...)` and writes `dua_narrative_content`.
    - **Native text extract**: for `docx/txt/md`, stores extracted text in `dua_narrative_content`.
  - **Pre-generates TTS assets** for substantial extracted content:
    - uploads `tts_audio_gcs_uri` (MP3)
    - uploads `tts_timepoints_gcs_uri` (JSON)

### B) Document View + Read Aloud (TTS)

#### Frontend
- Route: `/dashboard/documents/:id` → `src/pages/DocumentView.tsx`
- Loads content:
  - `GET {VITE_BACKEND_API_URL || http://localhost:8081}/api/documents/:id?include_content=true`
- Read aloud:
  - Uses `src/hooks/useTTSPlayer.ts`
  - Primary: `GET /api/documents/:id/tts-assets`
  - Fallback: `POST /api/tts/synthesize` with `{ text }`

#### Backend
- `GET /api/documents/<id>/tts-assets` → `backend/routes/document_routes.py::get_tts_assets`
  - Returns signed URLs: `{ audio_url, timepoints_url }` for assets stored in GCS.
- `POST /api/tts/synthesize` → `backend/app.py::tts_synthesize_route`
  - Returns `{ audio_content: <base64 mp3>, timepoints: [...] }`

### C) Chat (and Quiz)

#### Frontend
- Route: `/dashboard/chat` → `src/pages/ChatPage.tsx`
- Text chat:
  - `apiService.chat(...)` → `POST /api/v2/agent/chat`
- History restore:
  - `apiService.getChatHistory(threadId)` → `GET /api/v2/agent/history?thread_id=...`
- Quiz start:
  - Sends `query: '/start_quiz', mode: 'quiz', documentId: <id>`

#### Backend
- `POST /api/v2/agent/chat` → `backend/app.py::agent_chat_route`
  - Uses `compiled_supervisor_graph.invoke(...)` (wrapped by `safe_supervisor_invoke`).
  - Persists state via LangGraph Sqlite checkpointers (see `DatabaseManager` in `backend/app.py`).
- `GET /api/v2/agent/history` → `backend/app.py::get_chat_history_route`
  - Reads supervisor state and returns normalized message history.

### D) Answer Formulation

#### Frontend
- Route: `/dashboard/answer-formulation` → `src/pages/AnswerFormulationPage.tsx`
- Calls:
  - `POST /api/v2/answer-formulation/refine`
  - `POST /api/v2/answer-formulation/edit`
- Dictation:
  - Uses `useRealtimeStt` → `WS /api/stt/stream`

#### Backend
- `POST /api/v2/answer-formulation/refine` → `backend/routes/answer_formulation_routes.py::refine_answer`
  - Invokes `ANSWER_FORMULATION_GRAPH` and returns refined answer + TTS (base64) when available.
- `POST /api/v2/answer-formulation/edit` → `backend/routes/answer_formulation_routes.py::edit_answer`
  - Loads session state from `ANSWER_FORMULATION_CHECKPOINTER`, applies edit via graph, returns updated answer + TTS.

### E) Feedback + Admin

#### Feedback
- Frontend: `/dashboard/feedback` → `src/pages/DashboardFeedback.tsx`
- Backend: `POST /api/feedback` → `backend/routes/feedback_routes.py::submit_feedback` (requires auth)

#### Admin
- Frontend: `/dashboard/admin` → `src/pages/admin/AdminDashboard.tsx`
- Backend:
  - `GET /api/admin/stats`
  - `GET /api/admin/users`
  - `GET /api/admin/feedback`
  - `POST /api/admin/users/sync`
  - All protected by `@require_auth` + `@require_admin`

### F) Realtime STT Streaming

#### Frontend
- `src/hooks/useRealtimeStt.ts` connects to `WS /api/stt/stream`.

#### Backend
- `backend/app.py::stt_stream` uses Google Cloud Speech streaming and sends JSON frames:
  - `{ is_final, transcript, stability }`

---

## 4) Known Mismatches / Risks (Verified)

- **Document upload response shape mismatch (frontend vs backend):**
  - Backend upload returns `{"document_id": ..., "name": ..., ...}` (see `backend/routes/document_routes.py`).
  - Frontend `DocumentUpload.tsx` currently navigates using `response.data.document.id`, which does **not** match the backend response shape.
  - This is a functional risk: upload may succeed but navigation may fail.

- **Multiple baseURL defaults across the frontend:**
  - `src/services/api.ts` defaults to `http://localhost:8000`.
  - `DocumentUpload.tsx` and `DocumentView.tsx` default to `http://localhost:8081`.
  - If `VITE_BACKEND_API_URL` isn’t consistent, different pages may hit different ports.
