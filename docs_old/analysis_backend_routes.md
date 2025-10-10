# Codebase Analysis: Backend Routes

This document outlines the API endpoints defined in the `backend/routes/` directory. These routes are implemented using Flask Blueprints and serve as the primary interface between the frontend application and the backend services and agents.

---

## 1. `document_routes.py`

This is the most complex and critical set of routes, handling all aspects of a document's lifecycle, from upload and processing to retrieval and deletion.

### Endpoints

-   **`POST /api/documents/upload`**
    -   **Purpose**: The main endpoint for uploading a new document. This endpoint orchestrates a complex, multi-step process that is central to the application's function.
    -   **Authentication**: Required.
    -   **Request**: `multipart/form-data` containing the file and an optional `name` for the document.
    -   **Workflow**:
        1.  **Initial Firestore Entry**: Creates a document record in Firestore with a `status` of `uploading`.
        2.  **GCS Upload**: Uploads the original file to a user-specific folder in Google Cloud Storage.
        3.  **DUA Processing**: If the file type is eligible (e.g., PDF, JPG, PNG), it invokes the **Document Understanding Agent (DUA)**. The DUA analyzes the document's layout, images, and text to produce a high-quality, TTS-ready narrative.
        4.  **TTS Pre-synthesis**: If the DUA is successful, it immediately calls the `TTSService` to pre-generate the full audio and timepoints for the narrative. These assets are then saved back to GCS.
        5.  **OCR Fallback**: If DUA processing is not eligible or fails, it attempts to use a simpler OCR tool as a fallback to extract plain text.
        6.  **Final Firestore Update**: Updates the Firestore document record with the final `status` (`processed_dua`, `processed_ocr`, `dua_failed`, etc.), GCS URIs for all generated assets (original file, TTS audio, timepoints), and any extracted text or error messages.
    -   **Response**: A JSON object containing the final, updated document metadata from Firestore.

-   **`GET /api/documents`**
    -   **Purpose**: Retrieves a list of all documents belonging to the authenticated user.
    -   **Authentication**: Required.
    -   **Response**: A JSON array of document metadata objects.

-   **`GET /api/documents/<document_id>`**
    -   **Purpose**: Retrieves the detailed metadata for a single document.
    -   **Authentication**: Required.
    -   **Response**: A JSON object with the full document record from Firestore.

-   **`GET /api/documents/<document_id>/content`**
    -   **Purpose**: Fetches the textual content of a document. It intelligently uses the `DocumentRetrievalService` to get the best available text, whether it's the DUA narrative, OCR text, or raw text from GCS.
    -   **Authentication**: Required.
    -   **Response**: A JSON object containing the document's text content.

-   **`DELETE /api/documents/<document_id>`**
    -   **Purpose**: Deletes a document. This includes deleting the record from Firestore and all associated files from Google Cloud Storage.
    -   **Authentication**: Required.
    -   **Response**: A success or error message.

-   **`GET /api/documents/<document_id>/tts`**
    -   **Purpose**: Retrieves the pre-generated TTS audio and timepoints for a document. It fetches the corresponding GCS URIs from the document's Firestore record and downloads the files.
    -   **Authentication**: Required.
    -   **Response**: A JSON object containing the Base64-encoded audio content and the list of timepoints.

---

## 2. `user_routes.py`

This blueprint handles user-specific data that is not directly related to documents.

### Endpoints

-   **`GET /api/users/profile`**
    -   **Purpose**: Retrieves the profile of the currently authenticated user.
    -   **Authentication**: Required.
    -   **Workflow**: It fetches user data from both **Firebase Authentication** (for display name, email) and **Firestore** (for accessibility preferences, gamification stats) and merges them into a single response.
    -   **Response**: A JSON object containing the combined user profile.

---

## 3. `tts_routes.py`

This blueprint provides general-purpose TTS functionalities, separate from the main agent chat loop or document pre-synthesis.

### Endpoints

-   **`POST /api/tts/synthesize`** (Note: This endpoint is defined in `app.py` but logically belongs here)
    -   **Purpose**: Synthesizes a given piece of text into speech on-demand.
    -   **Authentication**: Required.
    -   **Request**: A JSON payload containing the `text` to be synthesized and optional voice parameters.
    -   **Response**: The raw `audio/mpeg` file.

-   **`GET /api/tts/voices`**
    -   **Purpose**: Retrieves a list of available TTS voices from the Google Cloud TTS API.
    -   **Authentication**: Required.
    -   **Response**: A JSON object containing a list of available voices.

---

## 4. `stt_routes.py`

This blueprint provides endpoints for Speech-to-Text services, primarily for scenarios outside the main agent chat workflow (which handles STT internally).

### Endpoints

-   **`POST /api/stt/transcribe`**
    -   **Purpose**: Transcribes an uploaded audio file.
    -   **Authentication**: Required.
    -   **Request**: `multipart/form-data` containing the audio file.
    -   **Response**: A JSON object with the transcription, confidence score, and language code.

-   **`GET /api/stt/languages`**
    -   **Purpose**: Retrieves a list of languages supported by the STT service.
    -   **Authentication**: Required.
    -   **Response**: A JSON array of supported languages.

---

## 5. `progress_routes.py`

This blueprint is intended to handle user progress and gamification data, though it is currently a placeholder.

### Endpoints

-   **`GET /api/progress`**
    -   **Purpose**: Placeholder to get user progress data.
    -   **Authentication**: Required.
    -   **Response**: A placeholder success message.
