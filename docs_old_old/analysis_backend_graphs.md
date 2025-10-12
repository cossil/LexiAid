# Codebase Analysis: Backend Graphs (LangGraph Agents)

This document analyzes the agentic core of the LexiAid application, which is built using the LangGraph framework. These graphs define the logic, state management, and control flow for all AI-driven interactions, from general chat to structured quizzes.

---

## 1. Supervisor Graph (`backend/graphs/supervisor/`)

### **Purpose**

The Supervisor is the master orchestrator of the entire agentic system. It is the entry point for any user interaction handled by the `/api/v2/agent/chat` endpoint. Its sole responsibility is to receive a user's query, decide which specialized sub-agent (or "graph") is best suited to handle it, invoke that agent, and format the final response.

### **Architecture & Flow**

1.  **State (`supervisor/state.py`)**: The `SupervisorState` TypedDict is the global state for the entire system. It holds the user's query, conversation history, active document ID, and the states of any active sub-graphs, most notably the `is_quiz_v2_active` flag and the `active_quiz_v2_thread_id`.

2.  **Entry (`supervisor/nodes_routing.py`)**: The flow begins in the `receive_user_input_node`. This node performs initial processing, such as running Speech-to-Text (STT) if audio is present, and makes a preliminary guess about where to route the request based on simple keyword matching (e.g., if the query contains "/start_quiz").

3.  **Routing (`supervisor/nodes_routing.py`)**: The `routing_decision_node` makes the definitive choice. It checks for active quizzes, handles quiz cancellation logic, and, crucially, prepares the necessary data for the chosen sub-graph. For example, if a new quiz is starting, this node calls the `DocumentRetrievalService` to fetch a content snippet to be used for question generation.

4.  **Invocation (`supervisor/nodes_invokers.py`)**: Based on the routing decision, the supervisor calls one of the invoker nodes:
    *   `invoke_new_chat_graph_node`: Prepares a `GeneralQueryState` and calls the simple chat agent.
    *   `invoke_quiz_engine_graph_node`: Prepares a `QuizEngineState` and calls the quiz agent.

5.  **Assembly (`supervisor/graph.py`)**: This file wires everything together. It adds the nodes and defines the conditional edges that direct the flow based on the `next_graph_to_invoke` value set in the state by the routing nodes. It compiles the final `supervisor_graph` that is used by `app.py`.

### **Inputs & Outputs**

-   **Input**: The `SupervisorState`, populated by the `agent_chat_route` in `app.py` with the user's query, user ID, thread ID, etc.
-   **Output**: The final, updated `SupervisorState`. The `final_agent_response` field contains the text to be sent to the user, and other fields (like `quiz_v2_output` or `is_quiz_v2_active`) inform the frontend of the current application state.

---

## 2. New Chat Graph (`backend/graphs/new_chat_graph.py`)

### **Purpose**

This is the default agent for handling general questions and answers. It is a simple, single-purpose graph designed to provide answers based on the content of a selected document.

### **Architecture & Flow**

-   **State (`GeneralQueryState`)**: A simple state holding the user's query, conversation history, and the ID of the document being discussed.
-   **Node (`call_chat_llm_node`)**: This is the only node in the graph. It performs the following steps:
    1.  Uses `DocumentRetrievalService` to fetch the content of the specified document.
    2.  Constructs a prompt using `LLM_PROMPT_TEMPLATE`, which instructs the LLM to answer the user's question *only* using the provided document narrative.
    3.  Invokes the `gemini-2.5-flash` model.
    4.  Places the LLM's response into the `response` field of the state.

### **Inputs & Outputs**

-   **Input**: `GeneralQueryState` containing the user's query and document ID.
-   **Output**: The updated `GeneralQueryState` with the `response` field populated with the LLM's answer.

---

## 3. Quiz Engine Graph (`backend/graphs/quiz_engine_graph.py`)

### **Purpose**

This graph is a sophisticated, self-contained agent that manages the entire lifecycle of a multiple-choice quiz. It handles generating the first question, evaluating user answers, providing feedback, generating subsequent questions, and concluding the quiz with a final score and summary.

### **Architecture & Flow**

-   **State (`QuizEngineState`)**: A detailed state that tracks everything about the current quiz: the document snippet, the full history of questions and answers (`quiz_history`), the user's current score, the current question index, and the overall `status` (`generating_first_question`, `evaluating_answer`, `quiz_completed`).

-   **Pydantic Models**: It uses Pydantic models (`LLMQuestionDetail`, `LLMQuizResponse`) to define a strict JSON schema for the LLM's output. This is a robust way to force the LLM to return structured data that can be reliably parsed to drive the quiz logic.

-   **Node (`call_quiz_engine_node`)**: This single, powerful node contains the core logic. It checks the `status` from the input state and behaves differently based on it:
    -   If `status` is `generating_first_question`, it uses the `PROMPT_GENERATE_FIRST_QUESTION` to create the first question from the document snippet.
    -   If `status` is `evaluating_answer`, it uses the `PROMPT_EVALUATE_AND_GENERATE_NEXT`. This complex prompt provides the LLM with the previous question, the user's answer, the correct answer, the quiz history, and the current score. It asks the LLM to provide feedback, determine if the answer was correct, and either generate the *next* question or conclude the quiz with a final summary.

-   **Control Flow**: The control flow is managed by the LLM's JSON output. The `quiz_is_complete` boolean field in the `LLMQuizResponse` model dictates whether the quiz continues or ends. The graph itself is simple (one node leading to END), but the *logic* inside the node is stateful and complex.

### **Inputs & Outputs**

-   **Input**: The `QuizEngineState`. For a new quiz, this contains the `document_content_snippet`. For subsequent turns, it contains the `user_answer`.
-   **Output**: The updated `QuizEngineState`, containing the next question to display (`current_question_to_display`), feedback for the user (`current_feedback_to_display`), and the updated `status`.

---

## 4. Document Understanding Agent (`backend/graphs/document_understanding_agent/`)

### **Purpose**

This is a specialized, non-conversational agent designed for a single, powerful task: analyzing a full document (including images, layout, and text) and generating a high-quality, continuous textual narrative suitable for Text-to-Speech (TTS). This is a core component of the LexiAid mission, as it transforms visually complex documents into an auditory-first format.

### **Architecture & Flow**

-   **State (`DocumentUnderstandingState`)**: A simple state that holds the input document (as a file path or bytes) and its mimetype. Its primary output field is `tts_ready_narrative`.

-   **Node (`generate_tts_narrative_node`)**: This is the graph's only node. It takes the input document and uses the powerful multimodal capabilities of the `gemini-2.5-flash` model. It sends the document file directly to the model along with the `COMPREHENSIVE_LLM_PROMPT`.

-   **Prompting**: The prompt is highly detailed, instructing the model to act as an expert reader for a student with dyslexia. It gives critical instructions on maintaining a strict top-to-bottom, left-to-right reading order, processing columns sequentially, transcribing text verbatim, describing images and tables in a narrative format, and ensuring the final output is meticulously punctuated for clear TTS rendering.

-   **Execution**: Unlike the conversational graphs, this agent is not part of the main supervisor loop. It is designed to be invoked directly as a one-off process, likely by the document upload route (`document_routes.py`), to pre-process a document and save the resulting `tts_ready_narrative` to Firestore.

### **Inputs & Outputs**

-   **Input**: `DocumentUnderstandingState` containing the document to be processed.
-   **Output**: The updated `DocumentUnderstandingState` with the `tts_ready_narrative` field populated with the complete, TTS-ready text generated by the LLM.
