# Frontend Main Analysis

## File: `src/App.tsx`

### Purpose
Root React component managing routing, authentication, and global providers.

### Key Components

#### `UserInteractionGateway` (Lines 26-91)
- **Purpose**: Unblock browser audio features requiring user interaction
- **Process**:
  1. Shows modal prompting user to click
  2. Initializes AudioContext with silent oscillator
  3. Initializes SpeechSynthesis
  4. Removes event listeners after interaction
- **Events**: click, keydown, touchstart (once)

#### `ProtectedRoute` (Lines 94-110)
- **Purpose**: Route guard for authenticated pages
- **Logic**: 
  - Shows loader while auth loading
  - Redirects to `/auth/signin` if not authenticated
  - Renders children if authenticated

#### `AppRoutes` (Lines 113-168)
- **Purpose**: Defines application routing structure
- **Public Routes**:
  - `/` → LandingPage
  - `/auth/signin` → SignIn
  - `/auth/signup` → SignUp
  - `/auth/reset-password` → ResetPassword
- **Protected Routes** (under `/dashboard`):
  - `/dashboard` → Dashboard (index)
  - `/dashboard/upload` → DocumentUpload
  - `/dashboard/documents` → DocumentsList
  - `/dashboard/documents/:id` → DocumentView
  - `/dashboard/chat` → ChatPage
  - `/dashboard/settings` → Settings
- **Dev Routes**: `/dev/deprecation-showcase` (DEV mode only)

#### `App` Component (Lines 170-194)
- **State**: `userHasInteracted` (tracks audio unlock)
- **Provider Hierarchy**:
  ```
  Router
    └── AuthProvider
        └── AccessibilityProvider
            └── UserInteractionGateway (conditional)
            └── AppRoutes
  ```
- **Context Wrapping**: DocumentProvider and QuizProvider wrap DashboardLayout

### Routing Structure
```
/ (public)
/auth/* (public)
/dashboard (protected)
  ├── DocumentProvider
  │   └── QuizProvider
  │       └── DashboardLayout
  │           ├── / (Dashboard)
  │           ├── /upload (DocumentUpload)
  │           ├── /documents (DocumentsList)
  │           ├── /documents/:id (DocumentView)
  │           ├── /chat (ChatPage)
  │           └── /settings (Settings)
```

### Key Features
- **Audio Initialization**: Ensures TTS/STT work by requiring user interaction
- **Lazy Loading**: Dev components loaded dynamically
- **Nested Providers**: Context available to all protected routes
- **Fallback Routing**: Unknown routes redirect appropriately

---

## File: `src/main.tsx`

### Purpose
Application entry point and React rendering.

### Code
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### Configuration
- **Strict Mode**: Enabled for development checks
- **Root Element**: `#root` in index.html
- **Styling**: Imports global index.css (Tailwind)

---

## File: `src/firebase/config.ts`

### Purpose
Firebase SDK initialization and configuration.

### Exports
```typescript
export const app: FirebaseApp
export const auth: Auth
export const db: Firestore
```

### Configuration Source
- Environment variables via `import.meta.env`:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`

### Services Initialized
1. **Firebase App**: Core Firebase instance
2. **Auth**: Firebase Authentication
3. **Firestore**: Cloud Firestore database

---

## File: `src/index.css`

### Purpose
Global styles and Tailwind CSS configuration.

### Key Features
- **Tailwind Directives**: @tailwind base, components, utilities
- **Custom Fonts**: OpenDyslexic font-face definitions
- **Dark Mode**: Configured via Tailwind's dark: prefix
- **Accessibility**: High contrast mode support
- **Custom Properties**: CSS variables for theming

### Font Loading
```css
@font-face {
  font-family: 'OpenDyslexic';
  src: url('/fonts/OpenDyslexic-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
}
```

---

## Summary

### Application Flow
1. **Entry**: main.tsx renders App component
2. **Initialization**: Firebase config loaded
3. **Audio Unlock**: UserInteractionGateway ensures browser audio works
4. **Authentication**: AuthProvider manages user state
5. **Accessibility**: AccessibilityProvider manages TTS/visual settings
6. **Routing**: React Router handles navigation
7. **Protected Access**: ProtectedRoute guards dashboard routes
8. **Context Injection**: DocumentProvider & QuizProvider for dashboard

### Environment Variables Required
- Firebase config (6 variables)
- `VITE_BACKEND_API_URL` (for API calls)

### Key Design Patterns
1. **Provider Pattern**: Nested context providers for global state
2. **Route Guards**: ProtectedRoute HOC for auth
3. **Lazy Loading**: Dynamic imports for dev components
4. **Audio Initialization**: User interaction gateway for browser compliance
5. **Strict Mode**: Development-time checks enabled
