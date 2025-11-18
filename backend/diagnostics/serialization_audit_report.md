# LangGraph Serialization Audit Report

## Overview

This report audits all code paths where LangGraph state is serialized to identify why `HumanMessage` JSON serialization errors are still occurring despite the `safe_supervisor_invoke()` patch being present in the production environment.

**Key Finding**: The `safe_supervisor_invoke()` wrapper is correctly applied at the top-level supervisor invocation, but several downstream code paths bypass this protection, allowing raw `HumanMessage` objects to reach the SqliteSaver checkpoint persistence layer.

## Invocation Path Map

### 1. Main Entry Point: `/api/v2/agent/chat`
- **File**: `backend/app.py:615`
- **Status**: ✅ **PROTECTED** - Uses `safe_supervisor_invoke(compiled_supervisor_graph, supervisor_input, config=config)`
- **Flow**: Request → Supervisor State → `safe_supervisor_invoke()` → `compiled_supervisor_graph.invoke()`

### 2. Supervisor Graph Internal Invocations
#### A. New Chat Graph Invocation
- **File**: `backend/graphs/supervisor/nodes_invokers.py:73-76`
- **Status**: ❌ **UNPROTECTED** - Direct `graph_instance.invoke()` call
- **Code**: 
  ```python
  response_state = graph_instance.invoke(
      chat_input_state,
      {"configurable": {"thread_id": active_chat_thread_id}}
  )
  ```

#### B. Quiz Engine Graph Invocation
- **File**: `backend/graphs/supervisor/nodes_invokers.py:183-186`
- **Status**: ❌ **UNPROTECTED** - Direct `graph_instance.invoke()` call
- **Code**:
  ```python
  response_quiz_state: QuizEngineState = graph_instance.invoke(
      quiz_input,
      {"configurable": {"thread_id": active_quiz_v2_thread_id}}
  )
  ```

### 3. Standalone Graph Invocations
#### A. Quiz Engine Test Functions
- **File**: `backend/graphs/quiz_engine_graph.py:314, 333`
- **Status**: ❌ **UNPROTECTED** - Direct `compiled_quiz_graph.invoke()` and `compiled_quiz_graph.stream()` calls

#### B. New Chat Graph Test Functions
- **File**: `backend/graphs/new_chat_graph.py:189, 213`
- **Status**: ❌ **UNPROTECTED** - Direct `compiled_chat_graph.invoke()` calls

#### C. Document Understanding Agent
- **File**: `backend/graphs/document_understanding_agent/graph.py:240`
- **Status**: ❌ **UNPROTECTED** - Direct `agent_executor.ainvoke()` call

## Current Serialization Flow

### Protected Path (Working Correctly)
1. `/api/v2/agent/chat` receives request
2. `safe_supervisor_invoke()` deep-serializes input using `serialize_deep()`
3. `compiled_supervisor_graph.invoke()` called with serialized data
4. Result deep-serialized again before return
5. Checkpoint persistence receives serialized data

### Unprotected Paths (Problematic)
1. Supervisor nodes invoke child graphs directly
2. Child graphs receive raw `HumanMessage` objects in state
3. Child graph checkpointers attempt to persist raw `HumanMessage` objects
4. SqliteSaver.put() fails with "Object of type HumanMessage is not JSON serializable"

## Detected Gaps

### 1. **Critical Gap**: Supervisor Node Invokers
- **Location**: `backend/graphs/supervisor/nodes_invokers.py`
- **Issue**: Both `invoke_new_chat_graph_node()` and `invoke_quiz_engine_graph_node()` call `graph_instance.invoke()` directly
- **Impact**: Raw `HumanMessage` objects in `chat_input_state["messages"]` and `quiz_input` reach child graph checkpointers

### 2. **Moderate Gap**: Test and Standalone Functions
- **Location**: Various graph test files
- **Issue**: Direct graph invocation without serialization protection
- **Impact**: Affects testing and non-supervisor workflows

### 3. **Patch Activation Gap**: Limited Monkeypatch Coverage
- **Location**: `backend/diagnostics/langgraph_patch.py`
- **Issue**: Monkeypatch only provides debug logging, doesn't fix serialization
- **Impact**: SqliteSaver.put() still fails, just with better error messages

## Proposed Fix Strategy

### Phase 1: Critical Production Fix (Immediate)

#### 1.1 Extend safe_supervisor_invoke to Child Graphs
- Create `safe_graph_invoke()` wrapper function in `backend/app.py`
- Apply to all child graph invocations in `nodes_invokers.py`
- Ensure consistent serialization across all graph boundaries

#### 1.2 Update Supervisor Node Invokers
```python
# In nodes_invokers.py, replace direct invoke calls:
from backend.app import safe_graph_invoke  # New wrapper

response_state = safe_graph_invoke(
    graph_instance,
    chat_input_state, 
    {"configurable": {"thread_id": active_chat_thread_id}}
)
```

#### 1.3 Enhanced Monkeypatch
- Update `langgraph_patch.py` to automatically serialize before persisting
- Add proactive serialization instead of just error logging

### Phase 2: Comprehensive Coverage (Short-term)

#### 2.1 Centralized Serialization Manager
- Create `backend/utils/serialization_manager.py`
- Consolidate all serialization logic
- Provide consistent wrappers for different graph types

#### 2.2 Update All Direct Invocations
- Audit and replace remaining direct `.invoke()` calls
- Apply appropriate serialization wrappers based on context

#### 2.3 Enhanced Testing
- Add serialization tests to prevent regressions
- Test with actual `HumanMessage` objects in checkpoint scenarios

### Phase 3: Long-term Architecture (Future)

#### 3.1 Graph-level Serialization Configuration
- Investigate LangGraph native serialization options
- Configure serializers at graph compilation time
- Reduce need for manual wrapper functions

#### 3.2 State Management Refactoring
- Consider TypedDict state definitions with built-in serialization
- Implement state validation at graph boundaries

## Implementation Priority

### **Priority 1 (Critical - Fix Production Error)**
1. Create `safe_graph_invoke()` wrapper
2. Update `invoke_new_chat_graph_node()` 
3. Update `invoke_quiz_engine_graph_node()`
4. Test with production chat flow

### **Priority 2 (High - Prevent Regressions)**
1. Update monkeypatch to be proactive
2. Fix test function invocations
3. Add serialization unit tests

### **Priority 3 (Medium - Architecture Improvement)**
1. Consolidate serialization utilities
2. Implement comprehensive serialization strategy
3. Update documentation

## Root Cause Analysis

The error occurs because:

1. **Partial Protection**: `safe_supervisor_invoke()` only protects the top-level supervisor invocation
2. **Graph Boundary Crossing**: Child graphs receive raw message objects from supervisor state
3. **Checkpoint Persistence**: Child graph checkpointers attempt to serialize raw `HumanMessage` objects
4. **SqliteSaver Limitation**: SqliteSaver requires JSON-serializable data, but `HumanMessage` objects are not JSON serializable

The fix requires protecting **all** graph invocation points, not just the supervisor entry point.

## Verification Steps

After implementing fixes:

1. **Unit Test**: Verify `safe_graph_invoke()` serializes/deserializes correctly
2. **Integration Test**: Test full chat flow with message checkpoints
3. **Production Test**: Deploy to staging and verify no serialization errors
4. **Regression Test**: Ensure existing functionality remains intact

## Files Requiring Changes

### **Critical Files**
- `backend/app.py` - Add `safe_graph_invoke()` function
- `backend/graphs/supervisor/nodes_invokers.py` - Update invocation methods

### **Important Files**
- `backend/diagnostics/langgraph_patch.py` - Enhance monkeypatch
- `backend/graphs/quiz_engine_graph.py` - Fix test invocations
- `backend/graphs/new_chat_graph.py` - Fix test invocations

### **Optional Files**
- `backend/utils/message_utils.py` - Consider consolidation
- Test files - Add serialization tests

## Conclusion

The serialization audit reveals that while the supervisor-level protection is working, child graph invocations remain vulnerable. Implementing the proposed fixes will eliminate the `HumanMessage` serialization errors and provide robust protection across all graph boundaries in the LangGraph architecture.
