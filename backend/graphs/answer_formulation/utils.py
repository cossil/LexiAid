"""
Utility functions for the Answer Formulation feature.

This module contains helper functions for parsing edit commands,
extracting fidelity scores, and other common operations.
"""

import re
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)


def parse_edit_command(command: str) -> Dict[str, str]:
    """
    Parse an edit command to extract the type, target, and replacement text.
    
    This function attempts to understand the user's voice command and extract
    the relevant information for applying the edit.
    
    Args:
        command: The raw edit command from the user (e.g., "Change 'upset' to 'angry'")
        
    Returns:
        A dictionary containing:
        - type: The type of edit (replace, rephrase, add, delete, reorder, unknown)
        - target: The text to be modified (if applicable)
        - replacement: The new text (if applicable)
        - command: The original command (for unknown types)
        
    Examples:
        >>> parse_edit_command("Change 'upset' to 'angry'")
        {'type': 'replace', 'target': 'upset', 'replacement': 'angry'}
        
        >>> parse_edit_command("Rephrase the second sentence")
        {'type': 'rephrase', 'target': 'second sentence'}
    """
    command_lower = command.lower().strip()
    
    # Pattern 1: "Change 'X' to 'Y'" or "Replace 'X' with 'Y'"
    # Handles both single and double quotes
    replace_patterns = [
        r"change ['\"](.+?)['\"] to ['\"](.+?)['\"]",
        r"replace ['\"](.+?)['\"] with ['\"](.+?)['\"]",
        r"change (\w+) to (\w+)",  # Without quotes for single words
        r"replace (\w+) with (\w+)"
    ]
    
    for pattern in replace_patterns:
        match = re.search(pattern, command_lower)
        if match:
            return {
                "type": "replace",
                "target": match.group(1),
                "replacement": match.group(2)
            }
    
    # Pattern 2: "Rephrase the X sentence" or "Rephrase X"
    rephrase_patterns = [
        r"rephrase (?:the )?(.+)",
        r"reword (?:the )?(.+)"
    ]
    
    for pattern in rephrase_patterns:
        match = re.search(pattern, command_lower)
        if match:
            return {
                "type": "rephrase",
                "target": match.group(1).strip()
            }
    
    # Pattern 3: "Add 'X' after 'Y'" or "Insert 'X' before 'Y'"
    add_patterns = [
        r"add ['\"](.+?)['\"] (?:after|before) ['\"](.+?)['\"]",
        r"insert ['\"](.+?)['\"] (?:after|before) ['\"](.+?)['\"]"
    ]
    
    for pattern in add_patterns:
        match = re.search(pattern, command_lower)
        if match:
            position = "after" if "after" in command_lower else "before"
            return {
                "type": "add",
                "text": match.group(1),
                "target": match.group(2),
                "position": position
            }
    
    # Pattern 4: "Remove 'X'" or "Delete 'X'"
    delete_patterns = [
        r"remove (?:the word )?['\"](.+?)['\"]",
        r"delete (?:the word )?['\"](.+?)['\"]",
        r"remove (\w+)",
        r"delete (\w+)"
    ]
    
    for pattern in delete_patterns:
        match = re.search(pattern, command_lower)
        if match:
            return {
                "type": "delete",
                "target": match.group(1)
            }
    
    # Pattern 5: "Move X to the end/beginning"
    move_patterns = [
        r"move (?:the )?(.+?) to (?:the )?(end|beginning|start)",
    ]
    
    for pattern in move_patterns:
        match = re.search(pattern, command_lower)
        if match:
            return {
                "type": "reorder",
                "target": match.group(1).strip(),
                "position": match.group(2)
            }
    
    # Pattern 6: "Combine X and Y" or "Merge X and Y"
    combine_patterns = [
        r"combine (.+?) and (.+)",
        r"merge (.+?) and (.+)"
    ]
    
    for pattern in combine_patterns:
        match = re.search(pattern, command_lower)
        if match:
            return {
                "type": "combine",
                "target1": match.group(1).strip(),
                "target2": match.group(2).strip()
            }
    
    # If no pattern matched, return unknown type
    logger.warning(f"Could not parse edit command: {command}")
    return {
        "type": "unknown",
        "command": command
    }


def extract_fidelity_score(response: str) -> float:
    """
    Extract the fidelity score from the LLM's validation response.
    
    The validation prompt asks the LLM to output a fidelity score between 0.0 and 1.0.
    This function parses that score from the response text.
    
    Args:
        response: The LLM's validation response text
        
    Returns:
        A float between 0.0 and 1.0 representing the fidelity score.
        Returns 1.0 if no score can be extracted (assume perfect fidelity).
        
    Examples:
        >>> extract_fidelity_score("Fidelity Score: 0.95\\nViolations: None")
        0.95
        
        >>> extract_fidelity_score("Fidelity Score: 1.0\\nViolations: None")
        1.0
    """
    # Look for "Fidelity Score: X.X" pattern
    pattern = r"Fidelity Score:\s*([0-9]*\.?[0-9]+)"
    match = re.search(pattern, response, re.IGNORECASE)
    
    if match:
        try:
            score = float(match.group(1))
            # Ensure score is between 0.0 and 1.0
            score = max(0.0, min(1.0, score))
            return score
        except ValueError:
            logger.warning(f"Could not parse fidelity score from: {match.group(1)}")
            return 1.0
    
    # If no score found, assume perfect fidelity
    logger.warning(f"No fidelity score found in response, assuming 1.0")
    return 1.0


def extract_violations(response: str) -> List[str]:
    """
    Extract the list of violations from the LLM's validation response.
    
    The validation prompt asks the LLM to list any violations (external information
    added that wasn't in the original transcript).
    
    Args:
        response: The LLM's validation response text
        
    Returns:
        A list of violation strings. Returns empty list if no violations found
        or if the response indicates "None".
        
    Examples:
        >>> extract_violations("Violations: None")
        []
        
        >>> extract_violations("Violations:\\n1. Added date (1775)\\n2. Added concept")
        ['Added date (1775)', 'Added concept']
    """
    violations = []
    
    # Look for "Violations:" section
    violations_match = re.search(r"Violations:\s*(.+?)(?:\n\n|$)", response, re.IGNORECASE | re.DOTALL)
    
    if not violations_match:
        # No violations section found
        return []
    
    violations_text = violations_match.group(1).strip()
    
    # Check if it says "None"
    if re.search(r"^none\.?$", violations_text, re.IGNORECASE):
        return []
    
    # Parse numbered list (e.g., "1. Added date\n2. Added concept")
    numbered_pattern = r"\d+\.\s*(.+?)(?=\n\d+\.|\Z)"
    numbered_matches = re.findall(numbered_pattern, violations_text, re.DOTALL)
    
    if numbered_matches:
        violations = [v.strip() for v in numbered_matches]
        return violations
    
    # Parse bullet list (e.g., "- Added date\n- Added concept")
    bullet_pattern = r"[-•]\s*(.+?)(?=\n[-•]|\Z)"
    bullet_matches = re.findall(bullet_pattern, violations_text, re.DOTALL)
    
    if bullet_matches:
        violations = [v.strip() for v in bullet_matches]
        return violations
    
    # If no structured list, treat the whole text as one violation
    if violations_text and violations_text.lower() != "none":
        violations = [violations_text.strip()]
    
    return violations
