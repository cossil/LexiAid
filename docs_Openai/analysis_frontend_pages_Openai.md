# Frontend Pages Analysis

Thinking...
- Catalog the major pages under `src/pages` and understand their roles within the auditory-first learning experience.
- Identify key dependencies (contexts, hooks, services) for each page.
- Capture inputs/outputs and notable side effects (API calls, navigation, TTS/STT usage).

Plan
1. Group pages by feature (auth, dashboard/documents, chat/quiz, answer formulation, developer tools).
2. For each, summarize purpose, core logic, inputs, outputs, and dependencies.
3. Highlight shared patterns (use of contexts, API service, hooks).

Execute
- Sections below cover the most important page components currently in `src/pages`.

## Landing & Auth Pages
### `LandingPage.tsx`
- **Purpose**: Marketing-oriented entry point describing LexiAid value props; offers sign-in/up CTAs.
- **Dependencies**: Uses static imagery, accessibility-aware design, and navigation to auth routes.
- **Inputs/Outputs**: None besides navigation; no backend calls.

### `pages/auth/SignIn.tsx`, `SignUp.tsx`, `ResetPassword.tsx`
- **Purpose**: Authentication flows using Firebase Auth via `useAuth` context.
- **Dependencies**: `useAuth` exposes `signIn`, `signUp`, `resetPassword`; forms incorporate accessibility features and error messaging.
- **Inputs**: Email/password form data.
- **Outputs**: Calls Firebase Auth and redirects to `/dashboard` on success.

## Dashboard & Document Pages
### `Dashboard.tsx`
- **Purpose**: Personalized hub showing quick actions, recent documents, and progress highlights.
- **Dependencies**: `useAuth`, `useAccessibility`, `axios` + Firebase token for `/api/documents` and `/api/users/profile`.
- **Inputs**: Auth token, Firestore-backed data.
- **Outputs**: Renders TTS-enabled UI; placeholder progress data until backend endpoint is ready.

### `DocumentsList.tsx`
- **Purpose**: Lists user documents with actions (view, read, delete) and surfaces processing status.
- **Dependencies**: `apiService.listDocuments`, `useDocument` for active selection, `useAccessibility` for TTS hints.
- **Inputs**: Auth token (INTERCEPTED via axios instance), Firestore data.
- **Outputs**: Document grid with filtering and action buttons.

### `DocumentView.tsx`
- **Purpose**: Detailed document reading experience with tabs (Read, Chat, Quiz) and TTS playback.
- **Dependencies**: `useAuth` for token, `useDocument`, `useAccessibility`, hook `useTTSPlayer` for audio, `axios` to fetch `/api/documents/:id` & `/download`.
- **Inputs**: `:id` route param, query string for tab selection.
- **Outputs**: Renders content, TTS controls, navigation to chat/quiz pages.

### `DocumentUpload.tsx`
- **Purpose**: Upload wizard with drag-and-drop, validations, and progress meter.
- **Dependencies**: `useAuth` for token, direct `axios.post` to `/api/documents/upload`, `useAccessibility` for UI TTS.
- **Inputs**: File uploads + metadata, optional naming.
- **Outputs**: Progress UI, success redirect to document view.

## Conversational & Quiz Pages
### `ChatPage.tsx`
- **Purpose**: Full chat and audio upload interface leveraging `GeminiChatInterface` component.
- **Dependencies**: `useAccessibility`, `apiService.chat`, `apiService.uploadAudioMessage`, `GeminiChatInterface`, `toast` notifications.
- **Inputs**: Text messages, audio blobs, document query params for context.
- **Outputs**: Chat transcript with quiz transitions, TTS playback data, state updates (thread IDs, quiz mode).

### `AnswerFormulationPage.tsx`
- **Purpose**: Multi-step workflow for refining spoken transcripts into polished answers.
- **Dependencies**: `useAnswerFormulation` hook (which wraps `apiService.refineAnswer`/`editAnswer`), numerous answer-formulation components, `useAuth` for preferences.
- **Inputs**: User dictation/transcripts, question prompts, edit commands.
- **Outputs**: Refined answers, fidelity scores, auto-pause settings, onboarding flows.

### `Dashboard`-embedded Quiz Entry
- `ChatPage` triggers quizzes via supervisor API; `DocumentView` links to quiz tab. Quiz-specific UI largely lives in `GeminiChatInterface` (options display, evaluation flows).

## Developer Utilities
### `pages/dev/DeprecationShowcase.tsx`
- **Purpose**: Developer-only screen (gated by `import.meta.env.DEV`) showcasing deprecated UI components for cleanup.
- **Inputs/Outputs**: Local presentation only; helps identify dead code candidates.

## Shared Patterns & Considerations
1. **Context Reliance**: Most pages require `AuthProvider`, `AccessibilityProvider`, and often `DocumentProvider` or `QuizProvider`. When creating new pages, ensure they live under `DashboardLayout` to inherit contexts.
2. **API Usage**: Pages consume `apiService` for consistent Axios config (auth headers). Direct `axios` usage (e.g., DocumentUpload) should ideally be migrated for consistency.
3. **Accessibility-first UX**: Pages frequently call `useAccessibility.speakText` on hover to support auditory learners. Any new interactive element should consider TTS cues.
4. **Stateful Hooks**: Complex pages (Chat, Answer Formulation) rely on custom hooks to abstract STT/TTS, LangGraph communication, and preference syncing, keeping components focused on layout.
