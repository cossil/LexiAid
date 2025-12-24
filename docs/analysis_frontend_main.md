# Frontend Main Analysis – Golden Source

> **Synthesized**: 2024-01-10  
> **Sources**: docs_Comp, docs2, docsGPT52, docsopus45thinking2  
> **Verified Against**: Actual codebase (`src/`)

---

## 1. Entry Point & Bootstrap

| File | Purpose |
|------|---------|
| `src/main.tsx` | React 18 root render via `createRoot`, mounts `<App />` into `#root` |
| `src/App.tsx` | Top-level component: global providers, routing, auth guards |

### Provider Hierarchy (verified)

```
<AuthProvider>
  <AccessibilityProvider>
    <Toaster />
    <BrowserRouter>
      <Routes>
        ...
      </Routes>
    </BrowserRouter>
  </AccessibilityProvider>
</AuthProvider>
```

**Key observations:**
- `AuthProvider` wraps everything; children only render after `loading` is false
- `AccessibilityProvider` depends on `useAuth()` for user preferences
- `DocumentProvider` and `QuizProvider` are scoped to `DashboardLayout`, not global

---

## 2. Routing Structure

### Public Routes
| Path | Component | Notes |
|------|-----------|-------|
| `/` | `LandingPage` | Marketing/home page |
| `/login` | `LoginPage` | Firebase Auth email/password + Google |
| `/signup` | `SignupPage` | Server-first signup via backend API |
| `/forgot-password` | `ForgotPasswordPage` | Firebase `sendPasswordResetEmail` |

### Protected Routes (wrapped in `ProtectedRoute`)
| Path | Component | Layout |
|------|-----------|--------|
| `/dashboard` | `Dashboard` | `DashboardLayout` |
| `/dashboard/documents` | `DocumentsList` | `DashboardLayout` |
| `/dashboard/documents/:id` | `DocumentView` | `DashboardLayout` |
| `/dashboard/upload` | `DocumentUpload` | `DashboardLayout` |
| `/dashboard/chat` | `ChatPage` | `DashboardLayout` |
| `/dashboard/settings` | `SettingsPage` | `DashboardLayout` |
| `/dashboard/answer-formulation` | `AnswerFormulationPage` | `DashboardLayout` |
| `/dashboard/feedback` | `FeedbackPage` | `DashboardLayout` |
| `/dashboard/admin` | `AdminDashboard` | `DashboardLayout` |

### Dev-Only Routes
| Path | Component | Condition |
|------|-----------|-----------|
| `/dev/audio-review` | `AudioReview` | `import.meta.env.DEV` |

---

## 3. Authentication Flow

### `ProtectedRoute` Component
- Checks `currentUser` from `useAuth()`
- If `loading` is true → shows spinner
- If no user → redirects to `/login` with `state.from` for return navigation
- If authenticated → renders children

### Auth Context Behavior
1. **Sign Up (Server-First)**:
   - Calls `apiService.createUser()` to backend
   - Signs in temporarily to send verification email
   - Signs out immediately; user must verify before access

2. **Sign In**:
   - Firebase `signInWithEmailAndPassword`
   - Checks `emailVerified`; if false, signs out and throws error
   - Calls `apiService.initializeUser()` to ensure backend profile exists

3. **Google Sign-In**:
   - Firebase popup flow
   - Calls `apiService.initializeUser()` after success

4. **Token Management**:
   - `getAuthToken(forceRefresh?: boolean)` exposed via context
   - Used by API service and TTS utilities

---

## 4. Global State Management

### Context Providers

| Context | Scope | Key State |
|---------|-------|-----------|
| `AuthContext` | Global | `currentUser`, `userPreferences`, `loading`, auth methods |
| `AccessibilityContext` | Global | TTS settings, high contrast, font settings, `speakText()` |
| `DocumentContext` | Dashboard | `activeDocumentId` |
| `QuizContext` | Dashboard | `quizThreadId`, `startQuizSession()`, `cancelQuizSession()` |

### User Preferences (from AuthContext)
```typescript
interface UserPreferences {
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  wordSpacing: number;
  textColor: string;
  backgroundColor: string;
  highContrast: boolean;
  uiTtsEnabled: boolean;
  ttsVoice: string;
  ttsSpeed: number;
  ttsPitch: number;
  cloudTtsEnabled: boolean;
  cloudTtsVoice: string;
  ttsDelay?: number;
  // Answer Formulation specific
  answerFormulationAutoPause?: boolean;
  answerFormulationPauseDuration?: number;
  answerFormulationSessionsCompleted?: number;
  answerFormulationAutoPauseSuggestionDismissed?: boolean;
  answerFormulationOnboardingCompleted?: boolean;
}
```

---

## 5. API Communication

### Primary API Service (`src/services/api.ts`)
- Axios instance with base URL from `VITE_BACKEND_API_URL` (default: `http://localhost:8000`)
- Request interceptor injects `Authorization: Bearer <token>` from Firebase
- Methods for: chat, documents, TTS, users, admin, feedback

### Direct Axios Usage (Tech Debt)
Some pages bypass `apiService` and use `axios` directly:
- `Dashboard.tsx` – document list, user profile
- `DocumentsList.tsx` – document list, delete
- `DocumentUpload.tsx` – upload endpoint
- `DocumentView.tsx` – document content

**Risk**: Inconsistent error handling, potential auth token issues

### TTS Utilities (`src/utils/ttsUtils.ts`)
- `synthesizeSpeech()` – calls `/api/tts` with auth token
- `getAvailableVoices()` – calls `/api/tts/voices`
- `playAudioFromBase64()` – creates `HTMLAudioElement` from base64

---

## 6. User Interaction Gateway

### Audio Autoplay Policy Handling
`App.tsx` includes a `UserInteractionGateway` component that:
1. Listens for first user interaction (click/keydown/touchstart)
2. Initializes `AudioContext` and browser speech synthesis
3. Prevents audio playback errors from browser autoplay policies

---

## 7. Build & Environment

### Vite Configuration
- React plugin with SWC
- Path alias: `@` → `src/`
- Dev server on port 5173

### Environment Variables (Frontend)
| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_BACKEND_API_URL` | Backend API base URL | `http://localhost:8000` |
| `VITE_FIREBASE_*` | Firebase config (apiKey, authDomain, etc.) | Required |
| `VITE_FIREBASE_DATABASE_NAME` | Firestore database name | - |

---

## 8. Styling & UI

- **TailwindCSS** for utility classes
- **CSS Modules** for component-specific styles (e.g., `GeminiChatInterface.module.css`)
- **Lucide React** for icons
- **High Contrast Mode**: toggled via `AccessibilityContext`, applies `high-contrast` class to `<html>`

---

## 9. Notable Technical Debt

1. **Inconsistent API URL Defaults**: Some files default to `8000`, others to `8081`
2. **Direct Axios Usage**: Bypasses centralized error handling
3. **Console Logging**: Extensive debug logs in production code
4. **Duplicate Auth Logic**: `document_routes.py` has local `auth_required` decorator

---

## 10. Dependency Summary

### Core Dependencies
- React 18 + React Router DOM 6
- Firebase (Auth, Firestore)
- Axios
- TailwindCSS
- Lucide React
- React Hot Toast
- React Markdown

### Dev Dependencies
- Vite + SWC
- TypeScript
- ESLint
- PostCSS + Autoprefixer
