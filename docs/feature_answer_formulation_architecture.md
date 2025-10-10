# AI-Assisted Answer Formulation: Technical Architecture

## Overview

This document outlines the technical implementation strategy for the Answer Formulation feature, including backend architecture, frontend components, state management, and integration points.

---

## Architecture Decision: New LangGraph Agent vs. Extension

### Decision: **Create a New Dedicated LangGraph Agent**

**Rationale:**

1. **Distinct Purpose**: Answer Formulation has fundamentally different goals than chat/quiz
   - Chat: Answer questions using document knowledge
   - Quiz: Test knowledge with Q&A
   - Answer Formulation: Refine student's own words (no external info)

2. **Different State Requirements**:
   - Needs to track: original transcript, refined versions, edit history
   - Multi-turn iterative refinement loop
   - Different from linear chat or quiz flow

3. **Isolation of Concerns**:
   - Separate prompts and constraints
   - Independent testing and iteration
   - No risk of interfering with existing features

4. **Scalability**:
   - Easier to add advanced features later (essay writing, multi-section answers)
   - Can optimize separately from other agents

**Graph Name:** `AnswerFormulationGraph`

---

## System Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AnswerFormulationPage.tsx                           │  │
│  │  - Question input                                    │  │
│  │  - Dictation controls                                │  │
│  │  - Transcript display                                │  │
│  │  - Refined answer display                            │  │
│  │  - Edit controls                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  useAnswerFormulation Hook                           │  │
│  │  - State management                                  │  │
│  │  - API calls                                         │  │
│  │  - STT integration                                   │  │
│  │  - TTS integration                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  apiService.answerFormulation()                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  /api/v2/answer-formulation (Flask Route)           │  │
│  │  - Receives transcript + question                    │  │
│  │  - Validates input                                   │  │
│  │  - Invokes AnswerFormulationGraph                    │  │
│  │  - Returns refined answer                            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  AnswerFormulationGraph (LangGraph)                  │  │
│  │                                                       │  │
│  │  Nodes:                                              │  │
│  │  1. validate_input_node                              │  │
│  │  2. refine_answer_node                               │  │
│  │  3. apply_edit_node                                  │  │
│  │  4. validate_fidelity_node                           │  │
│  │                                                       │  │
│  │  State: AnswerFormulationState                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Gemini 2.5 Flash (LLM)                              │  │
│  │  - Receives strict "no external info" prompt         │  │
│  │  - Refines text or applies edits                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TTSService                                          │  │
│  │  - Synthesizes refined answer                        │  │
│  │  - Returns audio + timepoints                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  FirestoreService (Optional)                         │  │
│  │  - Save answer history                               │  │
│  │  - Track usage metrics                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Backend Architecture

### 1. LangGraph State Definition

**File:** `backend/graphs/answer_formulation/state.py`

```python
from typing import TypedDict, List, Optional, Literal

class AnswerFormulationState(TypedDict):
    # Input
    user_id: str
    session_id: str  # Unique ID for this formulation session
    question_prompt: Optional[str]  # The assignment question
    original_transcript: str  # Raw speech-to-text output
    
    # Processing
    refined_answer: Optional[str]  # Current refined version
    edit_command: Optional[str]  # Latest edit instruction
    edit_history: List[dict]  # Track all edits for undo/analysis
    
    # Validation
    fidelity_score: Optional[float]  # 0-1, how much is from original
    fidelity_violations: List[str]  # External info added by AI
    
    # Status
    status: Literal[
        "initializing",
        "refining",
        "refined",
        "editing",
        "finalized",
        "error"
    ]
    error_message: Optional[str]
    
    # Metadata
    iteration_count: int  # Number of refinement cycles
    llm_call_count: int
    created_at: str
    updated_at: str
```

---

### 2. LangGraph Nodes

**File:** `backend/graphs/answer_formulation/graph.py`

#### Node 1: `validate_input_node`
**Purpose:** Validate and prepare input for processing

```python
def validate_input_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """
    Validates input and sets up initial state.
    
    Checks:
    - original_transcript is not empty
    - transcript is reasonable length (not too short/long)
    - user_id and session_id are present
    
    Returns updated state with status.
    """
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
    
    if word_count > 2000:
        state['status'] = 'error'
        state['error_message'] = 'Transcript too long (maximum 2000 words)'
        return state
    
    state['status'] = 'refining'
    state['iteration_count'] = 0
    state['llm_call_count'] = 0
    state['edit_history'] = []
    
    return state
```

---

#### Node 2: `refine_answer_node`
**Purpose:** Transform raw transcript into refined answer

```python
def refine_answer_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """
    Uses LLM to refine the original transcript.
    
    Critical Constraint: AI must NOT add external information.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    
    # Build prompt with strict constraints
    system_prompt = REFINEMENT_SYSTEM_PROMPT  # See prompts section
    
    user_prompt = f"""
Original Question/Prompt: {state.get('question_prompt', 'Not provided')}

Student's Spoken Thoughts (verbatim):
{state['original_transcript']}

Your task: Refine this into a clear, well-structured answer.
"""
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.3  # Lower temp for more consistent refinement
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
    
    return state
```

---

#### Node 3: `apply_edit_node`
**Purpose:** Apply user's voice edit command to refined answer

```python
def apply_edit_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """
    Applies a specific edit command to the refined answer.
    
    Edit types:
    - Word/phrase replacement
    - Sentence rephrasing
    - Addition
    - Deletion
    - Reordering
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    
    edit_command = state.get('edit_command')
    current_answer = state.get('refined_answer')
    
    if not edit_command or not current_answer:
        state['status'] = 'error'
        state['error_message'] = 'Missing edit command or answer'
        return state
    
    # Parse edit command to understand intent
    parsed_edit = parse_edit_command(edit_command)
    
    # Build edit prompt
    system_prompt = EDIT_SYSTEM_PROMPT  # See prompts section
    
    user_prompt = f"""
Current Answer:
{current_answer}

Edit Command: {edit_command}

Apply this edit to the answer. Only change what was requested.
"""
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.2  # Very low for precise edits
    )
    
    response = llm.invoke([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ])
    
    updated_answer = response.content
    
    # Track edit in history
    state['edit_history'].append({
        'command': edit_command,
        'before': current_answer,
        'after': updated_answer,
        'timestamp': datetime.now(timezone.utc).isoformat()
    })
    
    state['refined_answer'] = updated_answer
    state['status'] = 'refined'
    state['llm_call_count'] += 1
    state['iteration_count'] += 1
    
    return state
```

---

#### Node 4: `validate_fidelity_node` (ASYNC - Offline Monitoring)
**Purpose:** Check if AI added external information (quality control)

**IMPORTANT CHANGE:** This node is now **asynchronous and offline** - it does NOT block the user-facing flow.

**Rationale:**
- **Performance**: User gets refined answer faster (no waiting for validation)
- **Cost**: Run validation on sample (10-20%) or in batches, not every request
- **Purpose**: This is a developer monitoring tool, not real-time user feedback
- **Actionable**: Analyze violations offline to improve refinement prompts

**Implementation Strategy:**

**Option A: Async Background Task (Recommended)**
```python
def refine_answer_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """
    Refines answer and queues async validation (non-blocking).
    """
    # ... refinement logic ...
    
    state['refined_answer'] = refined_text
    state['status'] = 'refined'
    
    # Queue async validation (doesn't block response)
    queue_fidelity_validation_task(
        session_id=state['session_id'],
        original=state['original_transcript'],
        refined=refined_text
    )
    
    return state  # Return immediately, validation runs in background
```

**Option B: Scheduled Batch Validation**
```python
# Cron job runs nightly
def nightly_fidelity_validation():
    """
    Validates a sample of yesterday's refinements.
    """
    sessions = get_recent_sessions(days=1, sample_rate=0.2)  # 20% sample
    
    for session in sessions:
        score, violations = validate_fidelity(
            session['original_transcript'],
            session['refined_answer']
        )
        
        log_fidelity_metrics(session['session_id'], score, violations)
        
        if score < 0.8:
            alert_developer(session, violations)
```

**Option C: Real-Time Sampling**
```python
def refine_answer_node(state: AnswerFormulationState) -> AnswerFormulationState:
    """
    Validates only 10% of requests in real-time.
    """
    # ... refinement logic ...
    
    state['refined_answer'] = refined_text
    state['status'] = 'refined'
    
    # Validate 10% of requests
    if random.random() < 0.1:
        score, violations = validate_fidelity_sync(
            state['original_transcript'],
            refined_text
        )
        state['fidelity_score'] = score
        state['fidelity_violations'] = violations
    
    return state
```

**Validation Function (Async)**
```python
async def validate_fidelity_async(original: str, refined: str) -> tuple[float, list]:
    """
    Async validation that doesn't block user response.
    """
    from langchain_google_genai import ChatGoogleGenerativeAI
    
    validation_prompt = f"""
Original Transcript: {original}

Refined Answer: {refined}

Task: Identify any information in the Refined Answer that was NOT present in the Original Transcript.

Output format:
- Fidelity Score: [0.0 to 1.0, where 1.0 = perfect fidelity]
- Violations: [List any added information, or "None"]
"""
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.1
    )
    
    response = llm.invoke(validation_prompt)
    
    # Parse response (simplified - would need robust parsing)
    fidelity_score = extract_fidelity_score(response.content)
    violations = extract_violations(response.content)
    
    state['fidelity_score'] = fidelity_score
    state['fidelity_violations'] = violations
    
    # Log violations for monitoring
    if violations and violations != ["None"]:
        logger.warning(f"Fidelity violations detected in session {state['session_id']}: {violations}")
    
    return state
```

---

### 3. Graph Definition

```python
def create_answer_formulation_graph(checkpointer=None):
    """
    Creates the Answer Formulation LangGraph.
    """
    from langgraph.graph import StateGraph, END
    
    workflow = StateGraph(AnswerFormulationState)
    
    # Add nodes
    workflow.add_node("validate_input", validate_input_node)
    workflow.add_node("refine_answer", refine_answer_node)
    workflow.add_node("apply_edit", apply_edit_node)
    workflow.add_node("validate_fidelity", validate_fidelity_node)
    
    # Define edges
    workflow.set_entry_point("validate_input")
    
    # From validate_input
    workflow.add_conditional_edges(
        "validate_input",
        lambda state: "refine" if state['status'] == 'refining' else "end",
        {
            "refine": "refine_answer",
            "end": END
        }
    )
    
    # From refine_answer
    workflow.add_edge("refine_answer", "validate_fidelity")
    
    # From validate_fidelity
    workflow.add_edge("validate_fidelity", END)
    
    # From apply_edit
    workflow.add_edge("apply_edit", "validate_fidelity")
    
    return workflow.compile(checkpointer=checkpointer)
```

---

### 4. Flask API Route

**File:** `backend/routes/answer_formulation_routes.py`

```python
from flask import Blueprint, request, jsonify, current_app, g
from datetime import datetime, timezone
import uuid

answer_formulation_bp = Blueprint('answer_formulation', __name__)

@answer_formulation_bp.route('/refine', methods=['POST'])
@auth_required
def refine_answer():
    """
    Refine a spoken transcript into a clear written answer.
    
    Request:
    {
        "transcript": "Um, so like, the causes were...",
        "question": "Explain the causes of the American Revolution",
        "session_id": "optional-existing-session-id"
    }
    
    Response:
    {
        "refined_answer": "The American Revolution occurred...",
        "session_id": "uuid",
        "status": "refined",
        "fidelity_score": 0.95,
        "iteration_count": 1
    }
    """
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
        return jsonify({
            "error": result.get('error_message', 'Processing failed')
        }), 400
    
    # Generate TTS for refined answer
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
    """
    Apply an edit command to a refined answer.
    
    Request:
    {
        "session_id": "uuid",
        "edit_command": "Change 'upset' to 'angry'"
    }
    
    Response:
    {
        "refined_answer": "Updated text...",
        "session_id": "uuid",
        "status": "refined",
        "iteration_count": 2
    }
    """
    user_id = g.user_id
    data = request.get_json()
    
    session_id = data.get('session_id')
    edit_command = data.get('edit_command', '').strip()
    
    if not session_id or not edit_command:
        return jsonify({"error": "session_id and edit_command required"}), 400
    
    # Get graph instance
    answer_formulation_graph = current_app.config['ANSWER_FORMULATION_GRAPH']
    
    # Get current state from checkpointer
    config = {"configurable": {"thread_id": session_id}}
    
    # Update state with edit command
    update_state = {
        'edit_command': edit_command,
        'status': 'editing'
    }
    
    # Invoke apply_edit node
    result = answer_formulation_graph.invoke(update_state, config)
    
    # Generate TTS for updated answer
    tts_service = current_app.config['TTS_SERVICE']
    tts_result = tts_service.synthesize_text(result['refined_answer'])
    
    return jsonify({
        "refined_answer": result['refined_answer'],
        "session_id": session_id,
        "status": result['status'],
        "iteration_count": result['iteration_count'],
        "audio_content_base64": tts_result.get('audio_content'),
        "timepoints": tts_result.get('timepoints')
    }), 200
```

---

## Frontend Architecture

### 1. Page Component

**File:** `src/pages/AnswerFormulationPage.tsx`

```typescript
interface AnswerFormulationPageProps {}

const AnswerFormulationPage: React.FC<AnswerFormulationPageProps> = () => {
  const { user } = useAuth();
  const {
    question,
    setQuestion,
    transcript,
    refinedAnswer,
    status,
    sessionId,
    startDictation,
    stopDictation,
    refineAnswer,
    editAnswer,
    finalizeAnswer,
    reset
  } = useAnswerFormulation();
  
  const { playAudio, stopAudio, status: ttsStatus } = useTTSPlayer();
  
  return (
    <div className="answer-formulation-page">
      {/* Question Input Section */}
      <QuestionInput value={question} onChange={setQuestion} />
      
      {/* Dictation Section */}
      <DictationPanel
        transcript={transcript}
        isRecording={status === 'recording'}
        onStart={startDictation}
        onStop={stopDictation}
      />
      
      {/* Refinement Section */}
      {transcript && (
        <RefinementPanel
          originalTranscript={transcript}
          refinedAnswer={refinedAnswer}
          status={status}
          onRefine={refineAnswer}
          onEdit={editAnswer}
          onFinalize={finalizeAnswer}
          onPlayAudio={() => playAudio(refinedAnswer)}
        />
      )}
    </div>
  );
};
```

---

### 2. Custom Hook

**File:** `src/hooks/useAnswerFormulation.ts`

```typescript
interface UseAnswerFormulationReturn {
  question: string;
  setQuestion: (q: string) => void;
  transcript: string;
  refinedAnswer: string | null;
  status: 'idle' | 'recording' | 'refining' | 'refined' | 'editing' | 'finalized';
  sessionId: string | null;
  fidelityScore: number | null;
  iterationCount: number;
  
  // Auto-pause settings
  autoPauseEnabled: boolean;
  setAutoPauseEnabled: (enabled: boolean) => void;
  pauseDuration: number; // in seconds
  setPauseDuration: (duration: number) => void;
  pauseCountdown: number | null; // countdown timer when pause detected
  
  startDictation: () => void;
  stopDictation: () => void;
  refineAnswer: () => Promise<void>;
  editAnswer: (command: string) => Promise<void>;
  finalizeAnswer: () => void;
  reset: () => void;
}

export const useAnswerFormulation = (): UseAnswerFormulationReturn => {
  const { userPreferences, updateUserPreferences } = useAuth();
  
  const [question, setQuestion] = useState('');
  const [transcript, setTranscript] = useState('');
  const [refinedAnswer, setRefinedAnswer] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'recording' | 'refining' | 'refined' | 'editing' | 'finalized'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fidelityScore, setFidelityScore] = useState<number | null>(null);
  const [iterationCount, setIterationCount] = useState(0);
  
  // Auto-pause settings (from user preferences)
  const [autoPauseEnabled, setAutoPauseEnabledState] = useState(
    userPreferences.answerFormulationAutoPause ?? false
  );
  const [pauseDuration, setPauseDurationState] = useState(
    userPreferences.answerFormulationPauseDuration ?? 3.0
  );
  const [pauseCountdown, setPauseCountdown] = useState<number | null>(null);
  
  // Persist auto-pause settings to user preferences
  const setAutoPauseEnabled = (enabled: boolean) => {
    setAutoPauseEnabledState(enabled);
    updateUserPreferences({ answerFormulationAutoPause: enabled });
  };
  
  const setPauseDuration = (duration: number) => {
    setPauseDurationState(duration);
    updateUserPreferences({ answerFormulationPauseDuration: duration });
  };
  
  const { startDictation: startSTT, stopDictation: stopSTT, transcript: sttTranscript } = useRealtimeStt();
  
  // Sync STT transcript
  useEffect(() => {
    setTranscript(sttTranscript.final);
  }, [sttTranscript]);
  
  // Auto-pause detection logic
  const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptLengthRef = useRef(0);
  
  useEffect(() => {
    if (!autoPauseEnabled || status !== 'recording') {
      // Clear any existing timer
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
        setPauseCountdown(null);
      }
      return;
    }
    
    // Check if transcript has changed (user is speaking)
    const currentLength = sttTranscript.final.length + sttTranscript.interim.length;
    
    if (currentLength !== lastTranscriptLengthRef.current) {
      // User is speaking, reset timer
      lastTranscriptLengthRef.current = currentLength;
      
      if (pauseTimerRef.current) {
        clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = null;
        setPauseCountdown(null);
      }
    } else if (!pauseTimerRef.current && currentLength > 0) {
      // User has paused, start countdown
      let countdown = pauseDuration;
      setPauseCountdown(countdown);
      
      const countdownInterval = setInterval(() => {
        countdown -= 0.1;
        setPauseCountdown(Math.max(0, countdown));
      }, 100);
      
      pauseTimerRef.current = setTimeout(() => {
        clearInterval(countdownInterval);
        setPauseCountdown(null);
        stopDictation();
      }, pauseDuration * 1000);
    }
  }, [sttTranscript, autoPauseEnabled, status, pauseDuration]);
  
  const startDictation = () => {
    setStatus('recording');
    lastTranscriptLengthRef.current = 0;
    startSTT();
  };
  
  const stopDictation = () => {
    setStatus('idle');
    stopSTT();
    
    // Clear pause timer
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
      setPauseCountdown(null);
    }
  };
  
  const refineAnswer = async () => {
    setStatus('refining');
    
    try {
      const response = await apiService.refineAnswer({
        transcript,
        question,
        session_id: sessionId
      });
      
      setRefinedAnswer(response.refined_answer);
      setSessionId(response.session_id);
      setFidelityScore(response.fidelity_score);
      setIterationCount(response.iteration_count);
      setStatus('refined');
    } catch (error) {
      console.error('Refinement failed:', error);
      setStatus('idle');
    }
  };
  
  const editAnswer = async (command: string) => {
    setStatus('editing');
    
    try {
      const response = await apiService.editAnswer({
        session_id: sessionId!,
        edit_command: command
      });
      
      setRefinedAnswer(response.refined_answer);
      setIterationCount(response.iteration_count);
      setStatus('refined');
    } catch (error) {
      console.error('Edit failed:', error);
      setStatus('refined');
    }
  };
  
  const finalizeAnswer = () => {
    setStatus('finalized');
    // Optionally save to Firestore for history
  };
  
  const reset = () => {
    setQuestion('');
    setTranscript('');
    setRefinedAnswer(null);
    setStatus('idle');
    setSessionId(null);
    setFidelityScore(null);
    setIterationCount(0);
  };
  
  return {
    question,
    setQuestion,
    transcript,
    refinedAnswer,
    status,
    sessionId,
    fidelityScore,
    iterationCount,
    startDictation,
    stopDictation,
    refineAnswer,
    editAnswer,
    finalizeAnswer,
    reset
  };
};
```

---

## State Management Strategy

### Session Persistence

**Challenge:** User might close browser mid-session

**Solution:** Use LangGraph checkpointing + optional Firestore backup

```python
# Backend: SQLite checkpointer for sessions
answer_formulation_checkpointer = SqliteSaver.from_conn_string(
    "answer_formulation_sessions.db"
)

# Optionally save to Firestore for long-term history
def save_session_to_firestore(state: AnswerFormulationState):
    firestore_service.collection('answer_formulation_sessions').document(
        state['session_id']
    ).set({
        'user_id': state['user_id'],
        'question': state.get('question_prompt'),
        'original_transcript': state['original_transcript'],
        'refined_answer': state['refined_answer'],
        'iteration_count': state['iteration_count'],
        'fidelity_score': state.get('fidelity_score'),
        'created_at': state['created_at'],
        'updated_at': state['updated_at'],
        'status': state['status']
    })
```

---

## Integration Points

### 1. With Existing STT
- Reuse `useRealtimeStt` hook
- Same WebSocket STT endpoint
- No changes needed

### 2. With Existing TTS
- Reuse `TTSService.synthesize_text()`
- Generate audio for refined answers
- Reuse `useTTSPlayer` for playback

### 3. With Supervisor Graph
- Answer Formulation is **independent** (not part of Supervisor)
- Separate API endpoints
- Separate navigation in UI

### 4. With Document Context (Future)
- Could integrate with DocumentView
- "Formulate Answer About This Document" button
- Pre-populate question from document

---

## Performance Considerations

### 1. LLM Call Optimization
- **Refinement**: Single call (~3-5 seconds)
- **Edits**: Single call per edit (~2-3 seconds)
- **Validation**: Optional, async (don't block user)

### 2. Caching Strategy
- Cache refined answers by session_id
- Avoid re-refining if user goes back

### 3. Rate Limiting
- Limit iterations per session (e.g., max 10 edits)
- Prevent abuse of LLM API

---

## Security & Privacy

### 1. Data Handling
- Transcripts contain student work (sensitive)
- Store encrypted in Firestore
- Auto-delete after 30 days (configurable)

### 2. Access Control
- User can only access their own sessions
- Teachers cannot view student formulation sessions (privacy)

### 3. Audit Logging
- Log all refinements and edits
- Track fidelity scores for quality monitoring
- Alert on consistent fidelity violations

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Usage Metrics**:
   - Sessions started per day
   - Sessions completed (finalized)
   - Average session duration
   - Average iterations per session

2. **Quality Metrics**:
   - Average fidelity score
   - Fidelity violations frequency
   - User satisfaction ratings

3. **Performance Metrics**:
   - LLM response time
   - API endpoint latency
   - Error rates

4. **User Behavior**:
   - Most common edit types
   - Average transcript length
   - Dropout points (where users abandon)

---

## Next Steps

1. **Prompt Engineering** (see `feature_answer_formulation_prompts.md`)
2. **UI/UX Design** (see `feature_answer_formulation_ui_design.md`)
3. **Testing Strategy** (see `feature_answer_formulation_testing.md`)
4. **Implementation Roadmap** (see `feature_answer_formulation_roadmap.md`)
