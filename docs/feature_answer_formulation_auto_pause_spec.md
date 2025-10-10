# Auto-Pause Feature Specification

## Overview

This document details the configurable auto-pause feature for the Answer Formulation dictation system. This feature allows users to automatically stop dictation after a configurable period of silence, making the workflow more natural for some users while remaining optional for others.

---

## Feature Requirements

### 1. Enable/Disable Toggle

**Requirement**: Users must be able to turn auto-pause on or off.

**Default State**: **Disabled** (manual stop only)

**Rationale**: 
- Students with processing delays may need longer pauses to think
- Some students prefer explicit control (reduces anxiety)
- First-time users should experience manual mode first

**Implementation**:
- Stored in user preferences: `answerFormulationAutoPause: boolean`
- Accessible via Settings page
- Quick toggle in dictation panel header

---

### 2. Adjustable Pause Duration

**Requirement**: Users must be able to adjust how long the system waits before auto-stopping.

**Default Value**: 3.0 seconds

**Range**: 1.0 - 10.0 seconds (0.5-second increments)

**Rationale**:
- Different users have different speaking patterns
- Students with processing delays need longer pauses
- Fast speakers may want shorter detection times

**Recommended Values**:
- **1-2 seconds**: Fast speakers who rarely pause mid-thought
- **3-4 seconds**: Standard (recommended for most users)
- **5-7 seconds**: Students who need thinking time between sentences
- **8-10 seconds**: Students with significant processing delays

**Implementation**:
- Stored in user preferences: `answerFormulationPauseDuration: number`
- Slider control with visual markers at recommended values
- Real-time preview/test mode

---

## User Experience

### When Auto-Pause is Disabled

**Behavior**:
- User must manually click "Stop Dictating" button
- No countdown timer shown
- No automatic stopping

**UI Indicators**:
- Standard recording interface
- "Stop Dictating" button visible
- No pause detection messaging

---

### When Auto-Pause is Enabled

**Behavior**:
1. User starts dictating
2. System monitors for pauses in speech
3. When pause detected (no new transcript for X seconds):
   - Visual countdown timer appears
   - Progress bar depletes
   - Shows "Auto-stopping in 3... 2... 1..."
4. If user resumes speaking:
   - Countdown cancels
   - Timer resets
5. If countdown reaches zero:
   - Dictation stops automatically
   - "Refine" button appears

**UI Indicators**:
- Header shows: "⏱️ Auto-stop: 3s" (configured duration)
- During pause: Countdown timer with progress bar
- Message: "Pause detected: Auto-stopping in X..."
- Subtext: "(Resume speaking to cancel)"

**User Control**:
- Can still manually click "Stop Now" at any time
- Can resume speaking to cancel auto-stop
- Can adjust settings mid-session via settings icon

---

## Technical Implementation

### Frontend State Management

**User Preferences (Firestore)**:
```typescript
{
  answerFormulationAutoPause: boolean,      // Default: false
  answerFormulationPauseDuration: number    // Default: 3.0
}
```

**Hook State**:
```typescript
interface UseAnswerFormulationReturn {
  // ... existing fields
  
  // Auto-pause settings
  autoPauseEnabled: boolean;
  setAutoPauseEnabled: (enabled: boolean) => void;
  pauseDuration: number; // in seconds
  setPauseDuration: (duration: number) => void;
  pauseCountdown: number | null; // countdown timer (null when not counting)
}
```

---

### Auto-Pause Detection Logic

**Algorithm**:
```typescript
1. Monitor STT transcript changes
2. Track last transcript length
3. If transcript length changes:
   - User is speaking
   - Reset/cancel any active countdown
4. If transcript length unchanged for X seconds:
   - Start countdown timer
   - Update UI every 100ms
   - If countdown reaches zero: stop dictation
5. If user resumes speaking during countdown:
   - Cancel countdown
   - Reset timer
```

**Implementation Details**:
- Uses `useRef` to track last transcript length
- Uses `setTimeout` for countdown (cleared if user speaks)
- Uses `setInterval` for UI countdown updates (100ms)
- Cleanup on unmount or manual stop

---

### Settings UI Components

#### Settings Page Panel

**Location**: Main Settings page, under "Answer Formulation" section

**Components**:
1. **Toggle Switch**:
   - Label: "Auto-Pause Detection"
   - Description: "Automatically stop dictating when you pause speaking"
   - Size: 60px wide, 30px tall
   - Colors: Green (enabled), Gray (disabled)

2. **Slider**:
   - Label: "Pause Duration"
   - Description: "How long to wait before auto-stopping"
   - Range: 1s - 10s
   - Increment: 0.5s
   - Visual markers at 3s, 5s, 7s
   - Shows current value in real-time

3. **Recommendations Box**:
   - Light blue background
   - 4 preset options (clickable):
     - "1-2s: Fast speakers"
     - "3-4s: Standard (recommended)"
     - "5-7s: Need thinking time"
     - "8-10s: Processing delays"

4. **Test Button**:
   - "🎤 Test Auto-Pause"
   - Opens mini dictation test
   - User can try settings before saving

---

#### In-Page Quick Toggle

**Location**: Dictation panel header (top right)

**Component**:
- Small settings icon (⚙️)
- Click to open popover with:
  - Auto-pause toggle
  - Current duration display
  - "Full Settings" link

**Purpose**: Quick access without leaving page

---

## User Flows

### Flow 1: First-Time User (Default: Disabled)

```
1. User starts dictating
2. Speaks their thoughts
3. Clicks "Stop Dictating" when done
4. (No auto-pause behavior)
```

---

### Flow 2: Enable Auto-Pause

```
1. User goes to Settings
2. Toggles "Auto-Pause Detection" ON
3. Adjusts slider to preferred duration (e.g., 5s)
4. Clicks "Test Auto-Pause" to try it
5. Speaks, pauses, sees countdown
6. Satisfied with behavior
7. Clicks "Save Settings"
8. Returns to Answer Formulation page
9. Auto-pause now active for all sessions
```

---

### Flow 3: Using Auto-Pause

```
1. User starts dictating (auto-pause enabled, 3s duration)
2. Speaks: "The American Revolution happened because..."
3. Pauses to think (3 seconds)
4. Countdown appears: "Auto-stopping in 3... 2... 1..."
5. Option A: User resumes speaking
   → Countdown cancels, continues recording
6. Option B: User stays silent
   → Dictation stops automatically
   → "Refine" button appears
```

---

### Flow 4: Adjust Mid-Session

```
1. User is on Answer Formulation page
2. Clicks settings icon (⚙️) in dictation panel
3. Sees current setting: "Auto-pause: ON (3s)"
4. Toggles OFF or adjusts duration
5. Change takes effect immediately
6. Continues with new setting
```

---

## Edge Cases & Handling

### Edge Case 1: Very Short Pause Duration (1s)

**Scenario**: User sets 1-second auto-pause

**Handling**:
- Show warning: "Very short duration may interrupt mid-sentence"
- Allow but recommend 2s minimum
- User can test and adjust

---

### Edge Case 2: Very Long Pause Duration (10s)

**Scenario**: User sets 10-second auto-pause

**Handling**:
- Allow (some students need this)
- No warning needed
- Countdown still shows for feedback

---

### Edge Case 3: User Speaks During Countdown

**Scenario**: Countdown at "2..." when user resumes

**Handling**:
- Immediately cancel countdown
- Hide countdown UI
- Continue recording seamlessly
- No interruption to user

---

### Edge Case 4: Manual Stop During Countdown

**Scenario**: Countdown active, user clicks "Stop Now"

**Handling**:
- Immediately stop recording
- Cancel countdown timer
- Proceed to refinement
- No conflict

---

### Edge Case 5: Settings Changed Mid-Recording

**Scenario**: User is recording, opens settings, changes duration

**Handling**:
- New duration takes effect immediately
- If countdown active, restart with new duration
- No need to stop/restart recording

---

## Accessibility Considerations

### Screen Reader Support

**Announcements**:
- "Auto-pause enabled, 3 seconds"
- "Pause detected, auto-stopping in 3 seconds"
- "Countdown cancelled, recording continues"
- "Recording stopped automatically"

**ARIA Labels**:
- Toggle: `aria-label="Auto-pause detection toggle"`
- Slider: `aria-label="Pause duration in seconds"`
- Countdown: `role="timer"` with live region

---

### Keyboard Navigation

**Controls**:
- Tab to toggle switch
- Space/Enter to toggle on/off
- Tab to slider
- Arrow keys to adjust duration (0.5s increments)
- Tab to test button
- Enter to activate test

---

### Visual Indicators

**High Contrast Mode**:
- Countdown timer: Bold text, high contrast colors
- Progress bar: Thick border, clear depletion
- Settings icon: Larger, more visible

**Reduced Motion**:
- Disable progress bar animation
- Show countdown as text only
- No pulsing effects

---

## Testing Requirements

### Unit Tests

1. **Auto-pause detection logic**:
   - Test pause detection after X seconds
   - Test countdown cancellation on resume
   - Test manual stop during countdown

2. **Settings persistence**:
   - Test save to user preferences
   - Test load from user preferences
   - Test default values

3. **Edge cases**:
   - Test with 1s duration
   - Test with 10s duration
   - Test rapid on/off toggling

---

### Integration Tests

1. **End-to-end flow**:
   - Enable auto-pause
   - Start dictation
   - Pause for X seconds
   - Verify auto-stop
   - Verify "Refine" button appears

2. **Settings sync**:
   - Change settings in Settings page
   - Navigate to Answer Formulation
   - Verify settings applied

3. **Countdown cancellation**:
   - Trigger countdown
   - Resume speaking
   - Verify countdown cancels
   - Verify recording continues

---

### User Acceptance Tests

1. **Usability**:
   - 10 students test auto-pause
   - Measure: Can they enable/adjust settings?
   - Measure: Do they understand countdown?
   - Measure: Satisfaction rating

2. **Effectiveness**:
   - Compare completion time: auto-pause vs. manual
   - Measure: Preference (which do users prefer?)
   - Measure: Error rate (accidental stops)

---

## Success Metrics

### Quantitative

1. **Adoption Rate**: % of users who enable auto-pause
   - Target: 40-60% (not everyone will want it)

2. **Setting Adjustments**: Average number of duration changes per user
   - Target: 1-2 (users find their preference quickly)

3. **Accidental Stops**: % of auto-stops that are immediately restarted
   - Target: < 10% (low false positives)

4. **Completion Time**: Time from start to finalized answer
   - Hypothesis: Auto-pause users slightly faster

---

### Qualitative

1. **User Satisfaction**: "Auto-pause makes dictation easier"
   - Target: 80% agree

2. **Clarity**: "I understand how auto-pause works"
   - Target: 95% agree

3. **Control**: "I feel in control of when dictation stops"
   - Target: 90% agree

---

## Implementation Checklist

### Phase 1: Backend (Not Required)
- [ ] No backend changes needed (all frontend)

### Phase 2: Frontend State
- [ ] Add fields to user preferences schema
- [ ] Update `useAnswerFormulation` hook with auto-pause logic
- [ ] Implement pause detection algorithm
- [ ] Implement countdown timer

### Phase 3: UI Components
- [ ] Build settings panel (toggle + slider)
- [ ] Build in-page quick toggle
- [ ] Build countdown timer UI
- [ ] Add recommendations box
- [ ] Build test mode

### Phase 4: Integration
- [ ] Integrate with existing dictation flow
- [ ] Sync with user preferences
- [ ] Add to Settings page
- [ ] Add to Answer Formulation page

### Phase 5: Testing
- [ ] Unit tests for detection logic
- [ ] Integration tests for full flow
- [ ] Accessibility audit
- [ ] User testing with 10 students

### Phase 6: Documentation
- [ ] Update user guide
- [ ] Create video tutorial
- [ ] Add tooltips and help text

---

## Future Enhancements

### Enhancement 1: Smart Pause Detection

**Idea**: Use ML to detect natural pause points (end of sentence vs. mid-sentence pause)

**Benefit**: Reduce false positives (stopping mid-sentence)

**Complexity**: High (requires training data)

---

### Enhancement 2: Adaptive Duration

**Idea**: System learns user's typical pause patterns and auto-adjusts duration

**Benefit**: Personalized without manual configuration

**Complexity**: Medium (track pause patterns over time)

---

### Enhancement 3: Context-Aware Pauses

**Idea**: Longer auto-pause for complex questions, shorter for simple ones

**Benefit**: Adapts to task difficulty

**Complexity**: Medium (analyze question complexity)

---

## Conclusion

The configurable auto-pause feature provides flexibility for diverse user needs while maintaining simplicity. By defaulting to disabled and providing clear controls, we empower users to choose the workflow that works best for them.

**Key Principles**:
1. **Optional**: Never force auto-pause on users
2. **Configurable**: Wide range of durations (1-10s)
3. **Transparent**: Clear countdown feedback
4. **Cancelable**: User can always override
5. **Persistent**: Settings saved to preferences

This feature enhances the Answer Formulation experience for users who prefer hands-free operation while respecting the needs of users who prefer explicit control.
