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