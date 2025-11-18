# Frontend Deep Dive Analysis
**Consolidated Report**

---
--- START OF FILE: analysis_frontend_main.md ---
# **Analysis: Frontend Main Architecture & State**

Document Version: 2.0 (Converged)  
Status: Final Audit

## **1\. Overview**

This document provides a complete analysis of the Frontend's initialization, routing structure, and global state management. It synthesizes the architectural review of the entry points (main.tsx, App.tsx) with a critical audit of the Context API layer (src/contexts/\*).

The application uses a **Provider Stack** architecture to manage global state, wrapping the router in a specific sequence of context providers (Auth $\\rightarrow$ Accessibility $\\rightarrow$ Document/Quiz). A dedicated **User Interaction Gateway** ensures compliance with browser audio policies, critical for the app's text-to-speech (TTS) accessibility features.

## **2\. Consolidated Recommendations (Action Plan)**

This audit identified specific operational risks regarding data persistence and potential confusion regarding state coupling.

1. **Fix Data Persistence (P1 Priority):**  
   * **Issue:** Neither DocumentContext nor QuizContext persists data to localStorage.  
   * **Risk:** If a user refreshes the browser while taking a quiz or reading a document, **all progress is lost**. The active document ID and quiz thread ID are reset to null.  
   * **Action:** Implement useEffect hooks in both providers to sync their state (activeDocumentId, quizThreadId) to localStorage (or sessionStorage) and rehydrate on mount.  
2. **Maintain Document Decoupling (Architecture):**  
   * **Finding:** The DocumentContext is architecturally sound. It is minimal and holds *only* the activeDocumentId. It is **not** coupled to PDF-specific state (like zoom or page numbers), contradicting earlier assumptions.  
   * **Action:** Preserve this design. Do not add PDF-specific state to this global context. This allows the app to seamlessly support the new text-based "Document Understanding Agent" narratives side-by-side with the PDF viewer without refactoring the global state.  
3. **Secure Developer Routes (Low Priority):**  
   * **Issue:** The /dev/deprecation-showcase route is unprotected by authentication.  
   * **Action:** Ensure this page never includes sensitive administrative tools or production data, as it is accessible to any user with network access to the development server.

---

## **3\. Detailed File Analysis**

### **Entry Points & Configuration**

#### **src/main.tsx**

* **Role:** The application entry point.  
* **Key Behaviors:** Mounts the React tree into the DOM and imports index.css to apply global Tailwind layers. Wraps the app in React.StrictMode for development checks.

#### **src/index.css**

* **Role:** Global styling and accessibility foundation.  
* **Key Features:**  
  * **Typography:** Defines the OpenDyslexic font face.  
  * **High Contrast:** Defines CSS variables (e.g., \--bg-primary) that respond to the .high-contrast class.  
  * **Focus Management:** Enforces high-visibility focus rings for keyboard navigation compliance.

#### **src/App.tsx**

* **Role:** The central hub for Routing, Providers, and Global Guards.  
* **Key Components:**  
  * **UserInteractionGateway**: A modal overlay that blocks the UI until the user interacts. This initializes the AudioContext to bypass browser autoplay blocks, ensuring TTS works reliably.  
  * **Provider Stack:** Establishes the strict hierarchy: AuthProvider $\\rightarrow$ AccessibilityProvider $\\rightarrow$ (DocumentProvider, QuizProvider).  
  * **Router:**  
    * **Public:** /, /auth/\*  
    * **Protected:** /dashboard/\* (Wrapped in ProtectedRoute)  
    * **Dev:** /dev/deprecation-showcase (Conditionally compiled)

### **Layouts**

#### **src/layouts/DashboardLayout.tsx**

* **Role:** The persistent UI shell for authenticated users.  
* **Key Behaviors:**  
  * **Navigation:** Renders the responsive sidebar/drawer with links to all features.  
  * **Context Integration:** Consumes useAccessibility to toggle high-contrast mode on the \<html\> root.  
  * **Interaction Interception:** Intercepts navigation events (e.g., clicking "Chat") if a quiz is active, prompting the user to cancel the session first to prevent state conflicts.

### **Global State (Contexts)**

#### **AuthContext**

* **Purpose:** Wraps the Firebase Web SDK to provide currentUser and loading state.  
* **Persistence:** Managed automatically by Firebase (IndexedDB/LocalStorage).

#### **AccessibilityContext**

* **Purpose:** Manages UI preferences (High Contrast, TTS enabled) and provides the speakText() function via window.speechSynthesis.  
* **Persistence:** Preferences are persisted to localStorage.  
* **Audio Safety:** Relies on App.tsx's UserInteractionGateway to have unlocked the audio engine before this context initializes.

#### **DocumentContext**

* **Purpose:** Tracks the currently selected document.  
* **State:** Minimal. Contains only activeDocumentId (string) and its setter.  
* **Status:** **Ephemeral.** Data is lost on refresh.  
* **Coupling:** **Low.** It is agnostic to the document type (PDF vs. Text), making it future-proof for the DUA integration.

#### **QuizContext**

* **Purpose:** Tracks the active quiz session.  
* **State:** Contains quizThreadId (string) and isCancelling (boolean).  
* **Status:** **Ephemeral.** Data is lost on refresh.  
* **API Integration:** Includes a helper cancelQuizSession that calls the backend to formally close the thread.

---

## **4\. Architecture Patterns**

* **Layered Provider Stack:** Contexts are explicitly ordered in App.tsx to prevent runtime errors (e.g., QuizContext can safely depend on AuthContext).  
* **Audio Gating:** The application uses a "Gateway" pattern to force user interaction before loading, ensuring 100% reliability for audio APIs on restrictive browsers (like Safari).  
* **Accessibility-First:** High contrast and dyslexia support are not add-ons; they are baked into the root CSS and Layout architecture.

---
--- START OF FILE: analysis_frontend_pages.md ---
# **Analysis: Frontend Pages**

Document Version: 2.0 (Converged)  
Status: Final Audit

## 

## **1\. Overview**

This document provides a complete analysis of the frontend's page components (src/pages). These components serve as the primary views for the application, orchestrating the user interface by connecting **Contexts** (Auth, Accessibility) with **Services** (API, TTS) and **Custom Hooks**.

The audit reveals a functional but inconsistent architecture. While core flows like Chat and Answer Formulation are robust and well-patterned, other areas like the Dashboard and Document Upload contain placeholder data and technical debt that require immediate remediation.

## **2\. Consolidated Recommendations (Action Plan)**

### **1\. Implement Progress Backend (P2 Priority \- Integrity)**

* **Issue:** The Dashboard.tsx page displays hardcoded placeholder data for user progress (e.g., "120 minutes studied"). The actual API call to /api/progress is commented out.  
* **Risk:** The application presents false data to the user, which degrades trust.  
* **Action:** Implement the backend /api/progress endpoint (or a suitable Firestore aggregation) and uncomment the fetch logic in Dashboard.tsx to display real metrics.

### **2\. Refactor Document Upload (P2 Priority \- Tech Debt)**

* **Issue:** The DocumentUpload.tsx page manually imports axios and re-implements the Authorization header injection logic, bypassing the shared apiService interceptors.  
* **Risk:** This violates DRY (Don't Repeat Yourself) principles. If the authentication logic changes (e.g., token refresh handling), this page will break or become insecure.  
* **Action:** Refactor DocumentUpload.tsx to use apiService.uploadDocument.

### **3\. Standardize Page Architecture (P3 Priority \- Maintainability)**

* **Observation:** The ChatPage represents the "Gold Standard" for page architecture in this codebase. It cleanly delegates logic to hooks (useChatTTSPlayer) and components (GeminiChatInterface), while handling layout and context connection.  
* **Action:** Adopt the ChatPage pattern for future pages: keep the page component thin and move logic into custom hooks.

---

## **3\. Detailed Page Analysis**

### **Dashboard.tsx**

* **Purpose:** The personalized landing hub for authenticated users.  
* **Features:**  
  * **Quick Actions:** Navigation cards for Upload, Study, Chat, etc.  
  * **Recent Documents:** Fetches real document data via axios (though it should use apiService).  
  * **Progress Summary:** **\[Incomplete\]** Renders a static "Streak" and "Study Time" based on placeholder variables.  
* **Dependencies:** useAuth, useAccessibility.

### **ChatPage.tsx**

* **Purpose:** The primary interactive interface for the "AI Tutor."  
* **Architecture:** Acts as a smart container for the GeminiChatInterface.  
* **Integrations:**  
  * **LangGraph:** Connects to the backend Agent for chat and quizzes.  
  * **TTS:** Uses useChatTTSPlayer (or the new useTTSPlayer) to read responses aloud.  
  * **Context:** Reads documentId from the URL to ground the conversation in a specific text.

### **DocumentView.tsx**

* **Purpose:** A complex, tabbed interface for consuming content.  
* **Capabilities:**  
  * **Rendering:** Displays document text or PDF content.  
  * **Audio:** Integrates with the TTS hooks to provide read-aloud functionality with word-level highlighting.  
  * **Modes:** Switches between "Read," "Chat," and "Quiz" tabs, effectively serving as a sub-router.

### **DocumentUpload.tsx**

* **Purpose:** A wizard for uploading new files.  
* **Features:** Drag-and-drop zone, file type validation, and progress bars.  
* **Technical Debt:** Uses a direct axios.post call instead of the centralized apiService.

### **AnswerFormulationPage.tsx**

* **Purpose:** A specialized workflow tool for students to practice speaking and writing.  
* **Architecture:** Heavily reliant on the useAnswerFormulation hook, which manages the complex state machine (Recording $\\rightarrow$ Refining $\\rightarrow$ Editing).

### **pages/dev/DeprecationShowcase.tsx**

* **Purpose:** A developer-only route (guarded by import.meta.env.DEV).  
* **Usage:** Used to visually test components that are slated for removal or refactoring, ensuring they don't break the production build while being phased out.

---

## **4\. Page Architecture Patterns**

* **Accessibility-First:** All pages heavily utilize useAccessibility to provide "Speak on Hover" functionality for titles and buttons, enforcing the app's auditory-first design philosophy.  
* **Context Consumption:** Pages consistently rely on useAuth for user data and DashboardLayout for navigation, ensuring a unified experience.  
* **Secure Data Fetching:** Despite some inconsistency in *how* the request is made (direct axios vs. service), all data fetching correctly relies on Firebase ID tokens for security.

---
--- START OF FILE: analysis_frontend_components.md ---
[# **Analysis: Frontend Components**

Document Version: 2.0 (Converged)  
Status: Final Audit

## 

## **1\. Overview**

This document provides a complete analysis of the frontend's reusable UI components (src/components). These components form the building blocks of the application, encapsulating specific functionality while enforcing the application's strict accessibility standards (WCAG compliance, screen reader support, and "Auditory-First" design).

The audit confirms a high degree of modularity and sophistication. Components like SpeakableText contain internal logic to optimize API usage, while complex features like Answer Formulation are broken down into manageable sub-components.

## **2\. Consolidated Recommendations (Action Plan)**

### **1\. Standardize TTS Hook Usage (P2 Priority \- Tech Debt)**

* **Issue:** The GeminiChatInterface currently depends on multiple legacy TTS hooks (useChatTTSPlayer, useOnDemandTTSPlayer).  
* **Recommendation:** Refactor GeminiChatInterface to use the unified useTTSPlayer hook. This simplifies the component's dependency list and ensures consistent fallback behavior between pre-generated and dynamic audio.

### **2\. Enhance AudioReview Consistency (P3 Priority \- Data Integrity)**

* **Issue:** The AudioReview component allows users to edit the transcript text via a \<textarea\>. However, this edit *only* changes the text payload sent to the backend; it does not (and cannot) modify the recorded audio blob.  
* **Risk:** This creates a "Mismatch Risk" where the stored audio does not match the finalized text.  
* **Action:** Add a UI flag or metadata field (e.g., is\_transcript\_edited: true) when submitting the data so the backend knows the audio and text have diverged.

### **3\. Extract Manual Edit Logic (P3 Priority \- Maintainability)**

* **Issue:** The ManualEditMode component (within Answer Formulation) manages complex internal state for Undo/Redo history and cursor position tracking.  
* **Action:** Extract this logic into a custom hook (e.g., useTextHistory) to keep the UI component thin and readable.

---

## **3\. Detailed Component Analysis**

### **Core Components**

#### **GeminiChatInterface.tsx**

* **Purpose:** The central conversational UI.  
* **Features:**  
  * **Markdown Rendering:** Renders rich text responses.  
  * **Quiz Integration:** Detects isQuizQuestion flags to render interactive options inline.  
  * **Audio Controls:** Manages per-message playback state and word-level highlighting.

#### **MicrophoneButton.tsx**

* **Purpose:** A smart recording widget used across the app.  
* **State Machine:** Manages the transition from idle $\\rightarrow$ requesting\_permission $\\rightarrow$ recording $\\rightarrow$ processing.  
* **Integration:** Wraps useAudioRecorder and handles the API upload logic (via fetch).

#### **AudioReview.tsx**

* **Purpose:** A modal for reviewing/editing input before sending.  
* **Capabilities:**  
  * **Playback:** Waveform visualization and play/pause controls.  
  * **Editing:** Confirmed ability to edit the STT transcript before submission.  
  * **Actions:** Re-record or Send.

#### **SpeakableText.tsx**

* **Purpose:** A "smart" wrapper for text that should be read aloud on hover.  
* **Logic:** Implements **Context Awareness**. It checks isDocumentContent and cloudTtsEnabled to decide whether to use the expensive Cloud TTS or the free Browser TTS. This optimization saves API costs for simple UI labels.

#### **SpeakableDocumentContent.tsx**

* **Purpose:** Renders the main document text.  
* **Synchronization:** Maps the activeTimepoint from the TTS player to specific DOM elements to apply highlighting styles, enabling the "Follow Along" reading experience.

### **Answer Formulation Components**

Located in src/components/answer-formulation/.

* **DictationPanel**: Handles the recording phase, including auto-pause timers.  
* **RefinementPanel**: Displays the AI's improved version of the text.  
* **VoiceEditMode**: A lightweight UI for issuing voice commands (e.g., "Make it shorter").  
* **ManualEditMode**: A rich-text editor for manual tweaks, containing its own Undo/Redo stack.

---

## **4\. Component Architecture Patterns**

* **Accessibility-First:** Components consistently expose aria-labels and integrate with AccessibilityContext to support high contrast and TTS interactions.  
* **Smart Wrappers:** Components like SpeakableText abstract away the complexity of choosing an audio engine, allowing parent components to simply wrap text and get auditory behavior for free.  
* **State Encapsulation:** Complex behaviors (like recording states) are encapsulated within components (MicrophoneButton) rather than leaking into the parent pages.

---
--- START OF FILE: analysis_frontend_hooks.md ---
# **Analysis: Frontend Custom Hooks**

Document Version: 2.0 (Converged)  
Status: Final Audit

## **1\. Overview**

This document provides a complete analysis of the frontend's custom hooks (src/hooks). These hooks encapsulate the application's most complex business logic, specifically regarding **Audio I/O** (recording, streaming, synthesis) and the **Answer Formulation** state machine.

The audit reveals a sophisticated but slightly fragmented architecture. While individual hooks like useAnswerFormulation effectively manage complex workflows, there is significant technical debt in the Text-to-Speech (TTS) layer, where a new, unified hook (useTTSPlayer) exists alongside older, redundant hooks that should be deprecated.

## **2\. Consolidated Recommendations (Action Plan)**

### **1\. Unify Text-to-Speech Logic (P2 Priority \- Tech Debt)**

* **Issue:** The codebase contains three different TTS hooks:  
  1. useChatTTSPlayer (Legacy): Handles only pre-generated chat audio.  
  2. useOnDemandTTSPlayer (Legacy): Handles only dynamic synthesis.  
  3. **useTTSPlayer (Modern):** Implements a robust "Dual-Mode" strategy that attempts to load optimized, pre-generated assets first and falls back to on-demand synthesis if they are missing.  
* **Action:** Mark useChatTTSPlayer and useOnDemandTTSPlayer as **deprecated**. Refactor all components (Chat Interface, Document View) to use the unified useTTSPlayer hook to ensure consistent behavior and fallback reliability.

### **2\. Enforce Singleton Pattern for STT (P2 Priority \- Stability)**

* **Issue:** useRealtimeStt creates a new WebSocket connection *every time* it is mounted.  
* **Risk:** If multiple components (e.g., a global mic button and a specific input field) use this hook simultaneously, they will open multiple sockets to the backend. This creates race conditions for the microphone stream and risks hitting backend concurrency limits.  
* **Action:** Wrap this hook in a **React Context** (SttProvider) so that a single WebSocket connection is shared across the application.

### **3\. Harden WebSocket Connection Logic (P2 Priority \- Robustness)**

* **Issue:** The useRealtimeStt hook uses a fragile regex replacement (replace(/^http/, 'ws')) to determine the WebSocket URL.  
* **Action:** Use a dedicated environment variable (e.g., VITE\_WS\_URL) or a robust URL constructor utility to ensure correct protocol handling (ws:// vs wss://) across different environments (local, staging, prod).

---

## **3\. Detailed Hook Analysis**

### **useTTSPlayer.ts (The "Super-Hook")**

* **Purpose:** The definitive player for application audio.  
* **Logic:** Implements an intelligent **Fallback Strategy**:  
  1. **Pre-generated:** Checks if documentId is present. If so, requests signed URLs for pre-rendered audio (cheaper, faster, better quality).  
  2. **On-Demand:** If no document exists or assets are missing, it falls back to apiService.synthesizeText to generate audio on the fly.  
* **State:** Manages playback status (idle, loading, playing), word-level timepoints, and synchronization.

### **useRealtimeStt.ts**

* **Purpose:** Manages the bidirectional Speech-to-Text stream.  
* **Dependencies:** Wraps useAudioRecorder to capture raw microphone data.  
* **State:** Tracks transcript (split into final and interim results) and status (idle, dictating, review).  
* **Lifecycle:** Automatically transitions to review mode when the socket closes, allowing the user to edit the text before finalizing.

### **useAnswerFormulation.ts**

* **Purpose:** The state machine for the "AI Tutor" feature that helps students refine their thoughts.  
* **State Machine:** Manages a complex lifecycle: idle $\\rightarrow$ recording (User speaks) $\\rightarrow$ refining (AI improves text) $\\rightarrow$ editing (User tweaks) $\\rightarrow$ finalized.  
* **API Integration:** Orchestrates calls to apiService.refineAnswer and apiService.editAnswer.  
* **Features:** Includes "Auto-pause" detection logic to automatically stop recording when the user stops speaking.

### **useAudioRecorder.ts**

* **Purpose:** Low-level wrapper around the browser's MediaRecorder API.  
* **Responsibilities:**  
  * Requests microphone permissions.  
  * Configures audio format (WebM/Opus, 16kHz) for optimal STT performance.  
  * Provides an onChunk callback used by the STT hook to stream data.  
* **Cleanup:** correctly implements stop() and track cleanup to prevent hardware resource leaks.

---

## **4\. Architecture Patterns**

* **Composition:** Hooks are layered effectively. useAnswerFormulation consumes useRealtimeStt, which consumes useAudioRecorder. This separation of concerns makes the audio stack testable and modular.  
* **Resource Management:** The hooks consistently use useEffect cleanup functions to stop media tracks, close WebSockets, and revoke Blob URLs, which is critical for a single-page application (SPA) dealing with heavy media.  
* **State Machines:** Complex features (like Answer Formulation and STT) rely on explicit status enums (dictating, connecting, review) rather than boolean flags, preventing invalid state transitions.

---
--- START OF FILE: analysis_frontend_contexts.md ---
# **Analysis: Frontend Context Layer**

Document Version: 2.0 (Converged)  
Status: Final Audit

## **1\. Overview**

This document provides a complete analysis of the frontend's global state management, implemented via the **React Context API**. The architecture uses a layered approach where specific domains (Auth, Accessibility, Documents, Quiz) are isolated in their own providers.

The system establishes a strict dependency hierarchy: AuthContext acts as the root source of truth for user data, while downstream contexts like AccessibilityContext consume that data to drive UI behavior. While the architecture is generally sound, the audit identified critical risks regarding **data persistence** (loss of state on refresh) and **redundant audio gating logic** that requires refactoring.

## **2\. Consolidated Recommendations (Action Plan)**

### **1\. Implement Persistence (P1 Priority \- Critical UX)**

* **Issue:** Neither DocumentContext nor QuizContext persists their state to storage.  
* **Impact:** If a user refreshes the page while taking a quiz or reading a document, the application "forgets" their active session (activeDocumentId and quizThreadId revert to null). The user is kicked back to the dashboard root.  
* **Action:** Implement useEffect hooks in both providers to sync their state variables to localStorage (or sessionStorage) and rehydrate them upon initialization.

### **2\. Refactor Audio Gating (P2 Priority \- Tech Debt)**

* **Issue:** The application has two competing mechanisms for unlocking browser audio:  
  1. The UserInteractionGateway in App.tsx (Global).  
  2. Redundant event listeners (click, keydown) inside AccessibilityContext.tsx that attempt to "prime" the speech synthesis engine.  
* **Risk:** This duplication creates a race condition and unnecessary complexity. The Context should not be managing DOM event listeners for global interaction.  
* **Action:** Remove the internal event listeners from AccessibilityContext. Rely exclusively on the UserInteractionGateway in App.tsx to handle the "first click" requirement.

### **3\. Maintain Document Decoupling (Architecture)**

* **Finding:** The DocumentContext is architecturally robust because it is **minimal**. It stores only the activeDocumentId and is agnostic to the content type (PDF vs. Text).  
* **Recommendation:** Do **not** add PDF-specific state (like zoom level or page numbers) to this global context. Keeping it generic ensures the application can seamlessly support the new text-based "Document Understanding Agent" narratives without refactoring the global state.

---

## **3\. Detailed Context Analysis**

### **AuthContext.tsx**

* **Purpose:** The root provider for user identity and configuration.  
* **Responsibilities:**  
  * Wraps the Firebase Authentication SDK (currentUser, loading).  
  * Manages the **Source of Truth** for user preferences (DEFAULT\_USER\_PREFERENCES), syncing them to the user's Firestore document (users/{uid}).  
  * Provides the getAuthToken helper used by API services.  
* **Status:** **Healthy.** Correctly implements the "Smart Data, Dumb Components" pattern by handling the database sync internally.

### **AccessibilityContext.tsx**

* **Purpose:** Controls the UI's visual and auditory presentation.  
* **Responsibilities:**  
  * Consumes userPreferences from AuthContext to apply settings (High Contrast, Font Size).  
  * Manages the Text-to-Speech (TTS) engine (window.speechSynthesis and Cloud TTS).  
  * **Issue:** Contains "defensive" logic that attempts to initialize speech on document clicks, creating the redundancy noted in the recommendations.  
* **Status:** **Needs Refactoring (Audio Logic).**

### **DocumentContext.tsx**

* **Purpose:** Tracks which document the user is currently viewing.  
* **State:** Extremely minimal. Contains only activeDocumentId (string | null) and its setter.  
* **Coupling:** **Low.** It is decoupled from any specific viewer implementation, making it flexible for future features.  
* **Status:** **At Risk (Persistence).** Needs localStorage sync to prevent state loss on refresh.

### **QuizContext.tsx**

* **Purpose:** Manages the lifecycle of an interactive quiz session.  
* **State:** Tracks quizThreadId (the backend LangGraph thread) and isCancelling.  
* **API Integration:** Includes a helper cancelQuizSession that wraps the API call to formally end a session on the backend.  
* **Status:** **At Risk (Persistence).** Needs localStorage sync to prevent the user from losing their quiz progress on refresh.

---

## **4\. Architecture Patterns**

* **Unidirectional Data Flow:** The system correctly implements a flow where AuthContext holds the data schema, and downstream contexts (like Accessibility) consume it to drive behavior.  
* **Provider Hierarchy:** The specific ordering in App.tsx (Auth $\\rightarrow$ Accessibility $\\rightarrow$ Document/Quiz) is critical and must be maintained to ensure dependencies are resolved correctly.  
* **Separation of Concerns:** Each context has a clear, single responsibility (Identity, UI/UX, Content Selection, Session State).

---
--- START OF FILE: analysis_frontend_services.md ---
[# **Analysis: Frontend Services Layer**

Document Version: 2.0 (Converged)  
Status: Final Audit

## **1\. Overview**

This document provides a complete analysis of the frontend's service layer, centralized primarily in src/services/api.ts. This module acts as the gateway for all communication with the backend, handling authentication, HTTP request configuration, and API method definitions.

The current implementation contains a mix of architectural patterns. While it establishes a good foundation with a shared **Axios instance** and **Authentication Interceptors**, it suffers from inconsistent implementation details (mixing fetch and axios) and brittle coupling (hardcoded query strings) that require remediation.

## **2\. Consolidated Recommendations (Action Plan)**

This audit identified specific tech debt and architectural risks that should be addressed to improve stability and maintainability.

1. **Harden Quiz Trigger (P1 Priority):**  
   * **Issue:** The startQuiz method triggers the backend agent by sending a hardcoded natural language string: "Start a quiz for document ${documentId}".  
   * **Risk:** This is extremely brittle. If the backend agent's system prompt is updated or if the LLM interprets the intent differently, the "Start Quiz" button will fail silently or produce unexpected results.  
   * **Action:** Deprecate the magic string. Update the backend /api/v2/agent/chat endpoint to accept a structured command or action field (e.g., { action: "START\_QUIZ", documentId: "..." }) that the Supervisor graph can route deterministically.  
2. **Standardize HTTP Client (P2 Priority):**  
   * **Issue:** The uploadAudioMessage function uses the native fetch API instead of the shared axios instance.  
   * **Impact:** This forces the method to manually re-implement logic for getting the auth token and setting headers, violating DRY (Don't Repeat Yourself) principles and bypassing global interceptors.  
   * **Action:** Refactor uploadAudioMessage to use the api (Axios) instance. Axios fully supports FormData and multipart uploads, so there is no technical reason to use fetch here.  
3. **Implement Centralized Error Handling (P2 Priority):**  
   * **Issue:** The codebase lacks a centralized error handler. Most methods catch errors only to log them to the console and then return partial objects or re-throw raw errors.  
   * **Action:** Implement a global Axios response interceptor that transforms common HTTP errors (401 Unauthorized, 403 Forbidden, 500 Server Error) into standardized AppError objects or triggers global UI notifications (like Toasts) automatically.

---

## **3\. Service Architecture**

### **Core Infrastructure**

* **HTTP Client:** Uses axios with a base URL derived from VITE\_BACKEND\_API\_URL.  
* **Authentication:** Uses an **Axios Request Interceptor** to automatically inject the Firebase ID token into the Authorization: Bearer header for every request.  
* **Auth Dependency:** deeply coupled to ../firebase/config. It accesses auth.currentUser directly to retrieve tokens.

### **Implementation Patterns**

* **Type Safety:** Strong TypeScript interfaces are defined for complex features like Answer Formulation (RefineAnswerRequest, RefineAnswerResponse), ensuring contract safety.  
* **Response Mapping:** The service layer handles data normalization, mapping backend snake\_case fields (e.g., final\_agent\_response) to frontend camelCase expectations (e.g., agent\_response) before the data reaches UI components.

---

## **4\. Detailed Method Inventory**

### **Chat & Agent Services**

* **chat(payload)**: The primary interface for the LangGraph agent. It handles text queries, thread IDs, and document context. It maps the complex backend response (including timepoints, audio, quiz\_status) to a frontend-friendly structure.  
* **uploadAudioMessage(formData)**: Handles voice inputs. Supports two modes: review (returns transcript for editing) and direct\_send (processes immediately). **Note:** Uses fetch manually.  
* **startQuiz / continueQuiz / cancelQuiz**: Helpers that abstract the interactions with the Quiz Graph. startQuiz relies on the "magic string" discussed in Recommendations.

### **Document Management**

* **uploadDocument(file)**: Sends multipart form data to upload files.  
* **getDocument(id)**: Fetches document metadata. Uses include\_content=true to retrieve the full text/content for the viewer.  
* **getTtsAssets(id)**: Retrieves signed GCS URLs for pre-generated audio files, enabling the "Listen" feature for documents.

### **Answer Formulation**

* **refineAnswer / editAnswer**: Wrappers for the specialized Answer Formulation graph. They handle the "Refine" and "Edit" loops for student writing assistance.

### **Text-to-Speech (TTS)**

* **synthesizeText(text)**: Calls the backend's on-demand TTS endpoint. Used for dynamic content (like chat responses) that wasn't pre-generated.

### **User Profile**

* **getUserProfile / updateUserProfile**: CRUD operations for the user's preferences and display name, synced between Firebase Auth and Firestore.