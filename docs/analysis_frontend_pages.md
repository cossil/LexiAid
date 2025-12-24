# Frontend Pages Analysis – Golden Source

> **Synthesized**: 2024-01-10  
> **Sources**: docs_Comp, docs2, docsGPT52, docsopus45thinking2  
> **Verified Against**: Actual codebase (`src/pages/`)

---

## 1. Page Inventory

| Page | File | Route | Auth Required |
|------|------|-------|---------------|
| Landing | `LandingPage.tsx` | `/` | No |
| Login | `LoginPage.tsx` | `/login` | No |
| Signup | `SignupPage.tsx` | `/signup` | No |
| Forgot Password | `ForgotPasswordPage.tsx` | `/forgot-password` | No |
| Dashboard | `Dashboard.tsx` | `/dashboard` | Yes |
| Documents List | `DocumentsList.tsx` | `/dashboard/documents` | Yes |
| Document View | `DocumentView.tsx` | `/dashboard/documents/:id` | Yes |
| Document Upload | `DocumentUpload.tsx` | `/dashboard/upload` | Yes |
| Chat | `ChatPage.tsx` | `/dashboard/chat` | Yes |
| Settings | `SettingsPage.tsx` | `/dashboard/settings` | Yes |
| Answer Formulation | `AnswerFormulationPage.tsx` | `/dashboard/answer-formulation` | Yes |
| Feedback | `FeedbackPage.tsx` | `/dashboard/feedback` | Yes |
| Admin Dashboard | `AdminDashboard.tsx` | `/dashboard/admin` | Yes + Admin |

---

## 2. Dashboard (`Dashboard.tsx`)

### Purpose
Main landing page after login; shows quick actions and recent documents.

### Key Features
- **Quick Actions**: Upload Document, Paste Text, Chat with LexiAid
- **Recent Documents**: Displays 4 most recently accessed documents
- **User Profile**: Fetches from backend API with Firebase Auth fallback

### Data Fetching
```typescript
// Documents: GET /api/documents
const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
const response = await axios.get(`${apiUrl}/api/documents`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Handles both array and {data: []} response formats
const apiDocuments = Array.isArray(responseData) ? responseData : (responseData?.data || []);
```

### Accessibility
- `handleHover()` triggers TTS for interactive elements when `uiTtsEnabled`
- High contrast mode styling support

---

## 3. Documents List (`DocumentsList.tsx`)

### Purpose
Full document library with search, sort, and delete functionality.

### Key Features
- **Search**: Client-side filtering by name/filename
- **Sort**: By date, name, or file type (ascending/descending)
- **Delete**: Confirmation modal, calls `DELETE /api/documents/:id`
- **Status Badges**: Processing, Ready, Error

### Data Fetching
```typescript
const response = await axios.get(`${apiUrl}/api/documents`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
setDocuments(response.data || []);
```

### Document Interface
```typescript
interface Document {
  id: string;
  name: string;
  original_filename: string;
  file_type: string;
  created_at: string;
  updated_at: string;
  processing_status: string;
  content_length: number;
}
```

---

## 4. Document View (`DocumentView.tsx`)

### Purpose
Read document content with TTS playback, chat, and quiz tabs.

### Key Features
- **Read Tab**: Document content with word-level TTS highlighting
- **Chat Tab**: Embedded `GeminiChatInterface`
- **Quiz Tab**: Quiz mode via chat interface
- **TTS Playback**: Uses `useTTSPlayer` hook for pre-generated assets

### Data Flow
1. Fetches document metadata from `/api/documents/:id`
2. Fetches TTS assets from `/api/documents/:id/tts-assets`
3. Falls back to on-demand synthesis if assets unavailable

### Tab State
- Controlled via URL query param `?tab=read|chat|quiz`
- Default: `read`

---

## 5. Document Upload (`DocumentUpload.tsx`)

### Purpose
Upload files or paste text to create new documents.

### Key Features
- **File Upload**: Drag-and-drop or file picker
- **Text Paste**: Creates virtual `File` object from pasted text
- **Supported Types**: PDF, TXT, DOC, DOCX, PNG, JPG, JPEG
- **Size Limit**: 10MB

### Upload Flow
```typescript
const formData = new FormData();
formData.append('file', file);
formData.append('name', documentName);

await axios.post(`${apiUrl}/api/documents/upload`, formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
});
```

### Virtual File Creation (Text Paste)
```typescript
const virtualFile = new File(
  [textContent],
  `${documentName || 'pasted-text'}.txt`,
  { type: 'text/plain' }
);
```

---

## 6. Chat Page (`ChatPage.tsx`)

### Purpose
Standalone chat interface for document-based conversations.

### Key Features
- **Document Selection**: Via query param `?document=:id`
- **Thread Management**: Creates/restores chat threads
- **Quiz Mode**: Toggle via `startQuiz()` function
- **Message History**: Fetches from `/api/v2/agent/history`

### Chat Flow
1. User sends message
2. Calls `POST /api/v2/agent/chat` with `thread_id`, `document_id`, `message`
3. Backend invokes Supervisor graph
4. Response includes `text`, optional `audio_content_base64`, `timepoints`

### State Management
```typescript
const [messages, setMessages] = useState<ChatMessage[]>([]);
const [threadId, setThreadId] = useState<string | null>(null);
const [isQuizMode, setIsQuizMode] = useState(false);
```

---

## 7. Answer Formulation Page (`AnswerFormulationPage.tsx`)

### Purpose
Guided practice for formulating spoken answers with AI refinement.

### Key Features
- **Dictation**: Real-time STT via WebSocket
- **Refinement**: AI-powered answer improvement
- **Manual Editing**: Text-based corrections
- **Voice Editing**: Speak corrections
- **TTS Playback**: Hear refined answers
- **Onboarding**: Guided first-time experience

### Workflow
1. User dictates answer via `useRealtimeStt`
2. Submits for refinement via `/api/v2/answer-formulation/refine`
3. Reviews refined answer with TTS
4. Can edit manually or via voice
5. Saves final version

### User Preferences Integration
- `answerFormulationAutoPause`: Auto-pause on speech pause
- `answerFormulationPauseDuration`: Pause threshold
- `answerFormulationOnboardingCompleted`: Skip onboarding flag

---

## 8. Settings Page (`SettingsPage.tsx`)

### Purpose
User preferences management for accessibility and TTS.

### Key Sections
- **Display Settings**: Font size, family, spacing, colors
- **TTS Settings**: Voice selection, speed, pitch, cloud TTS toggle
- **High Contrast Mode**: Toggle
- **Account Management**: Delete account option

### Preference Persistence
- Changes call `updateUserPreferences()` from `AuthContext`
- Persisted via `PUT /api/users/profile`

---

## 9. Admin Dashboard (`AdminDashboard.tsx`)

### Purpose
Administrative interface for system management.

### Key Features
- **Stats Overview**: User count, document count, feedback count
- **User Management**: List, search, sync users
- **Feedback Management**: View and manage feedback reports

### Access Control
- Route protected by `ProtectedRoute`
- Additional check: `isAdminEmail(currentUser?.email)` from `src/config/admin.ts`
- Backend enforces via `@require_admin` decorator

---

## 10. Authentication Pages

### Login Page
- Email/password via Firebase
- Google Sign-In button
- "Forgot Password" link
- Redirects to `state.from` or `/dashboard` on success

### Signup Page
- Server-first flow: backend creates user, then Firebase auth
- Email verification required before access
- Redirects to login after signup

### Forgot Password Page
- Firebase `sendPasswordResetEmail`
- Success message, link to login

---

## 11. Common Patterns

### Loading State
```typescript
const [loading, setLoading] = useState(true);
useEffect(() => {
  const fetchData = async () => {
    if (!currentUser) { setLoading(false); return; }
    try {
      // fetch...
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [currentUser]);
```

### TTS Hover Handler
```typescript
const handleHover = (text: string) => {
  if (uiTtsEnabled) {
    speakText(text);
  }
};
```

### High Contrast Styling
```typescript
className={`${highContrast ? 'bg-black text-white border-white' : 'bg-gray-800 text-gray-100'}`}
```

---

## 12. Technical Debt & Risks

1. **Direct Axios Usage**: Multiple pages bypass `apiService`
2. **Inconsistent Error Handling**: Some pages show toast, others set error state
3. **Console Logging**: Extensive debug logs in production
4. **Hardcoded Defaults**: Some pages have different API URL defaults
