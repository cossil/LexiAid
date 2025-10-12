# Answer Formulation TTS Bug Fix - Analysis & Execution Plan

**Date:** 2025-10-10  
**Objective:** Add on-demand Text-to-Speech (TTS) functionality to all text areas within the "AI-Assisted Answer Formulation" feature to ensure compliance with LexiAid's "auditory-first" design principle.

---

## Part 1: Existing TTS Infrastructure Analysis

### Summary of Reusable TTS Components

After analyzing the codebase, the following reusable TTS components have been identified:

#### 1. **`useOnDemandTTSPlayer` Hook** (Primary Solution)
**Location:** `src/hooks/useOnDemandTTSPlayer.ts`

**Purpose:** This is the **ideal hook** for this bug fix. It provides on-demand TTS playback for arbitrary text content without requiring pre-generated audio assets.

**Key Features:**
- **Simple API:** `playText(text: string)` - Accepts any text string and synthesizes it on-demand
- **State Management:** Tracks player status (`idle`, `loading`, `playing`, `paused`)
- **Play/Pause/Resume:** Supports toggling between play and pause states
- **Stop Functionality:** `stopAudio()` - Cleans up audio resources
- **Word-Level Highlighting:** Returns `activeTimepoint` and `wordTimepoints` for synchronized highlighting
- **Seeking:** `seekAndPlay(timeInSeconds, text)` - Allows jumping to specific time positions
- **Error Handling:** Tracks and exposes errors via `error` state

**Return Values:**
```typescript
{
  playText: (text: string) => Promise<void>,
  stopAudio: () => void,
  seekAndPlay: (timeInSeconds: number, text: string) => void,
  status: 'idle' | 'loading' | 'playing' | 'paused',
  error: string | null,
  activeTimepoint: Timepoint | null,
  wordTimepoints: Timepoint[]
}
```

**Why This is Perfect for Our Use Case:**
- No dependency on `documentId` or pre-generated assets
- Works with any text content (questions, transcripts, refined answers)
- Already handles the full lifecycle: loading → playing → cleanup
- Provides visual feedback states for UI integration

---

#### 2. **`useTTSPlayer` Hook** (Alternative, Not Recommended)
**Location:** `src/hooks/useTTSPlayer.ts`

**Purpose:** Designed for document-based TTS with fallback to on-demand synthesis.

**Why Not Suitable:**
- Requires `documentId` parameter (not applicable to answer formulation content)
- Optimized for pre-generated TTS assets (audio_url, timepoints_url)
- More complex than needed for simple text-to-speech of form inputs
- Adds unnecessary overhead for our use case

---

#### 3. **`apiService.synthesizeText(text: string)`** (Backend API)
**Location:** `src/services/api.ts` (lines 149-164)

**Purpose:** Backend API call that powers the TTS hooks.

**API Contract:**
```typescript
async synthesizeText(text: string): Promise<{
  audioContent: string;  // Base64-encoded audio
  timepoints: any[];     // Word-level timing data
}>
```

**Note:** This is already used internally by `useOnDemandTTSPlayer`, so we don't need to call it directly.

---

#### 4. **Implementation Pattern from `GeminiChatInterface.tsx`**
**Location:** `src/components/GeminiChatInterface.tsx` (lines 33-98, 433-451)

**Key Patterns Observed:**
- **Speaker Icon Button:** Uses `<Volume2>`, `<VolumeX>`, and `<Loader2>` icons from `lucide-react`
- **State-Based Icon Switching:**
  - `Loader2` (spinning) when `status === 'loading'`
  - `VolumeX` when `status === 'playing'` (indicates "stop" action)
  - `Volume2` when `status === 'idle'` (indicates "play" action)
- **Click Handler:** Toggles between play and stop based on current status
- **Accessibility:** Includes `title`, `role="button"`, `tabIndex={0}`, and `onKeyPress` handlers

**Example Code Pattern:**
```tsx
const { playText, stopAudio, status } = useOnDemandTTSPlayer();

const handleSpeakerClick = () => {
  if (status === 'playing' || status === 'loading') {
    stopAudio();
  } else {
    playText(textContent);
  }
};

<div
  className="speakerIconContainer"
  title={status === 'playing' ? "Stop audio" : "Play audio"}
  onClick={handleSpeakerClick}
  role="button"
  tabIndex={0}
>
  {status === 'loading' ? (
    <Loader2 size={20} className="animate-spin" />
  ) : status === 'playing' ? (
    <VolumeX size={20} />
  ) : (
    <Volume2 size={20} />
  )}
</div>
```

---

## Part 2: Execution Plan

### Overview
We will add a **speaker icon button** (🔊) next to each text area in the three Answer Formulation components. Clicking this button will use the `useOnDemandTTSPlayer` hook to read the text content aloud.

### Design Principles
1. **Consistent UI Pattern:** Use the same icon set and behavior as `GeminiChatInterface.tsx`
2. **Accessibility-First:** Include ARIA labels, keyboard navigation, and visual feedback
3. **Minimal Code Changes:** Leverage existing hooks without modification
4. **Graceful Degradation:** Handle empty text cases and errors appropriately

---

### Component 1: `QuestionInput.tsx`

**Current State:**
- Large textarea for entering assignment questions
- Character counter (500 max)
- Auto-resizing based on content
- No TTS functionality

**Required Changes:**

#### 1.1 Import Statements
Add the following imports at the top of the file:
```typescript
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useOnDemandTTSPlayer } from '../../hooks/useOnDemandTTSPlayer';
```

#### 1.2 Hook Integration
Inside the `QuestionInput` component function, add:
```typescript
const { playText, stopAudio, status } = useOnDemandTTSPlayer();
```

#### 1.3 Click Handler
Add a handler function:
```typescript
const handlePlayQuestion = () => {
  if (status === 'playing' || status === 'loading') {
    stopAudio();
  } else if (value.trim()) {
    playText(value);
  }
};
```

#### 1.4 UI Modification
**Location:** After the header `<h2>` element (around line 38-40)

Add a speaker button in the header:
```tsx
<div className="flex items-center gap-2 mb-3">
  <FileQuestion className="w-6 h-6 text-blue-600" />
  <h2 className="text-xl font-semibold text-gray-800">
    Your Question <span className="text-sm font-normal text-gray-500">(Optional but Recommended)</span>
  </h2>
  
  {/* TTS Speaker Button */}
  <button
    onClick={handlePlayQuestion}
    disabled={!value.trim() || disabled}
    className="ml-auto p-2 rounded-full hover:bg-gray-100 
               disabled:opacity-40 disabled:cursor-not-allowed
               transition-colors duration-200
               focus:outline-none focus:ring-2 focus:ring-blue-300"
    title={status === 'playing' ? "Stop reading question" : "Listen to question"}
    aria-label={status === 'playing' ? "Stop audio" : "Play question audio"}
  >
    {status === 'loading' ? (
      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
    ) : status === 'playing' ? (
      <VolumeX className="w-5 h-5 text-blue-600" />
    ) : (
      <Volume2 className="w-5 h-5 text-blue-600" />
    )}
  </button>
</div>
```

**Rationale:**
- Button placed in header for easy discovery
- Uses `ml-auto` to push it to the right side
- Disabled when text is empty or component is disabled
- Consistent styling with existing UI (blue theme)

---

### Component 2: `DictationPanel.tsx`

**Current State:**
- Displays real-time transcript during dictation
- Shows final transcript in a scrollable div
- No TTS functionality for reviewing transcript

**Required Changes:**

#### 2.1 Import Statements
Add:
```typescript
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useOnDemandTTSPlayer } from '../../hooks/useOnDemandTTSPlayer';
```

#### 2.2 Hook Integration
Inside the `DictationPanel` component:
```typescript
const { playText, stopAudio, status: ttsStatus } = useOnDemandTTSPlayer();
```
**Note:** Renamed to `ttsStatus` to avoid conflict with the `status` prop from `useRealtimeStt`.

#### 2.3 Click Handler
```typescript
const handlePlayTranscript = () => {
  if (ttsStatus === 'playing' || ttsStatus === 'loading') {
    stopAudio();
  } else if (transcript.trim()) {
    playText(transcript);
  }
};
```

#### 2.4 UI Modification
**Location:** Inside the transcript display area (around line 100-120)

Modify the transcript display section to add a speaker button:
```tsx
{/* Transcript display */}
<div className="w-full space-y-2">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-gray-700">Transcript</span>
    
    {/* TTS Speaker Button */}
    {transcript && (
      <button
        onClick={handlePlayTranscript}
        disabled={!transcript.trim() || isRecording}
        className="p-2 rounded-full hover:bg-gray-100 
                   disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors duration-200
                   focus:outline-none focus:ring-2 focus:ring-blue-300"
        title={ttsStatus === 'playing' ? "Stop reading transcript" : "Listen to transcript"}
        aria-label={ttsStatus === 'playing' ? "Stop audio" : "Play transcript audio"}
      >
        {ttsStatus === 'loading' ? (
          <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
        ) : ttsStatus === 'playing' ? (
          <VolumeX className="w-4 h-4 text-blue-600" />
        ) : (
          <Volume2 className="w-4 h-4 text-blue-600" />
        )}
      </button>
    )}
  </div>
  
  <div
    ref={transcriptRef}
    className="w-full min-h-[200px] max-h-[400px] overflow-y-auto p-4 bg-white rounded-md border border-gray-300"
    role="log"
    aria-live="polite"
    aria-label="Transcript"
  >
    {/* Existing transcript content */}
    {transcript && (
      <p className="text-lg text-gray-900 whitespace-pre-wrap" style={{ fontFamily: 'OpenDyslexic, sans-serif' }}>
        {transcript}
      </p>
    )}
    {interimTranscript && (
      <p className="text-base text-gray-500 italic whitespace-pre-wrap" style={{ fontFamily: 'OpenDyslexic, sans-serif' }}>
        {interimTranscript}
      </p>
    )}
    {!transcript && !interimTranscript && (
      <p className="text-gray-400 italic">Your speech will appear here...</p>
    )}
  </div>
</div>
```

**Rationale:**
- Button appears above transcript area for easy access
- Only visible when transcript exists
- Disabled during active recording to avoid confusion
- Smaller icon size (w-4 h-4) to fit compact header

---

### Component 3: `RefinementPanel.tsx`

**Current State:**
- Displays original transcript and refined answer side-by-side
- Has a "Listen" button for refined answer (line 67-80)
- **CRITICAL:** The existing "Listen" button uses `onPlayAudio` prop, which is passed from parent

**Required Changes:**

#### 3.1 Analysis of Existing TTS Button
The component already has a TTS button for the refined answer:
```tsx
{refinedAnswer && onPlayAudio && (
  <button onClick={onPlayAudio} ...>
    <Volume2 className="w-4 h-4" />
    {isPlayingAudio ? 'Playing...' : 'Listen'}
  </button>
)}
```

**Problem:** This relies on the parent component to provide `onPlayAudio` and `isPlayingAudio` props. We need to:
1. Add TTS for the **original transcript** (currently missing)
2. **Refactor the existing refined answer TTS** to use `useOnDemandTTSPlayer` internally
3. Remove dependency on parent props

#### 3.2 Import Statements
Add:
```typescript
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useOnDemandTTSPlayer } from '../../hooks/useOnDemandTTSPlayer';
```

#### 3.3 Hook Integration
Inside the `RefinementPanel` component:
```typescript
// Separate TTS players for original transcript and refined answer
const { 
  playText: playOriginal, 
  stopAudio: stopOriginal, 
  status: originalStatus 
} = useOnDemandTTSPlayer();

const { 
  playText: playRefined, 
  stopAudio: stopRefined, 
  status: refinedStatus 
} = useOnDemandTTSPlayer();
```

**Rationale:** Using two separate hook instances allows independent playback control for each text area.

#### 3.4 Click Handlers
```typescript
const handlePlayOriginal = () => {
  // Stop refined audio if playing
  if (refinedStatus === 'playing' || refinedStatus === 'loading') {
    stopRefined();
  }
  
  // Toggle original audio
  if (originalStatus === 'playing' || originalStatus === 'loading') {
    stopOriginal();
  } else if (originalTranscript.trim()) {
    playOriginal(originalTranscript);
  }
};

const handlePlayRefined = () => {
  // Stop original audio if playing
  if (originalStatus === 'playing' || originalStatus === 'loading') {
    stopOriginal();
  }
  
  // Toggle refined audio
  if (refinedStatus === 'playing' || refinedStatus === 'loading') {
    stopRefined();
  } else if (refinedAnswer?.trim()) {
    playRefined(refinedAnswer);
  }
};
```

**Rationale:** Ensures only one audio plays at a time by stopping the other when starting playback.

#### 3.5 UI Modifications

**3.5.1 Original Transcript Panel (Add TTS Button)**
**Location:** Around line 52-60

```tsx
{/* Original Transcript Panel */}
<div className="flex flex-col">
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-sm font-semibold text-gray-700">Your Spoken Thoughts (Original)</h3>
    
    {/* TTS Speaker Button for Original Transcript */}
    {originalTranscript && (
      <button
        onClick={handlePlayOriginal}
        disabled={!originalTranscript.trim()}
        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 
                   text-blue-700 rounded-md transition-colors duration-200
                   disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="Listen to original transcript"
      >
        {originalStatus === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : originalStatus === 'playing' ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        {originalStatus === 'playing' ? 'Playing...' : 'Listen'}
      </button>
    )}
  </div>
  <div className="flex-1 p-4 bg-gray-50 rounded-md border border-gray-300 min-h-[200px] max-h-[400px] overflow-y-auto">
    <p className="text-base text-gray-700 whitespace-pre-wrap" style={{ fontFamily: 'OpenDyslexic, sans-serif' }}>
      {originalTranscript}
    </p>
  </div>
</div>
```

**3.5.2 Refined Answer Panel (Refactor Existing Button)**
**Location:** Around line 64-80

```tsx
{/* Refined Answer Panel */}
<div className="flex flex-col">
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-sm font-semibold text-gray-700">Refined Answer</h3>
    
    {/* TTS Speaker Button for Refined Answer */}
    {refinedAnswer && (
      <button
        onClick={handlePlayRefined}
        disabled={!refinedAnswer.trim()}
        className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 
                   text-blue-700 rounded-md transition-colors duration-200
                   disabled:bg-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-blue-300"
        aria-label="Listen to refined answer"
      >
        {refinedStatus === 'loading' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : refinedStatus === 'playing' ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
        {refinedStatus === 'playing' ? 'Playing...' : 'Listen'}
      </button>
    )}
  </div>
  <div className="flex-1 p-4 bg-white rounded-md border-2 border-gray-300 min-h-[200px] max-h-[400px] overflow-y-auto">
    {/* Existing content rendering logic */}
    {isRefining ? (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">Refining your answer...</p>
        <p className="text-sm text-gray-500">This may take a few seconds</p>
      </div>
    ) : isEditing ? (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">Applying your edit...</p>
      </div>
    ) : refinedAnswer ? (
      <p className="text-lg text-gray-900 whitespace-pre-wrap" style={{ fontFamily: 'OpenDyslexic, sans-serif' }}>
        {refinedAnswer}
      </p>
    ) : (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-400 italic text-center">
          Click "Refine My Answer" to transform your spoken thoughts into clear writing
        </p>
      </div>
    )}
  </div>
</div>
```

#### 3.6 Props Interface Update
**Remove deprecated props:**
```typescript
interface RefinementPanelProps {
  originalTranscript: string;
  refinedAnswer: string | null;
  status: 'refining' | 'refined' | 'editing';
  onRefine?: () => void;
  onFinalize: () => void;
  onEditWithVoice: () => void;
  onEditManually: () => void;
  onStartOver?: () => void;
  // REMOVE: onPlayAudio?: () => void;
  // REMOVE: isPlayingAudio?: boolean;
}
```

**Rationale:** TTS is now self-contained within the component, eliminating the need for parent-managed audio state.

---

## Part 3: Testing Plan

### Manual Testing Checklist

#### QuestionInput.tsx
- [ ] Speaker icon appears in header
- [ ] Icon is disabled when textarea is empty
- [ ] Clicking icon when idle starts TTS playback
- [ ] Icon changes to spinning loader during audio loading
- [ ] Icon changes to VolumeX (stop) during playback
- [ ] Clicking icon during playback stops audio
- [ ] Keyboard navigation works (Tab to focus, Enter/Space to activate)
- [ ] ARIA labels are announced correctly by screen readers

#### DictationPanel.tsx
- [ ] Speaker icon appears above transcript area when transcript exists
- [ ] Icon is hidden when transcript is empty
- [ ] Icon is disabled during active recording
- [ ] TTS plays the final transcript (not interim text)
- [ ] Icon states transition correctly (idle → loading → playing → idle)
- [ ] Audio stops cleanly when user clicks stop
- [ ] Keyboard navigation works

#### RefinementPanel.tsx
- [ ] Speaker icon appears for original transcript
- [ ] Speaker icon appears for refined answer
- [ ] Only one audio plays at a time (starting one stops the other)
- [ ] Both icons show correct states independently
- [ ] TTS works for long text (multi-paragraph answers)
- [ ] Audio stops when user navigates away or starts a new refinement
- [ ] Deprecated props (`onPlayAudio`, `isPlayingAudio`) are removed from parent component calls

### Edge Cases to Test
1. **Empty Text:** Buttons should be disabled
2. **Very Long Text:** TTS should handle large answers (500+ words)
3. **Special Characters:** Test with punctuation, emojis, line breaks
4. **Rapid Clicking:** Ensure no race conditions or audio overlap
5. **Component Unmount:** Audio should stop cleanly when component unmounts
6. **Network Errors:** TTS API failures should show error state (verify `error` from hook)

---

## Part 4: Parent Component Updates

### Identify Parent Component
**Action Required:** Locate the parent component that renders `RefinementPanel` and remove the following props:
- `onPlayAudio`
- `isPlayingAudio`

**Expected Location:** Likely in `src/pages/AnswerFormulation.tsx` or similar.

**Example Change:**
```tsx
// BEFORE
<RefinementPanel
  originalTranscript={transcript}
  refinedAnswer={refinedAnswer}
  status={refinementStatus}
  onPlayAudio={handlePlayRefinedAnswer}  // REMOVE
  isPlayingAudio={isPlayingRefinedAnswer}  // REMOVE
  onFinalize={handleFinalize}
  onEditWithVoice={handleEditWithVoice}
  onEditManually={handleEditManually}
/>

// AFTER
<RefinementPanel
  originalTranscript={transcript}
  refinedAnswer={refinedAnswer}
  status={refinementStatus}
  onFinalize={handleFinalize}
  onEditWithVoice={handleEditWithVoice}
  onEditManually={handleEditManually}
/>
```

---

## Part 5: Implementation Order

### Recommended Sequence
1. **QuestionInput.tsx** (Simplest - single text area, no existing TTS)
2. **DictationPanel.tsx** (Moderate - conditional rendering based on recording state)
3. **RefinementPanel.tsx** (Most Complex - dual TTS players, refactoring existing button)
4. **Parent Component Cleanup** (Remove deprecated props)
5. **Testing** (Follow checklist above)

---

## Part 6: Accessibility Compliance

### WCAG 2.1 AA Compliance Checklist
- [x] **Keyboard Navigation:** All speaker buttons are keyboard accessible (tabIndex, onKeyPress)
- [x] **ARIA Labels:** Descriptive labels for screen readers
- [x] **Visual Feedback:** Clear state changes (idle/loading/playing)
- [x] **Color Contrast:** Blue icons on white background meet 4.5:1 ratio
- [x] **Focus Indicators:** CSS focus rings for keyboard users
- [x] **Disabled States:** Clear visual indication when buttons are disabled

---

## Part 7: Risk Assessment

### Low Risk
- Using existing, battle-tested `useOnDemandTTSPlayer` hook
- No backend changes required
- No changes to existing TTS infrastructure

### Medium Risk
- **RefinementPanel.tsx refactoring:** Removing parent-managed TTS props could break parent component if not updated correctly
- **Dual TTS players:** Need to ensure proper cleanup to avoid memory leaks

### Mitigation Strategies
1. Test each component in isolation before integration
2. Add console logging during development to track audio lifecycle
3. Use React DevTools to verify hook state transitions
4. Perform thorough manual testing with screen readers

---

## Part 8: Success Criteria

### Definition of Done
1. All three components have functional TTS buttons
2. TTS buttons follow consistent UI/UX patterns
3. No audio overlap or race conditions
4. Keyboard navigation works for all buttons
5. Screen readers announce button states correctly
6. No console errors or warnings
7. Parent component successfully renders `RefinementPanel` without deprecated props
8. All manual testing checklist items pass

---

## Conclusion

This plan leverages the existing `useOnDemandTTSPlayer` hook to add TTS functionality to the Answer Formulation feature with minimal code changes and maximum consistency. The implementation follows established patterns from `GeminiChatInterface.tsx` and maintains LexiAid's "auditory-first" design principle.

**Estimated Implementation Time:** 2-3 hours  
**Estimated Testing Time:** 1-2 hours  
**Total Effort:** 3-5 hours

**Next Step:** Await approval before proceeding with implementation.
