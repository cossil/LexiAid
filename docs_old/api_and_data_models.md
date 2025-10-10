# API and Data Model Architecture

This document provides a summary of the LexiAid system's data architecture, covering the major backend API endpoints and the primary data models stored in Google Cloud Firestore.

---

## 1. Backend API Endpoints

All endpoints are prefixed with `/api` and require a `Bearer <token>` in the `Authorization` header for authentication.

### Agent Interaction

-   **`POST /v2/agent/chat`**
    -   **Purpose**: The single, unified endpoint for all conversational interactions with the AI, including general chat, audio input, and quizzes.
    -   **Request (JSON)**: `{ "query": string, "documentId": string?, "threadId": string? }`
    -   **Request (Form Data)**: `multipart/form-data` with an `audio_file` and optional `document_id`, `thread_id`, and `stt_processing_mode` ('review' or 'direct_send').
    -   **Response**: A JSON object containing the agent's response, updated conversation state, and any relevant flags or data for the frontend.
        ```json
        {
          "final_agent_response": "This is the AI's answer.",
          "thread_id": "thread_...",
          "quiz_active": false,
          "quiz_complete": false,
          "options_for_display": ["Option A", "Option B"],
          "audio_content_base64": "...",
          "timepoints": [...]
        }
        ```

### Document Management

-   **`POST /documents/upload`**
    -   **Purpose**: Uploads a new document and triggers the full processing pipeline (DUA, OCR, TTS pre-synthesis).
    -   **Request**: `multipart/form-data` with a `file` and a `name` for the document.
    -   **Response**: A JSON object with the final metadata of the processed document record from Firestore.

-   **`GET /documents`**
    -   **Purpose**: Retrieves a list of all documents for the authenticated user.
    -   **Response**: An array of document metadata objects.

-   **`GET /documents/<document_id>`**
    -   **Purpose**: Retrieves the full metadata and, optionally, the text content for a single document.
    -   **Query Parameter**: `?include_content=true` to fetch the document's text.
    -   **Response**: A JSON object representing the document.

-   **`DELETE /documents/<document_id>`**
    -   **Purpose**: Deletes a document record from Firestore and its associated files from Google Cloud Storage.
    -   **Response**: `204 No Content` on success.

### TTS & STT Services

-   **`GET /documents/<document_id>/tts-assets`**
    -   **Purpose**: Retrieves temporary, secure download URLs for a document's pre-generated TTS audio and timepoint files.
    -   **Response**: `{ "audio_url": "...", "timepoints_url": "..." }`

-   **`POST /tts/synthesize`** (Defined in `app.py`)
    -   **Purpose**: On-demand synthesis of a given text string.
    -   **Request**: `{ "text": string }`
    -   **Response**: Raw `audio/mpeg` data.

### User Management

-   **`GET /users/profile`**
    -   **Purpose**: Retrieves the authenticated user's profile, including accessibility preferences.
    -   **Response**: A JSON object containing the user's merged profile from Firebase Auth and Firestore.

---

## 2. Firestore Data Models

### `users` collection

This collection stores profile information and application-specific settings for each user. The document ID for each user record is their Firebase Authentication UID.

-   **`users/{user_id}`**
    ```json
    {
      "uid": "string",          // Firebase Auth User ID
      "email": "string",        // User's email address
      "displayName": "string",  // User's display name
      "createdAt": "timestamp", // Date the user profile was created
      "lastLogin": "timestamp", // Timestamp of the user's last login
      "preferences": {          // Object containing all accessibility settings
        "fontSize": "number",
        "fontFamily": "string", // e.g., 'OpenDyslexic'
        "lineSpacing": "number",
        "highContrast": "boolean",
        "uiTtsEnabled": "boolean", // If UI elements should be read aloud
        "cloudTtsEnabled": "boolean", // If document reading should use high-quality cloud TTS
        "ttsDelay": "number"      // Delay in ms for UI TTS hover
      },
      "gamification": {         // Placeholder for future gamification features
        "points": "number",
        "level": "number"
      }
    }
    ```

### `documents` collection

This collection stores the metadata for every document uploaded by users. It serves as the central record, pointing to all other resources related to that document.

-   **`documents/{document_id}`**
    ```json
    {
      "id": "string",                   // The unique ID of this document
      "user_id": "string",              // The UID of the user who owns the document
      "name": "string",                 // The user-provided name for the document
      "original_filename": "string",    // The original name of the uploaded file
      "file_type": "string",            // The file extension (e.g., 'pdf', 'jpg')
      "created_at": "timestamp",        // When the document was uploaded
      "updated_at": "timestamp",        // When the record was last modified
      "status": "string",               // The current processing status (e.g., 'uploading', 'processing_dua', 'processed_dua', 'ocr_failed')
      "gcs_uri": "string",              // The GCS URI for the original uploaded file
      "dua_narrative_content": "string",// The full, TTS-ready text generated by the Document Understanding Agent
      "ocr_text_content": "string",     // Fallback text extracted by a simpler OCR process
      "tts_audio_gcs_uri": "string",    // GCS URI for the pre-generated MP3 audio file
      "tts_timepoints_gcs_uri": "string", // GCS URI for the JSON timepoints file
      "processing_error": "string|null" // Any error message from the DUA or OCR process
    }
    ```
