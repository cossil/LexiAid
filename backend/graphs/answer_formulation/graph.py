"""
LangGraph implementation for the Answer Formulation feature.

This module contains the core nodes and graph definition for the Answer Formulation
workflow, which helps students transform spoken thoughts into clear written answers
without adding external information.
"""

from datetime import datetime, timezone
import logging
import random
from typing import Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI

from backend.graphs.answer_formulation.state import AnswerFormulationState
from backend.graphs.answer_formulation.prompts import (
    REFINEMENT_SYSTEM_PROMPT,
    EDIT_SYSTEM_PROMPT,
    VALIDATION_PROMPT
)
from backend.graphs.answer_formulation.utils import (
    parse_edit_command,
    extract_fidelity_score,
    extract_violations
)

logger = logging.getLogger(__name__)


def validate_input_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """
    Validates input and sets up initial state.
    
    This is the entry point of the graph. It checks that the transcript is valid
    and initializes the state for processing.
    
    Checks:
    - original_transcript is not empty
    - transcript is reasonable length (5-2000 words)
    - user_id and session_id are present
    
    Args:
        state: The current state of the answer formulation session
        
    Returns:
        Updated state with status set to 'refining' or 'error'
    """
    logger.info(f"Validating input for session {state.get('session_id')}")
    
    # Check if transcript exists
    if not state.get('original_transcript'):
        logger.error(f"Session {state.get('session_id')}: No transcript provided")
        state['status'] = 'error'
        state['error_message'] = 'No transcript provided'
        return state
    
    # Validate transcript length
    transcript = state['original_transcript'].strip()
    word_count = len(transcript.split())
    
    if word_count < 5:
        logger.error(f"Session {state.get('session_id')}: Transcript too short ({word_count} words)")
        state['status'] = 'error'
        state['error_message'] = 'Transcript too short (minimum 5 words)'
        return state
    
    if word_count > 2000:
        logger.error(f"Session {state.get('session_id')}: Transcript too long ({word_count} words)")
        state['status'] = 'error'
        state['error_message'] = 'Transcript too long (maximum 2000 words)'
        return state
    
    # Validate required fields
    if not state.get('user_id'):
        logger.error(f"Session {state.get('session_id')}: No user_id provided")
        state['status'] = 'error'
        state['error_message'] = 'User ID is required'
        return state
    
    if not state.get('session_id'):
        logger.error("No session_id provided")
        state['status'] = 'error'
        state['error_message'] = 'Session ID is required'
        return state
    
    # Initialize state for processing
    state['status'] = 'refining'
    state['iteration_count'] = 0
    state['llm_call_count'] = 0
    state['edit_history'] = []
    state['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    logger.info(f"Session {state['session_id']}: Input validated successfully ({word_count} words)")
    
    return state


def refine_answer_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """
    Uses LLM to refine the original transcript into a clear written answer.
    
    This is the core refinement step. It takes the student's messy spoken thoughts
    and transforms them into clear, well-structured text WITHOUT adding any
    external information.
    
    Critical Constraint: AI must NOT add external information.
    
    Args:
        state: The current state with original_transcript
        
    Returns:
        Updated state with refined_answer and updated counters
    """
    logger.info(f"Session {state['session_id']}: Starting refinement")
    
    # Build the user prompt with question context and transcript
    user_prompt = f"""
Original Question/Prompt: {state.get('question_prompt', 'Not provided')}

Student's Spoken Thoughts (verbatim):
{state['original_transcript']}

Your task: Refine this into a clear, well-structured answer.
"""
    
    try:
        # Initialize LLM with lower temperature for consistent refinement
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            temperature=0.3  # Lower temp for more faithful refinement
        )
        
        # Invoke LLM with system prompt and user prompt
        response = llm.invoke([
            {"role": "system", "content": REFINEMENT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ])
        
        refined_text = response.content.strip()
        
        # Update state
        state['refined_answer'] = refined_text
        state['status'] = 'refined'
        state['llm_call_count'] = state.get('llm_call_count', 0) + 1
        state['iteration_count'] = state.get('iteration_count', 0) + 1
        state['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        logger.info(f"Session {state['session_id']}: Refinement complete (iteration {state['iteration_count']})")
        
    except Exception as e:
        logger.error(f"Session {state['session_id']}: Refinement failed - {str(e)}")
        state['status'] = 'error'
        state['error_message'] = f'Refinement failed: {str(e)}'
    
    return state


def apply_edit_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """
    Applies a specific edit command to the refined answer.
    
    This node takes a user's voice command (e.g., "Change 'upset' to 'angry'")
    and applies that edit to the current refined answer.
    
    Edit types supported:
    - Word/phrase replacement
    - Sentence rephrasing
    - Addition
    - Deletion
    - Reordering
    
    Args:
        state: The current state with edit_command and refined_answer
        
    Returns:
        Updated state with modified refined_answer and edit history
    """
    logger.info(f"Session {state['session_id']}: Applying edit command")
    
    edit_command = state.get('edit_command')
    current_answer = state.get('refined_answer')
    
    logger.info(f"Session {state['session_id']}: Edit command: '{edit_command}'")
    logger.info(f"Session {state['session_id']}: Current answer: '{current_answer[:100] if current_answer else 'None'}...'")
    
    # Validate required fields
    if not edit_command or not current_answer:
        logger.error(f"Session {state['session_id']}: Missing edit command or answer")
        state['status'] = 'error'
        state['error_message'] = 'Missing edit command or answer'
        return state
    
    # Parse edit command to understand intent
    parsed_edit = parse_edit_command(edit_command)
    logger.info(f"Session {state['session_id']}: Parsed edit type: {parsed_edit.get('type')}")
    
    # Build edit prompt
    user_prompt = f"""
Current Answer:
{current_answer}

Edit Command: {edit_command}

Apply this edit to the answer. Only change what was requested.
"""
    
    try:
        # Initialize LLM with very low temperature for precise edits
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            temperature=0.2  # Very low for precise, minimal edits
        )
        
        # Invoke LLM with edit prompt
        response = llm.invoke([
            {"role": "system", "content": EDIT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ])
        
        updated_answer = response.content.strip()
        
        logger.info(f"Session {state['session_id']}: LLM returned updated answer: '{updated_answer[:100]}...'")
        
        # Track edit in history
        edit_record = {
            'command': edit_command,
            'parsed_type': parsed_edit.get('type'),
            'before': current_answer,
            'after': updated_answer,
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
        
        # Update state
        if 'edit_history' not in state:
            state['edit_history'] = []
        state['edit_history'].append(edit_record)
        
        state['refined_answer'] = updated_answer
        state['status'] = 'refined'
        state['llm_call_count'] = state.get('llm_call_count', 0) + 1
        state['iteration_count'] = state.get('iteration_count', 0) + 1
        state['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        logger.info(f"Session {state['session_id']}: Edit applied successfully (iteration {state['iteration_count']})")
        
    except Exception as e:
        logger.error(f"Session {state['session_id']}: Edit failed - {str(e)}")
        state['status'] = 'error'
        state['error_message'] = f'Edit failed: {str(e)}'
    
    return state


def validate_fidelity_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """
    Validates that the refined answer only contains information from the original transcript.
    
    IMPORTANT: This is an ASYNC/OFFLINE monitoring tool, not a real-time blocker.
    
    Implementation Strategy: Real-time sampling (10% of requests)
    - Only 10% of requests are validated in real-time
    - This reduces cost and latency while still providing monitoring data
    - Results are logged for developer monitoring and prompt improvement
    
    This is NOT user-facing validation - it's for quality control and prompt iteration.
    
    Args:
        state: The current state with original_transcript and refined_answer
        
    Returns:
        Updated state with fidelity_score and fidelity_violations (if sampled)
    """
    # Sample only 10% of requests for validation
    if random.random() >= 0.1:
        # Not sampled - pass through without validation
        logger.debug(f"Session {state['session_id']}: Fidelity validation skipped (not sampled)")
        return state
    
    logger.info(f"Session {state['session_id']}: Running fidelity validation (sampled)")
    
    original = state.get('original_transcript', '')
    refined = state.get('refined_answer', '')
    
    if not original or not refined:
        logger.warning(f"Session {state['session_id']}: Cannot validate fidelity - missing transcript or answer")
        return state
    
    # Build validation prompt
    validation_prompt_text = f"""
{VALIDATION_PROMPT}

Original Transcript: {original}

Refined Answer: {refined}

Task: Identify any information in the Refined Answer that was NOT present in the Original Transcript.
"""
    
    try:
        # Initialize LLM with very low temperature for consistent validation
        llm = ChatGoogleGenerativeAI(
            model="gemini-3-flash-preview",
            temperature=0.1  # Very low for consistent, strict validation
        )
        
        # Invoke LLM for validation
        response = llm.invoke(validation_prompt_text)
        
        # Parse fidelity score and violations
        fidelity_score = extract_fidelity_score(response.content)
        violations = extract_violations(response.content)
        
        # Update state
        state['fidelity_score'] = fidelity_score
        state['fidelity_violations'] = violations
        state['llm_call_count'] = state.get('llm_call_count', 0) + 1
        state['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Log violations for monitoring
        if violations and violations != ["None"]:
            logger.warning(
                f"Session {state['session_id']}: Fidelity violations detected "
                f"(score: {fidelity_score}): {violations}"
            )
        else:
            logger.info(
                f"Session {state['session_id']}: Fidelity validation passed "
                f"(score: {fidelity_score})"
            )
        
        # Alert if score is very low (< 0.8)
        if fidelity_score < 0.8:
            logger.error(
                f"Session {state['session_id']}: LOW FIDELITY SCORE ({fidelity_score}) - "
                f"Violations: {violations}"
            )
        
    except Exception as e:
        logger.error(f"Session {state['session_id']}: Fidelity validation failed - {str(e)}")
        # Don't set error status - validation failure shouldn't block user
        # Just log the error and continue
    
    return state


def create_answer_formulation_graph(checkpointer=None):
    """
    Creates and compiles the Answer Formulation LangGraph.
    
    This function wires together all the nodes into a complete workflow:
    1. validate_input - Entry point, validates transcript
    2. refine_answer - Transforms transcript into clear answer
    3. apply_edit - Applies user edit commands (optional)
    4. validate_fidelity - Quality control (10% sampling)
    
    The graph uses checkpointing to maintain session state, allowing users
    to resume sessions and apply multiple edits.
    
    Args:
        checkpointer: Optional LangGraph checkpointer (e.g., SqliteSaver)
                     for session persistence
        
    Returns:
        Compiled LangGraph ready for invocation
    """
    from langgraph.graph import StateGraph, END
    
    logger.info("Creating Answer Formulation graph")
    
    # Create the state graph
    workflow = StateGraph(AnswerFormulationState)
    
    # Add all nodes to the graph
    workflow.add_node("validate_input", validate_input_node)
    workflow.add_node("refine_answer", refine_answer_node)
    workflow.add_node("apply_edit", apply_edit_node)
    workflow.add_node("validate_fidelity", validate_fidelity_node)
    
    # Set conditional entry point based on whether this is a refinement or edit
    # If edit_command exists, go directly to apply_edit
    # Otherwise, start with validate_input for new refinements
    def route_entry(state: AnswerFormulationState) -> str:
        if state.get('edit_command'):
            logger.info(f"Session {state.get('session_id')}: Routing to apply_edit node")
            return "apply_edit"
        logger.info(f"Session {state.get('session_id')}: Routing to validate_input node")
        return "validate_input"
    
    workflow.set_conditional_entry_point(
        route_entry,
        {
            "validate_input": "validate_input",
            "apply_edit": "apply_edit"
        }
    )
    
    # Add conditional edge from validate_input
    # If validation passes (status='refining'), go to refine_answer
    # If validation fails (status='error'), end immediately
    workflow.add_conditional_edges(
        "validate_input",
        lambda state: "refine" if state['status'] == 'refining' else "end",
        {
            "refine": "refine_answer",
            "end": END
        }
    )
    
    # After refinement, always validate fidelity (even if only 10% actually run)
    workflow.add_edge("refine_answer", "validate_fidelity")
    
    # After applying an edit, validate fidelity
    workflow.add_edge("apply_edit", "validate_fidelity")
    
    # After fidelity validation, end the workflow
    workflow.add_edge("validate_fidelity", END)
    
    # Compile the graph with checkpointer for session persistence
    compiled_graph = workflow.compile(checkpointer=checkpointer)
    
    logger.info("Answer Formulation graph compiled successfully")
    
    return compiled_graph
