# Active Dependency Graph

> **Purpose**: Document runtime dependencies between all active components  
> **Status**: Verified 2026-01-09

---

## Backend Dependency Graph

```mermaid
graph TD
    subgraph Flask App
        A[app.py] --> B[DatabaseManager]
        A --> C[Service Initialization]
        A --> D[Blueprint Registration]
    end
    
    subgraph Services
        C --> S1[AuthService]
        C --> S2[FirestoreService]
        C --> S3[StorageService]
        C --> S4[TTSService]
        C --> S5[STTService]
        C --> S6[DocumentRetrievalService]
    end
    
    subgraph Graphs
        B --> G1[SupervisorGraph]
        B --> G2[QuizEngineGraph]
        B --> G3[NewChatGraph]
        B --> G4[AnswerFormulationGraph]
        B --> G5[DUAGraph]
        
        G1 --> G2
        G1 --> G3
    end
    
    subgraph Routes
        D --> R1[document_bp]
        D --> R2[tts_bp]
        D --> R3[stt_bp]
        D --> R4[user_bp]
        D --> R5[admin_bp]
        D --> R6[answer_formulation_bp]
        D --> R7[feedback_bp]
        D --> R8[progress_bp]
    end
    
    subgraph External
        S1 --> E1[Firebase Auth]
        S2 --> E2[Firestore]
        S3 --> E3[GCS]
        S4 --> E4[Google TTS API]
        S5 --> E5[Google STT API]
        G1 --> E6[Gemini API]
    end
```

---

## Frontend Dependency Graph

```mermaid
graph TD
    subgraph App
        A[App.tsx] --> P[Providers]
    end
    
    subgraph Providers
        P --> P1[AuthProvider]
        P1 --> P2[AccessibilityProvider]
        P2 --> P3[DocumentProvider]
        P3 --> P4[QuizProvider]
    end
    
    subgraph Pages
        P4 --> PG1[Dashboard]
        P4 --> PG2[DocumentView]
        P4 --> PG3[ChatPage]
        P4 --> PG4[AnswerFormulationPage]
        P4 --> PG5[Settings]
    end
    
    subgraph Hooks
        PG2 --> H1[useTTSPlayer]
        PG3 --> H2[useRealtimeStt]
        PG4 --> H3[useAnswerFormulation]
        PG4 --> H4[useAudioRecorder]
    end
    
    subgraph Services
        H1 --> SV1[apiService]
        H2 --> SV1
        H3 --> SV1
    end
    
    subgraph Components
        PG2 --> C1[SpeakableDocumentContent]
        PG3 --> C2[GeminiChatInterface]
        PG3 --> C3[MicrophoneButton]
        PG4 --> C4[DictationPanel]
        PG4 --> C5[RefinementPanel]
    end
```

---

## Database Dependencies

```mermaid
graph LR
    subgraph SQLite Checkpoints
        DB1[quiz_checkpoints.db]
        DB2[general_query_checkpoints.db]
        DB3[supervisor_checkpoints.db]
        DB4[document_understanding_checkpoints.db]
        DB5[answer_formulation_sessions.db]
    end
    
    subgraph Graphs
        G1[QuizEngineGraph] --> DB1
        G2[NewChatGraph] --> DB2
        G3[SupervisorGraph] --> DB3
        G4[DUAGraph] --> DB4
        G5[AnswerFormulationGraph] --> DB5
    end
```

---

## External API Dependencies

| Service | API | Auth Method |
|---------|-----|-------------|
| LLM | Gemini API | `GOOGLE_API_KEY` |
| STT | Google Cloud Speech | Service Account |
| TTS | Google Cloud TTS | Service Account |
| Storage | Google Cloud Storage | Service Account |
| Database | Firestore | Service Account |
| Auth | Firebase Auth | Firebase SDK |
