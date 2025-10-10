# Frontend Components Analysis

## File: `src/components/GeminiChatInterface.tsx`

### Purpose
Main chat interface component with message display, input, and TTS integration.

### Key Components

#### `MessageBubble` (Lines 33-147)
- **Purpose**: Render individual chat message with TTS controls
- **Props**:
  - `message`: ChatMessage object
  - `onPlayAudio`: Trigger TTS playback
  - `isPlaying`, `isLoading`: TTS state
  - `activeTimepoint`: Current word being spoken
  - `onDemandWordTimepoints`: Timepoints for user messages
  - `onWordClick`: Seek to specific word
- **Features**:
  - **Speaker Icon**: Volume2 (idle), VolumeX (playing), Loader2 (loading)
  - **Synchronized Highlighting**: Yellow highlight on active word
  - **Quiz Options**: Renders clickable option buttons
  - **Retry Button**: For failed user messages
  - **Markdown Rendering**: ReactMarkdown for formatted text
- **Timepoint Grouping**: `groupTimepointsIntoParagraphs` splits by PARAGRAPH_BREAK markers

#### `ChatInputBar` (Lines 159-end)
- **Purpose**: Input area with text, voice, and TTS controls
- **Features**:
  - **Textarea**: Auto-resizing based on content
  - **Voice Input**: Real-time STT via `useRealtimeStt` hook
  - **TTS Playback**: Preview typed text before sending
  - **Send Button**: Disabled when empty or sending
- **STT Integration**:
  - `startDictation()`: Begin voice input
  - `stopDictation()`: End voice input
  - `stopAndPlay()`: Stop dictation and play audio
  - `updateTranscript()`: Manually edit transcript
- **Keyboard**: Enter to send, Shift+Enter for newline

#### `GeminiChatInterface` (Main Component)
- **Purpose**: Container managing chat state and TTS players
- **Hooks**:
  - `useChatTTSPlayer`: For agent messages (embedded audio/timepoints)
  - `useOnDemandTTSPlayer`: For user messages (on-demand synthesis)
- **Message Rendering**: Maps messages to MessageBubble components
- **Auto-scroll**: Scrolls to bottom on new messages
- **TTS Coordination**: Manages which message is playing

### TTS Architecture
```
Agent Messages:
  - Use embedded audio_content_base64 + timepoints from backend
  - Played via useChatTTSPlayer hook

User Messages:
  - Synthesize on-demand via useOnDemandTTSPlayer
  - Calls /api/tts/synthesize endpoint
```

---

## File: `src/components/SpeakableDocumentContent.tsx`

### Purpose
Render document text with synchronized word highlighting for TTS.

### Props
- `wordTimepoints`: Array of {mark_name, time_seconds}
- `activeTimepoint`: Currently playing timepoint
- `onWordClick`: Callback for word click (seek)
- `className`: Additional CSS classes

### Rendering Logic
1. Groups timepoints into paragraphs (by PARAGRAPH_BREAK)
2. Renders each paragraph as `<p>` element
3. Each word as `<span>` with:
   - Yellow highlight if active
   - Click handler to seek audio
   - Cursor pointer if clickable

### Use Case
- DocumentView "Read" tab
- Synchronized with useTTSPlayer audio playback

---

## File: `src/components/SpeakableText.tsx`

### Purpose
Generic component for rendering text with TTS word highlighting.

### Props
- `text`: Plain text to render
- `timepoints`: Word-level timing data
- `activeTimepoint`: Current word
- `onWordClick`: Seek callback

### Difference from SpeakableDocumentContent
- More generic, accepts plain text
- SpeakableDocumentContent is specialized for document rendering

---

## File: `src/components/MicrophoneButton.tsx`

### Purpose
Microphone button with visual feedback for voice input.

### States
- **Idle**: Mic icon, gray
- **Listening**: Mic icon, red pulsing animation
- **Processing**: Loader icon, spinning

### Features
- **Click to Toggle**: Start/stop dictation
- **Visual Feedback**: Color and animation based on state
- **Accessibility**: ARIA labels and keyboard support

### Integration
- Used in ChatInputBar
- Controlled by useRealtimeStt hook

---

## File: `src/components/AudioReview.tsx`

### Purpose
Audio review component for STT transcript editing before sending.

### Features
- **Playback**: Play recorded audio
- **Transcript Display**: Editable text area
- **Actions**: Send, Re-record, Cancel

### Use Case
- STT "review" mode
- User can edit transcript before sending to agent

---

## Summary

### Component Hierarchy
```
GeminiChatInterface
├── MessageBubble (multiple)
│   ├── Speaker Icon (TTS control)
│   ├── Markdown Content / Timepoint-based rendering
│   └── Quiz Options (if quiz question)
└── ChatInputBar
    ├── Textarea (auto-resize)
    ├── MicrophoneButton (STT)
    ├── TTS Preview Button
    └── Send Button

SpeakableDocumentContent (standalone)
└── Paragraph groups with word spans

AudioReview (standalone)
├── Audio Player
├── Transcript Editor
└── Action Buttons
```

### TTS Integration Points
1. **MessageBubble**: Speaker icon triggers `onPlayAudio`
2. **ChatInputBar**: Preview button plays typed text
3. **SpeakableDocumentContent**: Word click seeks audio
4. **GeminiChatInterface**: Coordinates TTS players

### STT Integration Points
1. **ChatInputBar**: Uses `useRealtimeStt` hook
2. **MicrophoneButton**: Visual feedback for dictation
3. **AudioReview**: Review/edit mode for transcripts

### Key Features
- **Synchronized Highlighting**: Word-level highlighting during TTS playback
- **Clickable Words**: Seek audio by clicking words
- **Quiz UI**: Dynamic option buttons for quiz questions
- **Real-time STT**: Live transcript updates during dictation
- **Auto-resize Input**: Textarea grows with content
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
