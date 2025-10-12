# Active Dependency Graph

## Full-Stack Feature Tracing

### Feature 1: Document Upload & Processing

#### Frontend Flow
```
DocumentUpload.tsx
  └─> apiService.uploadDocument(file, metadata)
      └─> POST /api/documents/upload (multipart/form-data)
```

#### Backend Flow
```
document_routes.py::upload_document()
  ├─> FirestoreService.save_document() - Create initial entry
  ├─> StorageService.upload_file() - Upload to GCS
  ├─> DUA Processing (if eligible: pdf, png, jpg, jpeg)
  │   ├─> run_dua_processing_for_document() [graphs/document_understanding_agent/graph.py]
  │   │   ├─> StorageService.get_file() - Download image
  │   │   ├─> Vertex AI Gemini 2.5 Flash - Generate narrative
  │   │   └─> Returns: tts_ready_narrative
  │   ├─> TTSService.synthesize_text() - Pre-generate audio
  │   ├─> StorageService.upload_bytes_as_file() - Save audio
  │   ├─> StorageService.upload_string_as_file() - Save timepoints
  │   └─> FirestoreService.update_document() - Save URIs
  └─> OCR Fallback (if DUA fails or not eligible)
      ├─> OCRTool.process_document() [DEPRECATED - Tool not initialized]
      └─> FirestoreService.update_document() - Save OCR text
```

**Active Services**: FirestoreService, StorageService, TTSService, DUA Graph
**Deprecated**: OCRTool (referenced but not initialized in app.py)

---

### Feature 2: Document Viewing with TTS

#### Frontend Flow
```
DocumentView.tsx
  ├─> useEffect: setActiveDocumentId(id) [DocumentContext]
  ├─> axios.get(`/api/documents/${id}?include_content=true`)
  └─> useTTSPlayer(documentId, content)
      ├─> Try: apiService.getTtsAssets(documentId)
      │   └─> GET /api/documents/{id}/tts-assets
      └─> Fallback: apiService.synthesizeText(fullText)
          └─> POST /api/tts/synthesize
```

#### Backend Flow
```
document_routes.py::get_document()
  └─> DocumentRetrievalService.get_document_content(document_id)
      ├─> FirestoreService.get_document() - Get metadata
      ├─> Priority 1: Check 'dua_narrative_content' (status='processed_dua')
      ├─> Priority 2: Check 'ocr_text_content' (status='processed')
      ├─> Priority 3: StorageService.get_file(gcs_uri) - Download from GCS
      └─> Priority 4: FirestoreService.get_document_content_from_subcollection()

tts_routes.py::synthesize()
  └─> TTSService.synthesize_text(text, voice, rate, pitch)
      ├─> sanitize_text_for_tts() [utils/text_utils.py]
      ├─> _chunk_text() - Split into 2500 char chunks
      ├─> _build_ssml_and_map() - Generate SSML with marks
      ├─> Google Cloud TTS API - Synthesize each chunk
      └─> Returns: {audio_content, timepoints}
```

**Active Services**: DocumentRetrievalService, FirestoreService, StorageService, TTSService

---

### Feature 3: Chat with Document

#### Frontend Flow
```
ChatPage.tsx
  ├─> useEffect: Fetch document details
  ├─> handleSendMessage(messageText)
  │   └─> apiService.chat({ query, documentId, threadId })
  │       └─> POST /api/v2/agent/chat (JSON)
  └─> handleAudioSend(audioBlob, transcript)
      └─> apiService.uploadAudioMessage(formData)
          └─> POST /api/v2/agent/chat (multipart)
```

#### Backend Flow
```
app.py::agent_chat_route()
  ├─> @require_auth - Verify Firebase token
  ├─> Parse input (text or audio)
  │   ├─> If audio: STTService.transcribe_audio_bytes()
  │   └─> Extract effective_query
  ├─> DatabaseManager - Get compiled_supervisor_graph
  ├─> Create/retrieve SupervisorState
  │   ├─> If new thread: Create thread_id
  │   └─> If existing: Load state from checkpointer
  ├─> compiled_supervisor_graph.invoke(supervisor_input, config)
  │   │
  │   ├─> supervisor/graph.py::receive_user_input_node()
  │   ├─> supervisor/graph.py::routing_decision_node()
  │   │   └─> Determines: "new_chat_graph" or "quiz_engine_graph"
  │   │
  │   ├─> If chat: invoke_new_chat_graph_node()
  │   │   └─> new_chat_graph.py::call_chat_llm_node()
  │   │       ├─> DocumentRetrievalService.get_document_content()
  │   │       ├─> distill_conversation_history()
  │   │       ├─> ChatGoogleGenerativeAI(model="gemini-2.5-flash", temp=0.7)
  │   │       └─> Returns: response
  │   │
  │   └─> If quiz: invoke_quiz_engine_graph_node()
  │       └─> quiz_engine_graph.py::call_quiz_engine_node()
  │           ├─> If status="generating_first_question"
  │           │   └─> Gemini 2.5 Flash (temp=0.7) - Generate question
  │           └─> If status="evaluating_answer"
  │               └─> Gemini 2.5 Flash (temp=0.3) - Evaluate + next Q
  │
  ├─> TTSService.synthesize_text(response_text) - Generate audio
  └─> Returns: {response, thread_id, audio_content_base64, timepoints, quiz_active}
```

**Active Services**: STTService, DocumentRetrievalService, TTSService
**Active Graphs**: SupervisorGraph, NewChatGraph, QuizEngineGraph

---

### Feature 4: Quiz Generation & Interaction

#### Frontend Flow
```
ChatPage.tsx::handleStartQuiz()
  └─> apiService.chat({ query: '/start_quiz', documentId, threadId })
      └─> POST /api/v2/agent/chat

User answers question:
ChatPage.tsx::handleSendMessage(answer)
  └─> apiService.chat({ query: answer, documentId, threadId })
      └─> POST /api/v2/agent/chat
```

#### Backend Flow
```
app.py::agent_chat_route()
  └─> SupervisorGraph routing detects quiz intent
      └─> invoke_quiz_engine_graph_node()
          └─> quiz_engine_graph.py::call_quiz_engine_node()
              │
              ├─> First Question Generation:
              │   ├─> DocumentRetrievalService.get_document_content_for_quiz()
              │   ├─> Gemini 2.5 Flash (temp=0.7)
              │   ├─> PydanticOutputParser validates LLMQuizResponse
              │   └─> Returns: {question_text, options, correct_answer_index}
              │
              ├─> Answer Evaluation:
              │   ├─> Compare user_answer with correct_answer
              │   ├─> Gemini 2.5 Flash (temp=0.3)
              │   ├─> Update quiz_history
              │   ├─> Increment score if correct
              │   └─> Generate next question or final_summary
              │
              └─> State Updates:
                  ├─> current_question_to_display
                  ├─> current_feedback_to_display
                  ├─> status: "awaiting_answer" | "quiz_completed"
                  └─> Checkpointed in quiz_checkpoints.db
```

**Active Services**: DocumentRetrievalService
**Active Graphs**: SupervisorGraph, QuizEngineGraph
**LLM Models**: Gemini 2.5 Flash (dual temperatures)

---

### Feature 5: Real-time Speech-to-Text

#### Frontend Flow
```
GeminiChatInterface.tsx::ChatInputBar
  └─> useRealtimeStt()
      ├─> startDictation()
      │   ├─> navigator.mediaDevices.getUserMedia()
      │   ├─> WebSocket: ws://backend/api/stt/stream
      │   ├─> MediaRecorder (webm/opus, 16kHz)
      │   └─> Send audio chunks via WebSocket
      └─> Receive transcript updates
          └─> Update transcript.final and transcript.interim
```

#### Backend Flow
```
app.py::stt_stream() [@sock.route('/api/stt/stream')]
  ├─> WebSocket connection established
  ├─> Create speech.StreamingRecognitionConfig
  │   ├─> encoding: WEBM_OPUS
  │   ├─> sample_rate: 16000
  │   ├─> language: en-US
  │   └─> enable_automatic_punctuation: True
  ├─> request_generator() - Yields audio chunks from WebSocket
  ├─> STTService.client.streaming_recognize()
  └─> Send back: {is_final, transcript, stability}
```

**Active Services**: STTService
**WebSocket**: Flask-Sock integration

---

## Service Dependency Tree

```
app.py (Main Entry)
├── AuthService
├── FirestoreService
├── StorageService
├── DocAIService [Not actively used]
├── TTSService
│   └── utils/text_utils.py::sanitize_text_for_tts
├── STTService
└── DocumentRetrievalService
    ├── FirestoreService
    └── StorageService

DatabaseManager
├── SqliteSaver (LangGraph checkpointing)
├── create_quiz_engine_graph() → QuizEngineGraph
├── create_new_chat_graph() → NewChatGraph
└── create_supervisor_graph() → SupervisorGraph
    ├── Compiled QuizEngineGraph instance
    ├── Compiled NewChatGraph instance
    └── DocumentRetrievalService
```

---

## Graph Dependency Tree

```
SupervisorGraph
├── receive_user_input_node [supervisor/nodes_routing.py]
├── routing_decision_node [supervisor/nodes_routing.py]
│   └── Uses: DocumentRetrievalService
├── invoke_new_chat_graph_node [supervisor/nodes_invokers.py]
│   └── Invokes: NewChatGraph
└── invoke_quiz_engine_graph_node [supervisor/nodes_invokers.py]
    └── Invokes: QuizEngineGraph

NewChatGraph [new_chat_graph.py]
└── call_chat_llm_node
    ├── DocumentRetrievalService.get_document_content()
    ├── distill_conversation_history()
    └── ChatGoogleGenerativeAI (gemini-2.5-flash, temp=0.7)

QuizEngineGraph [quiz_engine_graph.py]
└── call_quiz_engine_node
    ├── DocumentRetrievalService.get_document_content_for_quiz()
    ├── get_quiz_engine_chain() - Creates LangChain runnable
    ├── ChatGoogleGenerativeAI (gemini-2.5-flash)
    │   ├── temp=0.7 for question generation
    │   └── temp=0.3 for evaluation
    └── PydanticOutputParser (LLMQuizResponse validation)

DocumentUnderstandingAgent [document_understanding_agent/graph.py]
└── run_dua_processing_for_document() [Called from document_routes.py]
    ├── StorageService.get_file()
    ├── Vertex AI upload
    ├── ChatGoogleGenerativeAI (gemini-2.5-flash-preview-05-20, temp=0.3)
    └── Returns: tts_ready_narrative
```

---

## Frontend Component Dependency Tree

```
App.tsx
├── AuthProvider [contexts/AuthContext.tsx]
│   ├── Firebase Auth
│   └── Firestore user preferences
├── AccessibilityProvider [contexts/AccessibilityContext.tsx]
│   ├── Uses: AuthContext.userPreferences
│   ├── TTSService via apiService
│   └── Browser SpeechSynthesis
└── Router
    └── DashboardLayout [layouts/DashboardLayout.tsx]
        ├── DocumentProvider [contexts/DocumentContext.tsx]
        ├── QuizProvider [contexts/QuizContext.tsx]
        └── Outlet (renders pages)

ChatPage.tsx
├── useAccessibility()
├── apiService.chat()
├── apiService.uploadAudioMessage()
├── GeminiChatInterface
│   ├── useChatTTSPlayer() - For agent messages
│   ├── useOnDemandTTSPlayer() - For user messages
│   ├── MessageBubble (multiple)
│   └── ChatInputBar
│       ├── useRealtimeStt() - WebSocket STT
│       └── MicrophoneButton

DocumentView.tsx
├── useDocument() - Set active document
├── useTTSPlayer(documentId, content)
│   ├── apiService.getTtsAssets() - Try pre-generated
│   └── apiService.synthesizeText() - Fallback
├── SpeakableDocumentContent - Word highlighting
└── axios.get(`/api/documents/${id}`)

DocumentsList.tsx
└── axios.get('/api/documents') - List documents
```

---

## API Endpoint Usage Map

### Active Endpoints (Used by Frontend)

| Endpoint | Method | Frontend Caller | Backend Handler |
|----------|--------|-----------------|-----------------|
| `/api/v2/agent/chat` | POST | ChatPage (text/audio) | app.py::agent_chat_route |
| `/api/stt/stream` | WebSocket | useRealtimeStt | app.py::stt_stream |
| `/api/tts/synthesize` | POST | useTTSPlayer, useOnDemandTTSPlayer | app.py::tts_synthesize_route |
| `/api/documents/upload` | POST | DocumentUpload | document_routes.py::upload_document |
| `/api/documents` | GET | DocumentsList | document_routes.py::list_documents |
| `/api/documents/{id}` | GET | DocumentView | document_routes.py::get_document |
| `/api/documents/{id}` | DELETE | DocumentsList | document_routes.py::delete_document |
| `/api/documents/{id}/download` | GET | DocumentView | document_routes.py::download_document |
| `/api/documents/{id}/tts-assets` | GET | useTTSPlayer | document_routes.py::get_tts_assets |
| `/api/users/me` | GET | Settings | user_routes.py::get_user_profile |
| `/api/users/me/preferences` | PUT | AccessibilityContext | user_routes.py::update_preferences |
| `/api/progress` | GET/POST | Dashboard | progress_routes.py |

### Deprecated/Unused Endpoints
- None identified (all registered blueprints are actively used)

---

## Summary

### Active Code Paths
1. ✅ **Document Upload → DUA → TTS Pre-generation** (Full pipeline active)
2. ✅ **Document View → TTS Playback** (Pre-generated or on-demand)
3. ✅ **Chat → Supervisor → NewChatGraph** (Document Q&A)
4. ✅ **Quiz → Supervisor → QuizEngineGraph** (Quiz generation & evaluation)
5. ✅ **Real-time STT → WebSocket** (Voice input)
6. ✅ **Audio Upload → STT → Chat** (Audio messages)

### Inactive/Deprecated Components
1. ❌ **OCRTool**: Referenced in document_routes.py but not initialized in app.py
2. ❌ **AiTutorAgent**: Mentioned in comments as deprecated, not imported
3. ❌ **AdvancedDocumentLayoutTool**: Removed/deprecated per memories
4. ⚠️ **DocAIService**: Initialized but not actively used (DUA uses Vertex AI directly)

### Critical Dependencies
- **LangGraph**: All agent functionality (Supervisor, Chat, Quiz)
- **Google Cloud**: TTS, STT, Vertex AI (Gemini)
- **Firebase**: Auth, Firestore
- **GCS**: File storage
- **SQLite**: LangGraph state checkpointing
