# Active Dependency Graph

Thinking...
- Trace end-user journeys (Chat, Quiz, Document Upload/View, Answer Formulation, Profile/Settings) from React routes down to backend services and LangGraph agents.
- Use `src/App.tsx` to enumerate active pages, then follow each page’s major components/hooks to the API calls in `src/services/api.ts`.
- Map backend entrypoints (Flask routes) to services/graphs to complete the stack.

Plan
1. Identify routed pages from `App.tsx` and group them into major features.
2. For each feature, list frontend components/hooks → `apiService` methods → backend routes → services/graphs.
3. Highlight shared infrastructure (AuthProvider, AccessibilityProvider, Supervisor graph) that participates across flows.

Execute
- The sections below provide indented flow diagrams for each major feature.

## 1. Chat & Quiz Flow
- `AppRoutes` → `/dashboard/chat` renders `ChatPage` inside `DashboardLayout` @src/App.tsx#113-170 @src/pages/ChatPage.tsx#1-305
  - `ChatPage` leverages `GeminiChatInterface`, `MicrophoneButton`, `useAccessibility`
  - API calls via `apiService.chat` (text) and `apiService.uploadAudioMessage` (audio) @src/services/api.ts#59-147
- Backend
  - Both API methods hit `POST /api/v2/agent/chat` in `backend/app.py` @backend/app.py#411-715
    - `require_auth` validates Firebase token
    - Request packaged into `SupervisorState` and passed to `compiled_supervisor_graph`
      - `receive_user_input_node` handles STT, document detection, quiz triggers @backend/graphs/supervisor/nodes_routing.py#24-149
      - `routing_decision_node` may start/cancel Quiz V2 using `DocumentRetrievalService` @backend/graphs/supervisor/nodes_routing.py#151-249
      - Depending on state:
        - `invoke_new_chat_graph_node` → `new_chat_graph` (document-grounded Gemini calls) @backend/graphs/supervisor/nodes_invokers.py#16-110 @backend/graphs/new_chat_graph.py#1-142
        - `invoke_quiz_engine_graph_node` → `quiz_engine_graph` (LLM-generated MCQs) @backend/graphs/quiz_engine_graph.py#1-287
    - Response enriched with TTS audio via `TTSService` before returning to frontend @backend/app.py#671-708
- Result flows back to `GeminiChatInterface` which updates message list, TTS playback, and quiz UI.

## 2. Document Upload & Processing Flow
- `/dashboard/upload` renders `DocumentUpload` page @src/App.tsx#135-167 @src/pages/DocumentUpload.tsx#1-400
  - Collects file/name, displays drag-drop UI, and posts to backend using raw `axios.post` to `/api/documents/upload` (URL built from env). @src/pages/DocumentUpload.tsx#147-205
- Backend route `POST /api/documents/upload` lives in `document_routes.py` @backend/routes/document_routes.py#102-320
  - Auth via `@auth_required`
  - Steps: save Firestore metadata, upload to GCS via `StorageService`, trigger Document Understanding Agent (`run_dua_processing_for_document`), pre-generate TTS assets via `TTSService`, update Firestore statuses, set errors when OCR not supported.
- Firestore and Storage state is later consumed by other features (document list/view, chat grounding).

## 3. Document Reading & TTS Flow
- `/dashboard/documents` → `DocumentsList` fetches documents via `apiService.listDocuments` (GET `/api/documents`) @src/pages/DocumentsList.tsx#1-200 @src/services/api.ts#184-196
- `/dashboard/documents/:id` → `DocumentView` loads full content (`apiService.getDocument`, GET `/api/documents/:id?include_content=true`) and pre-generated TTS assets when available @src/pages/DocumentView.tsx#1-267
  - Uses `useTTSPlayer` + `SpeakableDocumentContent` for synchronized playback, `useAccessibility` for UI-level speech cues.
- Backend reads Firestore via `FirestoreService` (document metadata) and `StorageService` (tts_assets) referenced in `document_routes.py` @backend/routes/document_routes.py#380-399

## 4. Answer Formulation Flow
- `/dashboard/answer-formulation` → `AnswerFormulationPage` orchestrates multi-panel workflow using `useAnswerFormulation` hook @src/pages/AnswerFormulationPage.tsx#1-200 @src/hooks/useAnswerFormulation.ts#1-200
  - Hook coordinates dictation via `useRealtimeStt`, manages auto-pause, and calls `apiService.refineAnswer` / `apiService.editAnswer`.
- Backend routes: `POST /api/v2/answer-formulation/refine` and `/edit` in `answer_formulation_routes.py` @backend/routes/answer_formulation_routes.py#1-268
  - Auth enforced via shared decorator
  - Each request invokes `create_answer_formulation_graph` (LangGraph) which validates inputs, refines via Gemini, applies edits, and optionally samples fidelity metrics @backend/graphs/answer_formulation/graph.py#31-397
  - Results piped through `TTSService` for immediate audio playback.

## 5. User Preferences, Accessibility, and Settings
- Providers loaded in `App.tsx` wrap entire tree: `AuthProvider`, `AccessibilityProvider`, `DocumentProvider`, `QuizProvider` (@src/App.tsx#174-198)
  - `AuthProvider` retrieves Firebase user and Firestore profile, exposing `getAuthToken` used by `apiService` @src/contexts/AuthContext.tsx#85-294
  - `AccessibilityProvider` reads/writes preferences through `useAuth.updateUserPreferences`, synthesizes hover speech via `ttsUtils` @src/contexts/AccessibilityContext.tsx#1-200
- Dashboard and settings pages use these contexts to toggle high contrast, UI TTS, etc. `Dashboard.tsx` fetches `/api/users/profile` via Axios to hydrate profile cards @src/pages/Dashboard.tsx#58-166 @src/services/api.ts#243-252
- Backend `/api/users/profile` handled by `user_routes.py`, combining Firebase Auth data with Firestore preferences @backend/routes/user_routes.py#1-73

## 6. Streaming STT Flow
- `GeminiChatInterface` → `useRealtimeStt` opens WebSocket `ws(s)://<backend>/api/stt/stream` @src/hooks/useRealtimeStt.ts#23-118
- Backend WebSocket endpoint defined in `backend/app.py` via `flask_sock` `@sock.route('/api/stt/stream')`, using `STTService` (Google Speech) to transcribe live audio and send interim/final transcripts back to client @backend/app.py#348-400

## Shared Infrastructure
- Auth: Firebase credentials from `.env`, validated in every backend route via `AuthService` and decorators.
- Services: `FirestoreService`, `StorageService`, `DocAIService`, `DocumentRetrievalService`, `TTSService`, `STTService` all instantiated during app startup @backend/app.py#105-170
- LangGraph Checkpointing: `DatabaseManager` wires `SqliteSaver` files for quizzes, supervisor, answer formulation to maintain long-running sessions @backend/app.py#232-330

These flows confirm all major directories (frontend/pages, backend/routes, backend/graphs, backend/services) participate in production pathways; no significant .py or .tsx files are orphaned per current analysis.
