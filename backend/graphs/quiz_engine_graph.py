from typing import List, Dict, Optional, Literal, TypedDict, Any, NotRequired
import os
import copy
import json
import logging
from pydantic import BaseModel, Field, field_validator, model_validator, ValidationInfo
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser, StrOutputParser
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver

# --- Configuration ---
LLM_MODEL_NAME = os.getenv("LLM_MODEL_NAME", "gemini-3-flash-preview")
TEMPERATURE_QUESTION_GENERATION = 0.7
TEMPERATURE_EVALUATION = 0.3

# --- Pydantic Models for LLM Interaction ---
class LLMQuestionDetail(BaseModel):
    question_text: str = Field(..., description="The text of the quiz question.")
    options: List[str] = Field(..., description="A list of multiple-choice options for the question.", min_length=2, max_length=5)
    correct_answer_index: int = Field(..., description="The 0-based index of the correct answer in the 'options' list.")
    explanation_for_correct_answer: Optional[str] = Field(None, description="A brief explanation of why the correct answer is correct.")

    @field_validator('correct_answer_index')
    def check_correct_answer_index(cls, v: int, info: 'ValidationInfo') -> int:
        if 'options' in info.data and not (0 <= v < len(info.data['options'])):
            raise ValueError('correct_answer_index must be a valid index for the options list')
        return v

class LLMQuizResponse(BaseModel):
    feedback_for_user: Optional[str] = Field(None, description="Textual feedback for the user about their last answer. Null if no answer was being evaluated.")
    is_correct: Optional[bool] = Field(None, description="Boolean indicating if the user's last answer was correct. Null if no answer was being evaluated.")
    next_question: Optional[LLMQuestionDetail] = Field(None, description="Details for the subsequent question. Null if quiz_is_complete is true.")
    quiz_is_complete: bool = Field(..., description="Boolean indicating if the quiz should now be considered complete.")
    final_summary: Optional[str] = Field(None, description="A final summary of the user's performance, including their final score.")

    @model_validator(mode='after')
    def check_next_question_and_completion(self) -> 'LLMQuizResponse':
        if self.quiz_is_complete and self.next_question is not None:
            raise ValueError("next_question must be null if quiz_is_complete is true")
        if not self.quiz_is_complete and self.next_question is None:
            raise ValueError("next_question cannot be null if quiz_is_complete is false")
        if self.quiz_is_complete and self.final_summary is None:
            raise ValueError("final_summary must be provided if quiz_is_complete is true")
        return self

# --- Quiz Engine State ---
class QuizEngineState(TypedDict, total=False):
    document_id: str
    document_content_snippet: str
    user_id: str
    max_questions: int
    user_answer: Optional[str]
    active_quiz_thread_id: str
    quiz_history: List[Dict[str, Any]]
    current_question_index: int
    current_question_number: NotRequired[Optional[int]]
    score: int
    llm_json_response: Optional[Dict[str, Any]]
    llm_call_count: int
    current_question_to_display: Optional[Dict[str, Any]]
    current_feedback_to_display: Optional[str]
    status: Literal["initializing", "generating_first_question", "awaiting_answer", "evaluating_answer", "quiz_completed", "error"]
    error_message: Optional[str]

# --- Helper Functions ---
def _format_quiz_history_for_prompt(quiz_history: List[Dict], current_q_idx_evaluating: int) -> str:
    if not quiz_history or current_q_idx_evaluating == 0:
        return "No questions have been answered yet."
    history_to_display = quiz_history[:current_q_idx_evaluating]
    if not history_to_display:
        return "No questions have been answered yet."
    formatted_entries = [f"  Q{i+1}: {item.get('question_text', 'N/A')}\n    User Answer: {item.get('user_answer', 'N/A')}\n    Correct: {item.get('is_correct_from_llm', 'N/A')}\n    Feedback: {item.get('feedback_from_llm', 'N/A')}" for i, item in enumerate(history_to_display)]
    return "\n".join(formatted_entries)

# --- Prompts ---
PROMPT_GENERATE_FIRST_QUESTION = """
You are an expert Quiz Master AI. Your task is to generate the FIRST multiple-choice question for a quiz based on the provided document content.

Document Content Snippet:
---
{document_content_snippet}
---

The quiz will have a maximum of {max_questions} questions.
The user taking this quiz is: {user_id}.

Your response MUST be a single, valid JSON object adhering to the following schema. Do NOT include any explanatory text outside of this JSON object.

JSON Schema:
{{{{ "feedback_for_user": null, "is_correct": null, "next_question": {{"question_text": "string", "options": ["string", "string", "string", "string"], "correct_answer_index": "integer (0-based index of the correct option)", "explanation_for_correct_answer": "string (optional, brief explanation)"}}, "quiz_is_complete": false }}}}

Generate question number 1 now.
"""

PROMPT_EVALUATE_AND_GENERATE_NEXT = """
You are an expert Quiz Master AI. Your task is to:
1. Evaluate the user's previous answer.
2. Provide feedback on that answer.
3. Generate the NEXT multiple-choice question for the quiz, OR indicate if the quiz should be complete and provide a final summary.

Document Content Snippet (for context, if needed for new question generation):
---
{document_content_snippet}
---

User's Answer to Previous Question ('{prev_question_text}'):
"{user_answer}"

Correct Answer to Previous Question:
"{prev_correct_answer_text}" (Option {prev_correct_answer_index_plus_1})

Previous Question Details:
- Question: {prev_question_text}
- Options: {prev_options}
- Correct Answer Index: {prev_correct_answer_index}
- Explanation: {prev_explanation}

Quiz History (questions answered before the one being evaluated):
{formatted_quiz_history}

Overall Quiz Progress:
- Current Score: {score_before_eval} / {questions_answered_so_far} (Score before evaluating the current answer)
- Questions Answered So Far: {questions_answered_so_far}
- Total Questions in Quiz: {max_questions}

Your response MUST be a single, valid JSON object adhering to the schema described below. Do NOT include any explanatory text outside of this JSON object.

JSON Schema:
If `quiz_is_complete` is true, the schema is:
{{{{
  "feedback_for_user": "string (feedback on the user's answer, can be brief if final_summary is extensive)",
  "is_correct": "boolean (was the user's answer correct?)",
  "next_question": null,
  "quiz_is_complete": true,
  "final_summary": "string (A comprehensive final summary of the user's performance, including their final score (e.g., X out of Y correct based on `score_before_eval`, `is_correct`, and `questions_answered_so_far`) and a friendly concluding message. THIS FIELD IS ABSOLUTELY REQUIRED AND MUST BE NON-NULL IF quiz_is_complete IS TRUE.)"
}}}}
Else (if `quiz_is_complete` is false), the schema is:
{{{{
  "feedback_for_user": "string (feedback on the user's answer)",
  "is_correct": "boolean (was the user's answer correct?)",
  "next_question": {{ "question_text": "string", "options": ["string", "string", "string", "string"], "correct_answer_index": "integer (0-based index of the correct option)", "explanation_for_correct_answer": "string (optional, brief explanation)" }},
  "quiz_is_complete": false,
  "final_summary": null
}}}}

Instructions:
1. Evaluate the user's answer (""{user_answer}"") against the correct answer (""{prev_correct_answer_text}"") for Question {current_question_number_for_eval}.
2. Provide concise, helpful feedback in `feedback_for_user` for the user's current answer, regardless of whether it's the final question or not.
3. Determine if the user's answer was correct in `is_correct`.
4. Determine if the quiz is complete:
   If {current_question_number_for_eval} >= {max_questions} OR if you determine the document content has been sufficiently covered:
     a. Set `quiz_is_complete` to `true`.
     b. Set `next_question` to `null`.
     c. YOU MUST PROVIDE a comprehensive `final_summary`. This summary should include the user's final score (calculated from `score_before_eval`, `is_correct` for the current question, and `questions_answered_so_far` relative to `max_questions`) and a friendly concluding message.
5. Otherwise (quiz not complete):
     a. Set `quiz_is_complete` to `false`.
     b. Generate the next question ({next_question_number_to_generate}) and populate `next_question`.
     c. Set `final_summary` to `null`.
"""

# --- LLM and Parser Initialization ---
llm = ChatGoogleGenerativeAI(model=LLM_MODEL_NAME)
pydantic_parser = PydanticOutputParser(pydantic_object=LLMQuizResponse)

def get_quiz_engine_chain(current_status: str) -> Any:
    """Creates and returns the LangChain Runnable for the quiz engine."""
    if current_status == "generating_first_question":
        prompt_template = ChatPromptTemplate.from_template(PROMPT_GENERATE_FIRST_QUESTION)
        chain = prompt_template | llm.with_config({"temperature": TEMPERATURE_QUESTION_GENERATION}) | StrOutputParser() | pydantic_parser
    elif current_status == "evaluating_answer":
        prompt_template = ChatPromptTemplate.from_template(PROMPT_EVALUATE_AND_GENERATE_NEXT)
        chain = prompt_template | llm.with_config({"temperature": TEMPERATURE_EVALUATION}) | StrOutputParser() | pydantic_parser
    else:
        raise ValueError(f"Quiz engine called with unexpected status: {current_status}")
    return chain

# --- Core Node Logic ---
def call_quiz_engine_node(state: QuizEngineState) -> Dict[str, Any]:
    updated_state_dict: Dict[str, Any] = {}
    current_status = state["status"]
    try:
        chain = get_quiz_engine_chain(current_status)
        if current_status == "generating_first_question":
            llm_response_data: LLMQuizResponse = chain.invoke({
                "document_content_snippet": state["document_content_snippet"],
                "max_questions": state["max_questions"],
                "user_id": state["user_id"]
            })
        elif current_status == "evaluating_answer":
            if not state["quiz_history"] or state["current_question_index"] < 0 or state["current_question_index"] >= len(state["quiz_history"]):
                raise ValueError("Invalid current_question_index or empty quiz_history for evaluation.")
            
            prev_q_data = state["quiz_history"][state["current_question_index"]]
            formatted_history = _format_quiz_history_for_prompt(state["quiz_history"], state["current_question_index"])
            
            invoke_params = {
                "document_content_snippet": state["document_content_snippet"],
                "user_answer": state["user_answer"],
                "prev_question_text": prev_q_data["question_text"],
                "prev_correct_answer_text": prev_q_data["correct_answer_text"],
                "prev_correct_answer_index": prev_q_data["correct_answer_index"],
                "prev_correct_answer_index_plus_1": prev_q_data["correct_answer_index"] + 1,
                "prev_options": prev_q_data["options"],
                "prev_explanation": prev_q_data.get("explanation_for_correct_answer", "N/A"),
                "formatted_quiz_history": formatted_history,
                "score_before_eval": state["score"],
                "questions_answered_so_far": state["current_question_index"],
                "max_questions": state["max_questions"],
                "current_question_number_for_eval": state["current_question_index"] + 1,
                "next_question_number_to_generate": state["current_question_index"] + 2
            }
            llm_response_data: LLMQuizResponse = chain.invoke(invoke_params)
        else:
            raise ValueError(f"Quiz engine called with unexpected status: {current_status}")

        updated_state_dict["llm_json_response"] = llm_response_data.model_dump()
        new_quiz_history = copy.deepcopy(state["quiz_history"])
        new_score = state["score"]
        new_current_question_index = state["current_question_index"]

        if llm_response_data.is_correct is not None and current_status == "evaluating_answer":
            history_item_to_update = new_quiz_history[state["current_question_index"]]
            history_item_to_update.update({
                "user_answer": state["user_answer"],
                "is_correct_from_llm": llm_response_data.is_correct,
                "feedback_from_llm": llm_response_data.feedback_for_user
            })
            if llm_response_data.is_correct:
                new_score += 1
            updated_state_dict["current_feedback_to_display"] = llm_response_data.feedback_for_user
        else:
            updated_state_dict["current_feedback_to_display"] = None

        updated_state_dict["score"] = new_score

        # Handle feedback and quiz completion
        if llm_response_data.quiz_is_complete:
            updated_state_dict["status"] = "quiz_completed"
            updated_state_dict["current_question_to_display"] = None
            final_answer_feedback = llm_response_data.feedback_for_user or ""
            quiz_summary = llm_response_data.final_summary or f"Quiz complete! Your final score is {new_score}/{state['max_questions']}."

            combined_final_message = f"{final_answer_feedback}\n\n{quiz_summary}"

            updated_state_dict["current_feedback_to_display"] = combined_final_message
        elif llm_response_data.next_question: # Quiz not complete, provide next question and feedback on previous answer
            next_q = llm_response_data.next_question
            new_question_entry = {
                "question_text": next_q.question_text,
                "options": next_q.options,
                "correct_answer_index": next_q.correct_answer_index,
                "correct_answer_text": next_q.options[next_q.correct_answer_index],
                "explanation_for_correct_answer": next_q.explanation_for_correct_answer,
                "user_answer": None, "is_correct_from_llm": None, "feedback_from_llm": None
            }
            new_quiz_history.append(new_question_entry)
            # The new question is at the last index of new_quiz_history
            updated_state_dict["current_question_index"] = len(new_quiz_history) - 1
            updated_state_dict["current_question_number"] = len(new_quiz_history) # This is 1 for the first q, 2 for second, etc.
            updated_state_dict["status"] = "awaiting_answer"
            updated_state_dict["current_question_to_display"] = {"question_text": next_q.question_text, "options": next_q.options}
        else:
            raise ValueError("LLM indicated quiz not complete but failed to provide the next question.")

        updated_state_dict["quiz_history"] = new_quiz_history
        # current_question_index is already set in the if/elif block above if a new question was generated.
        # If quiz is complete, current_question_index from previous state is fine or doesn't matter.
        # If evaluating and no new question (e.g. error or last question evaluated), new_current_question_index is still the one being evaluated.
        if "current_question_index" not in updated_state_dict: # Ensure it's set if not already by new question logic
            updated_state_dict["current_question_index"] = new_current_question_index
        updated_state_dict["user_answer"] = None
        updated_state_dict["llm_call_count"] = state.get("llm_call_count", 0) + 1
        return updated_state_dict

    except Exception as e:
        error_message = f"Error in quiz engine node: {type(e).__name__} - {e}"
        logging.error(error_message, exc_info=True)
        return {"status": "error", "error_message": error_message, "current_feedback_to_display": "An unexpected error occurred."}

# --- Graph Definition ---
def create_quiz_engine_graph(checkpointer: Optional[SqliteSaver] = None):
    workflow = StateGraph(QuizEngineState)
    workflow.add_node("quiz_engine_node", call_quiz_engine_node)
    workflow.set_entry_point("quiz_engine_node")
    workflow.add_edge("quiz_engine_node", END)
    return workflow.compile(checkpointer=checkpointer)

# --- Example Usage ---
if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    compiled_quiz_graph = create_quiz_engine_graph()

    print("--- Scenario 1: Generate First Question ---")
    initial_state_gen: QuizEngineState = {
        "document_id": "doc123",
        "document_content_snippet": "The mitochondria is the powerhouse of the cell. It generates ATP through cellular respiration.",
        "user_id": "user_test_001",
        "max_questions": 3,
        "user_answer": None,
        "active_quiz_thread_id": "thread_abc_123",
        "quiz_history": [],
        "current_question_index": -1,
        "current_question_number": 0,
        "score": 0,
        "llm_json_response": None,
        "llm_call_count": 0,
        "current_question_to_display": None,
        "current_feedback_to_display": None,
        "status": "generating_first_question",
        "error_message": None
    }
    
    result_gen_patch = compiled_quiz_graph.invoke(initial_state_gen)
    state_after_gen = {**initial_state_gen, **result_gen_patch}

    print("Final State after Gen Q1:")
    print(json.dumps(state_after_gen, indent=2))
    q1_text = state_after_gen.get("current_question_to_display", {}).get("question_text")
    print(f"\nQuestion 1 to display: {q1_text}")

    # Scenario 2: Evaluate answer to Q1 and generate Q2
    if merged_state_gen.get("status") == "awaiting_answer" and current_q1_for_display and q1_history:
        print("\n--- Scenario 2: Evaluate Answer for Q1 & Gen Q2 ---")
        state_eval_q1: QuizEngineState = {
            **merged_state_gen, # Carry over most of the state
            "user_answer": q1_history[0]["options"][q1_history[0]["correct_answer_index"]], # User provides correct answer
            "status": "evaluating_answer",
            # current_question_index should be 0 (pointing to Q1 in history)
        }
        
        events_eval = []
        for event in compiled_quiz_graph.stream(state_eval_q1, config=config if compiled_quiz_graph.checkpointer else None):
            events_eval.append(event)
        
        final_state_eval = None
        if events_eval:
            for event in reversed(events_eval):
                if event['event'] == 'on_chain_end' and event['name'] == 'CompiledGraph':
                    final_state_eval = event['data'].get('output')
                    break
                if event['event'] == 'on_chain_end' and event['name'] == 'quiz_engine_node':
                    final_state_eval = event['data'].get('output')
                    break

        if final_state_eval and isinstance(final_state_eval, dict):
            merged_state_eval = {**state_eval_q1, **final_state_eval}
            print("Final State after Eval Q1:")
            print(json.dumps(merged_state_eval, indent=2))
        else:
            print("Could not determine final state for evaluation.")
    else:
        print("\nSkipping Scenario 2 as Q1 generation might have failed or status is not awaiting_answer.")
