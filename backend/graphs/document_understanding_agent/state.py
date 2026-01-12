from typing import TypedDict, Optional, List, Dict, Any

class DocumentUnderstandingState(TypedDict):
    document_id: str
    user_id: Optional[str]  # Firebase Auth UID for profile lookup
    visual_impairment: Optional[bool]  # User's visual impairment status from profile
    original_gcs_uri: str # GCS URI of the original uploaded document
    # raw_layout_gcs_uri: str # GCS URI of the raw JSON from AdvancedDocumentLayoutTool - May not be needed if we pass file directly
    
    # Fields likely to become obsolete or less central:
    # raw_layout_content: Optional[Dict[str, Any]] # Content of the raw layout JSON, fetched from GCS
    # structured_elements_tmp: Optional[List[Dict[str, Any]]] # Temporary storage for elements from analyze_structure_and_visuals_node
    # structured_document_output: Optional[Dict[str, Any]] # The final enhanced JSON output adhering to our schema
    # user_facing_summary: Optional[str] # A summary of the document understanding process or findings

    # New primary output field
    tts_ready_narrative: Optional[str] = None
    input_file_path: Optional[str] = None # To pass the local file path for the LLM
    input_file_content_bytes: Optional[bytes] = None # Alternative for passing file content
    input_file_mimetype: Optional[str] = None # Mimetype of the input file

    error_message: Optional[str]
