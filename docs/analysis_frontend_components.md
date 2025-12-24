# Frontend Components Analysis – Golden Source

> **Synthesized**: 2024-01-10  
> **Sources**: docs_Comp, docs2, docsGPT52, docsopus45thinking2  
> **Verified Against**: Actual codebase (`src/components/`, `src/layouts/`)

---

## 1. Component Inventory

### Layouts
| Component | File | Purpose |
|-----------|------|---------|
| `DashboardLayout` | `src/layouts/DashboardLayout.tsx` | Main authenticated layout with sidebar |

### Core Components
| Component | File | Purpose |
|-----------|------|---------|
| `GeminiChatInterface` | `src/components/GeminiChatInterface.tsx` | Chat UI with TTS and STT |
| `SpeakableDocumentContent` | `src/components/SpeakableDocumentContent.tsx` | Document text with word highlighting |
| `AudioReview` | `src/components/AudioReview.tsx` | Dev-only audio testing component |

### Shared Components
| Component | Directory | Purpose |
|-----------|-----------|---------|
| Various | `src/components/shared/` | Reusable UI elements |

### Feature Components
| Component | Directory | Purpose |
|-----------|-----------|---------|
| Answer Formulation | `src/components/answer-formulation/` | Answer practice UI |
| Feedback | `src/components/feedback/` | Feedback submission UI |

---

## 2. DashboardLayout (`src/layouts/DashboardLayout.tsx`)

### Purpose
Main layout wrapper for all authenticated dashboard routes.

### Structure
```
<div className="min-h-screen flex flex-col">
  <!-- Mobile Header (lg:hidden) -->
  <header>...</header>
  
  <!-- Mobile Sidebar Overlay -->
  <div className="fixed inset-0 lg:hidden">...</div>
  
  <div className="flex flex-1">
    <!-- Desktop Sidebar (hidden lg:block) -->
    <div className="lg:w-64">...</div>
    
    <!-- Main Content -->
    <div className="flex-1">
      <Outlet />
    </div>
  </div>
</div>
```

### Navigation Links
```typescript
const navLinks: NavLinkEntry[] = [
  { to: '/dashboard', text: 'Dashboard', icon: <FileText /> },
  { to: '/dashboard/documents', text: 'My Documents', icon: <Folder /> },
  { text: 'Read document', icon: <BookOpen />, onClick: handleReadNavigation },
  { text: 'Chat with the document', icon: <MessageSquare />, onClick: handleChatNavigation },
  { text: 'Quiz', icon: <Layers />, onClick: handleQuizNavigation },
  { to: '/dashboard/answer-formulation', text: 'Answer Formulation', icon: <PenTool /> },
  { to: '/dashboard/upload', text: 'Upload Document', icon: <Upload /> },
  { to: '/dashboard/feedback', text: 'Feedback', icon: <Megaphone /> },
  { to: '/dashboard/settings', text: 'Settings', icon: <Settings /> },
  // Admin Console - conditional
  ...(showAdminLink ? [{ to: '/dashboard/admin', text: 'Admin Console', icon: <Shield /> }] : []),
];
```

### Context Dependencies
- `useAuth()` – current user, sign out
- `useAccessibility()` – TTS, high contrast
- `useDocument()` – active document ID
- `useQuiz()` – quiz thread management

### Key Features
- **Responsive Design**: Mobile sidebar overlay, desktop fixed sidebar
- **Active Document Navigation**: Read/Chat/Quiz links use `activeDocumentId`
- **Quiz Cancellation**: Cancels active quiz before chat navigation
- **Admin Link**: Conditionally shown based on `isAdminEmail()`
- **Accessibility Controls**: TTS toggle, high contrast toggle in sidebar footer

---

## 3. GeminiChatInterface (`src/components/GeminiChatInterface.tsx`)

### Purpose
Full-featured chat interface with message display, input, TTS, and STT.

### Sub-Components

#### MessageBubble
Renders individual chat messages with:
- Speaker icon for TTS playback
- Word-level highlighting during playback
- Quiz option buttons
- Retry button for failed messages

```typescript
interface MessageBubbleProps {
  message: ChatMessage;
  onRetrySend?: (messageText: string, originalMessageId: string) => void;
  onSendMessage: (messageText: string) => void;
  onPlayAudio: (message: ChatMessage) => void;
  isPlaying: boolean;
  isLoading: boolean;
  activeTimepoint: Timepoint | null;
  timepoints?: Timepoint[] | null;
  forceTimepointRenderer?: boolean;
  onWordClick?: (timeInSeconds: number) => void;
}
```

#### ChatInputBar
Input area with:
- Textarea for typing
- Microphone button for STT
- Play button for TTS preview
- Send button

```typescript
interface ChatInputBarProps {
  onSendMessage: (messageText: string) => void;
  isSendingMessage: boolean;
  currentDocumentId?: string | null;
  currentThreadId?: string | null;
  onPreviewPlay: (text: string) => Promise<void> | void;
  onPreviewStop: () => void;
  previewStatus: PlayerStatus;
}
```

### TTS Integration
- Uses two `useTTSPlayer` instances:
  1. `messageStatus` – for playing message audio
  2. `previewStatus` – for previewing typed/dictated text
- Supports pre-generated audio (`audio_content_base64`) or on-demand synthesis

### STT Integration
- Uses `useRealtimeStt` hook
- States: `idle`, `connecting`, `dictating`, `review`
- Stop & Play: stops dictation and immediately plays transcript

### Word Highlighting
```typescript
const groupTimepointsIntoParagraphs = (timepoints: Timepoint[]) => {
  // Groups words into paragraphs based on PARAGRAPH_BREAK markers
  // Returns Timepoint[][] for rendering
};
```

---

## 4. SpeakableDocumentContent (`src/components/SpeakableDocumentContent.tsx`)

### Purpose
Renders document text with clickable words for TTS seek.

### Props
```typescript
interface SpeakableDocumentContentProps {
  wordTimepoints: any[];
  activeTimepoint: any | null;
  className?: string;
  onWordClick: (timeInSeconds: number) => void;
}
```

### Rendering Logic
1. Groups timepoints into paragraphs based on `PARAGRAPH_BREAK` markers or newlines
2. Renders each word as a clickable `<span>`
3. Highlights active word during playback

```typescript
{paragraphs.map((paragraph, pIndex) => (
  <p key={pIndex} className="mb-4 last:mb-0">
    {paragraph.map((timepoint, wIndex) => {
      const isHighlighted = activeTimepoint?.time_seconds === timepoint.time_seconds;
      return (
        <span
          key={`${pIndex}-${wIndex}`}
          className={isHighlighted ? 'bg-blue-300 rounded-md' : 'bg-transparent'}
          onClick={() => onWordClick(timepoint.time_seconds)}
        >
          {timepoint.mark_name}{' '}
        </span>
      );
    })}
  </p>
))}
```

---

## 5. Component Patterns

### Accessibility Pattern
All interactive components support:
```typescript
const handleHover = (text: string) => {
  if (uiTtsEnabled) {
    speakText(text);
  }
};

// Usage
<button onMouseEnter={() => handleHover('Button label')}>
  ...
</button>
```

### High Contrast Pattern
```typescript
className={`${highContrast ? 'bg-black text-white border-white' : 'bg-gray-800 text-gray-200'}`}
```

### Loading State Pattern
```typescript
{loading ? (
  <div className="flex justify-center">
    <Loader className="animate-spin" />
  </div>
) : (
  // Content
)}
```

### Error State Pattern
```typescript
{error && (
  <div className="text-red-400 flex items-center">
    <AlertCircle className="mr-2" />
    {error}
  </div>
)}
```

---

## 6. CSS Modules

### GeminiChatInterface.module.css
Defines styles for:
- `.chatContainer` – flex column layout
- `.messagesArea` – scrollable message list
- `.messageBubbleBase` – base message styling
- `.userMessage` / `.agentMessage` – sender-specific styles
- `.chatInputBar` – input area layout
- `.quizOptionsContainer` – quiz button grid

---

## 7. Icon Usage

All icons from `lucide-react`:
- Navigation: `Book`, `BookOpen`, `Folder`, `Upload`, `MessageSquare`, `Settings`, `LogOut`
- Actions: `Send`, `Mic`, `StopCircle`, `Play`, `Volume2`, `VolumeX`
- Status: `Loader2`, `AlertCircle`, `Check`
- UI: `Menu`, `X`, `ChevronRight`, `Calendar`, `Clock`

---

## 8. Technical Debt

1. **Debug Logging**: `SpeakableDocumentContent` has extensive `console.log` statements
2. **Any Types**: Some props use `any` instead of proper types
3. **Inline Styles**: Some components mix Tailwind with inline styles
4. **Large Components**: `GeminiChatInterface` is 520 lines; could be split further
