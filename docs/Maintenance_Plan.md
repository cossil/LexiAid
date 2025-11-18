# Maintenance & Refactoring Plan
**Consolidated Report**

---
--- START OF FILE: deprecation_candidates.md ---
# **Analysis: Deprecation & Cleanup Candidates**

Document Version: 2.0 (Converged)  
Status: Final Audit

## **1\. Overview**

This document provides a definitive, validated list of files targeted for deletion to reduce technical debt. It synthesizes the findings from the frontend and backend audits, explicitly correcting dangerous false positives found in earlier automated scans.

Critical Correction:  
Previous automated analysis incorrectly identified DocumentView.tsx and Settings.tsx as unused. These files are active core components routed in App.tsx and linked in DashboardLayout.tsx. They have been moved to the "Protected" list below.

## 

## **2\. Consolidated Recommendations (Action Plan)**

### **1\. Backend Cleanup (P2 Priority)**

* **Target:** backend/services/doc\_ai\_service.py  
* **Action:** Delete the file.  
* **Required Step:** Update backend/app.py to remove the import and the initialize\_component call for DocAIService.  
* **Rationale:** Confirmed legacy code. The upload pipeline now uses run\_dua\_processing\_for\_document, which calls Vertex AI directly, bypassing this service.

### **2\. Frontend Dev Tools Cleanup (P3 Priority)**

* **Target:** src/pages/dev/DeprecationShowcase.tsx  
* **Action:** Delete the file and the route definition in App.tsx.  
* **Rationale:** This is a development-only view used to host deprecated components. Removing it allows us to safely delete the "dead" components it references.

### **3\. Orphaned Component Removal (P3 Priority)**

* **Targets:** src/components/Hero.tsx, CTA.tsx, FeatureCard.tsx, Features.tsx, Navbar.tsx, Footer.tsx, MessageWithTTS.tsx.  
* **Action:** Delete these files.  
* **Rationale:** These are legacy Landing Page components that are currently *only* referenced by the DeprecationShowcase. Once the showcase is removed, these become true dead code.

---

## **3\. Detailed File Status**

### **✅ Safe to Delete (Confirmed Dead Code)**

| File / Directory | Category | Justification |
| :---- | :---- | :---- |
| backend/services/doc\_ai\_service.py | Backend Service | Replaced by LangGraph Agent (document\_understanding\_agent). |
| src/pages/dev/DeprecationShowcase.tsx | Frontend Page | Dev-only utility for viewing deprecated UI. |
| src/components/Hero.tsx | Frontend Component | Unused legacy Landing Page asset. |
| src/components/CTA.tsx | Frontend Component | Unused legacy Landing Page asset. |
| src/components/FeatureCard.tsx | Frontend Component | Unused legacy Landing Page asset. |
| src/components/Features.tsx | Frontend Component | Unused legacy Landing Page asset. |
| src/components/Navbar.tsx | Frontend Component | Unused legacy Landing Page asset. |
| src/components/Footer.tsx | Frontend Component | Unused legacy Landing Page asset. |
| src/components/MessageWithTTS.tsx | Frontend Component | Superseded by SpeakableText / GeminiChatInterface. |
| .env.example.old | Config | Outdated documentation. |

### **❌ Protected (False Positives \- DO NOT DELETE)**

| File | Status | Evidence of Usage |
| :---- | :---- | :---- |
| src/pages/DocumentView.tsx | **ACTIVE** | Routed at /dashboard/documents/:id in App.tsx. Core reading interface. |
| src/pages/Settings.tsx | **ACTIVE** | Routed at /dashboard/settings in App.tsx. Linked in DashboardLayout.tsx. |
| backend/services/progress\_service.py | **N/A** | Does not exist (Hallucination in previous reports). |

---

## **4\. Verification Steps**

Before executing deletions, run the following checks:

1. **Grep Check:** Run grep \-r "DocAIService" . to ensure the only remaining reference is in app.py (which you will remove).  
2. **Build Check:** After deleting the Frontend components, run npm run build. If the build fails, it means a file was still referenced (likely in App.tsx imports).  
3. **Route Check:** Verify App.tsx no longer imports DeprecationShowcase inside the import.meta.env.DEV block.

---
--- START OF FILE: refactoring_plan.md ---
# **Final Refactoring Plan: Codebase Cleanup and Standardization**

Project: LexiAid Frontend & Backend  
Status: Critical cleanup targets verified.  
Goal: Safely remove confirmed dead code and enforce architectural standardization (moving from direct axios calls and duplicate logic to centralized apiService and shared utilities).

## **1\. Safety & Strategy (P0)**

### **Critical Decision: Do Not Delete Active Code**

The initial analysis contained critical false positives. The files listed below are **active core components** and **must not be deleted** under any circumstances.

| File | Status | Rationale |
| :---- | :---- | :---- |
| src/pages/DocumentView.tsx | **KEEP** | Primary document reading interface; routed at /dashboard/documents/:id. |
| src/pages/Settings.tsx | **KEEP** | Active application settings page. |
| backend/services/progress\_service.py | **N/A** | Confirmed to be a hallucination/non-existent file. |

### **Methodology**

The plan below focuses on **removing only code that is proven dead** (doc\_ai\_service.py, DeprecationShowcase) and enforcing standardization for maintainability.

---

## **2\. Phase 1: Backend Cleanup (Confirmed Dead Code)**

This phase removes the last piece of legacy backend logic identified during the full audit.

### **Target: backend/services/doc\_ai\_service.py**

| Action | Detail |
| :---- | :---- |
| **DELETE** | backend/services/doc\_ai\_service.py (The service file). |
| **UPDATE 1 (API)** | **Remove Initialization:** In backend/app.py, remove the import and the initialize\_component call for DocAIService. |
| **UPDATE 2 (Cleanup)** | Remove the corresponding service reference from backend/services/\_\_init\_\_.py. |
| **Rationale** | This service is entirely bypassed by the modern Document Understanding Agent (DUA) graph, which calls Vertex AI directly. It is confirmed legacy code. |

---

## **3\. Phase 2: Frontend Cleanup (Dev & Orphaned Components)**

This phase removes the DeprecationShowcase and the legacy assets that were only referenced by it.

### **Target 1: src/pages/dev/DeprecationShowcase.tsx**

| Action | Detail |
| :---- | :---- |
| **DELETE** | src/pages/dev/DeprecationShowcase.tsx. |
| **UPDATE** | In src/App.tsx, remove the conditional import statement and the entire \<Route path="/dev/deprecation-showcase" .../\> block. |
| **Rationale** | Dev-only utility that references components now confirmed as unused. |

### **Target 2: Orphaned Landing Page Components**

| Action | Targets |
| :---- | :---- |
| **DELETE** | src/components/Hero.tsx, src/components/CTA.tsx, src/components/FeatureCard.tsx, src/components/Features.tsx, src/components/Navbar.tsx, src/components/Footer.tsx, src/components/MessageWithTTS.tsx. |
| **Rationale** | These components are only used by the DeprecationShowcase.tsx file and are otherwise dead code candidates. |

---

## **4\. Phase 3: Standardization & Refactoring**

This phase addresses technical debt by enforcing the use of the centralized apiService layer.

### **Target 1: Document Upload API Call**

| Code Location | Issue | Action |
| :---- | :---- | :---- |
| src/pages/DocumentUpload.tsx | Uses direct axios.post call, bypassing the central apiService and duplicating token injection logic. | **Refactor:** Update the component to use the established apiService.uploadDocument method. |

### **Target 2: Frontend Logging Inconsistency**

| Code Location | Issue | Action |
| :---- | :---- | :---- |
| src/pages/Dashboard.tsx, src/pages/UserRoutes.tsx, etc. | Uses raw console.log or print() statements for debugging. | **Standardize:** Replace all console.log/print calls in the routes and pages directories with structured logging (e.g., current\_app.logger.info for backend; a dedicated logging utility for frontend). |

### **Target 3: Quiz/Document Persistence**

| Code Location | Issue | Action |
| :---- | :---- | :---- |
| src/contexts/DocumentContext.tsx, src/contexts/QuizContext.tsx | State is ephemeral (useState only). | **Implement Persistence:** Add localStorage hooks to sync activeDocumentId and quizThreadId on mount/update to prevent data loss on browser refresh (P1 UX Fix). |

---

## **5\. Verification Checklist**

1. \[ \] **Build Check:** npm run build completes successfully.  
2. \[ \] **Integrity Check:** npm run test passes without errors due to missing imports.  
3. \[ \] **Runtime Check:** Manually verify DocumentView.tsx loads documents correctly and Settings.tsx is accessible via the sidebar.  
4. \[ \] **Post-Deletion Check:** grep \-r "DocAIService" backend/ returns no results in active code.  
5. \[ \] **Final Log Check:** Application runs, and console logs show structured messages instead of raw print() statements.