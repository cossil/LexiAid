# backend/graphs/new_chat_graph.py

import json
import os
from typing import TypedDict, List, Optional, Dict, Any

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage, SystemMessage
from langgraph.graph import StateGraph, END

from backend.services.doc_retrieval_service import DocumentRetrievalService

# Load environment variables
load_dotenv()

# --- State Definition ---
class GeneralQueryState(TypedDict):
    document_id: Optional[str]
    user_id: Optional[str]
    thread_id: Optional[str]
    messages: List[BaseMessage]  # Full conversation history
    query: str  # The latest user query
    response: Optional[str]  # LLM's response to the current query
    error_message: Optional[str]

# --- LLM Prompt Template ---
LLM_PROMPT_TEMPLATE = """
You are a helpful AI Tutor. Your purpose is to answer a user's questions based *strictly and exclusively* on the content of the provided Document Narrative. You must be concise and helpful. If the answer is not in the document, you MUST state that the information is not available in the provided text. Do not use outside knowledge. Format your response using simple Markdown.

---

**1. Document Narrative (Your ONLY source of truth):**
   
{document_narrative}

**2. Distilled Conversation History (for context):**
   
{distilled_conversation_summary}

**3. User's Current Question:**
   
{user_query}

**4. Your Task:**
Analyze the user's current question. Formulate a comprehensive answer using ONLY the information present in the Document Narrative. Refer to the conversation history for context on what has already been discussed.
"""

# --- Helper Functions ---
def distill_conversation_history(messages: List[BaseMessage], max_messages: int = 5) -> str:
    """Creates a summarized string of the recent conversation history."""
    if not messages:
        return "No previous conversation history."
    
    # Take the last max_messages, or fewer if not enough messages
    recent_messages = messages[-max_messages:]
    
    distilled_summary = []
    for msg in recent_messages:
        if isinstance(msg, HumanMessage):
            distilled_summary.append(f"User: {msg.content}")
        elif isinstance(msg, AIMessage):
            distilled_summary.append(f"Assistant: {msg.content}")
        # SystemMessages are usually for initial instructions, might not be needed in distilled summary
        # elif isinstance(msg, SystemMessage):
        #     distilled_summary.append(f"System: {msg.content}")
    
    return "\n".join(distilled_summary) if distilled_summary else "No recent messages to display."

# --- Graph Node ---
def call_chat_llm_node(state: GeneralQueryState) -> Dict[str, Any]:
    """Primary node to call the LLM for chat/Q&A."""
    print(f"--- Entering call_chat_llm_node with query: {state.get('query')}")
    updated_state_dict: Dict[str, Any] = {"response": None, "error_message": None}

    try:
        # 1. Instantiate LLM Client
        llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.7)

        # 2. Load Document Narrative
        document_narrative = "Placeholder document narrative. Replace with actual retrieval."
        if state.get("document_id"):
            doc_service = DocumentRetrievalService()
            success, result_data = doc_service.get_document_content(state["document_id"])
            if not success:
                error_msg = result_data.get("error", "Unknown error during document retrieval.") if isinstance(result_data, dict) else "Unknown error: No data from retrieval service."
                updated_state_dict["error_message"] = f"Failed to load document: {error_msg}"
                updated_state_dict["response"] = "I am sorry, but I could not load the document to answer your question."
                print(f"[ChatGraph] Error retrieving document {state['document_id']}: {error_msg}")
                return updated_state_dict
            
            document_narrative = result_data.get("content") if isinstance(result_data, dict) else None
            if not document_narrative: # Ensure narrative is not empty or None after retrieval
                document_narrative = "The document content appears to be empty or could not be retrieved."
                print(f"[ChatGraph] Warning: Document content for {state['document_id']} is empty or failed retrieval, using placeholder message.")
        else:
            # Allow chat without a document, but LLM will be instructed it has no narrative.
            document_narrative = "No document has been provided for this conversation."
            # Or, if a document is strictly required:
            # updated_state_dict["error_message"] = "Document ID is missing in state."
            # updated_state_dict["response"] = "Please select a document before asking questions."
            # return updated_state_dict

        # 3. Perform State Distillation
        messages = state.get("messages", [])
        distilled_summary = distill_conversation_history(messages)

        # 4. Format LLM Prompt
        user_query = state.get("query", "")
        if not user_query:
            updated_state_dict["error_message"] = "User query is missing."
            updated_state_dict["response"] = "It seems your question is empty. Could you please rephrase?"
            return updated_state_dict

        formatted_prompt = LLM_PROMPT_TEMPLATE.format(
            document_narrative=document_narrative,
            distilled_conversation_summary=distilled_summary,
            user_query=user_query
        )

        # 5. Invoke LLM
        print("--- Invoking LLM for Chat ---")
        # print(f"Prompt: {formatted_prompt}") # Uncomment for debugging
        llm_response = llm.invoke([HumanMessage(content=formatted_prompt)])
        response_content = llm_response.content
        print(f"LLM Raw Response: {response_content}")

        # 6. Update State
        updated_state_dict["response"] = response_content
        
        # Append user query and AI response to messages list for next turn
        # This is a common pattern, but LangGraph handles state updates by returning the delta.
        # The calling supervisor or mechanism would typically update the 'messages' list.
        # For this node, we just provide the 'response'.

    except Exception as e:
        print(f"An unexpected error occurred in call_chat_llm_node: {e}")
        updated_state_dict["error_message"] = f"An unexpected error occurred: {str(e)}"
        updated_state_dict["response"] = "I encountered an issue trying to process your request. Please try again."

    print(f"--- Exiting call_chat_llm_node with response: {updated_state_dict.get('response')}")
    return updated_state_dict

# --- Build the Graph ---
def create_new_chat_graph(checkpointer=None):
    """Creates and compiles the new chat/Q&A graph."""
    graph = StateGraph(GeneralQueryState)

    graph.add_node("call_chat_llm", call_chat_llm_node)
    
    graph.set_entry_point("call_chat_llm")
    graph.add_edge("call_chat_llm", END) # Single node graph

    return graph.compile(checkpointer=checkpointer)

# --- Example Usage (for testing) ---
if __name__ == "__main__":
    if not os.getenv("GOOGLE_API_KEY"):
        print("Error: GOOGLE_API_KEY not found. Please set it in .env or environment.")
        exit(1)

    print("Compiling New Chat Graph...")
    compiled_chat_graph = create_new_chat_graph()
    print("Chat Graph Compiled.")

    # Initial state for the conversation
    # In a real app, thread_id would be managed for conversation continuity
    thread_id = "test_chat_thread_123"
    current_messages: List[BaseMessage] = []

    # --- First interaction ---
    print("\n--- Test Case 1: Initial Question ---")
    user_query_1 = "What is the main topic of this document?"
    
    current_messages.append(HumanMessage(content=user_query_1))
    initial_state_chat: GeneralQueryState = {
        "document_id": "doc_chat_test_001", # Placeholder
        "user_id": "user_test_chat",
        "thread_id": thread_id,
        "messages": current_messages[:], # Pass a copy
        "query": user_query_1,
        "response": None,
        "error_message": None
    }
    config = {"configurable": {"thread_id": thread_id}}

    try:
        print(f"Invoking chat graph with: {user_query_1}")
        response_1 = compiled_chat_graph.invoke(initial_state_chat, config=config)
        print(f"Graph Response 1: {response_1.get('response')}")
        if response_1.get('error_message'):
            print(f"Error: {response_1.get('error_message')}")
        
        if response_1.get('response'):
            current_messages.append(AIMessage(content=response_1['response']))

        # --- Second interaction (follow-up) ---
        print("\n--- Test Case 2: Follow-up Question ---")
        user_query_2 = "Can you tell me more about the first point mentioned?"
        
        current_messages.append(HumanMessage(content=user_query_2))
        follow_up_state_chat: GeneralQueryState = {
            "document_id": "doc_chat_test_001",
            "user_id": "user_test_chat",
            "thread_id": thread_id,
            "messages": current_messages[:], # Pass updated history
            "query": user_query_2,
            "response": None,
            "error_message": None
        }
        
        print(f"Invoking chat graph with: {user_query_2}")
        response_2 = compiled_chat_graph.invoke(follow_up_state_chat, config=config)
        print(f"Graph Response 2: {response_2.get('response')}")
        if response_2.get('error_message'):
            print(f"Error: {response_2.get('error_message')}")

        if response_2.get('response'):
            current_messages.append(AIMessage(content=response_2['response']))

        print("\nFinal conversation history for review:")
        for msg in current_messages:
            print(f"- {msg.type.upper()}: {msg.content}")
            
    except Exception as e:
        print(f"An error occurred during chat graph invocation: {e}")
        import traceback
        traceback.print_exc()

    print("\nNew Chat Graph testing finished.")
