# AI-Assisted Answer Formulation: Chronological Execution Plan

## Overview

This document provides a detailed, step-by-step implementation plan organized chronologically from the first line of code to final user testing. Each step specifies the goal, files to create/modify, and work to be done.

**Total Estimated Time**: 6-8 weeks
**Team**: Backend Developer, Frontend Developer, UX Designer, QA Tester

---

## PHASE 1: Backend Foundation (Weeks 1-2)

### Goal
Create the core LangGraph agent with refinement capabilities and Flask API endpoints. By the end of this phase, we should have a working backend that can refine spoken transcripts.

---

### Step 1.1: Create Project Structure

**Goal**: Set up the directory structure for the Answer Formulation feature

**Files to Create**:
- `backend/graphs/answer_formulation/__init__.py`
- `backend/graphs/answer_formulation/state.py`
- `backend/graphs/answer_formulation/graph.py`
- `backend/graphs/answer_formulation/prompts.py`
- `backend/graphs/answer_formulation/utils.py`

**Work**:
1. Create the `answer_formulation` directory under `backend/graphs/`
2. Create empty `__init__.py` file
3. Create placeholder files for state, graph, prompts, and utils

**Reference**: Architecture document, section "Backend Architecture"

---

### Step 1.2: Define LangGraph State

**Goal**: Create the TypedDict that defines the state structure for the Answer Formulation graph

**File**: `backend/graphs/answer_formulation/state.py`

**Work**:
1. Import `TypedDict`, `List`, `Optional`, `Literal` from typing
2. Define `AnswerFormulationState` class
3. Add all required fields as specified in architecture.md:
   - Input fields: `user_id`, `session_id`, `question_prompt`, `original_transcript`
   - Processing fields: `refined_answer`, `edit_command`, `edit_history`
   - Validation fields: `fidelity_score`, `fidelity_violations`
   - Status field with Literal types
   - Metadata fields: `iteration_count`, `llm_call_count`, `created_at`, `updated_at`

**Reference**: Architecture document, lines 119-156

**Code Template**:
```python
from typing import TypedDict, List, Optional, Literal

class AnswerFormulationState(TypedDict):
    # Input
    user_id: str
    session_id: str
    question_prompt: Optional[str]
    original_transcript: str
    # ... (continue with all fields)
```

---

### Step 1.3: Create Prompt Templates

**Goal**: Define all LLM prompts as constants

**File**: `backend/graphs/answer_formulation/prompts.py`

**Work**:
1. Define `REFINEMENT_SYSTEM_PROMPT` as multi-line string
   - Copy from prompts.md, lines 31-88
   - Include CRITICAL RULES section
   - Include FIDELITY RULE
   - Include 3 GOOD/BAD examples
2. Define `EDIT_SYSTEM_PROMPT`
   - Copy from prompts.md, lines 99-149
   - Include edit command types
   - Include rules and examples
3. Define `VALIDATION_PROMPT`
   - Copy from prompts.md, lines 160-241
   - Include violation definitions
   - Include output format
4. Define `CLARIFICATION_PROMPT`
   - Copy from prompts.md, lines 252-286

**Reference**: Prompts document, entire file

**Code Template**:
```python
REFINEMENT_SYSTEM_PROMPT = """
You are an AI writing assistant helping a student with dysgraphia...
[Full prompt from prompts.md]
"""

EDIT_SYSTEM_PROMPT = """
You are an AI assistant helping a student edit...
[Full prompt from prompts.md]
"""
# ... etc
```

---

### Step 1.4: Implement Helper Functions

**Goal**: Create utility functions for parsing and validation

**File**: `backend/graphs/answer_formulation/utils.py`

**Work**:
1. Implement `parse_edit_command(command: str) -> dict`
   - Detect command type (replace, rephrase, add, delete, reorder)
   - Use regex or simple string matching
   - Extract target text and replacement text
   - Return structured dict: `{"type": "replace", "target": "...", "replacement": "..."}`
2. Implement `extract_fidelity_score(response: str) -> float`
   - Parse LLM response for "Fidelity Score: X.X"
   - Return float between 0.0 and 1.0
   - Handle parsing errors gracefully
3. Implement `extract_violations(response: str) -> List[str]`
   - Parse LLM response for violations list
   - Return list of violation strings
   - Return empty list if "None"

**Reference**: Architecture document mentions these functions

**Code Template**:
```python
import re
from typing import Dict, List

def parse_edit_command(command: str) -> Dict[str, str]:
    """Parse edit command to extract type, target, and replacement."""
    command_lower = command.lower()
    
    if "change" in command_lower or "replace" in command_lower:
        # Extract target and replacement
        # Example: "Change 'upset' to 'angry'"
        match = re.search(r"change ['\"](.+?)['\"] to ['\"](.+?)['\"]", command_lower)
        if match:
            return {
                "type": "replace",
                "target": match.group(1),
                "replacement": match.group(2)
            }
    # ... handle other command types
    
    return {"type": "unknown", "command": command}
```

---

### Step 1.5: Implement validate_input_node

**Goal**: Create the first LangGraph node that validates input

**File**: `backend/graphs/answer_formulation/graph.py`

**Work**:
1. Import required modules: `datetime`, `timezone`, `logging`
2. Import `AnswerFormulationState` from `.state`
3. Define `validate_input_node(state: AnswerFormulationState) -> AnswerFormulationState`
4. Check if `original_transcript` is empty → set error status
5. Check word count (< 5 words → error, > 2000 words → error)
6. Initialize `iteration_count = 0`, `llm_call_count = 0`, `edit_history = []`
7. Set `status = 'refining'` if valid
8. Return updated state

**Reference**: Architecture document, lines 164-203

**Code Template**:
```python
from datetime import datetime, timezone
import logging
from .state import AnswerFormulationState

logger = logging.getLogger(__name__)

def validate_input_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """Validates input and sets up initial state."""
    if not state.get('original_transcript'):
        state['status'] = 'error'
        state['error_message'] = 'No transcript provided'
        return state
    
    transcript = state['original_transcript'].strip()
    word_count = len(transcript.split())
    
    if word_count < 5:
        state['status'] = 'error'
        state['error_message'] = 'Transcript too short (minimum 5 words)'
        return state
    
    # ... continue validation
    
    state['status'] = 'refining'
    state['iteration_count'] = 0
    state['llm_call_count'] = 0
    state['edit_history'] = []
    
    return state
```

---

### Step 1.6: Implement refine_answer_node

**Goal**: Create the core refinement node that calls the LLM

**File**: `backend/graphs/answer_formulation/graph.py`

**Work**:
1. Import `ChatGoogleGenerativeAI` from `langchain_google_genai`
2. Import `REFINEMENT_SYSTEM_PROMPT` from `.prompts`
3. Define `refine_answer_node(state: AnswerFormulationState) -> AnswerFormulationState`
4. Build user prompt with question and transcript
5. Initialize LLM with model="gemini-2.5-flash", temperature=0.3
6. Invoke LLM with system and user prompts
7. Extract refined text from response
8. Update state: `refined_answer`, `status = 'refined'`
9. Increment `llm_call_count` and `iteration_count`
10. Return updated state

**Reference**: Architecture document, lines 207-249

**Code Template**:
```python
from langchain_google_genai import ChatGoogleGenerativeAI
from .prompts import REFINEMENT_SYSTEM_PROMPT

def refine_answer_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """Uses LLM to refine the original transcript."""
    
    system_prompt = REFINEMENT_SYSTEM_PROMPT
    
    user_prompt = f"""
Original Question/Prompt: {state.get('question_prompt', 'Not provided')}

Student's Spoken Thoughts (verbatim):
{state['original_transcript']}

Your task: Refine this into a clear, well-structured answer.
"""
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.3
    )
    
    response = llm.invoke([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ])
    
    refined_text = response.content
    
    state['refined_answer'] = refined_text
    state['status'] = 'refined'
    state['llm_call_count'] += 1
    state['iteration_count'] += 1
    
    logger.info(f"Refined answer for session {state['session_id']}")
    
    return state
```

---

### Step 1.7: Implement apply_edit_node

**Goal**: Create the node that applies user edit commands

**File**: `backend/graphs/answer_formulation/graph.py`

**Work**:
1. Import `EDIT_SYSTEM_PROMPT` from `.prompts`
2. Import `parse_edit_command` from `.utils`
3. Define `apply_edit_node(state: AnswerFormulationState) -> AnswerFormulationState`
4. Validate `edit_command` and `refined_answer` are present
5. Parse edit command using helper function
6. Build edit prompt with current answer and command
7. Call LLM with temperature=0.2 (lower for precision)
8. Extract updated answer from response
9. Add edit to `edit_history` with timestamp
10. Update `refined_answer`, increment counters
11. Return updated state

**Reference**: Architecture document, lines 253-319

---

### Step 1.8: Implement validate_fidelity_node (Async)

**Goal**: Create async validation for quality monitoring

**File**: `backend/graphs/answer_formulation/graph.py`

**Work**:
1. Implement Option C: Real-time sampling (10% of requests)
2. Define `validate_fidelity_node(state: AnswerFormulationState) -> AnswerFormulationState`
3. Check `random.random() < 0.1` to sample 10%
4. If sampled, call validation LLM with VALIDATION_PROMPT
5. Parse fidelity score and violations using helper functions
6. Store in state: `fidelity_score`, `fidelity_violations`
7. Log violations if score < 0.8
8. Return state (non-blocking)

**Reference**: Architecture document, lines 323-440 (async validation section)

**Note**: This is for monitoring only, doesn't block user flow

---

### Step 1.9: Create and Compile LangGraph

**Goal**: Wire all nodes together into a functional graph

**File**: `backend/graphs/answer_formulation/graph.py`

**Work**:
1. Import `StateGraph`, `END` from `langgraph.graph`
2. Import `SqliteSaver` from `langgraph.checkpoint.sqlite`
3. Define `create_answer_formulation_graph(checkpointer=None)`
4. Create `StateGraph(AnswerFormulationState)`
5. Add all nodes: validate_input, refine_answer, apply_edit, validate_fidelity
6. Set entry point: `validate_input`
7. Add conditional edge from validate_input (check status)
8. Add edge from refine_answer to validate_fidelity
9. Add edge from validate_fidelity to END
10. Add edge from apply_edit to validate_fidelity
11. Compile graph with checkpointer
12. Return compiled graph

**Reference**: Architecture document, lines 444-484

**Code Template**:
```python
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver

def create_answer_formulation_graph(checkpointer=None):
    """Creates the Answer Formulation LangGraph."""
    
    workflow = StateGraph(AnswerFormulationState)
    
    # Add nodes
    workflow.add_node("validate_input", validate_input_node)
    workflow.add_node("refine_answer", refine_answer_node)
    workflow.add_node("apply_edit", apply_edit_node)
    workflow.add_node("validate_fidelity", validate_fidelity_node)
    
    # Define edges
    workflow.set_entry_point("validate_input")
    
    workflow.add_conditional_edges(
        "validate_input",
        lambda state: "refine" if state['status'] == 'refining' else "end",
        {
            "refine": "refine_answer",
            "end": END
        }
    )
    
    workflow.add_edge("refine_answer", "validate_fidelity")
    workflow.add_edge("validate_fidelity", END)
    workflow.add_edge("apply_edit", "validate_fidelity")
    
    return workflow.compile(checkpointer=checkpointer)
```

---

### Step 1.10: Create Flask API Routes

**Goal**: Create REST API endpoints for the frontend

**File**: `backend/routes/answer_formulation_routes.py`

**Work**:
1. Import Flask modules: `Blueprint`, `request`, `jsonify`, `current_app`, `g`
2. Import `datetime`, `timezone`, `uuid`
3. Import auth decorator (from existing routes)
4. Create Blueprint: `answer_formulation_bp = Blueprint('answer_formulation', __name__)`
5. Implement `POST /refine` endpoint:
   - Add `@auth_required` decorator
   - Extract `user_id` from `g.user_id`
   - Parse JSON: `transcript`, `question`, `session_id`
   - Validate transcript not empty
   - Create initial state dict
   - Get graph from `current_app.config['ANSWER_FORMULATION_GRAPH']`
   - Invoke graph with config `{"configurable": {"thread_id": session_id}}`
   - Handle error status
   - Call TTSService to generate audio
   - Return JSON with refined_answer, session_id, status, audio
6. Implement `POST /edit` endpoint:
   - Similar structure to /refine
   - Parse `session_id` and `edit_command`
   - Update state with edit_command
   - Invoke graph (will use existing session from checkpointer)
   - Generate TTS for updated answer
   - Return JSON

**Reference**: Architecture document, lines 488-624

**Code Template**:
```python
from flask import Blueprint, request, jsonify, current_app, g
from datetime import datetime, timezone
import uuid

answer_formulation_bp = Blueprint('answer_formulation', __name__)

@answer_formulation_bp.route('/refine', methods=['POST'])
@auth_required  # Import from existing routes
def refine_answer():
    """Refine a spoken transcript into a clear written answer."""
    user_id = g.user_id
    data = request.get_json()
    
    transcript = data.get('transcript', '').strip()
    question = data.get('question', '').strip()
    session_id = data.get('session_id') or str(uuid.uuid4())
    
    if not transcript:
        return jsonify({"error": "Transcript is required"}), 400
    
    # Get graph instance
    answer_formulation_graph = current_app.config['ANSWER_FORMULATION_GRAPH']
    
    # Create initial state
    initial_state = {
        'user_id': user_id,
        'session_id': session_id,
        'question_prompt': question,
        'original_transcript': transcript,
        'status': 'initializing',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Invoke graph
    config = {"configurable": {"thread_id": session_id}}
    result = answer_formulation_graph.invoke(initial_state, config)
    
    if result['status'] == 'error':
        return jsonify({"error": result.get('error_message', 'Processing failed')}), 400
    
    # Generate TTS
    tts_service = current_app.config['TTS_SERVICE']
    tts_result = tts_service.synthesize_text(result['refined_answer'])
    
    return jsonify({
        "refined_answer": result['refined_answer'],
        "session_id": session_id,
        "status": result['status'],
        "fidelity_score": result.get('fidelity_score'),
        "iteration_count": result['iteration_count'],
        "audio_content_base64": tts_result.get('audio_content'),
        "timepoints": tts_result.get('timepoints')
    }), 200

@answer_formulation_bp.route('/edit', methods=['POST'])
@auth_required
def edit_answer():
    """Apply an edit command to a refined answer."""
    # Similar implementation...
    pass
```

---

### Step 1.11: Register Blueprint in App

**Goal**: Integrate the new routes into the Flask application

**File**: `backend/app.py`

**Work**:
1. Import `answer_formulation_bp` from `routes.answer_formulation_routes`
2. Import `create_answer_formulation_graph` from `graphs.answer_formulation.graph`
3. Import `SqliteSaver` from `langgraph.checkpoint.sqlite`
4. In app initialization (after other services):
   - Create SQLite checkpointer: `SqliteSaver.from_conn_string("answer_formulation_sessions.db")`
   - Create graph: `answer_formulation_graph = create_answer_formulation_graph(checkpointer)`
   - Store in config: `app.config['ANSWER_FORMULATION_GRAPH'] = answer_formulation_graph`
5. Register blueprint: `app.register_blueprint(answer_formulation_bp, url_prefix='/api/v2/answer-formulation')`

**Reference**: Architecture document mentions app integration

---

### Step 1.12: Backend Testing

**Goal**: Verify backend works correctly before moving to frontend

**File**: `backend/tests/test_answer_formulation_graph.py`

**Work**:
1. Create test file with pytest
2. Test `validate_input_node`:
   - Valid input → status='refining'
   - Empty transcript → status='error'
   - Too short (< 5 words) → status='error'
   - Too long (> 2000 words) → status='error'
3. Test `refine_answer_node`:
   - Simple input → refined output
   - Check filler words removed
   - Check grammar improved
   - Verify no external info added (manual check)
4. Test `apply_edit_node`:
   - Word replacement command
   - Sentence rephrasing command
5. Test full graph flow:
   - Invoke with valid input
   - Check refined_answer present
   - Check status='refined'
6. Test API endpoints (integration test):
   - POST /refine with valid data
   - POST /edit with session_id
   - Check responses

**Manual Testing**:
1. Start Flask server: `flask --app app.py --debug run --port 5000`
2. Use Postman or curl to test endpoints
3. Verify responses match expected format

---

## PHASE 2: Frontend Foundation (Weeks 2-3)

### Goal
Build the React components and hooks for the user interface. By the end of this phase, users should be able to dictate, refine, and finalize answers.

---

### Step 2.1: Create API Service Functions

**Goal**: Add functions to communicate with backend

**File**: `src/services/apiService.ts`

**Work**:
1. Add `refineAnswer()` function:
   - POST to `/api/v2/answer-formulation/refine`
   - Send: `{transcript, question, session_id}`
   - Return typed response
2. Add `editAnswer()` function:
   - POST to `/api/v2/answer-formulation/edit`
   - Send: `{session_id, edit_command}`
   - Return typed response
3. Add TypeScript interfaces for request/response

**Code Template**:
```typescript
export interface RefineAnswerRequest {
  transcript: string;
  question?: string;
  session_id?: string;
}

export interface RefineAnswerResponse {
  refined_answer: string;
  session_id: string;
  status: string;
  fidelity_score?: number;
  iteration_count: number;
  audio_content_base64?: string;
  timepoints?: any[];
}

export const refineAnswer = async (data: RefineAnswerRequest): Promise<RefineAnswerResponse> => {
  const response = await fetch('/api/v2/answer-formulation/refine', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(data)
  });
  
  if (!response.ok) {
    throw new Error('Refinement failed');
  }
  
  return response.json();
};
```

---

### Step 2.2: Create useAnswerFormulation Hook

**Goal**: Centralize all state management and logic

**File**: `src/hooks/useAnswerFormulation.ts`

**Work**:
1. Define `UseAnswerFormulationReturn` interface (all state + functions)
2. Implement state variables with useState:
   - question, transcript, refinedAnswer
   - status, sessionId, fidelityScore, iterationCount
   - autoPauseEnabled, pauseDuration, pauseCountdown
3. Integrate with `useRealtimeStt` hook for dictation
4. Implement `startDictation()` and `stopDictation()`
5. Implement auto-pause detection logic:
   - useRef for pauseTimerRef and lastTranscriptLengthRef
   - useEffect to monitor transcript changes
   - Countdown timer logic
6. Implement `refineAnswer()` async function:
   - Call apiService.refineAnswer()
   - Update state with response
   - Handle errors
7. Implement `editAnswer(command: string)` async function
8. Implement `finalizeAnswer()` and `reset()`
9. Implement settings persistence (load/save from userPreferences)
10. Return all state and functions

**Reference**: Architecture document, lines 690-889

---

### Step 2.3: Create QuestionInput Component

**Goal**: Build the question input text area

**File**: `src/components/answer-formulation/QuestionInput.tsx`

**Work**:
1. Create functional component with props: `value`, `onChange`
2. Render large textarea (min 100px height)
3. Add placeholder text
4. Add character counter (max 500)
5. Implement auto-resize functionality
6. Add accessibility labels
7. Style with Tailwind CSS per UI design spec

**Reference**: UI design document, lines 70-103

---

### Step 2.4: Create DictationPanel Component

**Goal**: Build the microphone button and transcript display

**File**: `src/components/answer-formulation/DictationPanel.tsx`

**Work**:
1. Create component with props: `transcript`, `isRecording`, `onStart`, `onStop`, `autoPauseEnabled`, `pauseCountdown`
2. Render microphone button (120px diameter)
3. Implement pulsing animation when recording
4. Display real-time transcript (final + interim)
5. Show word count
6. Show auto-pause countdown if enabled
7. Add settings icon for quick access
8. Style per UI design spec

**Reference**: UI design document, lines 106-186

---

### Step 2.5: Create RefinementPanel Component

**Goal**: Display original and refined text side-by-side

**File**: `src/components/answer-formulation/RefinementPanel.tsx`

**Work**:
1. Create component with props: `originalTranscript`, `refinedAnswer`, `status`, `onRefine`, `onEdit`, `onEditManually`, `onFinalize`, `onPlayAudio`
2. Implement split view layout (50/50 on desktop, stacked on mobile)
3. Render original transcript panel (read-only, gray background)
4. Render refined answer panel (white background)
5. Add Listen button (TTS playback)
6. Add action buttons: Finalize, Edit with Voice, Edit Manually
7. Implement word highlighting during TTS
8. Style per UI design spec

**Reference**: UI design document, lines 189-250

---

### Step 2.6: Create VoiceEditMode Component

**Goal**: Build voice command editing interface

**File**: `src/components/answer-formulation/VoiceEditMode.tsx`

**Work**:
1. Create component with props: `refinedAnswer`, `onEditCommand`, `onDone`, `onUndo`
2. Display current refined answer
3. Highlight recent changes (yellow, fade out after 3s)
4. Add voice command button
5. Show edit examples (collapsible)
6. Add Undo button (disabled if no edits)
7. Add Done editing button
8. Style per UI design spec

**Reference**: UI design document, lines 253-299

---

### Step 2.7: Create ManualEditMode Component (NEW)

**Goal**: Build manual editing interface with keyboard + voice

**File**: `src/components/answer-formulation/ManualEditMode.tsx`

**Work**:
1. Create component with props: `refinedAnswer`, `onUpdate`, `onDone`
2. Render contentEditable div
3. Track cursor position
4. Add "Dictate at Cursor" button
5. Implement cursor insertion for dictated text
6. Add Undo/Redo buttons
7. Track edit history
8. Auto-save changes
9. Style per UI design spec

**Reference**: User flow document, lines 301-360 (manual editing section)

---

### Step 2.8: Create FinalizedAnswer Component

**Goal**: Display final answer with export options

**File**: `src/components/answer-formulation/FinalizedAnswer.tsx`

**Work**:
1. Create component with props: `answer`, `wordCount`, `iterationCount`, `onCopy`, `onDownload`, `onStartNew`
2. Display answer in clean format
3. Show metadata (word count, iterations)
4. Add Copy to Clipboard button (with toast notification)
5. Add Download as Text button
6. Add Start New Answer button
7. Style per UI design spec

**Reference**: UI design document, lines 383-431

---

### Step 2.9: Create AutoPauseSettings Component

**Goal**: Build settings panel for auto-pause configuration

**File**: `src/components/answer-formulation/AutoPauseSettings.tsx`

**Work**:
1. Create component with props: `enabled`, `duration`, `onEnabledChange`, `onDurationChange`, `onSave`, `onCancel`
2. Render toggle switch (60px x 30px)
3. Render slider (1-10s range, 0.5s increments)
4. Add visual markers at recommended values
5. Show recommendations box (clickable presets)
6. Add Test button
7. Add Save/Cancel buttons
8. Style per UI design spec

**Reference**: UI design document, lines 302-380

---

### Step 2.10: Create GuidedPractice Component

**Goal**: Build interactive onboarding tutorial

**File**: `src/components/answer-formulation/GuidedPractice.tsx`

**Work**:
1. Create multi-step component
2. Implement Step 0.1: Welcome screen
3. Implement Step 0.2: Sample question display
4. Implement Step 0.3: Guided dictation
5. Implement Step 0.4: Guided refinement
6. Implement Step 0.5: Guided editing practice
7. Implement Step 0.6: Completion
8. Track progress through steps
9. Save completion to user preferences
10. Style per user flow spec

**Reference**: User flow document, lines 45-161

---

### Step 2.11: Create AutoPauseTip Component

**Goal**: Build contextual suggestion banner

**File**: `src/components/answer-formulation/AutoPauseTip.tsx`

**Work**:
1. Create banner component
2. Show "Pro Tip: Work Hands-Free" message
3. Add "Try Auto-Pause" button
4. Add "No Thanks" dismiss button
5. Implement auto-dismiss after 30 seconds
6. Update user preferences on dismiss
7. Style per user flow spec

**Reference**: User flow document, lines 279-306

---

### Step 2.12: Create Main Page Component

**Goal**: Assemble all components into the main page

**File**: `src/pages/AnswerFormulationPage.tsx`

**Work**:
1. Import all sub-components
2. Import useAnswerFormulation hook
3. Import useAuth and useTTSPlayer
4. Implement page layout structure
5. Add conditional rendering based on status:
   - Show GuidedPractice if first time
   - Show QuestionInput
   - Show DictationPanel
   - Show RefinementPanel when transcript exists
   - Show VoiceEditMode or ManualEditMode when editing
   - Show FinalizedAnswer when finalized
6. Add AutoPauseTip when appropriate
7. Handle all event callbacks
8. Style page layout

**Reference**: Architecture document, lines 632-684

---

### Step 2.13: Add Routing

**Goal**: Make the page accessible via URL

**File**: `src/App.tsx` (or router config file)

**Work**:
1. Import AnswerFormulationPage
2. Add route: `/dashboard/answer-formulation`
3. Add protected route wrapper (requires auth)
4. Update sidebar navigation:
   - Add "Answer Formulation" link
   - Add icon (Lucide React)
   - Add active state highlighting

**Reference**: Existing routing patterns in the app

---

### Step 2.14: Frontend Testing

**Goal**: Verify frontend works correctly

**Work**:
1. Start backend server: `flask --app app.py --debug run --port 5000`
2. Start frontend dev server: `npm run dev`
3. Navigate to `/dashboard/answer-formulation`
4. Test full workflow:
   - Enter question
   - Dictate thoughts
   - Refine answer
   - Edit with voice
   - Edit manually
   - Finalize answer
   - Copy to clipboard
5. Test auto-pause settings
6. Test guided practice mode
7. Test error states
8. Test on mobile (responsive design)

---

## PHASE 3: Integration & Polish (Weeks 4-5)

### Goal
Integrate all pieces, add polish, implement accessibility features, and prepare for user testing.

---

### Step 3.1: Update User Preferences Schema

**Goal**: Add new fields to Firestore user preferences

**File**: Firestore database (manual update or migration script)

**Work**:
1. Add field: `answerFormulationAutoPause: boolean` (default: false)
2. Add field: `answerFormulationPauseDuration: number` (default: 3.0)
3. Add field: `answerFormulationSessionsCompleted: number` (default: 0)
4. Add field: `answerFormulationAutoPauseSuggestionDismissed: boolean` (default: false)
5. Add field: `answerFormulationOnboardingCompleted: boolean` (default: false)
6. Update TypeScript interfaces in frontend

---

### Step 3.2: Implement Session History (Optional)

**Goal**: Save finalized answers to Firestore

**File**: Backend: `backend/graphs/answer_formulation/graph.py`, Frontend: update `finalizeAnswer()` in hook

**Work**:
1. Create Firestore collection: `answer_formulation_sessions`
2. In backend, add function to save session:
   - Store: user_id, question, original_transcript, refined_answer
   - Store: iteration_count, fidelity_score, created_at, status
3. Call save function when answer is finalized
4. In frontend, increment `answerFormulationSessionsCompleted` on finalize

---

### Step 3.3: Implement TTS Word Highlighting

**Goal**: Highlight words as they're spoken

**File**: `src/components/answer-formulation/RefinementPanel.tsx`

**Work**:
1. Use existing TTS timepoints data
2. Track current playback position
3. Apply yellow background to current word
4. Remove highlight from previous word
5. Sync with audio playback

**Reference**: Existing TTS implementation in DocumentView

---

### Step 3.4: Implement Error Handling

**Goal**: Add comprehensive error handling

**Files**: Multiple components and hooks

**Work**:
1. Add error boundary for AnswerFormulationPage
2. Add error states for all API calls
3. Implement retry logic for failed refinements
4. Add user-friendly error messages:
   - Empty transcript error
   - Refinement failed error
   - Edit command unclear error
   - Network error
5. Add error logging to backend
6. Test all error scenarios

**Reference**: UI design document, lines 495-543 (error states)

---

### Step 3.5: Accessibility Audit

**Goal**: Ensure WCAG 2.1 AA compliance

**Work**:
1. Test with screen reader (NVDA/JAWS):
   - Verify all buttons have proper labels
   - Verify status changes are announced
   - Verify transcript updates are announced (live region)
2. Test keyboard navigation:
   - Verify tab order is logical
   - Verify all actions accessible via keyboard
   - Verify focus indicators are visible
   - Verify Escape key exits modals/edit mode
3. Test color contrast:
   - Verify all text meets 4.5:1 ratio
   - Test with high contrast mode
4. Test with reduced motion preference
5. Verify all interactive elements ≥ 44x44px
6. Fix any issues found

**Reference**: UI design document, lines 574-625

---

### Step 3.6: Performance Optimization

**Goal**: Ensure smooth user experience

**Work**:
1. Implement debouncing for auto-pause detection
2. Optimize re-renders in useAnswerFormulation hook (useMemo, useCallback)
3. Lazy load guided practice components
4. Optimize TTS audio loading
5. Add loading states for all async operations
6. Test performance on low-end devices

---

### Step 3.7: Add Analytics

**Goal**: Track usage and behavior

**Files**: Multiple components

**Work**:
1. Add analytics events:
   - Session started
   - Refinement completed
   - Edit applied (voice vs. manual)
   - Answer finalized
   - Auto-pause enabled/disabled
   - Onboarding completed
2. Track fidelity scores (backend)
3. Track user behavior metrics
4. Create analytics dashboard (optional)

---

### Step 3.8: Styling Polish

**Goal**: Ensure UI matches design spec exactly

**Work**:
1. Review all components against UI design spec
2. Verify colors match exactly
3. Verify spacing matches
4. Verify fonts and sizes match
5. Verify animations work correctly
6. Test on multiple browsers
7. Test on multiple screen sizes
8. Fix any discrepancies

---

## PHASE 4: Testing & Validation (Weeks 6-7)

### Goal
Comprehensive testing with real users and iteration based on feedback.

---

### Step 4.1: Prompt Testing

**Goal**: Verify prompts enforce fidelity constraint

**File**: `backend/tests/test_prompts.py`

**Work**:
1. Create test suite with 50+ test cases from prompts.md
2. Test each case:
   - Run refinement
   - Check fidelity score
   - Manually verify no external info added
3. Calculate fidelity score distribution
4. Identify common violation patterns
5. Iterate on prompts based on failures
6. Re-test until 95% score > 0.9

**Reference**: Prompts document, lines 352-381 (test cases)

---

### Step 4.2: Integration Testing

**Goal**: Test full end-to-end flows

**Work**:
1. Test happy path:
   - User enters question
   - User dictates thoughts
   - System refines answer
   - User edits (voice and manual)
   - User finalizes
   - User copies to clipboard
2. Test error scenarios:
   - Network failure during refinement
   - Invalid session_id
   - Empty transcript
   - Very long transcript
3. Test concurrent sessions
4. Test session persistence (close browser, resume)
5. Document all bugs found
6. Fix bugs
7. Re-test

---

### Step 4.3: User Acceptance Testing

**Goal**: Test with real target users

**Work**:
1. Recruit 10 students with learning disabilities
2. Prepare test scenarios (simple, medium, complex questions)
3. Conduct 1-hour sessions per student:
   - Observe onboarding experience
   - Observe dictation behavior
   - Observe editing preferences
   - Collect feedback via survey
4. Measure success metrics:
   - Completion rate (target: 80%)
   - Time to complete (target: < 5 minutes)
   - User satisfaction (target: 85% "good" or "excellent")
   - Fidelity perception ("Did output represent your knowledge?")
5. Gather qualitative feedback
6. Identify pain points
7. Prioritize improvements
8. Implement critical fixes
9. Re-test with subset of users

---

### Step 4.4: Teacher Validation

**Goal**: Ensure teachers accept output as legitimate

**Work**:
1. Recruit 5 teachers
2. Show sample outputs (original transcript + refined answer)
3. Gather feedback:
   - Is this acceptable as accommodation?
   - Does it reflect student knowledge?
   - Would you accept this for assignments?
4. Address concerns
5. Document teacher acceptance criteria
6. Adjust prompts if needed to meet criteria

---

### Step 4.5: Accessibility Testing

**Goal**: Verify accessibility with real users

**Work**:
1. Test with students using screen readers
2. Test with students using keyboard only
3. Test with students with motor impairments
4. Test with students with ADHD
5. Gather feedback on accessibility
6. Fix any issues
7. Re-test

---

## PHASE 5: Documentation & Launch (Week 8)

### Goal
Create documentation, train support team, and launch the feature.

---

### Step 5.1: Create User Documentation

**Files**: 
- `docs/user_guide_answer_formulation.md`
- Video tutorial
- Quick reference card (PDF)

**Work**:
1. Write user guide:
   - Getting started
   - Step-by-step walkthrough
   - Voice command reference
   - Tips for best results
   - Troubleshooting
   - FAQ
2. Create video tutorial (2-3 minutes):
   - Screen recording of full workflow
   - Voiceover explaining each step
   - Publish to help center
3. Create quick reference card:
   - Common voice commands
   - Keyboard shortcuts
   - Tips for clear dictation

---

### Step 5.2: Create Teacher Documentation

**File**: `docs/teacher_guide_answer_formulation.md`

**Work**:
1. Write teacher guide:
   - What is Answer Formulation?
   - How it works (technical overview)
   - Why it's legitimate accommodation
   - How to evaluate student work
   - IEP/504 plan language suggestions
   - FAQ for teachers

---

### Step 5.3: Update Developer Documentation

**Files**: 
- `docs/active_dependency_graph.md`
- API documentation

**Work**:
1. Update dependency graph with AnswerFormulationGraph
2. Document API endpoints (request/response schemas)
3. Document error codes
4. Document prompt evolution (version history)

---

### Step 5.4: Train Support Team

**Work**:
1. Create onboarding checklist for support team
2. Create troubleshooting flowchart
3. Create support ticket templates
4. Conduct training session with support team
5. Create internal FAQ

---

### Step 5.5: Final Launch Checklist

**Work**:
1. Verify all tests passing (backend + frontend)
2. Verify accessibility audit complete
3. Verify user testing complete (10 students)
4. Verify teacher validation complete (5 teachers)
5. Verify documentation complete
6. Verify analytics/monitoring in place
7. Verify error logging configured
8. Verify performance benchmarks met:
   - Refinement response time < 5 seconds
   - Edit response time < 3 seconds
   - Page load time < 2 seconds
9. Verify security review complete
10. Deploy to staging
11. Test on staging
12. Deploy to production
13. Monitor closely for first 24 hours

---

## Post-Launch Activities

### Monitoring (Ongoing)

1. Monitor fidelity scores daily
   - Alert if average drops below 0.85
   - Review violations weekly
2. Monitor user metrics
   - Session completion rate
   - Average iterations per session
   - User satisfaction scores
3. Monitor performance
   - API response times
   - Error rates
   - LLM API costs

### Iteration (Ongoing)

1. Weekly prompt review
   - Analyze new violation patterns
   - Update prompts with new examples
   - A/B test prompt variations
2. Monthly feature review
   - Gather user feedback
   - Prioritize improvements
   - Plan next iteration

---

## Summary

This execution plan provides a chronological roadmap from the first line of code to production launch. Each step builds on the previous one, ensuring a solid foundation before moving forward.

**Key Milestones**:
- Week 2: Backend functional, API testable
- Week 3: Frontend functional, full workflow testable
- Week 5: Polished, accessible, ready for user testing
- Week 7: User-tested, validated, ready for launch
- Week 8: Documented, deployed, launched

**Success depends on**:
1. Rigorous prompt testing (fidelity constraint)
2. Real user feedback (target audience)
3. Teacher validation (acceptance as accommodation)
4. Accessibility compliance (WCAG 2.1 AA)
5. Performance optimization (< 5 second refinement)

**Next Step**: Begin with Step 1.1 (Create Project Structure) and proceed sequentially.
