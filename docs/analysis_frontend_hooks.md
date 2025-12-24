# Frontend Hooks Analysis – Golden Source

> **Synthesized**: 2024-01-10  
> **Sources**: docs_Comp, docs2, docsGPT52, docsopus45thinking2  
> **Verified Against**: Actual codebase (`src/hooks/`)

---

## 1. Hook Inventory

| Hook | File | Purpose |
|------|------|---------|
| `useTTSPlayer` | `useTTSPlayer.ts` | TTS audio playback with word highlighting |
| `useRealtimeStt` | `useRealtimeStt.ts` | Real-time speech-to-text via WebSocket |

---

## 2. useTTSPlayer (`src/hooks/useTTSPlayer.ts`)

### Purpose
Manages TTS audio playback with support for:
- Pre-generated TTS assets (from document processing)
- On-demand synthesis (for chat messages, previews)
- Word-level timepoint tracking for highlighting

### Signature
```typescript
const useTTSPlayer = (documentId: string | null) => {
  // Returns player controls and state
};
```

### Return Value
```typescript
interface UseTTSPlayerReturn {
  playAudio: (options: PlayOptions) => Promise<void>;
  stopAudio: () => void;
  seekAndPlay: (timeInSeconds: number) => void;
  status: PlayerStatus;
  activeTimepoint: Timepoint | null;
  wordTimepoints: Timepoint[];
  error: string | null;
}

type PlayerStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

interface PlayOptions {
  text?: string;           // For on-demand synthesis
  audioContent?: string;   // Pre-generated base64 audio
  timepoints?: Timepoint[]; // Word timing data
}

interface Timepoint {
  mark_name: string;       // Word text
  time_seconds: number;    // Start time in audio
}
```

### Audio Source Resolution
1. **Pre-generated assets**: If `documentId` provided, fetches from `/api/documents/:id/tts-assets`
2. **Provided audio**: Uses `audioContent` from options
3. **On-demand synthesis**: Calls `/api/tts/synthesize` with text

### Playback Flow
```typescript
const playAudio = async (options: PlayOptions) => {
  setStatus('loading');
  
  // Resolve audio source
  let audioData: string;
  let timepoints: Timepoint[];
  
  if (options.audioContent && options.timepoints) {
    audioData = options.audioContent;
    timepoints = options.timepoints;
  } else if (documentId) {
    // Fetch pre-generated assets
    const assets = await fetchTTSAssets(documentId);
    audioData = assets.audio_content;
    timepoints = assets.timepoints;
  } else if (options.text) {
    // On-demand synthesis
    const result = await synthesizeSpeech({ text: options.text }, token);
    audioData = result.audio_data;
    timepoints = result.timepoints || [];
  }
  
  // Create and play audio
  const audio = new Audio(`data:audio/mp3;base64,${audioData}`);
  setWordTimepoints(timepoints);
  
  audio.ontimeupdate = () => {
    // Find active timepoint based on currentTime
    const active = findActiveTimepoint(audio.currentTime, timepoints);
    setActiveTimepoint(active);
  };
  
  audio.onended = () => {
    setStatus('idle');
    setActiveTimepoint(null);
  };
  
  await audio.play();
  setStatus('playing');
};
```

### Seek Functionality
```typescript
const seekAndPlay = (timeInSeconds: number) => {
  if (audioRef.current) {
    audioRef.current.currentTime = timeInSeconds;
    if (status !== 'playing') {
      audioRef.current.play();
      setStatus('playing');
    }
  }
};
```

### Timepoint Tracking
Finds the active word based on audio position:
```typescript
const findActiveTimepoint = (currentTime: number, timepoints: Timepoint[]) => {
  // Binary search or linear scan for timepoint at currentTime
  for (let i = timepoints.length - 1; i >= 0; i--) {
    if (timepoints[i].time_seconds <= currentTime) {
      return timepoints[i];
    }
  }
  return null;
};
```

---

## 3. useRealtimeStt (`src/hooks/useRealtimeStt.ts`)

### Purpose
Manages real-time speech-to-text via WebSocket connection to backend.

### Signature
```typescript
const useRealtimeStt = () => {
  // Returns STT controls and state
};
```

### Return Value
```typescript
interface UseRealtimeSttReturn {
  status: SttStatus;
  transcript: {
    final: string;    // Confirmed transcription
    interim: string;  // In-progress transcription
  };
  startDictation: () => void;
  stopDictation: () => void;
  stopAndPlay: () => string;  // Returns final transcript
  updateTranscript: (text: string) => void;
  error: string | null;
}

type SttStatus = 'idle' | 'connecting' | 'dictating' | 'review';
```

### WebSocket Connection
```typescript
const startDictation = async () => {
  setStatus('connecting');
  
  // Get auth token
  const token = await getAuthToken();
  
  // Connect to WebSocket
  const wsUrl = `${WS_BASE_URL}/api/stt/stream?token=${token}`;
  const ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    setStatus('dictating');
    startAudioCapture();
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.is_final) {
      setTranscript(prev => ({
        final: prev.final + data.transcript + ' ',
        interim: ''
      }));
    } else {
      setTranscript(prev => ({
        ...prev,
        interim: data.transcript
      }));
    }
  };
  
  ws.onerror = (error) => {
    setError('Connection error');
    setStatus('idle');
  };
  
  ws.onclose = () => {
    setStatus('review');
    stopAudioCapture();
  };
};
```

### Audio Capture
Uses Web Audio API and MediaRecorder:
```typescript
const startAudioCapture = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mediaRecorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm;codecs=opus'
  });
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(event.data);
    }
  };
  
  mediaRecorder.start(100); // Send chunks every 100ms
};
```

### Stop and Play
Convenience method for stopping dictation and returning transcript:
```typescript
const stopAndPlay = () => {
  stopDictation();
  const finalTranscript = transcript.final + transcript.interim;
  return finalTranscript.trim();
};
```

### Manual Transcript Update
For editing transcribed text:
```typescript
const updateTranscript = (text: string) => {
  setTranscript({
    final: text,
    interim: ''
  });
};
```

---

## 4. Hook Usage Patterns

### useTTSPlayer in Components

#### GeminiChatInterface
```typescript
// Two instances: one for messages, one for input preview
const {
  playAudio: playMessageAudio,
  stopAudio: stopMessageAudio,
  seekAndPlay: seekMessageAudio,
  status: messageStatus,
  activeTimepoint: messageActiveTimepoint,
  wordTimepoints: messageWordTimepoints,
} = useTTSPlayer(currentDocumentId || null);

const {
  playAudio: playPreviewAudio,
  stopAudio: stopPreviewAudio,
  status: previewStatus,
} = useTTSPlayer(null);  // No document, always on-demand
```

#### DocumentView
```typescript
const {
  playAudio,
  stopAudio,
  seekAndPlay,
  status,
  activeTimepoint,
  wordTimepoints,
} = useTTSPlayer(documentId);

// Play pre-generated document audio
await playAudio({});  // Uses documentId to fetch assets
```

### useRealtimeStt in Components

#### ChatInputBar
```typescript
const {
  status,
  transcript,
  startDictation,
  stopDictation,
  stopAndPlay,
  updateTranscript
} = useRealtimeStt();

// Combined transcript for display
const combinedTranscript = `${transcript.final}${transcript.interim}`;

// Handle microphone click
const handleMicrophoneClick = () => {
  if (status === 'idle' || status === 'review') {
    startDictation();
  }
};
```

#### AnswerFormulationPage
```typescript
const {
  status,
  transcript,
  startDictation,
  stopDictation,
} = useRealtimeStt();

// Auto-pause on speech pause (if enabled)
useEffect(() => {
  if (autoPauseEnabled && status === 'dictating') {
    // Monitor for pause in speech
    // Stop dictation after pauseDuration
  }
}, [status, autoPauseEnabled]);
```

---

## 5. WebSocket Endpoint

### Backend Route
```
/api/stt/stream
```

### Protocol
1. Client connects with auth token in query string
2. Client sends audio chunks (WebM/Opus format)
3. Server sends JSON messages:
   ```json
   {
     "transcript": "recognized text",
     "is_final": true|false
   }
   ```
4. Connection closes when client stops sending

### Security Note
**Risk**: WebSocket endpoint does not validate auth token in current implementation. The token is passed but not verified server-side.

---

## 6. Technical Debt

1. **No Token Validation**: STT WebSocket doesn't verify auth token
2. **Error Recovery**: Limited retry logic for WebSocket disconnections
3. **Browser Compatibility**: MediaRecorder codec support varies
4. **Memory Leaks**: Audio elements should be explicitly cleaned up
5. **Console Logging**: Debug logs in production code
