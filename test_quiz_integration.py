"""
Test script to verify QuizGraph integration in the API.
This simulates API calls to test the quiz functionality.
"""
import requests
import json
import time

def test_quiz_flow(base_url, user_id, document_id, auth_token):
    """Test the full quiz flow from start to finish."""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    # 1. Start a new quiz
    print("\n=== Starting a new quiz ===")
    start_response = requests.post(
        f"{base_url}/api/v2/agent/chat",
        headers=headers,
        json={
            "query": f"Start a quiz for document {document_id}",
            "document_id": document_id
        }
    )
    
    if start_response.status_code != 200:
        print(f"Error starting quiz: {start_response.text}")
        return None
    
    start_data = start_response.json()
    print(f"Quiz started. Thread ID: {start_data.get('thread_id')}")
    print(f"Agent response: {start_data.get('agent_response')}")
    
    thread_id = start_data.get('thread_id')
    if not thread_id:
        print("No thread_id received in response")
        return None
    
    # 2. Simulate answering questions until the quiz is complete
    quiz_complete = False
    while not quiz_complete:
        # Wait for user input (in a real app, this would come from the UI)
        user_answer = input("\nYour answer: ")
        
        # Send the answer to the API
        answer_response = requests.post(
            f"{base_url}/api/v2/agent/chat",
            headers=headers,
            json={
                "query": user_answer,
                "thread_id": thread_id,
                "document_id": document_id
            }
        )
        
        if answer_response.status_code != 200:
            print(f"Error submitting answer: {answer_response.text}")
            break
        
        answer_data = answer_response.json()
        print(f"\nAgent response: {answer_data.get('agent_response')}")
        
        # Check if the quiz is complete
        quiz_complete = answer_data.get('quiz_complete', False)
    
    print("\n=== Quiz completed successfully! ===")
    return thread_id

if __name__ == "__main__":
    # Configuration - update these values as needed
    BASE_URL = "http://localhost:5000"  # Update if your server is running on a different URL
    USER_ID = "test_user_1"  # Should match a valid user ID in your system
    DOCUMENT_ID = "test_doc_1"  # Should match a valid document ID in your system
    AUTH_TOKEN = "your_auth_token_here"  # Replace with a valid auth token
    
    print(f"Testing quiz flow for user {USER_ID} with document {DOCUMENT_ID}")
    test_quiz_flow(BASE_URL, USER_ID, DOCUMENT_ID, AUTH_TOKEN)
