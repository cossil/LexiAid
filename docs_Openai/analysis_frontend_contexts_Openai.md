# Frontend Contexts Analysis

Thinking...
- Review React context providers in `src/contexts` (Auth, Accessibility, Document, Quiz) to understand state they expose and how they integrate with services/hooks.
- Note inputs (Firebase auth, Firestore prefs), outputs (context values), and side effects (API calls, TTS playback).
- Highlight assumptions components must satisfy before consuming these contexts.

Plan
1. Summarize each context: purpose, key values/actions, dependencies.
2. Capture initialization flows (e.g., `AuthProvider` loading preferences) and how contexts interact with services.
3. Document cross-context interactions (Accessibility uses Auth preferences, Document/Quiz contexts rely on dashboard usage).

Execute
- Sections below cover the major context providers in `src/contexts`.

## `AuthContext.tsx`
- **Purpose**: Centralizes Firebase Auth state and user preference persistence.
- **Key Values**: `currentUser`, `userPreferences` (with defaults for fonts, colors, UI TTS, answer formulation settings), `loading` flag.
- **Actions**: `signIn`, `signUp`, `signOut`, `signInWithGoogle`, `resetPassword`, `updateUserPreferences`, `getAuthToken`.
- **Inputs**: Firebase Auth SDK, Firestore (`setDoc`, `getDoc`), `firebase/config`.
- **Outputs/Side Effects**: Maintains real-time auth state via `onAuthStateChanged`, writes preferences/gamification to Firestore, ensures `lastLogin` timestamp updates asynchronously.
- **Consumers**: All pages needing auth gating, `apiService` interceptor (indirectly), contexts like Accessibility (for preference persistence).

## `AccessibilityContext.tsx`
- **Purpose**: Provides UI text-to-speech toggles, TTS delay controls, high contrast mode, font/spacing customization, and long-text speech helpers.
- **Key Values**: `uiTtsEnabled`, `highContrast`, `fontSize`, `fontFamily`, `lineSpacing`, `wordSpacing`, `cloudTtsEnabled`, `ttsDelay`, `isSpeaking`, `ttsLoading`, `audioProgress`.
- **Actions**: `toggleUiTts`, `toggleHighContrast`, `toggleCloudTts`, `setFontSize`, `setFontFamily`, `setLineSpacing`, `setWordSpacing`, `setTtsDelay`, `speakText`, `speakLongText`, `cancelSpeech`.
- **Inputs**: `useAuth` (for `userPreferences`, `updateUserPreferences`), `synthesizeSpeech` utility, `axios` for cloud TTS fallback.
- **Outputs/Side Effects**: Persists preferences via Auth context, manages `<audio>` elements for on-hover speech, enforces autoplay gating by deferring playback until allowed.
- **Consumers**: Dashboard layout (toggle buttons), almost every page (for `speakText` on hover).

## `DocumentContext.tsx`
- **Purpose**: Minimal context storing the currently active document ID so nested routes/components can coordinate.
- **Values**: `activeDocumentId`, `setActiveDocumentId`.
- **Consumers**: `DashboardLayout` (navigation helpers), `DocumentView`, `ChatPage`, quiz triggers.

## `QuizContext.tsx`
- **Purpose**: Track active quiz session thread IDs and handle cancellation.
- **Values**: `quizThreadId`, `isCancelling`.
- **Actions**: `startQuizSession(threadId)`, `cancelQuizSession()` (calls `apiService.cancelQuiz` and shows toast feedback).
- **Inputs**: `apiService`, `react-hot-toast` for notifications.
- **Consumers**: `DashboardLayout` (prevents navigation while canceling), chat/quiz UI to ensure a single active session per user.

## Cross-context Considerations
1. **Provider Order**: `App.tsx` wraps everything with `AuthProvider` → `AccessibilityProvider` → `DocumentProvider` → `QuizProvider` (inside `DashboardLayout`). Consuming components must sit beneath these providers.
2. **Preference Syncing**: Accessibility context writes to user preferences via Auth context; avoid circular dependencies by keeping logic unidirectional (Accessibility depends on Auth, not vice versa).
3. **Global Audio State**: Accessibility context manages global TTS playback; localized hooks (e.g., `useOnDemandTTSPlayer`) should coordinate to avoid overlapping audio and respect the interaction gateway.
