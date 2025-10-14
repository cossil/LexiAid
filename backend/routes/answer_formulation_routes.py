"""
Flask API routes for the Answer Formulation feature.

This module provides REST API endpoints for refining spoken transcripts
into clear written answers and applying edits via voice commands.
"""

from flask import Blueprint, request, jsonify, current_app, g
from datetime import datetime, timezone
import uuid
import logging
import base64

from backend.routes.document_routes import auth_required

logger = logging.getLogger(__name__)

# Create the blueprint
answer_formulation_bp = Blueprint('answer_formulation', __name__)


@answer_formulation_bp.route('/refine', methods=['POST'])
@auth_required
def refine_answer():
    """
    Refine a spoken transcript into a clear written answer.
    
    This endpoint takes a student's messy spoken thoughts and transforms them
    into clear, well-structured text WITHOUT adding external information.
    
    Request JSON:
    {
        "transcript": "Um, so like, the causes were...",
        "question": "Explain the causes of the American Revolution",
        "session_id": "optional-existing-session-id"
    }
    
    Response JSON:
    {
        "refined_answer": "The American Revolution occurred...",
        "session_id": "uuid",
        "status": "refined",
        "fidelity_score": 0.95,  // May be null if not sampled
        "iteration_count": 1,
        "audio_content_base64": "...",  // TTS audio
        "timepoints": [...]  // TTS word timing
    }
    
    Returns:
        200: Success with refined answer
        400: Bad request (missing transcript, validation failed)
        500: Server error
    """
    user_id = g.user_id
    data = request.get_json()
    
    # Extract and validate request data
    transcript = data.get('transcript', '').strip()
    question = data.get('question', '').strip()
    session_id = data.get('session_id') or str(uuid.uuid4())
    
    if not transcript:
        logger.warning(f"User {user_id}: Refine request with empty transcript")
        return jsonify({"error": "Transcript is required"}), 400
    
    logger.info(f"User {user_id}, Session {session_id}: Refine request ({len(transcript.split())} words)")
    
    try:
        # Get the Answer Formulation graph instance
        answer_formulation_graph = current_app.config.get('ANSWER_FORMULATION_GRAPH')
        
        if not answer_formulation_graph:
            logger.error("Answer Formulation graph not initialized")
            return jsonify({"error": "Service not available"}), 500
        
        # Create initial state
        initial_state = {
            'user_id': user_id,
            'session_id': session_id,
            'question_prompt': question if question else None,
            'original_transcript': transcript,
            'status': 'initializing',
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        
        # Invoke the graph
        config = {"configurable": {"thread_id": session_id}}
        result = answer_formulation_graph.invoke(initial_state, config)
        
        # Check if processing failed
        if result.get('status') == 'error':
            error_msg = result.get('error_message', 'Processing failed')
            logger.error(f"Session {session_id}: {error_msg}")
            return jsonify({"error": error_msg}), 400
        
        # Generate TTS for the refined answer
        tts_service = current_app.config.get('TTS_SERVICE')
        tts_result = {}
        audio_content_base64 = None
        
        if tts_service and result.get('refined_answer'):
            try:
                tts_result = tts_service.synthesize_text(result['refined_answer'])
                logger.info(f"Session {session_id}: TTS generated successfully")
                
                # Base64 encode the audio content if present
                if tts_result.get('audio_content'):
                    audio_bytes = tts_result['audio_content']
                    if isinstance(audio_bytes, bytes):
                        audio_content_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                    else:
                        audio_content_base64 = audio_bytes  # Already encoded
                        
            except Exception as e:
                logger.warning(f"Session {session_id}: TTS generation failed - {str(e)}")
                # Don't fail the request if TTS fails
        
        # Build response
        response_data = {
            "refined_answer": result.get('refined_answer'),
            "session_id": session_id,
            "status": result.get('status'),
            "fidelity_score": result.get('fidelity_score'),
            "iteration_count": result.get('iteration_count', 1),
            "audio_content_base64": audio_content_base64,
            "timepoints": tts_result.get('timepoints')
        }
        
        logger.info(f"Session {session_id}: Refinement successful (iteration {result.get('iteration_count')})")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Session {session_id}: Unexpected error - {str(e)}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred"}), 500


@answer_formulation_bp.route('/edit', methods=['POST'])
@auth_required
def edit_answer():
    """
    Apply an edit command to a refined answer.
    
    This endpoint takes a voice command (e.g., "Change 'upset' to 'angry'")
    and applies that edit to the current refined answer in the session.
    
    Request JSON:
    {
        "session_id": "uuid",
        "edit_command": "Change 'upset' to 'angry'"
    }
    
    Response JSON:
    {
        "refined_answer": "Updated text...",
        "session_id": "uuid",
        "status": "refined",
        "iteration_count": 2,
        "audio_content_base64": "...",
        "timepoints": [...]
    }
    
    Returns:
        200: Success with edited answer
        400: Bad request (missing session_id or edit_command)
        500: Server error
    """
    user_id = g.user_id
    data = request.get_json()
    
    # Extract and validate request data
    session_id = data.get('session_id')
    edit_command = data.get('edit_command', '').strip()
    
    if not session_id:
        logger.warning(f"User {user_id}: Edit request without session_id")
        return jsonify({"error": "session_id is required"}), 400
    
    if not edit_command:
        logger.warning(f"User {user_id}, Session {session_id}: Edit request without command")
        return jsonify({"error": "edit_command is required"}), 400
    
    logger.info(f"User {user_id}, Session {session_id}: Edit request - '{edit_command}'")
    
    try:
        # Get the Answer Formulation graph instance
        answer_formulation_graph = current_app.config.get('ANSWER_FORMULATION_GRAPH')
        
        if not answer_formulation_graph:
            logger.error("Answer Formulation graph not initialized")
            return jsonify({"error": "Service not available"}), 500
        
        # Get the checkpointer to load existing state
        checkpointer = current_app.config.get('ANSWER_FORMULATION_CHECKPOINTER')
        config = {"configurable": {"thread_id": session_id}}
        
        # Load the existing state from the checkpointer
        checkpoint = checkpointer.get(config)
        
        if not checkpoint or not checkpoint.get('channel_values'):
            logger.error(f"Session {session_id}: No existing state found")
            return jsonify({"error": "Session not found or expired"}), 404
        
        # Get the previous state
        previous_state = checkpoint['channel_values']
        
        logger.info(f"Session {session_id}: Previous answer: {previous_state.get('refined_answer', 'N/A')[:100]}...")
        logger.info(f"Session {session_id}: Edit command: {edit_command}")
        
        # Merge with edit command
        update_state = {
            **previous_state,  # Preserve all previous state
            'edit_command': edit_command,
            'status': 'editing'
        }
        
        # Invoke the graph with the merged state
        # The conditional entry point will route to apply_edit
        result = answer_formulation_graph.invoke(update_state, config)
        
        logger.info(f"Session {session_id}: Updated answer: {result.get('refined_answer', 'N/A')[:100]}...")
        logger.info(f"Session {session_id}: Result status: {result.get('status')}")
        
        # Check if editing failed
        if result.get('status') == 'error':
            error_msg = result.get('error_message', 'Edit failed')
            logger.error(f"Session {session_id}: {error_msg}")
            return jsonify({"error": error_msg}), 400
        
        # Generate TTS for the updated answer
        tts_service = current_app.config.get('TTS_SERVICE')
        tts_result = {}
        audio_content_base64 = None
        
        if tts_service and result.get('refined_answer'):
            try:
                tts_result = tts_service.synthesize_text(result['refined_answer'])
                logger.info(f"Session {session_id}: TTS generated for edited answer")
                
                # Base64 encode the audio content if present
                if tts_result.get('audio_content'):
                    audio_bytes = tts_result['audio_content']
                    if isinstance(audio_bytes, bytes):
                        audio_content_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                    else:
                        audio_content_base64 = audio_bytes  # Already encoded
                        
            except Exception as e:
                logger.warning(f"Session {session_id}: TTS generation failed - {str(e)}")
        
        # Build response
        response_data = {
            "refined_answer": result.get('refined_answer'),
            "session_id": session_id,
            "status": result.get('status'),
            "iteration_count": result.get('iteration_count'),
            "audio_content_base64": audio_content_base64,
            "timepoints": tts_result.get('timepoints')
        }
        
        logger.info(f"Session {session_id}: Edit successful (iteration {result.get('iteration_count')})")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Session {session_id}: Unexpected error during edit - {str(e)}", exc_info=True)
        return jsonify({"error": "An unexpected error occurred"}), 500
