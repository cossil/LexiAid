# Active Dependency Graph

## Overview
This document maps the active codebase dependencies using flowcharts to show the full-stack trace for each major feature in the LexiAid application.

## Feature: Chat System

### Frontend Chat Flow
```
ChatPage.tsx
├── useAccessibility() (AccessibilityContext)
├── apiService.chat() → POST /api/v2/agent/chat
├── GeminiChatInterface.tsx
│   ├── useRealtimeStt() → WebSocket /api/stt/stream
│   │   └── useAudioRecorder() → MediaRecorder API
│   ├── useChatTTSPlayer() → HTML5 Audio
│   ├── useOnDemandTTSPlayer() → apiService.synthesizeText()
│   └── MicrophoneButton.tsx
│       ├── useAudioRecorder()
│       └── apiService.uploadAudioMessage()
└── ChatMessage[] (State)
```

### Backend Chat Flow
```
/api/v2/agent/chat (routes)
├── auth_required decorator → AuthService.verify_id_token()
├── supervisor_graph (graphs/supervisor/)
│   ├── new_chat_graph (graphs/new_chat_graph.py)
│   │   ├── ChatGoogleGenerativeAI (LLM)
│   │   └── DocumentRetrievalService.get_document_content()
│   └── quiz_engine_graph (graphs/quiz_engine_graph.py)
│       ├── ChatGoogleGenerativeAI (LLM)
│       └── QuizEngineState management
├── TTSService.synthesize_speech() (if audio requested)
└── Response with audio_content_base64 and timepoints
```

### Data Flow
```
User Input → STT → LLM Processing → TTS → Audio Output
     ↓              ↓              ↓          ↓
Microphone → WebSocket → LangGraph → Google Cloud → HTML5 Audio
```

---

## Feature: Document Upload

### Frontend Upload Flow
```
DocumentUpload.tsx
├── useAuth() (AuthContext)
├── useAccessibility() (AccessibilityContext)
├── File Upload Handling
│   ├── File validation (type, size)
│   └── Progress tracking
└── apiService.uploadDocument() → POST /api/documents
    ├── FormData construction
    └── Authentication token injection
```

### Backend Upload Flow
```
/api/documents (routes/document_routes.py)
├── auth_required decorator
├── File validation and storage
│   ├── StorageService.upload_file() → Google Cloud Storage
│   └── DocAIService.extract_text() → Document AI
├── FirestoreService.create_document()
├── DocumentUnderstandingState processing
└── TTSService.pre_generate_audio() (optional)
    ├── Text chunking
    └── Google Cloud Text-to-Speech
```

### Processing Pipeline
```
File Upload → GCS Storage → Document AI → Firestore → TTS Pre-generation
      ↓            ↓           ↓           ↓            ↓
  Validation → Cloud Storage → OCR → Database → Audio Assets
```

---

## Feature: Answer Formulation

### Frontend Flow
```
AnswerFormulationPage.tsx
├── useAnswerFormulation() (hooks/useAnswerFormulation.ts)
│   ├── useRealtimeStt() → Dictation
│   ├── apiService.refineAnswer() → POST /api/v2/answer-formulation/refine
│   ├── apiService.editAnswer() → POST /api/v2/answer-formulation/edit
│   └── useAuth() → User preferences
├── DictationPanel.tsx
│   ├── useOnDemandTTSPlayer()
│   └── Real-time transcript display
├── RefinementPanel.tsx
│   ├── Dual TTS players (original/refined)
│   └── Edit mode switching
└── VoiceEditMode/ManualEditMode components
```

### Backend Flow
```
/api/v2/answer-formulation/refine
├── Session management
├── LangGraph answer_formulation_graph
│   ├── validate_input node
│   ├── refine_answer node → ChatGoogleGenerativeAI
│   ├── apply_edit node
│   └── validate_fidelity node
└── Response with refined_answer and audio

/api/v2/answer-formulation/edit
├── Session retrieval
├── Edit command processing
└── Updated refined answer
```

---

## Feature: Quiz System

### Frontend Quiz Flow
```
ChatPage.tsx (Quiz Mode)
├── Quiz state management
├── apiService.startQuiz() → POST /api/v2/agent/chat
├── apiService.continueQuiz() → POST /api/v2/agent/chat
├── QuizContext.tsx
│   ├── quizThreadId state
│   └── cancelQuiz() → apiService.cancelQuiz()
└── Question rendering with options
```

### Backend Quiz Flow
```
Quiz Engine Graph (graphs/quiz_engine_graph.py)
├── QuizEngineState management
├── Question generation → ChatGoogleGenerativeAI
├── Answer evaluation
├── Score tracking
└── Next question logic
```

---

## Feature: Text-to-Speech (TTS)

### Frontend TTS Flow
```
AccessibilityContext.tsx
├── speakText() → TTS orchestration
├── Cloud TTS path
│   ├── apiService.synthesizeText() → POST /api/tts/synthesize
│   └── useOnDemandTTSPlayer() → Audio playback
└── Browser TTS path
    ├── speechSynthesis API
    └── Voice selection

useTTSPlayer.ts (Document TTS)
├── Pre-generated assets → GET /api/documents/{id}/tts-assets
├── On-demand synthesis fallback
└── Word-level timepoint synchronization
```

### Backend TTS Flow
```
/api/tts/synthesize
├── TTSService.synthesize_speech()
│   ├── Text chunking (for large texts)
│   ├── Google Cloud Text-to-Speech API
│   └── Timepoint generation
└── Base64 audio response

/api/documents/{id}/tts-assets
├── StorageService.get_signed_urls()
└── Pre-generated audio and timepoints
```

---

## Feature: Speech-to-Text (STT)

### Frontend STT Flow
```
useRealtimeStt.ts
├── WebSocket connection → ws://localhost:8000/api/stt/stream
├── useAudioRecorder() → Microphone access
├── Audio chunk streaming
└── Transcript assembly (final/interim)

MicrophoneButton.tsx
├── Recording state machine
├── Audio review interface
└── Transcript editing
```

### Backend STT Flow
```
WebSocket /api/stt/stream
├── STTService.transcribe_stream()
│   ├── Google Cloud Speech-to-Text API
│   └── Real-time processing
└── Transcript streaming

/api/stt/transcribe
├── File upload processing
├── STTService.transcribe_audio()
└── Batch transcription
```

---

## Cross-Feature Dependencies

### Authentication Layer
```
Firebase Auth
├── AuthContext.tsx (Frontend)
│   ├── User session management
│   ├── Preference synchronization
│   └── Token refresh
├── AuthService (Backend)
│   ├── ID token verification
│   └── User profile management
└── All API endpoints → auth_required decorator
```

### Accessibility Layer
```
AccessibilityContext.tsx
├── Visual preferences (font, contrast, spacing)
├── TTS settings (voice, speed, delay)
├── User preference persistence
└── Global accessibility state
├── SpeakableText.tsx → Hover TTS
├── All components → Accessibility integration
└── CSS classes → Dynamic styling
```

### Data Persistence Layer
```
Firestore Database
├── UserService → User profiles and preferences
├── DocumentService → Document metadata
├── ProgressService → User progress tracking
└── SessionService → Chat/quiz sessions

Google Cloud Storage
├── File storage (documents, audio)
├── Signed URL generation
└── Asset management
```

### External Service Dependencies
```
Google Cloud Services
├── Firebase Authentication
├── Firestore Database
├── Cloud Storage
├── Document AI (OCR)
├── Text-to-Speech API
└── Speech-to-Text API

OpenAI/Google AI
├── ChatGoogleGenerativeAI (gemini-2.5-flash)
├── LLM processing for chat/quiz/answer formulation
└── Prompt engineering and response handling
```

---

## Component Dependency Matrix

### High-Level Components
```
App.tsx
├── Router setup
├── Context providers
│   ├── AuthProvider
│   ├── AccessibilityProvider
│   ├── DocumentProvider
│   └── QuizProvider
└── Route definitions
    ├── Public routes (Landing, Auth)
    └── Protected routes (Dashboard, Chat, etc.)
```

### Shared Utilities
```
api.ts (Frontend Service Layer)
├── Axios configuration
├── Authentication interceptor
├── All API method definitions
└── Error handling

utils/ttsUtils.ts
├── Cloud TTS integration
├── Audio playback utilities
└── Voice management
```

### State Management Flow
```
User Action → Component → Hook/Context → API Service → Backend Service → External API
     ↓              ↓           ↓              ↓              ↓           ↓
UI Update → State Change → Side Effect → HTTP Request → Business Logic → Data Processing
```

This dependency graph provides a comprehensive view of how all components interact and depend on each other throughout the LexiAid application, making it easier to understand the full-stack architecture and identify potential impact areas for changes.
