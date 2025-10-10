# AI-Assisted Answer Formulation: User Flow Design

## Overview

This document details the complete user journey through the Answer Formulation feature, from initiation to final output.

---

## User Flow Diagram

```
[Student has assignment question] 
    ↓
[Navigate to Answer Formulation page]
    ↓
[Enter/paste the question/prompt] ← Optional: Load from document
    ↓
[Click "Start Dictating" button]
    ↓
[Speak thoughts freely] → [Real-time transcript appears]
    ↓
[Click "Stop" or auto-detect pause]
    ↓
[AI processes and refines] → [Show "Refining..." indicator]
    ↓
[Refined text appears] + [AI reads it aloud]
    ↓
[Student reviews] 
    ↓
    ├─→ Satisfied? → [Click "Finalize"] → [Copy/Export text] → [Done]
    │
    └─→ Needs changes? → [Click "Edit with Voice"]
            ↓
        [Speak edit command] → ["Change 'big' to 'large'"]
            ↓
        [AI applies edit] → [Shows updated text] → [Reads change aloud]
            ↓
        [Loop back to review]
```

---

## Detailed Flow: Step-by-Step

### Phase 0: First-Time Onboarding (NEW - Guided Practice Mode)

**Purpose**: Teach users how to use the feature effectively through interactive practice

**When Triggered**: First time user accesses Answer Formulation feature

**Flow**:

#### Step 0.1: Welcome & Introduction
```
┌──────────────────────────────────────────────────────────┐
│  🎓 Welcome to Answer Formulation!                       │
│                                                           │
│  This tool helps you turn your spoken thoughts into      │
│  clear, well-written answers.                            │
│                                                           │
│  Let's practice together with a sample question.         │
│                                                           │
│  [▶️ Start Practice]  [⏭️ Skip to Feature]              │
└──────────────────────────────────────────────────────────┘
```

#### Step 0.2: Sample Question Display
```
Your Practice Question:
"What makes a good friend?"

💡 This is just for practice. Your answer won't be saved.
```

#### Step 0.3: Guided Dictation
```
Step 1: Speak Your Thoughts

[🎤 Start Dictating]

💬 Tip: Don't worry about being perfect! Just speak naturally.
   For example: "Um, a good friend is someone who, like, 
   listens to you and is there when you need them..."
```

**System plays example audio** (optional):
- User hears a sample "messy" dictation
- Shows how imperfect speech is OK

**User dictates their own answer**

#### Step 0.4: Guided Refinement
```
Great! You said:

"Um, a good friend is someone who like listens and is 
there when you need them and stuff."

Now let's see how the AI can help organize this.

[✨ Refine My Answer]
```

**After refinement:**
```
Here's your refined answer:

"A good friend is someone who listens and is there when 
you need them."

Notice how it:
✓ Removed filler words ("um", "like", "and stuff")
✓ Improved grammar
✓ Kept YOUR ideas (nothing added!)

[🔊 Listen] to hear it read aloud
```

#### Step 0.5: Guided Editing Practice
```
Step 3: Practice Editing

Let's try making a change. Say:
"Change 'listens' to 'really listens'"

[🎤 Try Voice Command]

Or click here to type it: [✏️ Edit Manually]
```

**After successful edit:**
```
Perfect! The text updated to:
"A good friend is someone who really listens..."

You can make as many edits as you want!

[✅ I'm Ready to Use This for Real]
```

#### Step 0.6: Completion
```
🎉 You're all set!

You've learned:
✓ How to dictate your thoughts
✓ How the AI refines your words
✓ How to edit with voice or keyboard

Ready to formulate your first real answer?

[🚀 Start My First Answer]
```

**Benefits of Guided Practice:**
- **Builds Confidence**: User practices in safe environment
- **Teaches Skills**: Demonstrates dictation → refinement → editing flow
- **Sets Expectations**: Shows what "messy" input looks like
- **Reduces Anxiety**: No pressure (practice answer not saved)
- **Interactive Learning**: More effective than passive tour

---

### Phase 1: Initiation

#### Step 1.1: Access Feature
**User Action:**
- Clicks "Answer Formulation" in main navigation
- OR clicks "Formulate Answer" button in document view

**First-Time Users**: Shown Phase 0 (Guided Practice) first

**Returning Users**: Go directly to main feature

**System Response:**
- Opens Answer Formulation page
- Shows empty workspace with clear instructions

**UI Elements:**
- Large text area labeled "Your Question/Prompt"
- "Start Dictating" button (prominent, green)
- Brief instructions: "Speak your thoughts freely. Don't worry about organization."

---

#### Step 1.2: Enter Question/Prompt (Optional but Recommended)
**User Action:**
- Types or pastes the assignment question
- Example: "Explain the causes of the American Revolution"

**System Response:**
- Displays question prominently at top of page
- This context helps AI understand what student is answering

**Why This Matters:**
- AI can better organize thoughts if it knows the question
- Helps student stay on topic
- Provides context for refinement

**Alternative:**
- Student can skip this and just start dictating
- Less optimal but still functional

---

### Phase 2: Capture (Dictation)

#### Step 2.1: Start Dictation
**User Action:**
- Clicks "Start Dictating" button
- Begins speaking

**System Response:**
- Button changes to "Stop Dictating" (red)
- Real-time transcript appears in left panel
- Visual indicator shows mic is active (pulsing icon)
- Word count updates in real-time

**Technical Details:**
- Uses existing `useRealtimeStt` hook (WebSocket STT)
- Interim results show immediately
- Final results update as speech pauses

---

#### Step 2.2: Dictate Thoughts
**User Action:**
- Speaks freely, without worrying about organization
- Can pause, restart, correct themselves
- Example: "Um, so like, the American Revolution happened because, uh, the colonists were mad about taxes. And also they didn't have representation in Parliament. Oh, and there was the Boston Tea Party thing. That was important too."

**System Response:**
- Transcript updates in real-time
- Shows both interim (gray) and final (black) text
- No interruptions or corrections from AI

**UI Feedback:**
- Left panel: "Your Spoken Thoughts" (raw transcript)
- Right panel: Empty (waiting for refinement)
- Progress indicator: "Capturing your thoughts..."

---

#### Step 2.3: Stop Dictation
**User Action:**
- Clicks "Stop Dictating" button
- OR system auto-detects pause (if enabled in settings)

**System Response:**
- Mic turns off
- Final transcript is locked in
- "Refine" button appears (or auto-starts refinement if enabled)

**Auto-Pause Settings (Configurable):**

**Setting 1: Enable/Disable Auto-Pause**
- **Default**: Disabled (manual stop only)
- **Location**: Settings page or quick toggle in dictation panel
- **Options**:
  - ✅ Enabled: System automatically stops after detecting pause
  - ❌ Disabled: User must click "Stop Dictating" button

**Setting 2: Pause Duration**
- **Default**: 3 seconds
- **Range**: 1-10 seconds (adjustable in 0.5-second increments)
- **Location**: Settings page
- **Recommendations**:
  - 1-2 seconds: For fast speakers who rarely pause
  - 3-4 seconds: Standard (recommended for most users)
  - 5-7 seconds: For students who need more thinking time
  - 8-10 seconds: For students with processing delays

**UI Indicator When Auto-Pause Enabled:**
- Shows countdown timer: "Auto-stop in 3... 2... 1..."
- Visual progress bar depletes during pause
- User can resume speaking to cancel auto-stop
- User can still manually click "Stop" at any time

**Contextual Feature Discovery (NEW):**

After user completes 2-3 successful sessions using manual stop, show a **one-time, non-intrusive suggestion**:

```
┌──────────────────────────────────────────────────────────┐
│  💡 Pro Tip: Work Hands-Free                             │
│                                                           │
│  You can enable "Auto-Pause" in settings to              │
│  automatically stop dictating when you pause.            │
│                                                           │
│  [⚙️ Try Auto-Pause]  [✕ No Thanks]                     │
└──────────────────────────────────────────────────────────┘
```

**Trigger Logic:**
- User has completed 2-3 sessions successfully
- User has NOT enabled auto-pause yet
- User has NOT dismissed this tip before
- Show after finalization of 3rd session
- Small, dismissible banner (not a modal)

**Benefits:**
- **Timely**: Shown when user is comfortable with basic flow
- **Relevant**: User has context for what auto-pause would help with
- **Non-Intrusive**: Easy to dismiss, doesn't interrupt workflow
- **Increases Adoption**: Many users won't explore settings unprompted
- **Respects Choice**: One-time suggestion, not repeated nagging

**Decision Point: Manual vs. Auto-Refinement**

**Option A: Manual (Recommended for MVP)**
- User clicks "Refine My Answer" button
- Gives user control, reduces anxiety
- Allows review of transcript before refinement

**Option B: Automatic**
- AI starts refining immediately after dictation stops
- Faster workflow
- Risk: User might want to review transcript first

**My Recommendation: Option A** - User clicks "Refine" button (auto-pause for stopping dictation is separate from auto-refinement)

---

### Phase 3: Refinement

#### Step 3.1: AI Processing
**User Action:**
- Waits (or clicks "Refine My Answer")

**System Response:**
- Shows loading indicator: "Refining your answer..."
- Progress messages:
  - "Analyzing your thoughts..."
  - "Organizing ideas..."
  - "Improving clarity..."
- Takes 3-10 seconds depending on length

**Technical Details:**
- Calls new `AnswerFormulationGraph`
- LLM receives:
  - Original question/prompt
  - Raw transcript
  - Strict "no external info" system prompt
- LLM returns refined text

---

#### Step 3.2: Display Refined Answer
**System Response:**
- Right panel shows refined text
- Left panel still shows original transcript (for comparison)
- AI automatically reads refined text aloud (TTS)
- Highlight words as they're spoken

**UI Layout:**
```
┌─────────────────────────────────────────────────────┐
│  Question: Explain causes of American Revolution    │
├──────────────────────┬──────────────────────────────┤
│ Your Spoken Thoughts │ Refined Answer               │
│ (Original)           │                              │
│                      │ The American Revolution      │
│ "Um, so like, the    │ occurred due to several key  │
│ American Revolution  │ factors. First, the colonists│
│ happened because,    │ were upset about taxation    │
│ uh, the colonists    │ without representation in    │
│ were mad about       │ Parliament. Second, events   │
│ taxes..."            │ like the Boston Tea Party    │
│                      │ escalated tensions between   │
│                      │ Britain and the colonies.    │
└──────────────────────┴──────────────────────────────┘
```

**User Experience:**
- Can read along while AI speaks
- Can see what changed from original
- Can pause TTS if needed

---

#### Step 3.3: Review Decision
**User Action:**
- Listens to refined answer
- Reads refined text
- Decides: Accept or Edit?

**System Response:**
- Shows three editing options:
  - "Finalize Answer" (green) - Accept and finish
  - "Edit with Voice" (blue) - Make changes via voice commands
  - "Edit Manually" (gray) - Direct text editing (NEW)

**Decision Tree:**
```
Is refined answer acceptable?
├─ YES → Click "Finalize Answer" → Go to Phase 4
└─ NO → Choose editing mode:
    ├─ "Edit with Voice" → Go to Phase 3.4a (Voice Commands)
    └─ "Edit Manually" → Go to Phase 3.4b (Manual Editing)
```

---

#### Step 3.4a: Voice-Based Editing (Voice Commands)
**User Action:**
- Clicks "Edit with Voice"
- Speaks edit command

**Edit Command Examples:**
1. **Word Replacement**: "Change 'upset' to 'angry'"
2. **Phrase Replacement**: "Replace 'several key factors' with 'three main reasons'"
3. **Sentence Rephrase**: "Rephrase the second sentence"
4. **Addition**: "Add 'in 1773' after 'Boston Tea Party'"
5. **Deletion**: "Remove the word 'key'"
6. **Reorder**: "Move the sentence about taxes to the end"

**System Response:**
- Captures voice command via STT
- Parses command to identify:
  - Action type (change, replace, rephrase, add, remove, move)
  - Target text (what to modify)
  - New content (if applicable)
- Sends to AI with context:
  - Current refined text
  - Edit command
  - Original transcript (for reference)
- AI applies edit
- Shows updated text
- Reads changed portion aloud

**UI Feedback:**
```
┌─────────────────────────────────────────────────────┐
│ Edit Command: "Change 'upset' to 'angry'"           │
├──────────────────────────────────────────────────────┤
│ Refined Answer (Updated)                            │
│                                                      │
│ The American Revolution occurred due to several key  │
│ factors. First, the colonists were [angry] about    │
│                                    ^^^^^^            │
│ taxation without representation in Parliament.       │
└──────────────────────────────────────────────────────┘
```

**Iteration Loop:**
- After each edit, user can:
  - Make another voice edit → Repeat Step 3.4a
  - Switch to manual editing → Go to Step 3.4b
  - Finalize answer → Go to Phase 4

---

#### Step 3.4b: Manual Editing (NEW - Combined Dictation + Keyboard)
**User Action:**
- Clicks "Edit Manually"
- Refined answer becomes editable text box
- Can use keyboard to make direct edits
- Can click to place cursor and dictate additional text

**Editing Modes:**

**Mode 1: Keyboard Editing**
- Click into text box
- Use keyboard to:
  - Fix typos or single words
  - Add/remove punctuation
  - Rearrange sentences (cut/paste)
  - Make any direct text changes
- Changes save automatically

**Mode 2: Dictate at Cursor**
- Click to place cursor at insertion point
- Click "Dictate Here" button
- Speak additional text to insert
- Text appears at cursor position
- Can continue editing or dictate more

**UI Layout:**
```
┌──────────────────────────────────────────────────────┐
│ Edit Mode: Manual                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│ [Editable Text Box - Click to edit]                 │
│                                                      │
│ The American Revolution occurred because the        │
│ colonists were upset about taxes and lacked         │
│ representation in Parliament.|← [Cursor]            │
│                                                      │
│ [🎤 Dictate at Cursor]  [↩️ Undo]  [💾 Save]       │
└──────────────────────────────────────────────────────┘
```

**Benefits:**
- **Multi-Modal**: Combines voice and keyboard (accessibility best practice)
- **Faster for Small Edits**: Typing "angry" is faster than saying "Change 'upset' to 'angry'"
- **Handles STT Errors**: If voice command misunderstood, just type the fix
- **Reduces Cognitive Load**: See mistake, fix directly (no complex command formulation)
- **Flexible**: User chooses best tool for each edit

**System Response:**
- All edits tracked in edit history
- Can undo any change
- Can switch back to voice commands anytime
- TTS reads updated text on demand

**Iteration Loop:**
- After manual edits, user can:
  - Continue manual editing
  - Switch to voice commands → Go to Step 3.4a
  - Finalize answer → Go to Phase 4

---

### Phase 4: Finalization

#### Step 4.1: Finalize Answer
**User Action:**
- Clicks "Finalize Answer" button

**System Response:**
- Shows confirmation: "Your answer is ready!"
- Displays final text in clean, copyable format
- Provides action buttons:
  - "Copy to Clipboard"
  - "Download as Text File"
  - "Email to Teacher" (future)
  - "Start New Answer"

**UI:**
```
┌─────────────────────────────────────────────────────┐
│ ✓ Your Answer is Ready!                             │
├──────────────────────────────────────────────────────┤
│                                                      │
│ The American Revolution occurred due to several key  │
│ factors. First, the colonists were angry about       │
│ taxation without representation in Parliament.       │
│ Second, events like the Boston Tea Party in 1773     │
│ escalated tensions between Britain and the colonies. │
│                                                      │
├──────────────────────────────────────────────────────┤
│ [Copy to Clipboard] [Download] [Start New Answer]   │
└──────────────────────────────────────────────────────┘
```

---

#### Step 4.2: Copy/Export
**User Action:**
- Clicks "Copy to Clipboard"

**System Response:**
- Copies text to clipboard
- Shows toast notification: "Copied!"
- Text remains on screen for reference

**User Next Steps:**
- Paste into Google Docs, Word, email, etc.
- Submit as homework assignment
- Use as study notes

---

## Alternative Flows

### Flow A: Quick Edit Without Full Refinement
**Scenario:** Student's speech is already pretty clear, just needs minor fixes

**Flow:**
1. Dictate thoughts
2. Click "Quick Polish" instead of "Refine"
3. AI makes minimal changes (grammar, punctuation only)
4. Finalize

**Benefit:** Faster for students with mild dysgraphia

---

### Flow B: Multi-Part Answer
**Scenario:** Essay question with multiple parts

**Flow:**
1. Enter question: "Explain causes, key events, and outcomes of American Revolution"
2. Dictate Part 1 (causes)
3. Refine Part 1
4. Click "Add Another Section"
5. Dictate Part 2 (key events)
6. Refine Part 2
7. Continue for all parts
8. Finalize complete answer

**Benefit:** Handles complex assignments

---

### Flow C: Collaborative Review
**Scenario:** Teacher or parent helps student review

**Flow:**
1. Student completes answer
2. Clicks "Share for Review"
3. Generates shareable link
4. Teacher/parent views answer
5. Provides feedback via comments
6. Student makes revisions

**Benefit:** Supports learning process

---

## Edge Cases & Error Handling

### Edge Case 1: Empty Dictation
**Scenario:** User clicks "Refine" without speaking

**Handling:**
- Show error: "Please dictate your thoughts first"
- Keep "Start Dictating" button active

---

### Edge Case 2: Very Short Input
**Scenario:** User says only 2-3 words

**Handling:**
- Show warning: "Your answer seems very short. Would you like to add more?"
- Options: "Add More" or "Refine Anyway"

---

### Edge Case 3: Very Long Input
**Scenario:** User dictates for 10+ minutes

**Handling:**
- Show progress: "X words captured (Y minutes)"
- Suggest breaking into sections
- Warn if approaching token limits

---

### Edge Case 4: Ambiguous Edit Command
**Scenario:** User says "Change that word" without specifying which word

**Handling:**
- AI asks: "Which word would you like to change?"
- Highlights recent words for selection
- User clarifies: "The word 'upset'"

---

### Edge Case 5: Contradictory Edits
**Scenario:** User changes "angry" to "upset", then back to "angry"

**Handling:**
- Allow it (user is in control)
- Optionally show edit history
- User can undo recent changes

---

### Edge Case 6: STT Errors
**Scenario:** Speech recognition misunderstands words

**Handling:**
- User can manually edit transcript before refinement
- "Edit Transcript" button in left panel
- Corrections are used for refinement

---

## Accessibility Considerations

### For Students with Severe Dyslexia
- **Large, clear fonts** in all text areas
- **High contrast** mode option
- **Minimal visual clutter**
- **Audio feedback** for all actions

### For Students with Motor Impairments
- **Large, easy-to-click buttons**
- **Keyboard shortcuts** for all actions
- **Voice commands** for navigation

### For Students with ADHD
- **Clear progress indicators**
- **Estimated time remaining**
- **Ability to save and resume**
- **Minimal distractions**

---

## Success Criteria for User Flow

1. **Intuitive**: Student can complete flow without instructions (after first use)
2. **Fast**: From start to finalized answer in < 5 minutes
3. **Forgiving**: Easy to undo mistakes or start over
4. **Transparent**: Student always knows what's happening
5. **Empowering**: Student feels in control throughout

---

## Next Steps

1. Create detailed UI mockups for each screen
2. Prototype voice command parsing logic
3. Design prompt engineering strategy for refinement
4. Build technical architecture for state management
5. Plan user testing with target students
