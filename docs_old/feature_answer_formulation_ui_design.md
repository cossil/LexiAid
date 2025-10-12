# AI-Assisted Answer Formulation: UI/UX Design

## Overview

This document provides detailed UI/UX specifications for the Answer Formulation feature, focusing on accessibility, clarity, and ease of use for students with learning disabilities.

---

## Design Principles

### 1. Accessibility First
- **Large, clear fonts** (minimum 18px, OpenDyslexic default)
- **High contrast** colors
- **Generous spacing** between elements
- **Clear visual hierarchy**
- **Keyboard navigation** support
- **Screen reader** compatibility

### 2. Reduce Cognitive Load
- **One primary action** visible at a time
- **Progressive disclosure** (show options when needed)
- **Clear status indicators**
- **Minimal text** (use icons + labels)

### 3. Voice-First Interaction
- **Large microphone buttons**
- **Visual feedback** during recording
- **Audio confirmation** of actions
- **Voice commands** for all major actions

### 4. Error Prevention & Recovery
- **Confirm destructive actions**
- **Easy undo** for edits
- **Auto-save** progress
- **Clear error messages**

---

## Page Layout

### Overall Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Answer Formulation" + Help Icon                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Step 1: Your Question (Optional)                      │ │
│  │  [Large text area with placeholder]                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Step 2: Speak Your Thoughts                           │ │
│  │  [Microphone button + transcript area]                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Step 3: Review & Refine                               │ │
│  │  [Side-by-side comparison + action buttons]            │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Designs

### Component 1: Question Input

**Purpose**: Enter the assignment question/prompt

**Visual Design**:
```
┌──────────────────────────────────────────────────────────┐
│  📝 Your Question (Optional but Recommended)             │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Example: "Explain the causes of the American        │ │
│  │ Revolution"                                          │ │
│  │                                                      │ │
│  │ [Type or paste your assignment question here...]    │ │
│  │                                                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  💡 Tip: Adding your question helps organize your answer │
└──────────────────────────────────────────────────────────┘
```

**Specifications**:
- **Font**: 18px, OpenDyslexic
- **Placeholder**: Light gray, italic
- **Border**: 2px solid, blue when focused
- **Min Height**: 100px
- **Max Length**: 500 characters
- **Auto-resize**: Grows with content

**Accessibility**:
- Label: "Assignment Question"
- ARIA: `aria-label="Enter your assignment question"`
- Tab order: 1

---

### Component 2: Dictation Panel

**Purpose**: Record student's spoken thoughts

**Visual Design - Idle State**:
```
┌──────────────────────────────────────────────────────────┐
│  🎤 Speak Your Thoughts                                  │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                                                      │ │
│  │                    [🎤 Large Mic Icon]               │ │
│  │                                                      │ │
│  │              Start Dictating                         │ │
│  │                                                      │ │
│  │  Speak freely. Don't worry about organization.       │ │
│  │                                                      │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**Visual Design - Recording State (Auto-Pause Disabled)**:
```
┌──────────────────────────────────────────────────────────┐
│  🎤 Listening... (45 words)                              │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [🔴 Pulsing Red Mic Icon]                          │ │
│  │                                                      │ │
│  │  "Um, so like, the American Revolution happened     │ │
│  │  because the colonists were mad about taxes..."     │ │
│  │                                                      │ │
│  │  [Interim text in gray]                             │ │
│  │  and they didn't have representation                │ │
│  │                                                      │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  [🛑 Stop Dictating]                                     │
└──────────────────────────────────────────────────────────┘
```

**Visual Design - Recording State (Auto-Pause Enabled)**:
```
┌──────────────────────────────────────────────────────────┐
│  🎤 Listening... (45 words)  ⏱️ Auto-stop: 3s           │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  [🔴 Pulsing Red Mic Icon]                          │ │
│  │                                                      │ │
│  │  "Um, so like, the American Revolution happened     │ │
│  │  because the colonists were mad about taxes..."     │ │
│  │                                                      │ │
│  │  [Interim text in gray]                             │ │
│  │  and they didn't have representation                │ │
│  │                                                      │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│  │  Pause detected: Auto-stopping in 3... 2... 1...    │ │
│  │  (Resume speaking to cancel)                        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  [🛑 Stop Now]  [⚙️ Settings]                           │
└──────────────────────────────────────────────────────────┘
```

**Specifications**:
- **Mic Button**: 120px diameter, green (idle), red (recording)
- **Pulsing Animation**: 1.5s ease-in-out loop
- **Transcript Area**: 
  - Min height: 200px
  - Auto-scroll to bottom
  - Final text: Black, 18px
  - Interim text: Gray, italic, 16px
- **Word Count**: Top right, updates real-time
- **Stop Button**: 200px wide, 60px tall, red

**Accessibility**:
- Button label: "Start Dictating" / "Stop Dictating"
- ARIA live region for transcript
- Keyboard: Space to start/stop
- Audio cue: Beep on start/stop

---

### Component 3: Refinement Panel

**Purpose**: Display original and refined versions side-by-side

**Visual Design**:
```
┌──────────────────────────────────────────────────────────────────────────┐
│  ✨ Review Your Answer                                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────┬────────────────────────────────────────┐ │
│  │  Your Spoken Thoughts      │  Refined Answer                        │ │
│  │  (Original)                │  [🔊 Listen]                           │ │
│  ├────────────────────────────┼────────────────────────────────────────┤ │
│  │                            │                                        │ │
│  │  Um, so like, the American │  The American Revolution occurred     │ │
│  │  Revolution happened       │  because the colonists were upset     │ │
│  │  because the colonists     │  about taxes and lacked               │ │
│  │  were mad about taxes.     │  representation in Parliament.        │ │
│  │  And they didn't have      │  Events like the Boston Tea Party     │ │
│  │  representation in         │  escalated these tensions.            │ │
│  │  Parliament. Oh, and the   │                                        │ │
│  │  Boston Tea Party thing    │  [Highlighted word during TTS]        │ │
│  │  happened. That was        │                                        │ │
│  │  important too.            │                                        │ │
│  │                            │                                        │ │
│  └────────────────────────────┴────────────────────────────────────────┘ │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  What would you like to do?                                        │  │
│  │                                                                     │  │
│  │  [✅ Finalize Answer]  [✏️ Edit with Voice]  [🔄 Start Over]      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Specifications**:
- **Split View**: 50/50 width on desktop, stacked on mobile
- **Original Panel**: 
  - Light gray background
  - Slightly smaller font (16px)
  - Read-only
- **Refined Panel**:
  - White background
  - Larger font (18px)
  - Word highlighting during TTS (yellow background)
- **Listen Button**: 
  - Top right of refined panel
  - Plays TTS of refined answer
  - Changes to "Stop" when playing
- **Action Buttons**:
  - Equal width (200px each)
  - 60px tall
  - Generous spacing (20px between)
  - Icons + text labels

**Accessibility**:
- Landmark: `role="region"` for each panel
- Labels: "Original Transcript" and "Refined Answer"
- Keyboard: Tab through buttons, Enter to activate
- Screen reader: Announces when refinement complete

---

### Component 4: Edit Mode

**Purpose**: Apply voice-based edits to refined answer

**Visual Design**:
```
┌──────────────────────────────────────────────────────────────────────────┐
│  ✏️ Edit Your Answer with Voice                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Refined Answer                                                    │  │
│  │                                                                     │  │
│  │  The American Revolution occurred because the colonists were       │  │
│  │  [upset] about taxes and lacked representation in Parliament.      │  │
│  │   ^^^^^ (word you just changed)                                    │  │
│  │  Events like the Boston Tea Party escalated these tensions.        │  │
│  │                                                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  🎤 Say your edit command                                          │  │
│  │                                                                     │  │
│  │  Examples:                                                          │  │
│  │  • "Change 'upset' to 'angry'"                                     │  │
│  │  • "Rephrase the second sentence"                                  │  │
│  │  • "Add 'in 1773' after 'Boston Tea Party'"                        │  │
│  │                                                                     │  │
│  │  [🎤 Start Voice Command]                                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  [✅ Done Editing]  [↩️ Undo Last Edit]                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Specifications**:
- **Highlight Recent Changes**: Yellow background, fades after 3 seconds
- **Edit Examples**: Collapsible, show 3-5 common commands
- **Voice Command Button**: Same style as dictation button
- **Undo Button**: Disabled if no edits, enabled after first edit
- **Done Button**: Returns to review mode

**Accessibility**:
- Announce: "Edit mode activated"
- Announce: "Edit applied" after each edit
- Keyboard: Escape to exit edit mode

---

### Component 5: Auto-Pause Settings Panel

**Purpose**: Configure auto-pause behavior for dictation

**Visual Design**:
```
┌──────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Dictation Settings                                                    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Auto-Pause Detection                                              │  │
│  │                                                                     │  │
│  │  Automatically stop dictating when you pause speaking              │  │
│  │                                                                     │  │
│  │  [Toggle Switch: OFF ○━━━━━━━ ON]                                 │  │
│  │                                                                     │  │
│  │  Current: Disabled (Manual stop only)                              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Pause Duration                                                     │  │
│  │                                                                     │  │
│  │  How long to wait before auto-stopping                             │  │
│  │                                                                     │  │
│  │  1s ━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 10s  │  │
│  │                                                                     │  │
│  │  Current: 3.0 seconds                                               │  │
│  │                                                                     │  │
│  │  💡 Recommendations:                                                │  │
│  │  • 1-2s: Fast speakers                                             │  │
│  │  • 3-4s: Standard (recommended)                                    │  │
│  │  • 5-7s: Need thinking time                                        │  │
│  │  • 8-10s: Processing delays                                        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Preview                                                            │  │
│  │                                                                     │  │
│  │  [🎤 Test Auto-Pause]                                              │  │
│  │                                                                     │  │
│  │  Try speaking and pausing to see how it feels                      │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  [✅ Save Settings]  [❌ Cancel]                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Specifications**:
- **Toggle Switch**: 
  - Large (60px wide, 30px tall)
  - Animated transition (300ms)
  - Green when enabled, gray when disabled
- **Slider**:
  - Full width of container
  - Large touch target (40px tall)
  - Shows value in real-time as user drags
  - Snaps to 0.5-second increments
  - Visual markers at recommended values (3s, 5s, 7s)
- **Test Button**:
  - Allows user to try settings before saving
  - Shows countdown timer when activated
  - Auto-stops after configured duration
- **Recommendations Box**:
  - Light blue background
  - Icon + text for each recommendation
  - Clickable to set that value

**Quick Access**:
- **In-Page Toggle**: Small settings icon in dictation panel header
- **Settings Page**: Full settings panel in main Settings page
- **First-Time Setup**: Prompt to configure during onboarding

**Accessibility**:
- Label: "Auto-pause detection toggle"
- ARIA: `role="switch"` for toggle
- Keyboard: Arrow keys to adjust slider
- Screen reader: Announces current value

---

### Component 6: Finalized Answer

**Purpose**: Display final answer ready for copying/exporting

**Visual Design**:
```
┌──────────────────────────────────────────────────────────────────────────┐
│  ✅ Your Answer is Ready!                                                 │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │                                                                     │  │
│  │  The American Revolution occurred because the colonists were       │  │
│  │  angry about taxes and lacked representation in Parliament.        │  │
│  │  Events like the Boston Tea Party in 1773 escalated these          │  │
│  │  tensions.                                                          │  │
│  │                                                                     │  │
│  │  Word count: 28 words                                              │  │
│  │  Refinement iterations: 2                                           │  │
│  │                                                                     │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  What would you like to do?                                        │  │
│  │                                                                     │  │
│  │  [📋 Copy to Clipboard]  [💾 Download as Text]  [📧 Email]        │  │
│  │                                                                     │  │
│  │  [🆕 Start New Answer]                                             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  💡 Tip: Paste this into your assignment document                        │
└──────────────────────────────────────────────────────────────────────────┘
```

**Specifications**:
- **Answer Box**: 
  - Clean white background
  - Subtle border
  - Selectable text
  - Copy button shows "Copied!" toast on success
- **Metadata**: Small gray text, bottom of answer box
- **Action Buttons**: Same style as previous buttons
- **Success Icon**: Green checkmark, animated entrance

**Accessibility**:
- Announce: "Your answer is ready to copy"
- Keyboard: Ctrl+C to copy (after focus on answer box)
- Toast notification: "Copied to clipboard"

---

## Mobile Responsive Design

### Breakpoints
- **Desktop**: > 1024px (side-by-side panels)
- **Tablet**: 768px - 1024px (stacked panels, larger buttons)
- **Mobile**: < 768px (single column, full-width buttons)

### Mobile Adaptations
1. **Stacked Layout**: Original and refined text stack vertically
2. **Larger Touch Targets**: Buttons minimum 60px tall
3. **Simplified Navigation**: Bottom nav bar with icons
4. **Swipe Gestures**: Swipe between original/refined views
5. **Voice-First**: Emphasize voice commands over typing

---

## Color Scheme

### Primary Colors
- **Primary Blue**: #3B82F6 (buttons, links)
- **Success Green**: #10B981 (finalize, success states)
- **Warning Yellow**: #F59E0B (highlights, attention)
- **Danger Red**: #EF4444 (stop, delete, errors)

### Neutral Colors
- **Text**: #1F2937 (dark gray, high contrast)
- **Background**: #FFFFFF (white)
- **Panel Background**: #F9FAFB (light gray)
- **Border**: #E5E7EB (medium gray)

### Accessibility
- **Contrast Ratio**: Minimum 4.5:1 for all text
- **High Contrast Mode**: Option to increase to 7:1
- **Color Blind Safe**: Use icons + text, not color alone

---

## Animations & Transitions

### Microphone Button
- **Idle → Recording**: Scale up 1.1x, color change to red (300ms ease-out)
- **Recording**: Pulsing animation (1.5s loop)
- **Recording → Idle**: Scale down, color change to green (300ms ease-in)

### Refinement Loading
- **Spinner**: Rotating circle, 2s loop
- **Progress Messages**: Fade in/out every 2 seconds
  - "Analyzing your thoughts..."
  - "Organizing ideas..."
  - "Improving clarity..."

### Edit Highlight
- **Applied Edit**: Yellow background, fade out over 3 seconds
- **Undo**: Reverse fade-in of previous text

### Success State
- **Checkmark**: Scale from 0 to 1 (500ms bounce)
- **Confetti**: Optional celebratory animation (can be disabled)

---

## Error States

### Error 1: Empty Transcript
```
┌──────────────────────────────────────────────────────────┐
│  ⚠️ No Speech Detected                                   │
│                                                           │
│  We didn't hear anything. Please try again.              │
│                                                           │
│  Tips:                                                    │
│  • Check your microphone is connected                    │
│  • Speak clearly and loudly enough                       │
│  • Make sure browser has microphone permission           │
│                                                           │
│  [🎤 Try Again]  [❓ Help]                               │
└──────────────────────────────────────────────────────────┘
```

### Error 2: Refinement Failed
```
┌──────────────────────────────────────────────────────────┐
│  ❌ Refinement Failed                                     │
│                                                           │
│  We couldn't refine your answer right now.               │
│                                                           │
│  Your original transcript is saved. You can:             │
│  • Try refining again                                    │
│  • Edit the transcript manually                          │
│  • Contact support if this keeps happening               │
│                                                           │
│  [🔄 Try Again]  [✏️ Edit Transcript]  [💬 Support]     │
└──────────────────────────────────────────────────────────┘
```

### Error 3: Edit Command Unclear
```
┌──────────────────────────────────────────────────────────┐
│  🤔 I'm Not Sure What to Change                          │
│                                                           │
│  Your command: "Change that word"                        │
│                                                           │
│  Which word would you like to change? You can:           │
│  • Say the word you want to change                       │
│  • Tell me which sentence it's in                        │
│  • Read the phrase around it                             │
│                                                           │
│  [🎤 Clarify Command]  [❌ Cancel]                       │
└──────────────────────────────────────────────────────────┘
```

---

## Help & Onboarding

### First-Time User Tour
1. **Welcome Screen**: "Let's help you express your knowledge!"
2. **Step 1 Demo**: "First, enter your assignment question"
3. **Step 2 Demo**: "Then, speak your thoughts freely"
4. **Step 3 Demo**: "We'll organize it into clear writing"
5. **Edit Demo**: "You can refine it with voice commands"
6. **Done**: "Ready to try it yourself?"

### Help Button
- **Location**: Top right corner (? icon)
- **Content**: 
  - Video tutorial (2 minutes)
  - Text instructions
  - Example walkthrough
  - FAQ
  - Contact support

### Tooltips
- **Hover**: Show on desktop
- **Tap**: Show on mobile
- **Content**: Brief explanation (1 sentence)
- **Dismissible**: Click X or click outside

---

## Accessibility Features

### Screen Reader Support
- **Landmarks**: `<main>`, `<nav>`, `<region>` for major sections
- **ARIA Labels**: All buttons and inputs
- **Live Regions**: Status updates announced
- **Skip Links**: "Skip to main content"

### Keyboard Navigation
- **Tab Order**: Logical flow through page
- **Focus Indicators**: Clear blue outline (3px)
- **Shortcuts**:
  - `Space`: Start/stop dictation
  - `Ctrl+Enter`: Refine answer
  - `Ctrl+E`: Edit mode
  - `Ctrl+C`: Copy answer (when finalized)
  - `Escape`: Cancel current action

### Visual Accommodations
- **Font Size**: Adjustable (14px - 24px)
- **Line Spacing**: Adjustable (1.5x - 2.5x)
- **High Contrast**: Toggle mode
- **Dyslexia-Friendly**: OpenDyslexic font default
- **Reduce Motion**: Disable animations

### Audio Accommodations
- **Visual Transcripts**: All audio has text alternative
- **Adjustable Speed**: TTS playback speed control
- **Pause/Resume**: All audio can be paused
- **Volume Control**: Independent of system volume

---

## Success Metrics for UI/UX

1. **Usability**: 90% of users complete task without help
2. **Efficiency**: Average time < 5 minutes per answer
3. **Satisfaction**: 85% rate experience as "good" or "excellent"
4. **Accessibility**: 100% WCAG 2.1 AA compliance
5. **Error Recovery**: 95% of errors resolved without support

---

## Next Steps

1. Create high-fidelity mockups in Figma
2. Build interactive prototype
3. Conduct usability testing with 5-10 students
4. Iterate based on feedback
5. Implement in React with Tailwind CSS
6. Accessibility audit before launch
