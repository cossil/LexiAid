# API and Data Models Documentation

## Overview
This document provides a comprehensive overview of all API endpoints, request/response models, and data structures used throughout the LexiAid application. It serves as a reference for frontend-backend communication and data flow architecture.

## API Endpoints

### Authentication Endpoints

#### User Authentication
- **Provider**: Firebase Authentication
- **Base URL**: N/A (Firebase SDK)
- **Methods**: 
  - Email/Password Sign In
  - Email/Password Sign Up
  - Google OAuth Sign In
  - Password Reset
  - Sign Out

#### User Profile Management
```typescript
GET /api/users/profile
Authorization: Bearer <firebase_id_token>

Response:
{
  "data": {
    "displayName": string,
    "email": string,
    "uid": string,
    "preferences": UserPreferences
  }
}

PATCH /api/users/profile
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

Request:
{
  "displayName"?: string,
  "preferences"?: UserPreferences
}
```

---

### Document Management Endpoints

#### Document Upload
```typescript
POST /api/documents
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data

Request:
- file: File (PDF, PNG, JPG, JPEG, TXT, DOC, DOCX)
- metadata: string (JSON string)

Response:
{
  "id": string,
  "name": string,
  "created_at": string,
  "updated_at": string,
  "file_type": string,
  "original_filename": string,
  "content_length": number
}
```

#### Document Retrieval
```typescript
GET /api/documents
Authorization: Bearer <firebase_id_token>

Response:
{
  "data": [
    {
      "id": string,
      "name": string,
      "created_at": string,
      "updated_at": string,
      "file_type": string,
      "original_filename": string,
      "content_length": number,
      "processing_status": string,
      "page_count": number
    }
  ]
}

GET /api/documents/{document_id}?include_content=true
Authorization: Bearer <firebase_id_token>

Response:
{
  "id": string,
  "name": string,
  "content": string,
  "full_content"?: string,
  "chunks"?: string[],
  "created_at": string,
  "updated_at": string,
  "user_id": string,
  "file_type": string,
  "original_filename": string,
  "content_length": number
}
```

#### Document Operations
```typescript
DELETE /api/documents/{document_id}
Authorization: Bearer <firebase_id_token>

Response: 204 No Content

GET /api/documents/{document_id}/download
Authorization: Bearer <firebase_id_token>

Response: File download

GET /api/documents/{document_id}/tts-assets
Authorization: Bearer <firebase_id_token>

Response:
{
  "audio_url": string,
  "timepoints_url": string
}
```

---

### Chat and AI Endpoints

#### Main Chat Interface
```typescript
POST /api/v2/agent/chat
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

Request:
{
  "query": string,
  "documentId"?: string,
  "thread_id"?: string
}

Response:
{
  "final_agent_response": string,
  "response": string,
  "thread_id": string,
  "active_quiz_thread_id"?: string,
  "audio_content_base64"?: string,
  "timepoints"?: Timepoint[],
  "quiz_active": boolean,
  "quiz_complete": boolean,
  "quiz_cancelled": boolean,
  "conversation_history"?: any[],
  "document_id"?: string,
  "processing_mode"?: string,
  "error_detail"?: string
}
```

#### Audio Message Processing
```typescript
POST /api/v2/agent/chat
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data

Request:
- audio: File (WebM, MP3, FLAC, OGG)
- query?: string
- documentId?: string
- thread_id?: string
- stt_processing_mode?: "review" | "direct_send"

Response:
{
  "response"?: string,
  "thread_id"?: string,
  "quiz_active"?: boolean,
  "error"?: string,
  "transcript"?: string, // For review mode
  "processing_mode"?: string,
  "text"?: string,
  "final_agent_response"?: string
}
```

---

### Text-to-Speech Endpoints

#### Speech Synthesis
```typescript
POST /api/tts/synthesize
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

Request:
{
  "text": string
}

Response:
{
  "audio_content": string, // Base64 encoded
  "timepoints": Timepoint[]
}

GET /api/tts/voices
Authorization: Bearer <firebase_id_token>

Response:
{
  "voices": [
    {
      "name": string,
      "language_codes": string[],
      "ssml_gender": string
    }
  ]
}
```

---

### Speech-to-Text Endpoints

#### Audio Transcription
```typescript
POST /api/stt/transcribe
Authorization: Bearer <firebase_id_token>
Content-Type: multipart/form-data

Request:
- audio: File
- language_code?: string (default: "en-US")

Response:
{
  "transcript": string,
  "confidence": number,
  "language_code": string
}

GET /api/stt/languages
Authorization: Bearer <firebase_id_token>

Response:
{
  "languages": [
    {
      "code": string,
      "name": string
    }
  ]
}
```

#### Real-time Streaming
```typescript
WebSocket: ws://localhost:8000/api/stt/stream
Protocol: WebSocket
Authentication: Query parameter or subprotocol

Messages:
Client -> Server: Audio chunks (binary)
Server -> Client: 
{
  "transcript": string,
  "is_final": boolean
}
```

---

### Answer Formulation Endpoints

#### Transcript Refinement
```typescript
POST /api/v2/answer-formulation/refine
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

Request:
{
  "transcript": string,
  "question"?: string,
  "session_id"?: string
}

Response:
{
  "refined_answer": string,
  "session_id": string,
  "status": string,
  "fidelity_score"?: number,
  "iteration_count": number,
  "audio_content_base64"?: string,
  "timepoints"?: Timepoint[]
}
```

#### Answer Editing
```typescript
POST /api/v2/answer-formulation/edit
Authorization: Bearer <firebase_id_token>
Content-Type: application/json

Request:
{
  "session_id": string,
  "edit_command": string
}

Response:
{
  "refined_answer": string,
  "session_id": string,
  "status": string,
  "iteration_count": number,
  "audio_content_base64"?: string,
  "timepoints"?: Timepoint[]
}
```

---

### Progress Endpoints

#### User Progress
```typescript
GET /api/progress/
Authorization: Bearer <firebase_id_token>

Response: // Currently placeholder
{
  "message": "Progress endpoint placeholder"
}
```

---

## Data Models

### Core Data Types

#### Timepoint
```typescript
interface Timepoint {
  mark_name: string;
  time_seconds: number;
}
```

#### Chat Message
```typescript
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  timestamp: string;
  isQuizQuestion?: boolean;
  options?: string[];
  document_id?: string;
  thread_id?: string;
  audio_content_base64?: string | null;
  timepoints?: Timepoint[] | null;
}
```

#### Document
```typescript
interface Document {
  id: string;
  name: string;
  content?: string;
  full_content?: string;
  chunks?: string[];
  created_at: string;
  updated_at: string;
  user_id: string;
  file_type: string;
  original_filename: string;
  content_length: number;
  processing_status?: string;
  page_count?: number;
}
```

---

### User Models

#### User Preferences
```typescript
interface UserPreferences {
  // Visual Accessibility
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  wordSpacing: number;
  textColor: string;
  backgroundColor: string;
  highContrast: boolean;
  
  // TTS Settings
  uiTtsEnabled: boolean;
  ttsVoice: string;
  ttsSpeed: number;
  ttsPitch: number;
  cloudTtsEnabled: boolean;
  cloudTtsVoice: string;
  ttsDelay?: number; // milliseconds
  
  // Answer Formulation
  answerFormulationAutoPause?: boolean;
  answerFormulationPauseDuration?: number; // seconds
  answerFormulationSessionsCompleted?: number;
  answerFormulationAutoPauseSuggestionDismissed?: boolean;
  answerFormulationOnboardingCompleted?: boolean;
  
  // Auth Helper
  getAuthToken?: (forceRefresh?: boolean) => Promise<string>;
}
```

#### User Profile
```typescript
interface UserProfile {
  displayName: string;
  email: string;
  uid: string;
  preferences?: UserPreferences;
}
```

---

### Answer Formulation Models

#### Refine Answer Request
```typescript
interface RefineAnswerRequest {
  transcript: string;
  question?: string;
  session_id?: string;
}
```

#### Refine Answer Response
```typescript
interface RefineAnswerResponse {
  refined_answer: string;
  session_id: string;
  status: string;
  fidelity_score?: number | null;
  iteration_count: number;
  audio_content_base64?: string | null;
  timepoints?: Timepoint[] | null;
}
```

#### Edit Answer Request
```typescript
interface EditAnswerRequest {
  session_id: string;
  edit_command: string;
}
```

#### Edit Answer Response
```typescript
interface EditAnswerResponse {
  refined_answer: string;
  session_id: string;
  status: string;
  iteration_count: number;
  audio_content_base64?: string | null;
  timepoints?: Timepoint[] | null;
}
```

---

### Audio Processing Models

#### Audio Upload Response
```typescript
interface AudioUploadResponse {
  response?: string;
  thread_id?: string;
  quiz_active?: boolean;
  error?: string;
  transcript?: string; // For review mode
  processing_mode?: string;
  text?: string;
}
```

#### TTS Synthesis Response
```typescript
interface TTSSynthesisResponse {
  audioContent: string; // Base64 encoded
  timepoints: Timepoint[];
}
```

#### STT Transcription Response
```typescript
interface STTTranscriptionResponse {
  transcript: string;
  confidence: number;
  language_code: string;
}
```

---

### Quiz Models

#### Quiz Session
```typescript
interface QuizSession {
  thread_id: string;
  document_id: string;
  questions: QuizQuestion[];
  current_question_index: number;
  score: number;
  completed: boolean;
}
```

#### Quiz Question
```typescript
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}
```

---

## WebSocket Events

### Speech-to-Text Streaming

#### Connection Events
```typescript
// Client connects
ws://localhost:8000/api/stt/stream

// Server sends ready state
{
  "type": "ready"
}
```

#### Audio Streaming
```typescript
// Client sends audio chunk
Binary: Audio data (WebM/Opus)

// Server sends transcription
{
  "transcript": string,
  "is_final": boolean
}
```

#### Error Events
```typescript
// Server sends error
{
  "type": "error",
  "message": string
}
```

---

## Error Handling

### Standard Error Response
```typescript
interface ErrorResponse {
  error: string;
  error_detail?: string;
  status_code: number;
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

### Authentication Errors
```typescript
interface AuthError {
  error: "Authentication required",
  message: "Valid Firebase ID token required"
}
```

### Validation Errors
```typescript
interface ValidationError {
  error: "Validation failed",
  details: {
    field: string,
    message: string
  }[]
}
```

---

## Rate Limiting and Quotas

### API Rate Limits
- **Chat API**: 100 requests per minute per user
- **TTS API**: 50 requests per minute per user
- **STT API**: 30 requests per minute per user
- **Document Upload**: 10 uploads per hour per user

### File Size Limits
- **Document Upload**: 15MB maximum
- **Audio Upload**: 25MB maximum
- **Supported Formats**: PDF, PNG, JPG, JPEG, TXT, DOC, DOCX, WebM, MP3, FLAC, OGG

### Storage Quotas
- **Documents**: 100MB per user
- **Audio Files**: 50MB per user
- **TTS Cache**: 25MB per user

---

## API Versioning

### Current Version
- **Version**: v2
- **Base URL**: `/api/v2`
- **Deprecated**: v1 endpoints (still supported for backward compatibility)

### Versioning Strategy
- **URL Versioning**: `/api/v1/`, `/api/v2/`
- **Backward Compatibility**: Previous versions supported for 6 months
- **Breaking Changes**: Increment major version
- **Feature Additions**: Increment minor version

### Endpoint Migration
```typescript
// Old v1 endpoint (deprecated)
POST /api/agent/chat

// New v2 endpoint (current)
POST /api/v2/agent/chat
```

---

## Security Considerations

### Authentication
- **Firebase ID Tokens**: Required for all protected endpoints
- **Token Validation**: Server-side verification for each request
- **Token Refresh**: Automatic token refresh for long sessions

### Authorization
- **User Isolation**: Users can only access their own data
- **Document Ownership**: Verified before document access
- **Session Management**: Thread-based session isolation

### Data Protection
- **HTTPS Required**: All API calls must use HTTPS
- **Input Validation**: Server-side validation for all inputs
- **Output Sanitization**: Sanitized responses to prevent XSS

---

This API documentation provides a comprehensive reference for all LexiAid backend endpoints and data models. It should be used as the primary source of truth for frontend-backend integration and API contract definitions.
