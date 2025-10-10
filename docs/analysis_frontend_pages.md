# Frontend Pages Analysis

## File: `src/pages/ChatPage.tsx`

### Purpose
Dedicated chat interface for document-based Q&A and quiz interactions.

### Key State
- `messages`: ChatMessage[] - Conversation history
- `isLoading`: boolean - Message sending status
- `threadId`: string | undefined - Conversation thread
- `document`: {id, name} | null - Active document
- `isQuiz`: boolean - Quiz mode flag
- `quizInitializationAttempted`: useRef - Prevents duplicate quiz starts

### Key Functions

#### `handleStartQuiz` (Lines 58-102)
- **Purpose**: Initialize quiz for current document
- **Process**:
  1. Validates document presence
  2. Checks quizInitializationAttempted ref
  3. Sends `/start_quiz` to backend
  4. Updates state with quiz question
- **API**: `apiService.chat({ query: '/start_quiz', documentId, threadId })`

#### `handleAudioSend` (Lines 113-200)
- **Purpose**: Send audio message with optional transcript
- **Process**:
  1. Creates pending user message
  2. Builds FormData with audio blob
  3. Calls `apiService.uploadAudioMessage(formData)`
  4. Updates message with final transcript
  5. Adds AI response to messages
- **Modes**: Supports both review and direct_send

#### `handleSendMessage` (Lines 202-263)
- **Purpose**: Send text message
- **Process**:
  1. Creates pending user message
  2. Calls `apiService.chat({ query, documentId, threadId })`
  3. Updates user message (removes pending)
  4. Adds AI response with audio/timepoints
- **Response Mapping**: Maps backend fields to ChatMessage format

### URL Parameters
- `?document={id}`: Document ID for context
- `?start_quiz=true`: Auto-start quiz on load

### Component Structure
```tsx
<ChatPage>
  <header>
    <BackButton />
    <Title: "Quiz Mode" | "Chat with AI Tutor" />
    <DocumentInfo />
  </header>
  <GeminiChatInterface
    messages={messages}
    onSendMessage={handleSendMessage}
    onAudioSend={handleAudioSend}
    onStartQuiz={handleStartQuiz}
  />
</ChatPage>
```

### Quiz Flow Prevention
- Uses `quizInitializationAttempted` ref to prevent multiple quiz starts
- Checks ref before calling `handleStartQuiz`
- Sets ref to true immediately after starting

---

## File: `src/pages/DocumentView.tsx`

### Purpose
Document viewer with Read, Chat, and Quiz tabs.

### Key State
- `document`: DocumentData | null
- `loading`: boolean
- `error`: string | null
- `activeTab`: 'read' | 'chat' | 'quiz'
- `fontSize`, `lineSpacing`: Reader settings
- `showSettings`: boolean

### Tabs

#### Read Tab (Lines 146-161)
- **TTS Integration**: Uses `useTTSPlayer` hook
- **Synchronized Highlighting**: `SpeakableDocumentContent` component
- **Word-Click Seeking**: `onWordClick={seekAndPlay}`
- **Fallback**: Plain text if no timepoints

#### Chat Tab (Lines 162-178)
- **Purpose**: Navigate to chat page with document context
- **Button**: "Start Chat" → `/dashboard/chat?document={id}`

#### Quiz Tab (Lines 179-195)
- **Purpose**: Navigate to quiz with document context
- **Button**: "Generate Quiz" → `/dashboard/chat?document={id}&start_quiz=true`

### TTS Controls (Lines 217-226)
- **Play/Pause/Resume**: Single button with dynamic label
- **Stop Button**: Conditional (only when playing/paused)
- **Status Icons**: Play, Pause, Loader based on status

### Settings Panel (Lines 229-248)
- **Font Size**: Range 12-28px
- **Line Spacing**: Range 1-3
- **UI TTS Toggle**: Enable/disable hover speech

### Document Context
- **Sets Active Document**: `setActiveDocumentId(id)` on mount
- **Global State**: Updates DocumentContext for sidebar navigation

### URL Query Params
- `?tab=quiz`: Opens quiz tab
- `?tab=chat`: Opens chat tab

---

## File: `src/pages/DocumentsList.tsx`

### Purpose
List and manage user's documents.

### Key State
- `documents`: Document[] - User's documents
- `searchQuery`: string - Filter text
- `sortBy`: 'date' | 'name' | 'type'
- `sortOrder`: 'asc' | 'desc'
- `showDeleteConfirm`: boolean
- `documentToDelete`: string | null

### Key Functions

#### `fetchDocuments` (Lines 52-84)
- **API**: `GET /api/documents` with auth token
- **Error Handling**: Sets error state, shows user-friendly message

#### `confirmDelete` (Lines 149-182)
- **API**: `DELETE /api/documents/{id}` with auth token
- **UI Update**: Removes document from local state
- **TTS Feedback**: Speaks deletion status if enabled

### Filtering & Sorting
- **Search**: Filters by name or original_filename
- **Sort Options**: Date (default desc), Name (asc), Type (asc)
- **Toggle**: Clicking same criteria toggles order

### Document Card (Lines 373-455)
- **Link**: Navigates to `/dashboard/documents/{id}`
- **Metadata**: Date, file type, character count
- **Status Badge**: Processing, Ready, Error
- **Delete Button**: Prevents link navigation, shows confirmation modal

### Empty States
- **No Documents**: "Upload your first document" CTA
- **No Search Results**: "Clear Search" button

### Delete Confirmation Modal (Lines 461-496)
- **Backdrop**: Black overlay with blur
- **Document Name**: Shows name of document to delete
- **Actions**: Cancel or Confirm delete

---

## File: `src/pages/DocumentUpload.tsx`

### Purpose
Document upload interface with drag-and-drop.

### Key State
- `selectedFile`: File | null
- `uploading`: boolean
- `uploadProgress`: number
- `uploadError`: string | null
- `uploadSuccess`: boolean

### File Selection
- **Drag & Drop**: Drop zone with visual feedback
- **File Input**: Click to browse
- **Validation**: Checks file type and size

### Upload Process
1. Validates file
2. Creates FormData
3. Calls `apiService.uploadDocument(file, metadata)`
4. Shows progress (simulated or real)
5. Redirects to document view on success

### Allowed File Types
- PDF, TXT, DOCX
- Images: PNG, JPG, JPEG

---

## File: `src/pages/Dashboard.tsx`

### Purpose
Main dashboard with overview and quick actions.

### Sections
1. **Welcome Header**: User greeting
2. **Quick Actions**: Upload, Browse Documents
3. **Recent Documents**: Last 5 documents
4. **Statistics**: Documents count, quiz scores, etc.
5. **Activity Feed**: Recent interactions

### Navigation
- **Upload**: → `/dashboard/upload`
- **Browse**: → `/dashboard/documents`
- **Document Card**: → `/dashboard/documents/{id}`

---

## File: `src/pages/Settings.tsx`

### Purpose
User preferences and accessibility settings.

### Settings Categories

#### Accessibility
- Font size, family, line spacing, word spacing
- High contrast mode
- UI TTS enable/disable
- TTS delay configuration

#### Account
- Display name
- Email (read-only)
- Password change

#### Preferences
- Default document view
- Auto-save settings
- Notification preferences

### Save Mechanism
- **Auto-save**: Updates on change via `updateUserPreferences`
- **Debounced**: Prevents excessive API calls

---

## File: `src/pages/auth/SignIn.tsx`, `SignUp.tsx`, `ResetPassword.tsx`

### SignIn
- **Email/Password**: Firebase auth
- **Remember Me**: Optional
- **Links**: Sign up, forgot password

### SignUp
- **Fields**: Email, password, confirm password, display name
- **Validation**: Password strength, email format
- **Auto-login**: After successful signup

### ResetPassword
- **Email Input**: Sends password reset email
- **Confirmation**: Shows success message

---

## Summary

### Page Routing
```
/dashboard → Dashboard (overview)
/dashboard/upload → DocumentUpload
/dashboard/documents → DocumentsList
/dashboard/documents/:id → DocumentView (tabs: read, chat, quiz)
/dashboard/chat → ChatPage (with ?document=id, ?start_quiz=true)
/dashboard/settings → Settings
/auth/signin → SignIn
/auth/signup → SignUp
/auth/reset-password → ResetPassword
```

### API Integration
- **ChatPage**: `/api/v2/agent/chat` (text & audio)
- **DocumentView**: `/api/documents/{id}`, `/api/documents/{id}/tts-assets`
- **DocumentsList**: `/api/documents` (GET, DELETE)
- **DocumentUpload**: `/api/documents/upload` (POST multipart)
- **Settings**: `/api/users/me/preferences` (PUT)

### State Management
- **Local State**: useState for component-specific data
- **Context**: DocumentContext (active doc), QuizContext (quiz state)
- **URL State**: Query params for document/quiz context

### Key Features
1. **Document-Centric**: All features revolve around documents
2. **Quiz Integration**: Seamless quiz start from multiple entry points
3. **TTS Everywhere**: Synchronized audio in chat and document view
4. **Accessibility First**: Settings, high contrast, dyslexia-friendly fonts
5. **Real-time Feedback**: Loading states, progress indicators, error messages
