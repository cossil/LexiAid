# Refinement Prompt Fidelity Testing Guide

**Purpose**: Validate that the REFINEMENT_SYSTEM_PROMPT correctly adheres to the fidelity constraint - ensuring the AI refines student text WITHOUT adding external information.

**Date**: 2025-10-09  
**Status**: Ready for Execution  
**Model**: Gemini 2.0 Flash (or Gemini 2.5 Flash)  
**Temperature**: 0.3

---

## Testing Prerequisites

### 1. Environment Setup
- Backend server running (`flask --app app.py --debug run --port 5000`)
- Google Cloud API credentials configured
- `GOOGLE_API_KEY` environment variable set

### 2. Testing Approach
Two methods available:
- **Method A**: Automated script (`backend/tests/test_refinement_prompt.py`)
- **Method B**: Manual API testing via `/api/v2/answer-formulation/refine` endpoint

---

## Test Cases

### Test 1: Simple Grammar Fix ✅

**Input**:
```
The dog was ran fast.
```

**Expected Output**:
```
The dog ran fast.
```

**Fidelity Check**:
- ✅ Grammar corrected ("was ran" → "ran")
- ✅ No additional information added
- ✅ Meaning preserved

**Verdict Criteria**:
- **PASS**: Output fixes grammar only
- **FAIL**: Output adds context (e.g., "The dog ran fast across the field")

---

### Test 2: Filler Word Removal ✅

**Input**:
```
Um, so like, I think that, uh, the answer is photosynthesis.
```

**Expected Output**:
```
I think the answer is photosynthesis.
```
OR
```
The answer is photosynthesis.
```

**Fidelity Check**:
- ✅ Filler words removed (um, so, like, uh, that)
- ✅ Core meaning preserved
- ✅ No scientific details added

**Verdict Criteria**:
- **PASS**: Clean sentence, no additions
- **FAIL**: Adds explanation (e.g., "Photosynthesis is the process by which...")

---

### Test 3: Organization/Reordering ✅

**Question**: "Explain the causes of the American Revolution"

**Input**:
```
And the Boston Tea Party happened. The colonists were mad about taxes. They didn't have representation.
```

**Expected Output**:
```
The colonists were upset about taxes and lacked representation. The Boston Tea Party occurred.
```
OR similar logical reordering

**Fidelity Check**:
- ✅ Sentences reordered for logical flow
- ✅ "mad" → "upset" (acceptable synonym)
- ✅ NO dates added (e.g., "in 1773")
- ✅ NO additional causes mentioned

**Verdict Criteria**:
- **PASS**: Reordered, no external facts
- **FAIL**: Adds "taxation without representation" or dates

---

### Test 4: Temptation to Add (CRITICAL TEST) ⚠️

**Question**: "What caused the American Revolution?"

**Input**:
```
The American Revolution happened because of taxes.
```

**Expected Output**:
```
The American Revolution occurred because of taxes.
```

**NOT Acceptable**:
```
The American Revolution occurred in 1775 because of taxation without representation.
```

**Fidelity Check**:
- ✅ MUST NOT add "1775" or any date
- ✅ MUST NOT add "without representation"
- ✅ MUST NOT add "British Parliament"
- ✅ MUST NOT add "King George III"
- ✅ May improve grammar ("happened" → "occurred")

**Verdict Criteria**:
- **PASS**: Only grammar/word choice improved
- **FAIL**: ANY external historical fact added

**Why This Test Matters**: This is the MOST IMPORTANT test. Students with learning disabilities often provide minimal answers. The AI MUST resist the temptation to "help" by adding facts the student didn't mention.

---

### Test 5: Incomplete Thought ⚠️

**Question**: "What is photosynthesis?"

**Input**:
```
Photosynthesis is when plants... um... they use sunlight to...
```

**Expected Output**:
```
Photosynthesis is when plants use sunlight to...
```
(Keep incomplete, trailing off)

**NOT Acceptable**:
```
Photosynthesis is when plants use sunlight to produce food.
```

**Fidelity Check**:
- ✅ Filler words removed ("um")
- ✅ Sentence remains INCOMPLETE
- ✅ MUST NOT complete with "produce food", "make glucose", "create energy"

**Verdict Criteria**:
- **PASS**: Incomplete thought preserved
- **FAIL**: Thought completed with external knowledge

**Why This Test Matters**: Incomplete answers reveal what the student DOESN'T know. Completing them misrepresents the student's understanding.

---

### Test 6: Incorrect Technical Terms

**Question**: "Explain photosynthesis"

**Input**:
```
Photosynthesis is when plants breathe in sunlight and breathe out oxygen.
```

**Expected Output**:
```
Photosynthesis is when plants breathe in sunlight and breathe out oxygen.
```
OR
```
Photosynthesis is when plants take in sunlight and release oxygen.
```

**NOT Acceptable**:
```
Photosynthesis is when plants absorb sunlight and produce oxygen through chlorophyll.
```

**Fidelity Check**:
- ✅ Keep "breathe" (student's incorrect term)
- ✅ May use synonym ("take in" for "breathe in")
- ✅ MUST NOT introduce "absorb", "chlorophyll", "glucose"

**Verdict Criteria**:
- **PASS**: Student's misconception preserved
- **FAIL**: Corrects to scientifically accurate terms

**Why This Test Matters**: Teachers NEED to see student misconceptions to address them.

---

### Test 7: Self-Contradiction

**Question**: "Which process creates sex cells?"

**Input**:
```
I think the answer is mitosis. Wait, no, actually it's meiosis. Or maybe mitosis?
```

**Expected Output**:
```
I think the answer is mitosis. Wait, no, actually it's meiosis. Or maybe mitosis?
```
OR
```
I'm unsure if the answer is mitosis or meiosis.
```

**Fidelity Check**:
- ✅ Contradiction preserved OR summarized
- ✅ MUST NOT resolve to correct answer (meiosis)
- ✅ Shows student's uncertainty

**Verdict Criteria**:
- **PASS**: Uncertainty/contradiction maintained
- **FAIL**: Resolves to "The answer is meiosis"

---

### Test 8: Personal Experience

**Question**: "What caused the American Revolution?"

**Input**:
```
Like when I went to the museum last week, I saw that the colonists were really upset about the taxes.
```

**Expected Output**:
```
When I went to the museum last week, I saw that the colonists were upset about taxes.
```

**Fidelity Check**:
- ✅ Personal reference kept ("when I went to the museum")
- ✅ "really upset" → "upset" (acceptable)
- ✅ Student's voice preserved

**Verdict Criteria**:
- **PASS**: Personal experience maintained
- **FAIL**: Removes personal reference or adds historical facts

---

### Test 9: Slang and Informal Language

**Question**: "Describe the main character"

**Input**:
```
The dude in the story was super brave and didn't back down from the bad guys.
```

**Expected Output**:
```
The character in the story was very brave and didn't back down from the antagonists.
```
OR
```
The main character was super brave and didn't back down from the bad guys.
```

**Fidelity Check**:
- ✅ May formalize ("dude" → "character", "bad guys" → "antagonists")
- ✅ OR may keep informal tone
- ✅ Core meaning preserved

**Verdict Criteria**:
- **PASS**: Appropriate formalization OR informal tone kept
- **FAIL**: Adds character analysis not in original

---

### Test 10: Complex Multi-Sentence

**Question**: "Explain the water cycle"

**Input**:
```
So, um, the water cycle is like when water evaporates from the ocean and stuff. And then it goes up into the sky and forms clouds. Then it rains back down. And the whole thing starts over again.
```

**Expected Output**:
```
The water cycle is when water evaporates from the ocean. It goes up into the sky and forms clouds. Then it rains back down, and the cycle repeats.
```

**Fidelity Check**:
- ✅ Filler words removed ("so", "um", "like", "and stuff")
- ✅ Sentences organized logically
- ✅ All student ideas preserved
- ✅ NO additional stages added (condensation, precipitation, collection)

**Verdict Criteria**:
- **PASS**: Organized, no new concepts
- **FAIL**: Adds technical terms or missing stages

---

## Scoring Rubric

### Fidelity Score Calculation

For each test:
- **1.0**: Perfect fidelity (no violations)
- **0.9**: Minor violation (acceptable synonym that doesn't change meaning)
- **0.7**: Moderate violation (adds minor detail)
- **0.5**: Major violation (adds significant external information)
- **0.0**: Complete failure (rewrites with external knowledge)

### Overall Assessment

**Target Metrics**:
- ✅ 90% of tests score ≥ 0.9
- ✅ 100% of critical tests (4, 5, 6) score ≥ 0.9
- ✅ Average fidelity score ≥ 0.92

**Pass Criteria**:
- Minimum 8/10 tests PASS
- Tests 4, 5, and 6 MUST PASS (critical fidelity tests)

---

## How to Execute Tests

### Method A: Automated Testing (Recommended)

1. **Set up environment**:
   ```bash
   cd C:\Ai\aitutor_37
   # Ensure GOOGLE_API_KEY is set in .env
   ```

2. **Run test script**:
   ```bash
   python backend/tests/test_refinement_prompt.py
   ```

3. **Review output**:
   - Check console output for each test
   - Review generated report: `backend/tests/refinement_prompt_test_report.md`

### Method B: Manual API Testing

1. **Start backend server**:
   ```bash
   flask --app backend/app.py --debug run --port 5000
   ```

2. **For each test case, make POST request**:
   ```bash
   curl -X POST http://localhost:5000/api/v2/answer-formulation/refine \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "transcript": "TEST_INPUT_HERE",
       "question": "QUESTION_HERE"
     }'
   ```

3. **Analyze response**:
   - Compare `refined_answer` to expected output
   - Check for external information additions
   - Score using rubric above

---

## Common Failure Patterns

### Pattern 1: Date Addition
**Symptom**: AI adds dates not in original  
**Example**: "Revolution happened" → "Revolution happened in 1775"  
**Fix**: Strengthen prompt examples showing date additions as violations

### Pattern 2: Concept Completion
**Symptom**: AI completes incomplete thoughts  
**Example**: "Plants use sunlight to..." → "Plants use sunlight to make food"  
**Fix**: Add examples of incomplete thoughts that should stay incomplete

### Pattern 3: Technical Correction
**Symptom**: AI corrects student's incorrect terms  
**Example**: "Plants breathe" → "Plants absorb"  
**Fix**: Emphasize preserving student's exact terminology

### Pattern 4: Context Addition
**Symptom**: AI adds contextual information  
**Example**: "Taxes caused it" → "Taxation without representation caused it"  
**Fix**: Add negative examples in prompt

---

## Next Steps After Testing

### If Tests PASS (≥8/10, critical tests pass):
1. ✅ Proceed to user acceptance testing
2. ✅ Deploy to production with 10% fidelity sampling
3. ✅ Monitor real-world fidelity scores

### If Tests FAIL (<8/10 OR critical test fails):
1. ⚠️ Analyze failure patterns
2. ⚠️ Update REFINEMENT_SYSTEM_PROMPT with more examples
3. ⚠️ Add failed cases to prompt as negative examples
4. ⚠️ Re-run test suite
5. ⚠️ Iterate until passing

---

## Test Report Template

```markdown
# Refinement Prompt Test Results

**Date**: [DATE]
**Tester**: [NAME]
**Model**: Gemini 2.0 Flash
**Temperature**: 0.3

## Results Summary

| Test # | Test Name | Fidelity Score | Verdict | Notes |
|--------|-----------|----------------|---------|-------|
| 1 | Simple Grammar | 1.0 | PASS | Perfect |
| 2 | Filler Removal | 1.0 | PASS | Clean |
| 3 | Organization | 0.9 | PASS | Minor synonym |
| 4 | Temptation (CRITICAL) | 1.0 | PASS | No additions! |
| 5 | Incomplete (CRITICAL) | 1.0 | PASS | Stayed incomplete |
| 6 | Incorrect Terms (CRITICAL) | 1.0 | PASS | Kept "breathe" |
| 7 | Contradiction | 1.0 | PASS | Preserved uncertainty |
| 8 | Personal Experience | 1.0 | PASS | Kept museum reference |
| 9 | Slang | 0.9 | PASS | Appropriate formalization |
| 10 | Complex Multi-Sentence | 1.0 | PASS | Organized well |

**Overall Fidelity Score**: 0.98  
**Tests Passed**: 10/10  
**Critical Tests Passed**: 3/3  

**Recommendation**: ✅ APPROVED for production deployment
```

---

## Conclusion

This testing guide provides a systematic approach to validating the refinement prompt's fidelity constraint. The tests are designed to catch the most common ways an AI might violate fidelity by adding external information.

**Remember**: The goal is NOT perfect grammar or complete answers. The goal is to preserve the student's authentic knowledge and voice while improving clarity and organization.
