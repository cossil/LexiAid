# Frontend Services Analysis – Golden Source

> **Synthesized**: 2024-01-10  
> **Sources**: docs_Comp, docs2, docsGPT52, docsopus45thinking2  
> **Verified Against**: Actual codebase (`src/services/`, `src/utils/`)

---

## 1. Service Inventory

| Service | File | Purpose |
|---------|------|---------|
| `apiService` | `src/services/api.ts` | Centralized backend API client |
| TTS Utilities | `src/utils/ttsUtils.ts` | TTS synthesis and audio playback |

---

## 2. API Service (`src/services/api.ts`)

### Configuration
```typescript
const API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});
```

### Request Interceptor
Injects Firebase auth token automatically:
```typescript
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### API Methods Summary

| Category | Method | Endpoint |
|----------|--------|----------|
| Chat | `sendMessage` | `POST /api/v2/agent/chat` |
| Chat | `getChatHistory` | `GET /api/v2/agent/history` |
| Chat | `cancelQuiz` | `POST /api/v2/agent/cancel-quiz` |
| Documents | `getDocuments` | `GET /api/documents` |
| Documents | `getDocument` | `GET /api/documents/:id` |
| Documents | `uploadDocument` | `POST /api/documents/upload` |
| Documents | `deleteDocument` | `DELETE /api/documents/:id` |
| Documents | `getTTSAssets` | `GET /api/documents/:id/tts-assets` |
| TTS | `synthesizeSpeech` | `POST /api/tts/synthesize` |
| TTS | `getVoices` | `GET /api/tts/voices` |
| Users | `createUser` | `POST /api/users/create` |
| Users | `initializeUser` | `POST /api/users/initialize` |
| Users | `getUserProfile` | `GET /api/users/profile` |
| Users | `updateUserProfile` | `PUT /api/users/profile` |
| Users | `deleteUser` | `DELETE /api/users/delete` |
| Answer | `refineAnswer` | `POST /api/v2/answer-formulation/refine` |
| Answer | `editAnswer` | `POST /api/v2/answer-formulation/edit` |
| Admin | `getAdminStats` | `GET /api/admin/stats` |
| Admin | `listUsers` | `GET /api/admin/users` |
| Admin | `syncUsers` | `POST /api/admin/sync-users` |
| Admin | `getFeedbackReports` | `GET /api/admin/feedback` |
| Feedback | `submitFeedback` | `POST /api/feedback` |

---

## 3. TTS Utilities (`src/utils/ttsUtils.ts`)

### Types
```typescript
interface TTSOptions {
  text: string;
  voice_name?: string;
  speaking_rate?: number;
  pitch?: number;
}

interface TTSResult {
  audio_data: string;  // base64
  audio_format: string;
  metadata: { text_length, audio_size_bytes, voice_name, speaking_rate, pitch };
}
```

### Functions

| Function | Purpose |
|----------|---------|
| `synthesizeSpeech(options, token)` | Calls `/api/tts` for on-demand synthesis |
| `getAvailableVoices(langCode, token)` | Fetches available TTS voices |
| `playAudioFromBase64(data, format)` | Creates HTMLAudioElement from base64 |

---

## 4. Direct Axios Usage (Tech Debt)

Several pages bypass `apiService`:

| Page | Endpoints Used Directly |
|------|------------------------|
| `Dashboard.tsx` | `/api/documents`, `/api/users/profile` |
| `DocumentsList.tsx` | `/api/documents`, `DELETE /api/documents/:id` |
| `DocumentUpload.tsx` | `POST /api/documents/upload` |
| `DocumentView.tsx` | `/api/documents/:id` |

**Risk**: Inconsistent error handling, token refresh issues.

---

## 5. Technical Debt

1. **Duplicate API Calls**: Same endpoints accessed via both `apiService` and direct `axios`
2. **Inconsistent Error Handling**: Some use toast, others set error state
3. **No Response Type Safety**: Most methods return raw `AxiosResponse`
4. **Console Logging**: Debug logs in production code
