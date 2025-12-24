# Frontend Contexts Analysis – Golden Source

> **Synthesized**: 2024-01-10  
> **Sources**: docs_Comp, docs2, docsGPT52, docsopus45thinking2  
> **Verified Against**: Actual codebase (`src/contexts/`)

---

## 1. Context Inventory

| Context | File | Scope | Purpose |
|---------|------|-------|---------|
| `AuthContext` | `AuthContext.tsx` | Global | Authentication state and methods |
| `AccessibilityContext` | `AccessibilityContext.tsx` | Global | TTS, display settings, accessibility features |
| `DocumentContext` | `DocumentContext.tsx` | Dashboard | Active document tracking |
| `QuizContext` | `QuizContext.tsx` | Dashboard | Quiz session management |

---

## 2. AuthContext (`src/contexts/AuthContext.tsx`)

### Purpose
Manages Firebase authentication state and user preferences.

### Provider Hierarchy
```
<AuthProvider>
  {!loading && children}  // Children only render after auth state resolved
</AuthProvider>
```

### State
```typescript
const [currentUser, setCurrentUser] = useState<User | null>(null);
const [userPreferences, setUserPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
const [loading, setLoading] = useState(true);
```

### Default User Preferences
```typescript
const DEFAULT_USER_PREFERENCES = {
  fontSize: 16,
  fontFamily: 'OpenDyslexic',
  lineSpacing: 1.5,
  wordSpacing: 1.2,
  textColor: '#000000',
  backgroundColor: '#f8f9fa',
  highContrast: false,
  uiTtsEnabled: true,
  ttsVoice: 'en-US-Wavenet-D',
  ttsSpeed: 1.0,
  ttsPitch: 0,
  cloudTtsEnabled: false,
  cloudTtsVoice: 'en-US-Neural2-F'
};
```

### Context Value
```typescript
interface AuthContextType {
  currentUser: User | null;
  userPreferences: UserPreferences;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  getAuthToken: (forceRefresh?: boolean) => Promise<string>;
}
```

### Key Behaviors

#### Auth State Change Handler
```typescript
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (user) {
      await user.getIdToken(true);  // Force refresh token
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (userDoc.exists()) {
        setUserPreferences(userDoc.data().preferences || DEFAULT_USER_PREFERENCES);
      }
      setCurrentUser(user);
    } else {
      setCurrentUser(null);
      setUserPreferences(DEFAULT_USER_PREFERENCES);
    }
    setLoading(false);
  });
  return unsubscribe;
}, []);
```

#### Sign Up (Server-First)
1. Calls `apiService.createUser()` to backend
2. Signs in temporarily via Firebase
3. Sends verification email
4. Signs out immediately
5. Returns `{ user: null, partial: false }`

#### Sign In
1. Firebase `signInWithEmailAndPassword`
2. Checks `emailVerified`; throws if false
3. Calls `apiService.initializeUser()` for profile sync

#### Google Sign-In
1. Firebase popup flow
2. Calls `apiService.initializeUser()` after success

#### Update Preferences
```typescript
const updateUserPreferencesCallback = useCallback(async (preferences: Partial<UserPreferences>) => {
  const newPreferences = { ...userPreferences, ...preferences };
  const { getAuthToken, ...prefsToStore } = newPreferences;  // Strip function
  await apiService.updateUserProfile({ preferences: prefsToStore });
  setUserPreferences(newPreferences);
}, [currentUser, userPreferences]);
```

### Enhanced Preferences
Injects `getAuthToken` function into preferences for TTS utilities:
```typescript
const enhancedPreferences = useMemo(() => ({
  ...userPreferences,
  getAuthToken: getAuthTokenCallback,
}), [userPreferences, getAuthTokenCallback]);
```

---

## 3. AccessibilityContext (`src/contexts/AccessibilityContext.tsx`)

### Purpose
Manages accessibility features: TTS, display settings, high contrast mode.

### State
```typescript
const [uiTtsEnabled, setUiTtsEnabled] = useState(userPreferences.uiTtsEnabled);
const [highContrast, setHighContrast] = useState(userPreferences.highContrast);
const [fontSize, setFontSizeState] = useState(userPreferences.fontSize);
const [fontFamily, setFontFamilyState] = useState(userPreferences.fontFamily);
const [lineSpacing, setLineSpacingState] = useState(userPreferences.lineSpacing);
const [wordSpacing, setWordSpacingState] = useState(userPreferences.wordSpacing);
const [cloudTtsEnabled, setCloudTtsEnabled] = useState(userPreferences.cloudTtsEnabled);
const [ttsDelay, setTtsDelayState] = useState<TtsDelayOption>(userPreferences.ttsDelay);
const [isSpeaking, setIsSpeaking] = useState(false);
const [ttsLoading, setTtsLoading] = useState(false);
const [audioProgress, setAudioProgress] = useState(0);
```

### TTS Delay Options
```typescript
export enum TtsDelayOption {
  Off = 0,
  Short = 500,
  Medium = 1000,
  Long = 1500
}
```

### Context Value
```typescript
interface AccessibilityContextType {
  uiTtsEnabled: boolean;
  highContrast: boolean;
  fontSize: number;
  fontFamily: string;
  lineSpacing: number;
  wordSpacing: number;
  cloudTtsEnabled: boolean;
  ttsDelay: TtsDelayOption;
  toggleUiTts: () => void;
  toggleHighContrast: () => void;
  toggleCloudTts: () => void;
  setFontSize: (size: number) => void;
  setFontFamily: (font: string) => void;
  setLineSpacing: (spacing: number) => void;
  setWordSpacing: (spacing: number) => void;
  setTtsDelay: (delay: TtsDelayOption) => void;
  speakText: (text: string) => void;
  speakLongText: (text: string) => void;
  cancelSpeech: () => void;
  isSpeaking: boolean;
  ttsLoading: boolean;
  audioProgress: number;
}
```

### TTS Methods

#### `speakText(text, options)`
```typescript
const speakText = (text: string, options: {
  forcePremium?: boolean;
  forceBasic?: boolean;
  isDocumentContent?: boolean;
  ignoreDelay?: boolean;
} = {}) => {
  // Debounce with ttsDelay
  // Determine TTS method (cloud vs browser)
  // Execute speech
};
```

#### `determineUsePremiumTts(options)`
Decision logic:
1. If `forceBasic` → false
2. If `forcePremium` → true
3. If not document content and not forced → false (use browser TTS for UI)
4. Otherwise → respect `cloudTtsEnabled` setting

#### `speakWithBrowserTts(text)`
Uses Web Speech API (`SpeechSynthesisUtterance`):
- Applies user preferences (rate, pitch, voice)
- Handles browser autoplay policies

#### `speakWithCloudTts(text)`
Uses Google Cloud TTS via backend:
1. Gets auth token (force refresh)
2. Calls `synthesizeSpeech()` from `ttsUtils`
3. Creates `HTMLAudioElement` from base64
4. Tracks progress via `timeupdate` event
5. Falls back to browser TTS on error

#### `speakLongText(text, options)`
For document content:
- Splits text into chunks at sentence boundaries (3000 char limit)
- Processes chunks sequentially
- Tracks overall progress across chunks

#### `cancelSpeech()`
Cancels all speech:
- Clears pending TTS timer
- Cancels browser speech synthesis
- Sets cancellation token for cloud TTS
- Stops and cleans up audio element

### Speech Initialization
Handles browser autoplay policies:
```typescript
useEffect(() => {
  const initSpeechSynthesis = () => {
    if (speechInitializedRef.current) return;
    speechInitializedRef.current = true;
    // Prime speech system with silent utterance
    const silentUtterance = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(silentUtterance);
    window.speechSynthesis.cancel();
  };
  
  document.addEventListener('click', initSpeechSynthesis);
  document.addEventListener('keydown', initSpeechSynthesis);
  document.addEventListener('touchstart', initSpeechSynthesis);
  // Cleanup...
}, []);
```

---

## 4. DocumentContext (`src/contexts/DocumentContext.tsx`)

### Purpose
Tracks the currently active document for navigation purposes.

### Scope
Provided within `DashboardLayout`, not global.

### State
```typescript
const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
```

### Context Value
```typescript
interface DocumentContextType {
  activeDocumentId: string | null;
  setActiveDocumentId: (id: string | null) => void;
}
```

### Usage
- Set when viewing a document (`DocumentView`)
- Used by `DashboardLayout` for Read/Chat/Quiz navigation links
- Cleared on document list or when no document selected

---

## 5. QuizContext (`src/contexts/QuizContext.tsx`)

### Purpose
Manages active quiz session state.

### Scope
Provided within `DashboardLayout`, not global.

### State
```typescript
const [quizThreadId, setQuizThreadId] = useState<string | null>(null);
const [isCancelling, setIsCancelling] = useState<boolean>(false);
```

### Context Value
```typescript
interface QuizContextType {
  quizThreadId: string | null;
  startQuizSession: (threadId: string) => void;
  cancelQuizSession: () => Promise<void>;
  isCancelling: boolean;
}
```

### Methods

#### `startQuizSession(threadId)`
Sets the active quiz thread ID.

#### `cancelQuizSession()`
```typescript
const cancelQuizSession = useCallback(async () => {
  if (!quizThreadId) return;
  setIsCancelling(true);
  try {
    await apiService.cancelQuiz(quizThreadId);
    toast.success('Quiz session ended.');
    setQuizThreadId(null);
  } catch (error) {
    toast.error('Could not end the quiz session.');
  } finally {
    setIsCancelling(false);
  }
}, [quizThreadId]);
```

### Usage
- `DashboardLayout` cancels quiz before chat navigation
- `ChatPage` / `DocumentView` start quiz sessions

---

## 6. Provider Nesting

### Global (in `App.tsx`)
```
<AuthProvider>
  <AccessibilityProvider>
    <BrowserRouter>
      ...
    </BrowserRouter>
  </AccessibilityProvider>
</AuthProvider>
```

### Dashboard Scope (in `DashboardLayout` route)
```
<DocumentProvider>
  <QuizProvider>
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  </QuizProvider>
</DocumentProvider>
```

---

## 7. Technical Debt

1. **Large Context Files**: `AccessibilityContext` is 792 lines; could be split
2. **Duplicate Browser TTS Fallback**: Called twice in `speakWithCloudTts` error handler
3. **Console Logging**: Extensive debug logs throughout
4. **Any Types**: Some timepoint handling uses `any`
