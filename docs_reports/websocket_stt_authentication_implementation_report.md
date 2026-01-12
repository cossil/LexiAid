# WebSocket STT Authentication Implementation Report

**Date:** January 12, 2026  
**Feature:** Security Hardening - WebSocket Authentication for STT Endpoint  
**Status:** ✅ Completed Successfully

---

## Executive Summary

Implemented mandatory Firebase token authentication for the real-time Speech-to-Text (STT) WebSocket endpoint (`/ws/stt/stream`). This security enhancement ensures that only authenticated users can establish WebSocket connections for voice dictation features, preventing unauthorized access to the STT service.

---

## Problem Statement

### Security Vulnerability Identified

The STT WebSocket endpoint was accepting all incoming connections without any form of authentication or validation. This created a security vulnerability where:

1. **Unauthorized Access:** Any client could connect to the WebSocket endpoint without proving their identity
2. **Resource Abuse:** Unauthenticated users could consume STT API resources (Google Cloud Speech-to-Text) without authorization
3. **Inconsistent Security:** While REST API endpoints were protected with the `@require_auth` decorator, the WebSocket endpoint had no equivalent protection

### Affected Files

| File | Role |
|------|------|
| `backend/app.py` | WebSocket route definition (`/ws/stt/stream`) |
| `backend/services/stt_service.py` | STT stream handler logic |
| `backend/services/auth_service.py` | Firebase authentication service |
| `src/hooks/useRealtimeStt.ts` | Frontend WebSocket connection hook |

---

## Research & Analysis Phase

### Key Questions Addressed

**Q1: Can we access Flask's `request` object inside a flask-sock WebSocket handler?**

**Answer:** Yes. Flask-sock allows access to the global Flask `request` object (including `request.args` for query parameters) during the WebSocket handshake phase, before the connection is fully established. This is the standard pattern for WebSocket authentication in Flask applications.

**Q2: How is `AuthService` structured? Static methods or instance methods?**

**Answer:** `AuthService` uses a singleton pattern with instance methods. The `verify_id_token(id_token: str)` method is an instance method that returns a tuple `(success: bool, user_data: Optional[Dict])`. The singleton instance is already initialized and available at `current_app.config['AUTH_SERVICE']` after application startup.

---

## Implementation Details

### Frontend Changes (`src/hooks/useRealtimeStt.ts`)

#### 1. Firebase Auth Import
```typescript
import { getAuth } from 'firebase/auth';
```

#### 2. Async Token Retrieval
The `connectWebSocket` function was modified to:
- Get the current Firebase user via `getAuth().currentUser`
- Retrieve the user's ID token asynchronously via `user.getIdToken()`
- Handle cases where no user is logged in with appropriate error messaging

#### 3. Token Transmission
The token is appended to the WebSocket URL as a query parameter:
```typescript
const wsUrl = `${normalizedOrigin}/ws/stt/stream?token=${encodeURIComponent(idToken)}`;
```

**Security Note:** The token is redacted in console logs to prevent accidental exposure:
```typescript
console.log('Connecting to WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=[REDACTED]'));
```

#### 4. Authentication Error Handling
Added specific handling for the custom close code `4001`:
```typescript
if (event.code === 4001) {
  setError('Authentication failed. Please log in again.');
  setStatus('idle');
  return;
}
```

### Backend Changes (`backend/app.py`)

#### Authentication Block Added to `stt_stream` Route

The following validation logic was inserted at the beginning of the WebSocket handler:

1. **Token Extraction:** `token = request.args.get('token')`
2. **Missing Token Check:** Close with code `4001` if no token provided
3. **AuthService Availability:** Close with code `1011` if service unavailable
4. **Token Validation:** Call `auth_service.verify_id_token(token)`
5. **Invalid Token Check:** Close with code `4001` if validation fails
6. **Success Logging:** Log the authenticated user ID

### WebSocket Close Codes Used

| Code | Meaning | Usage |
|------|---------|-------|
| `1011` | Internal Error | AuthService unavailable |
| `4001` | Authentication Failed | Missing/invalid/expired token |

> **Note:** Codes 4000-4999 are reserved for application-specific use per WebSocket protocol specification.

---

## Problems Encountered

### No Significant Issues

The implementation proceeded smoothly without major obstacles. The following factors contributed to the straightforward implementation:

1. **Well-Documented Libraries:** Flask-sock documentation confirmed that Flask's `request` object is accessible during the handshake phase
2. **Existing Patterns:** The `@require_auth` decorator in `backend/decorators/auth.py` provided a clear reference for how authentication should work
3. **Singleton Pattern:** `AuthService` was already instantiated and available in `app.config`, eliminating the need for any service initialization changes
4. **Clean Separation:** The STT handling logic in `stt_service.py` didn't need modification—authentication was cleanly inserted before the service is invoked

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WebSocket STT Authentication Flow                    │
└─────────────────────────────────────────────────────────────────────────────┘

  Frontend                    Firebase Auth               Backend
     │                             │                         │
     │  1. getIdToken()            │                         │
     │────────────────────────────>│                         │
     │                             │                         │
     │  2. Returns ID Token        │                         │
     │<────────────────────────────│                         │
     │                             │                         │
     │  3. WebSocket Connect: /ws/stt/stream?token=xxx       │
     │───────────────────────────────────────────────────────>│
     │                             │                         │
     │                             │  4. verify_id_token()   │
     │                             │<────────────────────────│
     │                             │                         │
     │                             │  5. (success, user_data)│
     │                             │────────────────────────>│
     │                             │                         │
     │  6a. [SUCCESS] Connection Established                 │
     │<───────────────────────────────────────────────────────│
     │                             │                         │
     │  6b. [FAILURE] Close(4001, "Auth failed")             │
     │<───────────────────────────────────────────────────────│
     │                             │                         │
```

---

## Testing & Validation

### Test Scenarios

| Scenario | Expected Behavior | Result |
|----------|-------------------|--------|
| Authenticated user starts dictation | WebSocket connects, STT works | ✅ Pass |
| Unauthenticated user attempts dictation | Error: "User not authenticated" | ✅ Pass |
| Expired/invalid token | WebSocket closes with code 4001 | ✅ Pass |
| Missing token (direct API call) | WebSocket closes with code 4001 | ✅ Pass |

### Log Output Examples

**Successful Authentication:**
```
INFO: WebSocket STT connection authenticated for user: abc123xyz
INFO: WebSocket connection established for STT.
```

**Failed Authentication (missing token):**
```
WARNING: WebSocket STT connection rejected: Missing authentication token.
```

**Failed Authentication (invalid token):**
```
WARNING: WebSocket STT connection rejected: Invalid or expired token.
```

---

## Security Considerations

### Token in URL Query Parameters

The authentication token is passed as a URL query parameter, which has some implications:

1. **Server Logs:** Tokens may appear in server access logs. Consider log redaction in production.
2. **Browser History:** WebSocket URLs are not typically stored in browser history, but the token should still be treated as sensitive.
3. **TLS Required:** Always use `wss://` (WebSocket Secure) in production to encrypt the connection and protect the token in transit.

### Mitigations Implemented

- Frontend logs redact the token: `token=[REDACTED]`
- Firebase tokens are short-lived (1 hour expiry)
- Token refresh is handled automatically by Firebase SDK

---

## Files Modified

| File | Lines Changed | Description |
|------|---------------|-------------|
| `src/hooks/useRealtimeStt.ts` | +35, -4 | Added auth import, async token retrieval, 4001 handling |
| `backend/app.py` | +33 | Added authentication validation block |

---

## Conclusion

The WebSocket STT authentication feature was successfully implemented with no significant issues. The endpoint is now protected by the same Firebase authentication used by all other API endpoints, ensuring consistent security across the application.

### Key Achievements

1. ✅ WebSocket endpoint now requires valid Firebase authentication
2. ✅ Unauthorized connections are immediately rejected with appropriate error codes
3. ✅ User-friendly error messages displayed on authentication failure
4. ✅ Authenticated user ID is logged for audit purposes
5. ✅ Implementation follows existing patterns in the codebase

---

*Report generated: January 12, 2026*
