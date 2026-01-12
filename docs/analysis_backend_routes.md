# Analysis: Backend Routes

> **Directory**: [backend/routes/](file:///C:/Ai/aitutor_37/backend/routes/)  
> **Status**: [Active] - Flask Blueprint route handlers  
> **Verified**: 2026-01-09

---

## Route Map

| Blueprint | Prefix | File | Lines |
|-----------|--------|------|-------|
| `document_bp` | `/api/documents` | [document_routes.py](file:///C:/Ai/aitutor_37/backend/routes/document_routes.py) | 579 |
| `tts_bp` | `/api/tts` | [tts_routes.py](file:///C:/Ai/aitutor_37/backend/routes/tts_routes.py) | ~100 |
| `stt_bp` | `/api/stt` | [stt_routes.py](file:///C:/Ai/aitutor_37/backend/routes/stt_routes.py) | ~80 |
| `user_bp` | `/api/users` | [user_routes.py](file:///C:/Ai/aitutor_37/backend/routes/user_routes.py) | 309 |
| `progress_bp` | `/api/progress` | [progress_routes.py](file:///C:/Ai/aitutor_37/backend/routes/progress_routes.py) | ~150 |
| `answer_formulation_bp` | `/api/v2/answer-formulation` | [answer_formulation_routes.py](file:///C:/Ai/aitutor_37/backend/routes/answer_formulation_routes.py) | 268 |
| `feedback_bp` | `/api/feedback` | [feedback_routes.py](file:///C:/Ai/aitutor_37/backend/routes/feedback_routes.py) | ~120 |
| `admin_bp` | `/api/admin` | [admin_routes.py](file:///C:/Ai/aitutor_37/backend/routes/admin_routes.py) | 257 |

---

## Auth Decorator Verification ✅

### Standard Routes
All use `@require_auth` from `backend.decorators.auth`:

| File | Import Line | Usage |
|------|-------------|-------|
| `document_routes.py` | Line 19 | Lines 53, 351, 407, 431, 507, 538 |
| `answer_formulation_routes.py` | Line 14 | Lines 23, 139 |
| `admin_routes.py` | Line 14 | Lines 20, 53, 128, 195 |

### Admin Routes
Use BOTH `@require_auth` AND `@require_admin` (stacked):

```python
# admin_routes.py lines 19-22
@admin_bp.route('/stats', methods=['GET'])
@require_auth
@require_admin
def get_admin_stats():
```

---

## Document Routes (579 lines)

### Endpoints

| Method | Path | Protection | Purpose |
|--------|------|------------|---------|
| POST | `/upload` | `@require_auth` | Upload + DUA/text processing |
| DELETE | `/<document_id>` | `@require_auth` | Delete document + GCS file |
| GET | `/` | `@require_auth` | List user's documents |
| GET | `/<document_id>` | `@require_auth` | Get document details |
| GET | `/<document_id>/download` | `@require_auth` | Download original file |
| GET | `/<document_id>/tts-assets` | `@require_auth` | Get signed URLs for TTS |

### OCR Status Verification ✅

**Lines 286-305** - OCR is DEPRECATED:
```python
if should_run_ocr:
    current_app.logger.warning(f"OCR functionality has been deprecated...")
    final_fs_update_payload['status'] = 'ocr_unavailable'
```

### File Type Processing

| Extensions | Processing Path |
|-----------|----------------|
| `pdf`, `png`, `jpg`, `jpeg` | DUA (Document Understanding Agent) |
| `docx`, `txt`, `md` | Native text extraction |
| Other | Marked as `ocr_unavailable` |

---

## Answer Formulation Routes (268 lines)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/refine` | Refine spoken transcript |
| POST | `/edit` | Apply voice edit command |

### Response Schema

```json
{
    "refined_answer": "string",
    "session_id": "uuid",
    "status": "refined|error",
    "fidelity_score": 0.95,
    "iteration_count": 1,
    "audio_content_base64": "...",
    "timepoints": [...]
}
```

---

## Admin Routes (257 lines)

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/stats` | System statistics |
| GET | `/users` | Paginated user list |
| GET | `/feedback` | All feedback reports |
| POST | `/users/sync` | Sync Auth → Firestore profiles |

### Security Verification ✅

All endpoints require both `@require_auth` AND `@require_admin`.

---

## User Routes (309 lines)

### Endpoints

| Method | Path | Protection | Purpose |
|--------|------|------------|---------|
| POST | `/` | None | Create user (Auth + Firestore) |
| DELETE | `/` | Token in header | Delete user and all data |
| POST | `/init` | Token in header | Initialize profile (Google Sign-In) |
| PUT | `/profile` | Token in header | Update preferences |
| GET | `/profile` | Token in header | Get profile data |
| POST | `/verify-email` | Token in header | Generate verification link |

### Data Healing Verification ✅

**Line 161**:
```python
created = firestore_svc.ensure_user_profile(user_id, email, display_name)
```

### Pydantic Models

- `UserPreferences` (line 9): Visual + TTS + Answer Formulation settings
- `UserCreateRequest` (line 37): Email, password, display_name
- `UserUpdateRequest` (line 42): Optional display_name + preferences

---

## Known Issues

> [!WARNING]
> **Inconsistent Auth Patterns**  
> `user_routes.py` manually extracts tokens instead of using `@require_auth`:
> ```python
> token = request.headers.get('Authorization', '').replace('Bearer ', '')
> ```
> Consider refactoring to use the decorator for consistency.

> [!NOTE]
> **Duplicate TTS Route**  
> `app.py` lines 741-797 duplicate TTS synthesis functionality from `tts_routes.py`.
