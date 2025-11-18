import json
import uuid
from typing import Any, Optional, Dict, Tuple

from langchain_core.messages import HumanMessage
from backend.services.stt_service import STTService 
from google.cloud import speech
import base64

from backend.graphs.supervisor.state import SupervisorState
from backend.utils.message_utils import serialize_messages
from backend.graphs.supervisor.utils import (
    is_cancel_query,
    is_document_understanding_query,
    is_quiz_start_query,
    extract_document_id 
)
from backend.services.doc_retrieval_service import DocumentRetrievalService

# QUIZ_LENGTH constant removed as max_questions is handled by QuizEngineState/invoker

# --- Node Implementations ---

def receive_user_input_node(state: SupervisorState) -> dict[str, Any]:
    """
    Processes user input, performs STT if needed, and initializes supervisor state for the current turn.
    This node makes a preliminary routing decision based on keywords or active quiz state.
    """
    print("\n[Supervisor] --- Processing User Input ---")
    # print(f"[Supervisor] Incoming state: {state}") # Can be very verbose

    user_id = state.get("user_id")
    current_query_from_state = state.get("current_query", "").strip()
    current_audio_input_base64 = state.get("current_audio_input_base64")
    current_audio_format = state.get("current_audio_format")

    # Initialize updates dictionary, carrying over essential state
    # and preparing for Quiz Engine v2 fields.
    updates: dict[str, Any] = {
        "user_id": user_id,
        "current_query": current_query_from_state,
        "document_id_for_action": state.get("document_id_for_action"),
        "gcs_uri_for_action": state.get("gcs_uri_for_action"),
        "mime_type_for_action": state.get("mime_type_for_action"),
        "conversation_history": list(state.get("conversation_history", [])),
        "active_chat_thread_id": state.get("active_chat_thread_id"),
        
        # Quiz Engine v2 state fields
        "is_quiz_v2_active": state.get("is_quiz_v2_active", False),
        "active_quiz_v2_thread_id": state.get("active_quiz_v2_thread_id"),
        "quiz_v2_output": state.get("quiz_v2_output"), # Carries output from quiz engine to FE
        "document_snippet_for_quiz": state.get("document_snippet_for_quiz"), # For new quiz starts

        "next_graph_to_invoke": None, # Preliminary routing decision
        "final_agent_response": None,
        "supervisor_error_message": None,
        
        "current_audio_input_base64": None, # Clear after processing
        "current_audio_format": None,     # Clear after processing
        
        "document_understanding_output": state.get("document_understanding_output"), # Preserve from DUA
        "document_understanding_error": state.get("document_understanding_error") # Preserve from DUA
    }

    # STT processing if audio is present
    transcribed_query = None
    if current_audio_input_base64 and current_audio_format:
        print(f"[Supervisor] Audio input detected (format: {current_audio_format}). Attempting transcription...")
        try:
            audio_bytes = base64.b64decode(current_audio_input_base64)
            stt_service = STTService()
            audio_encoding_map = {
                "wav": speech.RecognitionConfig.AudioEncoding.LINEAR16,
                "mp3": speech.RecognitionConfig.AudioEncoding.MP3,
                "ogg": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
                "opus": speech.RecognitionConfig.AudioEncoding.OGG_OPUS,
                "flac": speech.RecognitionConfig.AudioEncoding.FLAC,
            }
            normalized_audio_format = current_audio_format.lower()
            encoding_enum = audio_encoding_map.get(normalized_audio_format)

            if not encoding_enum:
                print(f"[Supervisor] STT Error: Unsupported audio format '{current_audio_format}'")
                updates["supervisor_error_message"] = f"Speech-to-text failed: Unsupported audio format '{current_audio_format}'"
            else:
                config = speech.RecognitionConfig(
                    encoding=encoding_enum,
                    sample_rate_hertz=16000, 
                    language_code="en-US",
                    enable_automatic_punctuation=True,
                )
                audio = speech.RecognitionAudio(content=audio_bytes)
                response = stt_service.client.recognize(config=config, audio=audio)
                if response.results and response.results[0].alternatives:
                    transcribed_query = response.results[0].alternatives[0].transcript.strip()
                    print(f"[Supervisor] STT successful. Transcribed query: '{transcribed_query}'")
                    updates["current_query"] = transcribed_query
                else:
                    print("[Supervisor] STT Warning: No transcription result.")
        except Exception as e:
            print(f"[Supervisor] STT Error: Exception during transcription: {e}")
            updates["supervisor_error_message"] = f"Speech-to-text processing failed."
    
    current_query = updates["current_query"]
    if current_query:
        updates["conversation_history"].append(HumanMessage(content=current_query))
    elif not current_query and not updates["conversation_history"] and not updates.get("document_understanding_output") and not updates.get("is_quiz_v2_active"):
        updates["final_agent_response"] = "Hello! How can I help you today?"
        updates["next_graph_to_invoke"] = "end"
        return updates
    
    if not updates.get("document_id_for_action"):
        extracted_doc_id = extract_document_id(current_query)
        if extracted_doc_id:
            updates["document_id_for_action"] = extracted_doc_id
            print(f"[Supervisor] Extracted document_id '{extracted_doc_id}' from query.")

    # Preliminary routing decision
    if updates.get("is_quiz_v2_active"):
        print("[Supervisor] Quiz v2 active, routing to quiz_engine_graph for answer/cancel.")
        updates["next_graph_to_invoke"] = "quiz_engine_graph"
    elif is_document_understanding_query(current_query):
        print("[Supervisor] Document understanding query detected.")
        updates["next_graph_to_invoke"] = "document_understanding_graph"
    elif is_quiz_start_query(current_query):
        print("[Supervisor] Quiz v2 start query detected.")
        updates["next_graph_to_invoke"] = "quiz_engine_graph" # Actual start handled in routing_decision_node
    else:
        print("[Supervisor] Defaulting to new_chat_graph.")
        updates["next_graph_to_invoke"] = "new_chat_graph"

    if not updates.get("active_chat_thread_id") and user_id:
        updates["active_chat_thread_id"] = f"chat_thread_{user_id}_{str(uuid.uuid4())[:8]}"
        print(f"[Supervisor] Initialized new active_chat_thread_id: {updates['active_chat_thread_id']}")

    if updates["next_graph_to_invoke"] != "document_understanding_graph":
        updates["document_understanding_output"] = None # Clear stale DUA output
        updates["document_understanding_error"] = None
    
    if updates["next_graph_to_invoke"] != "quiz_engine_graph":
        updates["document_snippet_for_quiz"] = None # Clear stale snippet if not going to quiz

    print(f"[Supervisor] User input processed. Query: '{updates['current_query'][:100]}...', Tentative next_graph: {updates['next_graph_to_invoke']}")
    
    # --- Safety serialization for all message states before checkpoint ---
    if "conversation_history" in updates:
        updates["conversation_history"] = serialize_messages(updates["conversation_history"])
    
    return updates

def routing_decision_node(state: SupervisorState, doc_retrieval_service: Optional[DocumentRetrievalService]) -> dict[str, Any]:
    """Refines routing decision, handles quiz V2 start/cancel, and prepares data for target graph."""
    print("\n[Supervisor] --- Routing Decision --- ")
    current_query = state.get("current_query", "").strip().lower()
    document_id_for_action = state.get("document_id_for_action")
    user_id = state.get("user_id")
    
    is_quiz_v2_active_current = state.get("is_quiz_v2_active", False)
    preliminary_next_graph = state.get("next_graph_to_invoke")

    updates: dict[str, Any] = {} # Start with an empty dict for updates

    print(f"[Supervisor] Routing with query: '{current_query[:100]}...', doc_id: {document_id_for_action}, is_quiz_v2_active: {is_quiz_v2_active_current}, prelim_route: {preliminary_next_graph}")

    # 1. Handle active Quiz V2 session (cancellation or answer)
    if is_quiz_v2_active_current:
        if is_cancel_query(current_query):
            print("[Supervisor] Routing: Detected cancel query during active Quiz V2.")
            updates["is_quiz_v2_active"] = False
            updates["active_quiz_v2_thread_id"] = None
            updates["quiz_v2_output"] = {"status": "quiz_cancelled", "feedback_for_user": "Quiz cancelled as per your request."}
            updates["final_agent_response"] = "Okay, I've cancelled the quiz. What would you like to do next?"
            updates["next_graph_to_invoke"] = "end" # Or new_chat_graph for follow-up
            return updates
        else:
            print("[Supervisor] Routing: Active Quiz V2, forwarding answer to quiz_engine_graph.")
            updates["next_graph_to_invoke"] = "quiz_engine_graph"
            updates["document_snippet_for_quiz"] = None # Snippet not needed for answers
            return updates # Explicitly return as this is a definitive route

    # 2. Handle Document Understanding Graph routing (if preliminarily decided)
    if preliminary_next_graph == "document_understanding_graph":
        if not document_id_for_action:
            updates["supervisor_error_message"] = "Cannot analyze document: Document ID is missing."
            updates["final_agent_response"] = "I can't analyze a document without knowing which one."
            updates["next_graph_to_invoke"] = "end"
            return updates
        gcs_uri, mime_type = state.get("gcs_uri_for_action"), state.get("mime_type_for_action")
        if not gcs_uri or not mime_type:
            if doc_retrieval_service:
                # Assuming get_document_metadata is robust and exists
                success, metadata = doc_retrieval_service.get_document_metadata(document_id_for_action)
                if success and metadata and metadata.get('gcs_uri') and metadata.get('mime_type'):
                    updates["gcs_uri_for_action"], updates["mime_type_for_action"] = metadata['gcs_uri'], metadata['mime_type']
                else:
                    err_msg = metadata.get('error', 'Unknown error retrieving document details.') if isinstance(metadata, dict) else 'Unknown error retrieving document details.'
                    updates["supervisor_error_message"] = f"Failed to fetch metadata for DUA: {err_msg}"
                    updates["final_agent_response"] = "I couldn't retrieve the necessary details for document analysis."
                    updates["next_graph_to_invoke"] = "end"
                    return updates
            else:
                updates["supervisor_error_message"] = "DocumentRetrievalService is unavailable."
                updates["final_agent_response"] = "System error: Cannot retrieve document details for analysis."
                updates["next_graph_to_invoke"] = "end"
                return updates
        if not updates.get("gcs_uri_for_action") or not updates.get("mime_type_for_action"):
             updates["supervisor_error_message"] = "GCS URI or MIME type still missing after metadata fetch attempt."
             updates["final_agent_response"] = "Technical details required for document analysis are missing."
             updates["next_graph_to_invoke"] = "end"
             return updates
        updates["next_graph_to_invoke"] = "document_understanding_graph" # Confirm route
        return updates

    # 3. Handle Quiz V2 Start (if preliminarily decided or directly by query)
    if preliminary_next_graph == "quiz_engine_graph" or (is_quiz_start_query(current_query) and not is_quiz_v2_active_current):
        print("[Supervisor] Routing: Attempting to start Quiz V2.")
        if not document_id_for_action:
            updates["supervisor_error_message"] = "Cannot start quiz: Document ID is missing."
            updates["final_agent_response"] = "I can't start a quiz without a document. Please specify one."
            updates["next_graph_to_invoke"] = "end"
            return updates
        
        if not doc_retrieval_service:
            updates["supervisor_error_message"] = "DocumentRetrievalService is unavailable to fetch quiz content."
            updates["final_agent_response"] = "System error: Unable to prepare quiz content."
            updates["next_graph_to_invoke"] = "end"
            return updates

        # Fetch document snippet for the quiz
        # This method needs to be implemented in DocumentRetrievalService
        # It should return: (success: bool, content: Optional[str], error_message: Optional[str])
        fetch_success, snippet, fetch_error = doc_retrieval_service.get_document_content_for_quiz(document_id=document_id_for_action)

        if fetch_success and snippet:
            print(f"[Supervisor] Successfully fetched snippet for quiz (length: {len(snippet)}). Starting Quiz V2.")
            updates["document_snippet_for_quiz"] = snippet
            updates["document_id_for_action"] = document_id_for_action # Explicitly carry over
            updates["is_quiz_v2_active"] = True
            updates["active_quiz_v2_thread_id"] = f"quiz_v2_thread_{user_id}_{document_id_for_action}_{str(uuid.uuid4())[:8]}"
            updates["quiz_v2_output"] = None # Clear any stale output
            updates["next_graph_to_invoke"] = "quiz_engine_graph"
        else:
            print(f"[Supervisor] Failed to fetch snippet for quiz: {fetch_error}")
            updates["supervisor_error_message"] = fetch_error or "Failed to retrieve document content for the quiz."
            updates["final_agent_response"] = "I couldn't get the content needed to start the quiz. Please try again or select a different document."
            updates["is_quiz_v2_active"] = False # Ensure quiz is not active
            updates["next_graph_to_invoke"] = "end"
        return updates

    # 4. Default to new_chat_graph if no other specific route was determined
    if preliminary_next_graph == "new_chat_graph" or not updates.get("next_graph_to_invoke"):
        updates["next_graph_to_invoke"] = "new_chat_graph"
        
    # 5. Handle 'end' state and provide a default response if none is set
    if updates["next_graph_to_invoke"] == "end" and not updates.get("final_agent_response"):
        if updates.get("supervisor_error_message"):
            updates["final_agent_response"] = f"An error occurred: {updates['supervisor_error_message']}"
        else:
            # This case should ideally be covered by specific end-of-flow messages
            updates["final_agent_response"] = "Is there anything else I can help you with?"
    
    # 6. Cleanup active_quiz_v2_thread_id if quiz is no longer active by this point
    # This is a safeguard; invokers should also manage this for their specific end states.
    if not updates.get("is_quiz_v2_active") and updates.get("active_quiz_v2_thread_id"):
        print(f"[Supervisor] Clearing active_quiz_v2_thread_id as quiz is no longer active.")
        updates["active_quiz_v2_thread_id"] = None

    print(f"[Supervisor] Final routing decision: {updates['next_graph_to_invoke']}")
    
    # --- Safety serialization for all message states before checkpoint ---
    if "conversation_history" in updates:
        updates["conversation_history"] = serialize_messages(updates["conversation_history"])
    
    return updates
