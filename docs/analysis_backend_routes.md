# Backend Routes Analysis

## Overview
Flask blueprints providing REST API endpoints for documents, TTS, STT, users, and progress tracking.

## File: `backend/routes/document_routes.py`

### Blueprint: `document_bp` (prefix: `/api/documents`)

### Endpoints

#### `POST /api/documents/upload`
- **Auth**: Required (`@auth_required`)
- **Purpose**: Upload document and trigger DUA/OCR processing
- **Input**: 
  - Multipart form-data with 'file' field
  - Optional 'name' field for document name
- **Allowed Extensions**: txt, pdf, png, jpg, jpeg, gif
- **Process Flow**:
  1. **Initial Firestore Entry**: Creates document with status='uploading'
  2. **GCS Upload**: Uploads original file to user's GCS folder
  3. **DUA Processing** (if eligible: pdf, png, jpg, jpeg):
     - Calls `run_dua_processing_for_document` (async)
     - Generates TTS-ready narrative
     - **TTS Pre-generation**: Synthesizes audio + timepoints
     - Uploads TTS assets to GCS (`{doc_id}_tts.mp3`, `{doc_id}_timepoints.json`)
     - Updates Firestore with narrative and TTS URIs
     - Status: 'processed_dua' or 'dua_failed'
  4. **OCR Fallback** (if DUA fails or not eligible):
     - Uses OCRTool to extract text
     - Status: 'processed_ocr', 'ocr_empty_result', or 'ocr_failed'
  5. **Final Update**: Updates Firestore with final status and content
- **Response**: Document metadata with processing status

#### `GET /api/documents`
- **Auth**: Required
- **Purpose**: List user's documents
- **Query Params**: Optional folder_id filter
- **Response**: Array of document metadata

#### `GET /api/documents/<document_id>`
- **Auth**: Required
- **Purpose**: Get single document metadata
- **Query Params**: 
  - `include_content=true`: Include document content in response
- **Response**: Document metadata (+ content if requested)

#### `GET /api/documents/<document_id>/download`
- **Auth**: Required
- **Purpose**: Download original file
- **Response**: File blob with original filename

#### `DELETE /api/documents/<document_id>`
- **Auth**: Required
- **Purpose**: Delete document and associated GCS files
- **Process**:
  1. Verify ownership via Firestore
  2. Delete from Firestore
  3. Delete from GCS (original + TTS assets)
- **Response**: Success message or error

### DUA Integration
- **Eligible Types**: pdf, png, jpg, jpeg
- **Processing**: Calls `run_dua_processing_for_document` from `graphs.document_understanding_agent.graph`
- **Output Storage**:
  - Narrative: Firestore field 'dua_narrative_content'
  - TTS Audio: GCS `{user_id}/tts_outputs/{doc_id}_tts.mp3`
  - Timepoints: GCS `{user_id}/tts_outputs/{doc_id}_timepoints.json`

### Error Handling
- Validates file presence and extension
- Handles GCS upload failures with Firestore cleanup
- Comprehensive error logging with traceback
- User-friendly error messages

---

## File: `backend/routes/tts_routes.py`

### Blueprint: `tts_bp` (prefix: `/api/tts`)

### Endpoints

#### `POST /api/tts/synthesize`
- **Auth**: Required
- **Purpose**: On-demand text-to-speech synthesis
- **Input**: JSON with fields:
  - `text`: Text to synthesize (required)
  - `voice_name`: Optional voice selection
  - `speaking_rate`: Optional rate (default 1.0)
  - `pitch`: Optional pitch adjustment (default 0.0)
- **Process**:
  1. Validates TTSService availability
  2. Calls `TTSService.synthesize_text()`
  3. Encodes audio as base64
- **Response**: JSON with:
  - `audio_content`: Base64-encoded MP3
  - `timepoints`: Array of word-level timing markers
- **Error Codes**: 400 (missing text), 503 (service unavailable), 500 (synthesis failed)

### Notes
- Uses singleton TTSService instance
- Supports custom voice parameters from frontend
- Returns synchronized timepoints for text highlighting

---

## File: `backend/routes/stt_routes.py`

### Blueprint: `stt_bp` (prefix: `/api/stt`)

### Endpoints

#### `POST /api/stt/transcribe`
- **Auth**: Required
- **Purpose**: Transcribe audio file to text
- **Input**: Multipart form-data with 'audio_file'
- **Supported Formats**: mp3, wav, flac, webm
- **Process**:
  1. Reads audio file bytes
  2. Determines encoding from file extension/mimetype
  3. Calls `STTService.transcribe_audio_bytes()`
- **Response**: JSON with:
  - `transcript`: Transcribed text
  - `confidence`: Recognition confidence
  - `language_code`: Detected/used language
- **Error Codes**: 400 (no file/invalid format), 500 (transcription failed)

### Audio Format Mapping
- mp3 → MP3
- wav → LINEAR16
- flac → FLAC
- webm → WEBM_OPUS (for streaming)

---

## File: `backend/routes/user_routes.py`

### Blueprint: `user_bp` (prefix: `/api/users`)

### Endpoints

#### `GET /api/users/me`
- **Auth**: Required
- **Purpose**: Get current user's profile
- **Response**: User document from Firestore (preferences, gamification, etc.)

#### `PUT /api/users/me`
- **Auth**: Required
- **Purpose**: Update user profile
- **Input**: JSON with user data fields
- **Response**: Updated user document

#### `PUT /api/users/me/preferences`
- **Auth**: Required
- **Purpose**: Update user preferences
- **Input**: JSON with preference fields:
  - fontSize, fontFamily, lineSpacing, wordSpacing
  - textColor, backgroundColor, highContrast
  - uiTtsEnabled, ttsVoice, ttsSpeed, ttsPitch
- **Response**: Success message

### User Data Structure
- **Preferences**: Accessibility and UI settings
- **Gamification**: Points, streak, level, badges
- **Timestamps**: createdAt, lastLogin

---

## File: `backend/routes/progress_routes.py`

### Blueprint: `progress_bp` (prefix: `/api/progress`)

### Endpoints

#### `GET /api/progress`
- **Auth**: Required
- **Purpose**: Get user's progress over time
- **Query Params**: 
  - `days`: Number of days to retrieve (default 7)
- **Response**: Array of progress entries with:
  - date, documentsRead, questionsAnswered, timeSpent, etc.

#### `POST /api/progress`
- **Auth**: Required
- **Purpose**: Create new progress entry
- **Input**: JSON with progress data
- **Response**: Created progress entry with ID

### Progress Tracking
- Tracks daily learning metrics
- Supports gamification features
- Used for dashboard analytics

---

## Summary

### API Structure
```
/api
├── /documents (document_bp)
│   ├── POST /upload
│   ├── GET /
│   ├── GET /<id>
│   ├── GET /<id>/download
│   └── DELETE /<id>
├── /tts (tts_bp)
│   └── POST /synthesize
├── /stt (stt_bp)
│   └── POST /transcribe
├── /users (user_bp)
│   ├── GET /me
│   ├── PUT /me
│   └── PUT /me/preferences
└── /progress (progress_bp)
    ├── GET /
    └── POST /
```

### Authentication Pattern
- All routes use `@auth_required` decorator
- Extracts user_id from Firebase ID token
- Stores in Flask's `g.user_id` for request scope
- Returns 401 for invalid/missing tokens

### Document Processing Pipeline
```
Upload → Firestore (uploading) → GCS Upload → DUA Processing
                                              ├→ Success: TTS Pre-gen → Firestore (processed_dua)
                                              └→ Failure: OCR Fallback → Firestore (processed_ocr/ocr_failed)
```

### TTS Pre-generation (New Feature)
- Triggered during document upload for DUA-processed documents
- Generates audio + timepoints immediately
- Stores in GCS for instant playback
- Reduces latency for "Read Aloud" feature

### Error Handling Strategy
1. **Validation Errors**: 400 Bad Request
2. **Auth Errors**: 401 Unauthorized
3. **Service Unavailable**: 503 Service Unavailable
4. **Processing Errors**: 500 Internal Server Error
5. **Detailed Logging**: All errors logged with traceback
6. **User-Friendly Messages**: Generic errors for client, detailed logs for debugging

### Service Dependencies
- **FirestoreService**: All routes for data persistence
- **StorageService**: Document routes for GCS operations
- **TTSService**: TTS routes + document upload (pre-generation)
- **STTService**: STT routes for transcription
- **DocumentRetrievalService**: Document routes for content retrieval
- **DUA Graph**: Document upload for narrative generation
