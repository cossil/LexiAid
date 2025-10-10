# Backend Main Analysis

## Overview
The backend main entry point (`app.py`) is a Flask-based server that initializes services, LangGraph agents, and routes for the LexiAid AI Tutor application.

## File: `backend/app.py`

### Purpose
- Main Flask application entry point
- Service initialization and dependency injection
- LangGraph agent compilation and management
- Authentication middleware
- WebSocket STT endpoint
- Core chat API endpoint

### Key Components

#### 1. Service Initialization (Lines 106-153)
```python
def initialize_component(component_class, component_name, app_config_key, **kwargs)
```
- **Purpose**: Helper function to safely initialize services
- **Services Initialized**:
  - `AuthService`: Firebase authentication
  - `FirestoreService`: Database operations
  - `StorageService`: GCS file management
  - `DocAIService`: Document AI processing
  - `TTSService`: Text-to-speech synthesis
  - `STTService`: Speech-to-text transcription
  - `DocumentRetrievalService`: Document content retrieval

#### 2. DatabaseManager Class (Lines 208-279)
- **Pattern**: Singleton with thread-safe initialization
- **Responsibilities**:
  - Creates SQLite checkpointers for LangGraph state persistence
  - Compiles three main graphs:
    - `compiled_quiz_graph`: Quiz Engine V2 (from `create_quiz_engine_graph`)
    - `compiled_general_query_graph`: New Chat Graph (from `create_new_chat_graph`)
    - `compiled_supervisor_graph`: Supervisor orchestrator
  - Database paths:
    - `quiz_checkpoints.db`
    - `general_query_checkpoints.db`
    - `supervisor_checkpoints.db`
    - `document_understanding_checkpoints.db`

#### 3. Authentication Decorator (Lines 165-205)
```python
@require_auth
```
- **Purpose**: Validates Firebase ID tokens
- **Process**:
  1. Extracts Bearer token from Authorization header
  2. Verifies token using `AuthService.verify_id_token()`
  3. Stores `user_id` in Flask's `g` object
- **Error Codes**: UNAUTHENTICATED, AUTH_SERVICE_UNAVAILABLE, INVALID_TOKEN_AUTH_SERVICE

#### 4. WebSocket STT Endpoint (Lines 309-369)
```python
@sock.route('/api/stt/stream')
```
- **Purpose**: Real-time speech-to-text streaming
- **Audio Config**:
  - Encoding: WEBM_OPUS
  - Sample rate: 16000 Hz
  - Language: en-US
  - Automatic punctuation: enabled
- **Response Format**: JSON with `is_final`, `transcript`, `stability`

#### 5. Main Chat API Endpoint (Lines 372-666)
```python
@app.route('/api/v2/agent/chat', methods=['POST'])
@require_auth
```
- **Purpose**: Primary agent interaction endpoint
- **Input Modes**:
  - Text queries (JSON)
  - Audio files (multipart/form-data)
  - Client-provided transcripts
- **STT Processing Modes**:
  - `review`: Transcribe only, return transcript
  - `direct_send`: Transcribe and process with agent
- **State Management**:
  - Creates or retrieves thread-based conversation state
  - Manages quiz sessions via `active_quiz_thread_id`
  - Checkpoints state for both main thread and quiz-specific threads
- **Response Fields**:
  - `response`: Agent's text response
  - `final_agent_response`: Structured agent output
  - `thread_id`: Conversation thread identifier
  - `quiz_active`, `quiz_complete`, `quiz_cancelled`: Quiz state flags
  - `audio_content_base64`: TTS audio (base64)
  - `timepoints`: Word-level timing for synchronized TTS

#### 6. TTS Synthesis Route (Lines 676-732)
```python
@app.route('/api/tts/synthesize', methods=['POST'])
@require_auth
```
- **Purpose**: On-demand text-to-speech synthesis
- **Input**: JSON with `text`, optional `voice_name`, `speaking_rate`, `pitch`
- **Output**: Base64-encoded audio + timepoints array
- **Error Handling**: TTSServiceError exceptions

### Dependencies
- **Flask Extensions**: CORS, Flask-Sock (WebSocket)
- **Google Cloud**: Speech, Text-to-Speech, Document AI
- **LangGraph**: StateGraph, SqliteSaver
- **Firebase**: Admin SDK for auth and Firestore

### Configuration
- **CORS**: Allows `http://localhost:5173` (frontend dev server)
- **Port**: 8081 (default, configurable via PORT env var)
- **Debug Mode**: Enabled in development

### Registered Blueprints
1. `document_bp` → `/api/documents`
2. `tts_bp` → `/api/tts`
3. `stt_bp` → `/api/stt`
4. `user_bp` → `/api/users`
5. `progress_bp` → `/api/progress`

### Error Handling
- Comprehensive try-except blocks with error IDs
- Traceback logging to `error_trace.log`
- User-friendly error messages with error codes
- State cleanup on failures

### Key Flows

#### New Chat Flow
1. User sends query → `/api/v2/agent/chat`
2. Supervisor receives input → `receive_user_input_node`
3. Routing decision → `routing_decision_node`
4. Invokes `new_chat_graph` → Returns response
5. TTS synthesis (if enabled)
6. Response with audio + timepoints

#### Quiz Flow
1. User sends `/start_quiz` → `/api/v2/agent/chat`
2. Supervisor detects quiz intent → Routes to `quiz_engine_graph`
3. Quiz generates first question
4. User answers → Evaluation + next question
5. Continues until max questions or completion
6. Final summary with score

### Notes
- The deprecated `AiTutorAgent` (ReAct-based) is no longer used
- All agent functionality now handled by LangGraph supervisor architecture
- Document Understanding Agent (DUA) is invoked from document routes, not supervisor
