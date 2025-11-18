# Backend Routes Analysis

## Overview
The backend routes are organized as Flask blueprints that provide RESTful API endpoints for different functional areas of the LexiAid application. Each blueprint handles authentication, validation, and service coordination for its specific domain.

## Route Files

### 1. document_routes.py

**Purpose**: Comprehensive document management API handling upload, processing, retrieval, deletion, and TTS asset management.

**Key Functions/Components**:

#### Authentication & Helpers
- **_get_user_from_token()**: Firebase ID token verification and user extraction
- **auth_required**: Decorator for protecting routes with authentication
- **allowed_file()**: File extension validation for allowed types

#### Core Endpoints

**POST /api/documents/upload**
- Handles document upload with multi-step processing pipeline
- Supports DUA (Document Understanding Agent) processing for PDF, PNG, JPG, JPEG
- Pre-generates TTS audio and timepoints for processed documents
- Manages GCS storage and Firestore metadata updates
- Handles OCR fallback (deprecated) for other image formats
- Returns comprehensive processing status and metadata

**DELETE /api/documents/<document_id>**
- Secure document deletion with ownership verification
- Cascades deletion from Firestore and Google Cloud Storage
- Handles permission checks and cleanup operations
- Returns 204 No Content on successful deletion

**GET /api/documents**
- Retrieves user's document list with metadata
- Handles datetime serialization for JSON compatibility
- Returns paginated or full document collections

**GET /api/documents/<document_id>**
- Fetches specific document details with optional content inclusion
- Prioritizes content sources: DUA narrative > OCR text > GCS file content
- Handles different document types and processing statuses
- Returns structured document metadata and content

**GET /api/documents/<document_id>/download**
- Provides document download functionality (placeholder implementation)
- Intended to generate temporary download URLs or files
- Requires implementation for actual file serving

**GET /api/documents/<document_id>/tts-assets**
- Generates signed URLs for pre-generated TTS audio and timepoints
- Validates document ownership and asset availability
- Returns secure, time-limited access URLs for TTS resources

#### Processing Pipeline
- **DUA Processing**: Single-call document understanding for eligible formats
- **TTS Pre-generation**: Automatic audio synthesis for processed documents
- **Status Management**: Comprehensive tracking through processing states
- **Error Handling**: Graceful degradation and error reporting

**Inputs**:
- File uploads with metadata (name, content type)
- Document IDs for retrieval and management
- Authentication tokens via Authorization headers

**Outputs/Side Effects**:
- Document metadata and content responses
- GCS file uploads and deletions
- Firestore document creation and updates
- Processing status changes and error reporting

**Dependencies**: Flask, Google Cloud Storage, Firestore, Document AI, TTS Service

---

### 2. tts_routes.py

**Purpose**: Text-to-Speech API endpoints providing voice information and synthesis capabilities.

**Key Functions/Components**:

#### Authentication
- **_get_user_from_token()**: Token verification helper
- **@tts_bp.before_request**: Global authentication for all routes in blueprint

#### Core Endpoints

**GET /api/tts/voices**
- Retrieves available TTS voices from Google Cloud Text-to-Speech
- Supports optional language code filtering
- Returns voice metadata including language, name, and gender
- Handles service availability and error states

**Inputs**:
- Authentication tokens
- Optional language code query parameters

**Outputs/Side Effects**:
- Structured voice listings with metadata
- Error responses for service unavailability

**Dependencies**: Flask, TTS Service, Authentication Service

---

### 3. stt_routes.py

**Purpose**: Speech-to-Text API endpoints for audio transcription and language support information.

**Key Functions/Components**:

#### Authentication
- **_get_user_from_token()**: Token verification with comprehensive error handling

#### Core Endpoints

**POST /api/stt/transcribe**
- Handles audio file transcription using Google Cloud Speech-to-Text
- Supports multiple audio formats: WAV, MP3, FLAC, OGG
- Configurable language codes with default to en-US
- Returns transcription with confidence scores and metadata
- Includes comprehensive error handling and validation

**GET /api/stt/languages**
- Retrieves supported languages for Speech-to-Text processing
- Returns language codes and display names
- Handles service availability and format validation

**Inputs**:
- Audio files via multipart form data
- Language code preferences
- Authentication tokens

**Outputs/Side Effects**:
- Transcription results with confidence scores
- Language support listings
- Detailed error messages for processing failures

**Dependencies**: Flask, STT Service, file handling utilities

---

### 4. user_routes.py

**Purpose**: User profile management API endpoints for retrieving and managing user information.

**Key Functions/Components**:

#### Core Endpoints

**GET /api/users/profile**
- Retrieves comprehensive user profile data
- Combines Firebase Auth data with Firestore profile information
- Prioritizes Auth service data for display names
- Handles missing profiles with fallback to Auth-only data
- Returns structured user information with preferences

**Inputs**:
- Authentication tokens for user identification

**Outputs/Side Effects**:
- Combined user profile data from multiple sources
- Graceful handling of missing profile information
- Error responses for authentication failures

**Dependencies**: Flask, Auth Service, Firestore Service

---

### 5. progress_routes.py

**Purpose**: User progress tracking API endpoints (currently placeholder implementation).

**Key Functions/Components**:

#### Authentication
- **_get_user_from_token()**: Standard token verification helper

#### Core Endpoints

**GET /api/progress**
- Placeholder endpoint for user progress data retrieval
- Intended to fetch learning progress, achievements, and statistics
- Currently returns placeholder response with user identification
- Designed for future implementation of progress tracking features

**Inputs**:
- Authentication tokens for user identification

**Outputs/Side Effects**:
- Placeholder progress responses
- User identification for future progress tracking

**Dependencies**: Flask, Auth Service (planned Firestore integration)

---

### 6. answer_formulation_routes.py (Referenced but not analyzed)

**Purpose**: API endpoints for the Answer Formulation feature that helps students transform spoken thoughts into written answers.

**Note**: This file is referenced in the codebase but was not directly analyzed. Based on the pattern, it would likely handle:
- Answer formulation session management
- Transcript refinement requests
- Edit command processing
- Fidelity validation monitoring

---

## Route Architecture Patterns

### Authentication Strategy
- **Firebase ID Tokens**: All routes use Firebase Authentication for user verification
- **Bearer Token Pattern**: Standard Authorization header with Bearer token format
- **Service Integration**: Token verification through AuthService instances
- **Error Handling**: Comprehensive 401/403 responses for authentication failures

### Blueprint Organization
- **Domain Separation**: Each functional area has its own blueprint
- **URL Prefixing**: Consistent API path structure (/api/documents, /api/tts, etc.)
- **Dependency Injection**: Services accessed via Flask app configuration
- **Middleware Support**: Before request handlers for global authentication

### Error Handling
- **Structured Responses**: Consistent JSON error format with status and message
- **HTTP Status Codes**: Proper use of RESTful status codes (400, 401, 403, 404, 500)
- **Logging Integration**: Comprehensive error logging for debugging
- **Graceful Degradation**: Fallback behaviors for service unavailability

### Data Validation
- **File Type Validation**: Extension and MIME type checking for uploads
- **Input Sanitization**: Secure filename handling and parameter validation
- **Ownership Verification**: User permission checks for resource access
- **Content Type Handling**: Proper processing of different file formats

### Response Patterns
- **Consistent Structure**: Standardized response formats with status, data, and metadata
- **Pagination Support**: Prepared for large dataset handling in list endpoints
- **Content Negotiation**: Optional content inclusion via query parameters
- **Metadata Inclusion**: Processing status, timestamps, and system information

### Service Coordination
- **Multi-Service Operations**: Complex workflows involving multiple backend services
- **Transaction Safety**: Cleanup operations for failed multi-step processes
- **Async Processing**: Background processing for document analysis and TTS generation
- **State Management**: Comprehensive status tracking through processing pipelines

This routing architecture provides a robust, secure, and scalable foundation for the LexiAid application's backend API, with clear separation of concerns and comprehensive error handling throughout.
