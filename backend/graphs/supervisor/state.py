from typing import List, TypedDict, Optional, Literal, Any, Dict, NotRequired
from langchain_core.messages import BaseMessage
from ..quiz_engine_graph import QuizEngineState

class SupervisorState(TypedDict):
    """State for the Supervisor Graph."""
    user_id: str
    current_query: str             # The raw text of the user's current incoming query
    
    # Master conversation history, managed by the supervisor
    conversation_history: List[BaseMessage] 
    
    active_chat_thread_id: Optional[str] # thread_id for an ongoing chat session with new_chat_graph
    active_dua_thread_id: Optional[str] # thread_id for DUA graph context
    
    # Information to pass to specialized graphs
    document_id_for_action: Optional[str] # Document ID relevant for the current turn
    document_snippet_for_quiz: Optional[str] # Document content snippet for the quiz
    
    # Routing decision
    next_graph_to_invoke: Optional[Literal["quiz_engine_graph", "new_chat_graph", "document_understanding_graph", "end"]]
    
    # To store the final response for the user for the current turn
    final_agent_response: Optional[str] 
    
    # To capture any errors that need to be reported or handled at supervisor level
    supervisor_error_message: Optional[str]

    # --- Quiz Engine v2 State Fields ---
    active_quiz_v2_thread_id: Optional[str] = None
    quiz_engine_state: NotRequired[Optional[QuizEngineState]] = None # To hold { question: ..., feedback: ..., status: ..., score: ..., etc. } from QuizEngineState
    is_quiz_v2_active: bool = False
    # --- End Quiz Engine v2 State Fields ---
    
    # For STT input
    current_audio_input_base64: Optional[str] = None
    current_audio_format: Optional[str] = None

    # Document Understanding Agent related state
    gcs_uri_for_action: Optional[str] = None # GCS URI for the document to be analyzed
    mime_type_for_action: Optional[str] = None # Mime type of the document for analysis
    document_understanding_output: Optional[Dict[str, Any]] = None # Result from DocumentUnderstandingAgent
    document_understanding_error: Optional[str] = None # Errors from DocumentUnderstandingAgent

