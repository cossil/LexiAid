import pytest
import uuid
import json
from unittest.mock import MagicMock, patch

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, AIMessageChunk

from backend.graphs.quiz_graph import (
    QuizState,
    QuizQuestion,
    UserQuizAnswer,
    quiz_graph,
    LLMAnswerEvaluation
)


@pytest.fixture
def mock_document_content() -> str:
    return "This is a mock document about LangGraph. LangGraph is a library for building stateful, multi-actor applications with LLMs." 

@pytest.fixture
def mock_quiz_questions_data() -> list:
    return [
        {
            "question_id": str(uuid.uuid4()),
            "question_text": "What is LangGraph?",
            "question_type": "short_answer",
            "options": [],
            "correct_answer": "A library for building stateful, multi-actor applications with LLMs."
        },
        {
            "question_id": str(uuid.uuid4()),
            "question_text": "LangGraph is primarily used for?",
            "question_type": "multiple_choice",
            "options": ["Building UIs", "Data analysis", "Stateful LLM applications", "Database management"],
            "correct_answer": "Stateful LLM applications"
        }
    ]

def test_quiz_evaluate_correct_answer(
    mock_document_content: str, 
    mock_quiz_questions_data: list
):
    """Test evaluation of a correct user answer."""
    user_id = "test_user_eval_correct"
    document_id = "test_doc_eval_correct"
    
    # Use only the first question from the mock data for this test
    current_question_data = mock_quiz_questions_data[0]
    user_answer_text = current_question_data["correct_answer"]  # Simulate a perfect answer

    # Initial state: quiz started, first question presented, user provides an answer
    initial_state_after_question = QuizState(
        user_id=user_id,
        document_id=document_id,
        document_content=mock_document_content,
        all_questions=[current_question_data],
        current_question_index=0,
        user_answers=[],
        quiz_active=True,
        quiz_complete=False,
        quiz_cancelled=False,
        last_agent_message_to_user=f"Question 1 of 1:\n{current_question_data['question_text']}",
        error_message="",
        messages=[
            AIMessage(content="Initializing quiz..."),
            AIMessage(content="Great! I've prepared a 1-question quiz..."),
            AIMessage(content=f"Question 1 of 1:\n{current_question_data['question_text']}"),
            HumanMessage(content=user_answer_text)
        ]
    )

    # Expected parsed object from the LLM evaluation chain component
    expected_llm_evaluation = LLMAnswerEvaluation(
        is_correct=True,
        feedback="That's correct! Great job."
    )

    # Mock the LLM chain to return our expected evaluation
    with patch('backend.graphs.quiz_graph.ChatGoogleGenerativeAI') as MockChatModel, \
         patch('backend.graphs.quiz_graph.ChatPromptTemplate') as MockChatPromptTemplate, \
         patch('backend.graphs.quiz_graph.JsonOutputParser') as MockJsonOutputParser:
        
        # Create a mock for the LLM instance
        mock_llm_instance = MockChatModel.return_value
        
        # Create a mock for the prompt template
        mock_prompt_instance = MockChatPromptTemplate.from_template.return_value
        
        # Create a mock for the parser
        mock_parser = MockJsonOutputParser.return_value
        mock_parser.invoke.return_value = expected_llm_evaluation
        
        # Set up the chain of operations
        mock_pipe1 = MagicMock()
        mock_pipe2 = MagicMock()
        
        # First pipe: prompt | llm
        mock_prompt_instance.__or__.return_value = mock_pipe1
        # Second pipe: (prompt | llm) | parser
        mock_pipe1.__or__.return_value = mock_parser

        # Invoke the graph with the initial state
        final_state = quiz_graph.invoke(initial_state_after_question, config={"recursion_limit": 10})

    # Assertions
    assert final_state["error_message"] == ""
    assert len(final_state["user_answers"]) == 1
    user_answer_obj = final_state["user_answers"][0]
    assert user_answer_obj["question_id"] == current_question_data["question_id"]
    assert user_answer_obj["user_answer_text"] == user_answer_text
    assert user_answer_obj["is_correct"] is True
    assert user_answer_obj["feedback"] == "That's correct! Great job."
    
    # The quiz should now be complete since we've answered all questions
    assert final_state["quiz_complete"] is True
    
    # The last agent message should be from the conclude_quiz_node
    assert "Skeleton: Quiz concluded. Summary not implemented." in final_state["last_agent_message_to_user"]
    
    # Check messages - should have the original messages plus the evaluation feedback and conclusion
    assert len(final_state["messages"]) == 6  # Initial 4 + AI feedback + conclusion
    assert isinstance(final_state["messages"][-1], AIMessage)
    assert final_state["messages"][-1].content == "Skeleton: Quiz concluded. Summary not implemented."
    assert final_state["messages"][-2].content == "That's correct! Great job."
