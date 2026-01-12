# LexiAid Master Checklist: Tech Debt & Feature Roadmap

**Last Updated:** 2026-01-10
**Status:** Active
**Protocol:** All changes must follow the Two-Phase Prompting Protocol (2PPP).

---

## Part 1: Tech Debt & Refactoring (Maintenance)

These items are derived from the Audit and Refactoring Plans. They focus on stability, security, and code hygiene.

### 🔴 High Priority (Stability & Deployment)
* [ ] **Fix Dockerfile Healthcheck Path**
    * *Issue:* `backend/Dockerfile` checks `/health`, but `app.py` exposes `/api/health`.
    * *Risk:* Container crash loops in standalone builds.
    * *Source:* refactoring_plan.md
* [ ] **Remove Unused SocketIO Dependencies**
    * *Issue:* Root `requirements.txt` includes `Flask-SocketIO`, `python-socketio`, `bidict` (Dead Code). App uses `flask-sock`.
    * *Action:* Remove lines 15, 47, 171, 174.
    * *Source:* refactoring_plan.md
* [ ] **Add `google-generativeai` to Backend Requirements**
    * *Issue:* Implicit dependency in DUA graph. Needs to be explicit in `backend/requirements.txt`.
    * *Source:* refactoring_plan.md

### 🟡 Medium Priority (Security & Architecture)
* [ ] **Implement WebSocket Authentication**
    * *Issue:* `app.py` endpoint `/ws/stt/stream` lacks token validation in the handshake.
    * *Action:* Validate Firebase token on connection.
    * *Source:* analysis_backend_main.md
* [ ] **Consolidate Requirements Files**
    * *Issue:* Confusion between root `requirements.txt` (dev/dead code) and `backend/requirements.txt` (prod).
    * *Action:* Merge or strictly document separation.
    * *Source:* refactoring_plan.md
* [ ] **Standardize API Ports**
    * *Issue:* `DocumentView.tsx` defaults to port `8081` (local), Backend Docker uses `5000`.
    * *Action:* Standardize `VITE_BACKEND_API_URL` or local dev config.
    * *Source:* analysis_frontend_main.md
* [ ] **Remove Duplicate TTS Route**
    * *Issue:* TTS logic exists in both `app.py` (inline) and `tts_routes.py` (blueprint).
    * *Action:* Deprecate inline route in `app.py`.
    * *Source:* refactoring_plan.md

### 🟢 Low Priority (Cleanup & Optimization)
* [ ] **Deprecate OCR Service**
    * *Issue:* `document_routes.py` contains legacy OCR code. DUA is the new standard.
    * *Action:* Remove dead OCR code paths.
    * *Source:* deprecation_candidates.md
* [ ] **Remove Vertex AI References**
    * *Issue:* Migration to Gemini API is complete. Remove `langchain-google-vertexai`.
    * *Source:* deprecation_candidates.md
* [ ] **Legacy Code Cleanup (`AiTutorAgent`)**
    * *Issue:* Remove commented-out ReAct agent code in `app.py`.
    * *Source:* deprecation_candidates.md
* [ ] **Standardize Auth Decorators**
    * *Issue:* `user_routes.py` manually extracts tokens; should use `@require_auth`.
    * *Source:* refactoring_plan.md
* [ ] **Logging Standardization**
    * *Issue:* Replace `print()` statements with `logging` in Service layers.
    * *Source:* refactoring_plan.md

---

## Part 2: New Feature Roadmap

These items are derived from the Roadmap and Strategy documents.

### 🚀 Phase 1: Core Personalization (Critical Path)
* [ ] **User Profile Schema Update**
    * *Task:* Add fields for DOB (Age), Visual Impairment (Boolean), School Context.
    * *UI:* "First Login" Data Collection Form.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md
* [ ] **Adaptive Image Processing Logic**
    * *Task:* Modify DUA Prompt to check User Profile (Visual Impairment).
    * *Logic:* If Blind → Full description. If Sighted/Dyslexic → Summary/Text extraction only.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md
* [ ] **Context-Aware Prompt Engineering**
    * *Task:* Inject User Age/Grade Level into System Prompts for Chat and Simplification.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md

### 🛠 Phase 2: Retention & Learning Tools
* [ ] **"Focus Mask" (Reading Ruler)**
    * *Task:* CSS overlay to isolate active reading lines.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md
* [ ] **"Click-to-Picture" Dictionary**
    * *Task:* UI interaction to generate/fetch image for specific words.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md
* [ ] **"Simplify This" Slider**
    * *Task:* Real-time UI slider (ELI5 <-> Professor) to adjust prompt complexity.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md
* [ ] **"Dyslexie" Font Toggle**
    * *Task:* Global CSS class toggle for OpenDyslexic font.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md
* [ ] **Gamification (Badges/Streaks)**
    * *Task:* Track reading streaks and award badges.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md
* [ ] **Parent/Teacher Insight Dashboard**
    * *Task:* Weekly summaries of interests/activity (not just policing).
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md

### 🏢 Future: Business & Institutional
* [ ] **Freemium Tier Architecture**
    * *Task:* Gate specific features (e.g., Deep Research) behind subscription.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md
* [ ] **External Research Mode**
    * *Task:* Enable web-search capabilities with strict safety guardrails.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md
* [ ] **Institutional/B2B Features**
    * *Task:* Class/Teacher hierarchy, document pushing.
    * *Source:* LexiAid_Roadmap_Ideas_and_Toughts.md