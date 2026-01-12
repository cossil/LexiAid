# Adaptive DUA Implementation Plan

## Goal Description
Modify the Document Understanding Agent (DUA) to adapt its image analysis prompts based on the user's `visualImpairment` status. This personalization ensures that visually impaired users receive detailed descriptions of scenes and aesthetics, while other users receive concise, data-focused extractions.

## User Review Required
> [!IMPORTANT]
> **Assumption on Profile Schema**: This plan assumes the `visualImpairment` flag is stored within the user's `preferences` object in Firestore (e.g., `user_data['preferences']['visualImpairment']`). If it lives elsewhere (e.g., root level), the fetch logic will need adjustment.

## Proposed Changes

### Backend - Graph Logic (`backend/graphs/document_understanding_agent/`)

#### [MODIFY] [state.py](file:///C:/Ai/aitutor_37/backend/graphs/document_understanding_agent/state.py)
Update `DocumentUnderstandingState` to include user context.
```python
class DocumentUnderstandingState(TypedDict):
    # ... existing fields
    user_id: str                      # [NEW] To fetch profile
    visual_impairment: bool           # [NEW] To drive prompt selection
    # ...
```

#### [MODIFY] [graph.py](file:///C:/Ai/aitutor_37/backend/graphs/document_understanding_agent/graph.py)
1.  **Define Prompts**: Split `COMPREHENSIVE_LLM_PROMPT` into two constants:
    *   `PROMPT_VISUALLY_IMPAIRED`: Existing comprehensive prompt (detailed visual descriptions).
    *   `PROMPT_STANDARD`: New trimmed prompt (strict data/text extraction, no fluff).
2.  **Add `fetch_user_profile_node`**:
    *   Input: `state` (needs `user_id`).
    *   Action: Call `FirestoreService` to get user preferences.
    *   Output: Update `state['visual_impairment']`.
3.  **Update `generate_tts_narrative_node`**:
    *   Logic: Select `PROMPT` based on `state['visual_impairment']`.
    *   Pass selected prompt to Gemini.
4.  **Update Graph Structure**:
    *   Add `fetch_user_profile_node` as the new `entry_point`.
    *   Edge: `fetch_user_profile_node` -> `generate_narrative`.

### Backend - Invocation (`backend/routes/document_routes.py`)

#### [MODIFY] [document_routes.py](file:///C:/Ai/aitutor_37/backend/routes/document_routes.py)
Pass `user_id` when initializing the graph processing.
```python
# In upload_document logic
dua_initial_state = {
    "document_id": document_id,
    "user_id": user_id,  # [NEW] Passed from request context
    "input_file_path": gcs_uri,
    # ...
}
```

## Detailed Logic Steps

### 1. State Schema Update
We need to carry the `user_id` through the graph to allow fetching user details asynchronously if needed, or simply strictly for the fetch node.

### 2. Pseudo-code for `fetch_user_profile_node`
```python
from backend.services.firestore_service import FirestoreService

def fetch_user_profile_node(state: DocumentUnderstandingState) -> DocumentUnderstandingState:
    user_id = state.get('user_id')
    logger.info(f"Fetching profile for user_id: {user_id}")
    
    if not user_id:
        logger.warning("No user_id found in state. Defaulting to Standard Mode.")
        return {"visual_impairment": False}

    try:
        fs = FirestoreService()
        user_data = fs.get_user(user_id)
        
        # Extract visualImpairment flag (default to False if missing)
        preferences = user_data.get('preferences', {})
        is_visually_impaired = preferences.get('visualImpairment', False)
        
        logger.info(f"User {user_id} visual_impairment: {is_visually_impaired}")
        return {"visual_impairment": is_visually_impaired}
        
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}", exc_info=True)
        return {"visual_impairment": False} # Safe default
```

### 3. Prompt Templates

**Scenario A: Visually Impaired (TRUE) - "Descriptive Mode"**
*Use the existing `COMPREHENSIVE_LLM_PROMPT`, ensuring the "Images" section stays verbose.*
```text
...
3. Images:
    * Provide a brief, general description of what the image depicts (e.g., "An image here shows a diagram of a process," "This image displays several people in an outdoor setting.").
    * Aesthetics and scene mood should be described to provide context.
    * Carefully identify and accurately transcribe any and all visible text...
...
```

**Scenario B: Standard User (FALSE) - "Data Mode"**
*Modified "Images" section.*
```text
...
3. Images:
    * PRIORITIZE DATA AND TEXT EXTRACTION.
    * Strictly extract text and data found within the image.
    * Do NOT provide detailed visual descriptions of aesthetics, colors, or scenes unless they directly contain data definition or are necessary for understanding the text.
    * IF an image is purely decorative (e.g. stock photo of people working), IGNORE IT or provide a 1-word label like "[Image]".
    * Focus on diagrams, charts, and information.
...
```

## Verification Plan

### Automated Tests
1.  **Unit Test (`graph.py`)**:
    *   Mock `FirestoreService`.
    *   Run `fetch_user_profile_node` with a mocked user needing visual assistance -> Assert state `visual_impairment` is `True`.
    *   Run with standard user -> Assert `False`.
2.  **Integration Test**:
    *   Use the existing `main_test_runner` in `graph.py` but modify it to accept a mock `user_id` or state override to test both prompt paths manually.

### Manual Verification
1.  **Upload Test**:
    *   Login as a user. Set `visualImpairment` to `true` in Firestore manually (or via UI if available).
    *   Upload an image-heavy document.
    *   Check logs: `User ... visual_impairment: True`.
    *   Check output: "The image shows a blue header..." (Descriptive).
    *   Change setting to `false`. Re-upload.
    *   Check output: Should be drier, extracting text without describing the "blue header".
