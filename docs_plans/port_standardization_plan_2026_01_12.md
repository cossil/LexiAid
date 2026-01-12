# Port Standardization Plan

**Date:** 2026-01-12  
**Status:** ✅ Implemented  
**Priority:** High  

---

## Executive Summary

The frontend codebase contains **inconsistent fallback port configurations** for the backend API URL. Some files default to port `8081`, others to `8000`, but the **production VPS configuration uses port `5000`**. This plan standardizes all fallback URLs to `http://localhost:5000`.

---

## Problem Statement

When the `VITE_BACKEND_API_URL` environment variable is not set, the frontend falls back to hardcoded localhost URLs. These fallback ports are inconsistent:

| Current Port | Files Affected | Issue |
|--------------|----------------|-------|
| `8081` | `DocumentView.tsx` | Incorrect - doesn't match any backend config |
| `8000` | `api.ts`, `ttsUtils.ts`, `Dashboard.tsx`, `DocumentsList.tsx` | Incorrect - doesn't match VPS config |
| `5000` | None (target) | **Correct** - matches VPS Dockerfile |

---

## Evidence: VPS Production Configuration

### Dockerfile_VPS (Lines 84, 88, 99)

```dockerfile
# Line 84: Port exposure
EXPOSE 5000

# Line 88: Health check
CMD python -c "import requests; requests.get('http://localhost:5000/health', timeout=5)"

# Line 99: Gunicorn binding
"--bind", "0.0.0.0:5000",
```

### docker-compose.yml (VPS - Lines 50, 54)

```yaml
# Line 50: Traefik load balancer
- "traefik.http.services.lexiaid_backend.loadbalancer.server.port=5000"

# Line 54: Health check
test: ["CMD", "python", "-c", "import requests; requests.get('http://localhost:5000/health', timeout=5)"]
```

---

## Files Requiring Changes

### 1. DocumentView.tsx (Port 8081 → 5000)

**File:** `src/pages/DocumentView.tsx`

| Line | Current Code |
|------|--------------|
| 84 | `const apiUrl = import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8081';` |
| 122 | `const apiUrl = import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8081';` |

**Change:**
```diff
- const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8081';
+ const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';
```

---

### 2. api.ts (Port 8000 → 5000)

**File:** `src/services/api.ts`

| Line | Current Code |
|------|--------------|
| 13 | `baseURL: import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8000',` |
| 84 | `${import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8000'}/api/v2/agent/chat` |

**Change:**
```diff
- baseURL: import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000',
+ baseURL: import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000',
```

---

### 3. ttsUtils.ts (Port 8000 → 5000)

**File:** `src/utils/ttsUtils.ts`

| Line | Current Code |
|------|--------------|
| 62 | `const apiUrl = import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8000';` |
| 106 | `const apiUrl = import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8000';` |

**Change:**
```diff
- const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
+ const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';
```

---

### 4. Dashboard.tsx (Port 8000 → 5000)

**File:** `src/pages/Dashboard.tsx`

| Line | Current Code |
|------|--------------|
| 62 | `const apiUrl = import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8000';` |
| 116 | `const apiUrl = import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8000';` |

**Change:**
```diff
- const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
+ const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';
```

---

### 5. DocumentsList.tsx (Port 8000 → 5000)

**File:** `src/pages/DocumentsList.tsx`

| Line | Current Code |
|------|--------------|
| 66 | `const apiUrl = import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8000';` |
| 157 | `const apiUrl = import.meta.env.VITE_BACKEND_API_URL \|\| 'http://localhost:8000';` |

**Change:**
```diff
- const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';
+ const apiUrl = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000';
```

---

## Implementation Approach

### Phase 1: Code Changes

1. Update all 5 files listed above
2. Change 10 total line occurrences (2 per file)
3. Use consistent pattern: `import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:5000'`

### Phase 2: Verification

1. **Search verification:** Run `grep -r "8081\|8000" src/` to confirm no remaining incorrect ports
2. **Build test:** Run `npm run build` to ensure no compilation errors
3. **Local test:** Start backend on port 5000, verify frontend connects without `VITE_BACKEND_API_URL` set

### Phase 3: Documentation Update

Update any documentation files that reference the incorrect ports:
- `docs/analysis_frontend_main.md` (line 45)
- `docs/analysis_frontend_services.md` (lines 26, 30)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking local dev | Low | Medium | Developers must run backend on port 5000 or set `VITE_BACKEND_API_URL` |
| Missing occurrences | Low | High | Comprehensive grep search before/after |
| Production impact | None | N/A | Production always uses `VITE_BACKEND_API_URL` env var |

---

## Summary of Changes

| Metric | Count |
|--------|-------|
| Files to modify | 5 |
| Lines to change | 10 |
| Port 8081 → 5000 | 2 occurrences |
| Port 8000 → 5000 | 8 occurrences |

---

## Approval

- [x] Plan reviewed and approved
- [x] Implementation complete
- [x] Verification complete
- [ ] Documentation updated
