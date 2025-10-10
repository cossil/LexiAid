# Document Understanding Agent - Error Handling

This document outlines the error handling mechanisms implemented within the Document Understanding Agent (DUA), specifically focusing on the block classification process performed by the `analyze_structure_and_visuals_node` and its helper function `parse_llm_classification_response`.

## Overview

The primary goal of the error handling strategy is to ensure robustness and prevent data loss. When the LLM response for block classification cannot be successfully parsed or validated against the expected schema, the system defaults to creating an `unclassified_text_block` element. This preserves the original text content of the block and annotates it with detailed error information, allowing for easier debugging and potential reprocessing.

## Key Components

1.  **`parse_llm_classification_response` (`llm_helpers.py`)**:
    *   This function is responsible for taking the raw string response from the LLM, cleaning it (e.g., stripping markdown code fences), attempting to parse it as JSON, and then validating the structure of the parsed JSON.
    *   It returns a dictionary with a `"status"` key (`"success"` or `"error"`).
    *   On success, the dictionary includes `"data"` with the parsed JSON.
    *   On error, it includes `"error_type"`, a `"message"`, the `"original_content"` from the LLM, and the `"cleaned_content"` that was attempted to be parsed.

2.  **`analyze_structure_and_visuals_node` (`graph.py`)**:
    *   This node iterates through document blocks and calls the LLM for classification.
    *   If `parse_llm_classification_response` returns an error status, this node constructs an `unclassified_text_block`.

## `unclassified_text_block` Structure

When a classification error occurs, an `unclassified_text_block` is generated with the following structure:

```json
{
  "id": "<block_id>",
  "type": "unclassified_text_block",
  "text": "<original_block_text>",
  "bbox": [<coordinates>],
  "page_number": <page_num>,
  "lines": [<line_objects>],
  "metadata": {
    "source_block_type": "<original_block_type_from_layout_parser>"
  },
  "annotations": {
    "classification_error": {
      "error_type": "<SpecificErrorType>",
      "message": "<Detailed error message from parser>",
      "original_llm_output": "<Raw LLM response content>",
      "cleaned_llm_output": "<LLM response after stripping markdown fences>"
    }
  }
}
```

## Error Types

The `parse_llm_classification_response` function can identify and report the following `error_type` values, which will be reflected in the `unclassified_text_block` annotations:

1.  **`EmptyLLMResponse`**:
    *   **Cause**: The LLM response was empty or became empty after stripping markdown code fences.
    *   **Example**: LLM returns `""` or `"```json\n```"`.

2.  **`InvalidLLMResponseFormat`**:
    *   **Cause**: The LLM response (after stripping markdown) was not a valid JSON structure (e.g., it was plain text, an XML string, or malformed in a way that doesn't start with `{` or `[`).
    *   **Example**: LLM returns `"I am unable to process this request."` or `"<error>some error</error>"`.

3.  **`JSONDecodeError`**:
    *   **Cause**: The LLM response appeared to be JSON (started with `{` or `[`) but contained syntax errors preventing successful parsing by `json.loads()`.
    *   **Example**: LLM returns `"{'type': 'paragraph', 'text': 'Hello'}"` (uses single quotes instead of double quotes for keys/strings).

4.  **`SchemaValidationError`**:
    *   **Cause**: The LLM response was valid JSON but did not conform to the expected schema. This can include:
        *   Missing the required top-level `"type"` key.
        *   The `"type"` key having an unrecognized value.
        *   Missing type-specific required keys (e.g., missing `"text"` for a `"paragraph"`, or `"items"` for a `"list"`).
        *   Incorrect data types for certain keys (e.g., `"items"` not being a list for a `"list"` type).
    *   **Example**: LLM returns `{"type": "heading", "content": "My Title"}` (uses `"content"` instead of `"text"`).
    *   **Example**: LLM returns `{"type": "list", "items": "item1, item2"}` (`"items"` is a string, not a list of objects).

5.  **`UnexpectedParsingError`**:
    *   **Cause**: An unforeseen error occurred during the parsing process, not covered by the more specific error types above.
    *   **Example**: A rare internal issue within the parsing logic itself.

This structured error reporting allows for better diagnostics and helps in refining prompts or handling LLM inconsistencies more effectively.
