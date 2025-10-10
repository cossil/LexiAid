# Refinement Prompt Fidelity Test Report

**Generated**: 2025-10-09 11:13:25

**Prompt Tested**: REFINEMENT_SYSTEM_PROMPT

**Model**: gemini-2.5-flash (temperature=0.3)

---

## Test Results

### Test 1: Simple Grammar Fix

**Input Text**:
```
The dog was ran fast.
```

**Refined Output**:
```
The dog ran fast.
```

**Expected Behavior**: Fix grammar ('was ran' → 'ran'), no additions

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

### Test 2: Filler Word Removal

**Input Text**:
```
Um, so like, I think that, uh, the answer is photosynthesis.
```

**Refined Output**:
```
I think that the answer is photosynthesis.
```

**Expected Behavior**: Remove filler words (um, so, like, uh), keep meaning

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

### Test 3: Organization/Reordering

**Question**: Explain the causes of the American Revolution

**Input Text**:
```
And the Boston Tea Party happened. The colonists were mad about taxes. They didn't have representation.
```

**Refined Output**:
```
The colonists were mad about taxes because they didn't have representation. The Boston Tea Party also happened.
```

**Expected Behavior**: Reorder for logical flow, no external facts added

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

### Test 4: Temptation to Add (CRITICAL)

**Question**: What caused the American Revolution?

**Input Text**:
```
The American Revolution happened because of taxes.
```

**Refined Output**:
```
The American Revolution happened because of taxes.
```

**Expected Behavior**: MUST NOT add dates (1775), 'without representation', or other facts

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

### Test 5: Incomplete Thought

**Question**: What is photosynthesis?

**Input Text**:
```
Photosynthesis is when plants... um... they use sunlight to...
```

**Refined Output**:
```
Photosynthesis is when plants use sunlight to...
```

**Expected Behavior**: Keep incomplete, MUST NOT complete with 'produce food' or 'make glucose'

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

### Test 6: Incorrect Technical Terms

**Question**: Explain photosynthesis

**Input Text**:
```
Photosynthesis is when plants breathe in sunlight and breathe out oxygen.
```

**Refined Output**:
```
Photosynthesis is when plants breathe in sunlight and breathe out oxygen.
```

**Expected Behavior**: Keep 'breathe' (incorrect term), don't correct to technical terms

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

### Test 7: Self-Contradiction

**Question**: Which process creates sex cells?

**Input Text**:
```
I think the answer is mitosis. Wait, no, actually it's meiosis. Or maybe mitosis?
```

**Refined Output**:
```
I think the answer is mitosis. Wait, no, actually, it's meiosis. Or maybe mitosis?
```

**Expected Behavior**: Keep contradiction, shows thought process

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

### Test 8: Personal Experience

**Question**: What caused the American Revolution?

**Input Text**:
```
Like when I went to the museum last week, I saw that the colonists were really upset about the taxes.
```

**Refined Output**:
```
When I went to the museum last week, I saw that the colonists were upset about the taxes.
```

**Expected Behavior**: Keep personal reference ('when I went to the museum')

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

### Test 9: Slang and Informal Language

**Question**: Describe the main character

**Input Text**:
```
The dude in the story was super brave and didn't back down from the bad guys.
```

**Refined Output**:
```
The main character in the story was super brave and didn't back down from the bad guys.
```

**Expected Behavior**: May formalize slightly ('character' for 'dude'), but keep informal tone

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

### Test 10: Complex Multi-Sentence

**Question**: Explain the water cycle

**Input Text**:
```
So, um, the water cycle is like when water evaporates from the ocean and stuff. And then it goes up into the sky and forms clouds. Then it rains back down. And the whole thing starts over again.
```

**Refined Output**:
```
The water cycle is when water evaporates from the ocean and stuff. It goes up into the sky and forms clouds. Then it rains back down, and the whole thing starts over again.
```

**Expected Behavior**: Organize sentences, remove fillers, but keep all student's ideas

**Verdict**: [ ] PASS / [ ] FAIL

**Analysis**:
- [ ] No external facts added
- [ ] No dates or specific details not in original
- [ ] Student's ideas preserved
- [ ] Grammar/organization improved appropriately

**Notes**: _[Manual review required]_

---

## Summary

- **Total Tests**: 10
- **Passed**: _[To be filled after manual review]_
- **Failed**: _[To be filled after manual review]_
- **Fidelity Score**: _[To be calculated]_

## Recommendations

_[To be filled based on test results]_

