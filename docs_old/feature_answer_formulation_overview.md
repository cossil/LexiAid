# AI-Assisted Answer Formulation: Feature Overview

## Executive Summary

The AI-Assisted Answer Formulation feature is designed to help students with severe learning disabilities (dyslexia, dysgraphia, etc.) translate their verbal knowledge into well-structured written answers. This feature bridges the gap between what a student knows and their ability to express it in writing.

## The Problem We're Solving

**Target User Profile:**
- Bright students with severe learning disabilities
- Strong verbal comprehension and reasoning
- Struggle with written expression (dysgraphia)
- Can articulate ideas verbally but cannot organize them in writing

**Current Pain Points:**
1. Student knows the answer but cannot write it coherently
2. Written work doesn't reflect actual knowledge level
3. Frustration and anxiety around written assignments
4. Time-consuming and exhausting writing process

## The Solution

### Core Concept

A three-phase iterative process:

1. **Capture Phase**: Student speaks their thoughts freely (messy, disorganized OK)
2. **Refinement Phase**: AI transforms spoken words into clear, structured text
3. **Iteration Phase**: Student refines through voice commands until satisfied

### Critical Constraint

**The AI is FORBIDDEN from adding external information or knowledge.**

This is not a "help me write an essay" tool. It's a "help me express what I already know" tool.

## Why This Feature is Transformative

### For Students
- **Removes Writing Barrier**: Bypasses dysgraphia entirely
- **Preserves Authenticity**: Output reflects student's actual knowledge
- **Builds Confidence**: Students see their ideas clearly expressed
- **Reduces Anxiety**: No more staring at blank page

### For Educators
- **Accurate Assessment**: Can evaluate actual knowledge, not writing ability
- **Accommodation Tool**: Legitimate assistive technology for IEPs/504 plans
- **Fair Evaluation**: Levels playing field for students with disabilities

### For Parents
- **Homework Support**: Reduces parent-child conflict over writing
- **Independence**: Student can complete assignments without constant help
- **Academic Success**: Better grades reflect true understanding

## Key Success Criteria

1. **Fidelity**: Output contains ONLY student's ideas (no AI additions)
2. **Clarity**: Messy speech → clear, organized text
3. **Usability**: Intuitive voice-based interaction
4. **Speed**: Fast enough for real-time homework use
5. **Accuracy**: STT correctly captures student's words

## Comparison to Existing Features

| Feature | Purpose | User Control | AI Role |
|---------|---------|--------------|---------|
| **Chat with Document** | Answer questions about content | Ask questions | Provide information from document |
| **Quiz** | Test knowledge | Answer questions | Generate questions, evaluate answers |
| **Answer Formulation** | Express own knowledge | Dictate thoughts, refine output | Organize & clarify (no new info) |

**Key Difference**: Answer Formulation is the ONLY feature where the AI must NOT add information.

## Technical Challenges

### 1. Prompt Engineering
- How to enforce "no external information" constraint?
- How to distinguish between "clarifying" and "adding"?
- How to handle ambiguous input?

### 2. State Management
- Multi-turn conversation with iterative refinement
- Tracking original transcript vs. refined versions
- Managing edit history

### 3. Voice Command Parsing
- Understanding edit commands: "Change X to Y", "Rephrase that sentence"
- Identifying which part of text to modify
- Handling ambiguous references ("that word", "the second paragraph")

### 4. User Experience
- Real-time feedback during dictation
- Clear visual distinction between raw and refined text
- Intuitive editing workflow

## Scope Boundaries

### In Scope (MVP)
- Single-answer formulation (one question/prompt at a time)
- Voice input for initial thoughts
- AI refinement of grammar, structure, clarity
- Voice-based editing commands
- Text-to-speech readback of refined answer
- Final text output (copy/export)

### Out of Scope (Future)
- Multi-paragraph essay writing
- Research assistance or fact-checking
- Citation management
- Collaborative editing with teachers
- Integration with Google Docs/Word
- Handwriting recognition

## Success Metrics

### Quantitative
- **Fidelity Score**: % of refined text that comes from original transcript
- **User Satisfaction**: Post-task survey rating
- **Completion Rate**: % of sessions that reach "finalized" state
- **Iteration Count**: Average number of refinement cycles
- **Time to Complete**: Average time from start to finalized answer

### Qualitative
- Student feels output represents their knowledge
- Teachers accept output as legitimate accommodation
- Parents report reduced homework stress
- Students use feature independently (without adult help)

## Next Steps

1. **Detailed User Flow Design** (see `feature_answer_formulation_user_flow.md`)
2. **Technical Architecture** (see `feature_answer_formulation_architecture.md`)
3. **Prompt Engineering Strategy** (see `feature_answer_formulation_prompts.md`)
4. **UI/UX Mockups** (see `feature_answer_formulation_ui_design.md`)
5. **Testing & Validation Plan** (see `feature_answer_formulation_testing.md`)

## Related Documents

- `What is LexiAid.md` - Overall product vision
- `active_dependency_graph.md` - Current system architecture
- `refactoring_plan.md` - Ongoing technical improvements
