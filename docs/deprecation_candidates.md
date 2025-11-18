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