# backend/graphs/supervisor/nodes_invokers.py
import traceback
import uuid
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, HumanMessage

# Imports relative to the 'supervisor' package or its parent 'graphs'
from backend.graphs.supervisor.state import SupervisorState
from backend.graphs.new_chat_graph import GeneralQueryState # State for the new_chat_graph
from backend.graphs.quiz_engine_graph import QuizEngineState # State for the Quiz Engine v2
from backend.utils.message_utils import serialize_messages, deserialize_messages

DEFAULT_MAX_QUIZ_QUESTIONS = 5

def invoke_new_chat_graph_node(state: SupervisorState, graph_instance: Any) -> dict[str, Any]:
    """
    Invokes the New Chat Graph (new_chat_graph) and updates supervisor state.
    This node assumes that if it's called, the intent is purely chat.
    It does not handle routing to other graphs like quiz.
    """
    print("\n[Supervisor] --- Invoking New Chat Graph ---")

    user_id = state.get("user_id")
    current_query = state.get("current_query", "").strip()
    document_id = state.get("document_id_for_action")
    active_chat_thread_id = state.get("active_chat_thread_id")

    updates: dict[str, Any] = {
        "user_id": user_id,
        "current_query": current_query, 
        "document_id_for_action": document_id,
        "conversation_history": state.get("conversation_history", []),
        "active_chat_thread_id": active_chat_thread_id,
        "next_graph_to_invoke": "end", 
        "final_agent_response": None,
        "supervisor_error_message": None,
        "document_understanding_output": state.get("document_understanding_output"),
        "document_understanding_error": state.get("document_understanding_error"),
        # Quiz v2 fields are passed through, not modified by chat node
        "active_quiz_v2_thread_id": state.get("active_quiz_v2_thread_id"),
        "quiz_v2_output": state.get("quiz_v2_output"),
        "is_quiz_v2_active": state.get("is_quiz_v2_active", False),
    }

    if not user_id:
        error_msg = "User ID is required for the new chat graph."
        print(f"[Supervisor] ERROR: {error_msg}")
        updates["supervisor_error_message"] = error_msg
        updates["final_agent_response"] = "I'm sorry, there was an issue identifying your user session. Please try again."
        return updates

    if not active_chat_thread_id:
        error_msg = "Active chat thread ID is required for the new chat graph."
        print(f"[Supervisor] ERROR: {error_msg}")
        updates["supervisor_error_message"] = error_msg
        updates["final_agent_response"] = "I'm sorry, there was a problem with tracking our conversation. Please try starting a new one."
        return updates

    chat_input_state: GeneralQueryState = {
        "user_id": user_id,
        "thread_id": active_chat_thread_id, 
        "document_id": document_id,
        "query": current_query,
        "messages": deserialize_messages(state.get("conversation_history", [])),
        "response": None,
        "error_message": None
    }

    print(f"[Supervisor] Invoking new_chat_graph with input: { {k:v for k,v in chat_input_state.items() if k != 'messages'} } and thread_id: {active_chat_thread_id}")

    try:
        response_state = graph_instance.invoke(
            chat_input_state,
            {"configurable": {"thread_id": active_chat_thread_id}}
        )
        print(f"[Supervisor] new_chat_graph raw response_state: {response_state}")

        if response_state:
            updates["final_agent_response"] = response_state.get("response")
            updated_history = response_state.get("messages", [])
            if updated_history:
                 # Serialize messages before storing in supervisor state
                 updates["conversation_history"] = serialize_messages(updated_history)
            
            if response_state.get("error_message"):
                # Log error from chat_graph, but it might have also produced a user-facing response
                print(f"[Supervisor] Error from new_chat_graph: {response_state.get('error_message')}")
                if not updates["final_agent_response"]:
                    updates["final_agent_response"] = "I encountered an issue while processing your request."
        else:
            print("[Supervisor] ERROR: new_chat_graph returned no response_state.")
            updates["supervisor_error_message"] = "New chat graph returned no response."
            updates["final_agent_response"] = "I'm sorry, I couldn't process your request at the moment."

    except Exception as e:
        error_msg = f"Exception invoking new_chat_graph: {str(e)}"
        print(f"[Supervisor] {error_msg}")
        traceback.print_exc()
        updates["supervisor_error_message"] = error_msg
        updates["final_agent_response"] = "I'm sorry, an unexpected error occurred while I was thinking."

    print(f"[Supervisor] New Chat Graph invocation complete. Response: '{updates.get('final_agent_response', '')[:100]}...'NextGraph: {updates.get('next_graph_to_invoke')}")
    
    # --- Safety serialization for all message states before checkpoint ---
    if "conversation_history" in updates:
        updates["conversation_history"] = serialize_messages(updates["conversation_history"])
    
    return updates

def invoke_quiz_engine_graph_node(state: SupervisorState, graph_instance: Any) -> dict[str, Any]:
    """
    Invokes the Quiz Engine Graph (quiz_engine_graph) and updates supervisor state.
    Assumes routing node has set is_quiz_v2_active=True, active_quiz_v2_thread_id,
    and document_snippet_for_quiz (if new quiz).
    """
    print("\n[Supervisor] --- Invoking Quiz Engine Graph ---")

    user_id = state.get("user_id")
    current_query = state.get("current_query", "").strip()
    document_id_for_action = state.get("document_id_for_action")
    active_quiz_v2_thread_id = state.get("active_quiz_v2_thread_id")
    is_quiz_v2_active = state.get("is_quiz_v2_active", False)
    document_snippet_for_quiz = state.get("document_snippet_for_quiz")

    updates: dict[str, Any] = {
        "user_id": user_id,
        "current_query": current_query,
        "document_id_for_action": document_id_for_action,
        "active_quiz_v2_thread_id": active_quiz_v2_thread_id,
        "is_quiz_v2_active": is_quiz_v2_active,
        "quiz_engine_state": state.get("quiz_engine_state"),  # Carry over existing state
        "final_agent_response": None,
        "supervisor_error_message": None,
        "next_graph_to_invoke": "end",
        "document_snippet_for_quiz": document_snippet_for_quiz
    }

    if not user_id:
        updates["supervisor_error_message"] = "User ID is missing. Cannot proceed with quiz."
        updates["final_agent_response"] = "I'm sorry, I can't start or continue the quiz without knowing who you are."
        updates["is_quiz_v2_active"] = False
        updates["active_quiz_v2_thread_id"] = None
        return updates

    quiz_input: Dict[str, Any]
    is_initial_quiz_invocation_for_thread = state.get("quiz_engine_state") is None

    if is_initial_quiz_invocation_for_thread:
        print(f"[Supervisor] Quiz Engine: Initial invocation for doc {document_id_for_action}, thread {active_quiz_v2_thread_id}")
        if not document_id_for_action or not document_snippet_for_quiz:
            err_msg = "Document ID or content snippet is missing for starting a new quiz."
            print(f"[Supervisor] ERROR: {err_msg}")
            updates["supervisor_error_message"] = err_msg
            updates["final_agent_response"] = "I need a document to create a quiz. Please select one or provide the content."
            updates["is_quiz_v2_active"] = False
            updates["active_quiz_v2_thread_id"] = None
            return updates

        quiz_input = {
            "status": "generating_first_question",
            "document_id": document_id_for_action,
            "document_content_snippet": document_snippet_for_quiz,
            "user_id": user_id,
            "max_questions": DEFAULT_MAX_QUIZ_QUESTIONS,
            "active_quiz_thread_id": active_quiz_v2_thread_id,
            "quiz_history": [],
            "current_question_index": 0,
            "current_question_number": 0,
            "score": 0,
            "error_message": None,
            "llm_call_count": 0
        }
    else:
        print(f"[Supervisor] Quiz Engine: Continuing quiz. User answer: '{current_query}' for thread {active_quiz_v2_thread_id}")
        quiz_input = state["quiz_engine_state"]
        quiz_input["user_answer"] = current_query
        quiz_input["status"] = "evaluating_answer"

    print(f"[Supervisor] Invoking quiz_engine_graph with input keys: {list(quiz_input.keys())} and thread_id: {active_quiz_v2_thread_id}")

    try:
        response_quiz_state: QuizEngineState = graph_instance.invoke(
            quiz_input,
            {"configurable": {"thread_id": active_quiz_v2_thread_id}}
        )
        print(f"[Supervisor] quiz_engine_graph raw response_state: {response_quiz_state}")

        if response_quiz_state:
            updates["quiz_engine_state"] = response_quiz_state

            current_status = response_quiz_state.get("status")
            current_question_to_display = response_quiz_state.get("current_question_to_display")
            current_feedback_to_display = response_quiz_state.get("current_feedback_to_display")
            error_message_from_quiz = response_quiz_state.get("error_message")

            is_quiz_active = response_quiz_state.get("status") not in ["quiz_completed", "error"]

            state_update = {
                "active_quiz_v2_thread_id": response_quiz_state.get("active_quiz_thread_id"),
                "quiz_v2_output": response_quiz_state,
                "is_quiz_v2_active": is_quiz_active,
                "next_graph_to_invoke": "end" if not is_quiz_active else "self",
                "final_agent_response": response_quiz_state.get("current_feedback_to_display"),
                "conversation_history": state.get("conversation_history", []) + [
                    AIMessage(content=f"Quiz engine processed answer. Status: {response_quiz_state.get('status')}")
                ]
            }

            question_data = response_quiz_state.get("current_question_to_display")
            final_summary_or_feedback = response_quiz_state.get("current_feedback_to_display")

            # This text will be used for both the UI display and for TTS generation.
            # By formatting it with double newlines, we replicate the raw text structure
            # that the TTSService correctly processes for the "Read" tab.

            # Default text is the summary or feedback message.
            final_text = final_summary_or_feedback or ""

            if question_data and question_data.get("question_text"):
                question_text = question_data.get("question_text", "")
                options = question_data.get("options", [])
                q_num = response_quiz_state.get('current_question_number', '')
                max_q = response_quiz_state.get('max_questions', '')

                # Format the question with the "Question X/Y:" prefix.
                if q_num and max_q:
                    question_prefix = f"Question {q_num}/{max_q}: "
                else:
                    question_prefix = ""
                
                full_question_text = f"{question_prefix}{question_text}"

                # Create a list of formatted option strings.
                option_lines = [f"{i + 1}. {option}" for i, option in enumerate(options)]

                # Combine the question and options.
                formatted_question = f"{full_question_text}\n\n" + "\n\n".join(option_lines)

                # If there was feedback, prepend it to the question.
                if final_text:
                    final_text = f"{final_text}\n\n{formatted_question}"
                else:
                    final_text = formatted_question
                
                # Pass the raw options to the frontend for rendering interactive buttons.
                state_update["options_for_display"] = options

            # Set the final response field that the TTS service will use.
            state_update["final_agent_response"] = final_text

            updates.update(state_update)

            if error_message_from_quiz:
                updates["supervisor_error_message"] = f"Error from Quiz Engine: {error_message_from_quiz}"
                updates["is_quiz_v2_active"] = False
                updates["active_quiz_v2_thread_id"] = None
                updates["next_graph_to_invoke"] = "end"
            elif current_status in ["quiz_completed", "quiz_cancelled"]:
                updates["is_quiz_v2_active"] = False
                updates["active_quiz_v2_thread_id"] = None
                updates["next_graph_to_invoke"] = "end"
            else:
                # Any other state means the quiz is ongoing.
                updates["is_quiz_v2_active"] = True
                updates["next_graph_to_invoke"] = "quiz_engine_graph"
        else:
            error_msg = "Quiz Engine returned an empty state."
            print(f"[Supervisor] ERROR: {error_msg}")
            updates["supervisor_error_message"] = error_msg
            updates["final_agent_response"] = "Sorry, there was a problem processing the quiz. Please try again."
            updates["is_quiz_v2_active"] = False
            updates["active_quiz_v2_thread_id"] = None

    except Exception as e:
        error_msg = f"Exception invoking quiz_engine_graph: {str(e)}"
        print(f"[Supervisor] {error_msg}")
        traceback.print_exc()
        updates["supervisor_error_message"] = error_msg
        updates["final_agent_response"] = "Sorry, a system error occurred while running the quiz."
        updates["is_quiz_v2_active"] = False
        updates["active_quiz_v2_thread_id"] = None

    print(f"[Supervisor] Quiz Engine Graph invocation complete. Response: '{updates.get('final_agent_response', '')[:100]}...', QuizActive: {updates.get('is_quiz_v2_active')}, NextGraph: {updates.get('next_graph_to_invoke')}")
    
    # --- Safety serialization for all message states before checkpoint ---
    if "conversation_history" in updates:
        updates["conversation_history"] = serialize_messages(updates["conversation_history"])
    
    return updates

