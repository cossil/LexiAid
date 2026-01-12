# Analysis: Frontend Components

> **Directory**: [src/components/](file:///C:/Ai/aitutor_37/src/components/)  
> **Count**: 17 components  
> **Status**: [Active]  
> **Verified**: 2026-01-09

---

## Component Inventory

### Core Components

| File | Purpose | Status |
|------|---------|--------|
| [SpeakableDocumentContent.tsx](file:///C:/Ai/aitutor_37/src/components/SpeakableDocumentContent.tsx) | Word-by-word TTS highlighting | [Active] |
| [SpeakableText.tsx](file:///C:/Ai/aitutor_37/src/components/SpeakableText.tsx) | Individual speakable text block | [Active] |
| [GeminiChatInterface.tsx](file:///C:/Ai/aitutor_37/src/components/GeminiChatInterface.tsx) | Chat UI with message history | [Active] |
| [MicrophoneButton.tsx](file:///C:/Ai/aitutor_37/src/components/MicrophoneButton.tsx) | STT recording button | [Active] |
| [AudioReview.tsx](file:///C:/Ai/aitutor_37/src/components/AudioReview.tsx) | Audio playback review | [Active] |

### Answer Formulation Components

| File | Purpose |
|------|---------|
| [answer-formulation/QuestionInput.tsx](file:///C:/Ai/aitutor_37/src/components/answer-formulation/QuestionInput.tsx) | Question text input |
| [answer-formulation/DictationPanel.tsx](file:///C:/Ai/aitutor_37/src/components/answer-formulation/DictationPanel.tsx) | Voice dictation UI |
| [answer-formulation/RefinementPanel.tsx](file:///C:/Ai/aitutor_37/src/components/answer-formulation/RefinementPanel.tsx) | LLM refinement display |
| [answer-formulation/VoiceEditMode.tsx](file:///C:/Ai/aitutor_37/src/components/answer-formulation/VoiceEditMode.tsx) | Voice-based editing |
| [answer-formulation/ManualEditMode.tsx](file:///C:/Ai/aitutor_37/src/components/answer-formulation/ManualEditMode.tsx) | Manual text editing |
| [answer-formulation/FinalizedAnswer.tsx](file:///C:/Ai/aitutor_37/src/components/answer-formulation/FinalizedAnswer.tsx) | Final answer display |
| [answer-formulation/AutoPauseSettings.tsx](file:///C:/Ai/aitutor_37/src/components/answer-formulation/AutoPauseSettings.tsx) | Auto-pause config |
| [answer-formulation/AutoPauseTip.tsx](file:///C:/Ai/aitutor_37/src/components/answer-formulation/AutoPauseTip.tsx) | Auto-pause suggestion |
| [answer-formulation/GuidedPractice.tsx](file:///C:/Ai/aitutor_37/src/components/answer-formulation/GuidedPractice.tsx) | Practice mode |

### Shared Components

| File | Purpose |
|------|---------|
| [shared/Footer.tsx](file:///C:/Ai/aitutor_37/src/components/shared/Footer.tsx) | Page footer |
| [shared/HighlightedTextBlock.tsx](file:///C:/Ai/aitutor_37/src/components/shared/HighlightedTextBlock.tsx) | Text with highlight support |

### Feedback Components

| File | Purpose |
|------|---------|
| [feedback/DictationInput.tsx](file:///C:/Ai/aitutor_37/src/components/feedback/DictationInput.tsx) | Voice input for feedback |

---

## Key Component Details

### SpeakableDocumentContent.tsx

**Purpose**: Renders document text with word-level highlighting during TTS playback.

**Props**:
```tsx
interface Props {
  wordTimepoints: Timepoint[];
  activeTimepoint: Timepoint | null;
  className?: string;
  onWordClick: (timeInSeconds: number) => void;
}
```

**Highlighting Logic**:
- Matches `activeTimepoint.mark_name` to word spans
- Applies highlight CSS class to active word
- Handles `PARAGRAPH_BREAK` markers for paragraph styling

### GeminiChatInterface.tsx

**Features**:
- Message history display
- Text input + voice input (via MicrophoneButton)
- Streaming response display
- Quiz mode integration

### MicrophoneButton.tsx

**States**:
- `idle` → Ready to record
- `recording` → Capturing audio
- `processing` → Sending to STT

Uses `useRealtimeStt` hook for WebSocket STT.

---

## HTML Entity Decoding

> [!NOTE]
> `SpeakableDocumentContent` receives pre-sanitized text from backend.  
> The `sanitize_text_for_tts()` function in `text_utils.py` handles SSML escaping.  
> Frontend may need `decodeHtmlEntities()` if displaying raw content elsewhere.
