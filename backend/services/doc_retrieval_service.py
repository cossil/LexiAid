"""
Document Retrieval Service for AI Tutor Application

This service is responsible for retrieving document content from either Firestore
or Google Cloud Storage, depending on how the document was stored.
"""

import os
import json
from typing import Dict, List, Any, Optional, Union, Tuple, BinaryIO

# Import required services
from backend.services.firestore_service import FirestoreService
from backend.services.storage_service import StorageService

class DocumentRetrievalService:
    """
    Service class for retrieving document content
    
    This service coordinates between Firestore and Storage services to retrieve
    the full text content of documents, handling different storage scenarios.
    """
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one Document Retrieval Service instance"""
        if cls._instance is None:
            cls._instance = super(DocumentRetrievalService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize with dependencies (Firestore and Storage services)"""
        # Initialize Firestore service
        try:
            self.firestore_service = FirestoreService()
        except Exception as e:
            print(f"Error initializing Firestore service: {e}")
            self.firestore_service = None
        
        # Initialize Storage service - do this separately to allow partial functionality
        try:
            self.storage_service = StorageService()
        except Exception as e:
            print(f"Error initializing Storage service: {e}")
            self.storage_service = None
            
        # Check if at least one service is available
        if self.firestore_service:
            print("Document Retrieval Service initialized with Firestore.")
        else:
            print("Warning: Document Retrieval Service initialized with limited functionality.")
    
    def get_document_metadata(self, document_id: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Get document metadata by document ID
        
        Args:
            document_id: ID of the document
            
        Returns:
            Tuple containing:
                - Success flag (bool)
                - Document metadata if successful, error information if failed
        """
        if not self.firestore_service:
            return False, {"error": "Firestore service not initialized"}
        
        try:
            # Retrieve document metadata from Firestore
            document_data = self.firestore_service.get_document(document_id)
            
            if not document_data:
                return False, {"error": f"Document not found with ID: {document_id}"}
            
            return True, document_data
        except Exception as e:
            error_message = f"Error retrieving document metadata: {str(e)}"
            print(error_message)
            return False, {"error": error_message}
    
    def get_document_content(self, document_id: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Get document content by document ID, prioritizing sources according to UI logic.
        
        Args:
            document_id: ID of the document
            
        Returns:
            Tuple containing:
                - Success flag (bool)
                - Document content if successful, error information if failed
        """
        if not self.firestore_service:
            return False, {"error": "Firestore service not initialized"}

        try:
            # 1. Get the main document metadata first
            # This call fetches all necessary fields (user_id, status, ocr_text_content, gcs_uri, storage_path etc.)
            success, document_data = self.get_document_metadata(document_id) # Uses FirestoreService.get_document

            if not success:
                # get_document_metadata already returns a dict with an "error" key on failure
                return False, document_data 

            # 2. Check for embedded DUA narrative or OCR content in the main document metadata
            doc_status = document_data.get('status')
            
            if doc_status == 'processed_dua' and 'dua_narrative_content' in document_data and document_data.get('dua_narrative_content'):
                # Use DUA narrative if available for 'processed_dua' status
                return True, {
                    "content": document_data['dua_narrative_content'],
                    "source": "firestore_dua_narrative",
                    "file_type": "txt" 
                }
            elif doc_status == 'processed' and 'ocr_text_content' in document_data and document_data.get('ocr_text_content'):
                # Use OCR text if available for 'processed' status
                return True, {
                    "content": document_data['ocr_text_content'],
                    "source": "firestore_ocr_field",
                    "file_type": "txt" 
                }

            # 3. If not embedded in ocr_text_content, check for GCS storage path
            #    Prioritize 'gcs_uri', then 'storage_path', then legacy 'contentStorageRef' or 'storageRef'.
            gcs_path = (document_data.get('gcs_uri') or
                        document_data.get('storage_path') or
                        document_data.get('contentStorageRef') or
                        document_data.get('storageRef'))

            if gcs_path:
                if not self.storage_service:
                    return False, {"error": "Storage service not initialized, cannot fetch from GCS"}
                
                # storage_service.get_file is expected to return (bool, bytes)
                # but the previous code used storage_service.download_file which might be different.
                # Assuming storage_service.get_file is the correct one based on previous usage.
                # If it's download_file_to_bytes from document_routes, the StorageService interface needs alignment.
                # For now, sticking to existing get_file method in DocumentRetrievalService's original code.
                dl_success, content_bytes = self.storage_service.get_file(gcs_path) 
                
                if not dl_success or not content_bytes:
                    return False, {"error": f"Failed to retrieve document content from GCS: {gcs_path}"}

                # Check MIME type and file_type before attempting to decode as text
                mime_type = document_data.get('mime_type', '').lower()
                file_type = document_data.get('file_type', '').lower()

                is_image = False
                if mime_type.startswith('image/'):
                    is_image = True
                elif not mime_type and file_type in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'heic', 'heif']:
                    is_image = True

                if is_image:
                    return False, {"error": f"Document is an image ({mime_type}) and cannot be read as text."}
                # Add other non-text types here if needed, e.g., 'application/pdf' if not handled by OCR

                try:
                    content_text = content_bytes.decode('utf-8')
                    return True, {
                        "content": content_text,
                        "source": "gcs",
                        "path": gcs_path,
                        "document_id": document_id
                    }
                except UnicodeDecodeError:
                    return False, {"error": f"Document content from GCS ({gcs_path}) is not text or is in an unsupported encoding"}
                except Exception as e: # Catch other potential errors during decode or processing
                    return False, {"error": f"Error processing content from GCS ({gcs_path}): {str(e)}"}

            # 4. If no ocr_text_content and no GCS path, try Firestore's 'document_contents' collection
            #    (self.firestore_service.get_document_content already points here)
            print(f"Attempting to retrieve content for doc {document_id} from 'document_contents' collection.")
            firestore_content_data = self.firestore_service.get_document_content_from_subcollection(document_id)
            
            if firestore_content_data and 'content' in firestore_content_data:
                print(f"Retrieved content for doc {document_id} from 'document_contents' collection.")
                # Add document_id and source if not present, though firestore_content_data might already be structured
                firestore_content_data['document_id'] = firestore_content_data.get('document_id', document_id)
                firestore_content_data['source'] = firestore_content_data.get('source', 'firestore_document_contents')
                return True, firestore_content_data
            
            # 5. If still no content, and if mock responses were intended, check that (removed for now to simplify, focus on real paths)
            # if 'mock_response' in document_data and document_data['mock_response']:
            #     print(f"Using mock content for document: {document_id}")
            #     return True, {
            #         'document_id': document_id,
            #         'content': f"This is mock content for document {document_id}. The actual document content would be retrieved from storage in production.",
            #         'source': 'mock',
            #         'title': document_data.get('title', 'Unknown Document')
            #     }

            # All attempts failed
            print(f"Failed to find content for doc {document_id} through any method.")
            return False, {"error": "Document content not found: No 'ocr_text_content', GCS path, or 'document_contents' entry."}
                
        except Exception as e:
            error_message = f"Unexpected error in DocumentRetrievalService.get_document_content for doc_id {document_id}: {str(e)}"
            # Log the full exception for detailed debugging
            import traceback
            print(f"{error_message}\n{traceback.format_exc()}")
            return False, {"error": error_message}
    
    def get_document_text(self, document_id: str, user_id: str = None) -> Tuple[bool, Union[str, Dict[str, Any]]]:
        """
        Get document text content, with optional user verification
        
        Args:
            document_id: ID of the document
            user_id: Optional user ID to verify ownership
            
        Returns:
            Tuple containing:
                - Success flag (bool)
                - Document text if successful, error information if failed
        """
        # Verify user has access to this document if user_id is provided
        if user_id:
            # First get document metadata to check ownership
            success, document_data = self.get_document_metadata(document_id)
            
            if not success:
                return False, document_data  # This contains the error
            
            # Check if user owns this document
            doc_user_id = document_data.get('user_id')
            if doc_user_id != user_id:
                return False, {"error": "Access denied: User does not own this document"}
        
        # Get document content
        success, content_data = self.get_document_content(document_id)
        
        if not success:
            return False, content_data  # This contains the error
        
        # Return just the text content
        return True, content_data.get('content', '')
    
    def chunk_document_text(self, text: str, chunk_size: int = 4000, overlap: int = 200) -> List[str]:
        """
        Split document text into overlapping chunks to fit LLM context windows
        
        Args:
            text: The document text to chunk
            chunk_size: Maximum size of each chunk in characters
            overlap: Number of characters to overlap between chunks
            
        Returns:
            List of text chunks
        """
        if not text:
            return []
            
        # If text is smaller than chunk size, return it as is
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            # Determine end of current chunk
            end = start + chunk_size
            
            if end >= len(text):
                # Last chunk
                chunks.append(text[start:])
                break
            
            # Try to find a good break point (newline or space)
            # First look for newline
            break_point = text.rfind('\n', start + chunk_size - overlap, end)
            
            if break_point == -1:
                # If no newline, try to break at a space
                break_point = text.rfind(' ', start + chunk_size - overlap, end)
            
            if break_point == -1:
                # If still no good break point, just break at chunk_size
                break_point = end
            
            # Add the chunk
            chunks.append(text[start:break_point])
            
            # Set start of next chunk, ensuring we don't go backwards 
            # in case break_point is before the minimum position
            start = max(break_point, start + chunk_size - overlap)
        
        return chunks
    
    def get_document_chunks(
        self, 
        document_id: str, 
        user_id: str = None, 
        chunk_size: int = 4000, 
        overlap: int = 200
    ) -> Tuple[bool, Union[List[str], Dict[str, Any]]]:
        """
        Get document text content split into chunks, with optional user verification
        
        Args:
            document_id: ID of the document
            user_id: Optional user ID to verify ownership
            chunk_size: Maximum size of each chunk in characters
            overlap: Number of characters to overlap between chunks
            
        Returns:
            Tuple containing:
                - Success flag (bool)
                - List of document text chunks if successful, error information if failed
        """
        # Get full document text
        success, text_or_error = self.get_document_text(document_id, user_id)
        
        if not success:
            return False, text_or_error  # This contains the error
        
        # Split into chunks
        chunks = self.chunk_document_text(text_or_error, chunk_size, overlap)
        
        return True, chunks

    def get_document_content_for_quiz(self, document_id: str, max_length: int = 10000) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        Get a snippet of document content suitable for quiz generation.

        Args:
            document_id: ID of the document.
            max_length: Maximum length of the content snippet to return.

        Returns:
            Tuple containing:
                - Success flag (bool)
                - Document content snippet if successful, None otherwise.
                - Error message if failed, None otherwise.
        """
        print(f"[DocumentRetrievalService] Attempting to get content for quiz for doc ID: {document_id}")
        # Use existing method to get the full text content. 
        # User verification is not explicitly handled here, assuming supervisor/calling context manages permissions.
        success, text_or_error = self.get_document_text(document_id=document_id, user_id=None) 

        if not success:
            error_message = text_or_error.get("error", "Unknown error retrieving document text for quiz.") if isinstance(text_or_error, dict) else "Unknown error retrieving document text for quiz."
            print(f"[DocumentRetrievalService] Failed to get document text for quiz: {error_message}")
            return False, None, error_message
        
        full_text = text_or_error
        if not full_text:
            print(f"[DocumentRetrievalService] Document text is empty for doc ID: {document_id}")
            return False, None, "Document content is empty."

        # Take a snippet of the text
        snippet = full_text[:max_length]
        print(f"[DocumentRetrievalService] Successfully retrieved snippet (length: {len(snippet)}) for quiz for doc ID: {document_id}")
        return True, snippet, None
