# Frontend Contexts Analysis

## File: `src/contexts/AuthContext.tsx`

### Purpose
Manage Firebase authentication state and user preferences.

### State
- `currentUser`: Firebase User | null
- `loading`: boolean (auth initialization)
- `userPreferences`: Object with accessibility/UI settings

### User Preferences Structure
```typescript
{
  fontSize: number
  fontFamily: string
  lineSpacing: number
  wordSpacing: number
  textColor: string
  backgroundColor: string
  highContrast: boolean
  uiTtsEnabled: boolean
  cloudTtsEnabled: boolean
  ttsVoice: string
  ttsSpeed: number
  ttsPitch: number
  ttsDelay: TtsDelayOption
}
```

### Key Functions

#### `updateUserPreferences(updates)`
- **Purpose**: Update user preferences in Firestore
- **Process**:
  1. Merges updates with current preferences
  2. Calls `/api/users/me/preferences` (PUT)
  3. Updates local state
- **Optimistic Update**: UI updates immediately

#### `getAuthToken()`
- **Purpose**: Get current user's Firebase ID token
- **Returns**: Promise<string | null>
- **Used By**: API service for authentication

### Firebase Auth Listeners
- `onAuthStateChanged`: Updates currentUser on auth changes
- Loads user preferences from Firestore on login
- Clears preferences on logout

### Provider Value
```typescript
{
  currentUser
  loading
  userPreferences
  updateUserPreferences
  getAuthToken
}
```

---

## File: `src/contexts/AccessibilityContext.tsx`

### Purpose
Manage accessibility features, TTS, and visual preferences.

### State
- `uiTtsEnabled`: boolean - Hover-to-speak
- `highContrast`: boolean - High contrast mode
- `fontSize`, `fontFamily`, `lineSpacing`, `wordSpacing`: Visual settings
- `cloudTtsEnabled`: boolean - Use Google Cloud TTS vs browser TTS
- `ttsDelay`: TtsDelayOption - Delay before speaking (0, 500, 1000, 1500ms)
- `isSpeaking`: boolean - TTS playback status
- `ttsLoading`: boolean - TTS synthesis in progress
- `audioProgress`: number - Playback progress

### Key Functions

#### `speakText(text, options)`
- **Purpose**: Speak text with configurable delay and TTS method
- **Options**:
  - `forcePremium`: Force Google Cloud TTS
  - `forceBasic`: Force browser TTS
  - `isDocumentContent`: Prefer premium for documents
  - `ignoreDelay`: Skip delay
- **Delay Logic**:
  - If delay > 0: Schedules speech with setTimeout
  - Clears previous timer to prevent overlapping
  - Executes immediately if delay = 0 or ignoreDelay = true

#### `executeSpeech(text, options)`
- **Purpose**: Actual TTS execution after delay
- **TTS Selection**:
  1. Check `forcePremium` or `forceBasic` options
  2. If `cloudTtsEnabled` and `isDocumentContent`: Use Cloud TTS
  3. Else: Use browser SpeechSynthesis
- **Cloud TTS**:
  - Calls `/api/tts/synthesize`
  - Plays base64 audio
  - Tracks progress
- **Browser TTS**:
  - Uses SpeechSynthesisUtterance
  - Applies voice, rate, pitch settings

#### `speakLongText(text)`
- **Purpose**: Speak long text with chunking
- **Process**:
  - Splits text into sentences
  - Queues utterances
  - Manages playback state

#### `cancelSpeech()`
- **Purpose**: Stop all TTS playback
- **Actions**:
  - Stops audio playback
  - Cancels browser synthesis
  - Clears timers
  - Resets state

### Toggle Functions
- `toggleUiTts()`: Enable/disable hover-to-speak
- `toggleHighContrast()`: Toggle high contrast mode
- `toggleCloudTts()`: Switch between Cloud and browser TTS

### Sync with AuthContext
- Reads initial values from `userPreferences`
- Updates persist via `updateUserPreferences`
- useEffect syncs state when preferences change

### Provider Value
```typescript
{
  uiTtsEnabled, toggleUiTts
  highContrast, toggleHighContrast
  fontSize, setFontSize
  fontFamily, setFontFamily
  lineSpacing, setLineSpacing
  wordSpacing, setWordSpacing
  cloudTtsEnabled, toggleCloudTts
  ttsDelay, setTtsDelay
  speakText, speakLongText, cancelSpeech
  isSpeaking, ttsLoading, audioProgress
}
```

---

## File: `src/contexts/DocumentContext.tsx`

### Purpose
Manage globally active document ID for navigation and context.

### State
- `activeDocumentId`: string | null

### Key Functions
- `setActiveDocumentId(id)`: Update active document

### Use Cases
1. **DocumentView**: Sets active document on mount
2. **DashboardLayout**: Sidebar "Chat with document" link uses active ID
3. **Navigation**: Ensures chat/quiz have document context

### Provider Value
```typescript
{
  activeDocumentId
  setActiveDocumentId
}
```

### Integration
- Wrapped in App.tsx around DashboardLayout
- Available to all dashboard pages

---

## File: `src/contexts/QuizContext.tsx`

### Purpose
Manage quiz state across components.

### State
- `isQuizActive`: boolean
- `quizThreadId`: string | null
- `currentQuestionIndex`: number
- `score`: number

### Key Functions
- `startQuiz(threadId)`: Initialize quiz
- `endQuiz()`: Cleanup quiz state
- `updateScore(points)`: Update score

### Provider Value
```typescript
{
  isQuizActive
  quizThreadId
  currentQuestionIndex
  score
  startQuiz
  endQuiz
  updateScore
}
```

### Integration
- Wrapped in App.tsx around DashboardLayout
- Used by ChatPage for quiz management

---

## Summary

### Context Hierarchy
```
App
└── AuthProvider (authentication + preferences)
    └── AccessibilityProvider (TTS + visual settings)
        └── Router
            └── DashboardLayout
                └── DocumentProvider (active document)
                    └── QuizProvider (quiz state)
                        └── Dashboard Pages
```

### Data Flow
1. **Auth**: Firebase → AuthContext → AccessibilityContext
2. **Preferences**: Firestore → AuthContext → AccessibilityContext → UI
3. **Document**: DocumentView → DocumentContext → DashboardLayout sidebar
4. **Quiz**: ChatPage → QuizContext → UI state

### Persistence
- **AuthContext**: Firestore `/users/{uid}/preferences`
- **AccessibilityContext**: Synced with AuthContext preferences
- **DocumentContext**: Session-only (not persisted)
- **QuizContext**: Session-only (thread-based persistence via backend)

### Key Features
1. **Centralized Auth**: Single source of truth for user state
2. **Preference Sync**: Auto-sync between contexts and Firestore
3. **TTS Flexibility**: Dual TTS modes (Cloud vs Browser)
4. **Delay Control**: Configurable hover-to-speak delay
5. **Global Document**: Active document accessible anywhere
6. **Quiz State**: Shared quiz state across chat components

### Performance Optimizations
- `useMemo`: Prevents unnecessary re-renders
- Debounced updates: TTS delay prevents rapid-fire speech
- Optimistic updates: UI updates before API confirmation
- Cleanup: Proper cleanup of timers and audio resources
