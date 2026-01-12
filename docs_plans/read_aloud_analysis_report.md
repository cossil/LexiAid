# Read Aloud Implementation Analysis Report

**Date:** 2026-01-12  
**Analyst:** Antigravity AI  
**Project:** LexiAid - Frontend Read Aloud Feature

---

## Executive Summary

This report analyzes the "Read Aloud" feature implementation to identify the root cause of formatting loss and assess the feasibility of adding a "Magnifier" feature that displays the current sentence in large text. The analysis reveals that:

1. **Formatting Loss:** The feature **does** preserve paragraph breaks, but rendering relies entirely on backend timepoint markers (`PARAGRAPH_BREAK`). If these markers are missing or inconsistent, formatting collapses.
2. **Magnifier Feasibility:** The current implementation exposes **word-level** granularity only. No sentence-level data is available from the TTS hook, requiring additional logic to derive sentences from word timepoints.

---

## 1. Root Cause: Why Is Formatting Collapsing?

### 1.1 Read Aloud Rendering Container

**Location:** [DocumentView.tsx:148-154](file:///C:/Ai/aitutor_37/src/pages/DocumentView.tsx#L148-L154)

```tsx
{(status === 'playing' || status === 'paused' || (wordTimepoints && wordTimepoints.length > 0)) ? (
  <SpeakableDocumentContent
    wordTimepoints={wordTimepoints}
    activeTimepoint={activeTimepoint}
    className="text-foreground"
    onWordClick={seekAndPlay}
  />
) : (
  <p className="whitespace-pre-wrap font-sans text-foreground">
    {document.content}
  </p>
)}
```

**Key Observations:**
- **Static View (Lines 156-158):** Uses `whitespace-pre-wrap` CSS class, which **preserves newlines and paragraphs** correctly.
- **Read Aloud View (Lines 149-154):** Renders using the `<SpeakableDocumentContent>` component, which does **NOT** use `whitespace-pre-wrap`.

### 1.2 Text Splitting and Paragraph Logic

**Location:** [SpeakableDocumentContent.tsx:54-84](file:///C:/Ai/aitutor_37/src/components/SpeakableDocumentContent.tsx#L54-L84)

```tsx
// Group timepoints into paragraphs.
// A new paragraph is started after a timepoint containing a newline.
const paragraphs: any[][] = [];
let currentParagraph: any[] = [];

wordTimepoints.forEach((timepoint) => {
  if (timepoint && timepoint.mark_name) {
    // Check for paragraph break markers
    const isParagraphBreak = timepoint.mark_name === 'PARAGRAPH_BREAK';
    const containsNewline = timepoint.mark_name.includes('\n');
    const word = timepoint.mark_name.trim();

    // Add non-empty, non-paragraph-break words to the current paragraph
    if (word && !isParagraphBreak) {
      currentParagraph.push({ ...timepoint, mark_name: word });
    }

    // Start a new paragraph on paragraph break markers or newlines
    if (isParagraphBreak || containsNewline) {
      if (currentParagraph.length > 0) {
        paragraphs.push(currentParagraph);
      }
      currentParagraph = [];
    }
  }
});
```

**Rendering Logic (Lines 88-109):**
```tsx
{paragraphs.map((paragraph, pIndex) => (
  <p key={pIndex} className="mb-4 last:mb-0">
    {paragraph.map((timepoint, wIndex) => {
      const isHighlighted = /* ... */;
      return (
        <span
          key={`${pIndex}-${wIndex}`}
          className={`${isHighlighted ? 'bg-blue-300 dark:bg-blue-700 rounded-md' : 'bg-transparent'} cursor-pointer`}
          onClick={() => onWordClick(timepoint.time_seconds)}
        >
          {decodeHtmlEntities(timepoint.mark_name)}{' '}
        </span>
      );
    })}
  </p>
))}
```

**Analysis:**
- **Paragraph Preservation:** The component **does** split text into `<p>` elements when `PARAGRAPH_BREAK` markers or newlines (`\n`) are detected in timepoint `mark_name`.
- **Dependency on Backend:** The entire paragraph structure depends on the **backend providing correct `PARAGRAPH_BREAK` markers** in the timepoints array.
- **No Fallback:** If the backend doesn't include these markers, **all text collapses into a single paragraph**, explaining the formatting loss.

### 1.3 Backend Timepoint Generation

**Location:** [useTTSPlayer.ts:43-51](file:///C:/Ai/aitutor_37/src/hooks/useTTSPlayer.ts#L43-L51)

```tsx
const playFromUrls = async (audioUrl: string, timepointsUrl: string) => {
  const timepointsResponse = await fetch(timepointsUrl);
  if (!timepointsResponse.ok) throw new Error('Failed to fetch timepoints');
  const timepoints = await timepointsResponse.json();
  setWordTimepoints(timepoints || []);

  const audio = new Audio(audioUrl);
  return { audio, timepoints };
};
```

**Verdict:**
- Timepoints are fetched from the backend via `getTtsAssets(documentId)` ([apiService](file:///C:/Ai/aitutor_37/src/services/api.ts)).
- If the backend TTS service doesn't generate `PARAGRAPH_BREAK` markers during synthesis, the frontend cannot reconstruct paragraph structure.

---

## 2. Current State: What Variables Hold Active Data?

### 2.1 TTS Hook State Exposure

**Hook:** `useTTSPlayer` ([useTTSPlayer.ts](file:///C:/Ai/aitutor_37/src/hooks/useTTSPlayer.ts))

**Exported State (Line 214):**
```tsx
return { playAudio, stopAudio, seekAndPlay, status, error, activeTimepoint, wordTimepoints };
```

| Variable | Type | Description |
|----------|------|-------------|
| `status` | `'idle' \| 'loading' \| 'playing' \| 'paused'` | Current playback state |
| `activeTimepoint` | `{ mark_name: string, time_seconds: number } \| null` | **Currently highlighted WORD** |
| `wordTimepoints` | `Array<{ mark_name: string, time_seconds: number }>` | **All word-level timepoints** |
| `error` | `string \| null` | Error message if playback fails |

**Key Insight:**
- The hook tracks **word-level granularity** only.
- No sentence-level state is maintained.

### 2.2 Active Highlighting Mechanism

**Location:** [useTTSPlayer.ts:110-125](file:///C:/Ai/aitutor_37/src/hooks/useTTSPlayer.ts#L110-L125)

```tsx
audio.ontimeupdate = () => {
  let currentWordTimepoint = null;
  for (let i = 0; i < timepoints.length; i++) {
    const tp = timepoints[i];
    if (audio.currentTime >= tp.time_seconds) {
      currentWordTimepoint = tp;
    } else {
      break;
    }
  }

  if (currentWordTimepoint && lastHighlightedTimepointRef.current?.mark_name !== currentWordTimepoint.mark_name) {
    setActiveTimepoint(currentWordTimepoint);
    lastHighlightedTimepointRef.current = currentWordTimepoint;
  }
};
```

**How It Works:**
- During playback, `ontimeupdate` finds the most recent timepoint where `audio.currentTime >= tp.time_seconds`.
- Updates `activeTimepoint` to the **current word**.
- `SpeakableDocumentContent` uses this to apply the `bg-blue-300` highlight class.

---

## 3. Magnifier Feature Feasibility

### 3.1 Requirement

Display the **current sentence** in large text (e.g., at the top of the screen).

### 3.2 Current Capabilities

✅ **Available:**
- `activeTimepoint` → Current word object
- `wordTimepoints` → Full array of word timepoints

❌ **Missing:**
- No sentence-level array (e.g., `sentences: Array<{ text: string, startTime: number, endTime: number }>`)
- No `currentSentenceIndex` or `currentSentence` state

### 3.3 Required Derivation Logic

To implement the Magnifier, we need to:

1. **Split `wordTimepoints` into sentences** (one-time computation when `wordTimepoints` changes).
2. **Track the current sentence** based on `activeTimepoint.time_seconds`.

#### Example Sentence Splitting Algorithm

```typescript
// In useTTSPlayer.ts or a new utility
const splitIntoSentences = (wordTimepoints: any[]) => {
  const sentences = [];
  let currentSentence = [];
  
  wordTimepoints.forEach((tp) => {
    if (tp.mark_name === 'PARAGRAPH_BREAK') {
      if (currentSentence.length > 0) {
        sentences.push(currentSentence);
        currentSentence = [];
      }
      return;
    }
    
    currentSentence.push(tp);
    
    // Detect sentence-ending punctuation
    if (/[.!?]$/.test(tp.mark_name)) {
      sentences.push(currentSentence);
      currentSentence = [];
    }
  });
  
  if (currentSentence.length > 0) {
    sentences.push(currentSentence);
  }
  
  return sentences;
};
```

#### Finding Current Sentence

```typescript
const getCurrentSentence = (sentences: any[][], activeTimepoint: any) => {
  if (!activeTimepoint) return null;
  
  for (const sentence of sentences) {
    if (sentence.some(word => word.time_seconds === activeTimepoint.time_seconds)) {
      return sentence.map(word => word.mark_name).join(' ');
    }
  }
  
  return null;
};
```

### 3.4 Recommended Approach

**Option A: Extend `useTTSPlayer` Hook**

Add new state variables:
```typescript
const [sentences, setSentences] = useState<any[][]>([]);
const [currentSentence, setCurrentSentence] = useState<string | null>(null);
```

Compute sentences when `wordTimepoints` changes:
```typescript
useEffect(() => {
  if (wordTimepoints.length > 0) {
    setSentences(splitIntoSentences(wordTimepoints));
  }
}, [wordTimepoints]);
```

Update `currentSentence` when `activeTimepoint` changes:
```typescript
useEffect(() => {
  if (activeTimepoint && sentences.length > 0) {
    setCurrentSentence(getCurrentSentence(sentences, activeTimepoint));
  }
}, [activeTimepoint, sentences]);
```

Return in hook:
```typescript
return { 
  playAudio, stopAudio, seekAndPlay, 
  status, error, 
  activeTimepoint, wordTimepoints,
  currentSentence  // NEW
};
```

**Option B: Create a Separate Hook**

```typescript
// useCurrentSentence.ts
export const useCurrentSentence = (wordTimepoints: any[], activeTimepoint: any) => {
  const [currentSentence, setCurrentSentence] = useState<string | null>(null);
  
  // Implementation similar to Option A
  
  return currentSentence;
};
```

---

## 4. Answers to Target Questions

### 4.1 Why is the formatting collapsing?

**Answer:**  
The `<SpeakableDocumentContent>` component renders words as individual `<span>` elements grouped into `<p>` paragraphs. Paragraph breaks are detected **only** when the backend provides:
- `PARAGRAPH_BREAK` markers in timepoints, OR
- Newline characters (`\n`) embedded in `mark_name` fields

**If the backend TTS service doesn't generate these markers, all text collapses into a single paragraph.**

**Evidence:**
- [SpeakableDocumentContent.tsx:62-77](file:///C:/Ai/aitutor_37/src/components/SpeakableDocumentContent.tsx#L62-L77) - Paragraph detection logic
- No CSS class like `whitespace-pre-wrap` is applied to preserve whitespace

### 4.2 What variable holds the currently active text data?

**Answer:**  
- **Word Level:** `activeTimepoint` (from `useTTSPlayer` hook)
  - Type: `{ mark_name: string, time_seconds: number } | null`
  - Represents the **single currently highlighted word**
  
- **Full Document:** `wordTimepoints`
  - Type: `Array<{ mark_name: string, time_seconds: number }>`
  - Contains **all words** with timing data

### 4.3 Do we currently have access to the "Active Sentence" string?

**Answer:**  
**No.** The current implementation provides:
- ✅ `activeTimepoint` → Current **word**
- ✅ `wordTimepoints` → All **words**
- ❌ No sentence-level state or tracking

**To access the Active Sentence:**
We must **derive it** by:
1. Splitting `wordTimepoints` into sentence arrays using punctuation/markers
2. Finding which sentence contains the current `activeTimepoint`
3. Concatenating the words in that sentence

**Calculation Complexity:** Low  
This can be efficiently computed using the algorithm outlined in Section 3.3.

---

## 5. Recommendations

### 5.1 Fix Formatting Loss

**Immediate Action:**
Investigate the backend TTS synthesis logic to ensure `PARAGRAPH_BREAK` markers are correctly inserted into timepoints.

**Alternative:**
If backend changes are infeasible, implement a **fallback** in `SpeakableDocumentContent.tsx`:
- If no paragraph breaks are detected, split by newlines in the original `document.content` text
- Map words to paragraphs based on character position

### 5.2 Implement Magnifier Feature

**Phase 1: Add Sentence Tracking**
1. Extend `useTTSPlayer` hook to compute `sentences` array from `wordTimepoints`
2. Add `currentSentence` state that updates based on `activeTimepoint`
3. Export `currentSentence` from the hook

**Phase 2: Create Magnifier UI Component**
```tsx
// MagnifierBar.tsx
interface MagnifierBarProps {
  currentSentence: string | null;
}

export const MagnifierBar: React.FC<MagnifierBarProps> = ({ currentSentence }) => {
  if (!currentSentence) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 text-center z-50">
      <p className="text-3xl font-bold">{currentSentence}</p>
    </div>
  );
};
```

**Phase 3: Integration**
Add to [DocumentView.tsx](file:///C:/Ai/aitutor_37/src/pages/DocumentView.tsx):
```tsx
const { playAudio, stopAudio, seekAndPlay, status, activeTimepoint, wordTimepoints, currentSentence } = useTTSPlayer(
  id || null,
  document?.content || ''
);

// Render conditionally
{status === 'playing' && <MagnifierBar currentSentence={currentSentence} />}
```

---

## 6. Technical Debt & Considerations

### 6.1 Sentence Detection Accuracy

**Current Limitation:**  
Punctuation-based sentence splitting (`/[.!?]$/`) may fail for:
- Abbreviations (e.g., "Dr.", "U.S.A.")
- Ellipses ("...")
- Quoted speech

**Recommendation:**  
Use a dedicated sentence tokenizer library (e.g., `compromise` or backend NLP service) if precision is critical.

### 6.2 Performance

**Concern:**  
Recomputing sentences on every `activeTimepoint` update could cause lag for very long documents.

**Mitigation:**  
- Memoize sentence array computation with `useMemo`
- Use binary search to find current sentence instead of linear iteration

### 6.3 Accessibility

**Consideration:**  
The Magnifier bar should:
- Be toggleable (some users may find it distracting)
- Support screen reader announcements
- Not obstruct critical UI elements

---

## 7. Conclusion

The "Read Aloud" formatting loss is caused by **missing paragraph break markers** from the backend, not a frontend rendering issue. The rendering logic is correctly implemented but **depends entirely on backend data**.

The **Magnifier feature is feasible** but requires:
1. Deriving sentence-level data from word timepoints (low complexity)
2. Adding sentence tracking to the TTS hook
3. Creating a new UI component

**Estimated Effort:**
- Formatting Fix (Backend): **4-6 hours**
- Formatting Fix (Frontend Fallback): **2-3 hours**
- Magnifier Feature: **6-8 hours** (including testing and accessibility enhancements)

---

**Report Status:** ✅ Complete  
**Next Steps:** Awaiting user approval to proceed with implementation.
