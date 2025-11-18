# **Active Dependency Graph**

Document Version: 2.0 (Converged)  
Status: Verified Audit

## **1\. Overview**

This document maps the **verified** end-to-end dependencies for the LexiAid application. It traces the execution flow from Frontend Components down to Backend Services and External APIs.

**Key Architectural Findings:**

* **Centralized Supervision:** The Chat and Quiz features are tightly coupled, sharing the same frontend interface (ChatPage) and backend orchestrator (SupervisorGraph).  
* **Modernized Upload Pipeline:** The document upload process uses a specialized LangGraph agent (run\_dua\_processing\_for\_document) that communicates directly with Vertex AI, bypassing the legacy DocAIService.  
* **Dual-Mode TTS:** The audio system implements a smart fallback, prioritizing pre-generated GCS assets before falling back to on-demand synthesis.

---

## **2\. Feature: Chat & Quiz System**

### **Frontend Flow**

**Entry Point:** src/pages/ChatPage.tsx

Code snippet

graph TD  
    Page\[ChatPage\] \--\> UI\[GeminiChatInterface\]  
    UI \--\> Audio\[useRealtimeStt / MicrophoneButton\]  
    UI \--\> Player\[useTTSPlayer\]  
    UI \--\> API\[apiService.chat / uploadAudioMessage\]  
      
    Audio \--\>|WebSocket| WSS\[wss://api/stt/stream\]  
    API \--\>|POST| Endpoint\[/api/v2/agent/chat\]

### **Backend Flow**

**Entry Point:** backend/app.py (agent\_chat\_route)

Code snippet

graph TD  
    Endpoint\[/api/v2/agent/chat\] \--\> Auth\[@require\_auth\]  
    Auth \--\> Supervisor\[Supervisor Graph\]  
      
    Supervisor \--\>|Intent: Chat| ChatGraph\[New Chat Graph\]  
    Supervisor \--\>|Intent: Start Quiz| QuizGraph\[Quiz Engine Graph\]  
      
    ChatGraph \--\> Retr\[DocumentRetrievalService\]  
    ChatGraph \--\> Gemini\[ChatGoogleGenerativeAI\]  
      
    QuizGraph \--\> Gemini  
    QuizGraph \--\> State\[QuizEngineState\]  
      
    Supervisor \--\> TTS\[TTSService\]  
    TTS \--\> Output\[Audio Response\]

---

## **3\. Feature: Document Upload & Processing**

### **Frontend Flow**

**Entry Point:** src/pages/DocumentUpload.tsx

Code snippet

graph TD  
    Page\[DocumentUpload\] \--\> Validation\[File Type/Size Check\]  
    Page \--\>|Direct Axios Call| Endpoint\[/api/documents/upload\]  
      
    note\[Note: Tech Debt \- Bypasses apiService\]  
    Page \-.-\> note

### **Backend Flow**

**Entry Point:** backend/routes/document\_routes.py

Code snippet

graph TD  
    Endpoint\[/api/documents/upload\] \--\> Auth\[@auth\_required\]  
    Auth \--\> GCS\[StorageService\]  
    GCS \--\>|File URI| DUA\[Document Understanding Agent\]  
      
    subgraph "DUA Graph (Legacy Pattern)"  
        DUA \--\> Vertex\[Vertex AI GenerativeModel\]  
        Vertex \--\> Narrative\[TTS-Ready Narrative\]  
    end  
      
    Narrative \--\> Firestore\[FirestoreService\]  
    Narrative \--\> TTS\[TTSService\]  
    TTS \--\>|Pre-generate| Assets\[Audio & Timepoints\]  
    Assets \--\> GCS

---

## **4\. Feature: Answer Formulation**

### **Frontend Flow**

**Entry Point:** src/pages/AnswerFormulationPage.tsx

Code snippet

graph TD  
    Page\[AnswerFormulationPage\] \--\> Hook\[useAnswerFormulation\]  
    Hook \--\> STT\[useRealtimeStt\]  
    Hook \--\> API\[apiService\]  
      
    API \--\>|Refine| EpRefine\[/api/v2/answer-formulation/refine\]  
    API \--\>|Edit| EpEdit\[/api/v2/answer-formulation/edit\]

### **Backend Flow**

**Entry Point:** backend/routes/answer\_formulation\_routes.py

Code snippet

graph TD  
    Endpoint\[Route Handler\] \--\> Graph\[Answer Formulation Graph\]  
      
    Graph \--\> Node1\[Validate Input\]  
    Graph \--\> Node2\[Refine Answer\]  
    Graph \--\> Node3\[Apply Edit\]  
      
    Node2 & Node3 \--\> Gemini\[ChatGoogleGenerativeAI\]  
    Graph \--\> TTS\[TTSService\]  
    TTS \--\> Response\[Audio Output\]

---

## **5\. Feature: Audio Output (TTS)**

### **Frontend Strategy (useTTSPlayer)**

The frontend uses a unified hook with an intelligent fallback strategy.

1. **Primary Path:** Check for pre-generated assets.  
   * Call apiService.getTtsAssets(docId) $\\rightarrow$ Get Signed GCS URLs.  
   * Stream audio directly from Google Cloud Storage (Low Latency, Low Cost).  
2. **Fallback Path:** If assets are missing or request is dynamic (Chat).  
   * Call apiService.synthesizeText(text) $\\rightarrow$ Backend TTSService.  
   * Generate MP3 via Google Cloud TTS API (Higher Latency).

### **Backend Service (TTSService)**

* **Inputs:** Text, Voice Settings (from AuthContext/Firestore).  
* **Processing:**  
  * Sanitizes text.  
  * Chunks long text to respect API limits.  
  * Requests audio \+ timepoints from Google Cloud.  
* **Outputs:** Base64 encoded MP3 \+ JSON Timepoints.

---

## **6\. Data Persistence Layer**

### **Firestore Database**

* **Users:** Stores profiles and preferences (Synced via AuthContext).  
* **Documents:** Stores metadata (gcs\_uri, processing\_status) and content (dua\_narrative\_content).  
  * *Note: Progress/Gamification fields exist in the schema but are currently unused stubs.*

### **Google Cloud Storage**

* **Uploads:** Stores original user files (PDF, Images).  
* **Assets:** Stores pre-generated TTS audio files (.mp3) and timepoint maps (.json).

### **LangGraph Checkpoints (SQLite)**

* **Files:** supervisor\_checkpoints.db, quiz\_checkpoints.db, answer\_formulation\_sessions.db.  
* **Role:** Persists active conversation threads and quiz sessions across server restarts (though currently stored in ephemeral container storage \- **P0 Fix Required**).

---

## **7\. Cross-Cutting Dependencies**

### **Authentication (AuthContext \+ AuthService)**

* **Frontend:** Wraps the entire app. Handles Firebase login and syncs user preferences (font size, high contrast) to Firestore.  
* **Backend:** Validates the Firebase ID Token (Bearer ...) on every protected route request.

### **Accessibility (AccessibilityContext)**

* **Frontend:** Consumes preferences from AuthContext. Controls the global UI theme (High Contrast) and manages the browser's speechSynthesis API for UI element hover effects.