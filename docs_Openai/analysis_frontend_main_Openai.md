# Frontend Main Analysis

Thinking...
- Locate the primary entry points (`main.tsx`, `App.tsx`) and understand provider composition, routing, and global state setup.
- Identify core layout components (e.g., `DashboardLayout`) that orchestrate child pages and accessibility controls.
- Note integration points with contexts (Auth, Accessibility, Document, Quiz) and any system-wide behaviors (interaction gateways, protected routes).

Plan
1. Summarize the bootstrapping files (`main.tsx`, `App.tsx`).
2. Document layout scaffolding (`DashboardLayout`) and how it connects to contexts/routes.
3. Highlight global behaviors (Auth protection, Accessibility features, interaction gating).

Execute
- The sections below describe how the frontend application initializes, structures routing, and wires shared providers.

## `src/main.tsx`
- **Purpose**: Vite/React entry. Mounts `<App />` under React 18’s `createRoot` with `<StrictMode>` and imports global CSS.
- **Inputs**: `#root` DOM element, `App.tsx`, `index.css`.
- **Side Effects**: Starts React rendering tree.

## `src/App.tsx`
- **Purpose**: Declares router, auth guards, context providers, and top-level interaction gating for audio features.
- **Key Elements**:
  - `UserInteractionGateway`: Modal overlay requiring a click/tap before enabling audio APIs (workaround for browser autoplay restrictions).
  - Provider stack: `<Router>` → `<AuthProvider>` → `<AccessibilityProvider>` → `DocumentProvider` + `QuizProvider` (scoped to dashboard routes).
  - `ProtectedRoute`: Uses `useAuth` to guard authenticated sections; renders loading spinner until Firebase auth resolves.
  - `Routes`: Public landing/auth routes, developer-only `/dev/deprecation-showcase`, and protected `/dashboard/*` subtree (Dashboard, Documents, Chat, Answer Formulation, Settings, etc.). Nested routes rely on `DashboardLayout`.
- **Inputs**: Firebase auth state, query params (e.g., `document` or `start_quiz`), `import.meta.env.DEV` flag for dev-only page.
- **Outputs**: React Router tree, gating overlay, provider contexts.

## `src/layouts/DashboardLayout.tsx`
- **Purpose**: Shared shell for the dashboard experience—top nav, accessible sidebar, quick links.
- **Key Behaviors**:
  - Integrates `useAuth`, `useAccessibility`, `useDocument`, `useQuiz` contexts for user info, TTS toggles, active document navigation, and quiz cancelation.
  - Provides navigation links (dashboard, documents, study, chat, quiz, answer formulation, upload, progress, settings) with keyboard-friendly buttons and TTS hover feedback.
  - Ensures high-contrast mode toggles HTML class and surfaces mobile-friendly drawer with accessible controls.
- **Input/Output**: Reads `activeDocumentId`/`quizThreadId` to drive contextual navigation; renders `<Outlet />` for nested routes. Interacts with `toast` for UX feedback.

## Global Considerations
1. **Context Dependency**: Many hooks/components assume provider presence (Auth/Accessibility/Document/Quiz). Breaking provider order will cause runtime errors; keep the stack consistent.
2. **Audio UX**: Interaction gateway plus Accessibility TTS ensures compliance with browser policies. Any new entry point that needs audio should reuse the same gating logic.
3. **Route Organization**: Dashboard subtree hosts most product features; ensure new pages are added under `DashboardLayout` to inherit UI/UX controls.
