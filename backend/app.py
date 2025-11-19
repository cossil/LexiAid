"""
Basic Flask server for AI Tutor backend services
"""

import google.cloud.texttospeech  # Pre-emptive import to resolve conflict


import os
import sys

import atexit
import logging
logging.basicConfig(level=logging.INFO)
from typing import Set, Optional
from flask import current_app

# --- Diagnostic File Usage Tracking (Disabled for Production) ---
# Uncomment the following lines to enable file usage tracking for debugging:
# from file_usage_tracker import *
# --- End of File Usage Tracking ---

# --- Load .env file VERY EARLY --- 
from dotenv import load_dotenv
from flask import send_file
import base64
from backend.services.tts_service import TTSService, TTSServiceError
import io
# Construct the path to .env in the same directory as app.py
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
if load_dotenv(dotenv_path):
    logging.info(f"--- app.py --- Successfully loaded .env file from: {dotenv_path}")
    logging.info(f"--- app.py (after load_dotenv) --- GOOGLE_CLOUD_PROJECT_ID: {os.getenv('GOOGLE_CLOUD_PROJECT_ID')}")
    logging.info(f"--- app.py (after load_dotenv) --- DOCUMENT_AI_LOCATION: {os.getenv('DOCUMENT_AI_LOCATION')}")
    logging.info(f"--- app.py (after load_dotenv) --- LAYOUT_PROCESSOR_ID: {os.getenv('LAYOUT_PROCESSOR_ID')}")
else:
    logging.warning(f"--- app.py --- .env file not found at: {dotenv_path} or failed to load.")
# --- End of .env loading ---

import logging
logging.info(f"--- app.py --- SYS.PATH: {sys.path}")
logging.info(f"--- app.py --- CWD: {os.getcwd()}")
import sqlite3 # Added to resolve NameError for checkpointer initialization
# import sys # sys is already imported
import json
import time
import threading
import traceback
import uuid
import traceback # Ensure traceback is imported
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory, g, current_app
from flask_cors import CORS
from flask_sock import Sock
from werkzeug.utils import secure_filename
from google.cloud import speech
from simple_websocket import ConnectionClosed
import json
# from dotenv import load_dotenv # Moved to the top
from firebase_admin import credentials, firestore
import firebase_admin

# Use absolute imports from backend package
from backend.services import (AuthService, FirestoreService, StorageService, 
                      DocAIService, DocumentRetrievalService, TTSService, STTService)
# Note: AiTutorAgent (ReAct-based) was previously imported here but is no longer used by the application.
# The LangGraph-based Supervisor architecture (supervisor_graph.py) now handles all agent functionality.
# Kept for reference or potential future use. Can be removed if not needed.

from backend.graphs.new_chat_graph import create_new_chat_graph # For general chat functionality
from backend.graphs.quiz_engine_graph import create_quiz_engine_graph # For Quiz Engine V2
from backend.graphs.supervisor import create_supervisor_graph
from backend.graphs.supervisor.state import SupervisorState
from backend.graphs.answer_formulation.graph import create_answer_formulation_graph # For Answer Formulation
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.checkpoint.serde.jsonplus import JsonPlusSerializer
# import os # os is already imported
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.runnables.graph import MermaidDrawMethod
from langchain_core.runnables import RunnableConfig
from backend.utils.message_utils import serialize_messages, deserialize_messages, serialize_deep, deserialize_deep
from functools import wraps # Added for auth decorator

# Import Blueprints using absolute paths
from backend.routes.document_routes import document_bp
from backend.routes.tts_routes import tts_bp
from backend.routes.stt_routes import stt_bp
from backend.routes.user_routes import user_bp
from backend.routes.progress_routes import progress_bp
from backend.routes.answer_formulation_routes import answer_formulation_bp

app = Flask(__name__)
sock = Sock(app)
CORS(app, 
     origins="http://localhost:5173", 
     supports_credentials=True, 
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
     allow_headers=["*"])

# Configure logging
logging.basicConfig(level=logging.INFO)
app.logger.setLevel(logging.INFO)

# --- Service and Tool Initialization --- 

def initialize_component(component_class, component_name, app_config_key, **kwargs):
    """Helper function to initialize a component (service or tool)."""
    try:
        instance = component_class(**kwargs)
        app.config[app_config_key][component_name] = instance
        app.logger.info(f"{component_name} initialized successfully.")
        return instance
    except Exception as e:
        app.logger.error(f"Error initializing {component_name}: {e}")
        app.config[app_config_key][component_name] = None
        return None

with app.app_context():
    app.config['SERVICES'] = {}
    app.config['TOOLS'] = {}

    # Activate optional LangGraph diagnostics patch (for debugging)
    try:
        import backend.diagnostics.langgraph_patch  # noqa
        logging.info("LangGraph diagnostics patch activated")
        app.logger.info("[LangGraph Patch] Deep serialization & SqliteSaver monkeypatch ACTIVE")
    except Exception as e:
        logging.warning("LangGraph diagnostics patch not loaded: %s", e)

    # Initialize services
    auth_service = initialize_component(AuthService, 'AuthService', 'SERVICES')
    if auth_service: # Make sure it was initialized successfully
        app.config['AUTH_SERVICE'] = auth_service
    firestore_service = initialize_component(FirestoreService, 'FirestoreService', 'SERVICES')
    if firestore_service:
        app.config['FIRESTORE_SERVICE'] = firestore_service
    storage_service = initialize_component(StorageService, 'StorageService', 'SERVICES')
    if storage_service:
        app.config['STORAGE_SERVICE'] = storage_service
    docai_service = initialize_component(DocAIService, 'DocAIService', 'SERVICES')
    if docai_service:
        app.config['DOCAI_SERVICE'] = docai_service
    tts_service = initialize_component(TTSService, 'TTSService', 'SERVICES')
    if tts_service:
        app.config['TTS_SERVICE'] = tts_service
    stt_service = initialize_component(STTService, 'STTService', 'SERVICES')
    
    # Initialize DocumentRetrievalService with dependencies
    # Ensure firestore_service and storage_service are available before this
    if firestore_service and storage_service:
        doc_retrieval_service = initialize_component(
            DocumentRetrievalService, 
            'DocRetrievalService', 
            'SERVICES'
        )
        if doc_retrieval_service:
            app.config['DOC_RETRIEVAL_SERVICE'] = doc_retrieval_service
    else:
        app.logger.error("DocumentRetrievalService cannot be initialized due to missing Firestore or Storage service.")
        app.config['SERVICES']['DocRetrievalService'] = None
        doc_retrieval_service = None # ensure it's defined as None

    # The AdvancedDocumentLayoutTool was deprecated and removed.

# --- Register Blueprints --- 
app.register_blueprint(document_bp, url_prefix='/api/documents')
app.register_blueprint(tts_bp, url_prefix='/api/tts')
app.register_blueprint(stt_bp, url_prefix='/api/stt')
app.register_blueprint(user_bp, url_prefix='/api/users')
app.register_blueprint(progress_bp, url_prefix='/api/progress')
app.register_blueprint(answer_formulation_bp, url_prefix='/api/v2/answer-formulation')

# --- Authentication Decorator --- 
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({"error": "Authorization header is missing or invalid", "code": "UNAUTHENTICATED"}), 401
        
        token = auth_header.split('Bearer ')[1]
        auth_service = current_app.config.get('AUTH_SERVICE')
        if not auth_service:
            current_app.logger.error("ERROR: Authentication service not available in app config")
            return jsonify({"error": "Authentication service not available", "code": "AUTH_SERVICE_UNAVAILABLE"}), 500

        try:
            success, token_data = auth_service.verify_id_token(token)
            
            if not success or not token_data:
                # AuthService.verify_id_token would have printed specific error (expired, invalid, etc.)
                # The 'details' in the jsonify below will be whatever exception string is caught if any other exception occurs.
                # Or we can make it more generic if AuthService handles all specific error messages itself.
                current_app.logger.debug(f"DEBUG: AuthService.verify_id_token returned success={success}, token_data present={token_data is not None}")
                return jsonify({"error": "Invalid or expired token", "details": "Token verification failed by auth service.", "code": "INVALID_TOKEN_AUTH_SERVICE"}), 401

            # Firebase typically uses 'uid' for user ID in the decoded token claims.
            # The token_data here is the user_data dictionary returned by AuthService.
            user_id = token_data.get('uid')
            
            if not user_id:
                current_app.logger.error(f"ERROR: User ID ('uid') not found in verified token data: {token_data}")
                return jsonify({"error": "User ID not found in token claims", "code": "USER_ID_NOT_IN_TOKEN_CLAIMS"}), 401
            
            g.user_id = user_id # Store user_id in Flask's g object for the request context
        except Exception as e:
            # This catch block is more for unexpected errors during the call or unpacking,
            # as AuthService is expected to catch specific Firebase auth exceptions.
            current_app.logger.error(f"ERROR: Unexpected issue during token verification process: {e}")
            traceback.print_exc() # Print full traceback for unexpected errors
            return jsonify({"error": "Token verification process failed unexpectedly", "details": str(e), "code": "VERIFICATION_PROCESS_ERROR"}), 401
        
        return f(*args, **kwargs)
    return decorated_function

# Safe Supervisor Invoke Wrapper
def safe_supervisor_invoke(compiled_supervisor_graph, supervisor_input, config=None):
    """Deep-serialize all message objects before and after LangGraph invoke."""
    # Deep-serialize all message objects before invoke
    safe_input = serialize_deep(supervisor_input)
    logging.debug("[SAFE_INVOKE] Supervisor input deep-serialized. Types: %s",
                  {k: type(v).__name__ for k, v in safe_input.items()})

    # Invoke LangGraph
    result = compiled_supervisor_graph.invoke(safe_input, config=config)

    # Deep-serialize result before checkpoint persistence
    safe_result = serialize_deep(result)
    logging.debug("[SAFE_INVOKE] Supervisor result deep-serialized after invoke.")

    return safe_result

# Initialize database connections and checkpointers in a thread-safe way
class DatabaseManager:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls, app):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    if app is None:
                        raise ValueError("Flask app instance must be provided to DatabaseManager on first instantiation.")
                    cls._instance = super().__new__(cls)
                    cls._instance._initialize(app) # Pass app to _initialize
        return cls._instance
    
    def _initialize(self, app): # Accept app instance
        self.flask_app = app # Store the app instance
        # Determine the absolute path for the SQLite databases
        # Priority: Env Var -> Docker Vol -> Local Fallback
        if os.getenv('DATA_DIR'):
            base_dir = os.getenv('DATA_DIR')
        elif os.path.exists('/app/data'):
            base_dir = '/app/data'
        else:
            # Local fallback: backend/data
            base_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
        
        os.makedirs(base_dir, exist_ok=True)
        APP_DIR = base_dir
        
        # Initialize QuizGraph checkpointer
        QUIZ_DB_PATH = os.path.join(APP_DIR, "quiz_checkpoints.db")
        os.makedirs(os.path.dirname(QUIZ_DB_PATH), exist_ok=True)
        self.quiz_db_conn = sqlite3.connect(QUIZ_DB_PATH, check_same_thread=False)
        self.quiz_checkpointer = SqliteSaver(conn=self.quiz_db_conn, serde=JsonPlusSerializer())
        self.flask_app.logger.debug(f"DEBUG [APP - _initialize]: self.quiz_checkpointer type: {type(self.quiz_checkpointer)}, hasattr 'get_next_version': {hasattr(self.quiz_checkpointer, 'get_next_version')}")
    
    # Initialize GeneralQueryGraph checkpointer
        GENERAL_QUERY_DB_PATH = os.path.join(APP_DIR, "general_query_checkpoints.db")
        os.makedirs(os.path.dirname(GENERAL_QUERY_DB_PATH), exist_ok=True)
        self.general_query_db_conn = sqlite3.connect(GENERAL_QUERY_DB_PATH, check_same_thread=False)
        self.general_query_checkpointer = SqliteSaver(conn=self.general_query_db_conn, serde=JsonPlusSerializer())
        self.flask_app.logger.debug(f"DEBUG [APP - _initialize]: self.general_query_checkpointer type: {type(self.general_query_checkpointer)}, hasattr 'get_next_version': {hasattr(self.general_query_checkpointer, 'get_next_version')}")
    
    # Initialize SupervisorGraph checkpointer
        SUPERVISOR_DB_PATH = os.path.join(APP_DIR, "supervisor_checkpoints.db")
        os.makedirs(os.path.dirname(SUPERVISOR_DB_PATH), exist_ok=True)
        self.supervisor_db_conn = sqlite3.connect(SUPERVISOR_DB_PATH, check_same_thread=False)
        self.supervisor_checkpointer = SqliteSaver(conn=self.supervisor_db_conn, serde=JsonPlusSerializer())
        self.flask_app.logger.debug(f"DEBUG [APP - _initialize]: self.supervisor_checkpointer type: {type(self.supervisor_checkpointer)}, hasattr 'get_next_version': {hasattr(self.supervisor_checkpointer, 'get_next_version')}")

    # Initialize DocumentUnderstandingGraph checkpointer
        DU_DB_PATH = os.path.join(APP_DIR, "document_understanding_checkpoints.db")
        os.makedirs(os.path.dirname(DU_DB_PATH), exist_ok=True)
        self.du_db_conn = sqlite3.connect(DU_DB_PATH, check_same_thread=False)
        self.du_checkpointer = SqliteSaver(conn=self.du_db_conn, serde=JsonPlusSerializer())
        self.flask_app.logger.debug(f"DEBUG [APP - _initialize]: self.du_checkpointer type: {type(self.du_checkpointer)}, hasattr 'get_next_version': {hasattr(self.du_checkpointer, 'get_next_version')}")

    # Initialize AnswerFormulationGraph checkpointer
        ANSWER_FORMULATION_DB_PATH = os.path.join(APP_DIR, "answer_formulation_sessions.db")
        os.makedirs(os.path.dirname(ANSWER_FORMULATION_DB_PATH), exist_ok=True)
        self.answer_formulation_db_conn = sqlite3.connect(ANSWER_FORMULATION_DB_PATH, check_same_thread=False)
        self.answer_formulation_checkpointer = SqliteSaver(conn=self.answer_formulation_db_conn, serde=JsonPlusSerializer())
        self.flask_app.logger.debug(f"DEBUG [APP - _initialize]: self.answer_formulation_checkpointer initialized for Answer Formulation")

    # Create the compiled graphs
        self.flask_app.logger.info("[DB Manager] Initializing Quiz Engine Graph (V2)...")
        self.compiled_quiz_graph = create_quiz_engine_graph(checkpointer=self.quiz_checkpointer)
        self.flask_app.logger.info("[DB Manager] Quiz Engine Graph (V2) initialized.")

        self.flask_app.logger.info("[DB Manager] Initializing New Chat Graph (formerly General Query Graph)...")
        self.compiled_general_query_graph = create_new_chat_graph(checkpointer=self.general_query_checkpointer)
        self.flask_app.logger.info("[DB Manager] New Chat Graph initialized.")

        # Retrieve AdvancedDocumentLayoutTool from app.config
        # This assumes app.config is accessible here or the tool is passed differently.
        # For simplicity, let's assume it's globally available via current_app for now,
        # though a cleaner dependency injection would be better in a larger refactor.
        # The deprecated DocumentUnderstandingGraph and its tool have been removed.
        # The new DUA is invoked directly from document_routes and does not need to be passed to the supervisor.
        doc_retrieval_service_instance = self.flask_app.config['SERVICES'].get('DocRetrievalService')
        if not doc_retrieval_service_instance:
            self.flask_app.logger.error("CRITICAL ERROR: DocumentRetrievalService not found in app.config['SERVICES'].")

        self.compiled_supervisor_graph = create_supervisor_graph(
            checkpointer=self.supervisor_checkpointer,
            doc_retrieval_service=doc_retrieval_service_instance
        )

        self.flask_app.logger.info("[DB Manager] Initializing Answer Formulation Graph...")
        self.compiled_answer_formulation_graph = create_answer_formulation_graph(checkpointer=self.answer_formulation_checkpointer)
        self.flask_app.logger.info("[DB Manager] Answer Formulation Graph initialized.")
        
        self.flask_app.logger.info("All graphs initialized with their respective checkpointers.")

# Initialize the database manager when the application starts
try:
    db_manager = DatabaseManager(app=app)
    
    # Make the compiled graphs available at the module level
    compiled_quiz_graph = db_manager.compiled_quiz_graph

    compiled_supervisor_graph = db_manager.compiled_supervisor_graph
    
    # Make Answer Formulation graph and checkpointer available in app.config
    app.config['ANSWER_FORMULATION_GRAPH'] = db_manager.compiled_answer_formulation_graph
    app.config['ANSWER_FORMULATION_CHECKPOINTER'] = db_manager.answer_formulation_checkpointer
    
    app.logger.info("Successfully initialized all graphs and checkpointers.")
except ModuleNotFoundError as e:
    with open('error_trace.log', 'a') as f:
        f.write(f"Timestamp: {datetime.now()} - Error during DatabaseManager init or graph assignment\n")
        f.write(traceback.format_exc())
        f.write("\n------------------------------------\n")
    app.logger.critical(f"CRITICAL: ModuleNotFoundError during DatabaseManager init. Full traceback written to error_trace.log. Error: {e}")
    raise # Re-raise the exception
except Exception as e:
    app.logger.error(f"Error initializing database connections (non-ModuleNotFoundError): {str(e)}")
    raise

# The active_quiz_sessions dictionary is replaced by the supervisor's state management.
# active_quiz_sessions = {} # Removing this as supervisor will handle session state

# Old helper functions is_quiz_start_query and extract_document_id, along with associated 're' imports, 
# have been removed as this logic is now handled by the SupervisorGraph.

# --- WebSocket STT Endpoint ---
@sock.route('/api/stt/stream')
def stt_stream(ws):
    current_app.logger.info("WebSocket connection established for STT.")
    stt_service = current_app.config.get('SERVICES', {}).get('STTService')
    if not stt_service or not stt_service.client:
        current_app.logger.error("STT Service not available, closing WebSocket.")
        ws.close(reason=1011, message='STT service is not configured on the server.')
        return

    # 1. Set up the recognition config
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
        sample_rate_hertz=16000,
        language_code="en-US",
        enable_automatic_punctuation=True,
    )
    streaming_config = speech.StreamingRecognitionConfig(
        config=config, interim_results=True
    )

    # 2. Define the generator for the streaming request
    def request_generator():
        while True:
            try:
                message = ws.receive(timeout=10)
                if message is None:
                    continue
                if isinstance(message, str):
                    current_app.logger.info(f"Received string message: {message}")
                    continue
                yield speech.StreamingRecognizeRequest(audio_content=message)
            except ConnectionClosed:
                current_app.logger.info("Client connection closed in generator.")
                break

    try:
        responses = stt_service.client.streaming_recognize(
            config=streaming_config,
            requests=request_generator(),
        )

        # 3. Process responses and send back to client
        for response in responses:
            if not response.results:
                continue
            result = response.results[0]
            if not result.alternatives:
                continue
            transcript = result.alternatives[0].transcript
            response_data = {
                'is_final': result.is_final,
                'transcript': transcript,
                'stability': result.stability
            }
            ws.send(json.dumps(response_data))

    except Exception as e:
        current_app.logger.error(f"Error during STT stream: {e}")
    finally:
        ws.close()
        current_app.logger.info("WebSocket connection closed.")

# --- Agent API Endpoint --- 
@app.route('/api/v2/agent/chat', methods=['POST'])
@require_auth
def agent_chat_route():
    """
    Handle chat requests and route them through the supervisor graph.
    This endpoint processes user queries (text or audio), manages conversation state,
    and handles both general queries and quiz interactions via the supervisor graph.
    
    For audio uploads, supports two processing modes:
    - 'review': Returns only the transcribed text without processing with the agent
    - 'direct_send' (default): Processes the transcribed text with the agent
    """
    try:
        user_id = g.user_id  # From @require_auth decorator
        effective_query = ""  # This will hold the text query for the supervisor
        thread_id = None
        document_id = None
        audio_data_base64: Optional[str] = None
        audio_bytes: Optional[bytes] = None # Store audio bytes for potential STT
        audio_format: Optional[str] = None
        stt_processing_mode = "direct_send"  # Default mode
        client_provided_transcript: Optional[str] = None

        if request.content_type.startswith('multipart/form-data'):
            initial_form_query = request.form.get('query', '') # Might be empty
            thread_id = request.form.get('thread_id')
            document_id = request.form.get('document_id')
            stt_processing_mode = request.form.get('stt_processing_mode', 'direct_send')
            client_provided_transcript = request.form.get('transcript')
            
            if 'audio_file' in request.files:
                audio_file = request.files['audio_file']
                filename = secure_filename(audio_file.filename)
                if filename:
                    current_app.logger.info(f"[API] Received audio file: {filename} from user {user_id}, processing mode: {stt_processing_mode}")
                    try:
                        audio_bytes = audio_file.read()
                        audio_data_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                        ext = filename.rsplit('.', 1)[1].lower() if '.' in filename else None
                        mimetype = audio_file.mimetype
                        if ext == 'mp3' or mimetype == 'audio/mpeg': audio_format = 'mp3'
                        elif ext == 'wav' or mimetype in ['audio/wav', 'audio/x-wav']: audio_format = 'wav'
                        elif ext == 'flac' or mimetype == 'audio/flac': audio_format = 'flac'
                        elif ext == 'webm' or mimetype == 'audio/webm' or mimetype == 'audio/webm;codecs=opus': audio_format = 'webm'
                        else:
                            current_app.logger.warning(f"[API] Warning: Unknown audio format (ext: {ext}, mime: {mimetype}). Defaulting to mp3.")
                            audio_format = 'mp3'
                        current_app.logger.info(f"[API] Processed audio. Format: {audio_format}, Base64 len: {len(audio_data_base64)}")

                        if stt_processing_mode == 'review':
                            # Transcribe and return immediately (existing logic)
                            stt_service = app.config['SERVICES']['STTService']
                            success, result = stt_service.transcribe_audio_bytes(
                                audio_bytes=audio_bytes
                            )
                            if success and 'transcript' in result:
                                transcript_data_obj = result['transcript']
                                actual_transcript_string = None
                                if isinstance(transcript_data_obj, dict) and 'transcript' in transcript_data_obj:
                                    actual_transcript_string = transcript_data_obj['transcript']
                                elif isinstance(transcript_data_obj, str):
                                    actual_transcript_string = transcript_data_obj
                                
                                if actual_transcript_string is not None:
                                    return jsonify({
                                        "transcript": actual_transcript_string,
                                        "thread_id": thread_id,
                                        "processing_mode": "review",
                                        "audio_format": audio_format
                                    }), 200
                                else:
                                    # Error handling for review mode STT failure (simplified)
                                    return jsonify({"error": "Audio transcription processing error in review mode", "detail": "Failed to extract transcript string.", "thread_id": thread_id}), 400
                            else:
                                return jsonify({"error": "Audio transcription failed in review mode", "detail": result.get('error', 'Unknown STT error'), "thread_id": thread_id}), 400
                        
                        elif stt_processing_mode == 'direct_send':
                            if client_provided_transcript:
                                effective_query = client_provided_transcript
                                current_app.logger.info(f"[API] Using client-provided transcript for direct_send: '{effective_query[:50]}...' ")
                            elif audio_bytes: # Ensure audio_bytes is available for STT
                                stt_service = app.config['SERVICES']['STTService']
                                current_app.logger.info(f"[API] Performing backend STT for direct_send (audio_format: {audio_format})")
                                success, stt_result = stt_service.transcribe_audio_bytes(audio_bytes=audio_bytes)
                                if success and stt_result and isinstance(stt_result.get('transcript'), dict) and 'transcript' in stt_result['transcript']:
                                    effective_query = stt_result['transcript']['transcript']
                                    current_app.logger.info(f"[API] Backend STT for direct_send successful: '{effective_query[:50]}...' ")
                                elif success and stt_result and isinstance(stt_result.get('transcript'), str): # Handle if STT tool returns string directly
                                    effective_query = stt_result['transcript']
                                    current_app.logger.info(f"[API] Backend STT for direct_send successful (direct string): '{effective_query[:50]}...' ")
                                else:
                                    error_detail = "Backend STT failed for direct_send."
                                    if stt_result and stt_result.get('error'): error_detail = stt_result.get('error')
                                    elif not success : error_detail = "STT Tool indicated failure."
                                    else: error_detail = f"Unexpected STT result structure: {stt_result}"
                                    current_app.logger.error(f"[API] Error: {error_detail}")
                                    return jsonify({"error": "Audio transcription failed for agent processing", "detail": error_detail, "thread_id": thread_id}), 400
                            else:
                                # This case should ideally not be reached if 'audio_file' was present but audio_bytes is None
                                current_app.logger.warning("[API] Warning: 'direct_send' mode with audio file, but no audio_bytes to transcribe and no client_transcript.")
                                effective_query = initial_form_query # Fallback, likely empty
                    except Exception as e:
                        current_app.logger.error(f"[API] Error processing audio file '{filename}': {e}")
                        traceback.print_exc() # Add traceback for better debugging
                        return jsonify({"error": "Error processing audio file", "detail": str(e)}), 500
            
            # If effective_query is still not set (e.g. no audio file, or not direct_send for audio)
            if not effective_query:
                if client_provided_transcript: # Use client transcript if available and not used yet
                    effective_query = client_provided_transcript
                elif initial_form_query: # Fallback to initial form query
                    effective_query = initial_form_query
        
        elif request.content_type.startswith('application/json'):
            data = request.get_json()
            if not data:
                return jsonify({"error": "Invalid JSON payload"}), 400
            effective_query = data.get('query', '')
            thread_id = data.get('thread_id')
            document_id = data.get('documentId')
            stt_processing_mode = data.get('stt_processing_mode', 'direct_send') # Can be passed, though less common for JSON
            client_provided_transcript = data.get('transcript') # Also less common for JSON, but possible
            if client_provided_transcript and not effective_query: # If query is empty but transcript is there
                effective_query = client_provided_transcript
        else:
            return jsonify({"error": "Unsupported content type. Use 'multipart/form-data' for audio or 'application/json' for text."}), 415

        if not audio_data_base64 and not effective_query:
             return jsonify({"error": "Query (text or transcribed audio) is required"}), 400

        current_app.logger.info(f"[API] User: {user_id}, Thread: {thread_id}, Effective Query: '{effective_query[:50]}...', Audio: {'Yes' if audio_data_base64 else 'No'}, DocID: {document_id}, Mode: {stt_processing_mode}")

        db_manager = DatabaseManager(current_app)

        config = {"configurable": {"thread_id": thread_id, "user_id": user_id}}
        
        if not thread_id:
            thread_id = f"thread_{user_id}_{str(uuid.uuid4())[:8]}"
            config["configurable"]["thread_id"] = thread_id
            current_app.logger.info(f"[API] Created new thread: {thread_id}")
            supervisor_input = SupervisorState(
                user_id=user_id,
                current_query=effective_query, # Use effective_query
                conversation_history=[],
                active_quiz_thread_id=None,
                document_id_for_action=document_id,
                next_graph_to_invoke=None,
                final_agent_response=None,
                supervisor_error_message=None,
                quiz_active=False,
                quiz_complete=False,
                quiz_cancelled=False,
                quiz_ready_for_final_conclusion=None,
                current_audio_input_base64=audio_data_base64, # Still pass for potential downstream use
                current_audio_format=audio_format
            )
            current_app.logger.info(f"[API] Invoking supervisor for new thread {thread_id} with initial state.")
        else:
            current_app.logger.info(f"[API] Continuing existing thread: {thread_id}")
            try:
                current_state_checkpoint = compiled_supervisor_graph.get_state(config)
                conversation_history = current_state_checkpoint.values.get("conversation_history", []) if current_state_checkpoint and hasattr(current_state_checkpoint, 'values') else []
                # Deserialize messages after restoring from checkpoint
                conversation_history = deserialize_messages(conversation_history)
                current_app.logger.info(f"[API] Retrieved conversation history with {len(conversation_history)} messages")
            except Exception as e:
                current_app.logger.error(f"[API] Could not retrieve current state: {e}. Starting with empty history.")
                conversation_history = []
            
            retrieved_state_values = (current_state_checkpoint.values.copy() 
                                      if current_state_checkpoint and hasattr(current_state_checkpoint, 'values') and current_state_checkpoint.values 
                                      else {})
            if not retrieved_state_values:
                 current_app.logger.warning("[API] Warning: current_state_checkpoint.values not available or empty. Initializing SupervisorState with defaults and request data.")
            else:
                current_app.logger.info(f"[API] Retrieved state values from checkpoint: {list(retrieved_state_values.keys())}")

            supervisor_input = SupervisorState(
                user_id=user_id,
                current_query=effective_query, # Use effective_query
                current_audio_input_base64=audio_data_base64,
                current_audio_format=audio_format,
                document_id_for_action=document_id,
                conversation_history=conversation_history,
                active_quiz_thread_id=retrieved_state_values.get("active_quiz_thread_id"),
                next_graph_to_invoke=retrieved_state_values.get("next_graph_to_invoke"),
                final_agent_response=retrieved_state_values.get("final_agent_response"),
                supervisor_error_message=retrieved_state_values.get("supervisor_error_message"),
                quiz_active=retrieved_state_values.get("quiz_active", False),
                quiz_complete=retrieved_state_values.get("quiz_complete", False),
                quiz_cancelled=retrieved_state_values.get("quiz_cancelled", False),
                quiz_ready_for_final_conclusion=retrieved_state_values.get("quiz_ready_for_final_conclusion"),
                gcs_uri_for_action=retrieved_state_values.get("gcs_uri_for_action"),
                mime_type_for_action=retrieved_state_values.get("mime_type_for_action"),
                document_understanding_output=retrieved_state_values.get("document_understanding_output"),
                document_understanding_error=retrieved_state_values.get("document_understanding_error")
            )
            current_app.logger.info(f"[API] Invoking supervisor for existing thread {thread_id} with input.")

        logging.warning(f"SUPERVISOR_INPUT_STATE before invoke: {supervisor_input}")
        # Add diagnostic logging before safe invoke
        logging.debug("[DEBUG][Invoke] supervisor_input pre-invoke: %s", type(supervisor_input.get("conversation_history", [])))
        
        # Use safe supervisor invoke wrapper instead of direct invoke
        result = safe_supervisor_invoke(compiled_supervisor_graph, supervisor_input, config=config)
        
        # Add diagnostic logging after serialization
        logging.debug("[DEBUG][Serialize] conversation_history types after serialization: %s",
                      [type(x).__name__ for x in supervisor_input.get("conversation_history", [])])
        current_app.logger.debug(f"[API DEBUG] Raw result from supervisor: {result}")
        current_app.logger.debug(f"[API DEBUG] final_agent_response in result: {result.get('final_agent_response')}")

        # Check if a quiz is active and if its thread ID needs explicit checkpointing
        active_quiz_thread_id_from_result = result.get("active_quiz_thread_id")
        is_quiz_active_in_result = result.get("quiz_active")

        if is_quiz_active_in_result and active_quiz_thread_id_from_result and active_quiz_thread_id_from_result != thread_id:
            # This block executes if a quiz was just initiated or transitioned to a new quiz thread ID.
            # The main 'invoke' call (above) checkpointed the state under the original 'thread_id' from the request.
            # We now need to ALSO checkpoint the current state ('result') under the new 'active_quiz_thread_id_from_result'
            # to ensure that the next request using this new quiz_thread_id can load its state.
            current_app.logger.info(f"[API] Quiz is active with a dedicated thread ID: {active_quiz_thread_id_from_result} (original request thread: {thread_id}).")
            current_app.logger.info(f"[API] Explicitly checkpointing current supervisor state under: {active_quiz_thread_id_from_result}")
            quiz_specific_config = {"configurable": {"thread_id": active_quiz_thread_id_from_result, "user_id": user_id}}
            try:
                # 'result' is the full state dictionary from the supervisor graph's execution.
                # Serialize messages before checkpointing
                serialized_result = result.copy()
                if "conversation_history" in serialized_result:
                    serialized_result["conversation_history"] = serialize_messages(
                        serialized_result["conversation_history"]
                    )
                compiled_supervisor_graph.update_state(quiz_specific_config, serialized_result)
                current_app.logger.info(f"[API] State successfully checkpointed for new quiz thread: {active_quiz_thread_id_from_result}")
            except Exception as e_checkpoint:
                current_app.logger.error(f"[API] CRITICAL ERROR: Failed to checkpoint state for new quiz thread {active_quiz_thread_id_from_result}: {e_checkpoint}")
                # Depending on desired robustness, might want to inform user or affect response_data

        if not result:
            return jsonify({"error": "No response from agent", "thread_id": thread_id}), 500

        response_text = result.get("final_agent_response", "Sorry, I encountered an issue.")
        serializable_history = []
        for msg in result.get("conversation_history", []):
            if isinstance(msg, dict):
                # Already serialized format from our fix
                if msg.get("type") == "human":
                    serializable_history.append({"type": "human", "content": msg["data"]["content"]})
                elif msg.get("type") == "ai":
                    serializable_history.append({"type": "ai", "content": msg["data"]["content"]})
                else:
                    serializable_history.append({"type": "system", "content": str(msg.get("data", {}).get("content", ""))})
            elif isinstance(msg, HumanMessage):
                serializable_history.append({"type": "human", "content": msg.content})
            elif isinstance(msg, AIMessage):
                serializable_history.append({"type": "ai", "content": msg.content})
            else:
                serializable_history.append({"type": "system", "content": str(msg.content)})

        # Generate TTS for the agent's response
        audio_content_base64 = None
        timepoints = None
        # Attempt to get TTSService from app config, falling back to direct instantiation if not found (for robustness)
        tts_service_instance = current_app.config.get('SERVICES', {}).get('TTSService')
        if not tts_service_instance:
            current_app.logger.warning("[API] TTSService not found in app.config, attempting direct instantiation.")
            try:
                tts_service_instance = TTSService() # Ensure TTSService is imported
            except Exception as e:
                current_app.logger.error(f"[API] Failed to directly instantiate TTSService: {e}")
                tts_service_instance = None

        if tts_service_instance and tts_service_instance.is_functional() and response_text:
            try:
                tts_response = tts_service_instance.synthesize_text(response_text)
                if tts_response and tts_response.get("audio_content"):
                    audio_bytes = tts_response["audio_content"]
                    timepoints = tts_response.get("timepoints") # Extract timepoints
                    audio_content_base64 = base64.b64encode(audio_bytes).decode('utf-8')
                    current_app.logger.info(f"[API] TTS generated {len(audio_bytes)} bytes and {len(timepoints) if timepoints else 0} timepoints for chat response.")
                else:
                    current_app.logger.warning("[API] TTS synthesis returned no audio bytes for chat response.")
            except Exception as tts_ex:
                current_app.logger.error(f"[API] Error during TTS synthesis for chat response: {tts_ex}")

        response_data = {
            "response": response_text, # General response text
            "final_agent_response": result.get("final_agent_response"), # Specifically for agent's final output, like quiz questions
            "thread_id": result.get("active_quiz_thread_id") or thread_id, # Prioritize active_quiz_thread_id
            "conversation_history": serializable_history,
            "quiz_active": result.get("is_quiz_v2_active", False),
            "quiz_complete": result.get("quiz_complete", False),
            "quiz_cancelled": result.get("quiz_cancelled", False),
            "document_id": result.get("document_id_for_action"),
            "processing_mode": stt_processing_mode,
            "audio_content_base64": audio_content_base64,
            "timepoints": timepoints # Add this line
        }
        if result.get("supervisor_error_message"):
            response_data["error_detail"] = result["supervisor_error_message"]
            current_app.logger.error(f"[API] Supervisor error for user {user_id}, thread {thread_id}: {result['supervisor_error_message']}")

        current_app.logger.info(f"[API] Chat request for user {user_id}, thread {thread_id} completed. Quiz active: {response_data['quiz_active']}")
        return jsonify(response_data), 200

    except Exception as e:
        error_id = str(uuid.uuid4())
        error_msg_detail = f"Error processing chat request (ID: {error_id}): {str(e)}"
        current_app.logger.error(f"[API] --- {error_msg_detail} ---")
        traceback.print_exc()
        current_app.logger.info("[API] " + "-" * 50)
        
        # Ensure thread_id is available for the error response if it was defined
        current_thread_id = thread_id if 'thread_id' in locals() and thread_id else None
        
        return jsonify({
            "error": "An unexpected error occurred while processing your request.",
            "code": "CHAT_PROCESSING_ERROR",
            "error_id": error_id,
            "details": str(e), # Keep it concise for the client
            "thread_id": current_thread_id
        }), 500

@app.route('/api/v2/agent/history', methods=['GET'])
@require_auth
def get_chat_history_route():
    """
    Retrieve conversation history for a specific thread.
    """
    try:
        user_id = g.user_id
        thread_id = request.args.get('thread_id')
        
        if not thread_id:
            return jsonify({"error": "thread_id is required"}), 400

        current_app.logger.info(f"[API] Fetching history for thread: {thread_id}, user: {user_id}")

        config = {"configurable": {"thread_id": thread_id, "user_id": user_id}}
        
        # Access the compiled graph (assuming available globally like in agent_chat_route)
        # Note: compiled_supervisor_graph is defined at module level in app.py
        
        try:
            current_state_checkpoint = compiled_supervisor_graph.get_state(config)
        except Exception as e:
             current_app.logger.warning(f"[API] Could not retrieve state for history: {e}")
             return jsonify({"conversation_history": []}), 200

        if not current_state_checkpoint or not current_state_checkpoint.values:
             current_app.logger.info(f"[API] No state found for thread {thread_id}")
             return jsonify({"conversation_history": []}), 200

        conversation_history = current_state_checkpoint.values.get("conversation_history", [])
        
        # Deserialize messages to ensure consistent object types
        try:
            conversation_history = deserialize_messages(conversation_history)
        except Exception as e:
            current_app.logger.error(f"[API] Error deserializing history: {e}")
            # Fallback: return raw if deserialization fails (though unlikely to match format)
            return jsonify({"conversation_history": [], "error": "Deserialization failed"}), 500

        # Serialize for response (matching agent_chat_route logic)
        serializable_history = []
        for msg in conversation_history:
            if isinstance(msg, HumanMessage):
                serializable_history.append({"type": "human", "content": msg.content})
            elif isinstance(msg, AIMessage):
                serializable_history.append({"type": "ai", "content": msg.content})
            elif isinstance(msg, dict):
                 # Handle dicts if they slipped through deserialization or are custom
                if msg.get("type") == "human":
                    serializable_history.append({"type": "human", "content": msg.get("data", {}).get("content", "")})
                elif msg.get("type") == "ai":
                    serializable_history.append({"type": "ai", "content": msg.get("data", {}).get("content", "")})
                else:
                     serializable_history.append({"type": "system", "content": str(msg.get("data", {}).get("content", ""))})
            else:
                serializable_history.append({"type": "system", "content": str(msg.content)})

        current_app.logger.info(f"[API] Returned {len(serializable_history)} messages for thread {thread_id}")
        return jsonify({"conversation_history": serializable_history}), 200

    except Exception as e:
        current_app.logger.error(f"[API] Error in get_chat_history_route: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# --- Basic Routes (Health Check, etc.) --- 
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Backend is healthy'}), 200


@app.route('/api/tts/synthesize', methods=['POST'])
@require_auth
def tts_synthesize_route():
    """
    Synthesizes text to speech using TTSService.
    Expects a JSON payload with a 'text' field.
    Returns audio data as MP3.
    """
    user_id = g.user_id # Available from @require_auth
    if not request.is_json:
        current_app.logger.error(f"TTS Synthesis: Request is not JSON. Content-Type: {request.headers.get('Content-Type')}")
        return jsonify(error="Request must be JSON"), 400

    data = request.get_json()
    text_to_synthesize = data.get('text')
    voice_name = data.get('voice_name') # Optional, from useTTSPlayer
    speaking_rate = data.get('speaking_rate') # Optional, from useTTSPlayer
    pitch = data.get('pitch') # Optional, from useTTSPlayer

    if not text_to_synthesize:
        current_app.logger.error(f"TTS Synthesis: Missing 'text' in JSON payload. Received data: {data}")
        return jsonify(error="Missing 'text' in JSON payload"), 400

    try:
        tts_service = TTSService() # Get singleton instance
        if not tts_service.is_functional():
             current_app.logger.error(f"User {user_id} attempted to use TTS, but service is not functional.")
             return jsonify(error="TTS service is not available"), 503

        tts_response = tts_service.synthesize_text(
            text=text_to_synthesize,
            voice_name=voice_name, # Pass through if provided
            speaking_rate=speaking_rate, # Pass through if provided
            pitch=pitch # Pass through if provided
        )

        if tts_response and tts_response.get("audio_content"):
            audio_content = tts_response["audio_content"]
            timepoints = tts_response.get("timepoints", [])

            # Base64 encode the audio content
            encoded_audio = base64.b64encode(audio_content).decode('utf-8')

            current_app.logger.info(f"Successfully synthesized audio and timepoints for user {user_id}, text: '{text_to_synthesize[:50]}...'")
            return jsonify({
                "audio_content": encoded_audio,
                "timepoints": timepoints
            })
        else:
            current_app.logger.error(f"TTS synthesis failed for user {user_id}, text: '{text_to_synthesize[:50]}...'")
            return jsonify(error="Failed to synthesize audio"), 500
    except TTSServiceError as tse:
        current_app.logger.error(f"TTSServiceError for user {user_id}: {str(tse)}")
        return jsonify(error=f"TTS Service error: {str(tse)}"), 503
    except Exception as e:
        current_app.logger.error(f"Unexpected error in TTS route for user {user_id}: {str(e)}", exc_info=True)
        return jsonify(error=f"An unexpected error occurred: {str(e)}"), 500

# Route for Firestore connection diagnostics
@app.route('/api/diagnostics/firestore')
def test_firestore_connection():
    """Test Firestore connection and service account"""
    fs_service = app.config['SERVICES'].get('FirestoreService')
    if not fs_service:
        return jsonify({'status': 'error', 'message': 'Firestore service not available'}), 503
        
    results = {
        'status': 'ok',
        'project_id': os.getenv('GCP_PROJECT_ID'),
        'database_name_env': os.getenv('FIRESTORE_DATABASE_NAME'),
        'database_id_env': os.getenv('FIRESTORE_DATABASE_ID'), # Added for clarity
        'connection_status': 'Unknown',
        'database_name_client': None,
        'service_account_email': None
    }
    try:
        # Test getting the client directly from the service
        client = fs_service.db # Access the .db attribute directly
        if not client:
             raise Exception("FirestoreService returned no client")
        results['connection_status'] = 'Connected'
        # Attempt to get service account info (might fail depending on credentials)
        try:
            # This attribute might not exist depending on credential type
            if hasattr(client._credentials, 'service_account_email'):
                 results['service_account_email'] = client._credentials.service_account_email
            else:
                 results['service_account_info'] = 'Service account email not directly available from credentials.'
        except Exception as sa_err:
            results['service_account_info'] = f'Could not determine service account: {sa_err}'
            
    except Exception as e:
        results['status'] = 'error'
        results['connection_status'] = 'Failed'
        results['error'] = str(e)
        current_app.logger.error(f"Firestore connection test failed: {e}")
        return jsonify(results), 500

    return jsonify(results)


# --- Main execution --- 
if __name__ == '__main__':
    try:
        # Get port from environment variable or use default
        port = int(os.environ.get("PORT", 8081)) # Changed default to 8081
        app.run(debug=True, host='0.0.0.0', port=port)
    except ModuleNotFoundError as e:
        with open('error_trace.log', 'a') as f:
            f.write(f"Timestamp: {datetime.now()}\n")
            f.write(traceback.format_exc())
            f.write("\n------------------------------------\n")
        app.logger.critical(f"CRITICAL: ModuleNotFoundError occurred. Full traceback written to error_trace.log. Error: {e}")
        # Optionally, re-raise the exception if you want the program to still exit with an error code
        # raise
