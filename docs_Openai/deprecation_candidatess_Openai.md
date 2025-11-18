# Deprecation Candidates

Thinking...
- Identify .py and .ts/.tsx files that appear unused by tracing imports/routes/hooks across the repo.
- Validate each suspect by searching for import references as well as runtime references (routes, LangGraph registrations, provider usage).
- Flag only files that remain completely unreferenced after a second-pass validation.

Plan
1. Walk backend/frontend directories to locate legacy or stub files (e.g., `backend/agent`, `docs_old`, dev-only pages).
2. Use search tools to confirm whether each file is imported, routed, or referenced by build tooling.
3. List only files with zero references; otherwise document that no safe deletions exist.

Execute
- Reviewed backend (`backend/`, `backend/graphs`, `backend/routes`, `backend/services`) and frontend (`src/`) directories.
- `code_search`, `find_by_name`, and manual file inspection showed every .py and .ts/.tsx file either:
  - participates in Flask routing or LangGraph setup,
  - is imported by React routes/components/hooks,
  - or is conditionally loaded for development (e.g., `pages/dev/DeprecationShowcase.tsx`).
- Empty directories (e.g., `backend/agent/`) contain no files to delete; dev-only assets are still referenced under `import.meta.env.DEV` guards.

## Conclusion
No .py or .ts/.tsx files qualify as safe deletion candidates at this time. All inspected files are referenced directly or indirectly by active routes, providers, LangGraph graphs, or developer tooling.

Should new evidence emerge (e.g., feature removal, confirmed dead code), rerun the dependency validation steps above before scheduling deletions.
