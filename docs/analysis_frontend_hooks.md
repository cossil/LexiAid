# Frontend Hooks Analysis

## File: `src/hooks/useTTSPlayer.ts`

### Purpose
Manage TTS audio playback with synchronized word highlighting for documents.

### State
- `status`: 'idle' | 'loading' | 'playing' | 'paused'
- `activeTimepoint`: Current word being spoken
- `wordTimepoints`: Array of word timing data
- `error`: Error message if playback fails

### Key Functions

#### `playAudio()`
- **Purpose**: Load and play TTS audio
- **Strategy**:
  1. **Pre-generated Assets** (if documentId exists):
     - Fetches from `/api/documents/{id}/tts-assets`
     - Gets audio_url and timepoints_url
     - Downloads both files
  2. **On-demand Synthesis** (fallback or no documentId):
     - Calls `/api/tts/synthesize` with fullText
     - Receives base64 audio + timepoints
     - Creates blob URL from base64
- **Audio Events**:
  - `ontimeupdate`: Updates activeTimepoint based on currentTime
  - `onended`: Cleanup and reset to idle
  - `onerror`: Error handling and cleanup
- **Pending Seek**: Applies seekToTimeRef if set

#### `stopAudio()`
- **Purpose**: Stop playback and cleanup
- **Actions**:
  - Pauses audio
  - Revokes blob URL
  - Resets state to idle
  - Clears timepoints and active highlight

#### `seekAndPlay(timeInSeconds)`
- **Purpose**: Jump to specific time in audio
- **Logic**:
  - If playing/paused: Set currentTime directly
  - If idle: Store seek time, then start playback

### Timepoint Synchronization
- Iterates through timepoints array during playback
- Finds current word based on audio.currentTime
- Updates activeTimepoint when word changes
- Uses lastHighlightedTimepointRef to prevent duplicate updates

### Cleanup
- useEffect cleanup on unmount calls stopAudio()

---

## File: `src/hooks/useChatTTSPlayer.ts`

### Purpose
TTS player for chat messages with embedded audio/timepoints.

### Difference from useTTSPlayer
- Designed for chat messages (not documents)
- Expects audio_content_base64 and timepoints in message object
- No pre-generated asset fetching
- Simpler state management

### Key Functions
- `playMessageAudio(message)`: Play specific message's audio
- `stopAudio()`: Stop current playback
- Similar timepoint synchronization logic

---

## File: `src/hooks/useOnDemandTTSPlayer.ts`

### Purpose
On-demand TTS synthesis for user messages.

### Features
- **Synthesis**: Calls `/api/tts/synthesize` with text
- **Playback**: Creates audio from base64 response
- **Timepoints**: Manages word-level timing
- **State**: 'idle' | 'loading' | 'playing' | 'error' | 'paused'

### Use Case
- User messages in chat (don't have pre-generated audio)
- Preview text before sending

---

## File: `src/hooks/useRealtimeStt.ts`

### Purpose
Real-time speech-to-text using WebSocket streaming.

### State
- `status`: SttStatus enum
  - 'idle', 'connecting', 'listening', 'processing', 'review', 'error'
- `transcript`: { final: string, interim: string }
- `error`: Error message

### Key Functions

#### `startDictation()`
- **Purpose**: Begin voice input
- **Process**:
  1. Requests microphone permission
  2. Connects to WebSocket `/api/stt/stream`
  3. Starts MediaRecorder (webm/opus format)
  4. Sends audio chunks to WebSocket
  5. Receives transcript updates
- **Audio Config**: 16kHz, mono, webm/opus

#### `stopDictation()`
- **Purpose**: End voice input
- **Actions**:
  - Stops MediaRecorder
  - Closes WebSocket
  - Finalizes transcript

#### `stopAndPlay()`
- **Purpose**: Stop dictation and trigger TTS playback
- **Use Case**: Preview what was dictated

#### `updateTranscript(newText)`
- **Purpose**: Manually edit transcript
- **Updates**: final transcript field

### WebSocket Protocol
- **Send**: Binary audio chunks
- **Receive**: JSON with `{ is_final, transcript, stability }`
- **Interim Results**: Updates interim transcript
- **Final Results**: Appends to final transcript

### Error Handling
- Microphone permission denied
- WebSocket connection errors
- MediaRecorder errors
- Automatic cleanup on errors

---

## File: `src/hooks/useAudioRecorder.ts`

### Purpose
Record audio for file-based STT (non-streaming).

### Features
- **Recording**: MediaRecorder API
- **Format**: webm/opus
- **Output**: Blob for upload
- **Visualization**: Audio level monitoring (optional)

### Key Functions
- `startRecording()`: Begin recording
- `stopRecording()`: End and return blob
- `pauseRecording()`: Pause recording
- `resumeRecording()`: Resume recording

### Use Case
- Audio message recording for upload
- Alternative to real-time STT

---

## Summary

### TTS Hooks Comparison

| Hook | Use Case | Audio Source | Timepoints |
|------|----------|--------------|------------|
| useTTSPlayer | Documents | Pre-generated or on-demand | Yes |
| useChatTTSPlayer | Agent messages | Embedded in message | Yes |
| useOnDemandTTSPlayer | User messages | On-demand synthesis | Yes |

### STT Hooks Comparison

| Hook | Method | Output | Use Case |
|------|--------|--------|----------|
| useRealtimeStt | WebSocket streaming | Real-time transcript | Live dictation |
| useAudioRecorder | File upload | Audio blob | Recorded messages |

### State Management Patterns
1. **Status Enums**: Clear state machine (idle → loading → playing → idle)
2. **Refs for Cleanup**: audioRef, cancelTokenRef for proper cleanup
3. **Error States**: Dedicated error state with messages
4. **Pending Actions**: seekToTimeRef for deferred operations

### Audio Lifecycle
```
TTS:
  idle → loading → playing ⇄ paused → idle
                     ↓
                   error → idle

STT:
  idle → connecting → listening → processing → review → idle
                                      ↓
                                    error → idle
```

### Key Features
1. **Synchronized Highlighting**: All TTS hooks support word-level timing
2. **Seek Functionality**: Jump to specific words in audio
3. **Cleanup**: Proper resource cleanup on unmount
4. **Error Recovery**: Graceful error handling with user feedback
5. **Dual STT Modes**: Real-time streaming and file upload
6. **Pre-generated Optimization**: Fetches cached TTS when available
