# LexiAid: Full End-to-End Codebase Analysis

This document provides a comprehensive, read-only analysis of the entire LexiAid project codebase. It serves as a foundational "source of truth" to map the complete architecture, prevent regressions, and enable safe, informed future development.

---

## Section 1: Static Codebase Analysis

This section provides a detailed, file-by-file breakdown of the project's components, serving as a dictionary of the codebase.

---
### **File Path:** `c:\Ai\aitutor_37\backend\app.py`

**Purpose:**
*The main Flask application entry point, responsible for initializing services, configuring the app, registering API blueprints, and defining the primary agent interaction endpoint.*

**Key Functions / Components:**
*   `app = Flask(__name__)`: The main Flask application object.
*   `initialize_component()`: A helper function to initialize and register services and tools (e.g., `AuthService`, `FirestoreService`, `AdvancedDocumentLayoutTool`) into the app's config.
*   `require_auth()`: A decorator that protects endpoints by verifying a Firebase JWT token from the `Authorization` header.
*   `DatabaseManager`: A singleton class that initializes and manages SQLite database connections and creates compiled `LangGraph` checkpointers (`SqliteSaver`) for all agent graphs. It also instantiates the compiled graphs.
*   `agent_chat_route()` mapped to `POST /api/v2/agent/chat`: The core API endpoint. It handles both JSON and `multipart/form-data` requests (for audio uploads), processes the user query, constructs the initial `SupervisorState`, and invokes the `compiled_supervisor_graph`.

**Inputs:**
*   HTTP `POST` requests to `/api/v2/agent/chat` and other blueprint routes.
*   For `/api/v2/agent/chat`: JSON body or form data containing `query`, `thread_id`, `document_id`, and optional audio files.
*   Environment variables from `.env` for configuration.

**Outputs / Side Effects:**
*   Initializes and configures all backend services and AI graphs.
*   Registers API blueprints (`document_bp`, `tts_bp`, `stt_bp`, etc.).
*   Invokes the `supervisor_graph` to process user requests.
*   Returns JSON responses to the frontend, including the agent's text response, TTS audio, and state information.
*   Creates and writes to SQLite database files (e.g., `supervisor_checkpoints.db`) for graph state persistence.

---
### **File Path:** `c:\Ai\aitutor_37\backend\graphs\supervisor\graph.py`

**Purpose:**
*Defines the master `LangGraph` orchestrator that routes tasks to specialized sub-agents based on user intent.*

**Key Functions / Components:**
*   `create_supervisor_graph()`: A factory function that constructs and compiles the main supervisor graph. It defines the graph's structure, nodes, and conditional routing logic.
*   `routing_decision_node`: A node that inspects the `SupervisorState` to determine which specialized agent (e.g., chat, quiz, document understanding) should handle the current user query.
*   `invoke_*_graph_node()`: A series of nodes (`invoke_new_chat_graph_node`, `invoke_quiz_engine_graph_node`, etc.) that act as wrappers to call the respective compiled sub-graphs.
*   `route_based_on_decision()`: A conditional function that directs the graph's flow to the node chosen by the `routing_decision_node`.

**Inputs:**
*   Receives a `SupervisorState` object, which contains the user's query, conversation history, document context, and current state flags (e.g., `quiz_active`).
*   Accepts compiled instances of sub-graphs (e.g., `compiled_document_understanding_graph_instance`) as arguments during its creation.

**Outputs / Side Effects:**
*   Invokes one of the specialized sub-graphs (`NewChatGraph`, `QuizEngineGraph`, `DocumentUnderstandingGraph`).
*   Updates the `SupervisorState` with the results from the invoked sub-graph.
*   Returns the final, mutated `SupervisorState` object, which includes the `final_agent_response` to be sent to the user.

---
### **File Path:** `c:\Ai\aitutor_37\backend\routes\document_routes.py`

**Purpose:**
*Defines all API endpoints related to document management, including upload, deletion, listing, and retrieval.*

**Key Functions / Components:**
*   `document_bp`: The Flask `Blueprint` for all routes under `/api/documents`.
*   `upload_document()` (`POST /upload`): Orchestrates the entire document ingestion workflow. It creates a record in Firestore, uploads the raw file to GCS, and triggers the `DocumentUnderstandingAgent` (DUA) graph for processing. It then updates the Firestore record with the final status and any extracted content.
*   `delete_document()` (`DELETE /<document_id>`): Deletes a document record from Firestore and its corresponding file from Google Cloud Storage.
*   `get_documents()` (`GET /`): Fetches a list of all documents belonging to the authenticated user.
*   `get_document_details()` (`GET /<document_id>`): Retrieves the metadata for a single document. If `include_content=true` is passed as a query parameter, it also fetches the document's text content using the `DocumentRetrievalService` logic.

**Inputs:**
*   HTTP requests with appropriate methods and paths (e.g., `POST /upload`).
*   Requires a valid JWT in the `Authorization` header for all endpoints.
*   The upload endpoint expects `multipart/form-data` containing the file.

**Outputs / Side Effects:**
*   Interacts heavily with `FirestoreService` to create, update, and delete document records.
*   Interacts with `StorageService` to upload and delete files in GCS.
*   Invokes the `DocumentUnderstandingAgent` graph asynchronously during upload.
*   Returns JSON data representing document lists or details, or a file blob for downloads.

---
### **File Path:** `c:\Ai\aitutor_37\backend\services\doc_retrieval_service.py`

**Purpose:**
*Provides a unified, abstracted interface for retrieving the text content of a document, regardless of where or how it's stored.*

**Key Functions / Components:**
*   `DocumentRetrievalService`: A singleton class that coordinates between `FirestoreService` and `StorageService`.
*   `get_document_content()`: The core method. It fetches document metadata from Firestore and then retrieves content based on a priority system: 1) DUA narrative content (`dua_narrative_content` field), 2) OCR text (`ocr_text_content` field), 3) raw text from GCS. It includes logic to avoid trying to decode image files as text.
*   `get_document_text()`: A convenience wrapper around `get_document_content` that returns only the string content.
*   `get_document_content_for_quiz()`: Retrieves a snippet of the document's text, intended for use in quiz generation to limit context size.

**Inputs:**
*   A `document_id` to identify the document to be retrieved.
*   Optionally, a `user_id` to verify ownership.

**Outputs / Side Effects:**
*   Reads data from Firestore to get document metadata.
*   Reads file objects from Google Cloud Storage.
*   Returns a tuple containing a success flag and a dictionary with the document's text content and its source (e.g., `firestore_dua_narrative`, `gcs`).

---
### **File Path:** `c:\Ai\aitutor_37\backend\tools\advanced_document_layout_tool.py`

**Purpose:**
*Provides a tool for the LangGraph agents to interact with Google Cloud's Document AI API, specifically for detailed layout analysis.*

**Key Functions / Components:**
*   `AdvancedDocumentLayoutTool`: A class that wraps the Google Document AI client.
*   `_initialize()`: Initializes the Document AI client using environment variables (`GOOGLE_CLOUD_PROJECT_ID`, `DOCUMENT_AI_LOCATION`, `LAYOUT_PROCESSOR_ID`). It will raise an error if these are not set.
*   `process_document_layout()`: The main method that takes a GCS URI and MIME type, sends it to the specified Document AI processor, and returns the full, structured `documentai.Document` object on success.

**Inputs:**
*   A `gcs_uri` (Google Cloud Storage path) to the file to be processed.
*   The `mime_type` of the file (e.g., 'application/pdf', 'image/png').

**Outputs / Side Effects:**
*   Makes an API call to the Google Cloud Document AI service.
*   Returns a tuple: `(success_boolean, documentai.Document_object | error_dict)`.

---
### **File Path:** `c:\Ai\aitutor_37\src\App.tsx`

**Purpose:**
*The main entry point for the React frontend, responsible for setting up routing and global application context providers.*

**Key Functions / Components:**
*   `App()`: The root component that wraps the entire application in necessary context providers (`AuthProvider`, `AccessibilityProvider`).
*   `AppRoutes()`: A component that defines all application URL routes using `react-router-dom`. It separates public routes (e.g., `/auth/signin`), protected routes under `/dashboard`, and developer-only routes.
*   `ProtectedRoute`: A wrapper component that checks if a user is authenticated via `useAuth`. If not, it redirects them to the sign-in page.
*   `UserInteractionGateway`: A modal overlay that appears on first load, requiring the user to click to continue. This is a crucial workaround to enable browser audio features (like TTS) that are often blocked before a user interaction.

**Inputs:**
*   This component is the root and does not receive props.

**Outputs / Side Effects:**
*   Renders the entire application's UI based on the current URL path.
*   Provides global state management for Authentication, Accessibility, Documents (`DocumentProvider`), and Quizzes (`QuizProvider`) to all child components.

---
### **File Path:** `c:\Ai\aitutor_37\src\pages\DocumentView.tsx`

**Purpose:**
*Renders the main user interface for interacting with a single document, including reading, chatting, and taking quizzes.*

**Key Functions / Components:**
*   `DocumentView()`: The main component that fetches and displays document data. It manages the view's state, including the active tab and accessibility settings.
*   `useEffect` hooks: Used to fetch the document data from the `/api/documents/:id` endpoint upon load, set the `activeDocumentId` in the global `DocumentContext`, and sync the active tab with URL query parameters (e.g., `?tab=quiz`).
*   `renderContent()`: A function that conditionally renders the content of the main panel based on the `activeTab` state ('read', 'chat', or 'quiz').
*   `useTTSPlayer` hook: Integrated to manage the text-to-speech functionality for the 'Read Aloud' feature, including play, pause, stop, and word-level highlighting via `SpeakableDocumentContent`.

**Inputs:**
*   The `id` of the document from the URL, accessed via `useParams`.
*   The `tab` from the URL query string, accessed via `useLocation`.
*   Receives global context from `useAuth`, `useAccessibility`, and `useDocument`.

**Outputs / Side Effects:**
*   Makes a `GET` request to `/api/documents/:id` to fetch document data.
*   Renders the document content, a chat prompt, or a quiz prompt.
*   Navigates the user to the full chat page (`/dashboard/chat`) when the 'Start Chat' or 'Generate Quiz' buttons are clicked, passing the document ID and other relevant parameters in the URL.
*   Updates the global `activeDocumentId` via the `DocumentContext`.

---
### **File Path:** `c:\Ai\aitutor_37\src\components\GeminiChatInterface.tsx`

**Purpose:**
*Provides the user interface for the chat screen, including the message display area and the input bar.*

**Key Functions / Components:**
*   `GeminiChatInterface()`: The main container component that orchestrates the chat view.
*   `MessageBubble`: A component that renders a single chat message. It handles different styles for user vs. agent, displays quiz options as clickable buttons, and includes the speaker icon for TTS playback on agent messages.
*   `ChatInputBar`: The component for the text input area at the bottom of the screen. It includes the `textarea` for typing, a `MicrophoneButton` for audio input, and a `Send` button.
*   `useChatTTSPlayer` hook: Manages the playback of TTS audio for individual chat messages.

**Inputs:**
*   `messages`: An array of `ChatMessage` objects to be displayed.
*   `isSendingMessage`: A boolean to disable input while a message is in flight.
*   `onSendMessage`: A callback function to send a text message to the parent component (`ChatPage.tsx`).
*   `onAudioSend`: A callback function to send a recorded audio blob.
*   `currentDocumentId` & `currentThreadId`: Context passed down to the `MicrophoneButton` for API calls.

**Outputs / Side Effects:**
*   Renders the chat history.
*   Calls the `onSendMessage` or `onAudioSend` prop when the user sends a message, which triggers an API call in the parent `ChatPage`.
*   Plays back audio for agent messages when the speaker icon is clicked.

---
### **File Path:** `c:\Ai\aitutor_37\backend\services\auth_service.py`

**Purpose:**
*Provides a centralized service for all Firebase Authentication operations, acting as a wrapper around the `firebase_admin` SDK.*

**Key Functions / Components:**
*   `AuthService`: A singleton class that ensures only one instance of the service and one initialization of the Firebase Admin SDK.
*   `verify_id_token()`: The most critical function. It takes a JWT from the client, verifies its signature, checks for expiration or revocation, and returns the user's decoded information (`uid`, `email`, etc.).
*   `get_user()`: Retrieves a user's profile from Firebase Auth by their UID.
*   `create_user()`, `update_user()`, `delete_user()`: Standard CRUD operations for managing user accounts in Firebase Authentication.

**Inputs:**
*   A Firebase ID token (JWT string) for verification.
*   User information (email, password) for creation.
*   A `user_id` for retrieval, update, or deletion operations.
*   Requires the `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` environment variable to initialize the SDK.

**Outputs / Side Effects:**
*   Initializes the `firebase_admin` app.
*   Makes API calls to the Firebase Authentication service.
*   Returns user data dictionaries or boolean success flags.

---
### **File Path:** `c:\Ai\aitutor_37\backend\services\firestore_service.py`

**Purpose:**
*Acts as the sole data access layer for all interactions with the Google Cloud Firestore database, managing all CRUD operations for users, documents, and other collections.*

**Key Functions / Components:**
*   `FirestoreService`: A singleton class that initializes the connection to the Firestore database.
*   `save_document()`, `get_document()`, `update_document()`, `delete_document_by_id()`: Core CRUD methods for the `documents` collection, which stores metadata about user-uploaded files.
*   `get_user_documents()`: Retrieves all document metadata for a specific user.
*   `create_user()`, `get_user()`, `update_user()`: Manages user profile documents in the `users` collection, which store preferences and gamification stats.

**Inputs:**
*   Data dictionaries representing the objects to be created or updated in Firestore.
*   A `user_id` or `document_id` to identify records for retrieval, update, or deletion.
*   Requires `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` and `GCP_PROJECT_ID` environment variables.

**Outputs / Side Effects:**
*   Performs read, write, update, and delete operations on the Firestore database.
*   Returns dictionaries of retrieved data, document IDs, or boolean success flags.

---
### **File Path:** `c:\Ai\aitutor_37\backend\services\storage_service.py`

**Purpose:**
*Manages all interactions with Google Cloud Storage (GCS), handling the lifecycle of file blobs.*

**Key Functions / Components:**
*   `StorageService`: A singleton class that initializes the GCS client and connects to the specified bucket.
*   `upload_file()`: Uploads a file stream (e.g., from a web request) to a user-specific folder in GCS.
*   `get_file()`: Downloads a file from GCS and returns its content as bytes.
*   `delete_file_from_gcs()`: Deletes a file blob from GCS given its URI.
*   `upload_string_as_file()`: A utility method to save a string (e.g., a JSON object or text narrative) as a new file in GCS.
*   `download_file_as_string()`: Downloads a GCS file and decodes it as a UTF-8 string.

**Inputs:**
*   File content (as a byte stream or string).
*   A `user_id` for creating organized storage paths.
*   A `file_path` or `gcs_uri` to identify blobs for retrieval or deletion.
*   Requires the `GCS_BUCKET_NAME` environment variable.

**Outputs / Side Effects:**
*   Creates, reads, and deletes file objects in Google Cloud Storage.
*   Returns file metadata dictionaries, file content as bytes or strings, or boolean success flags.

---
### **File Path:** `c:\Ai\aitutor_37\backend\services\tts_service.py`

**Purpose:**
*Provides a service to convert text into spoken audio using the Google Cloud Text-to-Speech API.*

**Key Functions / Components:**
*   `TTSService`: A singleton class that initializes the Google Cloud TTS client.
*   `synthesize_text()`: The main method. It takes a string of text, chunks it into manageable pieces, wraps it in SSML (Speech Synthesis Markup Language) with `<mark>` tags for word timing, and calls the Google TTS API to generate audio. It reassembles the audio chunks and timepoints.
*   `_chunk_text()`: A private helper method that splits long texts into smaller pieces, attempting to preserve paragraph breaks to ensure natural-sounding pauses.

**Inputs:**
*   A string of `text` to be synthesized.
*   Optional parameters for voice, speaking rate, and pitch.
*   Requires `GCP_PROJECT_ID` and `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` environment variables.

**Outputs / Side Effects:**
*   Makes API calls to the Google Cloud TTS service.
*   Returns a dictionary containing the synthesized `audio_content` (as bytes) and a list of `timepoints` for word-level highlighting.

---
### **File Path:** `c:\Ai\aitutor_37\backend\services\stt_service.py`

**Purpose:**
*Provides a service to transcribe spoken audio into text using the Google Cloud Speech-to-Text API.*

**Key Functions / Components:**
*   `STTService`: A singleton class that initializes the Google Cloud Speech client.
*   `transcribe_audio_bytes()`: The primary method for non-streaming transcription. It takes audio content as bytes, sends it to the STT API with a specified configuration (language, model), and returns the transcribed text and confidence score.
*   `transcribe_audio_batch()`: An async method for transcribing large audio files stored in GCS using the long-running recognition feature.
*   `streaming_recognize()`: A method for handling real-time, streaming audio transcription.

**Inputs:**
*   Audio content as `bytes` or a GCS URI (`gs://...`).
*   Configuration parameters like `encoding`, `sample_rate_hertz`, and `language_code`.
*   Requires the `FIREBASE_SERVICE_ACCOUNT_KEY_PATH` environment variable.

**Outputs / Side Effects:**
*   Makes API calls to the Google Cloud STT service.
*   Saves a copy of the submitted audio to the `backend/debug_audio/` directory for inspection.
*   Returns a dictionary containing the `transcript` text and other metadata like confidence and processing time.

---
### **File Path:** `c:\Ai\aitutor_37\backend\services\doc_ai_service.py`

**Purpose:**
*A dedicated service to interact with the Google Cloud Document AI API, specifically for processing document layouts and extracting text (OCR).*

**Key Functions / Components:**
*   `DocAIService`: A class that initializes the Document AI client.
*   `get_text_from_document()`: An async method that takes document metadata (including a GCS URI and mimetype), sends it to the configured Document AI processor, and returns the full extracted text content from the `result.document.text` field.

**Inputs:**
*   A `doc_metadata` dictionary containing the `gcs_uri` and `mimetype` of the file to be processed.
*   Requires the `GOOGLE_DOCUMENT_AI_PROCESSOR_NAME` environment variable.

**Outputs / Side Effects:**
*   Makes an API call to the Google Cloud Document AI service.
*   Returns the extracted text as a single string.
*   Raises a `ContentRetrievalError` if the API call fails.

---
### **File Path:** `c:\Ai\aitutor_37\backend\graphs\new_chat_graph.py`

**Purpose:**
*Defines a self-contained LangGraph agent responsible for handling general conversational Q&A about a document.*

**Key Functions / Components:**
*   `GeneralQueryState`: A `TypedDict` that defines the data structure (state) for this specific graph, including `document_id`, `messages`, `query`, and `response`.
*   `call_chat_llm_node()`: The single node in this graph. It retrieves the document content using `DocumentRetrievalService`, constructs a detailed prompt containing the user's query and conversation history, invokes the `gemini-2.5-flash` model, and returns the LLM's response.
*   `create_new_chat_graph()`: The factory function that assembles and compiles the graph.

**Inputs:**
*   Receives a `GeneralQueryState` object from the supervisor. This includes the `document_id` to retrieve content and the `query` to be answered.

**Outputs / Side Effects:**
*   Makes a call to the `DocumentRetrievalService` to get the document text.
*   Invokes the Google Generative AI LLM.
*   Returns a dictionary with the `response` from the LLM and any potential `error_message`.

---
### **File Path:** `c:\Ai\aitutor_37\backend\graphs\quiz_engine_graph.py`

**Purpose:**
*Defines a stateful LangGraph agent that manages the entire lifecycle of a multiple-choice quiz, from generation to evaluation and completion.*

**Key Functions / Components:**
*   `QuizEngineState`: A `TypedDict` defining the complex state for a quiz, including the document snippet, question history, user's current answer, score, and overall status.
*   `LLMQuizResponse` & `LLMQuestionDetail`: Pydantic models that define the strict JSON schema the LLM must follow for its responses, ensuring reliable parsing of questions, options, feedback, and completion status.
*   `call_quiz_engine_node()`: The core node of the graph. It has two primary modes based on the `status` in the state:
    1.  `generating_first_question`: Invokes the LLM with a prompt to create the first question.
    2.  `evaluating_answer`: Invokes the LLM with a different prompt to evaluate the user's last answer, provide feedback, and either generate the next question or conclude the quiz.
*   `create_quiz_engine_graph()`: The factory function that assembles and compiles this single-node graph.

**Inputs:**
*   Receives a `QuizEngineState` object. For the first question, this contains the `document_content_snippet`. For subsequent calls, it includes the `user_answer` to the previous question.

**Outputs / Side Effects:**
*   Invokes the Google Generative AI LLM with highly structured prompts.
*   Parses the LLM's JSON output using the Pydantic models.
*   Returns a dictionary containing the updated state, including the next question to display (`current_question_to_display`), feedback (`current_feedback_to_display`), and the new `status`.

---
### **File Path:** `c:\Ai\aitutor_37\backend\graphs\document_understanding_agent\graph.py`

**Purpose:**
*This is the **active and current** agent for document analysis. It uses a powerful multimodal LLM to perform a single, end-to-end analysis of a document (image or PDF) and generate a comprehensive, TTS-ready textual narrative.*

**Key Functions / Components:**
*   `DocumentUnderstandingState`: Defines the state for this agent, primarily holding the input file path/bytes and the final `tts_ready_narrative`.
*   `COMPREHENSIVE_LLM_PROMPT`: A detailed and critical prompt that instructs the `gemini-2.5-flash` model on how to analyze the document. It specifies a strict reading order (top-to-bottom, left-to-right, column by column), how to handle text, images, and tables, and emphasizes the need for a well-punctuated, TTS-friendly output.
*   `generate_tts_narrative_node()`: The single node in this graph. It prepares the document as a `Part` (from bytes or GCS URI), sends it along with the prompt to the Gemini model, and places the resulting text into the `tts_ready_narrative` field in the state.
*   `run_dua_processing_for_document()`: An async wrapper function that invokes the compiled graph. This is the entry point called by `document_routes.py` during file upload.

**Inputs:**
*   An initial state dictionary containing either `input_file_path` (local path or GCS URI) or `input_file_content_bytes`, along with the `input_file_mimetype`.

**Outputs / Side Effects:**
*   Makes a single, powerful API call to the Vertex AI / Gemini multimodal model.
*   Returns a state object containing the complete, generated `tts_ready_narrative` as a single string.

---
### **File Path:** `c:\Ai\aitutor_37\backend\graphs\document_understanding_graph.py`

**Purpose:**
*This appears to be an **older, deprecated, or alternative** implementation of a document understanding agent. It is more complex and follows a multi-step, tool-based approach, but is **not currently used** in the main application flow.*

**Key Functions / Components:**
*   `DocumentUnderstandingState`: Defines a state that revolves around using tools and intermediate artifacts.
*   `fetch_detailed_layout_node()`: A node designed to call the `AdvancedDocumentLayoutTool` to get structured layout data from Google's Document AI.
*   `analyze_structure_and_visuals_node()`: A placeholder node intended to take the layout data and use an LLM to identify structure.
*   `create_document_understanding_graph()`: A factory function that wires these multiple nodes together in a linear sequence.

**Inputs:**
*   Designed to take a `gcs_uri` and `mime_type`.
*   Relies on the `AdvancedDocumentLayoutTool` being passed in during creation.

**Outputs / Side Effects:**
*   Would make multiple API calls (one for layout, then more for analysis).
*   The logic within the nodes is largely placeholder, indicating it may be an incomplete experiment or a remnant of a previous architectural approach.

---
### **File Path:** `c:\Ai\aitutor_37\src\pages\ChatPage.tsx`

**Purpose:**
*Serves as the main container and logic controller for the real-time chat and quiz interface.*

**Key Functions / Components:**
*   `ChatPage()`: The main component that manages the state of the conversation, including the `messages` array, the current `threadId`, and whether the interaction is a `quiz`.
*   `handleSendMessage()`: A callback function that sends a user's text message to the backend via `apiService.chat`. It constructs the user message object, adds it to the local state, and then adds the agent's response upon successful return.
*   `handleAudioSend()`: A callback that handles audio input. It constructs a `FormData` object with the audio blob and sends it to the `apiService.uploadAudioMessage` endpoint.
*   `handleStartQuiz()`: An initialization function that sends the `/start_quiz` command to the backend to begin a quiz session for the active document.
*   `useEffect` hooks: Used to parse URL parameters (like `document` and `start_quiz`) to initialize the chat session correctly.

**Inputs:**
*   Receives the `document` ID and a `start_quiz` flag from the URL query parameters.
*   User input via text or audio through the `GeminiChatInterface` component.

**Outputs / Side Effects:**
*   Makes API calls to `POST /api/v2/agent/chat` for all text and audio messages.
*   Renders the `GeminiChatInterface` component, passing down the message history and necessary callbacks.
*   Manages the `thread_id` for conversation continuity.
*   Displays toast notifications for errors.

---
### **File Path:** `c:\Ai\aitutor_37\src\layouts\DashboardLayout.tsx`

**Purpose:**
*Provides the primary, persistent UI shell for the entire authenticated application, including the main navigation sidebar and the content area.*

**Key Functions / Components:**
*   `DashboardLayout()`: The main layout component.
*   **Sidebar Navigation**: Renders a list of navigation links (`navLinks`) for both desktop (permanent) and mobile (collapsible) views. It uses a combination of `Link` components for direct routes and `button` elements with `onClick` handlers for dynamic navigation that requires context (e.g., checking for an `activeDocumentId`).
*   `handleChatNavigation()` & `handleQuizNavigation()`: Callback functions that check for an `activeDocumentId` from the `useDocument` context before navigating the user to the chat or quiz page. If no document is active, they show a toast notification.
*   `<Outlet />`: A component from `react-router-dom` that renders the matched child route component (e.g., `Dashboard`, `DocumentsList`, `DocumentView`).

**Inputs:**
*   Relies on `useAuth`, `useAccessibility`, and `useDocument` contexts to get the current user, UI settings, and the `activeDocumentId`.

**Outputs / Side Effects:**
*   Renders the main application layout.
*   Provides consistent navigation across the dashboard section of the app.
*   Handles user logout.

---
### **File Path:** `c:\Ai\aitutor_37\src\pages\Dashboard.tsx`

**Purpose:**
*Serves as the main landing page for an authenticated user, providing a high-level overview and quick access to key application features.*

**Key Functions / Components:**
*   `Dashboard()`: The main component for the dashboard page.
*   **Quick Actions**: A grid of large, clickable links that navigate the user to core features like 'Upload Document', 'Start Studying', 'Chat with AI Tutor', and 'View Progress'.
*   **Recent Documents**: A section that fetches and displays a short list of the user's most recently accessed documents. It makes a `GET` request to `/api/documents` to retrieve this data.
*   **Progress Summary**: A section displaying placeholder gamification and progress stats, such as study time and quizzes taken.

**Inputs:**
*   Relies on `useAuth` to get the current user and their auth token for API calls.

**Outputs / Side Effects:**
*   Makes a `GET` request to `/api/documents` to fetch the recent documents list.
*   Renders links to other parts of the application.

---
### **File Path:** `c:\Ai\aitutor_37\src\pages\DocumentsList.tsx`

**Purpose:**
*Displays a comprehensive, searchable, and sortable list of all documents uploaded by the user.*

**Key Functions / Components:**
*   `DocumentsList()`: The main component for this page.
*   `useEffect` hook: Fetches the full list of user documents from the `GET /api/documents` endpoint upon component mount.
*   **Search and Sort**: Implements local, client-side filtering and sorting of the fetched documents based on user input in the search bar or clicks on sort buttons (by date, name, or type).
*   `handleDeleteClick()` & `confirmDelete()`: Manages the document deletion flow. It shows a confirmation modal and, upon confirmation, sends a `DELETE` request to `/api/documents/:id`.

**Inputs:**
*   Relies on `useAuth` to get the current user and their auth token for API calls.

**Outputs / Side Effects:**
*   Makes a `GET` request to `/api/documents` to fetch all user documents.
*   Makes a `DELETE` request to `/api/documents/:id` when a user deletes a document.
*   Renders a list of documents, each linking to its respective `DocumentView` page.

---
### **File Path:** `c:\Ai\aitutor_37\src\contexts\AuthContext.tsx`

**Purpose:**
*Provides a global state management solution for user authentication and preferences throughout the entire React application.*

**Key Functions / Components:**
*   `AuthContext`: The React `Context` object.
*   `AuthProvider`: The provider component that wraps the application. It manages the `currentUser` state by subscribing to Firebase's `onAuthStateChanged` listener. When a user signs in, it fetches their preferences from Firestore; if the user document doesn't exist, it creates one with default settings.
*   `useAuth()`: The custom hook that allows any child component to easily access the authentication state and methods.
*   **Callback Functions**: Provides memoized callback functions (`signIn`, `signUp`, `signOut`, `getAuthToken`, etc.) that wrap the Firebase SDK calls, ensuring components don't have to interact with Firebase directly.

**Inputs:**
*   Does not receive props, but its internal functions take user credentials (email, password).

**Outputs / Side Effects:**
*   Makes the `currentUser` object, `userPreferences`, and authentication methods available to the entire component tree.
*   Interacts with Firebase Authentication for sign-in/out/up operations.
*   Interacts with Firestore to read and write user preference documents in the `users` collection.

---
### **File Path:** `c:\Ai\aitutor_37\src\contexts\DocumentContext.tsx`

**Purpose:**
*Provides a simple, global context to track the currently active document across different pages and components.*

**Key Functions / Components:**
*   `DocumentContext`: The React `Context` object.
*   `DocumentProvider`: The provider component that holds the `activeDocumentId` state.
*   `useDocument()`: The custom hook used by components like `DashboardLayout` and `DocumentView` to access or update the `activeDocumentId`.

**Inputs:**
*   Does not receive props.

**Outputs / Side Effects:**
*   Makes the `activeDocumentId` and its setter function available to consuming components. This is crucial for enabling context-aware navigation (e.g., the 'Chat with the document' button knows which document to open).

---
### **File Path:** `c:\Ai\aitutor_37\src\hooks\useTTSPlayer.ts`

**Purpose:**
*A custom React hook that encapsulates the complex logic for the 'Read Aloud' feature, specifically for reading the entire content of a document.*

**Key Functions / Components:**
*   `useTTSPlayer()`: The main hook function. It manages the player's state (`idle`, `loading`, `playing`, `paused`).
*   `playAudio()`: The primary function exposed by the hook. When called in an `idle` state, it sends the entire `fullText` to the backend `/api/tts/synthesize` endpoint. It then receives the base64 audio content and a list of word-level `timepoints`, creates an `HTMLAudioElement`, and plays it. It also handles pause/resume logic.
*   `ontimeupdate` handler: As the audio plays, this handler continuously checks the `audio.currentTime` against the `timepoints` array to determine which word should be highlighted, updating the `activeTimepoint` state.

**Inputs:**
*   Takes the `fullText` of a document as an argument.

**Outputs / Side Effects:**
*   Makes a `POST` request to `/api/tts/synthesize`.
*   Manages an `HTMLAudioElement` for audio playback.
*   Returns the player `status`, `activeTimepoint` for highlighting, the full `wordTimepoints` array, and error state.

---
### **File Path:** `c:\Ai\aitutor_37\src\hooks\useChatTTSPlayer.ts`

**Purpose:**
*A custom React hook similar to `useTTSPlayer`, but simplified and tailored for playing back the pre-synthesized audio of individual chat messages.*

**Key Functions / Components:**
*   `useChatTTSPlayer()`: The main hook function.
*   `playAudio()`: Unlike its document counterpart, this function does **not** make an API call. Instead, it expects to receive the `audioContent` (base64 string) and `timepoints` directly from the `ChatMessage` object. It decodes the base64 content into a blob, creates an `HTMLAudioElement`, and plays it.
*   `ontimeupdate` handler: Functions identically to the one in `useTTSPlayer` to enable word-level highlighting within a message bubble.

**Inputs:**
*   The `playAudio` function takes the `audioContent` (base64 string) and `timepoints` array as arguments.

**Outputs / Side Effects:**
*   Manages an `HTMLAudioElement` for audio playback.
*   Returns the player `status`, `activeTimepoint` for highlighting, and error state.

---
### **File Path:** `c:\Ai\aitutor_37\src\pages\ChatPage.tsx`

**Purpose:**
*Serves as the main container and logic controller for the real-time chat and quiz interface.*

**Key Functions / Components:**
*   `ChatPage()`: The main component that manages the state of the conversation, including the `messages` array, the current `threadId`, and whether the interaction is a `quiz`.
*   `handleSendMessage()`: A callback function that sends a user's text message to the backend via `apiService.chat`. It constructs the user message object, adds it to the local state, and then adds the agent's response upon successful return.
*   `handleAudioSend()`: A callback that handles audio input. It constructs a `FormData` object with the audio blob and sends it to the `apiService.uploadAudioMessage` endpoint.
*   `handleStartQuiz()`: An initialization function that sends the `/start_quiz` command to the backend to begin a quiz session for the active document.
*   `useEffect` hooks: Used to parse URL parameters (like `document` and `start_quiz`) to initialize the chat session correctly.

**Inputs:**
*   Receives the `document` ID and a `start_quiz` flag from the URL query parameters.
*   User input via text or audio through the `GeminiChatInterface` component.

**Outputs / Side Effects:**
*   Makes API calls to `POST /api/v2/agent/chat` for all text and audio messages.
*   Renders the `GeminiChatInterface` component, passing down the message history and necessary callbacks.
*   Manages the `thread_id` for conversation continuity.
*   Displays toast notifications for errors.

---
### **File Path:** `c:\Ai\aitutor_37\src\layouts\DashboardLayout.tsx`

**Purpose:**
*Provides the primary, persistent UI shell for the entire authenticated application, including the main navigation sidebar and the content area.*

**Key Functions / Components:**
*   `DashboardLayout()`: The main layout component.
*   **Sidebar Navigation**: Renders a list of navigation links (`navLinks`) for both desktop (permanent) and mobile (collapsible) views. It uses a combination of `Link` components for direct routes and `button` elements with `onClick` handlers for dynamic navigation that requires context (e.g., checking for an `activeDocumentId`).
*   `handleChatNavigation()` & `handleQuizNavigation()`: Callback functions that check for an `activeDocumentId` from the `useDocument` context before navigating the user to the chat or quiz page. If no document is active, they show a toast notification.
*   `<Outlet />`: A component from `react-router-dom` that renders the matched child route component (e.g., `Dashboard`, `DocumentsList`, `DocumentView`).

**Inputs:**
*   Relies on `useAuth`, `useAccessibility`, and `useDocument` contexts to get the current user, UI settings, and the `activeDocumentId`.

**Outputs / Side Effects:**
*   Renders the main application layout.
*   Provides consistent navigation across the dashboard section of the app.
*   Handles user logout.

---
### **File Path:** `c:\Ai\aitutor_37\src\pages\Dashboard.tsx`

**Purpose:**
*Serves as the main landing page for an authenticated user, providing a high-level overview and quick access to key application features.*

**Key Functions / Components:**
*   `Dashboard()`: The main component for the dashboard page.
*   **Quick Actions**: A grid of large, clickable links that navigate the user to core features like 'Upload Document', 'Start Studying', 'Chat with AI Tutor', and 'View Progress'.
*   **Recent Documents**: A section that fetches and displays a short list of the user's most recently accessed documents. It makes a `GET` request to `/api/documents` to retrieve this data.
*   **Progress Summary**: A section displaying placeholder gamification and progress stats, such as study time and quizzes taken.

**Inputs:**
*   Relies on `useAuth` to get the current user and their auth token for API calls.

**Outputs / Side Effects:**
*   Makes a `GET` request to `/api/documents` to fetch the recent documents list.
*   Renders links to other parts of the application.

---
### **File Path:** `c:\Ai\aitutor_37\src\pages\DocumentsList.tsx`

**Purpose:**
*Displays a comprehensive, searchable, and sortable list of all documents uploaded by the user.*

**Key Functions / Components:**
*   `DocumentsList()`: The main component for this page.
*   `useEffect` hook: Fetches the full list of user documents from the `GET /api/documents` endpoint upon component mount.
*   **Search and Sort**: Implements local, client-side filtering and sorting of the fetched documents based on user input in the search bar or clicks on sort buttons (by date, name, or type).
*   `handleDeleteClick()` & `confirmDelete()`: Manages the document deletion flow. It shows a confirmation modal and, upon confirmation, sends a `DELETE` request to `/api/documents/:id`.

**Inputs:**
*   Relies on `useAuth` to get the current user and their auth token for API calls.

**Outputs / Side Effects:**
*   Makes a `GET` request to `/api/documents` to fetch all user documents.
*   Makes a `DELETE` request to `/api/documents/:id` when a user deletes a document.
*   Renders a list of documents, each linking to its respective `DocumentView` page.

---
### **File Path:** `c:\Ai\aitutor_37\src\contexts\AuthContext.tsx`

**Purpose:**
*Provides a global state management solution for user authentication and preferences throughout the entire React application.*

**Key Functions / Components:**
*   `AuthContext`: The React `Context` object.
*   `AuthProvider`: The provider component that wraps the application. It manages the `currentUser` state by subscribing to Firebase's `onAuthStateChanged` listener. When a user signs in, it fetches their preferences from Firestore; if the user document doesn't exist, it creates one with default settings.
*   `useAuth()`: The custom hook that allows any child component to easily access the authentication state and methods.
*   **Callback Functions**: Provides memoized callback functions (`signIn`, `signUp`, `signOut`, `getAuthToken`, etc.) that wrap the Firebase SDK calls, ensuring components don't have to interact with Firebase directly.

**Inputs:**
*   Does not receive props, but its internal functions take user credentials (email, password).

**Outputs / Side Effects:**
*   Makes the `currentUser` object, `userPreferences`, and authentication methods available to the entire component tree.
*   Interacts with Firebase Authentication for sign-in/out/up operations.
*   Interacts with Firestore to read and write user preference documents in the `users` collection.

---
### **File Path:** `c:\Ai\aitutor_37\src\contexts\DocumentContext.tsx`

**Purpose:**
*Provides a simple, global context to track the currently active document across different pages and components.*

**Key Functions / Components:**
*   `DocumentContext`: The React `Context` object.
*   `DocumentProvider`: The provider component that holds the `activeDocumentId` state.
*   `useDocument()`: The custom hook used by components like `DashboardLayout` and `DocumentView` to access or update the `activeDocumentId`.

**Inputs:**
*   Does not receive props.

**Outputs / Side Effects:**
*   Makes the `activeDocumentId` and its setter function available to consuming components. This is crucial for enabling context-aware navigation (e.g., the 'Chat with the document' button knows which document to open).

---
### **File Path:** `c:\Ai\aitutor_37\src\hooks\useTTSPlayer.ts`

**Purpose:**
*A custom React hook that encapsulates the complex logic for the 'Read Aloud' feature, specifically for reading the entire content of a document.*

**Key Functions / Components:**
*   `useTTSPlayer()`: The main hook function. It manages the player's state (`idle`, `loading`, `playing`, `paused`).
*   `playAudio()`: The primary function exposed by the hook. When called in an `idle` state, it sends the entire `fullText` to the backend `/api/tts/synthesize` endpoint. It then receives the base64 audio content and a list of word-level `timepoints`, creates an `HTMLAudioElement`, and plays it. It also handles pause/resume logic.
*   `ontimeupdate` handler: As the audio plays, this handler continuously checks the `audio.currentTime` against the `timepoints` array to determine which word should be highlighted, updating the `activeTimepoint` state.

**Inputs:**
*   Takes the `fullText` of a document as an argument.

**Outputs / Side Effects:**
*   Makes a `POST` request to `/api/tts/synthesize`.
*   Manages an `HTMLAudioElement` for audio playback.
*   Returns the player `status`, `activeTimepoint` for highlighting, the full `wordTimepoints` array, and error state.

---
### **File Path:** `c:\Ai\aitutor_37\src\hooks\useChatTTSPlayer.ts`

**Purpose:**
*A custom React hook similar to `useTTSPlayer`, but simplified and tailored for playing back the pre-synthesized audio of individual chat messages.*

**Key Functions / Components:**
*   `useChatTTSPlayer()`: The main hook function.
*   `playAudio()`: Unlike its document counterpart, this function does **not** make an API call. Instead, it expects to receive the `audioContent` (base64 string) and `timepoints` directly from the `ChatMessage` object. It decodes the base64 content into a blob, creates an `HTMLAudioElement`, and plays it.
*   `ontimeupdate` handler: Functions identically to the one in `useTTSPlayer` to enable word-level highlighting within a message bubble.

**Inputs:**
*   The `playAudio` function takes the `audioContent` (base64 string) and `timepoints` array as arguments.

**Outputs / Side Effects:**
*   Manages an `HTMLAudioElement` for audio playback.
*   Returns the player `status`, `activeTimepoint` for highlighting, and error state.
---

## Section 2: Dynamic Feature Trace Analysis

This section connects the static components into dynamic flows, providing a clear, top-down view of how the system operates.

### 2.1 Frontend Entry Point & Routing Analysis

The application's routing is defined within the AppRoutes component in src/App.tsx. All authenticated routes are nested under the /dashboard path and protected by the ProtectedRoute component, which ensures a user is logged in.

| Route Path | Page Component | Brief Description |
| :--- | :--- | :--- |
| / | LandingPage.tsx | The public landing page, likely for marketing and login/signup links. |
| /auth/signin | SignIn.tsx | Handles user sign-in. |
| /auth/signup | SignUp.tsx | Handles new user registration. |
| /auth/reset-password | ResetPassword.tsx | Provides a form for users to reset their password. |
| /dashboard | Dashboard.tsx | The main dashboard view after login, showing quick actions and summaries. (Rendered via DashboardLayout) |
| /dashboard/upload | DocumentUpload.tsx | The page for uploading new documents. (Rendered via DashboardLayout) |
| /dashboard/documents | DocumentsList.tsx | Displays a comprehensive list of the user's documents. (Rendered via DashboardLayout) |
| /dashboard/documents/:id | DocumentView.tsx | Displays the content and actions for a single document. (Rendered via DashboardLayout) |
| /dashboard/chat | ChatPage.tsx | The main interface for chat and quiz interactions with the AI. (Rendered via DashboardLayout) |
| /dashboard/settings | Settings.tsx | The page for managing user preferences and settings. (Rendered via DashboardLayout) |
| /dev/deprecation-showcase | DeprecationShowcase.tsx | A developer-only route for showcasing components. (Lazy-loaded) |
---

## Section 2: Dynamic Feature Trace Analysis

This section connects the static components into dynamic flows, providing a clear, top-down view of how the system operates.

### 2.1 Frontend Entry Point & Routing Analysis

The application's routing is defined within the AppRoutes component in src/App.tsx. All authenticated routes are nested under the /dashboard path and protected by the ProtectedRoute component, which ensures a user is logged in.

| Route Path | Page Component | Brief Description |
| :--- | :--- | :--- |
| / | LandingPage.tsx | The public landing page, likely for marketing and login/signup links. |
| /auth/signin | SignIn.tsx | Handles user sign-in. |
| /auth/signup | SignUp.tsx | Handles new user registration. |
| /auth/reset-password | ResetPassword.tsx | Provides a form for users to reset their password. |
| /dashboard | Dashboard.tsx | The main dashboard view after login, showing quick actions and summaries. (Rendered via DashboardLayout) |
| /dashboard/upload | DocumentUpload.tsx | The page for uploading new documents. (Rendered via DashboardLayout) |
| /dashboard/documents | DocumentsList.tsx | Displays a comprehensive list of the user's documents. (Rendered via DashboardLayout) |
| /dashboard/documents/:id | DocumentView.tsx | Displays the content and actions for a single document. (Rendered via DashboardLayout) |
| /dashboard/chat | ChatPage.tsx | The main interface for chat and quiz interactions with the AI. (Rendered via DashboardLayout) |
| /dashboard/settings | Settings.tsx | The page for managing user preferences and settings. (Rendered via DashboardLayout) |
| /dev/deprecation-showcase | DeprecationShowcase.tsx | A developer-only route for showcasing components. (Lazy-loaded) |
---

## Section 2: Dynamic Feature Trace Analysis

This section connects the static components into dynamic flows, providing a clear, top-down view of how the system operates.

### 2.1 Frontend Entry Point & Routing Analysis

The application's routing is defined within the AppRoutes component in src/App.tsx. All authenticated routes are nested under the /dashboard path and protected by the ProtectedRoute component, which ensures a user is logged in.

| Route Path | Page Component | Brief Description |
| :--- | :--- | :--- |
| / | LandingPage.tsx | The public landing page, likely for marketing and login/signup links. |
| /auth/signin | SignIn.tsx | Handles user sign-in. |
| /auth/signup | SignUp.tsx | Handles new user registration. |
| /auth/reset-password | ResetPassword.tsx | Provides a form for users to reset their password. |
| /dashboard | Dashboard.tsx | The main dashboard view after login, showing quick actions and summaries. (Rendered via DashboardLayout) |
| /dashboard/upload | DocumentUpload.tsx | The page for uploading new documents. (Rendered via DashboardLayout) |
| /dashboard/documents | DocumentsList.tsx | Displays a comprehensive list of the user's documents. (Rendered via DashboardLayout) |
| /dashboard/documents/:id | DocumentView.tsx | Displays the content and actions for a single document. (Rendered via DashboardLayout) |
| /dashboard/chat | ChatPage.tsx | The main interface for chat and quiz interactions with the AI. (Rendered via DashboardLayout) |
| /dashboard/settings | Settings.tsx | The page for managing user preferences and settings. (Rendered via DashboardLayout) |
| /dev/deprecation-showcase | DeprecationShowcase.tsx | A developer-only route for showcasing components. (Lazy-loaded) |
### 2.3 Backend API to LangGraph Supervisor Trace

This subsection traces how backend API endpoints process requests and invoke the main LangGraph supervisor.

#### Endpoint: `POST /api/documents/upload`

*   **Handler Function:** `upload_document()` in `backend/routes/document_routes.py`.
*   **Logic:**
    1.  Authenticates the user via the `@auth_required` decorator.
    2.  Creates an initial document record in Firestore with `status: 'uploading'`.
    3.  Uploads the raw file to Google Cloud Storage via `StorageService`.
    4.  Updates the Firestore record with the GCS URI and sets `status: 'processing_dua'`.
    5.  Constructs an initial state dictionary for the Document Understanding Agent: `{ "document_id": string, "input_file_path": string, "input_file_mimetype": string }`.
    6.  **Invokes LangGraph Agent:** Asynchronously calls `run_dua_processing_for_document()` (from `backend/graphs/document_understanding_agent/graph.py`), which in turn invokes the `document_understanding_graph`.
    7.  Updates the Firestore record with the final processing status and the `dua_narrative_content` returned by the graph.
    8.  Returns a JSON object to the frontend with the final document details.

#### Endpoint: `POST /api/v2/agent/chat`

*   **Handler Function:** `agent_chat_route()` in `backend/app.py`.
*   **Logic:**
    1.  Authenticates the user via the `@require_auth` decorator.
    2.  Determines the content type (`multipart/form-data` for audio, `application/json` for text).
    3.  Extracts `query`, `thread_id`, `document_id`, and audio data from the request.
    4.  If audio is present, it is transcribed to text via `STTService`.
    5.  Constructs the initial `SupervisorState` dictionary, populating it with the user's query, conversation history (if a `thread_id` exists), and any document context.
    6.  **Invokes LangGraph Agent:** Calls `compiled_supervisor_graph.invoke(supervisor_input, config)`.
    7.  The supervisor graph then internally routes the task to the appropriate sub-graph (e.g., `NewChatGraph` or `QuizEngineGraph`).
    8.  After the graph execution completes, it synthesizes TTS audio for the agent's final text response via `TTSService`.
    9.  Returns a comprehensive JSON object to the frontend containing the agent's response, the new `thread_id`, quiz status flags, and the base64-encoded TTS audio.

#### Endpoint: `POST /api/tts/synthesize`

*   **Handler Function:** `synthesize_speech_route()` in `backend/routes/tts_routes.py` (inferred).
*   **Logic:**
    1.  Authenticates the user.
    2.  Extracts the `text` from the request body.
    3.  **Does not invoke a LangGraph agent.**
    4.  Directly calls `TTSService.synthesize_text()` to convert the text to audio.
    5.  Returns a JSON object containing the base64-encoded `audio_content` and `timepoints`.

### 2.4 Supervisor & Agent Logic to Service Trace

This table maps the supervisor''s routing logic to the specific agent invoked and the backend services that agent utilizes.

| Supervisor Route/Condition | Target Agent Graph | Agent''s Purpose | Services Used (`backend/services/`) | Key Service Functions Called |
| :--- | :--- | :--- | :--- | :--- |
| User query is `''/start_quiz''` or `quiz_active` is true. | `QuizEngineGraph` | Manages the entire quiz lifecycle, from question generation to evaluation and scoring. | `doc_retrieval_service.py` | `get_document_content_for_quiz()` |
| User query is not a quiz command and `document_id` exists. | `NewChatGraph` | Handles conversational Q&A about a specific document. | `doc_retrieval_service.py` | `get_document_content()` |
| Document is uploaded. | `DocumentUnderstandingAgent` | Performs a deep, multimodal analysis of a document to generate a TTS-ready narrative. | (None directly; uses Vertex AI SDK) | (N/A) |