# **Analysis: Frontend Services Layer**

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