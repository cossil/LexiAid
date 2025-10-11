# Python 3.11 F-String Compatibility Fix Plan

## Executive Summary

This document outlines the plan to fix all instances of `SyntaxError: f-string expression part cannot include a backslash` in the LexiAid backend codebase. This error occurs because the code was developed with Python 3.12 (which allows backslashes in f-string expressions) but the Docker production environment runs Python 3.11 (which does not).

## Problem Description

Python 3.11 does not allow backslash characters within f-string expressions. The following pattern causes a SyntaxError:

```python
# ❌ INVALID in Python 3.11
logging.debug(f"Text: {variable.replace('\n', '[NEWLINE]')}")
```

The fix is to extract the string operation into a separate variable before the f-string:

```python
# ✅ VALID in Python 3.11
sanitized_text = variable.replace('\n', '[NEWLINE]')
logging.debug(f"Text: {sanitized_text}")
```

## Affected Files Summary

- **File 1:** `backend/utils/text_utils.py` - 4 occurrences
- **File 2:** `backend/services/tts_service.py` - 4 occurrences

**Total:** 8 occurrences across 2 files

---

## Detailed Fix Plan

### File 1: `backend/utils/text_utils.py`

#### Occurrence 1 - Line 29

**Location:** Function `sanitize_text_for_tts()`, input logging section

**Before:**
```python
logging.debug(f"TTS_TRACE: SANITIZER INPUT - First 100 chars: {text[:100].replace('\n', '[NEWLINE]')}")
```

**After:**
```python
input_first_100 = text[:100].replace('\n', '[NEWLINE]')
logging.debug(f"TTS_TRACE: SANITIZER INPUT - First 100 chars: {input_first_100}")
```

---

#### Occurrence 2 - Line 30

**Location:** Function `sanitize_text_for_tts()`, input logging section

**Before:**
```python
logging.debug(f"TTS_TRACE: SANITIZER INPUT - Last 100 chars: {text[-100:].replace('\n', '[NEWLINE]')}")
```

**After:**
```python
input_last_100 = text[-100:].replace('\n', '[NEWLINE]')
logging.debug(f"TTS_TRACE: SANITIZER INPUT - Last 100 chars: {input_last_100}")
```

---

#### Occurrence 3 - Line 99

**Location:** Function `sanitize_text_for_tts()`, output logging section

**Before:**
```python
logging.debug(f"TTS_TRACE: SANITIZER OUTPUT - First 100 chars: {result[:100].replace('\n', '[NEWLINE]')}")
```

**After:**
```python
output_first_100 = result[:100].replace('\n', '[NEWLINE]')
logging.debug(f"TTS_TRACE: SANITIZER OUTPUT - First 100 chars: {output_first_100}")
```

---

#### Occurrence 4 - Line 100

**Location:** Function `sanitize_text_for_tts()`, output logging section

**Before:**
```python
logging.debug(f"TTS_TRACE: SANITIZER OUTPUT - Last 100 chars: {result[-100:].replace('\n', '[NEWLINE]')}")
```

**After:**
```python
output_last_100 = result[-100:].replace('\n', '[NEWLINE]')
logging.debug(f"TTS_TRACE: SANITIZER OUTPUT - Last 100 chars: {output_last_100}")
```

---

### File 2: `backend/services/tts_service.py`

#### Occurrence 5 - Line 116

**Location:** Method `_chunk_text()`, input logging section

**Before:**
```python
logging.debug(f"TTS_TRACE: CHUNKER INPUT - First 100 chars: {text[:100].replace('\n', '[NEWLINE]')}")
```

**After:**
```python
chunker_input_first_100 = text[:100].replace('\n', '[NEWLINE]')
logging.debug(f"TTS_TRACE: CHUNKER INPUT - First 100 chars: {chunker_input_first_100}")
```

---

#### Occurrence 6 - Line 117

**Location:** Method `_chunk_text()`, input logging section

**Before:**
```python
logging.debug(f"TTS_TRACE: CHUNKER INPUT - Last 100 chars: {text[-100:].replace('\n', '[NEWLINE]')}")
```

**After:**
```python
chunker_input_last_100 = text[-100:].replace('\n', '[NEWLINE]')
logging.debug(f"TTS_TRACE: CHUNKER INPUT - Last 100 chars: {chunker_input_last_100}")
```

---

#### Occurrence 7 - Line 269

**Location:** Method `synthesize_text()`, nested function `_build_ssml_and_map()`, SSML builder logging section

**Before:**
```python
logging.debug(f"TTS_TRACE: SSML_BUILDER - First 100 chars: {plain_text[:100].replace('\n', '[NEWLINE]')}")
```

**After:**
```python
ssml_input_first_100 = plain_text[:100].replace('\n', '[NEWLINE]')
logging.debug(f"TTS_TRACE: SSML_BUILDER - First 100 chars: {ssml_input_first_100}")
```

---

#### Occurrence 8 - Line 270

**Location:** Method `synthesize_text()`, nested function `_build_ssml_and_map()`, SSML builder logging section

**Before:**
```python
logging.debug(f"TTS_TRACE: SSML_BUILDER - Last 100 chars: {plain_text[-100:].replace('\n', '[NEWLINE]')}")
```

**After:**
```python
ssml_input_last_100 = plain_text[-100:].replace('\n', '[NEWLINE]')
logging.debug(f"TTS_TRACE: SSML_BUILDER - Last 100 chars: {ssml_input_last_100}")
```

---

## Implementation Strategy

1. **Fix Order:** Apply fixes in the order listed above (file by file)
2. **Testing:** After applying all fixes, test the backend startup in the Docker environment
3. **Verification:** Confirm no SyntaxError occurs and logging still functions correctly
4. **Variable Naming:** Use descriptive variable names that indicate:
   - The source (input/output/chunker/ssml)
   - The position (first_100/last_100)
   - This makes debugging easier and code more maintainable

## Risk Assessment

- **Risk Level:** Low
- **Impact:** These changes only affect logging statements and do not alter business logic
- **Reversibility:** High - changes are isolated and can be easily reverted if needed
- **Testing Required:** Minimal - verify backend starts successfully and logs are generated

## Success Criteria

1. ✅ Backend Docker container starts without SyntaxError
2. ✅ All logging statements execute successfully
3. ✅ Log output remains readable and informative
4. ✅ No regression in TTS functionality

## Notes

- All affected code is in logging/debugging statements only
- No business logic is modified
- The fix maintains the same information in logs
- Variable names are chosen to be self-documenting

---

**Status:** Awaiting approval to proceed with implementation

**Created:** 2025-10-11  
**Author:** Cascade AI Assistant
