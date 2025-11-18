# **API and Data Models Documentation**

Document Version: 2.0 (Converged)  
Status: Final Audit

## **1\. Overview**

This document provides the definitive reference for the LexiAid backend API and data structures. It synthesizes the TypeScript interface definitions from the initial Gemini report (verified for schema accuracy) with the operational realities found in the OpenAI audit.

**Key Findings:**

* **Versioning:** The API is partially versioned. Agentic features use /api/v2/, while resource-based routes (Documents, Users) use the root /api/ namespace. There are **no active v1 endpoints** in the running application.  
* **Schema Ownership:** The User data model (preferences, gamification) is currently defined by the **Frontend** (AuthContext) and pushed to Firestore. The backend service definitions for this are currently unused.  
* **Rate Limiting:** There is **no rate limiting** currently enforced by the application code.

---

## **2\. Consolidated Recommendations (Action Plan)**

### **1\. Implement Backend Schema Ownership (P0 Priority)**

* **Issue:** The frontend is currently responsible for creating the initial User document and defining its schema (preferences, gamification) directly in AuthContext. The backend's FirestoreService.create\_user method is unused.  
* **Risk:** This is insecure and leads to schema drift. A malicious user could inject arbitrary preference data.  
* **Action:** The new POST /api/users endpoint (recommended in the Services analysis) must take ownership of calling FirestoreService.create\_user to ensure the database is populated with a validated, server-authoritative schema.

### **2\. Standardize API Versioning (P3 Priority)**

* **Issue:** The API is split between /api/v2/ (for Chat/Answer Formulation) and /api/ (for Documents/Users).  
* **Action:** Adopt a consistent versioning strategy. Move all root-level resource routes to /api/v2/ (e.g., /api/v2/documents) to simplify routing and future upgrades.

---

## **3\. API Endpoints (Verified)**

### **Agent & Chat (/api/v2)**

| Endpoint | Method | Purpose | Request Data | Response Data |
| :---- | :---- | :---- | :---- | :---- |
| /api/v2/agent/chat | POST | **Text:** Sends a query to the Supervisor Agent. | { query, documentId?, thread\_id? } | { final\_agent\_response, audio\_content\_base64, timepoints, ... } |
| /api/v2/agent/chat | POST | **Audio:** Uploads voice for STT \+ Agent processing. | Multipart Form: { audio\_file, stt\_processing\_mode } | (Same as above, or { transcript } if mode is review) |
| /api/v2/answer-formulation/refine | POST | Invokes the "Refine" LangGraph agent. | { transcript, question?, session\_id? } | { refined\_answer, fidelity\_score, ... } |
| /api/v2/answer-formulation/edit | POST | Invokes the "Edit" branch of the agent. | { session\_id, edit\_command } | { refined\_answer, ... } |

### **Resources (/api)**

| Endpoint | Method | Purpose | Request Data | Response Data |
| :---- | :---- | :---- | :---- | :---- |
| /api/documents | GET | Lists user's documents. | Authorization: Bearer | { data: \[Document...\] } |
| /api/documents/upload | POST | Uploads a file \+ metadata. | Multipart Form: { file } | { id, status, dua\_processed, ... } |
| /api/documents/{id} | GET | Gets doc metadata (optional content). | ?include\_content=true | { id, content, dua\_narrative\_content, ... } |
| /api/documents/{id} | DELETE | Deletes doc \+ GCS assets. | Authorization: Bearer | 204 No Content |
| /api/documents/{id}/tts-assets | GET | Gets pre-generated audio URLs. | Authorization: Bearer | { audio\_url, timepoints\_url } |
| /api/users/profile | GET | Fetches profile data. | Authorization: Bearer | { data: UserProfile } |
| /api/stt/stream | WS | Real-time WebSocket STT. | Binary Audio Chunks | { transcript, is\_final } |

---

## **4\. Data Models (TypeScript Definitions)**

### **User (Managed by Frontend/AuthContext)**

TypeScript

interface UserProfile {  
  uid: string;  
  email: string;  
  displayName: string;  
  createdAt: string; // ISO Date  
  lastLogin: string; // ISO Date  
    
  // Accessibility & UI Settings  
  preferences: {  
    fontSize: number;  
    fontFamily: "OpenDyslexic" | "Inter" | string;  
    highContrast: boolean;  
    uiTtsEnabled: boolean;  
    cloudTtsEnabled: boolean; // Use Google Cloud vs. Browser TTS  
    ttsSpeed: number;  
    // ... other visual/audio settings  
  };

  // Stubbed Gamification Fields  
  gamification: {  
    points: number;  
    streak: number;  
    level: number;  
    badges: string\[\];  
  };  
}

### **Document (Managed by FirestoreService)**

TypeScript

interface Document {  
  id: string;  
  user\_id: string;  
  name: string;  
  original\_filename: string;  
  file\_type: "pdf" | "png" | "txt" | string;  
    
  // Processing Status  
  status: "uploading" | "processing\_dua" | "processed\_dua" | "dua\_failed";  
  processing\_error?: string;  
    
  // Storage References  
  gcs\_uri: string;              // Original File  
  tts\_audio\_gcs\_uri?: string;   // Pre-generated Audio  
  tts\_timepoints\_gcs\_uri?: string; // Pre-generated Timepoints  
    
  // Content (Often stored separately or fetched on demand)  
  dua\_narrative\_content?: string; // The "read-aloud" text  
  ocr\_text\_content?: string;      // Legacy fallback  
}

### **Chat Message (Frontend View)**

TypeScript

interface ChatMessage {  
  id: string;  
  text: string;  
  sender: 'user' | 'agent';  
    
  // Quiz Integration  
  isQuizQuestion?: boolean;  
  options?: string\[\]; // \["A", "B", "C"\]  
    
  // Audio Integration  
  audio\_content\_base64?: string; // Short responses only  
  timepoints?: { time\_seconds: number, mark\_name: string }\[\];  
}