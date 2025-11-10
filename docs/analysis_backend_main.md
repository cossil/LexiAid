# Backend Main Entry Point Analysis

## File: backend/app.py

### Purpose
The main Flask application entry point that serves as the central hub for the LexiAid backend API. This file orchestrates all backend services, initializes LangGraph agents, handles WebSocket connections, and provides the primary chat endpoint that routes user requests through the supervisor graph.

### Key Functions/Components

#### 1. Application Initialization
- **Flask App Setup**: Creates Flask application instance with CORS configuration
- **Service Registration**: Initializes and registers all backend services (Auth, Firestore, Storage, DocAI, TTS, STT)
- **Blueprint Registration**: Registers API route blueprints for modular endpoint organization
- **Database Manager**: Thread-safe singleton pattern for managing SQLite checkpointers and compiled LangGraph graphs

#### 2. Authentication System
- **@require_auth Decorator**: JWT token verification middleware that extracts user ID from Firebase tokens
- **Token Validation**: Validates Bearer tokens against Firebase Auth service
- **User Context**: Stores authenticated user ID in Flask's `g` object for request handling

#### 3. LangGraph Integration
- **DatabaseManager Class**: Manages multiple SQLite checkpointers for different graph types
- **Graph Compilation**: Creates compiled instances of:
  - Quiz Engine Graph (V2)
  - New Chat Graph (formerly General Query)
  - Supervisor Graph (main routing orchestrator)
  - Answer Formulation Graph
- **Safe Invoke Wrapper**: Deep-serializes message objects before/after LangGraph invokes for checkpoint compatibility

#### 4. WebSocket Streaming
- **STT Stream Endpoint**: `/api/stt/stream` - Real-time speech-to-text processing
- **Audio Processing**: Handles WebM Opus audio streams with Google Cloud Speech API
- **Bidirectional Communication**: Sends transcription results back to client via WebSocket

#### 5. Main Chat Endpoint
- **Route**: `POST /api/v2/agent/chat`
- **Authentication**: Protected by @require_auth decorator
- **Request Handling**: Supports both JSON and multipart/form-data (for audio uploads)
- **Audio Processing Modes**:
  - `review`: Returns transcription only
  - `direct_send`: Processes transcribed text with supervisor graph
- **Thread Management**: Creates or continues conversation threads with checkpoint persistence

### Inputs

#### HTTP Requests
- **JSON Payload**: `{ query: string, thread_id?: string, documentId?: string }`
- **Multipart Form**: Audio files + metadata (query, thread_id, document_id, stt_processing_mode, transcript)
- **Headers**: Authorization Bearer token (required)

#### Configuration
- **Environment Variables**: Loaded from .env file in backend directory
- **Service Dependencies**: Auth, Firestore, Storage, DocAI, TTS, STT services
- **Graph Dependencies**: Compiled LangGraph graphs with SQLite checkpointers

### Outputs/Side Effects

#### HTTP Responses
- **Success**: JSON responses with agent messages, thread IDs, and metadata
- **Error**: Structured error responses with codes and details
- **Transcription**: Audio transcription results for review mode

#### Database Operations
- **SQLite Checkpointers**: Persistent conversation state storage
- **Firestore Operations**: User data and document metadata via service layer
- **Cloud Storage**: File upload/download operations via service layer

#### Side Effects
- **LangGraph State Updates**: Modifies conversation history and agent states
- **Audio Processing**: Generates transcriptions and potentially TTS responses
- **Thread Creation**: Generates new thread IDs for conversation tracking
- **Service Calls**: Invokes downstream Google Cloud services (Speech, Text-to-Speech, Document AI)

### Dependencies
- **Flask Framework**: Core web server and routing
- **Flask-CORS**: Cross-origin resource sharing
- **Flask-Sock**: WebSocket support for streaming
- **LangGraph**: Agent orchestration and state management
- **Firebase Admin**: Authentication and Firestore integration
- **Google Cloud Services**: Speech, Text-to-Speech, Document AI
- **SQLite**: Local checkpoint storage for conversation persistence

### Error Handling
- **Authentication Errors**: 401 responses for invalid/missing tokens
- **Service Unavailability**: Graceful degradation when services are not initialized
- **Audio Processing Errors**: Detailed error messages for STT failures
- **LangGraph Errors**: Safe invoke wrapper with deep serialization error handling

### Security Considerations
- **Token Verification**: Mandatory JWT validation for all protected endpoints
- **File Upload Security**: Secure filename handling and content type validation
- **CORS Configuration**: Restricted to localhost:5173 for development
- **Input Sanitization**: Form data validation and sanitization

### Performance Features
- **Thread-Safe Design**: Singleton DatabaseManager with concurrent access protection
- **Checkpoint Persistence**: SQLite-based conversation state recovery
- **Streaming**: Real-time audio processing via WebSocket
- **Lazy Loading**: Services initialized on application startup with error handling
