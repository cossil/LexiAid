# Backend Graphs Analysis

## Overview
LangGraph-based AI agents for chat, quiz, and document understanding functionality. Uses state machines with checkpointing for conversation persistence.

## File: `backend/graphs/new_chat_graph.py`

### Purpose
General chat/Q&A functionality with document context awareness.

### State: `GeneralQueryState`
```python
{
    document_id: Optional[str]
    user_id: Optional[str]
    thread_id: Optional[str]
    messages: List[BaseMessage]  # Full conversation history
    query: str  # Latest user query
    response: Optional[str]  # LLM response
    error_message: Optional[str]
}
```

### Key Node: `call_chat_llm_node`
- **Purpose**: Generate LLM response based on document and conversation history
- **Process**:
  1. Instantiates `ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)`
  2. Loads document narrative via `DocumentRetrievalService`
  3. Distills conversation history (last 5 messages)
  4. Formats prompt with document narrative, history summary, and user query
  5. Invokes LLM and returns response
- **Document Handling**:
  - If document_id present: Loads content from DocumentRetrievalService
  - If no document: Uses placeholder "No document has been provided"
  - Error handling: Returns user-friendly error message

### LLM Prompt Template
```
You are a helpful AI Tutor. Answer questions based *strictly and exclusively* on the provided Document Narrative. 
If the answer is not in the document, state that the information is not available. 
Do not use outside knowledge. Format response using simple Markdown.

1. Document Narrative: {document_narrative}
2. Conversation History: {distilled_conversation_summary}
3. User's Question: {user_query}
```

### Helper: `distill_conversation_history`
- **Purpose**: Summarize recent conversation for context
- **Max Messages**: 5 (configurable)
- **Format**: "User: ...\nAssistant: ..."

### Graph Structure
```
Entry → call_chat_llm → END
```

### Factory Function
```python
create_new_chat_graph(checkpointer=None) -> CompiledGraph
```

---

## File: `backend/graphs/quiz_engine_graph.py`

### Purpose
Interactive multiple-choice quiz generation and evaluation (V2).

### State: `QuizEngineState`
```python
{
    document_id: str
    document_content_snippet: str
    user_id: str
    max_questions: int
    user_answer: Optional[str]
    active_quiz_thread_id: str
    quiz_history: List[Dict]  # Question/answer history
    current_question_index: int
    current_question_number: Optional[int]
    score: int
    llm_json_response: Optional[Dict]
    llm_call_count: int
    current_question_to_display: Optional[Dict]
    current_feedback_to_display: Optional[str]
    status: Literal["initializing", "generating_first_question", "awaiting_answer", 
                    "evaluating_answer", "quiz_completed", "error"]
    error_message: Optional[str]
}
```

### Pydantic Models

#### `LLMQuestionDetail`
```python
{
    question_text: str
    options: List[str]  # 2-5 options
    correct_answer_index: int  # 0-based
    explanation_for_correct_answer: Optional[str]
}
```

#### `LLMQuizResponse`
```python
{
    feedback_for_user: Optional[str]
    is_correct: Optional[bool]
    next_question: Optional[LLMQuestionDetail]
    quiz_is_complete: bool
    final_summary: Optional[str]  # Required if quiz_is_complete=true
}
```

### Key Node: `call_quiz_engine_node`
- **Purpose**: Generate questions or evaluate answers based on status
- **Status Handling**:
  - **generating_first_question**: Creates initial quiz question
  - **evaluating_answer**: Evaluates user's answer + generates next question or concludes
- **LLM Configuration**:
  - Question generation: temperature=0.7
  - Evaluation: temperature=0.3
- **Process**:
  1. Gets appropriate chain based on status
  2. Invokes LLM with formatted prompt
  3. Parses response using PydanticOutputParser
  4. Updates quiz_history with results
  5. Increments score if correct
  6. Sets next status (awaiting_answer or quiz_completed)

### Prompts

#### First Question Prompt
- Inputs: document_content_snippet, max_questions, user_id
- Output: JSON with first question (feedback/is_correct are null)

#### Evaluate & Generate Next Prompt
- Inputs: document_content, user_answer, previous question details, quiz history, score, progress
- Output: JSON with feedback, is_correct, and either next_question or final_summary
- **Completion Logic**: 
  - If current_question_number >= max_questions → quiz_is_complete=true
  - Requires comprehensive final_summary with score

### Helper: `_format_quiz_history_for_prompt`
- **Purpose**: Format answered questions for LLM context
- **Format**: "Q1: {question}\n  User Answer: {answer}\n  Correct: {is_correct}\n  Feedback: {feedback}"

### Graph Structure
```
Entry → quiz_engine_node → END
```

### Factory Function
```python
create_quiz_engine_graph(checkpointer: Optional[SqliteSaver] = None) -> CompiledGraph
```

### Model
- **LLM**: gemini-2.5-flash
- **Temperatures**: 0.7 (generation), 0.3 (evaluation)

---

## File: `backend/graphs/supervisor/graph.py`

### Purpose
Orchestrates routing between specialized graphs (chat, quiz).

### State: `SupervisorState` (from state.py)
```python
{
    user_id: str
    current_query: str
    conversation_history: List[BaseMessage]
    active_chat_thread_id: Optional[str]
    active_dua_thread_id: Optional[str]
    document_id_for_action: Optional[str]
    document_snippet_for_quiz: Optional[str]
    next_graph_to_invoke: Optional[Literal["quiz_engine_graph", "new_chat_graph", 
                                            "document_understanding_graph", "end"]]
    final_agent_response: Optional[str]
    supervisor_error_message: Optional[str]
    active_quiz_v2_thread_id: Optional[str]
    quiz_engine_state: Optional[QuizEngineState]
    is_quiz_v2_active: bool
    current_audio_input_base64: Optional[str]
    current_audio_format: Optional[str]
    gcs_uri_for_action: Optional[str]
    mime_type_for_action: Optional[str]
    document_understanding_output: Optional[Dict]
    document_understanding_error: Optional[str]
}
```

### Graph Nodes

#### From `nodes_routing.py`:
1. **receive_user_input_node**: Processes incoming user query
2. **routing_decision_node**: Determines which subgraph to invoke
   - Detects quiz intent (e.g., "/start_quiz")
   - Routes to appropriate graph

#### From `nodes_invokers.py`:
1. **invoke_new_chat_graph_node**: Calls new_chat_graph with mapped state
2. **invoke_quiz_engine_graph_node**: Calls quiz_engine_graph with mapped state

### Graph Structure
```
Entry → receive_user_input → routing_decision → [conditional routing]
                                                   ├→ new_chat_graph → END
                                                   ├→ quiz_engine_graph → END
                                                   └→ end → END
```

### Routing Logic (`route_based_on_decision`)
- **Default**: new_chat_graph
- **Validation**: Ensures next_node is in valid_nodes list
- **Fallback**: If quiz unavailable, routes to new_chat_graph
- **Error Handling**: Critical errors force END with error message

### Factory Function
```python
create_supervisor_graph(
    checkpointer: Optional[SqliteSaver] = None,
    compiled_quiz_engine_graph_instance: Optional[Any] = None,
    doc_retrieval_service: Optional[DocumentRetrievalService] = None
) -> CompiledGraph
```

### Initialization Process
1. Instantiates new_chat_graph with checkpointer
2. Uses provided quiz_engine_graph or creates new one
3. Binds doc_retrieval_service to routing_decision_node via functools.partial
4. Binds graph instances to invoker nodes via functools.partial
5. Compiles with supervisor checkpointer

### Error Handling
- Comprehensive try-except during graph setup
- Fallback error graph if initialization fails
- Placeholder nodes if subgraphs unavailable

---

## File: `backend/graphs/document_understanding_agent/graph.py`

### Purpose
Analyzes document structure and generates TTS-ready narratives for accessibility.

### State: `DocumentUnderstandingState`
```python
{
    document_id: str
    input_file_path: str  # GCS URI
    input_file_mimetype: str
    tts_ready_narrative: Optional[str]
    error_message: Optional[str]
    processing_status: str
}
```

### Key Function: `run_dua_processing_for_document`
- **Purpose**: Async entry point for DUA processing
- **Process**:
  1. Validates input (document_id, file path, mimetype)
  2. Loads image from GCS
  3. Uploads to Vertex AI
  4. Invokes Gemini 2.5 Flash with comprehensive prompt
  5. Extracts TTS-ready narrative from response
  6. Returns result dict with narrative or error

### LLM Configuration
- **Model**: gemini-2.5-flash-preview-05-20
- **Temperature**: 0.3 (for deterministic output)
- **Multimodal**: Accepts image + text prompt

### Comprehensive LLM Prompt
- **Critical Instructions**:
  - Prioritize top-left image if present
  - Follow top-to-bottom, column-wise reading order
  - Extract verbatim text
  - Describe visual elements (images, tables)
  - Generate TTS-ready narrative
- **Output Format**: Plain text narrative suitable for text-to-speech

### Processing Flow
```
1. Validate inputs
2. Load image from GCS (StorageService)
3. Upload to Vertex AI (Part.from_data)
4. Create multimodal prompt (image + text instructions)
5. Invoke Gemini model
6. Extract narrative from response
7. Return {tts_ready_narrative: str} or {error_message: str}
```

### Error Handling
- Validates required fields (document_id, file_path, mimetype)
- Handles GCS download failures
- Handles Vertex AI upload failures
- Handles LLM invocation errors
- Returns detailed error messages

### Integration
- Called directly from `document_routes.py` during document upload
- Not part of supervisor graph (runs independently)
- Results stored in Firestore as 'dua_narrative_content'

---

## Summary

### Graph Architecture
```
Supervisor Graph (Orchestrator)
├── New Chat Graph (Q&A)
│   └── Uses: DocumentRetrievalService, Gemini 2.5 Flash
├── Quiz Engine Graph (V2)
│   └── Uses: Gemini 2.5 Flash, Pydantic validation
└── Document Understanding Agent (Independent)
    └── Uses: Vertex AI, Gemini 2.5 Flash Preview, GCS
```

### State Persistence
- **Checkpointers**: SQLite-based (SqliteSaver)
- **Databases**:
  - `quiz_checkpoints.db`
  - `general_query_checkpoints.db`
  - `supervisor_checkpoints.db`
  - `document_understanding_checkpoints.db`
- **Thread Management**: Each conversation has unique thread_id
- **Quiz Sessions**: Separate thread_id for quiz state isolation

### LLM Models Used
1. **Gemini 2.5 Flash** (new_chat_graph, quiz_engine_graph)
   - Temperature: 0.7 (generation), 0.3 (evaluation)
2. **Gemini 2.5 Flash Preview 05-20** (document_understanding_agent)
   - Temperature: 0.3 (deterministic)
   - Multimodal capabilities

### Key Design Patterns
1. **Factory Functions**: All graphs use factory pattern for flexible instantiation
2. **Functional Binding**: Uses functools.partial to inject dependencies
3. **State Mapping**: Supervisor maps its state to subgraph states
4. **Error Propagation**: Errors bubble up to supervisor for unified handling
5. **Modular Architecture**: Each graph is independently testable
