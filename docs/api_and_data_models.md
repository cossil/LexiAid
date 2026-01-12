# API and Data Models

> **Purpose**: Document all API contracts and data schemas  
> **Status**: Verified 2026-01-09

---

## API Endpoints

### Document Routes (`/api/documents`)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/upload` | ✅ | `multipart/form-data` | `DocumentResponse` |
| GET | `/` | ✅ | - | `DocumentListResponse` |
| GET | `/{id}` | ✅ | `?include_content=true` | `DocumentDetailResponse` |
| DELETE | `/{id}` | ✅ | - | `204 No Content` |
| GET | `/{id}/tts-assets` | ✅ | - | `TTSAssetsResponse` |

### Chat Routes (`/api/v2/agent`)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/chat` | ✅ | `ChatRequest` | `ChatResponse` |
| GET | `/history` | ✅ | `?thread_id=X` | `HistoryResponse` |

### Answer Formulation (`/api/v2/answer-formulation`)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/refine` | ✅ | `RefineRequest` | `RefineResponse` |
| POST | `/edit` | ✅ | `EditRequest` | `EditResponse` |

### User Routes (`/api/users`)

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| POST | `/` | ❌ | `CreateUserRequest` | `UserResponse` |
| POST | `/init` | ✅ | - | `InitResponse` |
| GET | `/profile` | ✅ | - | `ProfileResponse` |
| PUT | `/profile` | ✅ | `UpdateProfileRequest` | `SuccessResponse` |

### Admin Routes (`/api/admin`)

| Method | Path | Auth | Admin | Request | Response |
|--------|------|------|-------|---------|----------|
| GET | `/stats` | ✅ | ✅ | - | `StatsResponse` |
| GET | `/users` | ✅ | ✅ | `?limit&page_token` | `UsersListResponse` |
| GET | `/feedback` | ✅ | ✅ | `?status&type` | `FeedbackListResponse` |

---

## Request/Response Schemas

### ChatRequest

```typescript
interface ChatRequest {
  message: string;
  document_id: string;
  thread_id?: string;
  start_quiz?: boolean;
  audio_processing_mode?: 'review' | 'direct_send';
}
```

### ChatResponse

```typescript
interface ChatResponse {
  response: string;
  thread_id: string;
  audio_content_base64?: string;
  timepoints?: Timepoint[];
  quiz_state?: QuizState;
}
```

### RefineRequest

```typescript
interface RefineRequest {
  transcript: string;
  question?: string;
  session_id?: string;
}
```

### RefineResponse

```typescript
interface RefineResponse {
  refined_answer: string;
  session_id: string;
  status: 'refined' | 'error';
  fidelity_score?: number;
  iteration_count: number;
  audio_content_base64?: string;
  timepoints?: Timepoint[];
}
```

### UserPreferences

```typescript
interface UserPreferences {
  // Visual
  fontSize: number;          // 10-32
  fontFamily: string;        // 'OpenDyslexic' | 'Inter' | 'Arial'
  lineSpacing: number;       // 1.0-3.0
  wordSpacing: number;       // 0.5-2.0
  textColor: string;
  backgroundColor: string;
  highContrast: boolean;
  
  // TTS
  uiTtsEnabled: boolean;
  ttsVoice: string;
  ttsSpeed: number;          // 0.5-2.0
  ttsPitch: number;          // -20.0-20.0
  cloudTtsEnabled: boolean;
  cloudTtsVoice: string;
  
  // Answer Formulation
  answerFormulationAutoPause: boolean;
  answerFormulationPauseDuration: number;
}
```

### Timepoint

```typescript
interface Timepoint {
  mark_name: string;         // Word text or 'PARAGRAPH_BREAK'
  time_seconds: number;
}
```

---

## Firestore Collections

### `users`

```typescript
interface UserDocument {
  uid: string;
  email: string;
  displayName: string;
  preferences: UserPreferences;
  gamification: {
    level: number;
    xp: number;
    streak: number;
  };
  isAdmin: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `documents`

```typescript
interface DocumentRecord {
  id: string;
  user_id: string;
  name: string;
  original_filename: string;
  file_type: string;
  status: 'uploading' | 'uploaded' | 'processing_dua' | 'processed_dua' | 'dua_failed' | 'ocr_unavailable';
  gcs_uri: string;
  dua_narrative_content?: string;
  tts_audio_gcs_uri?: string;
  tts_timepoints_gcs_uri?: string;
  processing_error?: string;
  content_length: number;
  created_at: string;
  updated_at: string;
}
```

### `feedback`

```typescript
interface FeedbackRecord {
  id: string;
  user_id: string;
  type: 'bug' | 'accessibility' | 'suggestion' | 'other';
  message: string;
  status: 'new' | 'reviewed' | 'resolved';
  created_at: Timestamp;
}
```

---

## LangGraph State Schemas

### SupervisorState

```typescript
interface SupervisorState {
  user_id: string;
  document_id: string;
  thread_id: string;
  messages: Message[];
  current_route: 'new_chat_graph' | 'quiz_engine_graph' | 'end';
}
```

### QuizEngineState

```typescript
interface QuizEngineState {
  user_id: string;
  document_id: string;
  thread_id: string;
  quiz_history: QuizQuestion[];
  current_question_index: number;
  score: number;
  status: 'initializing' | 'generating' | 'awaiting_answer' | 'evaluating' | 'completed' | 'error';
}
```

### AnswerFormulationState

```typescript
interface AnswerFormulationState {
  user_id: string;
  session_id: string;
  question_prompt?: string;
  original_transcript: string;
  refined_answer?: string;
  edit_command?: string;
  fidelity_score?: number;
  iteration_count: number;
  status: 'initializing' | 'validating' | 'refining' | 'editing' | 'validating_fidelity' | 'refined' | 'error';
  error_message?: string;
}
```
