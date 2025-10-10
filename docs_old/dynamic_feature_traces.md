# Dynamic Feature Traces

This document provides a dynamic analysis of the LexiAid application by tracing two of its most critical user flows from the frontend UI, through the backend services and agents, and back to the user. This illustrates how different parts of the codebase collaborate to deliver the core features.

---

## 1. Flow: Document Upload & TTS Pre-synthesis

This trace follows the journey of a document from the moment a user uploads it to the completion of its processing, including the crucial pre-generation of Text-to-Speech (TTS) audio, which is key to the auditory-first mission.

1.  **[Frontend] User Interaction (`DocumentUpload.tsx`)**: The user drags a file (e.g., a PDF or JPG) into the upload area or selects it via the file browser. They provide a name for the document and click the "Upload Document" button.

2.  **[Frontend] API Call (`api.ts`)**: The `handleUpload` function in `DocumentUpload.tsx` creates a `FormData` object containing the file and its name. It then calls `apiService.uploadDocument`, which makes a `POST` request to the `/api/documents/upload` endpoint, including the user's JWT for authentication.

3.  **[Backend] Route Handling (`document_routes.py`)**: The `/upload` route receives the request. It immediately creates an initial document record in Firestore with a status of `uploading` to provide instant feedback to the user.

4.  **[Backend] Storage (`storage_service.py`)**: The route calls `storage_service.upload_file` to upload the original, unmodified document to a user-specific folder in Google Cloud Storage (GCS). The document's Firestore record is updated with the GCS URI and a status of `uploaded`.

5.  **[Backend] DUA Invocation (`document_routes.py` -> `document_understanding_agent/graph.py`)**: The route checks if the file type is eligible for the Document Understanding Agent (DUA). If it is, the document's status is updated to `processing_dua`. The `run_dua_processing_for_document` function is called, passing it the GCS URI of the uploaded file.

6.  **[Backend] DUA Processing (`document_understanding_agent/graph.py`)**: The `generate_tts_narrative_node` within the DUA graph is invoked. It sends the document file (via its GCS URI) directly to the **Gemini 2.5 Flash** model along with a detailed prompt instructing it to analyze the document's structure, text, and images, and to generate a single, continuous, well-punctuated narrative suitable for TTS.

7.  **[Backend] TTS Pre-synthesis (`document_routes.py` -> `tts_service.py`)**: If the DUA successfully returns a narrative, the `/upload` route immediately calls `tts_service.synthesize_text`. The `TTSService` chunks the narrative, wraps it in SSML with word-level `<mark>` tags, and sends it to the Google Cloud TTS API to generate the full audio and a corresponding list of timepoints.

8.  **[Backend] Asset Storage (`storage_service.py`)**: The `/upload` route receives the audio bytes and timepoints JSON from the `TTSService`. It then calls `storage_service.upload_bytes_as_file` and `storage_service.upload_string_as_file` to save the generated MP3 audio and the JSON timepoints file to a `tts_outputs` sub-folder in the user's GCS directory.

9.  **[Backend] Final Update (`firestore_service.py`)**: The route performs a final update on the document's Firestore record. It sets the status to `processed_dua`, saves the full DUA narrative text directly in the record (`dua_narrative_content`), and adds the GCS URIs for the newly created TTS audio and timepoint files.

10. **[Frontend] Response (`DocumentUpload.tsx`)**: The frontend receives a `200 OK` response containing the final document metadata. It displays a success message and then automatically navigates the user to the `DocumentView` page for the newly processed document, which is now ready for auditory learning.

---

## 2. Flow: A Full Quiz Interaction

This trace follows the complete lifecycle of a quiz, from initiation by the user to answering a question and receiving feedback and the next question.

1.  **[Frontend] Quiz Initiation (`DocumentView.tsx`)**: The user is on the `DocumentView` page and clicks the "Generate Quiz" button on the 'Quiz' tab. This action navigates them to the `ChatPage`, appending `?document=<ID>&start_quiz=true` to the URL.

2.  **[Frontend] Start Command (`ChatPage.tsx`)**: An `useEffect` hook in `ChatPage.tsx` detects the `start_quiz=true` URL parameter. It calls the `handleStartQuiz` function, which in turn calls `apiService.chat` with the special query `/start_quiz` and the active `documentId`.

3.  **[Backend] Supervisor Entry (`app.py` -> `supervisor/nodes_routing.py`)**: The `agent_chat_route` receives the request. It passes the state to the `SupervisorGraph`. The `receive_user_input_node` sees the `/start_quiz` command and sets the `next_graph_to_invoke` to `quiz_engine_graph`.

4.  **[Backend] Routing & Prep (`supervisor/nodes_routing.py`)**: The `routing_decision_node` confirms the destination is the quiz engine. Because a new quiz is starting, it calls `doc_retrieval_service.get_document_content_for_quiz` to fetch a text snippet from the document. It then creates a new, unique `active_quiz_v2_thread_id` and sets `is_quiz_v2_active` to `true` in the supervisor state.

5.  **[Backend] First Question (`supervisor/nodes_invokers.py` -> `quiz_engine_graph.py`)**: The `invoke_quiz_engine_graph_node` is called. It sees this is the first invocation for this quiz thread and prepares an initial `QuizEngineState` with `status: 'generating_first_question'` and the document snippet. This state is passed to the `QuizEngineGraph`.

6.  **[Backend] Question Generation (`quiz_engine_graph.py`)**: The `call_quiz_engine_node` within the quiz graph is invoked. It uses the `PROMPT_GENERATE_FIRST_QUESTION` to ask the Gemini LLM to create the first multiple-choice question based on the document snippet. The LLM's response is parsed against the `LLMQuizResponse` Pydantic model.

7.  **[Frontend] Display First Question (`ChatPage.tsx`)**: The backend response contains the question text, the options, and the `quiz_active: true` flag. The `GeminiChatInterface` renders this as a new agent message, displaying the question and rendering the `options` as clickable buttons.

8.  **[Frontend] User Answers (`GeminiChatInterface.tsx`)**: The user clicks one of the option buttons. This calls the `onSendMessage` prop, triggering the `handleSendMessage` function in `ChatPage.tsx` with the text of the selected option as the new query.

9.  **[Backend] Supervisor & Routing (Repeat)**: The new request flows through the `agent_chat_route` to the `SupervisorGraph`. The `receive_user_input_node` sees that `is_quiz_v2_active` is `true` in the state and immediately routes to the `quiz_engine_graph`.

10. **[Backend] Answer Evaluation (`quiz_engine_graph.py`)**: The `invoke_quiz_engine_graph_node` sees that a quiz is already active. It prepares a `QuizEngineState` with `status: 'evaluating_answer'` and the user's answer text. The `call_quiz_engine_node` is invoked again, this time using the `PROMPT_EVALUATE_AND_GENERATE_NEXT`. This prompt gives the LLM the full context: the previous question, the user's answer, the correct answer, and the quiz history. The LLM provides feedback, states if the answer was correct, and generates the next question.

11. **[Frontend] Display Feedback & Next Question**: The process repeats. The backend's response contains the feedback on the previous answer *and* the new question. The `GeminiChatInterface` displays this as a single, consolidated agent message, and the cycle continues until the `quiz_engine_graph` sets `quiz_is_complete: true` in its response.
