# Frontend Components Analysis

Thinking...
- Inventory key reusable components under `src/components` (chat UI, audio controls, speakable content, answer formulation widgets).
- Capture their props, behaviors, and integrations with hooks/contexts.
- Highlight accessibility/auditory-first considerations (TTS, STT, hover cues).

Plan
1. Summarize conversational/audio components (`GeminiChatInterface`, `MicrophoneButton`, `AudioReview`).
2. Cover reading aids (`SpeakableDocumentContent`, `SpeakableText`).
3. Outline modular answer-formulation components.
4. Note cross-component patterns and dependencies.

Execute
- The sections below document the main UI building blocks and how they support LexiAid’s experience.

## Chat & Audio Components
### `GeminiChatInterface.tsx`
- **Role**: Core chat transcript and input UI. Renders `MessageBubble` list with Markdown or timepoint-driven word highlighting. Integrates `useRealtimeStt`, `useChatTTSPlayer`, and `useOnDemandTTSPlayer` to support dictation, playback, and word-level navigation.
- **Key Behaviors**:
  - Displays quiz options inline when `message.isQuizQuestion` is true.
  - Maintains audio playback state per message (speaker icon toggles between play/stop, highlights active word with base64 timepoints).
  - Chat input bar lets users dictate (WebSocket STT), manually type, play text with TTS, and send messages.

### `MicrophoneButton.tsx`
- **Role**: Standalone recorder widget used across pages (e.g., ChatPage) for capturing audio, reviewing transcripts, and optionally auto-sending.
- **Key Behaviors**:
  - Manages state machine (`idle → requesting_permission → recording → processing → review`).
  - Invokes `useAudioRecorder`, persists recorded blob, and calls `apiService.uploadAudioMessage` for transcription (review mode) before user approves send.
  - Provides review controls (`AudioReview`), transcript preview, and direct send support.

### `AudioReview.tsx`
- **Role**: Modal-style component for listening to recorded audio, trimming, and deciding whether to resend or discard before final submission.
- **Features**: Waveform timeline, playback buttons, transcript display when available, explicit confirmation buttons.

## Reading Components
### `SpeakableDocumentContent.tsx`
- **Role**: Renders processed document text with synchronized TTS word highlighting.
- **Inputs**: `wordTimepoints`, `activeTimepoint`, `onWordClick` from TTS hooks.
- **Outputs**: Displays paragraphs with accessible colors, enabling learners to follow along visually while audio plays.

### `SpeakableText.tsx`
- **Role**: Lightweight wrapper that announces short text snippets via Accessibility context (`speakText`) on hover/focus. Used for tooltips, buttons, etc., ensuring consistent auditory cues.

## Answer Formulation Components
Located under `components/answer-formulation/` and consumed by `AnswerFormulationPage`.

| Component | Purpose |
| --- | --- |
| `QuestionInput` | Collects the prompt/question to anchor refinement. |
| `DictationPanel` | Guides users through recording and auto-pause status, showing timers/countdowns. |
| `RefinementPanel` | Displays AI-refined answer with controls to trigger voice/manual edits. |
| `VoiceEditMode` | Steps users through issuing voice edit commands and reviewing results. |
| `ManualEditMode` | Presents rich text area for manual tweaks, with word count and TTS hints. |
| `FinalizedAnswer` | Provides sharing/copy/download actions once users accept the answer. |
| `AutoPauseSettings`, `AutoPauseTip`, `GuidedPractice` | Support onboarding and customization to encourage accessible dictation habits. |

Common traits: each component leans on `useAnswerFormulation` state plus `useAuth` preferences to personalize UI (e.g., auto-pause suggestion after multiple sessions).

## Cross-cutting Observations
1. **Audio/TTS Everywhere**: Components consistently expose speaker controls and rely on shared hooks so STT/TTS experiences stay uniform.
2. **Accessibility Hooks**: Many components call `useAccessibility` to trigger spoken feedback on hover, reflecting the auditory-first goal.
3. **State Machine Clarity**: Components like `MicrophoneButton` include extensive logging and guard rails to prevent race conditions; documenting these states is critical for future refactors.
4. **Answer Form Modularity**: Breaking the workflow into sub-components keeps the page manageable and enables targeted future improvements (e.g., swapping dictation panel without touching refinement UI).
