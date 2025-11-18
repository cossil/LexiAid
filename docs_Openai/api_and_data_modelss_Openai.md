# API and Data Models Summary

Thinking...
- Enumerate primary backend endpoints (documents, chat/agent, answer formulation, TTS/STT, user profile) and capture purpose, request, response.
- Document Firestore data architecture focusing on `users`, `documents`, `document_contents`, gamification/preferences fields.
- Include notes on GCS/TTS assets as part of data model.

Plan
1. Group endpoints by feature and describe payload structures.
2. Detail Firestore collections and key fields used across services.
3. Mention supporting storage (GCS URIs, LangGraph checkpoints) relevant to data flow.

Execute
- Consolidated references from `backend/routes`, `backend/app.py`, and `backend/services` to produce the summary below.

## Backend API Endpoints

### Agent & Conversation
| Endpoint | Method | Purpose | Request Payload | Response Highlights |
| --- | --- | --- | --- | --- |
| `/api/v2/agent/chat` | POST (`multipart/form-data` for audio, `application/json` for text) | Central chat/quiz entry point. Routes requests through supervisor graph and LangGraph sub-agents. | **Audio**: `audio_file`, optional `document_id`, `thread_id`, `transcript`, `stt_processing_mode` (`review` or `direct_send`). **Text**: `query`, optional `documentId`, `thread_id`. | JSON with `final_agent_response`, `response`, `thread_id` (chat or quiz), `quiz_active`, `quiz_complete`, `quiz_cancelled`, `audio_content_base64`, `timepoints`, `conversation_history`, `error_detail`. Review mode returns transcript only. |
| `/api/stt/stream` | WebSocket | Real-time speech-to-text streaming. | Binary audio frames (WebM/Opus) sent through socket. | Server pushes `{ is_final, transcript }` updates. |
| `/api/stt/transcribe` | POST (multipart) | One-off transcription via STT tool. | `file` upload, optional `language_code`. | `{ status, transcription, confidence, language_code }`. |
| `/api/stt/languages` | GET | Lists supported STT languages. | Query params optional. | `{ status, languages: [] }`. |
| `/api/tts/synthesize` | POST JSON (internal use) | Converts text to audio for on-demand playback. | `{ text }`. | `{ audio_content, timepoints }`. |
| `/api/tts/voices` | GET | Lists available TTS voices from tool. | Optional `language_code`. | `{ status, voices: [] }`. |

### Document Management
| Endpoint | Method | Purpose | Request Payload | Response Highlights |
| --- | --- | --- | --- | --- |
| `/api/documents/upload` | POST (multipart) | Uploads and processes documents (Firestone + GCS + DUA/TTS). | `file`, optional `name`. Decorator injects `g.user_id`. | Status JSON (`document_id`, `status`, `dua_processed`, `processing_error`, `dua_narrative_snippet`). |
| `/api/documents` | GET | Lists user-owned documents. | Query params optional (folder id not yet exposed). | `[ { id, name, created_at, updated_at, file_type, processing_status, ... } ]`. |
| `/api/documents/:id` | GET | Fetches document metadata/content. Query `include_content=true` includes narrative text. | URL param `id`. | Full metadata plus `content`, `chunks`, TTS asset URIs. |
| `/api/documents/:id` | DELETE | Removes document metadata and associated GCS blob. | URL param `id`. | `204 No Content` if successful. |
| `/api/documents/:id/tts-assets` | GET | Retrieves signed URLs for pre-generated DUA audio/timepoints. | URL param `id`. | `{ audio_url, timepoints_url }`. |

### Answer Formulation
| Endpoint | Method | Purpose | Request Payload | Response Highlights |
| --- | --- | --- | --- | --- |
| `/api/v2/answer-formulation/refine` | POST JSON | Invokes LangGraph workflow to refine transcripts. | `{ transcript: string, question?: string, session_id?: string }`. | `{ refined_answer, session_id, status, fidelity_score?, iteration_count, audio_content_base64?, timepoints? }`. |
| `/api/v2/answer-formulation/edit` | POST JSON | Applies edit commands to an existing session. | `{ session_id, edit_command }`. | Same shape as refine response with updated `iteration_count`. |

### User & Progress
| Endpoint | Method | Purpose | Request Payload | Response |
| `/api/users/profile` | GET | Fetch user profile (Firestore or Firebase Auth fallback). | Bearer token only. | `{ status, data: { uid, email, displayName, preferences, gamification, ... } }`. |
| `/api/users/profile` | PATCH | Update profile preferences. | Partial JSON (e.g., `displayName`, `preferences`). | Empty body on success. |
| `/api/progress` | GET (placeholder) | Returns stubbed progress message pending implementation. | Bearer token only. | `{ status: 'success', message: 'Progress data...' }`. |

## Firestore Data Models

### Collection: `users`
- **Document ID**: Firebase UID.
- **Fields**:
  - `email`, `displayName`, `createdAt`, `lastLogin`.
  - `preferences`: object storing accessibility settings (font size, family, lineSpacing, wordSpacing, textColor, backgroundColor, highContrast, uiTtsEnabled, ttsVoice, ttsSpeed, ttsPitch, cloudTtsEnabled, cloudTtsVoice, answerFormulationAutoPause*, answerFormulationPauseDuration*, ttsDelay*, etc.).
  - `gamification`: `{ points, streak, level, badges: [] }`.
  - Answer Formulation onboarding metadata: `answerFormulationOnboardingCompleted`, `answerFormulationSessionsCompleted`, `answerFormulationAutoPauseSuggestionDismissed`.

### Collection: `documents`
- **Document ID**: UUID generated during upload.
- **Fields**:
  - `user_id` / `userId` (both handled for backward compatibility).
  - `name`, `original_filename`, `file_type`, `status` (`uploading`, `processing_dua`, `processed_dua`, `dua_failed`, `ocr_unavailable`, etc.).
  - `created_at`, `updated_at` (ISO timestamps).
  - `gcs_uri` (original file location), `tts_audio_gcs_uri`, `tts_timepoints_gcs_uri` when pre-generated.
  - `content_length`, `dua_narrative_content`, `ocr_text_content`, `processing_error`.

### Collection: `document_contents`
- **Purpose**: Stores large text content separately to avoid Firestore doc size limits.
- **Fields**: `document_id`, `content`, `source` (e.g., `firestore_document_contents`). Accessed via `FirestoreService.get_document_content_from_subcollection`.

### Other Storage
- **GCS Buckets**: Structured as `<bucket>/<user_id>/<filename>` via `StorageService`. Stores raw uploads, TTS audio/timepoint JSON, and any derived assets.
- **Sqlite Checkpoints**: Stored under backend directory for LangGraph persistence (`quiz_checkpoints.db`, `general_query_checkpoints.db`, `supervisor_checkpoints.db`, `document_understanding_checkpoints.db`, `answer_formulation_sessions.db`). Each graph uses `SqliteSaver` to resume sessions.

## Data Flow Notes
- Auth tokens from Firebase guard every API route; backend caches service instances (`app.config['SERVICES']`).
- LangGraph state includes conversation history serialized with custom helpers before persisting.
- Answer Formulation sessions rely on `session_id` (UUID) for state retrieval and TTS playback continuity.
- Document processing pipeline ensures DUA narrative and TTS assets are written back to Firestore/GCS for use by `DocumentView`, chat grounding, and on-demand audio features.
