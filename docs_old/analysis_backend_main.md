# Codebase Analysis: Backend Core

This document provides an analysis of the core files that constitute the main entry point and diagnostic functionalities of the LexiAid backend application.

---

## 1. `backend/app.py`

### **Purpose**

`app.py` is the central nervous system of the LexiAid backend. It's a Flask application that serves as the main entry point for all incoming API requests. Its primary responsibilities include:

-   **Application Initialization**: Sets up the Flask app, configures Cross-Origin Resource Sharing (CORS) to allow the frontend to communicate with it, and manages application configuration.
-   **Service and Graph Initialization**: It instantiates all essential services (like `AuthService`, `FirestoreService`, `TTSService`) and compiles the various LangGraph agents (`SupervisorGraph`, `QuizEngineGraph`, `NewChatGraph`). This is managed through a `DatabaseManager` singleton to ensure thread-safe initialization of graph checkpointers.
-   **Request Routing**: It registers API blueprints from the `routes/` directory, delegating specific URL prefixes (e.g., `/api/documents`, `/api/tts`) to their respective handlers.
-   **Core Chat Logic**: It defines the primary chat endpoint, `/api/v2/agent/chat`, which is the main interface for all user interactions with the AI tutor.
-   **Authentication**: It implements a `@require_auth` decorator to secure endpoints, verifying Firebase JWTs for user authentication.

### **Key Functions & Components**

-   **`create_app()` (Implicit)**: The file implicitly creates the Flask `app` instance at the global level.
-   **`initialize_component()`**: A helper function to streamline the initialization of services, adding them to the app's configuration.
-   **`require_auth(f)`**: A decorator that intercepts requests to protected routes. It validates the `Authorization: Bearer <token>` header, uses `AuthService` to verify the token, and attaches the `user_id` to Flask's request-local `g` object.
-   **`DatabaseManager` (Class)**: A thread-safe singleton class responsible for initializing and holding the compiled LangGraph graphs and their SQLite checkpointers (`SqliteSaver`). This is crucial for maintaining conversation state across multiple requests.
-   **`agent_chat_route()`**: The most critical endpoint. It handles both `application/json` (for text) and `multipart/form-data` (for audio) requests. It performs STT on audio, determines the user's query, manages the conversation `thread_id`, invokes the `SupervisorGraph` with the current state, and orchestrates the final response, including generating TTS audio of the agent's message.

### **Inputs**

-   **Environment Variables**: Loaded from `.env` to configure services like Google Cloud (Project ID, Document AI) and Firebase.
-   **HTTP Requests**: Primarily `POST` requests to `/api/v2/agent/chat` containing either a JSON payload (`query`, `thread_id`, `documentId`) or form data (with an `audio_file`).

### **Outputs and Side Effects**

-   **HTTP Responses**: JSON responses containing the agent's text response, conversation history, quiz state, and Base64-encoded TTS audio with timepoints.
-   **Database State**: Creates and updates several `*.db` files (`supervisor_checkpoints.db`, `quiz_checkpoints.db`, etc.) to persist LangGraph conversation states.
-   **Logs**: Prints extensive debug information to the console about request processing, state management, and service initializations.
-   **Flask Server**: Runs a web server that listens for and responds to API requests.

---

## 2. `backend/file_usage_tracker.py`

### **Purpose**

This is a non-production, diagnostic tool designed to track which Python files are used during the application's runtime. Its goal is to provide developers with a clear picture of code execution paths and identify potentially unused or dead code. It is enabled by uncommenting its import in `app.py`.

### **Key Functions & Components**

-   **`initialize_tracking()`**: The main setup function. It uses `sys.addaudithook` to listen for file open events and patches the import system with a custom `TrackingFinder`.
-   **`track_file_usage()`**: The core function that records a file's access type (e.g., `import`, `open`) and timestamps in a global dictionary.
-   **`TrackingFinder` (Class)**: A custom `MetaPathFinder` that intercepts module imports to log which files are being imported.
-   **`log_used_files()`**: Registered with `atexit`, this function runs when the application shuts down. It writes a sorted report of all tracked files to `used_python_files_log.txt`.

### **Inputs**

-   **Python's runtime events**: It hooks into the interpreter's import and file I/O operations.

### **Outputs and Side Effects**

-   **`used_python_files_log.txt`**: A text file created in the `backend/` directory containing a report of all Python files that were accessed during the session.
-   **Performance Overhead**: Adds a small amount of overhead to file I/O and import operations, which is why it's intended for debugging rather than production.
