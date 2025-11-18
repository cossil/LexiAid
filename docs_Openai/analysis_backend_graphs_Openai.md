# Backend Graphs Analysis

Thinking...
- Map each LangGraph module (supervisor, new_chat, quiz_engine, answer_formulation, document_understanding) to its state machine and external dependencies.
- Identify entry points, routing decisions, and data passed between nodes.
- Capture where graphs call backend services (DocumentRetrievalService, STT/TTS, LangGraph checkpointing).

Plan
1. Summarize every graph module, focusing on purpose, state shape, and node responsibilities.
2. Note inputs (HTTP payloads, Firestore docs, GCS URIs) and outputs (LLM responses, quiz state, refined answers).
3. Highlight coupling to external services and potential risks.

Execute
- The sections below provide per-graph breakdowns plus cross-cutting insights.

## `backend/graphs/supervisor`
- **Purpose**: Top-level orchestrator that routes user input (text or audio) to specialized LangGraphs (chat, quiz, legacy document understanding).
- **Key Files**:
  - `graph.py`: Builds the `StateGraph(SupervisorState)` with nodes `receive_user_input`, `routing_decision`, `new_chat_graph`, `quiz_engine_graph`. Ties in `DocumentRetrievalService` for quiz/document metadata. Uses `SqliteSaver` checkpointing so each user/thread persists context.
  - `state.py`: Defines `SupervisorState` structure (conversation history, active chat/quiz threads, document IDs, STT payloads, DUA outputs).
  - `nodes_routing.py`: Implements `receive_user_input_node` (handles STT transcription, doc ID extraction, quiz detection) and `routing_decision_node` (starts quizzes, fetches document snippets, handles cancel commands).
  - `nodes_invokers.py`: Invokes child graphs (`invoke_new_chat_graph_node`, `invoke_quiz_engine_graph_node`) and merges results back into supervisor state, including serialization of LangChain messages.
- **Inputs**: `/api/v2/agent/chat` posts (text or audio); DocumentRetrievalService for document snippets; STTService for audio transcription.
- **Outputs**: `final_agent_response`, quiz metadata, serialized conversation history, active thread IDs persisted via `SqliteSaver`.
- **Side Effects**: Checks STT audio, fetches Firestore metadata, logs routing decisions. Heavy reliance on `serialize_messages` helpers.

## `backend/graphs/new_chat_graph.py`
- **Purpose**: Document-grounded conversational graph that calls Gemini via LangChain.
- **State**: `GeneralQueryState` (document_id, user_id, thread_id, messages, query, response, error_message).
- **Nodes**: Single node `call_chat_llm_node` that distills conversation history, fetches document narrative via `DocumentRetrievalService`, composes prompt (`LLM_PROMPT_TEMPLATE`), invokes `ChatGoogleGenerativeAI`, and returns `response`.
- **Inputs**: Document ID (optional), conversation history (LangChain message list), query text.
- **Outputs**: LLM response text plus `error_message` when doc retrieval fails.
- **Side Effects**: Instantiates `DocumentRetrievalService()` per call (singleton), prints debug logs. No direct I/O besides LLM/Firestore access.

## `backend/graphs/quiz_engine_graph.py`
- **Purpose**: Generate and evaluate multi-question quizzes from document snippets.
- **State**: `QuizEngineState` (document content snippet, quiz history, score, status, llm_json_response, etc.).
- **Nodes**: Single node `call_quiz_engine_node` that selects a LangChain chain depending on status (`generating_first_question` vs `evaluating_answer`). Uses structured prompts plus `PydanticOutputParser` to enforce JSON schema.
- **Inputs**: Document snippet (from DocumentRetrievalService), user answer, quiz history, max question count.
- **Outputs**: Next question metadata, evaluation feedback, final summary when quiz completes.
- **Side Effects**: Tracks quiz history list, increments scores, merges `quiz_history` into supervisor state, logs errors when the LLM response schema is invalid.

## `backend/graphs/answer_formulation`
- **Purpose**: LangGraph workflow that refines dictated transcripts into polished answers with optional edit commands and fidelity sampling.
- **Key Nodes**:
  - `validate_input_node`: ensures transcripts meet length/metadata requirements; sets status and counters.
  - `refine_answer_node`: builds prompt from question + transcript, calls Gemini with low temperature, records iteration count.
  - `apply_edit_node`: parses edit command, applies targeted changes using LLM, tracks edit history.
  - `validate_fidelity_node`: randomly samples 10% of sessions for monitoring using dedicated validation prompt.
- **Inputs**: `AnswerFormulationState` (user_id, session_id, original_transcript, question prompt, edit command, previous state from SqliteSaver).
- **Outputs**: `refined_answer`, iteration metadata, fidelity score/violations, audio-ready text consumed later by TTS routes.
- **Side Effects**: Logs each step, increments `llm_call_count`, stores edit history, interacts with Graph checkpointing controlled in `backend/app.py`.

## `backend/graphs/document_understanding_agent`
- **Purpose**: Legacy Document Understanding Agent (DUA) for OCR + layout reasoning. Currently invoked directly from `document_routes` via `run_dua_processing_for_document`.
- **State**: `DocumentUnderstandingState` capturing GCS URIs, processing status, extracted content.
- **Flow**: Graph orchestrates document parsing, layout tools, TTS narrative creation. Although kept for compatibility, supervisor no longer routes to it; DUA runs during uploads.
- **Inputs**: GCS file references, mimetypes, metadata from Firestore/Storage.
- **Outputs**: `tts_ready_narrative`, structured doc understanding payloads consumed by Firestore + TTS pre-generation.

## Cross-cutting Observations
1. **Checkpoint Coordination**: Each graph assumes `SqliteSaver` is injected (via `backend/app.py`). Missing DB connections will surface only at runtime; adding health checks during startup would reduce silent failures.
2. **Error Surfacing**: Graph nodes log extensively but often return generic `final_agent_response` fallback strings. Consider propagating structured error codes up to the frontend for better UX.
3. **Service Instantiation**: Graph modules instantiate services (e.g., `DocumentRetrievalService()`) directly instead of receiving prepared instances. While singletons mask the cost, dependency injection would make testing easier.
4. **Document Understanding Routing**: Supervisor still references `document_understanding_graph` in routing decisions, but the node was removed. Ensure any future DUA reintroduction matches the new architecture or clean up dead paths.
