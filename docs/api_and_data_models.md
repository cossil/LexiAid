# API and Data Models Documentation

## Backend API Endpoints

### Authentication
All endpoints (except health checks) require Firebase authentication via Bearer token in Authorization header.

---

## Document Management API

### `POST /api/documents/upload`
**Purpose**: Upload and process a new document

**Request**:
- **Content-Type**: multipart/form-data
- **Fields**:
  - `file`: File (required) - Document file
  - `name`: string (optional) - Custom document name

**Response** (200 OK):
```json
{
  "id": "uuid-string",
  "name": "Document Name",
  "original_filename": "file.pdf",
  "file_type": "pdf",
  "status": "processed_dua" | "processed_ocr" | "dua_failed" | "ocr_unavailable",
  "created_at": "ISO-8601 timestamp",
  "updated_at": "ISO-8601 timestamp",
  "gcs_uri": "gs://bucket/path/to/file",
  "dua_narrative_content": "TTS-ready narrative text" | null,
  "ocr_text_content": "OCR extracted text" | null,
  "tts_audio_gcs_uri": "gs://bucket/path/to/audio.mp3" | null,
  "tts_timepoints_gcs_uri": "gs://bucket/path/to/timepoints.json" | null,
  "processing_error": "Error message" | null
}
```

**Processing Flow**:
1. Upload → `status: "uploading"`
2. DUA Processing → `status: "processing_dua"`
3. Success → `status: "processed_dua"` + TTS pre-generation
4. Failure → `status: "dua_failed"` → OCR fallback (deprecated) → `status: "ocr_unavailable"`

---

### `GET /api/documents`
**Purpose**: List user's documents

**Query Parameters**:
- `folder_id`: string (optional) - Filter by folder

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Document Name",
      "original_filename": "file.pdf",
      "file_type": "pdf",
      "status": "processed_dua",
      "created_at": "ISO-8601",
      "updated_at": "ISO-8601",
      "content_length": 12345
    }
  ]
}
```

---

### `GET /api/documents/{document_id}`
**Purpose**: Get document metadata and optionally content

**Query Parameters**:
- `include_content`: boolean (default: false) - Include document content

**Response** (200 OK):
```json
{
  "id": "uuid",
  "name": "Document Name",
  "original_filename": "file.pdf",
  "file_type": "pdf",
  "status": "processed_dua",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "user_id": "firebase-uid",
  "gcs_uri": "gs://bucket/path",
  "content": "Full document text" // if include_content=true
}
```

---

### `GET /api/documents/{document_id}/download`
**Purpose**: Download original document file

**Response** (200 OK):
- **Content-Type**: Original file MIME type
- **Body**: File binary data
- **Headers**: `Content-Disposition: attachment; filename="original.pdf"`

---

### `GET /api/documents/{document_id}/tts-assets`
**Purpose**: Get pre-generated TTS assets (audio + timepoints)

**Response** (200 OK):
```json
{
  "audio_url": "https://storage.googleapis.com/signed-url-to-audio.mp3",
  "timepoints_url": "https://storage.googleapis.com/signed-url-to-timepoints.json"
}
```

**Timepoints JSON Structure**:
```json
[
  { "mark_name": "Hello", "time_seconds": 0.0 },
  { "mark_name": "world", "time_seconds": 0.5 },
  { "mark_name": "PARAGRAPH_BREAK", "time_seconds": 1.2 },
  { "mark_name": "Next", "time_seconds": 1.9 }
]
```

---

### `DELETE /api/documents/{document_id}`
**Purpose**: Delete document and associated files

**Response** (200 OK):
```json
{
  "message": "Document deleted successfully",
  "deleted_files": ["gs://bucket/original.pdf", "gs://bucket/audio.mp3"]
}
```

---

## Agent Chat API

### `POST /api/v2/agent/chat`
**Purpose**: Main agent interaction endpoint (text, audio, quiz)

**Request (Text)**:
- **Content-Type**: application/json
```json
{
  "query": "User's question or command",
  "documentId": "uuid" | null,
  "thread_id": "thread-uuid" | null
}
```

**Request (Audio)**:
- **Content-Type**: multipart/form-data
- **Fields**:
  - `audio_file`: File (webm/opus, flac, mp3, wav)
  - `document_id`: string (optional)
  - `thread_id`: string (optional)
  - `transcript`: string (optional) - Client-provided transcript
  - `stt_processing_mode`: "review" | "direct_send" (optional)

**Response** (200 OK):
```json
{
  "response": "Agent's text response",
  "final_agent_response": "Structured agent output (quiz questions, etc.)",
  "thread_id": "thread-uuid",
  "active_quiz_thread_id": "quiz-thread-uuid" | null,
  "conversation_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "quiz_active": false,
  "quiz_complete": false,
  "quiz_cancelled": false,
  "document_id": "uuid" | null,
  "processing_mode": "review" | "direct_send" | null,
  "audio_content_base64": "base64-encoded-mp3" | null,
  "timepoints": [ /* array of timepoint objects */ ] | null,
  "transcript": "Transcribed text from audio" | null
}
```

**Special Commands**:
- `/start_quiz` - Initiate quiz for document
- `/cancel_quiz` - Cancel active quiz

---

## TTS API

### `POST /api/tts/synthesize`
**Purpose**: On-demand text-to-speech synthesis

**Request**:
```json
{
  "text": "Text to synthesize",
  "voice_name": "en-US-Standard-C" | null,
  "speaking_rate": 1.0 | null,
  "pitch": 0.0 | null
}
```

**Response** (200 OK):
```json
{
  "audio_content": "base64-encoded-mp3-audio",
  "timepoints": [
    { "mark_name": "word", "time_seconds": 0.0 },
    { "mark_name": "PARAGRAPH_BREAK", "time_seconds": 1.5 }
  ]
}
```

---

## STT API

### `WebSocket /api/stt/stream`
**Purpose**: Real-time speech-to-text streaming

**Connection**: WebSocket upgrade

**Send** (Binary): Audio chunks (webm/opus, 16kHz, mono)

**Receive** (JSON):
```json
{
  "is_final": false,
  "transcript": "partial transcript",
  "stability": 0.85
}
```

**Final Result**:
```json
{
  "is_final": true,
  "transcript": "complete final transcript",
  "stability": 1.0
}
```

---

### `POST /api/stt/transcribe`
**Purpose**: File-based speech-to-text

**Request**:
- **Content-Type**: multipart/form-data
- **Fields**:
  - `audio_file`: File (mp3, wav, flac, webm)

**Response** (200 OK):
```json
{
  "transcript": "Transcribed text",
  "confidence": 0.95,
  "language_code": "en-US"
}
```

---

## User API

### `GET /api/users/me`
**Purpose**: Get current user profile

**Response** (200 OK):
```json
{
  "uid": "firebase-uid",
  "email": "user@example.com",
  "displayName": "User Name",
  "preferences": {
    "fontSize": 16,
    "fontFamily": "OpenDyslexic",
    "lineSpacing": 1.5,
    "wordSpacing": 0.1,
    "highContrast": false,
    "uiTtsEnabled": true,
    "cloudTtsEnabled": true,
    "ttsVoice": "en-US-Standard-C",
    "ttsSpeed": 1.0,
    "ttsPitch": 0.0,
    "ttsDelay": 500
  },
  "gamification": {
    "points": 100,
    "level": 2,
    "streak": 5,
    "badges": ["first_quiz", "week_streak"]
  }
}
```

---

### `PUT /api/users/me/preferences`
**Purpose**: Update user preferences

**Request**:
```json
{
  "fontSize": 18,
  "highContrast": true,
  "uiTtsEnabled": false
}
```

**Response** (200 OK):
```json
{
  "message": "Preferences updated successfully"
}
```

---

## Progress API

### `GET /api/progress`
**Purpose**: Get user's learning progress

**Query Parameters**:
- `days`: number (default: 7) - Number of days to retrieve

**Response** (200 OK):
```json
{
  "data": [
    {
      "date": "2024-01-15",
      "documentsRead": 3,
      "questionsAnswered": 15,
      "timeSpent": 3600,
      "quizzesCompleted": 2,
      "averageScore": 0.85
    }
  ]
}
```

---

### `POST /api/progress`
**Purpose**: Create progress entry

**Request**:
```json
{
  "date": "2024-01-15",
  "documentsRead": 1,
  "questionsAnswered": 5,
  "timeSpent": 1200
}
```

**Response** (201 Created):
```json
{
  "id": "progress-uuid",
  "message": "Progress entry created"
}
```

---

## Firestore Data Models

### Collection: `users`
**Document ID**: Firebase UID

```typescript
{
  uid: string
  email: string
  displayName: string
  createdAt: Timestamp
  lastLogin: Timestamp
  preferences: {
    fontSize: number
    fontFamily: string
    lineSpacing: number
    wordSpacing: number
    textColor: string
    backgroundColor: string
    highContrast: boolean
    uiTtsEnabled: boolean
    cloudTtsEnabled: boolean
    ttsVoice: string
    ttsSpeed: number
    ttsPitch: number
    ttsDelay: number
  }
  gamification: {
    points: number
    level: number
    streak: number
    badges: string[]
  }
}
```

---

### Collection: `documents`
**Document ID**: Auto-generated UUID

```typescript
{
  id: string
  user_id: string  // Firebase UID
  name: string
  original_filename: string
  file_type: string  // pdf, png, jpg, txt, etc.
  status: "uploading" | "uploaded" | "processing_dua" | "processed_dua" | 
          "dua_failed" | "processing_ocr" | "processed_ocr" | "ocr_unavailable"
  created_at: Timestamp
  updated_at: Timestamp
  gcs_uri: string  // gs://bucket/path/to/original
  content_length: number
  mime_type: string
  
  // DUA Processing Results
  dua_narrative_content: string | null  // TTS-ready narrative
  tts_audio_gcs_uri: string | null      // Pre-generated audio
  tts_timepoints_gcs_uri: string | null // Pre-generated timepoints
  
  // OCR Results (Deprecated)
  ocr_text_content: string | null
  
  // Error Tracking
  processing_error: string | null
  
  // Organization
  folder_id: string | null
  tags: string[]
}
```

---

### Subcollection: `documents/{doc_id}/document_contents`
**Document ID**: Auto-generated

```typescript
{
  document_id: string
  content: string  // Full text content
  source: "firestore_dua_narrative" | "firestore_ocr_field" | "gcs"
  created_at: Timestamp
}
```

---

### Collection: `folders`
**Document ID**: Auto-generated UUID

```typescript
{
  id: string
  user_id: string
  name: string
  created_at: Timestamp
  parent_folder_id: string | null
}
```

---

### Collection: `tags`
**Document ID**: Auto-generated UUID

```typescript
{
  id: string
  user_id: string
  name: string
  color: string
  created_at: Timestamp
}
```

---

### Collection: `interactions`
**Document ID**: Auto-generated UUID

```typescript
{
  id: string
  user_id: string
  document_id: string
  interaction_type: "view" | "chat" | "quiz" | "tts_playback"
  timestamp: Timestamp
  metadata: {
    quiz_score?: number
    questions_answered?: number
    time_spent?: number
  }
}
```

---

### Collection: `progress`
**Document ID**: Auto-generated UUID

```typescript
{
  id: string
  user_id: string
  date: string  // YYYY-MM-DD
  documentsRead: number
  questionsAnswered: number
  timeSpent: number  // seconds
  quizzesCompleted: number
  averageScore: number  // 0.0 - 1.0
}
```

---

## LangGraph State Models

### SupervisorState
```typescript
{
  user_id: string
  current_query: string
  conversation_history: BaseMessage[]
  active_chat_thread_id: string | null
  active_dua_thread_id: string | null
  document_id_for_action: string | null
  document_snippet_for_quiz: string | null
  next_graph_to_invoke: "quiz_engine_graph" | "new_chat_graph" | "end" | null
  final_agent_response: string | null
  supervisor_error_message: string | null
  active_quiz_v2_thread_id: string | null
  quiz_engine_state: QuizEngineState | null
  is_quiz_v2_active: boolean
  current_audio_input_base64: string | null
  current_audio_format: string | null
}
```

---

### QuizEngineState
```typescript
{
  document_id: string
  document_content_snippet: string
  user_id: string
  max_questions: number
  user_answer: string | null
  active_quiz_thread_id: string
  quiz_history: Array<{
    question_text: string
    options: string[]
    correct_answer_index: number
    correct_answer_text: string
    explanation_for_correct_answer: string | null
    user_answer: string | null
    is_correct_from_llm: boolean | null
    feedback_from_llm: string | null
  }>
  current_question_index: number
  current_question_number: number | null
  score: number
  llm_json_response: object | null
  llm_call_count: number
  current_question_to_display: {
    question_text: string
    options: string[]
  } | null
  current_feedback_to_display: string | null
  status: "initializing" | "generating_first_question" | "awaiting_answer" | 
          "evaluating_answer" | "quiz_completed" | "error"
  error_message: string | null
}
```

---

### GeneralQueryState (NewChatGraph)
```typescript
{
  document_id: string | null
  user_id: string | null
  thread_id: string | null
  messages: BaseMessage[]
  query: string
  response: string | null
  error_message: string | null
}
```

---

## Error Response Format

All API errors follow this structure:

```json
{
  "error": "Human-readable error message",
  "error_code": "ERROR_CODE_IDENTIFIER",
  "details": "Additional error details",
  "timestamp": "ISO-8601 timestamp"
}
```

**Common Error Codes**:
- `UNAUTHENTICATED` (401)
- `INVALID_TOKEN` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `VALIDATION_ERROR` (400)
- `INTERNAL_SERVER_ERROR` (500)
- `SERVICE_UNAVAILABLE` (503)

---

## Summary

### Total Endpoints: 15
- **Documents**: 6 endpoints
- **Agent Chat**: 1 endpoint (handles text, audio, quiz)
- **TTS**: 1 endpoint
- **STT**: 2 endpoints (WebSocket + file upload)
- **User**: 2 endpoints
- **Progress**: 2 endpoints
- **Health**: 1 endpoint

### Total Firestore Collections: 6
- users, documents, folders, tags, interactions, progress

### Total LangGraph States: 3
- SupervisorState, QuizEngineState, GeneralQueryState

### Authentication
- All endpoints require Firebase ID token (except health checks)
- Token passed via `Authorization: Bearer {token}` header
- Verified using Firebase Admin SDK

### Data Flow
1. **Frontend** → API Service → **Backend** → Services → **Firestore/GCS**
2. **Frontend** → API Service → **Backend** → LangGraph → **Gemini AI** → Response
3. **Frontend** → WebSocket → **Backend** → **Google STT** → Real-time transcript
