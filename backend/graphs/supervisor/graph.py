from typing import List, TypedDict, Optional, Literal, Any, Dict
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
import functools
from .state import SupervisorState

# New simplified graph imports
from graphs.quiz_engine_graph import QuizEngineState as NewQuizState, create_quiz_engine_graph
from graphs.new_chat_graph import GeneralQueryState as NewGeneralQueryState, create_new_chat_graph

from services.doc_retrieval_service import DocumentRetrievalService
from .nodes_routing import receive_user_input_node, routing_decision_node
from .nodes_invokers import invoke_new_chat_graph_node, invoke_quiz_engine_graph_node

import json
import re
import uuid

def create_supervisor_graph(
    checkpointer: Optional[SqliteSaver] = None,
    compiled_quiz_engine_graph_instance: Optional[Any] = None,
    doc_retrieval_service: Optional[DocumentRetrievalService] = None
) -> StateGraph:
    """Creates and compiles the supervisor graph using new chat and quiz graphs."""
    print("DEBUG [SupervisorGraph]: Initializing Supervisor Graph with new architecture...")
    
    try:
        # Instantiate new graphs here
        print("[Supervisor] Instantiating new_chat_graph...")
        new_chat_graph_instance = create_new_chat_graph(checkpointer=checkpointer)
        print("[Supervisor] new_chat_graph instantiated.")

        # Instantiate or use the provided quiz engine graph
        if compiled_quiz_engine_graph_instance:
            print("[Supervisor] Using provided quiz_engine_graph instance.")
            new_quiz_graph_instance = compiled_quiz_engine_graph_instance
        else:
            print("[Supervisor] Instantiating quiz_engine_graph...")
            # This graph manages the quiz lifecycle (generation, interaction, completion)
            new_quiz_graph_instance = create_quiz_engine_graph(checkpointer=checkpointer)
            print("[Supervisor] quiz_engine_graph instantiated.")

        # Define the supervisor graph
        supervisor_graph = StateGraph(SupervisorState)
        
        # Add nodes to the supervisor graph
        print("[Supervisor] Adding nodes to supervisor graph...")
        
        supervisor_graph.add_node("receive_user_input", receive_user_input_node)
        
        bound_routing_decision_node = functools.partial(
            routing_decision_node,
            doc_retrieval_service=doc_retrieval_service
        )
        supervisor_graph.add_node("routing_decision", bound_routing_decision_node)
        
        print("[Supervisor] Adding NewChatGraph node...")
        if new_chat_graph_instance:
            bound_new_chat_node = functools.partial(invoke_new_chat_graph_node, graph_instance=new_chat_graph_instance)
            supervisor_graph.add_node("new_chat_graph", bound_new_chat_node)
        else:
            def placeholder_new_chat_node(state: SupervisorState) -> dict[str, Any]:
                print("[Supervisor] CRITICAL ERROR: New Chat Graph not available. Returning error.")
                return {"final_agent_response": "Chat functionality is currently unavailable due to a system error.", "next_graph_to_invoke": "end"}
            supervisor_graph.add_node("new_chat_graph", placeholder_new_chat_node)

        # The deprecated DocumentUnderstandingGraph node has been removed.

        print("[Supervisor] Adding QuizEngineGraph node...")
        if new_quiz_graph_instance: # This is the quiz_engine_graph instance
            bound_quiz_engine_node = functools.partial(invoke_quiz_engine_graph_node, graph_instance=new_quiz_graph_instance)
            supervisor_graph.add_node("quiz_engine_graph", bound_quiz_engine_node)
        else:
            def placeholder_quiz_engine_node(state: SupervisorState) -> dict[str, Any]:
                print("[Supervisor] CRITICAL ERROR: Quiz Engine Graph not available. Returning error.")
                return {"final_agent_response": "Quiz functionality is currently unavailable due to a system error.", "next_graph_to_invoke": "end", "is_quiz_v2_active": False}
            supervisor_graph.add_node("quiz_engine_graph", placeholder_quiz_engine_node)
        
        supervisor_graph.set_entry_point("receive_user_input")
        supervisor_graph.add_edge("receive_user_input", "routing_decision")
        
        def route_based_on_decision(state: SupervisorState) -> str:
            next_node = state.get("next_graph_to_invoke", "new_chat_graph") # Default to new_chat_graph
            print(f"[Supervisor] Routing decision: {next_node}")
            
            valid_nodes = ["new_chat_graph", "quiz_engine_graph", "end"]
            if next_node not in valid_nodes:
                print(f"[Supervisor] ERROR: Invalid next_node '{next_node}' in state. Defaulting to 'new_chat_graph'. Valid options are: {valid_nodes}")
                next_node = "new_chat_graph"
            elif next_node == "quiz_engine_graph" and not new_quiz_graph_instance:
                print("[Supervisor] Warning: Quiz Engine functionality not available. Falling back to new_chat_graph.")
                next_node = "new_chat_graph"
            elif next_node == "new_chat_graph" and not new_chat_graph_instance: # Should ideally not happen
                print("[Supervisor] CRITICAL: New Chat Graph instance not available. Cannot route. Defaulting to END with error.")
                # This state should be handled by the placeholder node if instantiation failed, but as a safeguard:
                state["final_agent_response"] = "Critical system error: Chat service unavailable."
                return "end" # Force end if chat is critical and missing
                
            return next_node
        
        supervisor_graph.add_conditional_edges(
            "routing_decision",
            route_based_on_decision,
            {
                "new_chat_graph": "new_chat_graph",
                "quiz_engine_graph": "quiz_engine_graph",
                "end": END
            },
        )
        
        supervisor_graph.add_edge("new_chat_graph", END)
        supervisor_graph.add_edge("quiz_engine_graph", END) # Add edge for quiz engine
        
        
        print("[Supervisor] Compiling supervisor graph...")
        if checkpointer:
            print("[Supervisor] Using checkpointing for state persistence")
            compiled_supervisor = supervisor_graph.compile(checkpointer=checkpointer)
        else:
            print("[Supervisor] Warning: No checkpointer provided. State will not be persisted.")
            compiled_supervisor = supervisor_graph.compile()
        
        print("[Supervisor] Supervisor graph compiled successfully.")
        return compiled_supervisor

    except Exception as e:
        print(f"[Supervisor] CRITICAL ERROR during supervisor graph setup or compilation: {e}")
        import traceback
        traceback.print_exc()
        # Fallback to a simple graph that just errors out
        error_graph = StateGraph(SupervisorState)
        def error_node(state: SupervisorState) -> dict: # type: ignore
            return {"final_agent_response": f"Supervisor graph initialization failed: {e}", "next_graph_to_invoke": "end"}
        error_graph.add_node("error_entry", error_node)
        error_graph.set_entry_point("error_entry")
        error_graph.add_edge("error_entry", END)
        return error_graph.compile()

