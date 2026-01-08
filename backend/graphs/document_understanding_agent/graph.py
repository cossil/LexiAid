import os
import json
import uuid # For generating document_id if missing
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import sys
import logging
import asyncio
import mimetypes # For determining mimetype from file path

# For loading .env file for local testing
from dotenv import load_dotenv

# Gemini API SDK (replaces Vertex AI for access to gemini-3-flash-preview)
import google.generativeai as genai
from google.cloud import storage  # For downloading GCS files

# LangGraph
from langgraph.graph import StateGraph, END

# State - use absolute import
from backend.graphs.document_understanding_agent.state import DocumentUnderstandingState

# --- Initialize Gemini API ---
def initialize_gemini_api():
    """Initialize Gemini API with GOOGLE_API_KEY."""
    api_key = os.environ.get("GOOGLE_API_KEY")
    
    if api_key:
        try:
            genai.configure(api_key=api_key)
            logging.info("Gemini API configured successfully with GOOGLE_API_KEY.")
            return True
        except Exception as e:
            logging.error(f"Error configuring Gemini API: {e}", exc_info=True)
            return False
    else:
        logging.warning("GOOGLE_API_KEY environment variable not set. Gemini API not configured.")
        return False

GEMINI_API_INITIALIZED = initialize_gemini_api()

# --- Constants ---
MODEL_NAME = os.getenv("LLM_MODEL_NAME", "gemini-3-flash-preview")

COMPREHENSIVE_LLM_PROMPT = """You are an advanced document analysis assistant. Your task is to analyze the provided document file, which may contain a mix of text, images, tables, and graphs/charts. Your goal is to produce a single, coherent, and detailed textual output that accurately represents the document's content as if you were meticulously reading it aloud for academic study by someone who cannot read the text visually, particularly a student with severe dyslexia. The output must be ready for clear and natural-sounding Text-to-Speech (TTS).

Please perform the following:

1.  Overall Structure and Reading Order:
    * **CRITICAL INSTRUCTION: Your analysis MUST begin from the absolute top-left of the document. If the very first element encountered at the top-left is an image, you MUST describe and process this image (including any text within it) BEFORE proceeding to any other content.** Then, continue to proceed through the rest of the content following a standard Western reading order: top-to-bottom, then left-to-right.
    * For documents with multiple columns: You MUST process the content of the leftmost column in its entirety (from top to bottom, including any text, images, tables, etc., that fall within that column's visual boundary) before moving to the next column to its right. Continue this pattern for all columns on the page.
    * The final output should be a single, continuous narrative that reflects this natural, sequential reading path through the document.

2.  Textual Content:
    * Extract all textual content verbatim as it appears in the established reading order. Instead of explaining or summarizing paragraphs, your output should be a direct transcription of the text from the document.
    * Preserve the original wording and sentence structure.
    * Ensure all extracted text is meticulously punctuated with appropriate commas, periods, capitalization, sentence breaks, and paragraph breaks to allow for clear and natural-sounding TTS rendering.
    * If there are distinct sections or headings in the document, clearly include them as they appear in the reading flow.

3.  Images:
    * When an image is encountered in the reading flow:
        * Provide a brief, general description of what the image depicts (e.g., "An image here shows a diagram of a process," "This image displays several people in an outdoor setting.").
        * State its position in the flow, for example, "Following the previous paragraph, an image is presented."
        * Carefully identify and accurately transcribe any and all visible text within the image itself (e.g., text on signs, labels, clothing, or overlaid on the image).
        * If the context or significance of this embedded text is apparent from the image or its immediate surroundings, briefly state it.
        * Seamlessly integrate this brief description and the full transcription of any embedded text into the overall narrative flow, ensuring it's clearly delineated for the listener.

4.  Tables:
    * When a table is encountered in the reading flow:
        * Provide a clear title or a brief summary of the table's main topic or purpose, as stated in or implied by the document.
        * "Translate the table into words": Do not just list the raw data if a more explanatory approach is possible. Explain the table's structure (e.g., "This table has X columns titled A, B, C, and Y rows."). Then, narrate the key information, data points, or relationships presented in the table in an easy-to-understand, spoken-word format.
        * Ensure this verbal explanation is well-punctuated for TTS.

5.  Graphs and Charts:
    * When a graph or chart is encountered in the reading flow:
        * Identify its type (e.g., bar chart, line graph, pie chart).
        * Provide a clear title or a brief summary of what the graph represents, as stated in or implied by the document.
        * "Translate the graph into words": Describe its main features (e.g., what the axes represent, key trends, significant data points, or the main message conveyed by the visual). Explain this information in a narrative form suitable for TTS.

Output Requirements:

* The final output must be a single, continuous block of well-structured text, accurately reflecting the document's content in the specified reading order, and ready for TTS.
* The language used for descriptions and transitions should be clear and concise.
* Crucially, all extracted text and any generated descriptions/explanations must be meticulously punctuated (periods, commas, new paragraphs, etc.) to ensure the text can be converted into natural-sounding speech by a TTS engine.
* Maintain a neutral, objective tone suitable for academic material.

Please analyze the provided document based on these revised instructions, paying close attention to the specified reading order.
"""

# Setup logger for this module
logger = logging.getLogger(__name__)
if not logger.hasHandlers(): # Configure basic logging if no handlers are found
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# --- Helper: Download file from GCS ---
def download_gcs_file_to_bytes(gcs_uri: str) -> Optional[bytes]:
    """Download a file from GCS and return its bytes."""
    try:
        # Parse gs://bucket/path format
        if not gcs_uri.startswith("gs://"):
            logger.error(f"Invalid GCS URI format: {gcs_uri}")
            return None
        
        path_parts = gcs_uri[5:].split("/", 1)
        if len(path_parts) < 2:
            logger.error(f"Invalid GCS URI - missing path: {gcs_uri}")
            return None
        
        bucket_name = path_parts[0]
        blob_path = path_parts[1]
        
        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_path)
        
        file_bytes = blob.download_as_bytes()
        logger.info(f"Downloaded {len(file_bytes)} bytes from GCS: {gcs_uri}")
        return file_bytes
    except Exception as e:
        logger.error(f"Error downloading from GCS {gcs_uri}: {e}", exc_info=True)
        return None

# --- Agent Node ---
def generate_tts_narrative_node(state: DocumentUnderstandingState) -> DocumentUnderstandingState:
    logger.info(f"[{datetime.now(timezone.utc)}] Entering generate_tts_narrative_node for doc: {state.get('document_id')}")
    state['error_message'] = None # Clear previous errors

    if not GEMINI_API_INITIALIZED:
        state['error_message'] = "Gemini API not initialized. Ensure GOOGLE_API_KEY is set."
        logger.error(state['error_message'])
        return state

    input_file_path = state.get('input_file_path')
    input_file_bytes = state.get('input_file_content_bytes')
    input_mimetype = state.get('input_file_mimetype')

    if not (input_file_path or input_file_bytes):
        state['error_message'] = "Missing input_file_path or input_file_content_bytes for processing."
        logger.error(state['error_message'])
        return state

    if not input_mimetype:
        if input_file_path:
            input_mimetype, _ = mimetypes.guess_type(input_file_path)
            if not input_mimetype:
                state['error_message'] = f"Could not determine mimetype for file: {input_file_path}"
                logger.error(state['error_message'])
                return state
        else:
            state['error_message'] = "Missing input_file_mimetype when input_file_content_bytes are provided directly."
            logger.error(state['error_message'])
            return state
    
    logger.info(f"Processing document with mimetype: {input_mimetype}. Document ID: {state.get('document_id')}")

    try:
        # Initialize the Gemini model
        model = genai.GenerativeModel(MODEL_NAME)
        
        # Get file bytes from various sources
        file_bytes_content = None
        
        if input_file_bytes:
            logger.info(f"Using input_file_bytes (length: {len(input_file_bytes)}) for document.")
            file_bytes_content = input_file_bytes
        elif input_file_path:
            if input_file_path.startswith("gs://"):
                logger.info(f"Downloading from GCS: {input_file_path}")
                file_bytes_content = download_gcs_file_to_bytes(input_file_path)
                if not file_bytes_content:
                    state['error_message'] = f"Failed to download file from GCS: {input_file_path}"
                    logger.error(state['error_message'])
                    return state
            else:  # Local file path
                logger.info(f"Reading local file: {input_file_path}")
                with open(input_file_path, "rb") as f:
                    file_bytes_content = f.read()
        
        if not file_bytes_content:
            state['error_message'] = "Failed to obtain file content for LLM."
            logger.error(state['error_message'])
            return state

        # Create the file part for Gemini API (inline data)
        # Using the blob format for multimodal content
        file_data = {
            "mime_type": input_mimetype,
            "data": file_bytes_content
        }

        # Generation config
        generation_config = genai.types.GenerationConfig(
            temperature=0.2,
        )
        
        # Safety settings for Gemini API
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
        ]

        logger.info(f"Sending request to Gemini model: {MODEL_NAME} with prompt and document.")
        response = model.generate_content(
            [COMPREHENSIVE_LLM_PROMPT, file_data],
            generation_config=generation_config,
            safety_settings=safety_settings
        )
        
        if response.text:
            tts_narrative = response.text
            state['tts_ready_narrative'] = tts_narrative
            logger.info(f"Successfully generated TTS narrative. Length: {len(tts_narrative)} chars.")
        else:
            state['error_message'] = "LLM response was empty or malformed."
            logger.error(f"{state['error_message']} Full response: {response}")
            
    except Exception as e:
        state['error_message'] = f"Error during LLM call: {str(e)}"
        logger.error(state['error_message'], exc_info=True)
        
    logger.info(f"[{datetime.now(timezone.utc)}] Exiting generate_tts_narrative_node")
    return state

# --- Graph Definition ---
def create_document_understanding_graph():
    workflow = StateGraph(DocumentUnderstandingState)
    workflow.add_node("generate_narrative", generate_tts_narrative_node)
    workflow.set_entry_point("generate_narrative")
    workflow.add_edge("generate_narrative", END)
    
    agent_executor = workflow.compile()
    logger.info("Document Understanding Agent graph compiled successfully with new structure.")
    return agent_executor

agent_executor = create_document_understanding_graph()

# --- Agent Executor Interface ---
async def run_dua_processing_for_document(initial_state_dict: Dict[str, Any]) -> Dict[str, Any]:
    logger.info(f"--- run_dua_processing_for_document called with initial_state_dict ---")
    
    doc_id = initial_state_dict.get('document_id', str(uuid.uuid4()))
    initial_state_dict['document_id'] = doc_id # Ensure it's set

    if not (initial_state_dict.get('input_file_path') or initial_state_dict.get('input_file_content_bytes')):
        error_msg = "Initial state must contain 'input_file_path' or 'input_file_content_bytes'."
        logger.error(f"[{doc_id}] {error_msg}")
        return {"error_message": error_msg, "document_id": doc_id, "tts_ready_narrative": None}

    if not initial_state_dict.get('input_file_mimetype'):
        if initial_state_dict.get('input_file_path'):
            mimetype, _ = mimetypes.guess_type(initial_state_dict['input_file_path'])
            if mimetype:
                initial_state_dict['input_file_mimetype'] = mimetype
                logger.info(f"[{doc_id}] Guessed mimetype {mimetype} for {initial_state_dict['input_file_path']}")
            else:
                logger.warning(f"[{doc_id}] Could not guess mimetype for {initial_state_dict['input_file_path']}. Processing might fail.")
        else:
             logger.warning(f"[{doc_id}] input_file_mimetype not provided and cannot be guessed without input_file_path.")

    logger.info(f"Invoking DUA graph for document_id: {doc_id}")
    try:
        # Ensure Gemini API is initialized
        global GEMINI_API_INITIALIZED
        if not GEMINI_API_INITIALIZED:
            GEMINI_API_INITIALIZED = initialize_gemini_api()  # Attempt re-initialization
        
        if not GEMINI_API_INITIALIZED:
            error_msg = "Gemini API could not be initialized. Ensure GOOGLE_API_KEY is set."
            logger.error(f"[{doc_id}] {error_msg}")
            return {"error_message": error_msg, "document_id": doc_id, "tts_ready_narrative": None}

        final_state = await agent_executor.ainvoke(initial_state_dict)
        logger.info(f"DUA graph execution completed for document_id: {doc_id}")
        return {
            "document_id": final_state.get('document_id'),
            "tts_ready_narrative": final_state.get('tts_ready_narrative'),
            "error_message": final_state.get('error_message'),
            "original_gcs_uri": final_state.get('original_gcs_uri') # Pass through if present
        }
    except Exception as e:
        error_msg = f"Exception running DUA graph for {doc_id}: {str(e)}"
        logger.error(error_msg, exc_info=True)
        return {"error_message": error_msg, "document_id": doc_id, "tts_ready_narrative": None}

# --- Main Test Runner (DUA.R1.4) ---
async def main_test_runner(test_file_path: str):
    logger.info(f"--- Starting main_test_runner for file: {test_file_path} ---")

    if not os.path.exists(test_file_path):
        logger.error(f"Test file not found: {test_file_path}")
        return

    mimetype, _ = mimetypes.guess_type(test_file_path)
    if not mimetype:
        logger.error(f"Could not determine mimetype for test file: {test_file_path}")
        return
    
    logger.info(f"Test file: {test_file_path}, Mimetype: {mimetype}")

    test_doc_id = f"test-dua-refactor-{uuid.uuid4()}"
    # Example GCS URI, replace 'your-bucket' or make it dynamic if needed for real tests
    test_input_state = {
        "document_id": test_doc_id,
        "input_file_path": test_file_path,
        "input_file_mimetype": mimetype,
        "original_gcs_uri": f"gs://your-test-bucket/test_uploads/{os.path.basename(test_file_path)}" 
    }
    
    logger.info(f"Running DUA processing for: {test_doc_id}")
    result = await run_dua_processing_for_document(test_input_state)

    print(f"\n--- DUA Test Run Result for Doc ID: {result.get('document_id')} ---")
    if result.get('error_message'):
        print(f"Error: {result['error_message']}")
    
    tts_narrative = result.get('tts_ready_narrative')
    if tts_narrative:
        print(f"\n--- TTS Ready Narrative (Snippet) ---")
        print(tts_narrative[:1000] + "..." if len(tts_narrative) > 1000 else tts_narrative)
        
        # Save to file in the same directory as the script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_filename_base = os.path.splitext(os.path.basename(test_file_path))[0]
        output_narrative_file = os.path.join(script_dir, f"tts_narrative_output_{output_filename_base}.txt")
        try:
            with open(output_narrative_file, "w", encoding="utf-8") as f:
                f.write(tts_narrative)
            print(f"\nFull narrative saved to: {output_narrative_file}")
        except Exception as e:
            print(f"\nError saving narrative to file '{output_narrative_file}': {e}")
    else:
        print("\n--- No TTS Ready Narrative produced. ---")

if __name__ == '__main__':
    # Force logging configuration for direct script execution to ensure INFO/DEBUG logs are visible
    logging.basicConfig(level=logging.DEBUG,
                        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                        force=True) # force=True reconfigures root logger
    logger.setLevel(logging.DEBUG) # Ensure our specific logger (logger = logging.getLogger(__name__)) is also at DEBUG

    # Determine the project root and backend directory for path calculations
    _current_script_dir = os.path.dirname(os.path.abspath(__file__))
    # graph.py is in backend/graphs/document_understanding_agent/
    _agent_dir = _current_script_dir
    _graphs_dir = os.path.abspath(os.path.join(_agent_dir, '..'))
    _backend_dir = os.path.abspath(os.path.join(_graphs_dir, '..'))
    _project_root_dir = os.path.abspath(os.path.join(_backend_dir, '..'))

    # Add project root and backend to sys.path for imports if necessary
    # This helps find .state (DocumentUnderstandingState) and other potential project modules
    if _project_root_dir not in sys.path:
        sys.path.insert(0, _project_root_dir)
        # print(f"Added {_project_root_dir} to sys.path for imports.")
    # If .state is directly under backend/graphs/document_understanding_agent, this might not be needed
    # but good for general project structure.
    # if _backend_dir not in sys.path:
    #     sys.path.insert(0, _backend_dir)
    #     print(f"Added {_backend_dir} to sys.path for imports.")


    # Load .env file from specified backend directory
    dotenv_path = os.path.join(_backend_dir, '.env')
    logger.info(f"[__main__] Calculated .env path: {dotenv_path}")

    if os.path.exists(dotenv_path):
        logger.info(f"[__main__] .env file found at {dotenv_path}. Attempting to load.")
        load_dotenv(dotenv_path)
        logger.info(f"[__main__] Finished attempt to load .env from {dotenv_path}.")
        logger.info(f"[__main__] GOOGLE_API_KEY after load_dotenv: '{os.environ.get('GOOGLE_API_KEY', '')[:10]}...'")
        # After loading .env, re-attempt Gemini API initialization if it failed earlier
        if not GEMINI_API_INITIALIZED:
            logger.info("Attempting Gemini API initialization after .env load...")
            GEMINI_API_INITIALIZED = initialize_gemini_api()
    else:
        logger.warning(f"[__main__] .env file NOT found at {dotenv_path}. Ensure GOOGLE_API_KEY is set in your environment or in the .env file at this path.")

    # Critical check for GOOGLE_API_KEY after attempting .env load
    api_key_env = os.environ.get("GOOGLE_API_KEY")
    if not api_key_env:
        logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        logger.error("ERROR: GOOGLE_API_KEY environment variable is NOT SET.")
        logger.error("Please set it in your .env file (e.g., C:\\Ai\\aitutor_37\\backend\\.env)")
        logger.error("or as a system environment variable.")
        logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        sys.exit(1)
    
    if not GEMINI_API_INITIALIZED:
        logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        logger.error("ERROR: Gemini API could not be initialized. Check logs for details.")
        logger.error("Ensure GOOGLE_API_KEY is correctly set.")
        logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        sys.exit(1)

    # --- Test Image Path --- 
    # Using absolute path as provided by user, with raw string literal
    TEST_IMAGE_FILE_PATH = r"C:\Ai\aitutor_37\sample_files\Health Insurance2.jpg"

    logger.info(f"Attempting to use test image at: {TEST_IMAGE_FILE_PATH}")

    if not os.path.exists(TEST_IMAGE_FILE_PATH):
        logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        logger.error(f"ERROR: Test image not found at '{TEST_IMAGE_FILE_PATH}'.")
        logger.error("Please ensure the image file exists at this exact path or update the")
        logger.error("TEST_IMAGE_FILE_PATH variable in the __main__ block of this script.")
        logger.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
    else:
        logger.info("[__main__] TEST_IMAGE_FILE_PATH exists. Calling main_test_runner.")
        asyncio.run(main_test_runner(TEST_IMAGE_FILE_PATH))
        logger.info("[__main__] main_test_runner completed.")