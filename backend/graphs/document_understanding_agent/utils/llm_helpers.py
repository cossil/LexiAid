# backend/graphs/document_understanding_agent/utils/llm_helpers.py
import json
from typing import Dict, Any, Optional, List

from langchain_core.messages import SystemMessage, HumanMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

# --- Constants for Block Classification Prompt --- (DUA.4.3)
SYSTEM_PROMPT_B = """
Analyze the text block extracted from a document page. Your task is to classify this block and extract relevant information. 
Respond ONLY with a single JSON object adhering to the following structure. Do NOT include any explanatory text before or after the JSON object.

Possible types: 'heading', 'paragraph', 'list', 'table_row', 'other'.

Base JSON Structure:
{
  "type": "(type)", 
  "text": "(content based on type)", 
  "level": (integer for heading level, or null),
  "list_type": "(ordered/unordered, null if not a list)",
  "items": [ { "id": "<example_uuid>", "text": "item 1"} ],
  "is_header_row": (boolean, null if not table_row),
  "cells": [ { "id": "<example_uuid>", "text": "cell 1", "col_span": 1, "row_span": 1 } ]
}

Detailed instructions by type:
1. 'list': 'text' is the overall title of the list (set to null if there is no explicit title, or if the first line of the block is clearly the first item of the list). 'items' is an array of objects, e.g., [{"id": "<example_uuid>", "text": "item text"}]. Each object represents one list item. If a line appears to be the first item of a list (especially if it's followed by other lines that are clearly list items, or if it lacks a clear preceding title line), it MUST be treated as the first item in the 'items' array, and the list's overall 'text' field should be null.
2. 'heading': 'text' is heading. 'level' is 1-6.
3. 'paragraph': 'text' is content.
4. 'table_row': 'text' is null/comment. 'is_header_row' is boolean. 'cells' is array of objects [{"id": "<example_uuid>", "text": "text", "col_span":1, "row_span":1}]. Parse cells by delimiters like '|'.
5. 'other': 'text' is content.

Ensure all fields from Base JSON Structure are present (null if not applicable for type).
Example for list item objects: {"type": "list", "text": null, "list_type": "unordered", "items": [{"id": "<example_uuid>", "text": "Item A"}, {"id": "<example_uuid>", "text": "Item B"}], "level": null, "is_header_row": null, "cells": null}
Example for a list where the first item has no marker and there's no list title:
Input Text Block:
First item itself
* Second item with marker

Expected JSON Output:
{
  "type": "list",
  "text": null,
  "level": null,
  "list_type": "unordered",
  "items": [
    {"id": "<example_uuid>", "text": "First item itself"},
    {"id": "<example_uuid>", "text": "Second item with marker"}
  ],
  "is_header_row": null,
  "cells": null
}
Example for table_row (pipe delimited): Input: "Feature | Product A"
Output: {"type": "table_row", "text": null, "is_header_row": true, "cells": [{"id": "<example_uuid>", "text": "Feature"}, {"id": "<example_uuid>", "text": "Product A"}], "level": null, "list_type": null, "items": null}
"""

HUMAN_PROMPT_B_TEMPLATE = """
---BEGIN TEXT BLOCK---
{block_text}
---END TEXT BLOCK---
"""

CLASSIFICATION_PROMPT_TEMPLATE = ChatPromptTemplate.from_messages([
    SystemMessage(content=SYSTEM_PROMPT_B),
    HumanMessagePromptTemplate.from_template(HUMAN_PROMPT_B_TEMPLATE)
])

# --- Helper Functions for Block Classification --- (DUA.4.3)

def generate_classification_messages(block_text: str) -> List[BaseMessage]:
    """Generates the list of messages for LLM block classification based on the block text."""
    return CLASSIFICATION_PROMPT_TEMPLATE.format_messages(block_text=block_text)

def parse_llm_classification_response(response_content: str, block_text_for_error_logging: str = "N/A") -> Dict[str, Any]:
    """
    Parses the LLM's string response for block classification into a dictionary.
    Includes stripping markdown, JSON decoding, and schema validation.
    Returns a dictionary with 'status' ('success' or 'error') and 'data' or error details.
    """
    cleaned_response_str = strip_markdown_code_fence(response_content)

    if not cleaned_response_str:
        print(f"      WARN: LLM output for block classification was empty after stripping markdown. Block Text (start): {block_text_for_error_logging[:100]}... Original Response (start): {response_content[:100]}...")
        return {
            "status": "error",
            "error_type": "EmptyLLMResponse",
            "message": "LLM output was empty after stripping markdown.",
            "original_content": response_content,
            "cleaned_content": cleaned_response_str
        }

    # DUA.4.8.2: Handle Plain Text LLM Errors/Non-JSON Responses (preemptive check)
    if not cleaned_response_str.strip().startswith(('{', '[')):
        print(f"    ERROR: LLM response was not in expected JSON format. Block Text (start): {block_text_for_error_logging[:100]}... Cleaned Response (start): {cleaned_response_str[:100]}...")
        return {
            "status": "error",
            "error_type": "InvalidLLMResponseFormat",
            "message": "LLM response was not in the expected JSON format.",
            "original_content": response_content,
            "cleaned_content": cleaned_response_str
        }

    try:
        parsed_response = json.loads(cleaned_response_str)

        # DUA.4.8.1: Handle Schema Validation Errors
        if not isinstance(parsed_response, dict):
            raise ValueError("Parsed JSON is not a dictionary.")

        block_type = parsed_response.get('type')
        if not block_type:
            raise ValueError("Missing required key: 'type'.")

        required_keys_by_type = {
            'heading': ['text', 'level'],
            'paragraph': ['text'],
            'list': ['items', 'list_type'],
            'table_row': ['cells', 'is_header_row'],
            'other': ['text']
        }

        if block_type not in required_keys_by_type:
            # This case implies the LLM provided a 'type' not in our predefined list,
            # which could be an error or a new type. For now, treat as schema error.
            raise ValueError(f"Unknown block type: '{block_type}'. Expected one of {list(required_keys_by_type.keys())}.")

        missing_keys = [key for key in required_keys_by_type.get(block_type, []) if key not in parsed_response]
        if missing_keys:
            raise ValueError(f"Missing required key(s) for type '{block_type}': {', '.join(missing_keys)}.")

        # Type-specific validations (e.g., 'items' in list should be a list)
        if block_type == 'list' and not isinstance(parsed_response.get('items'), list):
            raise ValueError(f"Invalid type for 'items' in list block: expected list, got {type(parsed_response.get('items'))}.")
        if block_type == 'table_row' and not isinstance(parsed_response.get('cells'), list):
            raise ValueError(f"Invalid type for 'cells' in table_row block: expected list, got {type(parsed_response.get('cells'))}.")
        
        # Could add more detailed validation for list items and table cells if needed here

        return {"status": "success", "data": parsed_response}

    except json.JSONDecodeError as e:
        error_message_detail = f"Failed to decode JSON from LLM. Error: {str(e)}"
        print(f"    ERROR: {error_message_detail} For Block Text (start): {block_text_for_error_logging[:100]}...")
        print(f"    Problematic LLM output (cleaned, up to 500 chars): {cleaned_response_str[:500]}")
        return {
            "status": "error",
            "error_type": "JSONDecodeError",
            "message": str(e),
            "original_content": response_content,
            "cleaned_content": cleaned_response_str
        }
    except ValueError as e: # Catch schema validation errors (DUA.4.8.1)
        error_message_detail = f"Schema validation failed for LLM response. Error: {str(e)}"
        print(f"    ERROR: {error_message_detail} For Block Text (start): {block_text_for_error_logging[:100]}...")
        print(f"    Problematic LLM output (cleaned, up to 500 chars): {cleaned_response_str[:500]}")
        return {
            "status": "error",
            "error_type": "SchemaValidationError",
            "message": str(e),
            "original_content": response_content,
            "cleaned_content": cleaned_response_str
        }
    except Exception as e: # Catch any other unexpected errors
        error_message_detail = f"Unexpected error during LLM response parsing. Error: {str(e)}"
        print(f"    ERROR: {error_message_detail} For Block Text (start): {block_text_for_error_logging[:100]}...")
        print(f"    Problematic LLM output (cleaned, up to 500 chars): {cleaned_response_str[:500]}")
        return {
            "status": "error",
            "error_type": "UnexpectedParsingError",
            "message": str(e),
            "original_content": response_content,
            "cleaned_content": cleaned_response_str
        }


def strip_markdown_code_fence(text: str) -> str:
    """
    Removes common markdown code fences (```json ... ``` or ``` ... ```) from a string.
    Also handles potential leading/trailing whitespace around the fences.
    """
    if not text:
        return ""
    
    stripped_text = text.strip()

    if stripped_text.startswith("```json") and stripped_text.endswith("```"):
        return stripped_text[len("```json"): -len("```")].strip()
    elif stripped_text.startswith("```") and stripped_text.endswith("```"):
        return stripped_text[len("```"): -len("```")].strip()
    
    return text # Return original if no fences matched, or if it was only whitespace


# --- Helper Function for Image Captioning (Unchanged for DUA.4.3) ---

def generate_image_caption(text_before: str, text_after: str, caption_llm: ChatGoogleGenerativeAI) -> str:
    """Generates an image caption based on surrounding text using an LLM."""
    if not text_before and not text_after:
        return "No surrounding text available to generate a caption."

    prompt_text = (
        f"An image is present in a document. Based on the surrounding text, please generate a brief, "
        f"descriptive placeholder caption for this image. Focus only on what can be inferred from the text. "
        f"If the context is insufficient, indicate that.\n\n"
        f"Text before image (if any):\n{text_before}\n\n"
        f"Text after image (if any):\n{text_after}\n\n"
        f"Generated placeholder caption:"
    )
    
    try:
        # Assuming temperature is handled by caption_llm instance or its default config
        response = caption_llm.invoke(prompt_text)
        generated_caption = response.content.strip()
        if generated_caption:
            return generated_caption
        else:
            return "Caption generation failed or returned empty."
    except Exception as e:
        print(f"    ERROR: LLM invocation for caption generation failed: {str(e)}")
        return "Error during caption generation."