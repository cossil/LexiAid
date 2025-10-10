from flask import Blueprint, request, jsonify, send_file, current_app, g
from werkzeug.utils import secure_filename
import os
import tempfile
import io
from datetime import datetime, timezone
from functools import wraps
import uuid
import asyncio
import json # For DUA output handling

# Assuming services are initialized elsewhere and passed or imported
# from services import AuthService, FirestoreService, StorageService, DocRetrievalService

# Import services and tools from the application context
# from ..services import FirestoreService, StorageService # Example structure

from google.cloud import documentai_v1 as documentai
from graphs.document_understanding_agent.graph import DocumentUnderstandingState, run_dua_processing_for_document

# from utilities.benchmark import STime # Assuming STime is for benchmarking
# from utilities.prepare_response_text import prepare_response_text # Assuming utility function

# --- VERY PROMINENT LOG TO CONFIRM THIS FILE IS LOADED ---
print("\n***************************************************")
print("*** LOADING document_routes.py - VERSION MAY 12 20:55 ***")
print("***************************************************\n\n")
# current_app.logger.critical("********** document_routes.py - VERSION MAY 12 20:55 LOADED **********") # REMOVED - Causes RuntimeError
# --- END PROMINENT LOG ---

# Placeholder for actual service instances - these need to be properly injected
# e.g., using Flask app context or dependency injection
auth_service = None
firestore_service = None
storage_service = None
doc_retrieval_service = None

document_bp = Blueprint('document_bp', __name__, url_prefix='/api/documents')

# Helper function to get user from token (adapted for blueprint context)
def _get_user_from_token(token_override=None):
    """Helper function to extract and verify user from JWT token."""
    token = token_override
    if not token:
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        else:
            return None, ({"error": "Authorization header is missing or Bearer token malformed"}, 401)

    if not token:
        return None, ({"error": "Token is missing"}, 401)

    auth_service = current_app.config.get('AUTH_SERVICE')
    if not auth_service:
        current_app.logger.error("AUTH_SERVICE not configured in Flask app.")
        return jsonify({"error": "Authentication service not available"}), 500

    try:
        is_valid, user_info = auth_service.verify_id_token(token)
        if not is_valid or not user_info:
            return None, ({"error": "Invalid or expired token"}, 401)
        
        return user_info, None
    except Exception as e:
        current_app.logger.error(f"Token verification failed: {e}")
        return None, ({"error": "Token verification failed", "details": str(e)}, 401)


def auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # _get_user_from_token expects the token itself if passed as token_override
        # It handles extracting from header if token_override is None.
        # For a decorator, we explicitly manage token extraction here for clarity.
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            return jsonify({"error": "Authorization token is missing or malformed"}), 401

        user_data, error_info = _get_user_from_token(token_override=token)

        if error_info:
            return jsonify(error_info[0]), error_info[1]
        
        g.user_id = user_data.get('uid')
        # You can also set g.user = user_data if you need the full user object in routes
        return f(*args, **kwargs)
    return decorated_function

ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif'}
OCR_ELIGIBLE_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'tiff'}  # DEPRECATED: OCR no longer supported 
DUA_ELIGIBLE_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'} # Define file types for DUA processing (now includes images) 

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@document_bp.route('/upload', methods=['POST'])
@auth_required
def upload_document():
    """Upload a new document and trigger DUA, OCR, or Advanced Layout processing."""
    current_app.logger.info("\n\n--- UPLOAD_DOCUMENT HIT (DUA INTEGRATED - Single Call) ---")
    user_id = g.user_id

    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        original_filename = file.filename
        document_name = request.form.get('name', original_filename)
        file_extension = filename.rsplit('.', 1)[1].lower() if '.' in filename else 'unknown'
        generated_document_id = str(uuid.uuid4())

        firestore_service = current_app.config['FIRESTORE_SERVICE']
        storage_service = current_app.config['STORAGE_SERVICE']
        document_id = None 

        final_fs_update_payload = {}
        response_data = {} # Initialize response data

        try:
            # 1. Create initial document entry in Firestore
            initial_doc_data = {
                'id': generated_document_id, 'user_id': user_id, 'name': document_name,
                'original_filename': original_filename, 'file_type': file_extension, 'status': 'uploading',
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'gcs_uri': None, 'content_length': request.content_length,
                'dua_narrative_content': None, # Initialize DUA field
                'ocr_text_content': None,      # Initialize OCR field
                'processing_error': None     # Initialize error field
            }
            document_id = firestore_service.save_document(initial_doc_data)
            if not document_id:
                current_app.logger.error("Failed to create document entry in Firestore during initial save.")
                return jsonify({"error": "Failed to create document entry in Firestore"}), 500
            
            final_fs_update_payload.update(initial_doc_data)
            final_fs_update_payload['id'] = document_id # Ensure 'id' is the actual Firestore doc ID

            # 2. Upload original file to Google Cloud Storage
            file.seek(0)
            success_gcs_original, gcs_file_metadata = storage_service.upload_file(
                file_content=file,
                content_type=file.mimetype,
                user_id=user_id,
                original_filename=original_filename
            )
            if not success_gcs_original or not gcs_file_metadata:
                current_app.logger.error(f"Failed to upload original file to GCS for document_id: {document_id}")
                if document_id: 
                    try: firestore_service.delete_document(document_id) 
                    except Exception as e_clean: current_app.logger.error(f"Firestore cleanup failed for {document_id}: {e_clean}")
                return jsonify({"error": "Failed to upload file to storage"}), 500

            # 3. Update Firestore with GCS URI of original file
            gcs_uri = gcs_file_metadata['gcsUri']
            current_processing_status = 'uploaded'
            final_fs_update_payload.update({
                'gcs_uri': gcs_uri, 'status': current_processing_status,
                'updated_at': datetime.now(timezone.utc).isoformat(),
                'content_length': gcs_file_metadata.get('size', request.content_length)
            })
            if not firestore_service.update_document(document_id, final_fs_update_payload):
                current_app.logger.error(f"CRITICAL: Uploaded {gcs_uri} but failed to update Firestore for doc {document_id}.")
                # Consider GCS cleanup here if critical
                return jsonify({"error": "File uploaded but failed to update document details before processing"}), 500

            dua_processed_successfully = False
            ocr_text_content_produced = False

            # --- 4. DUA PROCESSING (Single Call Refactor) ---
            if file_extension in DUA_ELIGIBLE_EXTENSIONS:
                current_app.logger.info(f"Document {document_id} ({file_extension}) is DUA eligible. Attempting new single-call DUA.")
                final_fs_update_payload['status'] = 'processing_dua'
                firestore_service.update_document(document_id, {'status': 'processing_dua', 'updated_at': datetime.now(timezone.utc).isoformat()})
                
                dua_initial_state = {
                    "document_id": document_id,
                    "input_file_path": gcs_uri, # Use GCS URI for DUA processing
                    "input_file_mimetype": file.mimetype,
                    "original_gcs_uri": gcs_uri # Store for reference if needed
                }
                current_app.logger.info(f"Calling run_dua_processing_for_document with state: {dua_initial_state}")

                try:
                    # Run the DUA graph (this is an async function, run it appropriately)
                    dua_result = asyncio.run(run_dua_processing_for_document(dua_initial_state))
                    current_app.logger.info(f"DUA processing result for {document_id}: {dua_result}")

                    if dua_result and dua_result.get('tts_ready_narrative'):
                        final_fs_update_payload['dua_narrative_content'] = dua_result['tts_ready_narrative']
                        final_fs_update_payload['status'] = 'processed_dua'
                        final_fs_update_payload['processing_error'] = None # Clear any previous error
                        dua_processed_successfully = True
                        current_app.logger.info(f"DUA successfully processed document {document_id}.")

                        # --- Pre-generate TTS Audio and Timepoints ---
                        try:
                            narrative_text = dua_result['tts_ready_narrative']
                            if narrative_text and len(narrative_text.strip()) > 10: # Only generate for substantial text
                                current_app.logger.info(f"Starting TTS pre-generation for document {document_id}.")
                                tts_service = current_app.config['TTS_SERVICE']
                                tts_result = tts_service.synthesize_text(narrative_text)

                                if tts_result and tts_result.get('audio_content') and tts_result.get('timepoints'):
                                    audio_content = tts_result['audio_content']
                                    timepoints_json = json.dumps(tts_result['timepoints'])

                                    # Upload audio file
                                    audio_success, audio_meta = storage_service.upload_bytes_as_file(
                                        content_bytes=audio_content,
                                        content_type='audio/mpeg',
                                        user_id=user_id,
                                        base_filename=f"{document_id}_tts.mp3",
                                        sub_folder='tts_outputs'
                                    )

                                    # Upload timepoints file
                                    tp_success, tp_meta = storage_service.upload_string_as_file(
                                        content_string=timepoints_json,
                                        content_type='application/json',
                                        user_id=user_id,
                                        base_filename=f"{document_id}_timepoints.json",
                                        sub_folder='tts_outputs'
                                    )

                                    if audio_success and tp_success:
                                        final_fs_update_payload['tts_audio_gcs_uri'] = audio_meta['gcsUri']
                                        final_fs_update_payload['tts_timepoints_gcs_uri'] = tp_meta['gcsUri']
                                        current_app.logger.info(f"Successfully pre-generated and saved TTS assets for {document_id}.")
                                    else:
                                        current_app.logger.error(f"Failed to upload TTS assets to GCS for {document_id}.")
                                else:
                                    current_app.logger.error(f"TTS synthesis failed or returned incomplete data for {document_id}.")
                        except Exception as e_tts:
                            current_app.logger.error(f"An exception occurred during TTS pre-generation for {document_id}: {e_tts}", exc_info=True)
                    else:
                        error_msg = dua_result.get('error_message', 'DUA processing failed or returned no narrative.')
                        final_fs_update_payload['status'] = 'dua_failed'
                        final_fs_update_payload['processing_error'] = error_msg
                        current_app.logger.error(f"DUA processing failed for {document_id}: {error_msg}")
                except Exception as e_dua:
                    current_app.logger.error(f"Exception during DUA processing for {document_id}: {e_dua}", exc_info=True)
                    final_fs_update_payload['status'] = 'dua_failed'
                    final_fs_update_payload['processing_error'] = f"DUA execution error: {str(e_dua)}"
                
                final_fs_update_payload['updated_at'] = datetime.now(timezone.utc).isoformat()
                firestore_service.update_document(document_id, final_fs_update_payload)


            # --- 5. OCR PROCESSING (if not DUA processed successfully, and eligible for OCR) ---
            should_run_ocr = False
            if file_extension in OCR_ELIGIBLE_EXTENSIONS:
                if file_extension in DUA_ELIGIBLE_EXTENSIONS: # File was DUA eligible
                    if not dua_processed_successfully: # DUA was eligible but failed or not run
                        current_app.logger.info(f"DUA processing was not successful for {document_id}. Considering OCR.")
                        should_run_ocr = True
                    else: # DUA was eligible and successful
                        current_app.logger.info(f"DUA processing was successful for {document_id}. DUA narrative will be used; skipping OCR.")
                        # The DUA narrative should contain the text.
                else: # File was not DUA eligible, but is OCR eligible
                    current_app.logger.info(f"Document {document_id} is not DUA eligible. Proceeding with OCR if applicable.")
                    should_run_ocr = True
            
            if should_run_ocr:
                current_app.logger.warning(f"OCR functionality has been deprecated. Document {document_id} ({file_extension}) will be marked as 'ocr_unavailable'.")
                final_fs_update_payload['status'] = 'ocr_unavailable'
                final_fs_update_payload['processing_error'] = 'OCR processing is no longer supported. Please re-upload as a DUA-eligible format (PDF, PNG, JPG, JPEG) for full processing.'
                final_fs_update_payload['updated_at'] = datetime.now(timezone.utc).isoformat()
                firestore_service.update_document(document_id, final_fs_update_payload)

            # Determine final status based on processing outcomes
            if final_fs_update_payload.get('status') not in ['processed_dua', 'processed_ocr', 'dua_failed', 'ocr_failed', 'ocr_empty_result', 'ocr_skipped_tool_unavailable']:
                # If no specific processing status was set, mark as 'processed' (generic) or 'upload_failed' if something went wrong earlier.
                # This path should ideally not be hit if logic is correct.
                final_fs_update_payload['status'] = 'processed_generic' # Fallback status
            
            current_app.logger.info(f"Final Firestore update for {document_id}: {final_fs_update_payload}")
            if not firestore_service.update_document(document_id, final_fs_update_payload): # Final update
                 current_app.logger.error(f"CRITICAL: Failed final Firestore update for doc {document_id} after processing.")
                 # This is a problematic state, data might be inconsistent.

            response_data = {
                "message": "File processed successfully.",
                "document_id": document_id,
                "filename": original_filename,
                "name": document_name,
                "gcs_uri": gcs_uri,
                "status": final_fs_update_payload.get('status'),
                "dua_processed": dua_processed_successfully,
                "ocr_processed": ocr_text_content_produced,
                "dua_narrative_snippet": (final_fs_update_payload.get('dua_narrative_content')[:200] + '...' if final_fs_update_payload.get('dua_narrative_content') else None),
                "processing_error": final_fs_update_payload.get('processing_error')
            }
            return jsonify(response_data), 200

        except Exception as e:
            current_app.logger.error(f"Error during document upload and processing for {original_filename}: {e}", exc_info=True)
            # Attempt to clean up Firestore entry if it was created and an error occurred
            if document_id and final_fs_update_payload.get('status') != 'uploading': # Avoid double delete if initial save failed
                try:
                    # Update status to reflect failure before potential delete, or just log
                    firestore_service.update_document(document_id, {
                        'status': 'upload_failed', 
                        'processing_error': f"Unhandled exception: {str(e)}",
                        'updated_at': datetime.now(timezone.utc).isoformat()
                    })
                except Exception as e_fs_final_fail:
                    current_app.logger.error(f"Failed to update Firestore status to 'upload_failed' for {document_id}: {e_fs_final_fail}")
            return jsonify({"error": "Internal server error during file processing", "details": str(e)}), 500
    else:
        return jsonify({"error": "File type not allowed"}), 400


@document_bp.route('/<string:document_id>', methods=['DELETE'])
@auth_required
def delete_document(document_id):
    """Deletes a document and its associated file from GCS."""
    user_id = g.user_id
    if not user_id:
        current_app.logger.error(f"User ID not found in g context during delete for document {document_id}")
        return jsonify({'error': 'Authentication context error.'}), 500

    firestore_service = current_app.config.get('FIRESTORE_SERVICE')
    storage_service = current_app.config.get('STORAGE_SERVICE')

    if not firestore_service:
        current_app.logger.error("FirestoreService not configured.")
        return jsonify({'error': 'Server configuration error.'}), 500
    if not storage_service:
        current_app.logger.error("StorageService not configured.")
        return jsonify({'error': 'Server configuration error.'}), 500

    try:
        current_app.logger.info(f"User {user_id} attempting to delete document {document_id}.")
        # Attempt to delete from Firestore and get GCS URI
        gcs_uri_to_delete = firestore_service.delete_document_by_id(document_id, user_id)

        if gcs_uri_to_delete is None:
            # This means either the document didn't exist or the user didn't have permission,
            # or an error occurred during Firestore deletion. 
            # FirestoreService logs the specific reason.
            # We can infer based on whether a GCS URI was returned if it was a permission issue vs not found.
            # For simplicity, return 404 if no URI, implies not found or not authorized which is common for DELETE
            doc_check = firestore_service.get_document(document_id)
            if doc_check and (doc_check.get('user_id') != user_id and doc_check.get('userId') != user_id) :
                return jsonify({'error': 'Permission denied. You do not own this document.'}), 403
            return jsonify({'error': 'Document not found or already deleted.'}), 404

        # If a GCS URI was returned, proceed to delete from GCS
        if gcs_uri_to_delete:
            current_app.logger.info(f"Attempting to delete GCS file: {gcs_uri_to_delete} for document {document_id}")
            gcs_delete_success = storage_service.delete_file_from_gcs(gcs_uri_to_delete)
            if not gcs_delete_success:
                # Log the error, but don't necessarily fail the whole operation if Firestore entry was deleted.
                # The document is effectively gone from the user's perspective.
                # This could be an orphaned file, might need a cleanup process later.
                current_app.logger.error(f"Failed to delete GCS file {gcs_uri_to_delete} for document {document_id}. Firestore entry was deleted.")
            else:
                current_app.logger.info(f"Successfully deleted GCS file {gcs_uri_to_delete} for document {document_id}")
        else:
            current_app.logger.info(f"No GCS URI found for document {document_id} after Firestore deletion. Assuming no GCS file to delete.")

        return '', 204  # No Content, standard for successful DELETE

    except Exception as e:
        current_app.logger.error(f"Unexpected error during document deletion (doc: {document_id}, user: {user_id}): {e}")
        return jsonify({'error': 'An unexpected error occurred during deletion.', 'details': str(e)}), 500


@document_bp.route('', methods=['GET'])
@auth_required
def get_documents():
    """Fetch a list of documents for the user."""
    user_id = g.user_id  # Set by @auth_required decorator
    firestore_service = current_app.config['FIRESTORE_SERVICE']

    try:
        # Fetch documents for the user. folder_id is omitted to get all documents.
        docs = firestore_service.get_user_documents(user_id)
        
        # Ensure created_at and updated_at are strings if they are datetime objects
        # Firestore often returns them as datetime objects, but JSON needs strings.
        for doc in docs:
            if isinstance(doc.get('created_at'), datetime):
                doc['created_at'] = doc['created_at'].isoformat()
            if isinstance(doc.get('updated_at'), datetime):
                doc['updated_at'] = doc['updated_at'].isoformat()

        return jsonify(docs), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching documents for user {user_id}: {e}", exc_info=True)
        return jsonify({"error": "Internal server error while fetching documents"}), 500

@document_bp.route('/<string:document_id>', methods=['GET'])
@auth_required
def get_document_details(document_id):
    """Get details for a specific document."""
    user_id = g.user_id
    firestore_service = current_app.config['FIRESTORE_SERVICE']
    doc = firestore_service.get_document(document_id)

    if not doc or doc.get('user_id') != user_id:
        return jsonify({"error": "Document not found or access denied"}), 404

    # Prepare response, ensuring all necessary fields are present
    response_data = {
        "id": doc.get('id', document_id),
        "name": doc.get('name'),
        "created_at": doc.get('created_at'),
        "updated_at": doc.get('updated_at'),
        "file_type": doc.get('file_type'),
        "status": doc.get('status'),
        "original_filename": doc.get('original_filename'),
        "gcs_uri": doc.get('gcs_uri'),
        "content_length": doc.get('content_length')
    }

    include_content = request.args.get('include_content', 'false').lower() == 'true'

    if include_content:
        storage_service = current_app.config['STORAGE_SERVICE']
        doc_ai_service = current_app.config.get('DOCAI_SERVICE') # Get DocAIService

        # Prioritize OCR'd content if available and status is 'processed'
        if doc.get('status') == 'processed_layout' and 'advanced_layout_gcs_uri' in doc:
            current_app.logger.info(f"Serving advanced layout content from GCS for document {document_id}")
            storage_service = current_app.config['STORAGE_SERVICE']
            layout_json_string = storage_service.download_file_as_string(doc['advanced_layout_gcs_uri'])
            if layout_json_string:
                response_data['content'] = layout_json_string
                response_data['content_is_json'] = True
            else:
                current_app.logger.error(f"Failed to download advanced_layout_json from {doc['advanced_layout_gcs_uri']} for doc {document_id}")
                # Fallback or error indication
                response_data['content'] = doc.get('ocr_text_content', '') # Fallback to OCR text
                response_data['processing_error'] = (doc.get('processing_error', '') + "; Failed to load advanced layout data.").strip()
                response_data['content_is_json'] = False
        elif doc.get('status') == 'processed_dua' and 'dua_narrative_content' in doc:
            current_app.logger.info(f"Serving DUA narrative content for document {document_id}")
            response_data['content'] = doc['dua_narrative_content']
            response_data['content_is_json'] = False # DUA narrative is plain text
        elif doc.get('status') == 'processed_ocr' and 'ocr_text_content' in doc:
            current_app.logger.info(f"Serving OCR content for document {document_id}")
            response_data['content'] = doc['ocr_text_content']
        elif doc.get('file_type') == 'txt' and doc.get('gcs_uri'): # For text files, read from GCS
            try:
                current_app.logger.info(f"Serving direct GCS content for .txt document {document_id}")
                file_content_bytes = storage_service.download_file_to_bytes(doc['gcs_uri'])
                response_data['content'] = file_content_bytes.decode('utf-8') # Assuming UTF-8 for text files
            except Exception as e:
                current_app.logger.error(f"Failed to read .txt content from GCS for {document_id}: {e}")
                response_data['content'] = None # Or an error message
                response_data['content_error'] = f"Failed to load text content: {str(e)}"
        # If OCR was skipped, failed, or file is not .txt but content is requested, what to do?
        # For now, if not .txt and no ocr_text_content, content will be None unless we add another step.
        # If status indicates OCR failed, provide the error
        elif doc.get('status') in ['ocr_failed', 'ocr_empty_result', 'processing_failed'] and 'processing_error' in doc:
            response_data['content'] = None
            response_data['content_error'] = doc.get('processing_error', 'Document processing failed or resulted in no content.')
        elif doc.get('status') == 'processing_ocr': # If still processing
            response_data['content'] = None
            response_data['content_error'] = 'Document is still being processed by OCR.'
        else: # For other non-txt, non-OCR'd files (e.g. PDF uploaded before OCR was implemented)
            response_data['content'] = None
            if doc.get('file_type') in OCR_ELIGIBLE_EXTENSIONS:
                 response_data['content_error'] = 'OCR processing was not performed or did not yield content for this document.'

    return jsonify(response_data), 200


@document_bp.route('/<document_id>/download', methods=['GET'])
def download_document(document_id):
    """Provide a download link/file for a document."""
    user_data, error = _get_user_from_token()
    if error:
        return jsonify(error[0]), error[1]
    user_id = user_data.get('uid') # May need user_id for authorization checks within service

    try:
        # TODO: 
        # 1. Get document metadata from Firestore (need GCS path/URI)
        #    success, doc_data = firestore_service.get_document_metadata(document_id)
        #    if not success or not doc_data:
        #        return jsonify({"error": "Document not found"}), 404
        #    gcs_path = doc_data.get('gcs_uri') # Or however the path is stored
        #    original_filename = doc_data.get('name', 'downloaded_file')
        # 2. Download file from GCS to a temporary location using StorageService
        #    temp_file_path = storage_service.download_blob_to_tempfile(gcs_path)
        # 3. Send the temporary file
        #    return send_file(temp_file_path, as_attachment=True, download_name=original_filename)

        # Example placeholder: sending a dummy text file
        with tempfile.NamedTemporaryFile(mode='w+', delete=False) as temp_f:
            temp_f.write(f"This is the placeholder download content for document {document_id}.")
            temp_path = temp_f.name
        
        return send_file(temp_path, as_attachment=True, download_name=f"{document_id}_placeholder.txt")
        # TODO: Ensure temporary file is deleted after sending (maybe use flask's after_this_request)

    except Exception as e:
        print(f"Error downloading document {document_id}: {e}")
        return jsonify({"error": "Internal server error"}), 500

@document_bp.route('/<string:document_id>/tts-assets', methods=['GET'])
@auth_required
def get_tts_assets(document_id):
    """Provides signed URLs for pre-generated TTS audio and timepoints."""
    user_id = g.user_id
    firestore_service = current_app.config['FIRESTORE_SERVICE']
    storage_service = current_app.config['STORAGE_SERVICE']

    doc = firestore_service.get_document(document_id)

    if not doc or doc.get('user_id') != user_id:
        return jsonify({"error": "Document not found or access denied"}), 404

    audio_gcs_uri = doc.get('tts_audio_gcs_uri')
    timepoints_gcs_uri = doc.get('tts_timepoints_gcs_uri')

    if not audio_gcs_uri or not timepoints_gcs_uri:
        return jsonify({"error": "TTS assets not found for this document."}), 404

    try:
        # GCS URIs are in the format gs://<bucket>/<path>. We need just the path for get_signed_url.
        audio_blob_name = audio_gcs_uri.replace(f"gs://{storage_service.bucket.name}/", "", 1)
        timepoints_blob_name = timepoints_gcs_uri.replace(f"gs://{storage_service.bucket.name}/", "", 1)

        audio_url = storage_service.get_signed_url(audio_blob_name)
        timepoints_url = storage_service.get_signed_url(timepoints_blob_name)

        if not audio_url or not timepoints_url:
            return jsonify({"error": "Failed to generate secure URLs for TTS assets."}), 500

        return jsonify({
            "audio_url": audio_url,
            "timepoints_url": timepoints_url
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error generating signed URLs for TTS assets for doc {document_id}: {e}", exc_info=True)
        return jsonify({"error": "Internal server error while generating asset URLs."}), 500


# TODO: Add initialization logic to register this blueprint with the Flask app
# and inject dependencies (auth_service, firestore_service, etc.)
