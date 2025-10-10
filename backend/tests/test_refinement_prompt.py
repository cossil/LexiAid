"""
Test Suite for REFINEMENT_SYSTEM_PROMPT
Tests the fidelity constraint - ensuring AI doesn't add external information
"""

import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env'))

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_google_genai import ChatGoogleGenerativeAI
from graphs.answer_formulation.prompts import REFINEMENT_SYSTEM_PROMPT
from datetime import datetime


def test_refinement(test_name, input_text, question="", expected_behavior=""):
    """
    Test the refinement prompt with a given input.
    
    Args:
        test_name: Name of the test case
        input_text: The messy student transcript
        question: Optional assignment question
        expected_behavior: What we expect the AI to do
    
    Returns:
        dict with test results
    """
    print(f"\n{'='*80}")
    print(f"TEST: {test_name}")
    print(f"{'='*80}")
    print(f"\nInput Text:\n\"{input_text}\"")
    if question:
        print(f"\nQuestion: {question}")
    print(f"\nExpected Behavior: {expected_behavior}")
    
    # Build the user prompt
    user_prompt = f"""
Original Question/Prompt: {question if question else 'Not provided'}

Student's Spoken Thoughts (verbatim):
{input_text}

Your task: Refine this into a clear, well-structured answer.
"""
    
    # Initialize LLM
    api_key = os.getenv('GEMINI_API_KEY') or os.getenv('GOOGLE_API_KEY')
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        temperature=0.3,
        google_api_key=api_key
    )
    
    # Invoke LLM
    try:
        response = llm.invoke([
            {"role": "system", "content": REFINEMENT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ])
        
        refined_output = response.content.strip()
        
        print(f"\nRefined Output:\n\"{refined_output}\"")
        
        return {
            "test_name": test_name,
            "input": input_text,
            "output": refined_output,
            "question": question,
            "expected_behavior": expected_behavior,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        return {
            "test_name": test_name,
            "input": input_text,
            "output": f"ERROR: {str(e)}",
            "question": question,
            "expected_behavior": expected_behavior,
            "timestamp": datetime.now().isoformat()
        }


def main():
    """Run all test cases"""
    print("\n" + "="*80)
    print("REFINEMENT PROMPT FIDELITY TEST SUITE")
    print("="*80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # Test 1: Simple Grammar Fix
    results.append(test_refinement(
        test_name="Test 1: Simple Grammar Fix",
        input_text="The dog was ran fast.",
        expected_behavior="Fix grammar ('was ran' → 'ran'), no additions"
    ))
    
    # Test 2: Filler Word Removal
    results.append(test_refinement(
        test_name="Test 2: Filler Word Removal",
        input_text="Um, so like, I think that, uh, the answer is photosynthesis.",
        expected_behavior="Remove filler words (um, so, like, uh), keep meaning"
    ))
    
    # Test 3: Organization (Reordering)
    results.append(test_refinement(
        test_name="Test 3: Organization/Reordering",
        input_text="And the Boston Tea Party happened. The colonists were mad about taxes. They didn't have representation.",
        question="Explain the causes of the American Revolution",
        expected_behavior="Reorder for logical flow, no external facts added"
    ))
    
    # Test 4: Temptation to Add (Should Resist)
    results.append(test_refinement(
        test_name="Test 4: Temptation to Add (CRITICAL)",
        input_text="The American Revolution happened because of taxes.",
        question="What caused the American Revolution?",
        expected_behavior="MUST NOT add dates (1775), 'without representation', or other facts"
    ))
    
    # Test 5: Incomplete Thought (Should Keep Incomplete)
    results.append(test_refinement(
        test_name="Test 5: Incomplete Thought",
        input_text="Photosynthesis is when plants... um... they use sunlight to...",
        question="What is photosynthesis?",
        expected_behavior="Keep incomplete, MUST NOT complete with 'produce food' or 'make glucose'"
    ))
    
    # Test 6: Technical Terms Used Incorrectly
    results.append(test_refinement(
        test_name="Test 6: Incorrect Technical Terms",
        input_text="Photosynthesis is when plants breathe in sunlight and breathe out oxygen.",
        question="Explain photosynthesis",
        expected_behavior="Keep 'breathe' (incorrect term), don't correct to technical terms"
    ))
    
    # Test 7: Student Contradicts Themselves
    results.append(test_refinement(
        test_name="Test 7: Self-Contradiction",
        input_text="I think the answer is mitosis. Wait, no, actually it's meiosis. Or maybe mitosis?",
        question="Which process creates sex cells?",
        expected_behavior="Keep contradiction, shows thought process"
    ))
    
    # Test 8: Personal Experience
    results.append(test_refinement(
        test_name="Test 8: Personal Experience",
        input_text="Like when I went to the museum last week, I saw that the colonists were really upset about the taxes.",
        question="What caused the American Revolution?",
        expected_behavior="Keep personal reference ('when I went to the museum')"
    ))
    
    # Test 9: Slang/Informal Language
    results.append(test_refinement(
        test_name="Test 9: Slang and Informal Language",
        input_text="The dude in the story was super brave and didn't back down from the bad guys.",
        question="Describe the main character",
        expected_behavior="May formalize slightly ('character' for 'dude'), but keep informal tone"
    ))
    
    # Test 10: Complex Multi-Sentence Input
    results.append(test_refinement(
        test_name="Test 10: Complex Multi-Sentence",
        input_text="So, um, the water cycle is like when water evaporates from the ocean and stuff. And then it goes up into the sky and forms clouds. Then it rains back down. And the whole thing starts over again.",
        question="Explain the water cycle",
        expected_behavior="Organize sentences, remove fillers, but keep all student's ideas"
    ))
    
    # Print summary
    print("\n" + "="*80)
    print("TEST SUITE COMPLETE")
    print("="*80)
    print(f"Total tests run: {len(results)}")
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Generate markdown report
    generate_markdown_report(results)
    
    return results


def generate_markdown_report(results):
    """Generate a detailed markdown report"""
    report_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "tests",
        "refinement_prompt_test_report.md"
    )
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# Refinement Prompt Fidelity Test Report\n\n")
        f.write(f"**Generated**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**Prompt Tested**: REFINEMENT_SYSTEM_PROMPT\n\n")
        f.write(f"**Model**: gemini-2.5-flash (temperature=0.3)\n\n")
        f.write("---\n\n")
        f.write("## Test Results\n\n")
        
        for i, result in enumerate(results, 1):
            f.write(f"### {result['test_name']}\n\n")
            
            if result.get('question'):
                f.write(f"**Question**: {result['question']}\n\n")
            
            f.write(f"**Input Text**:\n```\n{result['input']}\n```\n\n")
            f.write(f"**Refined Output**:\n```\n{result['output']}\n```\n\n")
            f.write(f"**Expected Behavior**: {result['expected_behavior']}\n\n")
            
            # Placeholder for manual analysis
            f.write(f"**Verdict**: [ ] PASS / [ ] FAIL\n\n")
            f.write(f"**Analysis**:\n")
            f.write(f"- [ ] No external facts added\n")
            f.write(f"- [ ] No dates or specific details not in original\n")
            f.write(f"- [ ] Student's ideas preserved\n")
            f.write(f"- [ ] Grammar/organization improved appropriately\n\n")
            f.write(f"**Notes**: _[Manual review required]_\n\n")
            f.write("---\n\n")
        
        f.write("## Summary\n\n")
        f.write(f"- **Total Tests**: {len(results)}\n")
        f.write(f"- **Passed**: _[To be filled after manual review]_\n")
        f.write(f"- **Failed**: _[To be filled after manual review]_\n")
        f.write(f"- **Fidelity Score**: _[To be calculated]_\n\n")
        
        f.write("## Recommendations\n\n")
        f.write("_[To be filled based on test results]_\n\n")
    
    print(f"\n✅ Detailed report generated: {report_path}")


if __name__ == "__main__":
    main()
