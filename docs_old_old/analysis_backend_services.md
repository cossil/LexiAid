# Codebase Analysis: Backend Services

This document details the services located in the `backend/services/` directory. These services encapsulate the application's interactions with external systems like Firebase, Google Cloud Storage, and various Google Cloud AI APIs, providing a clean, reusable, and modular architecture.

---

## 1. `auth_service.py`

### **Purpose**

The `AuthService` is the gatekeeper for the application's security. It integrates with **Firebase Authentication** to manage user identity and verify access tokens, ensuring that only authenticated users can access protected resources.

### **Key Functions & Components**

-   **`AuthService` (Class)**: A singleton class that initializes the Firebase Admin SDK and provides methods for authentication tasks.
-   **`verify_id_token(id_token)`**: The most critical method. It takes a JWT (ID token) sent from the frontend, validates its signature, checks for expiration or revocation, and returns the decoded user information. This is used in the `@require_auth` decorator in `app.py`.
-   **User Management Methods**: Provides standard CRUD operations (`get_user`, `create_user`, `update_user`, `delete_user`) for managing users directly within Firebase Authentication.

### **Inputs**

-   **Firebase ID Token**: A string provided by clients in the `Authorization` header.
-   **User Data**: Dictionaries containing user information for creation or updates.

### **Outputs and Side Effects**

-   **User Payload**: On successful token verification, returns a dictionary with the user's UID, email, etc.
-   **Boolean Flags**: Methods like `update_user` return `True` or `False` to indicate success or failure.
-   **External Calls**: Makes API calls to the Firebase Authentication service.

---

## 2. `firestore_service.py`

### **Purpose**

This service is the sole intermediary for all database operations with **Google Cloud Firestore**. It abstracts away the raw Firestore API calls and provides a structured way to interact with the application's data models, including users, documents, folders, and progress.

### **Key Functions & Components**

-   **`FirestoreService` (Class)**: A singleton class that establishes a connection to the specified Firestore database.
-   **CRUD for `users`**: Methods like `get_user`, `create_user`, and `update_user_preferences` to manage user profile data and accessibility settings.
-   **CRUD for `documents`**: Methods like `save_document`, `get_document`, `update_document`, `delete_document_by_id`, and `get_user_documents`. It handles storing and retrieving document metadata.
-   **Content Handling**: Includes methods (`save_document_content`, `get_document_content_from_subcollection`) to manage large text content in a separate `document_contents` collection to avoid exceeding Firestore's 1MB document size limit.

### **Inputs**

-   **User IDs, Document IDs**: Strings to identify specific records.
-   **Data Dictionaries**: Python dictionaries matching the structure of the Firestore data models.

### **Outputs and Side Effects**

-   **Data Records**: Returns dictionaries or lists of dictionaries representing Firestore documents.
-   **Database State**: Creates, updates, or deletes documents in the Firestore database.

---

## 3. `storage_service.py`

### **Purpose**

The `StorageService` manages all interactions with **Google Cloud Storage (GCS)**. It is responsible for handling file uploads, downloads, and deletions, providing the durable storage layer for user-uploaded documents and other generated assets (like TTS audio).

### **Key Functions & Components**

-   **`StorageService` (Class)**: A singleton that initializes the GCS client and connects to the designated bucket specified in the environment variables.
-   **`upload_file(...)`**: Uploads a file (as a binary stream) to GCS, placing it in a user-specific folder and returning its GCS URI and other metadata.
-   **`upload_string_as_file(...)` / `upload_bytes_as_file(...)`**: Specialized upload methods for saving raw string or byte content directly to a file in GCS, used for saving DUA outputs and TTS audio.
-   **`get_file(file_path)`**: Downloads a file from GCS and returns its content as raw bytes.
-   **`delete_file(file_path)`**: Deletes a file from GCS.

### **Inputs**

-   **File Content**: Binary I/O streams, byte strings, or plain strings.
-   **User ID**: To organize files in user-specific GCS "folders".
-   **GCS Path/URI**: To identify files for download or deletion.

### **Outputs and Side Effects**

-   **File Metadata**: Returns dictionaries with GCS URI, storage path, size, etc.
-   **File Content**: Returns raw bytes of a downloaded file.
-   **GCS State**: Creates, updates, or deletes objects in the GCS bucket.

---

## 4. `doc_ai_service.py`

### **Purpose**

This service acts as a client for the **Google Cloud Document AI API**. Its primary function is to perform Optical Character Recognition (OCR) on documents stored in GCS. It takes a pointer to a document and returns the full extracted text.

### **Key Functions & Components**

-   **`DocAIService` (Class)**: Initializes the `DocumentProcessorServiceClient` using credentials and a processor name from environment variables.
-   **`get_text_from_document(doc_metadata)`**: The main method. It takes document metadata (containing the `gcs_uri` and `mimetype`), constructs a request to the Document AI API, and returns the extracted text from the `result.document.text` field of the response.

### **Inputs**

-   **Document Metadata**: A dictionary containing the `gcs_uri` and `mimetype` of the file to be processed.

### **Outputs and Side Effects**

-   **Extracted Text**: A single string containing the full text content recognized from the document.
-   **External Calls**: Makes a synchronous API call to the Google Cloud Document AI service.

---

## 5. `doc_retrieval_service.py`

### **Purpose**

This service is a crucial abstraction layer that provides a single, intelligent point of access for fetching document content. Instead of requiring other parts of the app to know *how* or *where* a document's text is stored, this service figures it out for them. This is vital for performance and flexibility.

### **Key Functions & Components**

-   **`DocumentRetrievalService` (Class)**: A singleton that uses `FirestoreService` and `StorageService` to perform its logic.
-   **`get_document_content(document_id)`**: The core orchestration method. It retrieves document text by following a specific priority order:
    1.  Check for pre-generated `dua_narrative_content` in the Firestore document metadata.
    2.  If not found, check for pre-generated `ocr_text_content` in the metadata.
    3.  If not found, look for a GCS path in the metadata and use `StorageService` to download and decode the file.
    4.  As a final fallback, check the `document_contents` sub-collection in Firestore.
-   **`chunk_document_text(...)`**: A utility method to split large blocks of text into smaller, overlapping chunks, which is essential for feeding document content into LLMs with limited context windows.

### **Inputs**

-   **Document ID**: The unique identifier for the desired document.

### **Outputs and Side Effects**

-   **Document Content**: A dictionary containing the text content and metadata about its source (e.g., `firestore_dua_narrative`, `gcs`).

---

## 6. `tts_service.py`

### **Purpose**

The `TTSService` is dedicated to converting text into lifelike speech, a cornerstone of the LexiAid mission. It wraps the **Google Cloud Text-to-Speech API**, handling the complexities of SSML (Speech Synthesis Markup Language), text chunking, and timepoint generation for synchronized audio-text highlighting.

### **Key Functions & Components**

-   **`TTSService` (Class)**: A singleton that initializes the `TextToSpeechClient`.
-   **`_chunk_text(text)`**: An internal method that splits long texts into smaller pieces (under 2500 characters) while preserving paragraph breaks, which is necessary to stay within API limits and produce natural-sounding pauses.
-   **`synthesize_text(text, ...)`**: The main method. It takes raw text, sanitizes it, chunks it, and then for each chunk:
    -   Builds an SSML string with `<mark>` tags for each word and `<break>` tags for paragraphs.
    -   Calls the `synthesize_speech` API endpoint with `enable_time_pointing`.
    -   Processes the response to create a list of timepoints (word and its start time in the audio).
    -   Concatenates the audio bytes from all chunks.
-   **`get_available_voices()`**: A utility to list available TTS voices from the Google API.

### **Inputs**

-   **Text**: The string to be synthesized into audio.
-   **Voice Parameters**: Optional voice name, speaking rate, and pitch.

### **Outputs and Side Effects**

-   **Synthesis Result**: A dictionary containing the raw `audio_content` (bytes) and a `timepoints` list for synchronized highlighting.

---

## 7. `stt_service.py`

### **Purpose**

The `STTService` handles the conversion of spoken audio into written text by integrating with the **Google Cloud Speech-to-Text API**. This enables the primary auditory-first input method for users.

### **Key Functions & Components**

-   **`STTService` (Class)**: A singleton that initializes the `SpeechClient`.
-   **`transcribe_audio_bytes(audio_bytes, ...)`**: The primary method for non-streaming (short) audio. It takes raw audio bytes, sends them to the `recognize` API endpoint, and returns the transcribed text along with metadata like confidence scores.
-   **`transcribe_audio_batch(audio_reference)`**: Handles long-running transcriptions for large audio files stored in GCS.
-   **Streaming Methods**: Includes `streaming_recognize` and `create_streaming_config` to support real-time transcription, although this is not the primary mode of use in the current `agent_chat_route`.

### **Inputs**

-   **Audio Content**: Raw audio as bytes.
-   **Audio Configuration**: Encoding format, sample rate, language code, etc.

### **Outputs and Side Effects**

-   **Transcription Result**: A dictionary containing the `transcript` string and metadata like `confidence`, `language_code`, and `processing_time_ms`.
-   **Debug Files**: Saves a copy of the audio sent to the API in the `backend/debug_audio/` directory for inspection.
