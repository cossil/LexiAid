# Answer Formulation - Quick Start Guide

**For**: Developers, Testers, and Early Users  
**Last Updated**: 2025-10-09

---

## Getting Started (5 Minutes)

### Prerequisites

1. **Backend Running**:
   ```bash
   cd C:\Ai\aitutor_37
   flask --app backend/app.py --debug run --port 5000
   ```

2. **Frontend Running**:
   ```bash
   cd C:\Ai\aitutor_37
   npm run dev
   ```
   (Runs on http://localhost:5173)

3. **Authenticated User**: Sign in to the application

---

## Accessing the Feature

1. Navigate to: `http://localhost:5173/dashboard/answer-formulation`
2. Or click **"Answer Formulation"** in the sidebar (pen icon)

---

## First-Time User Experience

### Step 1: Guided Practice (Recommended)

On first visit, you'll see a 6-step tutorial:

1. **Welcome Screen**: Click "Start Practice"
2. **Sample Question**: "What makes a good friend?"
3. **Dictation Practice**: Click microphone, speak naturally
4. **See Refinement**: Watch AI clean up your speech
5. **Try Editing**: Practice voice or manual editing
6. **Complete**: Click "Start My First Answer"

**Skip Option**: Click "Skip to Feature" if you want to dive in

---

## Using the Feature

### Basic Workflow

```
1. Enter Question (optional)
   ↓
2. Dictate Your Thoughts
   ↓
3. Refine Answer
   ↓
4. Edit (voice or manual)
   ↓
5. Finalize & Export
```

---

## Step-by-Step Instructions

### 1. Enter Your Question (Optional)

- Type or paste your assignment question
- Example: "Explain the causes of the American Revolution"
- Max 500 characters
- **Why**: Helps organize your answer

### 2. Dictate Your Thoughts

**Click the green microphone button** and speak naturally:

- ✅ **DO**: Speak freely, use filler words (um, like, uh)
- ✅ **DO**: Ramble, go out of order, repeat yourself
- ✅ **DO**: Use your own words and examples
- ❌ **DON'T**: Worry about grammar or organization
- ❌ **DON'T**: Try to sound formal

**Example**:
> "Um, so like, the American Revolution happened because the colonists were mad about taxes. And they didn't have representation. Oh, and the Boston Tea Party thing happened. That was important too."

**Auto-Pause Feature**:
- If enabled, dictation stops after you pause for 3 seconds
- You'll see a countdown: "Auto-stopping in 3... 2... 1..."
- Resume speaking to cancel
- Configure in Settings (⚙️ icon)

**Manual Stop**:
- Click the red "Stop Dictating" button

### 3. Refine Your Answer

**Click "Refine My Answer"**

The AI will:
- ✅ Remove filler words (um, like, uh)
- ✅ Fix grammar
- ✅ Organize sentences logically
- ✅ Keep ALL your ideas
- ❌ NOT add external facts
- ❌ NOT add dates or details you didn't mention

**Example Output**:
> "The American Revolution occurred because the colonists were upset about taxes and lacked representation. The Boston Tea Party was an important event."

**Review Side-by-Side**:
- Left: Your original spoken thoughts
- Right: Refined answer
- Click "🔊 Listen" to hear it read aloud

### 4. Edit Your Answer (Optional)

Three options:

#### Option A: Edit with Voice

**Click "Edit with Voice"**

Say commands like:
- "Change 'upset' to 'angry'"
- "Rephrase the second sentence"
- "Add 'in Boston' after 'Tea Party'"
- "Remove the word 'very'"

**See Examples**: Click to expand edit command examples

**Undo**: Click "Undo Last Edit" if needed

#### Option B: Edit Manually

**Click "Edit Manually"**

- Type directly in the text box
- Place cursor anywhere
- Click "Dictate at Cursor" to insert voice text
- Use Ctrl+Z to undo, Ctrl+Y to redo

#### Option C: Skip Editing

**Click "Finalize Answer"** if you're happy with the refinement

### 5. Finalize & Export

**Click "Finalize Answer"**

Your answer is ready! Now you can:

- **📋 Copy to Clipboard**: Paste into your assignment
- **💾 Download as Text**: Save as .txt file
- **🆕 Start New Answer**: Begin another question

**Metadata Shown**:
- Word count
- Number of refinement iterations

---

## Auto-Pause Settings

**Access**: Click ⚙️ Settings icon during dictation

### Toggle Auto-Pause
- **ON**: Stops automatically after pause
- **OFF**: Manual stop only

### Adjust Duration (1-10 seconds)
- **1-2s**: Fast speakers
- **3-4s**: Standard (recommended)
- **5-7s**: Need thinking time
- **8-10s**: Processing delays

### Test Your Settings
- Click "🎤 Test Auto-Pause"
- Speak and pause to see how it feels

---

## Tips for Best Results

### For Dictation

1. **Speak Naturally**: Don't try to be perfect
2. **Use Examples**: "Like when I went to the museum..."
3. **Think Out Loud**: "Wait, no, actually..."
4. **Be Specific**: Use names, places, events you know

### For Refinement

1. **Review Carefully**: Check if your ideas are preserved
2. **Use Listen Feature**: Hear how it sounds
3. **Edit if Needed**: Fix anything that's not quite right

### For Editing

1. **Voice Commands**: Be specific ("Change X to Y")
2. **Manual Editing**: Use for complex changes
3. **Undo Freely**: Experiment without worry

---

## Common Questions

### Q: Will the AI add information I didn't say?

**A**: No! The AI is specifically designed to ONLY use your words and ideas. It won't add:
- Dates you didn't mention
- Facts you didn't state
- Explanations you didn't give

### Q: What if I make a mistake or say something wrong?

**A**: The AI will keep your mistakes! This is intentional - it shows what you actually know. Teachers can then help you learn the correct information.

### Q: Can I use this for any subject?

**A**: Yes! History, science, English, math word problems, etc.

### Q: How long can my answer be?

**A**: 5-2000 words. Most answers are 50-500 words.

### Q: Can I come back to an answer later?

**A**: Yes! Your session is saved. Use the same session ID to continue.

### Q: Does auto-pause work well?

**A**: Most users find 3-4 seconds works great. Adjust based on your speaking pace.

---

## Troubleshooting

### Microphone Not Working

1. Check browser permissions (allow microphone access)
2. Check system microphone settings
3. Try refreshing the page
4. Try a different browser (Chrome recommended)

### Refinement Failed

1. Check your internet connection
2. Make sure you spoke at least 5 words
3. Try again (temporary API issue)
4. Check error message for details

### Auto-Pause Too Fast/Slow

1. Click ⚙️ Settings
2. Adjust pause duration slider
3. Click "Test Auto-Pause" to try it
4. Save when comfortable

### Answer Doesn't Sound Right

1. Use "Edit with Voice" to make changes
2. Or use "Edit Manually" for precise control
3. Or click "Start Over" to re-dictate

---

## Keyboard Shortcuts

### During Manual Editing
- **Ctrl+Z**: Undo
- **Ctrl+Shift+Z** or **Ctrl+Y**: Redo
- **Esc**: Exit edit mode

---

## Example Session

### Input (Spoken):
> "Um, so like, photosynthesis is when plants, uh, use sunlight to make food. And they need water too. Oh, and carbon dioxide. They breathe that in. Then they make oxygen and we breathe that."

### Refined Output:
> "Photosynthesis is when plants use sunlight to make food. They need water and carbon dioxide, which they take in. Then they produce oxygen, which we breathe."

### Voice Edit:
> "Change 'take in' to 'absorb'"

### Final Answer:
> "Photosynthesis is when plants use sunlight to make food. They need water and carbon dioxide, which they absorb. Then they produce oxygen, which we breathe."

---

## Getting Help

### In-App Help
- Hover over 💡 icons for tips
- Check the guided practice tutorial
- Read error messages carefully

### Documentation
- `EXECUTION_PLAN.md`: Full feature specification
- `feature_answer_formulation_user_flow.md`: Detailed user journeys
- `REFINEMENT_PROMPT_TESTING_GUIDE.md`: How the AI works

### Support
- Report issues via GitHub
- Contact development team
- Check logs for technical errors

---

## Privacy & Data

- **Transcripts**: Stored temporarily for your session
- **Refined Answers**: Saved until you finalize
- **Sessions**: Persist for 30 days
- **No Sharing**: Your answers are private
- **Fidelity Sampling**: 10% of refinements checked for quality (anonymous)

---

## Next Steps

1. ✅ Complete the guided practice
2. ✅ Try with a real assignment question
3. ✅ Experiment with auto-pause settings
4. ✅ Practice voice editing
5. ✅ Share feedback with the team

---

**Ready to transform your spoken thoughts into clear written answers? Let's get started! 🎤✨**
