# Backend Services Analysis

## Overview
Backend services provide core functionality for authentication, database operations, storage, document processing, and AI capabilities (TTS/STT).

## File: `backend/services/auth_service.py`

### Purpose
Firebase Authentication verification and user management.

### Key Functions

#### `verify_id_token(id_token: str) -> Tuple[bool, Optional[Dict]]`
- **Purpose**: Verify Firebase ID token and extract user info
- **Clock Skew**: Allows 60 seconds tolerance for time differences
- **Returns**: `(success, user_data)` tuple
- **User Data Fields**: uid, email, emailVerified, name, pictureUrl
- **Error Handling**: InvalidIdTokenError, ExpiredIdTokenError, RevokedIdTokenError

#### `get_user(user_id: str) -> Optional[Dict]`
- **Purpose**: Retrieve user by UID from Firebase Auth
- **Returns**: User metadata including creation/last sign-in times

#### `create_user(email, password, display_name) -> Tuple[bool, Optional[str]]`
- **Purpose**: Create new Firebase Auth user
- **Returns**: `(success, user_id)` tuple

### Pattern
Singleton pattern ensures single Auth connection.

---

## File: `backend/services/firestore_service.py`

### Purpose
Firestore database operations for users, documents, folders, tags, interactions, and progress.

### Key Functions

#### User Operations
- `get_user(user_id)`: Retrieve user document
- `create_user(user_id, user_data)`: Create user with default preferences
  - Default preferences: fontSize=16, fontFamily='OpenDyslexic', lineSpacing=1.5
  - Default gamification: points=0, streak=0, level=1
- `update_user_preferences(user_id, preferences)`: Update user settings

#### Document Operations
- `save_document(document_data)`: Save document metadata
  - Auto-adds timestamps (created_at, updated_at)
  - Sets initial processing_status='completed'
- `get_document(document_id)`: Retrieve document by ID
- `update_document(document_id, document_data)`: Update document fields
- `delete_document_by_id(document_id, user_id)`: Delete with ownership verification
  - Returns GCS URI for cleanup
- `get_user_documents(user_id, folder_id)`: List user's documents
  - Handles both 'userId' and 'user_id' field names for backward compatibility

#### Content Storage
- `save_document_content(content_data)`: Store in 'document_contents' collection
- `get_document_content_from_subcollection(document_id)`: Retrieve from subcollection

#### Other Collections
- **Folders**: create_folder, get_user_folders
- **Tags**: create_tag, get_user_tags
- **Interactions**: create_interaction, get_user_interactions
- **Progress**: create_progress_entry, get_user_progress
- **Gamification**: update_user_gamification, add_badge_to_user

### Database Configuration
- **Project ID**: From GCP_PROJECT_ID env var
- **Database Name**: Overrides '(default)' to 'ai-tutor-dev-457802'
- **Client**: Uses google.cloud.firestore.Client with explicit database parameter

### Pattern
Singleton pattern with cleanup of existing Firebase apps on initialization.

---

## File: `backend/services/storage_service.py`

### Purpose
Google Cloud Storage operations for file management.

### Key Functions

#### File Upload
- `upload_file(file_content, content_type, user_id, original_filename)`
  - Generates unique UUID-based filename
  - Organizes files under user_id folder
  - Returns: `(success, file_metadata)` with gcsUri, contentType, size
  
- `upload_string_as_file(content_string, content_type, user_id, base_filename, sub_folder)`
  - Uploads text/JSON content as file
  - Supports optional sub_folder (e.g., 'structured_outputs', 'tts_outputs')
  
- `upload_bytes_as_file(content_bytes, content_type, user_id, base_filename, sub_folder)`
  - Uploads binary content (e.g., audio files)

#### File Retrieval
- `get_file(file_path)`: Download file as bytes
  - Handles full GCS URIs (strips `gs://{bucket_name}/` prefix)
  
- `download_file_as_string(gcs_uri)`: Download and return as string

#### File Management
- `delete_file(file_path)`: Delete blob
- `delete_file_from_gcs(gcs_uri)`: Delete by full URI
- `copy_file(source_path, destination_path)`: Copy within GCS
- `list_user_files(user_id, prefix)`: List files with optional prefix filter

#### URL Generation
- `get_signed_url(file_path, expiration_minutes=15)`: Temporary access URL
- `get_public_url(file_path)`: Public URL (requires public blob)

### Configuration
- **Bucket**: From GCS_BUCKET_NAME env var
- **Client**: google.cloud.storage.Client

### Pattern
Singleton pattern ensures single Storage connection.

---

## File: `backend/services/doc_ai_service.py`

### Purpose
Google Document AI integration for OCR and document processing.

### Key Functions

#### `get_text_from_document(doc_metadata: dict) -> str`
- **Purpose**: Extract text from document using Document AI
- **Input**: Metadata dict with 'gcs_uri' and 'mimetype'
- **Process**:
  1. Creates GcsDocument with URI and MIME type
  2. Sends ProcessRequest to Document AI processor
  3. Extracts text from response
- **Returns**: Extracted text (empty string if blank document)
- **Errors**: Raises ContentRetrievalError on API failures

### Configuration
- **Processor**: From GOOGLE_DOCUMENT_AI_PROCESSOR_NAME env var
- **Client**: documentai.DocumentProcessorServiceClient

### Error Handling
- Validates environment variables on init
- Logs detailed error messages
- Gracefully handles initialization failures (sets client=None)

---

## File: `backend/services/doc_retrieval_service.py`

### Purpose
Unified document content retrieval from Firestore or GCS.

### Key Functions

#### `get_document_metadata(document_id) -> Tuple[bool, Optional[Dict]]`
- **Purpose**: Retrieve document metadata from Firestore
- **Returns**: `(success, document_data or error_dict)`

#### `get_document_content(document_id) -> Tuple[bool, Optional[Dict]]`
- **Purpose**: Retrieve document content with intelligent source prioritization
- **Priority Order**:
  1. **DUA Narrative** (status='processed_dua'): Uses 'dua_narrative_content' field
  2. **OCR Text** (status='processed'): Uses 'ocr_text_content' field
  3. **GCS Storage**: Downloads from gcs_uri/storage_path
  4. **Firestore Subcollection**: Checks 'document_contents' collection
- **Image Detection**: Checks mime_type and file_type to prevent text decoding of images
- **Returns**: Dict with 'content', 'source', 'file_type'

#### `get_document_text(document_id, user_id) -> Tuple[bool, Union[str, Dict]]`
- **Purpose**: Get text content with optional ownership verification
- **Returns**: `(success, text_content or error_dict)`

#### `chunk_document_text(text, chunk_size=4000, overlap=200) -> List[str]`
- **Purpose**: Split text into overlapping chunks for LLM context windows
- **Smart Breaking**: Prefers newlines, then spaces, then hard breaks

#### `get_document_chunks(document_id, user_id, chunk_size, overlap)`
- **Purpose**: Get document as chunked text list

#### `get_document_content_for_quiz(document_id, max_length=10000)`
- **Purpose**: Get content snippet for quiz generation
- **Returns**: `(success, snippet, error_message)`

### Dependencies
- FirestoreService: Metadata and subcollection access
- StorageService: GCS file downloads

### Pattern
Singleton pattern with graceful degradation if services unavailable.

---

## File: `backend/services/tts_service.py`

### Purpose
Google Cloud Text-to-Speech with chunking and synchronized timepoints.

### Key Functions

#### `synthesize_text(text, voice_name, speaking_rate, pitch, audio_encoding, sample_rate_hertz)`
- **Purpose**: Convert text to speech with word-level timing
- **Process**:
  1. Sanitizes text using `sanitize_text_for_tts`
  2. Chunks text (max 2500 chars) preserving paragraphs
  3. Builds SSML with `<mark>` tags for each word/space
  4. Adds paragraph break markers with timed `<break>` elements
  5. Synthesizes each chunk via Google TTS API
  6. Aggregates audio chunks and adjusts timepoints
- **Returns**: Dict with 'audio_content' (bytes) and 'timepoints' (array)
- **Timepoints**: Include both word markers and PARAGRAPH_BREAK markers

#### `_chunk_text(text) -> list[str]`
- **Purpose**: Split text into TTS-compatible chunks
- **Strategy**:
  - Preserves paragraph boundaries (double newlines)
  - Splits large paragraphs by sentences
  - Handles edge cases (very long sentences)
- **Max Chunk Size**: 2500 characters (leaves room for SSML overhead)

#### `_build_ssml_and_map(plain_text)`
- **Purpose**: Generate SSML with timing marks
- **SSML Structure**:
  - `<p>` tags for paragraphs
  - `<mark name="part_N"/>` before each word/space
  - `<mark name="p_break_N"/>` + `<break time="750ms"/>` after each paragraph
- **Returns**: `(ssml_string, marks_map)` where marks_map links mark names to text

#### `get_available_voices(language_code)`
- **Purpose**: List available TTS voices
- **Returns**: List of voice details (name, gender, sample rate, language codes)

### Configuration
- **Model**: texttospeech_v1beta1 (supports timepoint generation)
- **Default Voice**: en-US-Standard-C (from TTS_DEFAULT_VOICE_NAME env var)
- **Default Rate**: 1.0, **Default Pitch**: 0.0
- **Credentials**: From FIREBASE_SERVICE_ACCOUNT_KEY_PATH

### Logging
- Uses DEBUG level for TTS_TRACE logs (detailed chunking/SSML info)
- Logs paragraph counts, chunk sizes, timepoint processing

### Pattern
Singleton pattern with functional check via `is_functional()`.

---

## File: `backend/services/stt_service.py`

### Purpose
Google Cloud Speech-to-Text for audio transcription.

### Key Functions

#### `transcribe_audio_bytes(audio_bytes, encoding, sample_rate_hertz, language_code, audio_channel_count, enable_automatic_punctuation, model)`
- **Purpose**: Transcribe audio bytes using non-streaming recognition
- **Encoding Support**: FLAC, LINEAR16 (WAV), MP3, WEBM_OPUS
- **FLAC Handling**: Omits sample_rate and channel_count (derived from header)
- **Returns**: `(success, result_details)` with transcript, confidence, metadata
- **Debug**: Saves audio to `debug_audio/debug_audio_sent_to_api_{timestamp}.{ext}`

#### `transcribe_audio_file(file_path, encoding, sample_rate_hertz, language_code, ...)`
- **Purpose**: Transcribe from file path
- **Process**: Reads file → calls `transcribe_audio_bytes`

#### `transcribe_audio_batch(audio_reference: str) -> dict`
- **Purpose**: Async long-running recognition for GCS URIs
- **Input**: GCS URI (e.g., `gs://bucket/audio.wav`)
- **Returns**: Dict with 'transcript' or 'error'
- **Timeout**: 300 seconds (5 minutes)

#### `streaming_recognize(config, requests_iterator)`
- **Purpose**: Streaming speech recognition
- **Returns**: Iterator of StreamingRecognizeResponse objects

#### `create_streaming_config(...)`
- **Purpose**: Create StreamingRecognitionConfig
- **Returns**: `(success, config)` tuple

### Configuration
- **Default Model**: latest_short (from STT_DEFAULT_MODEL env var)
- **Default Language**: en-US (from STT_DEFAULT_LANGUAGE_CODE env var)
- **Credentials**: From FIREBASE_SERVICE_ACCOUNT_KEY_PATH

### Error Handling
- Validates audio_bytes presence
- Logs detailed config and audio size
- Checks total_billed_time (warns if zero)
- Full traceback on exceptions

### Pattern
Singleton pattern with client availability check.

---

## Summary

### Service Dependencies
```
DocumentRetrievalService
  ├── FirestoreService
  └── StorageService

DocAIService (standalone)

TTSService (standalone)
  └── Uses: backend.utils.text_utils.sanitize_text_for_tts

STTService (standalone)

AuthService (standalone)
```

### Common Patterns
1. **Singleton Pattern**: All services use singleton to ensure single connection
2. **Tuple Returns**: `(success: bool, data_or_error)` pattern for error handling
3. **Environment Configuration**: All services read from .env via os.getenv()
4. **Graceful Degradation**: Services handle initialization failures without crashing app
5. **Comprehensive Logging**: Detailed logging for debugging and monitoring
