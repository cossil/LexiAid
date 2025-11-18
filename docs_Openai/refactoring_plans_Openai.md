# Refactoring Plan for Deprecation Candidates

Thinking...
- Since no .py or .ts/.tsx files were identified as unused, the refactoring work centers on maintaining hygiene and confirming active dependencies.
- Outline a verification checklist developers can follow when future deprecation candidates appear.

Plan
1. Restate that no deletions are scheduled now.
2. Provide a step-by-step process for safely retiring files once genuinely unused code is identified.
3. Include guidance for both frontend and backend contexts (imports, routes, services, LangGraph nodes).

Execute
- Document below offers general instructions for future refactors.

## Current Status
- Dependency review (see `active_dependency_graph.md`) confirmed all backend/ frontend source files are currently in use.
- `deprecation_candidates.md` therefore lists no files; this plan documents steps to follow when candidates emerge later.

## Safe Removal Checklist
1. **Confirm Usage**
   - Run `code_search` or equivalent tooling to verify no imports, dynamic `__import__`, or string-based references exist.
   - For React files, ensure they are not mentioned in route definitions (`App.tsx`, lazy imports) or component registries.
   - For Flask/Python files, confirm they are not registered as blueprints, services, or LangGraph nodes.

2. **Update Entry Points**
   - Remove references from routers (`App.tsx`, `backend/app.py`), provider stacks, or CLI scripts.
   - Delete exports from index barrels (e.g., `services/__init__.py`) when backend services are removed.

3. **Prune Shared Assets**
   - If removing a component/hook, ensure shared CSS modules, utility functions, and localization strings tied to it are also deleted or repurposed.

4. **Clean Build & Tests**
   - Run frontend (`npm run build` / `test`) and backend (`pytest`, `flask` smoke tests) to validate no missing imports remain.
   - Ensure LangGraph checkpoint migrations (if any) are safe when removing graph nodes.

5. **Documentation Updates**
   - Update `active_dependency_graph.md` and related technical docs to reflect removals.
   - Note final state in release notes or PR descriptions to aid future audits.

Following this checklist will keep the codebase healthy once actual dead code is identified.
