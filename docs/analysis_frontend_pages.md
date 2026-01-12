# Analysis: Frontend Pages

> **Directory**: [src/pages/](file:///C:/Ai/aitutor_37/src/pages/)  
> **Count**: 20 page components  
> **Status**: [Active]  
> **Verified**: 2026-01-09

---

## Page Inventory

### Core Application Pages

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| [Dashboard.tsx](file:///C:/Ai/aitutor_37/src/pages/Dashboard.tsx) | ~250 | Main document list | [Active] |
| [DocumentView.tsx](file:///C:/Ai/aitutor_37/src/pages/DocumentView.tsx) | 300 | Document reader with TTS | [Active] |
| [DocumentUpload.tsx](file:///C:/Ai/aitutor_37/src/pages/DocumentUpload.tsx) | ~200 | File upload + paste text | [Active] |
| [DocumentsList.tsx](file:///C:/Ai/aitutor_37/src/pages/DocumentsList.tsx) | ~180 | Document grid/list view | [Active] |
| [ChatPage.tsx](file:///C:/Ai/aitutor_37/src/pages/ChatPage.tsx) | ~400 | Chat interface wrapper | [Active] |
| [Settings.tsx](file:///C:/Ai/aitutor_37/src/pages/Settings.tsx) | ~350 | User preferences | [Active] |
| [AnswerFormulationPage.tsx](file:///C:/Ai/aitutor_37/src/pages/AnswerFormulationPage.tsx) | ~450 | Answer formulation flow | [Active] |
| [DashboardFeedback.tsx](file:///C:/Ai/aitutor_37/src/pages/DashboardFeedback.tsx) | ~120 | Feedback submission | [Active] |
| [LandingPage.tsx](file:///C:/Ai/aitutor_37/src/pages/LandingPage.tsx) | ~300 | Marketing/home page | [Active] |

### Authentication Pages

| File | Purpose |
|------|---------|
| [auth/SignIn.tsx](file:///C:/Ai/aitutor_37/src/pages/auth/SignIn.tsx) | Email/Google login |
| [auth/SignUp.tsx](file:///C:/Ai/aitutor_37/src/pages/auth/SignUp.tsx) | Registration |
| [auth/ResetPassword.tsx](file:///C:/Ai/aitutor_37/src/pages/auth/ResetPassword.tsx) | Password reset flow |

### Admin Pages

| File | Purpose |
|------|---------|
| [admin/AdminDashboard.tsx](file:///C:/Ai/aitutor_37/src/pages/admin/AdminDashboard.tsx) | Admin panel container |
| [admin/components/AdminOverview.tsx](file:///C:/Ai/aitutor_37/src/pages/admin/components/AdminOverview.tsx) | System stats |
| [admin/components/AdminUsersTable.tsx](file:///C:/Ai/aitutor_37/src/pages/admin/components/AdminUsersTable.tsx) | User management |
| [admin/components/AdminFeedbackList.tsx](file:///C:/Ai/aitutor_37/src/pages/admin/components/AdminFeedbackList.tsx) | Feedback review |

### Public Pages

| File | Purpose |
|------|---------|
| [public/About.tsx](file:///C:/Ai/aitutor_37/src/pages/public/About.tsx) | About page |
| [public/Privacy.tsx](file:///C:/Ai/aitutor_37/src/pages/public/Privacy.tsx) | Privacy policy |
| [public/Terms.tsx](file:///C:/Ai/aitutor_37/src/pages/public/Terms.tsx) | Terms of service |

### Development Pages

| File | Purpose | Status |
|------|---------|--------|
| [dev/DeprecationShowcase.tsx](file:///C:/Ai/aitutor_37/src/pages/dev/DeprecationShowcase.tsx) | Test deprecated features | [Dev Only] |

---

## Key Page Details

### DocumentView.tsx

**Verified Patterns**:
- ✅ Event handler: `onClick={() => playAudio()}` (line 233)
- ✅ TTS hook integration: `useTTSPlayer(id, document?.content)` (lines 58-61)
- ✅ Accessibility settings panel (lines 245-282)

**Tabs**: `read`, `chat`, `quiz`

### DocumentUpload.tsx

**Virtual File Creation** for "Paste Text":
```tsx
const textFile = new File([pastedText], 'pasted-content.txt', { type: 'text/plain' });
```

Allows pasted text to flow through same upload pipeline as file uploads.

### AnswerFormulationPage.tsx

**Multi-step Flow**:
1. Question input
2. Voice recording (dictation)
3. Refinement review
4. Voice edit or finalize

Uses `useAnswerFormulation` hook for session state.

---

## Route Protection

All authenticated pages wrapped with `<ProtectedRoute>` component:
- Redirects to `/signin` if not authenticated
- Checks Firebase auth state via `useAuth()`
