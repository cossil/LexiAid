# Frontend Services Analysis

Thinking...
- Inspect `src/services/api.ts` to understand what endpoints the frontend calls and how responses are shaped.
- Capture helper behavior (Axios instance + interceptors) and each API method’s purpose, inputs, outputs.
- Note downstream consumers (pages/hooks/components) for awareness during dependency analysis.

Plan
1. Describe the shared Axios instance/interceptor setup.
2. Document each method grouping (agent chat/audio, documents, quizzes, user profile, answer formulation, TTS).
3. Highlight error handling patterns and coupling to Firebase Auth.

Execute
- Summary below covers all exported functions/objects from `src/services/api.ts`.

## Shared Axios Instance
- **Initialization**: `api = axios.create({ baseURL: VITE_BACKEND_API_URL || 'http://localhost:8000', headers: { 'Content-Type': 'application/json' } })`.
- **Interceptor**: Adds `Authorization: Bearer <Firebase ID token>` to every request by reading `auth.currentUser`. Logs errors if token retrieval fails but does not block requests (server will reject unauthenticated ones).

## Authentication Helpers
- `getAuthToken` + `apiService.getAuthToken`: Wrap Firebase’s `currentUser.getIdToken()`. Used by other methods (e.g., `uploadAudioMessage`) when a manual fetch call bypasses Axios.

## Agent / LangGraph Endpoints
- `uploadAudioMessage(formData, options?)`: Sends multipart payloads to `/api/v2/agent/chat`. Supports `sttProcessingMode` (`review` vs `direct_send`). Returns chat response + transcript for review mode. Consumers: `MicrophoneButton`, `ChatPage` audio UI.
- `chat({ query, documentId, threadId })`: POST JSON to `/api/v2/agent/chat`. Maps backend fields to frontend expectations (e.g., `final_agent_response`, `quiz_active`). Used by `ChatPage`, quiz flows.
- `cancelQuiz(threadId)`: POST (same endpoint) with `/cancel_quiz` query to end active quiz sessions. Used by `QuizContext`.

## TTS APIs
- `synthesizeText(text)`: POST to `/api/tts/synthesize`. Returns `{ audioContent, timepoints }`. Used by `useOnDemandTTSPlayer` and other TTS features.

## Document Management
- `getDocument(id)`: GET `/api/documents/:id?include_content=true`.
- `listDocuments()`: GET `/api/documents` (expects `data` array).
- `uploadDocument(file, metadata?)`: POST multipart form to `/api/documents` (server handles naming). Used by `DocumentUpload`.
- `deleteDocument(id)`: DELETE `/api/documents/:id`.
- `getTtsAssets(documentId)`: GET `/api/documents/:id/tts-assets` for pre-generated audio/timepoints.

## User Profile
- `getUserProfile()`: GET `/api/users/profile`, returns `data` object.
- `updateUserProfile(updates)`: PATCH `/api/users/profile`.

## Quiz Helpers
- `startQuiz(documentId, threadId?)`: Triggers `/api/v2/agent/chat` with “Start a quiz…” query, logging raw response for debugging.
- `continueQuiz(threadId, answer, documentId?)`: Submit quiz answers; returns `agent_response`, `quiz_completed` flags.

## Answer Formulation APIs
- `refineAnswer({ transcript, question, session_id })`: POST `/api/v2/answer-formulation/refine`.
- `editAnswer({ session_id, edit_command })`: POST `/api/v2/answer-formulation/edit`.

## Observations
1. **Mixed Fetch/Axios Usage**: `uploadAudioMessage` uses `fetch` due to multipart requirements and manual token injection; all others use Axios instance.
2. **Error Handling**: Methods log to console and either throw (Axios paths) or return `{ error }` (fetch path). Callers must surface errors to users.
3. **Thread ID Coordination**: Chat and quiz helpers expect upstream components (e.g., `ChatPage`, `QuizContext`) to persist thread IDs between calls.
4. **Auth Dependency**: All methods assume Firebase Auth is initialized before calls; during initial load, interceptor may send unauthenticated requests until `onAuthStateChanged` resolves.
