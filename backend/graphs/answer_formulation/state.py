"""
State definition for the Answer Formulation LangGraph.

This module defines the state structure used throughout the Answer Formulation
workflow, tracking the user's transcript, refined answer, edits, and metadata.
"""

from typing import TypedDict, List, Optional, Literal


class AnswerFormulationState(TypedDict):
    """
    State for the Answer Formulation LangGraph.
    
    This state tracks the complete lifecycle of an answer formulation session,
    from initial transcript through refinement and editing to finalization.
    """
    
    # Input fields
    user_id: str  # ID of the user creating the answer
    session_id: str  # Unique ID for this formulation session
    question_prompt: Optional[str]  # The assignment question (optional but recommended)
    original_transcript: str  # Raw speech-to-text output from the student
    
    # Processing fields
    refined_answer: Optional[str]  # Current refined version of the answer
    edit_command: Optional[str]  # Latest edit instruction from the user
    edit_history: List[dict]  # Track all edits for undo/analysis
    
    # Validation fields
    fidelity_score: Optional[float]  # 0-1 score, how much content is from original
    fidelity_violations: List[str]  # External information added by AI (if any)
    
    # Status field
    status: Literal[
        "initializing",  # Session just started
        "refining",      # Currently refining the transcript
        "refined",       # Refinement complete, ready for review/edit
        "editing",       # Currently applying an edit
        "finalized",     # User has finalized the answer
        "error"          # An error occurred
    ]
    error_message: Optional[str]  # Error message if status is 'error'
    
    # Metadata fields
    iteration_count: int  # Number of refinement cycles (refinement + edits)
    llm_call_count: int  # Total number of LLM API calls made
    created_at: str  # ISO timestamp when session was created
    updated_at: str  # ISO timestamp of last update
