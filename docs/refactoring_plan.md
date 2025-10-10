# Refactoring Plan

## Overview
This plan provides a safe, step-by-step approach to removing deprecated code and improving the codebase structure. Each step is designed to be independently testable and reversible.

## Phase 1: Remove Deprecated Files (No Code Changes)

### Step 1.1: Remove Deprecated Agent Files
**Risk**: LOW | **Impact**: None | **Testing**: None required

```bash
# Delete deprecated AiTutorAgent prompt
rm backend/agent/system_prompt_ai_tutor_v2.md

# Verify directory is now empty (except __pycache__)
ls backend/agent/
```

**Verification**: Directory should only contain `__pycache__/`

---

### Step 1.2: Remove Diagnostic Tools
**Risk**: LOW | **Impact**: None | **Testing**: None required

```bash
# Delete disabled file usage tracker
rm backend/file_usage_tracker.py
rm backend/used_python_files_log.txt
```

**Verification**: Files no longer exist

---

### Step 1.3: Remove Deprecated Test Files
**Risk**: LOW | **Impact**: None | **Testing**: Run remaining tests

```bash
# Delete tests for deprecated code
rm -rf backend/tests/deprecation/

# Run remaining tests to ensure nothing broke
cd backend
pytest tests/
```

**Verification**: All remaining tests pass

---

## Phase 2: Remove OCRTool References

### Step 2.1: Update document_routes.py
**Risk**: MEDIUM | **Impact**: OCR fallback no longer available | **Testing**: Document upload

**File**: `backend/routes/document_routes.py`

**Changes**:
```python
# Lines 274-309: Replace OCR processing block

# OLD CODE (DELETE):
if should_run_ocr:
    current_app.logger.info(f"Document {document_id} ({file_extension}) is OCR eligible. Attempting OCR.")
    final_fs_update_payload['status'] = 'processing_ocr'
    firestore_service.update_document(document_id, {'status': 'processing_ocr', 'updated_at': datetime.now(timezone.utc).isoformat()})

    ocr_tool = current_app.config['TOOLS'].get('OCRTool')
    if ocr_tool:
        try:
            ocr_success, ocr_data = ocr_tool.process_document(gcs_uri, file.mimetype)
            if ocr_success and ocr_data:
                ocr_text = ocr_data.get('text', '')
                if ocr_text.strip():
                    final_fs_update_payload['ocr_text_content'] = ocr_text
                    final_fs_update_payload['status'] = 'processed_ocr'
                    final_fs_update_payload['processing_error'] = None
                    ocr_text_content_produced = True
                    current_app.logger.info(f"OCR successfully processed document {document_id}.")
                else:
                    final_fs_update_payload['status'] = 'ocr_empty_result'
                    final_fs_update_payload['processing_error'] = 'OCR processed but yielded no text.'
                    current_app.logger.info(f"OCR processed document {document_id} but yielded no text.")
            else:
                error_msg = ocr_data.get('error', 'OCR processing failed.')
                final_fs_update_payload['status'] = 'ocr_failed'
                final_fs_update_payload['processing_error'] = error_msg
                current_app.logger.error(f"OCR processing failed for {document_id}: {error_msg}")
        except Exception as e_ocr:
            current_app.logger.error(f"Exception during OCR for {document_id}: {e_ocr}", exc_info=True)
            final_fs_update_payload['status'] = 'ocr_failed'
            final_fs_update_payload['processing_error'] = f"OCR execution error: {str(e_ocr)}"
    else:
        current_app.logger.warning("OCRTool not available. Skipping OCR.")
        final_fs_update_payload['status'] = 'ocr_skipped_tool_unavailable'
    
    final_fs_update_payload['updated_at'] = datetime.now(timezone.utc).isoformat()
    firestore_service.update_document(document_id, final_fs_update_payload)

# NEW CODE (ADD):
if should_run_ocr:
    current_app.logger.warning(f"OCR functionality has been deprecated. Document {document_id} will be marked as 'ocr_unavailable'.")
    final_fs_update_payload['status'] = 'ocr_unavailable'
    final_fs_update_payload['processing_error'] = 'OCR processing is no longer supported. Please re-upload as a DUA-eligible format (PDF, PNG, JPG, JPEG) for full processing.'
    final_fs_update_payload['updated_at'] = datetime.now(timezone.utc).isoformat()
    firestore_service.update_document(document_id, final_fs_update_payload)
```

**Also Remove**:
```python
# Line 16: Remove commented import
# from ..services import FirestoreService, StorageService, OCRTool # Example structure

# Line 95: Remove OCR_ELIGIBLE_EXTENSIONS (or keep for reference)
# OCR_ELIGIBLE_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'tiff'}
```

**Testing**:
1. Upload a DUA-eligible file (PDF, PNG, JPG) → Should process with DUA
2. Upload a non-DUA file (TXT) → Should get 'ocr_unavailable' status
3. Check Firestore for correct status and error message

---

### Step 2.2: Delete OCRTool Directory
**Risk**: LOW | **Impact**: None (already unused) | **Testing**: Backend startup

```bash
# Delete tools directory
rm -rf backend/tools/
```

**Testing**:
```bash
# Start backend server
cd backend
flask --app app.py --debug run --port 5000

# Verify no import errors
# Check logs for successful startup
```

**Verification**: Server starts without errors

---

## Phase 3: Remove DocAIService

### Step 3.1: Remove DocAIService Initialization
**Risk**: LOW | **Impact**: None (service not used) | **Testing**: Backend startup

**File**: `backend/app.py`

**Changes**:
```python
# Lines 132-134: DELETE
docai_service = initialize_component(DocAIService, 'DocAIService', 'SERVICES')
if docai_service:
    app.config['DOCAI_SERVICE'] = docai_service
```

**Also Remove Import**:
```python
# Line ~50: DELETE
from backend.services.doc_ai_service import DocAIService
```

**Testing**:
```bash
# Start backend
flask --app app.py --debug run --port 5000

# Verify no errors
# Test document upload (DUA should still work)
```

---

### Step 3.2: Delete DocAIService File
**Risk**: LOW | **Impact**: None | **Testing**: None required

```bash
rm backend/services/doc_ai_service.py
```

**Verification**: File deleted, backend still starts

---

## Phase 4: Optional Cleanup

### Step 4.1: Remove firestore_schema.js (Optional)
**Risk**: LOW | **Impact**: Lose schema documentation | **Testing**: None

**Decision Point**: 
- If schema is documented elsewhere → DELETE
- If this is the only schema reference → KEEP

```bash
# Only if schema is documented elsewhere
rm backend/firestore_schema.js
```

---

### Step 4.2: Clean Up Comments
**Risk**: LOW | **Impact**: Code clarity | **Testing**: None

**Files to Update**:
1. `backend/app.py` - Remove comments about deprecated AiTutorAgent
2. `backend/graphs/supervisor/graph.py` - Remove deprecated DocumentUnderstandingGraph references

**Example**:
```python
# backend/app.py, around line 380
# DELETE comment:
# "The deprecated AiTutorAgent (ReAct-based) is no longer used by the application."
```

---

## Phase 5: Documentation Updates

### Step 5.1: Update README
**File**: `README.md` (if exists)

**Add Section**:
```markdown
## Deprecated Features

The following features have been removed:
- **OCRTool**: Replaced by Document Understanding Agent (DUA)
- **AiTutorAgent**: Replaced by LangGraph Supervisor architecture
- **DocAIService**: Replaced by Vertex AI integration in DUA

For documents requiring text extraction, please use DUA-eligible formats:
- PDF, PNG, JPG, JPEG
```

---

### Step 5.2: Update Architecture Diagrams
**Files**: Any architecture docs in `docs/`

**Update**:
- Remove OCRTool from diagrams
- Remove AiTutorAgent references
- Clarify DUA as primary document processing method

---

## Testing Strategy

### Regression Test Suite

#### Test 1: Document Upload (DUA-eligible)
```
1. Upload a PDF file
2. Verify status changes: uploading → processing_dua → processed_dua
3. Verify dua_narrative_content is populated
4. Verify TTS assets are pre-generated
5. Verify document is viewable with TTS
```

#### Test 2: Document Upload (Non-DUA)
```
1. Upload a TXT file
2. Verify status: uploading → uploaded → ocr_unavailable
3. Verify processing_error message is clear
4. Verify document metadata is saved
```

#### Test 3: Chat Functionality
```
1. Open chat for a DUA-processed document
2. Send a text query
3. Verify response is generated
4. Verify TTS audio is included
5. Send an audio query
6. Verify STT transcription works
7. Verify agent response
```

#### Test 4: Quiz Functionality
```
1. Start quiz for a document
2. Verify first question is generated
3. Answer question
4. Verify feedback and next question
5. Complete quiz
6. Verify final summary with score
```

#### Test 5: TTS Playback
```
1. View a DUA-processed document
2. Click "Read Aloud"
3. Verify pre-generated audio loads
4. Verify word highlighting works
5. Click a word to seek
6. Verify audio jumps to that word
```

---

## Rollback Plan

### If Issues Arise

#### Phase 1 Rollback (Files)
```bash
# Restore from git
git checkout HEAD -- backend/agent/system_prompt_ai_tutor_v2.md
git checkout HEAD -- backend/file_usage_tracker.py
git checkout HEAD -- backend/used_python_files_log.txt
```

#### Phase 2 Rollback (OCRTool)
```bash
# Restore document_routes.py
git checkout HEAD -- backend/routes/document_routes.py

# Restore tools directory (if it existed)
git checkout HEAD -- backend/tools/
```

#### Phase 3 Rollback (DocAIService)
```bash
# Restore app.py
git checkout HEAD -- backend/app.py

# Restore service file
git checkout HEAD -- backend/services/doc_ai_service.py
```

---

## Timeline Estimate

| Phase | Duration | Risk | Can Run in Parallel |
|-------|----------|------|---------------------|
| Phase 1 | 15 min | LOW | No (sequential) |
| Phase 2 | 30 min | MEDIUM | No (depends on Phase 1) |
| Phase 3 | 20 min | LOW | Yes (independent of Phase 2) |
| Phase 4 | 15 min | LOW | Yes (optional) |
| Phase 5 | 30 min | LOW | Yes (documentation) |
| **Testing** | 1-2 hours | - | After each phase |

**Total Estimated Time**: 2.5-3.5 hours (including testing)

---

## Success Criteria

### Code Quality
- ✅ No unused imports
- ✅ No commented-out code blocks
- ✅ No references to deprecated components
- ✅ All tests pass

### Functionality
- ✅ Document upload works for DUA-eligible files
- ✅ Chat functionality works
- ✅ Quiz functionality works
- ✅ TTS playback works (pre-generated and on-demand)
- ✅ STT (real-time and file upload) works

### Documentation
- ✅ README updated
- ✅ Architecture docs updated
- ✅ Deprecation notes added

---

## Post-Refactoring Benefits

### Code Reduction
- **Files Removed**: 5-7 files
- **Lines of Code Removed**: ~150-200 lines
- **Complexity Reduction**: Removed 2 unused services, 1 deprecated agent

### Maintenance Benefits
- Clearer codebase (no deprecated code)
- Reduced confusion for new developers
- Faster onboarding (fewer components to understand)
- Reduced test surface area

### Performance Benefits
- Slightly faster startup (fewer services to initialize)
- Reduced memory footprint (fewer unused objects)

---

## Conclusion

This refactoring plan safely removes deprecated code while maintaining all active functionality. The phased approach allows for incremental testing and easy rollback if issues arise. The estimated time investment of 2.5-3.5 hours will result in a cleaner, more maintainable codebase.
