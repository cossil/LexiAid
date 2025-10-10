# LexiAid: Complete Codebase Analysis
**Generated:** 2025-09-30  
**Purpose:** Foundational source of truth for the LexiAid project architecture

---

## Executive Summary

LexiAid is an intelligent, auditory-first learning platform for students with severe learning disabilities. The application features:
- **Frontend:** React + TypeScript with Vite, TailwindCSS, Firebase Auth
- **Backend:** Python Flask with LangGraph-based multi-agent architecture
- **Cloud Services:** Google Cloud Platform (Vertex AI, Firestore, Cloud Storage, Document AI, TTS/STT)
- **Architecture:** Supervisor pattern with specialized agent graphs for chat, quiz, and document understanding

---

## Section 1: Static Codebase Analysis

### Backend Core (`backend/app.py`)

**Purpose:** Main Flask application entry point, initializes all services, graphs, and routes.

**Key Functions / Components:**
* `DatabaseManager` class: Singleton managing SQLite checkpointers for LangGraph state persistence
* `initialize_component()`: Helper for service/tool initialization with error handling
* `require_auth()` decorator: JWT token verification for protected routes
* `agent_chat_route()`: Primary API endpoint (`POST /api/v2/agent/chat`) routing all user interactions through supervisor

**Inputs:**
* Environment variables: `GCP_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY_PATH`, `GCS_BUCKET_NAME`, `DOCUMENT_AI_LOCATION`, `LAYOUT_PROCESSOR_ID`
* HTTP requests with JWT Bearer tokens
* Multipart form data for audio/file uploads, JSON for text queries

**Outputs / Side Effects:**
* Initializes Firebase Admin SDK, Google Cloud clients
* Creates compiled LangGraph instances with checkpointers
* Registers Flask blueprints for routes
* Invokes supervisor graph for all agent interactions
* Returns JSON responses with agent outputs, TTS audio, and state information

---

### Supervisor Graph (`backend/graphs/supervisor/`)

#### `graph.py`

**Purpose:** Orchestrates routing between specialized agent graphs based on user intent.

**Key Functions / Components:**
* `create_supervisor_graph()`: Factory function creating compiled supervisor with checkpointer
* `route_based_on_decision()`: Conditional routing function determining next graph to invoke

**Inputs:**
* `SupervisorState` TypedDict with user query, conversation history, document context
* Compiled subgraph instances (chat, quiz, document understanding)
* `DocumentRetrievalService` for fetching document content

**Outputs / Side Effects:**
* Routes to `new_chat_graph`, `quiz_engine_graph`, or `document_understanding_graph`
* Updates supervisor state with routing decisions
* Manages quiz session lifecycle and thread IDs

#### `state.py`

**Purpose:** Defines the central state schema for the supervisor graph.

**Key Components:**
* `SupervisorState` TypedDict: Contains `user_id`, `current_query`, `conversation_history`, `document_id_for_action`, `next_graph_to_invoke`, `final_agent_response`, quiz state fields, audio input fields, DUA state fields

**Inputs:** Receives state updates from routing and invoker nodes

**Outputs:** Provides unified state structure across all supervisor operations

#### `nodes_routing.py`

**Purpose:** Implements routing logic nodes for the supervisor.

**Key Functions:**
* `receive_user_input_node()`: Processes user input, performs STT if needed, makes preliminary routing decision
* `routing_decision_node()`: Refines routing, handles quiz start/cancel, fetches document snippets for quiz

**Inputs:**
* `SupervisorState` with current query and audio data
* `DocumentRetrievalService` for document content retrieval

**Outputs / Side Effects:**
* Updates state with transcribed query (if audio input)
* Sets `next_graph_to_invoke` field
* Fetches document snippets for quiz generation
* Manages quiz activation flags

#### `nodes_invokers.py`

**Purpose:** Implements nodes that invoke specialized subgraphs.

**Key Functions:**
* `invoke_new_chat_graph_node()`: Invokes chat graph for general Q&A
* `invoke_quiz_engine_graph_node()`: Invokes quiz graph for quiz generation/interaction
* `invoke_document_understanding_graph_node()`: Invokes DUA graph for document analysis

**Inputs:**
* `SupervisorState` with relevant context
* Compiled graph instances passed via `functools.partial`

**Outputs / Side Effects:**
* Invokes subgraphs with appropriate state transformations
* Aggregates results back into supervisor state
* Manages thread IDs for subgraph checkpointing

---

### New Chat Graph (`backend/graphs/new_chat_graph.py`)

**Purpose:** Handles general conversational Q&A about documents using LLM.

**Key Functions / Components:**
* `GeneralQueryState` TypedDict: State for chat interactions
* `call_chat_llm_node()`: Primary node invoking `gemini-2.5-flash` for responses
* `distill_conversation_history()`: Summarizes recent conversation for context
* `create_new_chat_graph()`: Factory function returning compiled graph

**Inputs:**
* User query, document ID, conversation history
* `DocumentRetrievalService` for fetching document content

**Outputs / Side Effects:**
* Generates LLM response based on document content and conversation history
* Updates conversation messages
* Returns response text and error messages

---

### Quiz Engine Graph (`backend/graphs/quiz_engine_graph.py`)

**Purpose:** Manages quiz lifecycle: generation, evaluation, and completion.

**Key Functions / Components:**
* `QuizEngineState` TypedDict: Tracks quiz progress, questions, score, history
* `LLMQuizResponse` Pydantic model: Structured LLM output for quiz questions/feedback
* `call_quiz_engine_node()`: Core node handling question generation and answer evaluation
* `create_quiz_engine_graph()`: Factory function returning compiled graph

**Inputs:**
* Document content snippet, user answers, quiz history
* Uses `gemini-2.5-flash` model with temperature 0.7 for generation, 0.3 for evaluation

**Outputs / Side Effects:**
* Generates multiple-choice questions with options and correct answers
* Evaluates user answers and provides feedback
* Tracks score and quiz completion status
* Returns structured question data and feedback for frontend display

---

### Document Understanding Graph (`backend/graphs/document_understanding_graph.py`)

**Purpose:** Analyzes document structure for dyslexia-friendly processing (placeholder implementation).

**Key Functions / Components:**
* `DocumentUnderstandingState` TypedDict: Tracks document processing state
* `initialize_processing_node()`: Validates inputs
* `fetch_detailed_layout_node()`: Uses `AdvancedDocumentLayoutTool` for layout extraction
* `analyze_structure_and_visuals_node()`: Analyzes structure (placeholder)
* `enhance_text_and_context_node()`: Enhances text for accessibility (placeholder)
* `compile_output_node()`: Finalizes structured output
* `create_document_understanding_graph()`: Factory function

**Inputs:**
* Document ID, GCS URI, MIME type
* `AdvancedDocumentLayoutTool` instance

**Outputs / Side Effects:**
* Produces structured document representation (currently simulated)
* Generates user-facing summary
* Stores processing log and error messages

---

### Services Layer

#### `FirestoreService` (`backend/services/firestore_service.py`)

**Purpose:** Manages all Firestore database operations.

**Key Functions:**
* `get_user()`, `create_user()`, `update_user()`: User management
* `save_document()`, `get_document()`, `update_document()`, `delete_document_by_id()`: Document CRUD
* `get_user_documents()`: Fetches user's document list
* `save_document_content()`, `get_document_content_from_subcollection()`: Manages document content in separate collection

**Inputs:**
* Firebase service account credentials from environment
* User IDs, document IDs, data dictionaries

**Outputs / Side Effects:**
* Connects to named Firestore database (`ai-tutor-dev-457802`)
* Performs CRUD operations on `users`, `documents`, `document_contents` collections
* Returns document data with timestamps and metadata

#### `StorageService` (`backend/services/storage_service.py`)

**Purpose:** Manages Google Cloud Storage file operations.

**Key Functions:**
* `upload_file()`: Uploads binary files to GCS with user-organized paths
* `get_file()`: Downloads files from GCS, handles full GCS URIs
* `delete_file()`, `delete_file_from_gcs()`: Removes files from storage
* `upload_string_as_file()`: Uploads text content as files (for JSON, layouts)
* `download_file_as_string()`: Retrieves file content as string

**Inputs:**
* GCS bucket name from environment
* File content (binary or string), user IDs, file paths/URIs

**Outputs / Side Effects:**
* Uploads to `gs://{bucket_name}/{user_id}/{filename}` structure
* Returns GCS URIs and file metadata
* Handles blob operations with error logging

#### `DocumentRetrievalService` (`backend/services/doc_retrieval_service.py`)

**Purpose:** Coordinates document content retrieval from Firestore and GCS.

**Key Functions:**
* `get_document_metadata()`: Fetches document metadata from Firestore
* `get_document_content()`: Retrieves content prioritizing DUA narrative > OCR text > GCS file
* `get_document_text()`: Returns plain text content with optional user verification
* `chunk_document_text()`: Splits text into overlapping chunks for LLM context
* `get_document_content_for_quiz()`: Fetches snippet for quiz generation

**Inputs:**
* Document IDs, user IDs
* `FirestoreService` and `StorageService` instances

**Outputs / Side Effects:**
* Returns document content from multiple sources with priority logic
* Handles image files (returns error for non-text content)
* Provides chunked text for large documents

#### `TTSService` (`backend/services/tts_service.py`)

**Purpose:** Converts text to speech using Google Cloud TTS with timepoint synchronization.

**Key Functions:**
* `synthesize_text()`: Main TTS function with chunking and SSML generation
* `_chunk_text()`: Splits text preserving paragraph boundaries
* `_build_ssml_and_map()`: Creates SSML with mark tags for word-level timepoints

**Inputs:**
* Text content, voice parameters (name, rate, pitch)
* Uses `gemini-2.5-flash-preview-05-20` model
* Service account credentials

**Outputs / Side Effects:**
* Returns audio content (MP3 bytes) and timepoints array
* Generates paragraph break markers for frontend highlighting
* Handles large texts via chunking (max 2500 chars per chunk)
* Uses `texttospeech_v1beta1` for timepoint support

#### `AuthService` (`backend/services/auth_service.py`)

**Purpose:** Handles Firebase Authentication token verification.

**Key Functions:**
* `verify_id_token()`: Verifies JWT tokens with clock skew tolerance
* `get_user()`: Fetches user data from Firebase Auth
* `create_user()`, `update_user()`, `delete_user()`: User management operations

**Inputs:**
* Firebase ID tokens from Authorization headers
* Firebase service account credentials

**Outputs / Side Effects:**
* Returns user data (`uid`, `email`, `emailVerified`, etc.)
* Handles token expiration, revocation, and invalid token errors
* Allows 60-second clock skew for token validation

---

### Routes Layer

#### `document_routes.py` (`backend/routes/document_routes.py`)

**Purpose:** Blueprint for document management API endpoints.

**Key Routes:**
* `POST /api/documents/upload`: Uploads document, triggers DUA or OCR processing
* `GET /api/documents`: Lists user's documents
* `GET /api/documents/<id>`: Fetches document details with optional content
* `DELETE /api/documents/<id>`: Deletes document and GCS file
* `GET /api/documents/<id>/download`: Downloads original file

**Inputs:**
* Multipart form data for file uploads
* JWT tokens for authentication
* Document IDs in URL parameters

**Outputs / Side Effects:**
* Saves documents to Firestore and GCS
* Triggers DUA processing for eligible files (PDF, images)
* Falls back to OCR if DUA fails
* Returns document metadata and processing status

#### `tts_routes.py`, `stt_routes.py`, `user_routes.py`, `progress_routes.py`

**Purpose:** Additional API blueprints for TTS, STT, user management, and progress tracking (not detailed in this analysis but present in codebase).

---

## Section 2: Dynamic Feature Trace Analysis

### 2.1 Frontend Entry Point & Routing

**Entry Point:** `src/main.tsx` renders `<App />` component

**Main App Component:** `src/App.tsx`
- Wraps application with `AuthProvider`, `AccessibilityProvider`
- Implements `UserInteractionGateway` for audio initialization
- Defines `AppRoutes` component with route configuration

**Route Table:**

| Route Path | Page Component | Brief Description |
|------------|----------------|-------------------|
| `/` | `LandingPage.tsx` | Public landing page |
| `/auth/signin` | `SignIn.tsx` | User sign-in page |
| `/auth/signup` | `SignUp.tsx` | User registration page |
| `/auth/reset-password` | `ResetPassword.tsx` | Password reset page |
| `/dashboard` | `DashboardLayout.tsx` (Outlet) | Protected dashboard container |
| `/dashboard` (index) | `Dashboard.tsx` | Dashboard home |
| `/dashboard/upload` | `DocumentUpload.tsx` | Document upload interface |
| `/dashboard/documents` | `DocumentsList.tsx` | List of user documents |
| `/dashboard/documents/:id` | `DocumentView.tsx` | Document viewer with tabs (Read, Chat, Quiz) |
| `/dashboard/chat` | `ChatPage.tsx` | Chat interface with AI Tutor |
| `/dashboard/settings` | `Settings.tsx` | User settings page |
| `/dev/deprecation-showcase` | `DeprecationShowcase.tsx` | Dev-only deprecation testing (DEV mode only) |

---

### 2.2 Frontend-to-Backend API Trace

#### **Page: `ChatPage.tsx`**

**Interaction 1:** User sends text message
- **Component & Function:** `ChatPage.tsx` -> `handleSendMessage()`
- **API Call:** `POST /api/v2/agent/chat`
- **Payload:** `{ query: string, documentId?: string, thread_id?: string }`
- **Response:** `{ agent_response, thread_id, is_quiz, audio_content_base64, timepoints, options }`

**Interaction 2:** User sends audio message
- **Component & Function:** `ChatPage.tsx` -> `handleAudioSend()`
- **API Call:** `POST /api/v2/agent/chat` (multipart/form-data)
- **Payload:** FormData with `audio_file`, `document_id`, `thread_id`, optional `transcript`
- **Response:** Same as text message

**Interaction 3:** User starts quiz
- **Component & Function:** `ChatPage.tsx` -> `handleStartQuiz()`
- **API Call:** `apiService.chat('/start_quiz', documentId, undefined)`
- **Underlying:** `POST /api/v2/agent/chat` with query `/start_quiz`

#### **Page: `DocumentView.tsx`**

**Interaction 1:** Fetch document details
- **Component & Function:** `DocumentView.tsx` -> `useEffect` -> `fetchDocument()`
- **API Call:** `GET /api/documents/:id?include_content=true`
- **Payload:** JWT token in Authorization header
- **Response:** Document metadata with content field

**Interaction 2:** Download document
- **Component & Function:** `DocumentView.tsx` -> `handleDownload()`
- **API Call:** `GET /api/documents/:id/download`
- **Response:** Binary file blob

**Interaction 3:** Navigate to chat/quiz
- **Component & Function:** `DocumentView.tsx` -> Tab click handlers
- **Navigation:** `navigate(/dashboard/chat?document=${id})` or `navigate(/dashboard/chat?document=${id}&start_quiz=true)`
- **No direct API call:** Navigation triggers ChatPage mount which then calls API

#### **Page: `DocumentsList.tsx`**

**Interaction 1:** Fetch documents list
- **API Call:** `GET /api/documents`
- **Response:** Array of document metadata

**Interaction 2:** Delete document
- **API Call:** `DELETE /api/documents/:id`
- **Response:** 204 No Content on success

#### **Page: `DocumentUpload.tsx`**

**Interaction:** Upload document
- **API Call:** `POST /api/documents/upload` (multipart/form-data)
- **Payload:** FormData with `file` and optional `name`
- **Response:** `{ document_id, filename, status, dua_processed, ocr_processed }`

---

### 2.3 Backend API to LangGraph Supervisor Trace

#### **Endpoint: `POST /api/v2/agent/chat`**

**Handler Function:** `agent_chat_route()` in `backend/app.py`

**Logic Flow:**
1. **Authentication:** Extracts JWT token via `@require_auth` decorator, validates with `AuthService.verify_id_token()`, stores `user_id` in `g.user_id`
2. **Input Processing:**
   - Determines content type (multipart/form-data for audio, application/json for text)
   - Extracts `query`, `thread_id`, `document_id` from request
   - If audio present and mode is 'review': transcribes via `STTService` and returns transcript immediately
   - If audio present and mode is 'direct_send': transcribes and uses as `effective_query`
3. **State Construction:**
   - Creates or retrieves `thread_id`
   - If new thread: constructs initial `SupervisorState` with empty history
   - If existing thread: retrieves checkpoint via `compiled_supervisor_graph.get_state(config)`, extracts conversation history
4. **Supervisor Invocation:**
   - Calls `compiled_supervisor_graph.invoke(supervisor_input, config=config)`
   - Config includes `{"configurable": {"thread_id": thread_id, "user_id": user_id}}`
5. **Quiz Thread Management:**
   - If quiz is active with dedicated thread ID different from request thread ID, explicitly checkpoints state under quiz thread ID via `compiled_supervisor_graph.update_state()`
6. **Response Generation:**
   - Extracts `final_agent_response` from supervisor result
   - Serializes conversation history (converts LangChain messages to dicts)
   - Generates TTS audio for response using `TTSService.synthesize_text()`
   - Returns JSON with `response`, `thread_id`, quiz state flags, `audio_content_base64`, `timepoints`

**Invokes LangGraph Agent:** `compiled_supervisor_graph.invoke(supervisor_input, config)`

---

### 2.4 Supervisor & Agent Logic to Service Trace

#### **Supervisor Routing Logic**

The supervisor graph (`backend/graphs/supervisor/graph.py`) routes requests based on:
1. **Active Quiz State:** If `is_quiz_v2_active=True`, routes to `quiz_engine_graph`
2. **Query Keywords:**
   - Document understanding queries (detected by `is_document_understanding_query()`) → `document_understanding_graph`
   - Quiz start queries (detected by `is_quiz_start_query()`) → `quiz_engine_graph`
3. **Default:** Routes to `new_chat_graph` for general Q&A

#### **Agent to Service Mapping**

| Supervisor Route/Condition | Target Agent Node | Agent's Purpose | Services Used | Key Service Functions Called |
|----------------------------|-------------------|-----------------|---------------|------------------------------|
| `is_quiz_v2_active=True` OR `is_quiz_start_query()` | `quiz_engine_graph` | Generates and manages interactive quizzes | `DocumentRetrievalService` | `get_document_content_for_quiz()` |
| Default / general query | `new_chat_graph` | Handles conversational Q&A about documents | `DocumentRetrievalService` | `get_document_content()` |
| `is_document_understanding_query()` | `document_understanding_graph` | Analyzes document structure for accessibility | `AdvancedDocumentLayoutTool`, `StorageService` | `process_document_layout()`, `get_file()` |
| Quiz answer evaluation | `quiz_engine_graph` (continued) | Evaluates answers, provides feedback, generates next question | None (uses LLM directly) | N/A (internal LLM processing) |
| Chat with document context | `new_chat_graph` | Retrieves document, generates contextual response | `DocumentRetrievalService` | `get_document_content()` |
| Document upload processing | `document_routes.py` → `run_dua_processing_for_document()` | Processes uploaded documents with DUA or OCR | `StorageService`, `FirestoreService`, `DocAIService` (via tool) | `upload_file()`, `save_document()`, `update_document()` |

#### **Service Dependency Graph**

```
SupervisorGraph
├── new_chat_graph
│   └── DocumentRetrievalService
│       ├── FirestoreService (get_document, get_document_content_from_subcollection)
│       └── StorageService (get_file)
├── quiz_engine_graph
│   └── DocumentRetrievalService (get_document_content_for_quiz)
│       └── [same as above]
└── document_understanding_graph
    ├── AdvancedDocumentLayoutTool
    │   └── Google Document AI Client
    └── StorageService (get_file)

agent_chat_route (app.py)
├── AuthService (verify_id_token)
├── STTService (transcribe_audio_bytes)
├── TTSService (synthesize_text)
└── SupervisorGraph (invoke)

document_routes.py
├── AuthService (verify_id_token via decorator)
├── FirestoreService (save_document, update_document, get_document, delete_document_by_id)
├── StorageService (upload_file, get_file, delete_file_from_gcs)
└── run_dua_processing_for_document (async DUA processing)
```

---

## Section 3: Critical Architecture Patterns

### 1. **LangGraph Supervisor Pattern**
- Central supervisor graph routes requests to specialized subgraphs
- Each subgraph has its own state schema and checkpointer
- Supervisor manages conversation history and thread IDs
- Subgraphs are instantiated via factory functions accepting checkpointers

### 2. **Singleton Services**
- All service classes use singleton pattern (`__new__` method)
- Ensures single connection to Firebase, GCS, etc.
- Services initialized at app startup in `app.py`

### 3. **State Persistence with Checkpointers**
- SQLite-based checkpointers for each graph type
- Thread IDs used as checkpoint keys
- Allows conversation continuity across requests
- Quiz sessions use dedicated thread IDs separate from chat threads

### 4. **Document Content Priority**
- Priority order: DUA narrative > OCR text > GCS file content
- Implemented in `DocumentRetrievalService.get_document_content()`
- Handles different document processing states

### 5. **TTS Synchronization**
- SSML marks for word-level timepoints
- Paragraph break markers for frontend highlighting
- Chunking for large documents with timepoint adjustment
- Frontend uses timepoints for synchronized text highlighting

### 6. **Authentication Flow**
- Firebase Auth JWT tokens in Authorization headers
- `@require_auth` decorator validates tokens
- User ID stored in Flask's `g` object for request context
- Clock skew tolerance (60 seconds) for token validation

---

## Section 4: Key Integration Points

### Frontend ↔ Backend
- **API Base URL:** `import.meta.env.VITE_BACKEND_API_URL` (default: `http://localhost:8000`)
- **Authentication:** JWT tokens from Firebase Auth, sent in `Authorization: Bearer <token>` header
- **API Service:** `src/services/api.ts` provides typed methods for all backend calls
- **State Management:** React Context API for auth, accessibility, document, quiz state

### Backend ↔ Google Cloud
- **Firestore:** Named database `ai-tutor-dev-457802`, collections: `users`, `documents`, `document_contents`
- **Cloud Storage:** Bucket from `GCS_BUCKET_NAME` env var, organized by user ID
- **Vertex AI:** `gemini-2.5-flash` model for chat and quiz, accessed via `ChatGoogleGenerativeAI`
- **Document AI:** Layout processor for document structure analysis (via `AdvancedDocumentLayoutTool`)
- **TTS/STT:** Google Cloud Speech services with service account credentials

### LangGraph Checkpointing
- **Database Files:** `quiz_checkpoints.db`, `general_query_checkpoints.db`, `supervisor_checkpoints.db`, `document_understanding_checkpoints.db` in `backend/` directory
- **Thread ID Format:** `thread_{user_id}_{uuid}`, `quiz_v2_thread_{user_id}_{document_id}_{uuid}`
- **State Retrieval:** `graph.get_state(config)` where `config = {"configurable": {"thread_id": thread_id}}`

---

## Section 5: Environment Configuration

### Required Environment Variables

**Backend (`backend/.env`):**
```
GCP_PROJECT_ID=ai-tutor-dev-457802
FIREBASE_SERVICE_ACCOUNT_KEY_PATH=../secrets/ai-tutor-dev-457802-firebase-adminsdk-fbsvc-6c2f290e56.json
GCS_BUCKET_NAME=<your-bucket-name>
FIRESTORE_DATABASE_NAME=ai-tutor-dev-457802
DOCUMENT_AI_LOCATION=us
LAYOUT_PROCESSOR_ID=<your-processor-id>
GOOGLE_API_KEY=<your-api-key>
TTS_DEFAULT_VOICE_NAME=en-US-Standard-C
TTS_DEFAULT_SPEAKING_RATE=1.0
TTS_DEFAULT_PITCH=0.0
```

**Frontend (`/.env`):**
```
VITE_BACKEND_API_URL=http://localhost:5000
VITE_FIREBASE_API_KEY=<your-firebase-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-tutor-dev-457802
VITE_FIREBASE_STORAGE_BUCKET=<your-project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<your-sender-id>
VITE_FIREBASE_APP_ID=<your-app-id>
```

---

## Section 6: Testing & Development

### Running the Application

**Backend:**
```bash
cd C:\Ai\aitutor_37\backend
flask --app app.py --debug run --port 5000
```

**Frontend:**
```bash
cd C:\Ai\aitutor_37
npm run dev
```

**Access:** Frontend at `http://localhost:5173`, Backend at `http://localhost:5000`

### Key Testing Scenarios

1. **Document Upload Flow:** Upload → DUA/OCR Processing → View in DocumentView
2. **Chat Flow:** Select document → Navigate to chat → Send message → Receive response with TTS
3. **Quiz Flow:** Select document → Start quiz → Answer questions → Receive feedback → Complete quiz
4. **Audio Input:** Use microphone in chat → Transcribe → Process → Respond
5. **TTS Playback:** Click speaker icon → Play audio → Synchronized text highlighting

---

## Section 7: Known Issues & Technical Debt

### From Memories & Code Analysis

1. **Deprecated Code Present:** Archive folder contains old implementations (`general_query_graph.py`, `quiz_graph.py`)
2. **DUA Implementation:** Document Understanding Agent has placeholder nodes, not fully implemented
3. **Import Patterns:** Mix of relative and absolute imports, resolved by adding project root to `sys.path`
4. **Error Handling:** Some error paths don't clean up resources (e.g., GCS files on Firestore failure)
5. **Checkpoint Database Location:** SQLite files created in `backend/` instead of `backend/data/db/`
6. **Test Coverage:** Limited automated tests, primarily manual testing workflows

---

## Appendix A: File Purpose Quick Reference

### Backend Python Files
- `app.py`: Main Flask app, service initialization, primary API endpoint
- `graphs/supervisor/`: Supervisor orchestration logic
- `graphs/new_chat_graph.py`: General Q&A agent
- `graphs/quiz_engine_graph.py`: Quiz generation and management
- `graphs/document_understanding_graph.py`: Document structure analysis (placeholder)
- `services/*.py`: Singleton services for Firebase, GCS, TTS, STT, Auth, Document retrieval
- `routes/*.py`: Flask blueprints for API endpoints
- `tools/advanced_document_layout_tool.py`: Document AI integration

### Frontend TypeScript/React Files
- `main.tsx`: React app entry point
- `App.tsx`: Root component with routing and providers
- `pages/*.tsx`: Page components for each route
- `components/*.tsx`: Reusable UI components
- `contexts/*.tsx`: React Context providers for global state
- `services/api.ts`: Typed API client for backend communication
- `hooks/*.ts`: Custom React hooks (TTS player, audio recorder)

### Configuration Files
- `package.json`: Frontend dependencies and scripts
- `requirements.txt`: Backend Python dependencies
- `vite.config.ts`: Vite build configuration
- `tsconfig.json`: TypeScript compiler options
- `firebase.json`: Firebase hosting/deployment config
- `docker-compose.yml`, `Dockerfile.frontend`: Containerization (if used)

---

**End of Full Codebase Analysis**
