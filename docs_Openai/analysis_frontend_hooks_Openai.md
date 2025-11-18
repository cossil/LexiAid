# Frontend Hooks Analysis

Thinking...
- Enumerate major hooks providing STT/TTS, answer formulation, audio recording, and quiz/document context logic.
- Describe responsibilities, inputs, outputs, and side effects for each hook.
- Emphasize how these hooks coordinate with services (`apiService`) and contexts.

Plan
1. Group hooks by domain: audio/STT/TTS, answer formulation, accessibility/recording utilities.
2. Summarize each hook’s behavior and dependencies.
3. Note cross-cutting considerations (singleton WebSocket usage, cleanup, context expectations).

Execute
- Sections below cover the most impactful hooks in `src/hooks`.

## Audio & Speech Hooks
### `useAudioRecorder`
- **Purpose**: Wraps `MediaRecorder` to capture microphone audio, optionally streaming chunks via callback while building a final blob.
- **Inputs**: Optional `{ onChunk }` for streaming; permission prompts for microphone.
- **Outputs**: `audioBlob`, `audioUrl`, `isRecording`, `error`, plus `startRecording`, `stopRecording`, and `clearAudio` helpers.
- **Side Effects**: Requests microphone access, stops tracks on cleanup, revokes object URLs.

### `useRealtimeStt`
- **Purpose**: Provides real-time speech-to-text via WebSocket streaming to `/api/stt/stream`.
- **State**: `status` (`idle`, `connecting`, `dictating`, `review`), `transcript` split into `final` and `interim`, `error`.
- **Behaviors**: Opens WebSocket, sends audio chunks from `useAudioRecorder`, transitions to review state when socket closes, exposes `startDictation`, `stopDictation`, `stopAndPlay`, `rerecord`, `cancelDictation`, `updateTranscript`.
- **Outputs**: Live transcript for UI components (GeminiChatInterface, Answer Formulation, etc.).

### `useChatTTSPlayer`
- **Purpose**: Plays base64 audio returned with chat messages while highlighting timepoints.
- **Inputs**: `audioContent` + `timepoints` per message.
- **Outputs**: Playback state (`status`, `activeTimepoint`), `playAudio`, `stopAudio`.
- **Behaviors**: Maintains internal `<audio>` element, toggles between play/pause, and tracks seeking.

### `useOnDemandTTSPlayer`
- **Purpose**: Synthesizes ad-hoc text (e.g., chat input, manual edits) using backend `/api/tts/synthesize`.
- **Inputs**: Text string.
- **Outputs**: `playText`, `stopAudio`, `seekAndPlay`, plus `status`, `error`, `activeTimepoint`, `wordTimepoints`.
- **Side Effects**: Calls backend TTS endpoint through `apiService.synthesizeText`, manages `<audio>` object lifecycle.

### `useChatTTSPlayer` vs `useOnDemandTTSPlayer`
- Chat hook focuses on pre-generated audio/timepoints from LangGraph responses.
- On-demand hook triggers backend TTS generation and caches timepoints for interactive scrubbing.

## Answer Formulation Hooks
### `useAnswerFormulation`
- **Purpose**: Central state machine for the entire answer formulation workflow.
- **Dependencies**: `useRealtimeStt`, `apiService.refineAnswer`, `apiService.editAnswer`, `useAuth` for preferences.
- **State Managed**: Question prompt, transcript, refined answer, session ID, status (`idle → recording → refining → refined → editing → finalized`), fidelity score, iteration count, auto-pause settings, onboarding flags.
- **Actions**: `startDictation`, `stopDictation`, `refineAnswer`, `editAnswer`, `finalizeAnswer`, `reset`, `updateRefinedAnswer`.
- **Side Effects**: Saves accessibility preferences (auto-pause duration/enable), handles countdown timers for auto-pause, integrates with Sqlite checkpoint-backed sessions via API.

## Utility Hooks
### `useAudioRecorder` (covered above)
- Serves as a foundation for MicrophoneButton and realtime STT.

## Cross-cutting Notes
1. **Resource Cleanup**: Hooks diligently stop MediaRecorder tracks and revoke object URLs; future hooks should follow the same patterns to avoid leaks.
2. **Singleton Expectations**: `useRealtimeStt` assumes a single active WebSocket session; concurrent users should instantiate separate hook instances per component.
3. **Error Propagation**: Hooks typically set local `error` state and log to console; consumers must surface user-friendly messages (e.g., toast notifications).
4. **Context Integration**: `useAnswerFormulation` persists user preferences by calling `updateUserPreferences`; ensure contexts are available wherever this hook is used.
