# Frontend Services Analysis

## File: `src/services/api.ts`

### Purpose
Centralized API service for all backend communication.

### Axios Instance Configuration
```typescript
baseURL: import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000'
headers: { 'Content-Type': 'application/json' }
```

### Request Interceptor
- **Purpose**: Auto-inject Firebase auth token
- **Process**:
  1. Gets currentUser from Firebase auth
  2. Calls `currentUser.getIdToken()`
  3. Adds to `Authorization: Bearer {token}` header
- **Error Handling**: Logs error, continues without token

### API Methods

#### Authentication
```typescript
getAuthToken(): Promise<string | null>
```
- Returns current user's Firebase ID token
- Used by other services for manual auth

#### Chat
```typescript
chat(payload: { query, documentId?, threadId? }): Promise<ChatResponse>
```
- **Endpoint**: `POST /api/v2/agent/chat`
- **Response Mapping**:
  - `final_agent_response` → `agent_response`
  - `active_quiz_thread_id` → `thread_id` (prioritized)
  - `quiz_active` → `is_quiz`
  - `quiz_complete` → `quiz_completed`
- **Returns**: Agent response, thread ID, audio, timepoints, quiz flags

```typescript
uploadAudioMessage(formData, options): Promise<AudioResponse>
```
- **Endpoint**: `POST /api/v2/agent/chat` (multipart)
- **Options**: `sttProcessingMode: 'review' | 'direct_send'`
- **FormData**: audio_file, document_id, thread_id, transcript (optional)
- **Returns**: Response text, thread ID, transcript, quiz state

#### TTS
```typescript
synthesizeText(text: string): Promise<{ audioContent, timepoints }>
```
- **Endpoint**: `POST /api/tts/synthesize`
- **Request**: `{ text }`
- **Response**: Base64 audio + word timepoints
- **Mapping**: `audio_content` → `audioContent` (camelCase)

```typescript
getTtsAssets(documentId): Promise<{ audio_url, timepoints_url }>
```
- **Endpoint**: `GET /api/documents/{id}/tts-assets`
- **Returns**: Pre-signed URLs for pre-generated TTS assets

#### Documents
```typescript
getDocument(documentId): Promise<DocumentData>
```
- **Endpoint**: `GET /api/documents/{id}?include_content=true`
- **Returns**: Full document with content

```typescript
listDocuments(): Promise<Document[]>
```
- **Endpoint**: `GET /api/documents`
- **Returns**: Array of document metadata

```typescript
uploadDocument(file, metadata?): Promise<Document>
```
- **Endpoint**: `POST /api/documents`
- **Content-Type**: multipart/form-data
- **FormData**: file, metadata (JSON string)

```typescript
deleteDocument(documentId): Promise<void>
```
- **Endpoint**: `DELETE /api/documents/{id}`

#### Quiz
```typescript
startQuiz(documentId, threadId?): Promise<QuizResponse>
```
- **Endpoint**: `POST /api/v2/agent/chat`
- **Query**: `Start a quiz for document {documentId}`
- **Response Mapping**:
  - `final_agent_response` → `agent_response` (prioritized)
  - `active_quiz_thread_id` → `thread_id` (prioritized)

```typescript
continueQuiz(threadId, answer, documentId?): Promise<QuizResponse>
```
- **Endpoint**: `POST /api/v2/agent/chat`
- **Query**: User's answer
- **Returns**: Next question or completion message

```typescript
cancelQuiz(threadId): Promise<void>
```
- **Endpoint**: `POST /api/v2/agent/chat`
- **Query**: `/cancel_quiz`

#### User Profile
```typescript
getUserProfile(): Promise<UserProfile>
```
- **Endpoint**: `GET /api/users/profile`

```typescript
updateUserProfile(updates): Promise<void>
```
- **Endpoint**: `PATCH /api/users/profile`

---

## Response Mapping Strategy

### Backend → Frontend Field Mapping
The API service normalizes backend snake_case to frontend camelCase:

| Backend Field | Frontend Field | Notes |
|--------------|----------------|-------|
| final_agent_response | agent_response | Prioritized for quiz |
| active_quiz_thread_id | thread_id | Prioritized over thread_id |
| quiz_active | is_quiz | Boolean flag |
| quiz_complete | quiz_completed | Completion status |
| audio_content_base64 | audio_content_base64 | Kept as-is |
| audio_content | audioContent | TTS endpoint |

### Error Handling
- Try-catch blocks on all async methods
- Logs errors to console
- Returns error objects: `{ error: string }`
- Throws errors for caller to handle (TTS synthesis)

---

## Usage Patterns

### In Components
```typescript
// Chat
const response = await apiService.chat({ 
  query: userInput, 
  documentId, 
  threadId 
});

// Audio upload
const formData = new FormData();
formData.append('audio_file', audioBlob);
const response = await apiService.uploadAudioMessage(formData);

// TTS
const { audioContent, timepoints } = await apiService.synthesizeText(text);

// Documents
const doc = await apiService.getDocument(documentId);
const docs = await apiService.listDocuments();
```

### In Hooks
```typescript
// useTTSPlayer
const { audio_url, timepoints_url } = await apiService.getTtsAssets(documentId);

// useRealtimeStt
// Uses WebSocket directly, not apiService
```

---

## Summary

### API Coverage
- ✅ Chat (text & audio)
- ✅ TTS (synthesis & pre-generated assets)
- ✅ STT (file upload via chat endpoint)
- ✅ Documents (CRUD)
- ✅ Quiz (start, continue, cancel)
- ✅ User profile & preferences

### Key Features
1. **Auto-Authentication**: Interceptor adds token to all requests
2. **Response Normalization**: Maps backend fields to frontend conventions
3. **Type Safety**: TypeScript interfaces for all responses
4. **Error Handling**: Consistent error structure
5. **Multipart Support**: Handles file uploads (audio, documents)
6. **Dual STT Modes**: Review and direct_send

### Environment Configuration
- `VITE_BACKEND_API_URL`: Backend base URL (default: http://localhost:8000)
- Firebase config for authentication

### Integration Points
- **AuthContext**: Uses auth.currentUser for tokens
- **Hooks**: useTTSPlayer, useOnDemandTTSPlayer call TTS methods
- **Pages**: All pages use apiService for data fetching
- **Components**: GeminiChatInterface uses chat methods
