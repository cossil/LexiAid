# LexiAid Document Upload Enhancement: .docx and .txt Support Implementation Plan

**Project:** LexiAid - AI-Powered Learning Platform for Students with Reading Disabilities  
**Feature:** Multi-Tiered Document Processing Strategy  
**Status:** Phase 1 - Analysis & Planning  
**Date:** 2025-10-10  
**Author:** Cascade AI Assistant

---

## Executive Summary

This document provides a comprehensive analysis and implementation plan for upgrading LexiAid's document upload feature to intelligently handle `.docx` and `.txt` files without introducing regressions to the existing PDF/Image processing functionality. The solution implements a **multi-tiered processing strategy** that routes each file type to the most appropriate processing pipeline.

### Current State
- **Supported Formats:** PDF, JPG, PNG, JPEG, GIF
- **Processing Engine:** Document Understanding Agent (DUA) - highly effective for visual formats
- **Limitation:** `.docx` and `.txt` files are rejected at upload

### Proposed Solution
- **`.docx` Files:** Auto-convert to PDF → Process via existing DUA pipeline
- **`.txt` and `.md` Files:** Direct text extraction → Bypass DUA → Pre-generate TTS
- **PDF/Image Files:** No changes - continue using existing DUA pipeline

---

## 1. Library Research & Recommendation

### 1.1 Problem Analysis

Converting `.docx` to PDF in a cross-platform Python environment presents several challenges:

1. **Platform Dependency:** Many solutions require Microsoft Word (Windows/macOS only)
2. **Server Environment:** Backend likely runs on Linux in production
3. **Quality Requirements:** Must preserve formatting for DUA to generate accurate narratives
4. **Reliability:** Must handle various `.docx` formats and versions

### 1.2 Library Evaluation

#### Option A: `docx2pdf` (NOT RECOMMENDED)
- **Pros:** Simple Python API, lightweight
- **Cons:** 
  - Requires Microsoft Word to be installed
  - Windows/macOS only - **fails on Linux servers**
  - Not suitable for cloud deployment

#### Option B: `python-docx` + `reportlab` (NOT RECOMMENDED)
- **Pros:** Pure Python, cross-platform
- **Cons:**
  - Manual conversion logic required
  - Poor formatting preservation
  - Complex implementation for images/tables

#### Option C: LibreOffice with subprocess calls (RECOMMENDED)
- **Pros:**
  - **Cross-platform:** Works on Linux, Windows, macOS
  - **High-quality conversion:** LibreOffice's native rendering engine
  - **Handles complex documents:** Tables, images, embedded objects
  - **Production-ready:** Used by many enterprise applications
  - **Free and open-source**
- **Cons:**
  - Requires LibreOffice installation on server
  - Slightly larger dependency footprint
  - Requires subprocess execution

### 1.3 Final Recommendation

**Use LibreOffice with direct subprocess calls** for maximum control and reliability.

**Rationale:**
1. **Cross-platform compatibility** - Critical for cloud deployment
2. **No additional Python dependencies** - Reduces complexity
3. **High-quality output** - Preserves formatting for DUA processing
4. **Production-proven** - Used by major document processing systems

### 1.4 Requirements.txt Update

Add to `backend/requirements.txt`:

```python
# Document Conversion (requires LibreOffice installed on system)
# Note: LibreOffice must be installed separately via system package manager
# Ubuntu/Debian: sudo apt-get install libreoffice
# CentOS/RHEL: sudo yum install libreoffice
# macOS: brew install libreoffice
# Windows: Download from https://www.libreoffice.org/
```

**System Requirements Documentation:**
Create `backend/docs/SYSTEM_DEPENDENCIES.md`:

```markdown
# System Dependencies

## LibreOffice (Required for .docx conversion)

### Installation

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y libreoffice libreoffice-writer
```

**macOS:**
```bash
brew install libreoffice
```

**Windows:**
Download from https://www.libreoffice.org/download/

### Verification
```bash
libreoffice --version
```
```

---

## 2. Code Modification Analysis

### 2.1 Target File Location

**Primary File:** `backend/routes/document_routes.py`  
**Function:** `upload_document()` (Lines 102-321)

### 2.2 Current Processing Flow

```
User uploads file
    ↓
Line 115: allowed_file() check
    ↓
Line 119: Extract file_extension
    ↓
Line 130-147: Create Firestore entry (status: 'uploading')
    ↓
Line 149-175: Upload to GCS (status: 'uploaded')
    ↓
Line 181: Check if file_extension in DUA_ELIGIBLE_EXTENSIONS
    ↓
Line 181-257: DUA Processing (if eligible)
    ↓
Line 206-245: TTS Pre-generation (if DUA successful)
    ↓
Line 260-279: OCR Processing (deprecated, fallback only)
    ↓
Line 304: Return response
```

### 2.3 Proposed Modification Points

#### Insertion Point A: Line 94-96 (Constants)

**Current:**
```python
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'}
OCR_ELIGIBLE_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'tiff'}
DUA_ELIGIBLE_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
```

**Proposed:**
```python
ALLOWED_EXTENSIONS = {'txt', 'md', 'docx', 'pdf', 'png', 'jpg', 'jpeg', 'gif'}
OCR_ELIGIBLE_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'tiff'}
DUA_ELIGIBLE_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}
TEXT_ONLY_EXTENSIONS = {'txt', 'md'}  # NEW
DOCX_EXTENSIONS = {'docx'}  # NEW
```

#### Insertion Point B: Line 176-180 (Before DUA Processing)

This is the **critical decision point** where file-type routing logic will be inserted.

**Current:**
```python
dua_processed_successfully = False
ocr_text_content_produced = False

# --- 4. DUA PROCESSING (Single Call Refactor) ---
if file_extension in DUA_ELIGIBLE_EXTENSIONS:
```

**Proposed Routing Structure:**
```python
dua_processed_successfully = False
ocr_text_content_produced = False
text_only_processed = False  # NEW FLAG

# --- 4. FILE TYPE ROUTING ---
# Route 1: .docx files - Convert to PDF, then process via DUA
if file_extension in DOCX_EXTENSIONS:
    # [DOCX CONVERSION LOGIC]
    pass

# Route 2: .txt/.md files - Direct text extraction, bypass DUA
elif file_extension in TEXT_ONLY_EXTENSIONS:
    # [TEXT EXTRACTION LOGIC]
    pass

# Route 3: PDF/Image files - Existing DUA pipeline (NO CHANGES)
elif file_extension in DUA_ELIGIBLE_EXTENSIONS:
    # [EXISTING DUA LOGIC - Lines 181-257 - UNCHANGED]
    pass
```

### 2.4 .docx Conversion Implementation

**Key Steps:**
1. Download .docx from GCS to temporary file
2. Convert using LibreOffice subprocess: `libreoffice --headless --convert-to pdf --outdir <dir> <docx_path>`
3. Upload converted PDF to GCS (sub_folder='converted_pdfs')
4. Store `converted_pdf_gcs_uri` and `original_format='docx'` in Firestore
5. Pass converted PDF to existing DUA processing pipeline
6. Cleanup temporary files

**Error Handling:**
- Timeout after 60 seconds
- Set status to `conversion_failed` with error details
- Continue to response without DUA processing

### 2.5 .txt/.md Text Extraction Implementation

**Key Steps:**
1. Download text file from GCS
2. Decode with multiple encoding attempts (utf-8, utf-8-sig, latin-1, cp1252)
3. Validate content (not empty, minimum length)
4. Store in Firestore field `text_only_content`
5. Set status to `processed_text_only`
6. Pre-generate TTS audio and timepoints (identical to DUA TTS logic)
7. Update Firestore with TTS asset URIs

**Error Handling:**
- Set status to `text_processing_failed` with error details
- Log encoding failures
- Continue to response even if TTS generation fails

---

## 3. System Impact Analysis

### 3.1 New Firestore Status Values

| Status | Meaning | Content Location | TTS Assets |
|--------|---------|------------------|------------|
| `converting_docx` | .docx → PDF conversion in progress | N/A | No |
| `conversion_failed` | .docx conversion failed | `processing_error` | No |
| `processing_text_only` | Text file being processed | N/A | No |
| `processed_text_only` | Text file successfully processed | `text_only_content` | Yes |
| `text_processing_failed` | Text processing failed | `processing_error` | No |

**New Metadata Fields:**
- `converted_pdf_gcs_uri` (string): GCS URI of PDF generated from .docx
- `original_format` (string): Original file format for converted files
- `text_only_content` (string): Raw text content for .txt/.md files

### 3.2 DocumentRetrievalService Impact

**File:** `backend/services/doc_retrieval_service.py`  
**Method:** `get_document_content()` (Lines 83-204)

**Required Modification (Insert after Line 123):**

```python
elif doc_status == 'processed_text_only' and 'text_only_content' in document_data:
    return True, {
        "content": document_data['text_only_content'],
        "source": "firestore_text_only",
        "file_type": document_data.get('file_type', 'txt')
    }
```

**Impact on Downstream Services:**

| Service | Impact | Changes Required |
|---------|--------|------------------|
| General Query Graph | ✅ None | Automatically receives text via updated retrieval |
| Quiz Graph | ✅ None | Uses `get_document_text()` which calls `get_document_content()` |
| TTS Service | ✅ None | Pre-generation handled in upload route |
| Frontend Document View | ✅ None | Backend returns content regardless of processing method |

### 3.3 TTS Pre-Generation Verification

**Current Trigger:** After DUA processing (Lines 206-245)  
**New Trigger:** After text-only processing (duplicate logic in new code block)

**Verification Points:**
1. ✅ TTS service receives plain text
2. ✅ Audio and timepoints uploaded to GCS with same structure
3. ✅ Firestore fields `tts_audio_gcs_uri` and `tts_timepoints_gcs_uri` populated
4. ✅ Frontend can retrieve via `/api/documents/<id>/tts-assets`

---

## 4. Comprehensive Testing Strategy

### 4.1 New Functionality Tests

#### Test Suite 1: .docx File Processing

**Test 1.1: Simple .docx Upload**
- **Input:** 1-page .docx, text only, no images
- **Expected:**
  - Status transitions: `uploading` → `uploaded` → `converting_docx` → `processing_dua` → `processed_dua`
  - `converted_pdf_gcs_uri` populated
  - `original_format` = 'docx'
  - `dua_narrative_content` contains text
  - TTS assets generated
- **Verification:**
  - Check Firestore fields
  - Verify converted PDF in GCS
  - Test TTS playback
  - Call `/api/documents/<id>?include_content=true`

**Test 1.2: Complex .docx Upload**
- **Input:** Multi-page .docx with images, tables, formatting
- **Expected:** Same as 1.1, DUA narrative describes images/tables
- **Verification:** Check narrative quality

**Test 1.3: .docx Conversion Failure**
- **Input:** Corrupted .docx file
- **Expected:**
  - Status: `conversion_failed`
  - `processing_error` contains error message
  - No DUA processing attempted
- **Verification:** Check error handling

**Test 1.4: .docx Conversion Timeout**
- **Input:** Very large .docx (>100 pages)
- **Expected:**
  - Timeout after 60 seconds
  - Status: `conversion_failed`
  - Error: "LibreOffice conversion timed out"
- **Verification:** Check timeout mechanism

#### Test Suite 2: .txt/.md File Processing

**Test 2.1: UTF-8 .txt Upload**
- **Input:** Plain .txt file, UTF-8 encoding
- **Expected:**
  - Status: `processed_text_only`
  - `text_only_content` matches file content
  - TTS assets generated
- **Verification:**
  - Check Firestore content
  - Test TTS playback
  - Call `/api/documents/<id>?include_content=true`

**Test 2.2: .md File Upload**
- **Input:** Markdown file with headers, lists, links
- **Expected:** Same as 2.1
- **Verification:** Content preserved exactly

**Test 2.3: Non-UTF-8 Encoding**
- **Input:** .txt file with Latin-1 encoding
- **Expected:**
  - Successfully decoded with fallback encoding
  - Status: `processed_text_only`
- **Verification:** Check encoding detection logs

**Test 2.4: Empty .txt File**
- **Input:** Empty or whitespace-only .txt
- **Expected:**
  - Status: `text_processing_failed`
  - Error: "Text file is empty after decoding"
- **Verification:** Check error handling

**Test 2.5: Very Large .txt File**
- **Input:** .txt file >1MB
- **Expected:**
  - Successfully processed
  - TTS generation may take longer
- **Verification:** Check performance logs

### 4.2 Critical Regression Tests

#### Test Suite 3: PDF Processing (Unchanged)

**Test 3.1: Simple PDF Upload**
- **Input:** 1-page PDF, text only
- **Expected:**
  - Status: `processed_dua`
  - `dua_narrative_content` populated
  - TTS assets generated
  - **NO** `converted_pdf_gcs_uri` field
  - **NO** `original_format` field
- **Verification:** Ensure no new fields added for native PDFs

**Test 3.2: Complex PDF Upload**
- **Input:** Multi-page PDF with images
- **Expected:** Same as 3.1, DUA describes images
- **Verification:** Compare with pre-implementation baseline

**Test 3.3: PDF DUA Failure**
- **Input:** Corrupted PDF
- **Expected:**
  - Status: `dua_failed`
  - `processing_error` contains error
- **Verification:** Ensure error handling unchanged

#### Test Suite 4: Image Processing (Unchanged)

**Test 4.1: JPG Upload**
- **Input:** JPG image with text
- **Expected:**
  - Status: `processed_dua`
  - DUA narrative describes image and extracts text
  - TTS assets generated
- **Verification:** Compare with baseline

**Test 4.2: PNG Upload**
- **Input:** PNG image
- **Expected:** Same as 4.1
- **Verification:** Ensure no regressions

**Test 4.3: Image DUA Failure**
- **Input:** Corrupted image file
- **Expected:**
  - Status: `dua_failed`
  - Error handling unchanged
- **Verification:** Check error messages

### 4.3 Integration Tests

**Test 5.1: Chat with .docx Document**
- **Steps:**
  1. Upload .docx file
  2. Wait for processing to complete
  3. Open chat interface
  4. Ask question about document content
- **Expected:** Agent responds with accurate information from document

**Test 5.2: Quiz from .txt Document**
- **Steps:**
  1. Upload .txt file
  2. Start quiz
  3. Answer questions
- **Expected:** Quiz questions generated from text content

**Test 5.3: TTS Playback for All File Types**
- **Steps:**
  1. Upload .docx, .txt, .pdf, .jpg
  2. For each, click TTS play button
- **Expected:** Audio plays with synchronized highlighting

### 4.4 Edge Case Tests

**Test 6.1: Unsupported File Type**
- **Input:** .doc (old Word format)
- **Expected:** Rejected with "File type not allowed" (status 400)

**Test 6.2: File Extension Mismatch**
- **Input:** .txt file renamed to .docx
- **Expected:** Conversion fails, status `conversion_failed`

**Test 6.3: Concurrent Uploads**
- **Input:** Upload 5 .docx files simultaneously
- **Expected:** All process correctly without interference

**Test 6.4: LibreOffice Not Installed**
- **Input:** .docx file on system without LibreOffice
- **Expected:**
  - Status: `conversion_failed`
  - Error: "LibreOffice not found" or similar

### 4.5 Test Execution Plan

**Phase 1: Unit Tests (Local Development)**
1. Test conversion function in isolation
2. Test text extraction function in isolation
3. Mock GCS and Firestore interactions

**Phase 2: Integration Tests (Development Environment)**
1. Run all new functionality tests (Suites 1-2)
2. Run all regression tests (Suites 3-4)
3. Compare results with baseline

**Phase 3: End-to-End Tests (Staging Environment)**
1. Run integration tests (Suite 5)
2. Run edge case tests (Suite 6)
3. Performance testing with large files

**Phase 4: User Acceptance Testing**
1. Upload real-world documents
2. Test full workflows (upload → chat → quiz → TTS)
3. Gather feedback on quality

### 4.6 Success Criteria

**New Functionality:**
- ✅ .docx files convert to PDF and process via DUA
- ✅ .txt/.md files extract text and generate TTS
- ✅ All new file types have working TTS playback
- ✅ Error handling graceful for all failure modes

**Regression Prevention:**
- ✅ PDF processing identical to pre-implementation
- ✅ Image processing identical to pre-implementation
- ✅ TTS quality unchanged for existing file types
- ✅ Chat and quiz functionality unchanged

**Performance:**
- ✅ .docx conversion completes in <60 seconds for typical files
- ✅ .txt processing completes in <5 seconds
- ✅ No impact on PDF/image processing speed

---

## 5. Implementation Checklist

### Pre-Implementation
- [ ] Review and approve this plan
- [ ] Install LibreOffice on development environment
- [ ] Create feature branch: `feature/docx-txt-upload-support`
- [ ] Set up test documents library

### Implementation Phase
- [ ] Update `ALLOWED_EXTENSIONS` constants
- [ ] Add `TEXT_ONLY_EXTENSIONS` and `DOCX_EXTENSIONS` constants
- [ ] Implement .docx conversion logic
- [ ] Implement .txt/.md extraction logic
- [ ] Update DocumentRetrievalService
- [ ] Add error handling for all new code paths
- [ ] Add logging statements for debugging

### Testing Phase
- [ ] Run unit tests (Suite 1-2)
- [ ] Run regression tests (Suite 3-4)
- [ ] Run integration tests (Suite 5)
- [ ] Run edge case tests (Suite 6)
- [ ] Document any issues found
- [ ] Fix bugs and re-test

### Documentation Phase
- [ ] Create `SYSTEM_DEPENDENCIES.md`
- [ ] Update `README.md` with new file type support
- [ ] Document new Firestore status values
- [ ] Create deployment guide for LibreOffice installation

### Deployment Phase
- [ ] Install LibreOffice on staging server
- [ ] Deploy to staging environment
- [ ] Run smoke tests
- [ ] User acceptance testing
- [ ] Install LibreOffice on production server
- [ ] Deploy to production
- [ ] Monitor logs for errors

---

## 6. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| LibreOffice not available in production | Medium | High | Add deployment checklist, automated verification |
| .docx conversion quality issues | Medium | Medium | Extensive testing, fallback to manual conversion |
| Regression in PDF/image processing | Low | High | Comprehensive regression test suite |
| TTS generation fails for text files | Low | Medium | Non-blocking error handling, retry logic |
| Performance degradation | Low | Medium | Timeout limits, async processing consideration |
| Encoding issues with .txt files | Medium | Low | Multiple encoding fallbacks, clear error messages |

---

## 7. Future Enhancements

**Post-Implementation Considerations:**

1. **Async Processing:** Move .docx conversion to background task queue for better UX
2. **Progress Indicators:** Real-time status updates for long conversions
3. **Batch Upload:** Support multiple file uploads simultaneously
4. **Additional Formats:** .odt, .rtf, .epub support
5. **Conversion Quality Settings:** Allow users to choose conversion fidelity
6. **Preview Before Processing:** Show converted PDF preview before DUA processing

---

## 8. Conclusion

This implementation plan provides a comprehensive roadmap for adding `.docx` and `.txt` file support to LexiAid's document upload feature. The multi-tiered processing strategy ensures:

1. **Quality:** .docx files benefit from DUA's advanced analysis via PDF conversion
2. **Efficiency:** .txt files bypass unnecessary processing
3. **Reliability:** Existing PDF/image processing remains unchanged
4. **Maintainability:** Clear separation of concerns, extensive error handling
5. **Testability:** Comprehensive test coverage prevents regressions

**Next Steps:**
1. Review and approve this plan
2. Set up development environment with LibreOffice
3. Begin implementation following the checklist in Section 5
4. Execute testing strategy from Section 4

**Estimated Implementation Time:**
- Code implementation: 2-3 days
- Testing and bug fixes: 2-3 days
- Documentation: 1 day
- **Total: 5-7 days**

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-10  
**Status:** Ready for Review
