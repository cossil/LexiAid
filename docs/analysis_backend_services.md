# Backend Services Analysis

## Overview
The backend services layer provides a comprehensive set of singleton services that handle all external integrations and data operations for the LexiAid application. Each service follows a consistent pattern with singleton instantiation, error handling, and environment-based configuration.

## Service Files

### 1. __init__.py

**Purpose**: Package initialization file that exports all service classes for centralized imports.

**Key Functions/Components**:
- Imports all service classes: AuthService, FirestoreService, StorageService, DocAIService, DocumentRetrievalService, TTSService, STTService
- Defines `__all__` list for explicit exports

**Inputs**: None
**Outputs/Side Effects**: Makes all service classes available when importing from the services package

---

### 2. auth_service.py

**Purpose**: Handles Firebase Authentication operations including token verification, user management, and authentication-related utilities.

**Key Functions/Components**:
- **verify_id_token()**: Verifies Firebase ID tokens with clock skew tolerance and revocation checking
- **get_user()**: Retrieves user data from Firebase Auth by UID
- **create_user()**: Creates new Firebase Auth users with optional display names
- **update_user()**: Updates existing user properties in Firebase Auth
- **delete_user()**: Deletes users from Firebase Auth
- **generate_email_verification_link()**: Creates email verification links
- **generate_password_reset_link()**: Creates password reset links

**Inputs**:
- Firebase ID tokens for verification
- User data dictionaries for creation/updates
- User IDs for user-specific operations

**Outputs/Side Effects**:
- Returns user data dictionaries or error states
- Modifies Firebase Auth user records
- Generates authentication links for email workflows

**Dependencies**: Firebase Admin SDK, environment variables for service account credentials

---

### 3. firestore_service.py

**Purpose**: Comprehensive Firestore database service managing all data persistence operations including users, documents, folders, tags, interactions, progress tracking, and gamification.

**Key Functions/Components**:

#### User Management
- **get_user()**: Retrieves user profile data
- **create_user()**: Creates new user records with default preferences and gamification
- **update_user()**: Updates user profile information
- **update_user_preferences()**: Manages accessibility and UI preferences

#### Document Management
- **save_document()**: Stores document metadata with timestamps and processing status
- **save_document_content()**: Stores document content in separate collection to avoid size limits
- **get_document()**: Retrieves document metadata
- **get_document_content_from_subcollection()**: Gets content from document_contents collection
- **update_document()**: Updates document metadata
- **delete_document_by_id()**: Securely deletes documents with ownership verification
- **get_user_documents()**: Lists user documents with optional folder filtering

#### Organization Features
- **create_folder()**: Creates folder structures for document organization
- **get_user_folders()**: Retrieves user folder hierarchies
- **create_tag()**: Creates document tags
- **get_user_tags()**: Retrieves user's tag collection

#### Activity Tracking
- **create_interaction()**: Records user-document interactions
- **get_user_interactions()**: Retrieves interaction history
- **create_progress_entry()**: Creates progress tracking records
- **get_user_progress()**: Gets progress data over time periods

#### Gamification
- **update_user_gamification()**: Updates points, streaks, levels, badges
- **add_badge_to_user()**: Awards badges to user profiles

**Inputs**:
- User IDs, document IDs, and various data dictionaries
- Query parameters for filtering and pagination

**Outputs/Side Effects**:
- Returns structured data or error states
- Modifies Firestore collections and documents
- Handles database constraints and validation

**Dependencies**: Google Cloud Firestore, Firebase Admin SDK, environment configuration

---

### 4. storage_service.py

**Purpose**: Manages Google Cloud Storage operations for file uploads, downloads, and organization with user-specific paths and metadata handling.

**Key Functions/Components**:
- **upload_file()**: Uploads files with unique IDs and user organization
- **get_file()**: Downloads files by storage path or GCS URI
- **delete_file()**: Removes files from storage
- **get_signed_url()**: Generates temporary access URLs for private files
- **list_user_files()**: Lists files with prefix filtering
- **get_public_url()**: Constructs public URLs for accessible files
- **copy_file()**: Duplicates files within GCS
- **upload_string_as_file()**: Uploads text content as files
- **upload_bytes_as_file()**: Uploads binary content as files
- **download_file_as_string()**: Downloads files as text content
- **delete_file_from_gcs()**: Deletes files by GCS URI

**Inputs**:
- File content (bytes, strings, or file-like objects)
- Content types and metadata
- User IDs for path organization
- Storage paths and GCS URIs

**Outputs/Side Effects**:
- Returns file metadata, content, or error states
- Modifies GCS bucket contents
- Generates access URLs with expiration

**Dependencies**: Google Cloud Storage, UUID generation, environment configuration

---

### 5. tts_service.py

**Purpose**: Advanced Text-to-Speech service using Google Cloud TTS with chunking, SSML generation, timepoint mapping, and accessibility features for students with learning disabilities.

**Key Functions/Components**:
- **synthesize_text()**: Main synthesis method with chunking for large texts
- **_chunk_text()**: Intelligent text chunking preserving paragraph boundaries
- **_build_ssml_and_map()**: Creates SSML with word-level timepoint markers
- **get_available_voices()**: Lists available TTS voices with metadata
- **is_functional()**: Checks service initialization status
- **_check_client()**: Client availability validation

**Special Features**:
- Paragraph-aware chunking to maintain speech flow
- SSML mark generation for word-level highlighting
- Timepoint mapping for synchronized text highlighting
- Support for various audio encodings (MP3, WAV, etc.)
- Configurable voice parameters (rate, pitch, voice selection)

**Inputs**:
- Text content for synthesis
- Voice configuration parameters
- Audio encoding preferences

**Outputs/Side Effects**:
- Returns audio content with timepoint data
- Generates structured timing information for UI synchronization
- Handles large texts through chunked processing

**Dependencies**: Google Cloud Text-to-Speech, text sanitization utilities, logging

---

### 6. stt_service.py

**Purpose**: Speech-to-Text service providing real-time and batch transcription capabilities with extensive configuration options and debugging features for audio input processing.

**Key Functions/Components**:
- **transcribe_audio_bytes()**: Core transcription for byte data with detailed metadata
- **transcribe_audio_file()**: File-based transcription with format handling
- **transcribe_audio_batch()**: Async batch processing for GCS URIs
- **streaming_recognize()**: Real-time streaming transcription
- **create_streaming_config()**: Configuration for streaming requests
- **get_supported_languages()**: Returns supported language list

**Special Features**:
- Multiple audio format support (FLAC, WAV, MP3, WebM)
- Configurable language models and recognition settings
- Debug audio file saving for troubleshooting
- Detailed transcription metadata including confidence scores
- Batch processing for large audio files
- Streaming capabilities for real-time applications

**Inputs**:
- Audio content (bytes, files, or GCS references)
- Recognition configuration parameters
- Language and model preferences

**Outputs/Side Effects**:
- Returns transcription results with confidence scores
- Provides detailed processing metadata
- Saves debug audio files for troubleshooting
- Handles various audio formats and sources

**Dependencies**: Google Cloud Speech-to-Text, file system operations, logging

---

### 7. doc_ai_service.py

**Purpose**: Document AI service for extracting text content from documents using Google Cloud Document AI, supporting OCR and document understanding for various file types.

**Key Functions/Components**:
- **get_text_from_document()**: Main text extraction method
- Service initialization with processor configuration
- Error handling for content retrieval failures

**Special Features**:
- GCS document processing
- Multiple MIME type support
- Async interface design
- Comprehensive error handling

**Inputs**:
- Document metadata with GCS URI and MIME type
- Processor configuration from environment

**Outputs/Side Effects**:
- Returns extracted text content
- Handles processing errors gracefully
- Logs detailed operation information

**Dependencies**: Google Cloud Document AI, logging utilities

---

### 8. doc_retrieval_service.py

**Purpose**: High-level document retrieval service that coordinates between Firestore and Storage services to provide unified access to document content with multiple fallback strategies.

**Key Functions/Components**:
- **get_document_metadata()**: Retrieves document metadata with error handling
- **get_document_content()**: Multi-source content retrieval with prioritization
- **get_document_text()**: Text-only retrieval with optional user verification
- **chunk_document_text()**: Intelligent text chunking for LLM context windows
- **get_document_chunks()**: Chunked content retrieval for processing
- **get_document_content_for_quiz()**: Optimized content extraction for quiz generation

**Special Features**:
- Multi-source content retrieval (DUA narrative, OCR, GCS, Firestore subcollection)
- User ownership verification
- Intelligent text chunking with overlap
- Content type validation
- Fallback strategies for different storage scenarios

**Content Retrieval Priority**:
1. DUA narrative content (for processed_dua status)
2. OCR text content (for processed status)
3. GCS stored text files
4. Firestore document_contents collection

**Inputs**:
- Document IDs and optional user IDs
- Chunking parameters for text processing
- Content length limits for specific use cases

**Outputs/Side Effects**:
- Returns structured content with source tracking
- Provides text chunks for LLM processing
- Handles access control and ownership verification

**Dependencies**: FirestoreService, StorageService, text processing utilities

---

## Service Architecture Patterns

### Singleton Pattern
All services implement singleton patterns to ensure:
- Single connection instance per service
- Resource efficiency
- Consistent state management
- Thread-safe initialization

### Error Handling
Consistent error handling across all services:
- Graceful degradation when services are unavailable
- Detailed error logging for debugging
- Structured error responses
- Exception catching with informative messages

### Environment Configuration
All services rely on environment variables for:
- Authentication credentials
- Service endpoints and configuration
- Feature flags and defaults
- Security parameters

### Service Dependencies
Services are designed with clear dependency hierarchy:
- AuthService: Standalone Firebase integration
- StorageService: Standalone GCS integration
- FirestoreService: Standalone Firestore integration
- DocAIService: Standalone Document AI integration
- TTSService/STTService: Standalone Google Cloud AI services
- DocumentRetrievalService: Coordinates Firestore and Storage services

This modular design allows for partial functionality when some services are unavailable and supports independent testing and maintenance of each service component.
