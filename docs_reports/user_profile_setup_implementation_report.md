# User Profile Setup Implementation Report

**Date:** January 12, 2026  
**Author:** Development Team  
**Status:** ✅ Resolved

---

## Executive Summary

This report documents the implementation of a mandatory User Profile Setup feature for LexiAid, including the significant debugging effort required to resolve data persistence issues between the frontend and backend systems.

---

## 1. Feature Overview

### 1.1 Objective

Implement a mandatory user profile setup flow that:
- Collects essential user information upon first login
- Stores profile data persistently in Firebase Firestore
- Prevents users from accessing the main application until setup is complete
- Recognizes returning users who have already completed setup

### 1.2 Collected Information

| Field | Type | Purpose |
|-------|------|---------|
| `dateOfBirth` | String (YYYY-MM-DD) | Age-appropriate content adaptation |
| `schoolContext` | String (enum) | Educational level customization |
| `visualImpairment` | Boolean | Accessibility feature toggles |
| `adaptToAge` | Boolean | Age-based UI/content adaptation |

### 1.3 Components Modified/Created

| File | Type | Changes |
|------|------|---------|
| `src/components/ProfileSetupModal.tsx` | New | Modal UI for collecting profile data |
| `src/contexts/AuthContext.tsx` | Modified | Added `isProfileComplete` state and `updateProfileDetails` method |
| `src/App.tsx` | Modified | Integrated modal as gatekeeper before main routes |
| `backend/routes/user_routes.py` | Modified | Extended profile update endpoint to handle new fields |

---

## 2. Implementation Details

### 2.1 Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  AuthProvider (AuthContext)                             ││
│  │    - currentUser                                        ││
│  │    - isProfileComplete (NEW)                            ││
│  │    - updateProfileDetails() (NEW)                       ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │  ProfileSetupModal (NEW)                            │││
│  │  │    - Renders if isProfileComplete === false         │││
│  │  │    - Non-closable (mandatory)                       │││
│  │  │    - Calls updateProfileDetails() on submit         │││
│  │  └─────────────────────────────────────────────────────┘││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │  Main Application Routes                            │││
│  │  │    - Only accessible when isProfileComplete === true│││
│  │  └─────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Backend API

**Endpoint:** `PUT /api/users/profile`

**Payload:**
```json
{
  "dateOfBirth": "1990-01-15",
  "schoolContext": "Adult Learner",
  "visualImpairment": false,
  "adaptToAge": true
}
```

**Storage Location:** Root level of Firestore `users/{uid}` document

### 2.3 Profile Completion Logic

```typescript
// In AuthContext.tsx onAuthStateChanged
const hasDOB = !!userData.dateOfBirth;
const hasSchool = !!userData.schoolContext;
const complete = hasDOB && hasSchool;
setIsProfileComplete(complete);
```

---

## 3. Problems Encountered

### 3.1 Problem #1: Data Not Persisting (Initial)

**Symptom:** Profile setup modal reappeared after every login, even after successful form submission.

**Investigation:**
- Backend logs showed `PUT /api/users/profile` returning 200 (success)
- Frontend logs showed correct payload being sent
- But subsequent `GET` requests returned data without the profile fields

**Root Cause Hypothesis:** Pydantic alias mapping issue in `UserUpdateRequest` model.

### 3.2 Problem #2: Database Mismatch

**Symptom:** Backend confirmed data was saved (read-back verification passed), but frontend could not see it.

**Investigation:**
- Added read-back verification in backend: `dob=1969-09-23, school=Adult Learner` ✅
- Frontend `getDoc()` returned data WITHOUT these fields

**Root Cause:** 
- Backend was writing to named database `ai-tutor-dev-457802`
- Frontend was reading from `default` database (fallback in `config.ts`)

### 3.3 Problem #3: Permission Error After Database Fix

**Symptom:** After aligning database names, frontend threw `FirebaseError: Missing or insufficient permissions`

**Root Cause:** Firestore Security Rules were only deployed to `(default)` database, not the named database.

### 3.4 Problem #4: Modal Appearing for Existing Users

**Symptom:** After switching to API-based profile fetch, the modal appeared for users who had already completed setup.

**Root Cause:** Response parsing bug - `apiService.getUserProfile()` returns data directly, but `AuthContext` was checking `response.data` (expecting a wrapper).

---

## 4. Debugging Attempts & Solutions

### 4.1 Attempt #1: Bypass Pydantic Aliases

**Action:** Modified `user_routes.py` to read directly from `request.json` instead of relying on Pydantic alias mapping.

```python
# Before
if data.date_of_birth:
    updates['dateOfBirth'] = data.date_of_birth

# After
raw_data = request.json or {}
if 'dateOfBirth' in raw_data:
    updates['dateOfBirth'] = raw_data['dateOfBirth']
```

**Result:** Partial success - backend confirmed save, but frontend still couldn't read.

### 4.2 Attempt #2: Add Read-Back Verification

**Action:** Added immediate read-back after Firestore update to verify persistence.

```python
updated_doc = firestore_svc.get_user(user_id)
print(f"DEBUG: Read-back: dob={updated_doc.get('dateOfBirth')}")
```

**Result:** Confirmed backend was saving correctly. Issue narrowed to frontend read.

### 4.3 Attempt #3: Fix Database Name Mismatch ✅

**Action:** Updated `src/firebase/config.ts` to use consistent database name.

```typescript
// Before
import.meta.env.VITE_FIREBASE_DATABASE_NAME || 'default'

// After
import.meta.env.VITE_FIREBASE_DATABASE_NAME || 'ai-tutor-dev-457802'
```

**Result:** Exposed permission error (security rules not on named DB).

### 4.4 Attempt #4: Switch to API-Based Profile Fetch ✅

**Action:** Replaced direct Firestore `getDoc()` with `apiService.getUserProfile()` in `AuthContext`.

```typescript
// Before (direct Firestore access)
const userDocRef = doc(firestore, 'users', user.uid);
const userDoc = await getDoc(userDocRef);
const userData = userDoc.data();

// After (API-based)
const profileData = await apiService.getUserProfile();
const userData = profileData;
```

**Benefits:**
- Bypasses security rules (backend has admin access)
- Ensures single source of truth
- Cleaner architecture (frontend doesn't access DB directly)

**Result:** Resolved permission error, but introduced parsing bug.

### 4.5 Attempt #5: Fix Response Parsing ✅

**Action:** Corrected response handling in `AuthContext`.

```typescript
// Before (incorrect - checking for wrapper)
const response = await apiService.getUserProfile();
if (response && response.data) {
    userData = response.data;
}

// After (correct - API returns data directly)
const profileData = await apiService.getUserProfile();
if (profileData && Object.keys(profileData).length > 0) {
    userData = profileData;
}
```

**Result:** ✅ Full resolution - profile persistence working correctly.

---

## 5. Final Solution Summary

The final working solution involved three key changes:

### 5.1 Backend Changes (`user_routes.py`)

- Explicit handling of raw JSON payload for onboarding fields
- Read-back verification for debugging
- Consistent field naming (camelCase)

### 5.2 Frontend Configuration (`firebase/config.ts`)

- Aligned named database ID with backend: `ai-tutor-dev-457802`

### 5.3 Frontend Architecture (`AuthContext.tsx`)

- Replaced direct Firestore access with API call
- Fixed response parsing to match API return format
- Removed unused Firestore imports

---

## 6. Lessons Learned

| Issue | Lesson |
|-------|--------|
| Database mismatch | Always verify both frontend and backend are connecting to the same database instance |
| Pydantic aliases | When using aliases, verify both directions (serialization and deserialization) work correctly |
| Security rules | Named databases require separate security rule deployments |
| API response parsing | Always verify the actual return type of API methods before using |
| Direct DB access | Consider API-first architecture to avoid permission complexity |

---

## 7. Testing Checklist

- [x] New user sees profile setup modal on first login
- [x] Modal cannot be dismissed without completing form
- [x] Form submission successfully saves to Firestore
- [x] Returning user (completed profile) does NOT see modal
- [x] Profile data persists across sessions
- [x] Google Sign-In flow works correctly
- [x] Email/Password Sign-In flow works correctly

---

## 8. Files Changed

| File | Changes |
|------|---------|
| `src/components/ProfileSetupModal.tsx` | New component |
| `src/contexts/AuthContext.tsx` | Added profile state, API-based fetch |
| `src/App.tsx` | Integrated ProfileSetupModal |
| `src/firebase/config.ts` | Fixed database name fallback |
| `backend/routes/user_routes.py` | Extended profile endpoint, added debugging |
| `backend/services/firestore_service.py` | Added debug logging |

---

## 9. Recommendations for Future

1. **Deploy Security Rules to Named Database:** If direct frontend Firestore access is needed in the future, ensure rules are deployed to the specific database.

2. **Environment Variable Audit:** Ensure `VITE_FIREBASE_DATABASE_NAME` is consistently set across all environments.

3. **Add Automated Tests:** Create integration tests for the profile setup flow to catch regressions.

4. **Remove Debug Logging:** Clean up temporary `console.log` and `print` statements added during debugging.

---

*Report generated: January 12, 2026*
