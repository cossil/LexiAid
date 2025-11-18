# Backend Services Analysis

Thinking...
- Catalog every service module to understand what infrastructure it encapsulates (Auth, Firestore, Storage, DocAI, Retrieval, TTS/STT).
- For each, note main methods, inputs, outputs, and downstream consumers.
- Highlight singleton patterns and side effects that impact deployment.

Plan
1. Provide overall summary of the services layer.
2. Detail each service with purpose, APIs, inputs/outputs, and consumers.
3. Capture cross-service considerations (singleton use, dependency injection).

Execute
- Document below covers every file in `backend/services`, emphasizing responsibilities and operational concerns.

## Overview
LexiAid’s backend relies on a suite of singleton-style service classes under `backend/services`. Each service encapsulates I/O heavy dependencies (Firebase Admin, Firestore, Google Cloud Storage, Document AI, Google Speech, etc.) so blueprints and LangGraph nodes can stay thin. The sections below describe the purpose, key APIs, data inputs, and side effects for every active service.

## `AuthService`
- **Purpose**: Wrap Firebase Admin authentication to verify ID tokens and retrieve user metadata.
- **Key Methods**:
  - `verify_id_token(id_token) -> Tuple[bool, Dict]`: Validates tokens with revocation checks and 60s clock skew tolerance, returning decoded user info.
- **Inputs**: Firebase service account JSON path (`FIREBASE_SERVICE_ACCOUNT_KEY_PATH`), ID tokens from clients.
- **Outputs/Side Effects**: Initializes Firebase Admin singleton and logs verification diagnostics; raises if credentials are missing.
- **Consumers**: `document_routes`, `tts_routes`, `stt_routes`, `user_routes`, `/api/v2/agent/chat`, and any decorator that enforces `require_auth`.

## `FirestoreService`
- **Purpose**: Provide CRUD access to Firestore collections (`users`, `documents`, `document_contents`, etc.) with sane defaults for accessibility/gamification profiles.
- **Key Methods**: `get_user`, `create_user`, `update_user_preferences`, `save_document`, `get_user_documents`, `delete_document_by_id`, `get_document_content_from_subcollection`.
- **Inputs**: Firestore credentials/project IDs from `.env`, data payloads passed by routes.
- **Outputs/Side Effects**: Reads/writes Firestore docs, ensures timestamps and default preferences, deletes docs after ownership checks.
- **Consumers**: `document_routes` (upload/list/delete), `user_routes`, `DocumentRetrievalService`, `progress_routes` placeholder.

## `StorageService`
- **Purpose**: Interface with Google Cloud Storage for uploading raw files, derived artifacts (TTS audio/timepoints), and generating signed URLs.
- **Key Methods**: `upload_file`, `upload_bytes_as_file`, `upload_string_as_file`, `get_file`, `delete_file_from_gcs`, `get_signed_url`.
- **Inputs**: Bucket name `GCS_BUCKET_NAME`, binary blobs or strings from routes/services.
- **Outputs/Side Effects**: Creates GCS objects under per-user prefixes, returns `gcsUri` metadata, deletes or copies blobs.
- **Consumers**: `document_routes`, `DocumentRetrievalService`, TTS pre-generation pipeline, deletion workflows.

## `DocAIService`
- **Purpose**: Feed uploaded documents through Google Document AI processors to extract structured text when DUA is required.
- **Key Methods**: `get_text_from_document(doc_metadata)` which wraps the `DocumentProcessorServiceClient`.
- **Inputs**: `GOOGLE_DOCUMENT_AI_PROCESSOR_NAME`, metadata containing `gcs_uri` + `mimetype`.
- **Outputs/Side Effects**: Calls Document AI API, returning extracted text or raising `ContentRetrievalError`; logs missing metadata.
- **Consumers**: Future DUA flows (though document routes now delegate to `document_understanding_agent` graph).

## `DocumentRetrievalService`
- **Purpose**: Central place to fetch processed document content for chat/quiz agents.
- **Key Methods**: `get_document_metadata`, `get_document_content`, `get_document_text`, `chunk_document_text`, `get_document_content_for_quiz`.
- **Inputs**: Firestore + Storage clients; document IDs provided by supervisor graph or API routes.
- **Outputs/Side Effects**: Returns the best available text source (DUA narrative, OCR text, GCS file, or `document_contents` subcollection). Logs missing data, fetches quiz snippets capped by length.
- **Consumers**: `document_routes`, supervisor routing node (for quiz start), new chat graph when retrieving narratives.

## `TTSService`
- **Purpose**: Convert refined answers or chat responses into MP3 audio plus word-level timestamps.
- **Key Methods**: `synthesize_text(text)` returning `{audio_content, timepoints}` and `is_functional()` for runtime checks.
- **Inputs**: Google Cloud Text-to-Speech credentials, text payloads from chat or answer-formulation flows.
- **Outputs/Side Effects**: Raw bytes (later base64 encoded), optional storage uploads for pre-generated document audio.
- **Consumers**: `/api/v2/agent/chat`, `answer_formulation_routes`, DUA pre-generation step in `document_routes`.

## `STTService`
- **Purpose**: Perform speech-to-text on uploaded audio or streaming microphone data.
- **Key Methods**: `transcribe_audio_bytes`, `streaming` helpers exposed via WebSocket route.
- **Inputs**: Audio bytes (`wav`, `mp3`, `flac`, `webm`), Google Speech configuration.
- **Outputs/Side Effects**: Returns transcripts + confidences, raises descriptive errors for unsupported formats.
- **Consumers**: `/api/v2/agent/chat` (direct_send vs review), `/api/stt/stream`, `stt_routes`.

## `services/__init__.py`
- **Purpose**: Re-export service classes for convenient absolute imports (`from backend.services import ...`).
- **Side Effects**: None beyond standard package initialization.
