# Deletion Candidates Report

## Phase 16: Comprehensive Codebase Cleanup

This report identifies files that are likely garbage, legacy artifacts, or temporary files. **No files have been deleted.** Please review this list for approval.

### Summary
- **Temporary Artifacts**: Large number of debug audio files and runtime outputs.
- **Orphaned Scripts**: Utility scripts and loose tests in the root directory.
- **Documentation**: Dated reports and auto-generated analysis files.
- **Config Clutter**: Legacy VPS deployment folders.

### Candidates Table

| File Path | Category | Reason for Flagging | Recommendation |
| :--- | :--- | :--- | :--- |
| **Temporary Artifacts** | | | |
| `backend/debug_audio/*.raw` | Logs/Temp | Bulk temporary audio debug files (~80 files) | DELETE |
| `backend/debug_audio/*.flac` | Logs/Temp | Bulk temporary audio debug files | DELETE |
| `output.html` | Logs/Temp | Root level temporary output file | DELETE |
| `output.mp3` | Logs/Temp | Root level temporary output file | DELETE |
| `backend/graphs/.../tts_narrative_output_Health Insurance2.txt` | Logs/Temp | Specific temp text output | DELETE |
| `backend/VPS Docker files/docker-compose.yml.backup.1762104005` | Backup | Explicit backup file | DELETE |
| `secrets/ai-tutor-dev-457802-b5c990b9d600.json.old` | Backup | Explicit .old backup | DELETE |
| `backend/*.db`, `*.db-shm`, `*.db-wal` | Runtime Data | Local SQLite runtime databases (e.g., `quiz_checkpoints.db`) | GITIGNORE / DELETE |
| **Orphaned Scripts** | | | |
| `list_gcp_models.py` | Script | Orphaned utility script (not imported by app) | ARCHIVE / DELETE |
| `test_quiz_integration.py` | Script | Loose test script in root (not in `tests/`) | MOVE TO tests/ OR DELETE |
| `test_tts.py` | Script | Loose test script in root (not in `tests/`) | MOVE TO tests/ OR DELETE |
| `backend/firestore_schema.js` | Script | JS file in Python backend, likely reference | ARCHIVE |
| **Documentation & Text** | | | |
| `docs/LexiAid_Unified_Report_2025-11-05_v2.md` | Docs | Dated status report | DELETE |
| `docs/analysis_*.md` | Docs | Bulk auto-generated analysis files (e.g., `analysis_backend_main.md`) | DELETE |
| `docs/deprecation_candidates.md` | Docs | Temporary planning document | DELETE |
| `docs/refactoring_plan.md` | Docs | Temporary planning document | DELETE |
| `backend/diagnostics/*.md` | Docs | Reports inside code directory (`serialization_audit_report.md`) | DELETE |
| **Config Clutter** | | | |
| `backend/VPS Docker files/` | Config | Legacy deployment configurations (Entire Folder) | ARCHIVE / DELETE |
| `backend/VPS files/` | Config | Legacy deployment configurations (Entire Folder) | ARCHIVE / DELETE |
| `n8n.yaml` | Config | Root level YAML, unknown usage | REVIEW |
| `backend/.env.example` | Config | Check if outdated compared to `.env` | REVIEW |

### Notes
- `backend/diagnostics/langgraph_patch.py` was flagged but is **currently imported** by `app.py`. It was excluded from the deletion list.
- `backend/debug_audio/` contains a significant amount of data that should likely be gitignored if not already.
