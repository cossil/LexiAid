# Backend LangGraph Analysis

## Overview
The backend uses LangGraph to implement a sophisticated agent architecture that handles different types of user interactions through specialized graphs. The system follows a supervisor pattern that routes requests to appropriate sub-graphs based on user intent and context.

## Graph Files

### 1. __init__.py

**Purpose**: Package initialization file that marks the graphs directory as a Python sub-package.

**Key Functions/Components**:
- Simple package marker for Python module system

**Inputs**: None
**Outputs/Side Effects**: Enables importing from the graphs package

---

### 2. new_chat_graph.py

**Purpose**: Implements the general chat/Q&A functionality for document-based conversations using Google's Gemini AI model.

**Key Functions/Components**:

#### State Definition
- **GeneralQueryState**: TypedDict managing conversation state including document_id, user_id, thread_id, messages, query, response, and error handling

#### Core Node
- **call_chat_llm_node()**: Main processing node that:
  - Instantiates Gemini LLM client
  - Retrieves document content via DocumentRetrievalService
  - Performs conversation history distillation
  - Formats prompts with document narrative and context
  - Invokes LLM for response generation
  - Handles errors gracefully

#### Helper Functions
- **distill_conversation_history()**: Summarizes recent conversation messages for context
- **create_new_chat_graph()**: Compiles the StateGraph with checkpointing support

#### Prompt Template
- Structured LLM prompt with document narrative, conversation history, and user query sections
- Enforces strict adherence to document content (no external knowledge)

**Inputs**:
- User queries and conversation history
- Document IDs for context retrieval
- Thread IDs for conversation persistence

**Outputs/Side Effects**:
- Generated AI responses based on document content
- Updated conversation state
- Error handling for document retrieval failures

**Dependencies**: Google Generative AI (Gemini), DocumentRetrievalService, LangGraph

---

### 3. quiz_engine_graph.py

**Purpose**: Advanced quiz generation and evaluation system that creates interactive assessments based on document content with comprehensive state management.

**Key Functions/Components**:

#### Pydantic Models
- **LLMQuestionDetail**: Validates quiz question structure (text, options, correct answer, explanation)
- **LLMQuizResponse**: Manages quiz responses (feedback, correctness, next question, completion status)

#### State Definition
- **QuizEngineState**: Comprehensive TypedDict tracking:
  - Document information and content
  - User and session identifiers
  - Quiz progress (score, history, current question)
  - Status tracking (initializing, generating, evaluating, completed, error)
  - Display state (questions, feedback)

#### Core Node
- **call_quiz_engine_node()**: Central processing that:
  - Routes to appropriate prompt chains based on status
  - Handles first question generation
  - Manages answer evaluation and next question generation
  - Updates quiz history and scoring
  - Determines quiz completion

#### Prompt Templates
- **PROMPT_GENERATE_FIRST_QUESTION**: Creates initial quiz questions
- **PROMPT_EVALUATE_AND_GENERATE_NEXT**: Evaluates answers and generates subsequent questions or final summary

#### Helper Functions
- **get_quiz_engine_chain()**: Creates appropriate LangChain chains based on status
- **_format_quiz_history_for_prompt()**: Formats quiz history for LLM context

**Inputs**:
- Document content snippets
- User answers and quiz parameters
- Quiz history and progress state

**Outputs/Side Effects**:
- Generated quiz questions with multiple choice options
- Answer evaluation with detailed feedback
- Progress tracking and scoring
- Final quiz summaries and completion status

**Dependencies**: Google Generative AI, Pydantic for validation, LangChain components

---

### 4. supervisor/ (Directory)

#### 4.1 state.py

**Purpose**: Defines the comprehensive state structure for the supervisor graph that orchestrates all sub-graph interactions.

**Key Functions/Components**:
- **SupervisorState**: Master TypedDict containing:
  - User identification and current query
  - Conversation history management
  - Active thread IDs for different graph types
  - Document and routing information
  - Quiz engine state integration
  - Audio input handling
  - Document understanding state
  - Error handling and final responses

**Inputs**: State data from various sub-graphs and user inputs
**Outputs/Side Effects**: Centralized state management for cross-graph coordination

---

#### 4.2 graph.py

**Purpose**: Creates and configures the supervisor graph that routes user requests to appropriate specialized graphs.

**Key Functions/Components**:
- **create_supervisor_graph()**: Main graph construction function that:
  - Instantiates sub-graphs (new_chat_graph, quiz_engine_graph)
  - Adds routing and invoker nodes
  - Configures conditional edges based on routing decisions
  - Handles fallback scenarios for missing dependencies
  - Compiles with checkpointing support

#### Node Structure
- **receive_user_input**: Entry point for user requests
- **routing_decision**: Determines which specialized graph to invoke
- **new_chat_graph**: Handles document-based Q&A
- **quiz_engine_graph**: Manages quiz interactions

#### Routing Logic
- **route_based_on_decision()**: Conditional routing function that:
  - Validates routing decisions
  - Handles missing graph instances
  - Provides fallback behavior
  - Ensures valid node transitions

**Inputs**: User queries, document context, routing decisions
**Outputs/Side Effects**: Coordinated graph invocation and response aggregation

**Dependencies**: LangGraph StateGraph, sub-graph instances, DocumentRetrievalService

---

#### 4.3 nodes_routing.py & nodes_invokers.py

**Purpose**: Implement the routing logic and graph invocation mechanisms for the supervisor.

**Key Functions/Components**:
- **receive_user_input_node()**: Processes incoming user input and initial state setup
- **routing_decision_node()**: Analyzes user intent to determine appropriate graph routing
- **invoke_new_chat_graph_node()**: Manages chat graph invocation and response handling
- **invoke_quiz_engine_graph_node()**: Handles quiz graph lifecycle management

---

#### 4.4 utils.py

**Purpose**: Provides utility functions for supervisor operations including state management and message processing.

---

### 5. answer_formulation/ (Directory)

#### 5.1 state.py

**Purpose**: Defines state structure for the Answer Formulation workflow that helps students transform spoken thoughts into written answers.

**Key Functions/Components**:
- **AnswerFormulationState**: TypedDict tracking:
  - User and session identification
  - Original transcript and refined answer
  - Edit commands and history
  - Fidelity validation metrics
  - Status progression through workflow
  - Iteration and LLM call counters
  - Timestamps for audit trails

**Inputs**: Student transcripts, edit commands, validation results
**Outputs/Side Effects**: Structured state for answer refinement workflow

---

#### 5.2 graph.py

**Purpose**: Implements the Answer Formulation LangGraph workflow with nodes for validation, refinement, editing, and fidelity checking.

**Key Functions/Components**:

#### Core Nodes
- **validate_input_node()**: Entry point validation:
  - Checks transcript length (5-2000 words)
  - Validates required fields (user_id, session_id)
  - Initializes processing state
  - Sets appropriate error states

- **refine_answer_node()**: Core AI refinement:
  - Uses Gemini with low temperature (0.3) for faithful refinement
  - Transforms spoken thoughts into clear written answers
  - Enforces constraint of not adding external information
  - Updates iteration counters and timestamps

- **apply_edit_node()**: Precise edit application:
  - Parses user voice commands for edit intent
  - Uses very low temperature (0.2) for minimal, precise changes
  - Tracks edit history with before/after states
  - Supports replacement, rephrasing, addition, deletion

- **validate_fidelity_node()**: Quality control monitoring:
  - Samples 10% of requests for cost efficiency
  - Validates that refined answers contain only original transcript information
  - Logs violations for developer monitoring
  - Non-blocking (doesn't stop user workflow)

#### Graph Construction
- **create_answer_formulation_graph()**: Wires nodes with conditional routing:
  - Routes to apply_edit for edit commands or validate_input for new refinements
  - Includes fidelity validation after refinement and edits
  - Supports checkpointing for session persistence

**Inputs**: Student transcripts, edit commands, session parameters
**Outputs/Side Effects**: Refined written answers, edit tracking, fidelity monitoring

**Dependencies**: Google Generative AI, datetime utilities, random sampling, logging

---

#### 5.3 prompts.py

**Purpose**: Contains system prompts for different stages of the answer formulation workflow.

**Key Functions/Components**:
- **REFINEMENT_SYSTEM_PROMPT**: Guides AI to refine without adding external information
- **EDIT_SYSTEM_PROMPT**: Ensures precise, minimal edits based on user commands
- **VALIDATION_PROMPT**: Structured prompt for fidelity checking and violation identification

---

#### 5.4 utils.py

**Purpose**: Provides utility functions for edit command parsing and fidelity validation.

**Key Functions/Components**:
- **parse_edit_command()**: Analyzes user voice commands to determine edit type and parameters
- **extract_fidelity_score()**: Parses LLM responses to extract numerical fidelity scores
- **extract_violations()**: Identifies specific fidelity violations from validation responses

---

## LangGraph Architecture Patterns

### State Management
- **TypedDict Usage**: Strong typing for state structures across all graphs
- **Checkpointing**: SQLite-based persistence for conversation and session state
- **State Updates**: Incremental state updates through return dictionaries

### Graph Composition
- **Supervisor Pattern**: Central routing graph coordinating specialized sub-graphs
- **Conditional Routing**: Dynamic graph selection based on user intent and context
- **Node Specialization**: Single-purpose nodes with clear responsibilities

### Error Handling
- **Graceful Degradation**: Fallback nodes and error states throughout
- **Error Propagation**: Structured error messaging through state
- **Recovery Mechanisms**: Retry logic and alternative routing paths

### LLM Integration
- **Temperature Control**: Different temperatures for different task types
- **Prompt Engineering**: Structured prompts with clear constraints and examples
- **Response Validation**: Pydantic models for structured response validation

### Performance Considerations
- **Sampling Strategies**: 10% sampling for expensive validation operations
- **Checkpoint Efficiency**: SQLite-based lightweight state persistence
- **Graph Reuse**: Compiled graph instances cached and reused

This architecture provides a robust, scalable foundation for AI-powered educational features while maintaining clear separation of concerns and comprehensive error handling.
