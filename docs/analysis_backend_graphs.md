# Backend Graphs Analysis (Golden Source)

**Authority:** Verified against `backend/app.py` and `backend/graphs/*` (Dec 23, 2025)

This document describes the active LangGraph-based architecture, how graphs are compiled, how state is checkpointed, and which routing branches are actually reachable.

---

## 1) Architecture Overview (What is active)

LexiAid uses a modular **LangGraph** architecture for chat/quiz and answer formulation.

Primary orchestration entrypoint:
- `POST /api/v2/agent/chat` (in `backend/app.py`) invokes the **compiled Supervisor graph**.

---

## 2) Graph Inventory (Verified)

Graphs compiled/used by `backend/app.py` (via `DatabaseManager`):

- **Supervisor graph**
  - Location: `backend/graphs/supervisor/`
  - Compiled by: `create_supervisor_graph(...)`
  - Checkpointer DB: `supervisor_checkpoints.db`

- **New chat graph** (a.k.a. “general query”)
  - Location: `backend/graphs/new_chat_graph.py`
  - Checkpointer DB: `general_query_checkpoints.db`

- **Quiz engine graph (V2)**
  - Location: `backend/graphs/quiz_engine_graph.py`
  - Checkpointer DB: `quiz_checkpoints.db`

- **Answer formulation graph**
  - Location: `backend/graphs/answer_formulation/graph.py`
  - Checkpointer DB: `answer_formulation_sessions.db`

Additionally, document processing uses a separate async graph:
- **Document Understanding Agent (DUA)**
  - Location: `backend/graphs/document_understanding_agent/`
  - Invocation: direct call during document upload (not routed through the Supervisor graph)

---

## 3) Persistence & Checkpointing (Verified)

### 3.1 DatabaseManager
`backend/app.py` defines `DatabaseManager` to:
- choose a base directory (`DATA_DIR` env var → `/app/data` if present → local fallback)
- create SQLite connections
- create LangGraph `SqliteSaver` checkpointers using `JsonPlusSerializer`
- compile graphs with those checkpointers

### 3.2 Checkpoint databases created
At minimum, the following DBs are created:
- `quiz_checkpoints.db`
- `general_query_checkpoints.db`
- `supervisor_checkpoints.db`
- `answer_formulation_sessions.db`
- `document_understanding_checkpoints.db`

In Docker, `/app/data` is backed by the `lexiaid-backend-data` volume.

---

## 4) Serialization Safety (Verified, production-critical)

Two complementary safety layers exist:

### 4.1 `safe_supervisor_invoke` (in `backend/app.py`)
Wraps Supervisor invocation to deep-serialize:
- input state before invoke
- output state after invoke

This reduces checkpoint persistence failures when the state includes objects that are not JSON-serializable by default.

### 4.2 `backend/diagnostics/langgraph_patch.py`
Imported by `backend/app.py` at startup.

`langgraph_patch.py` monkeypatches `SqliteSaver.put()` to deep-serialize args/kwargs before persistence.

**Important:** despite the directory name `diagnostics/`, this patch is actively imported and should be treated as production-critical for stability.

---

## 5) Supervisor Graph Topology & Routing (Verified)

### 5.1 Nodes registered in `backend/graphs/supervisor/graph.py`
The Supervisor graph registers these nodes:
- `receive_user_input`
- `routing_decision`
- `new_chat_graph` (invokes the compiled New Chat graph)
- `quiz_engine_graph` (invokes the compiled Quiz Engine graph)

### 5.2 Allowed routing targets (critical detail)
In `create_supervisor_graph`, the routing function restricts valid next nodes to:
- `new_chat_graph`
- `quiz_engine_graph`
- `end`

**Therefore:** any state that sets `next_graph_to_invoke = "document_understanding_graph"` cannot be routed to that node by the compiled Supervisor graph; it will be treated as invalid and default to `new_chat_graph`.

### 5.3 Document understanding branch exists in routing code, but is not invokable
- `backend/graphs/supervisor/nodes_routing.py` can set `next_graph_to_invoke = "document_understanding_graph"`.
- However, the Supervisor graph does not register a node of that name.

**Conclusion:** “document understanding via Supervisor” is effectively **dead/unreachable** in the current compiled graph.

---

## 6) Standalone Graphs (Verified)

### 6.1 Document Understanding Agent (DUA)
Invoked during upload:
- `backend/routes/document_routes.py` calls `asyncio.run(run_dua_processing_for_document(...))`.

This is the active path for document understanding; it is not mediated by the Supervisor graph.

### 6.2 Answer Formulation
Invoked via dedicated API endpoints:
- `POST /api/v2/answer-formulation/refine`
- `POST /api/v2/answer-formulation/edit`

This graph uses its own checkpointing independent of Supervisor.

---

## 7) Notable Observations / Risks

- **Permission gap risk:** `DocumentRetrievalService.get_document_content_for_quiz(..., user_id=None)` explicitly does not enforce ownership at the service layer.
- **Logging noise:** multiple graphs/services use `print(...)` statements which can flood production logs.
- **Routing drift risk:** the presence of “document_understanding_graph” in state typing and routing logic is misleading and can cause incorrect assumptions during future development.
