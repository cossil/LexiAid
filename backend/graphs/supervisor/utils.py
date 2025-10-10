import re
from typing import Optional

def is_quiz_start_query(query: str) -> bool:
    """Checks for quiz start phrases, including the specific '/start_quiz' command."""
    # Normalize query by lowercasing, stripping whitespace, and removing quotes
    query_clean = query.lower().strip().replace("'", "").replace('"', '')
    
    # Direct check for the command from the frontend
    if query_clean == "/start_quiz":
        return True
    
    # Check for natural language phrases for more flexibility
    return any(phrase in query_clean for phrase in ["start quiz", "quiz me on", "begin quiz"])

def extract_document_id(query: str) -> Optional[str]:
    """Simplified document ID extraction (e.g., 'quiz on doc:123-abc')."""
    match = re.search(r"doc(?:ument_id)?[:\s=]?([a-zA-Z0-9_-]+)", query, re.IGNORECASE)
    if match:
        return match.group(1)
    return None

def is_cancel_query(query: str) -> bool:
    """Checks if the query is a cancellation command for a quiz."""
    query_lower = query.lower().strip()
    return query_lower in ["cancel quiz", "stop quiz", "exit quiz", "end quiz"]

def is_document_understanding_query(query: str) -> bool:
    """Checks if the query is asking for document understanding/analysis."""
    query_lower = query.lower()
    return any(phrase in query_lower for phrase in [
        "understand this document", "analyze this document", "explain this document",
        "deep dive document", "document analysis", "summarize document structure",
        "process this pdf deeper", "extract layout from this document"
    ])

