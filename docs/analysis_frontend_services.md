# Analysis: Frontend Services

> **Directory**: [src/services/](file:///C:/Ai/aitutor_37/src/services/)  
> **Count**: 1 service file  
> **Status**: [Active]  
> **Verified**: 2026-01-09

---

## Service Inventory

| File | Purpose | Status |
|------|---------|--------|
| [api.ts](file:///C:/Ai/aitutor_37/src/services/api.ts) | Centralized API client | [Active] |

---

## api.ts

### Purpose
Provides typed API methods for all backend endpoints.

### Configuration

```tsx
const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8081';
```

> [!NOTE]
> Default port is `8081` for local development, but production uses `VITE_BACKEND_API_URL`.

### Auth Header Injection

All authenticated requests include:
```tsx
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

Token retrieved via `getAuthToken()` from `AuthContext`.

---

## API Methods

### Document Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `getDocuments()` | `GET /api/documents` | List user documents |
| `getDocument(id)` | `GET /api/documents/{id}` | Get document details |
| `uploadDocument(file)` | `POST /api/documents/upload` | Upload file |
| `deleteDocument(id)` | `DELETE /api/documents/{id}` | Delete document |
| `getTtsAssets(id)` | `GET /api/documents/{id}/tts-assets` | Get TTS signed URLs |

### TTS Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `synthesizeText(text)` | `POST /api/tts/synthesize` | On-demand TTS |

### Chat Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `sendChatMessage(msg)` | `POST /api/v2/agent/chat` | Send chat/quiz message |
| `getChatHistory(threadId)` | `GET /api/v2/agent/history` | Get conversation history |

### Answer Formulation

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `refineAnswer(data)` | `POST /api/v2/answer-formulation/refine` | Refine transcript |
| `editAnswer(data)` | `POST /api/v2/answer-formulation/edit` | Apply edit command |

### User Operations

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `initUser()` | `POST /api/users/init` | Initialize user profile |
| `getProfile()` | `GET /api/users/profile` | Get user profile |
| `updateProfile(data)` | `PUT /api/users/profile` | Update preferences |

### Feedback

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `submitFeedback(data)` | `POST /api/feedback` | Submit feedback |

### Admin (Requires admin role)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `getAdminStats()` | `GET /api/admin/stats` | System statistics |
| `getAdminUsers()` | `GET /api/admin/users` | List all users |
| `getAdminFeedback()` | `GET /api/admin/feedback` | List all feedback |

---

## Error Handling

```tsx
try {
  const response = await axios.get(url, config);
  return response.data;
} catch (error) {
  if (axios.isAxiosError(error)) {
    throw new Error(error.response?.data?.error || error.message);
  }
  throw error;
}
```

Axios errors are transformed into user-friendly messages.
