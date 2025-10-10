import logging
import os
from google.cloud import documentai

logger = logging.getLogger(__name__)

class ContentRetrievalError(Exception):
    """Custom exception for errors during document content retrieval."""
    pass

class DocAIService:
    def __init__(self):
        """Initializes the Document AI Service."""
        logger.info("Initializing DocAIService...")
        try:
            self.client = documentai.DocumentProcessorServiceClient()
            self.processor_name = os.getenv("GOOGLE_DOCUMENT_AI_PROCESSOR_NAME")
            if not self.processor_name:
                logger.error("GOOGLE_DOCUMENT_AI_PROCESSOR_NAME environment variable not set.")
                raise ValueError("GOOGLE_DOCUMENT_AI_PROCESSOR_NAME is not set.")
            logger.info(f"DocAIService initialized successfully with processor: {self.processor_name}")
        except Exception as e:
            logger.error(f"Failed to initialize DocumentProcessorServiceClient: {e}", exc_info=True)
            # Depending on desired behavior, you might re-raise or handle this to allow the app to start
            # For now, let's make it clear initialization failed.
            self.client = None
            self.processor_name = None
            logger.error("DocAIService initialization FAILED.")

    async def get_text_from_document(self, doc_metadata: dict) -> str:
        """Retrieves text from a document using its metadata (e.g., GCS URI).

        Args:
            doc_metadata (dict): A dictionary containing document metadata, 
                                 expected to have 'gcs_uri' and 'mimetype'.

        Returns:
            str: The extracted text content of the document. Returns an empty string if
                 the document has no text content (e.g., a blank image).
        
        Raises:
            ContentRetrievalError: If the content cannot be retrieved or processed due to API errors.
            ValueError: If essential metadata like GCS URI or mimetype is missing, or if service is not initialized.
        """
        logger.info(f"DocAIService: Attempting to get text for doc_metadata: {doc_metadata}")

        if not self.client or not self.processor_name:
            logger.error("DocAIService is not properly initialized. Cannot process document.")
            raise ValueError("DocAIService is not initialized.")

        gcs_uri = doc_metadata.get('gcs_uri')
        mimetype = doc_metadata.get('mimetype')

        if not gcs_uri:
            logger.error("DocAIService: Missing 'gcs_uri' in doc_metadata.")
            raise ValueError("Missing 'gcs_uri' in document metadata provided to DocAIService.")
        
        if not mimetype:
            logger.warning(f"DocAIService: Missing 'mimetype' in doc_metadata for {gcs_uri}. Attempting to proceed but this might fail or be inaccurate.")
            # Document AI can often infer mimetype, but it's better to provide it.
            # If it's critical, you could raise ValueError here.

        try:
            # Construct the GcsDocument object specifying GCS URI and MIME type
            gcs_document_source = documentai.GcsDocument(
                gcs_uri=gcs_uri, 
                mime_type=mimetype
            )
            
            # Configure the process request to use the GcsDocument source
            request = documentai.ProcessRequest(
                name=self.processor_name,
                gcs_document=gcs_document_source # Use 'gcs_document' field directly
            )

            # Use the Document AI client to process the document
            # The process_document method is synchronous, but we are in an async function.
            # For true async behavior with client libraries that don't support asyncio directly,
            # you'd typically run this in a thread pool executor.
            # However, Google's newer client libraries are moving towards better asyncio support.
            # For now, as it's a single call, direct invocation within async def is common if blocking is acceptable for this specific task.
            # If this becomes a bottleneck, consider asyncio.to_thread (Python 3.9+) or loop.run_in_executor.
            result = self.client.process_document(request=request)
            
            extracted_text = result.document.text
            logger.info(f"DocAIService: Successfully extracted text from {gcs_uri}. Text length: {len(extracted_text)}")
            
            if not extracted_text.strip():
                 logger.warning(f"DocAIService: Extracted text from {gcs_uri} is empty or whitespace only.")
            
            return extracted_text

        except Exception as e:
            logger.error(f"DocAIService: Error processing document {gcs_uri} with Document AI: {e}", exc_info=True)
            raise ContentRetrievalError(f"Failed to process document {gcs_uri} with Document AI: {e}")

    # Example of how a real method might look (simplified):
    # async def _real_get_text_from_document(self, gcs_uri: str) -> str:
    #     from google.cloud import documentai
    #     try:
    #         # Assuming self.client and self.processor_name are initialized
    #         document = documentai.types.Document(
    #             gcs_document=documentai.types.GcsDocument(gcs_uri=gcs_uri, mime_type="application/pdf")
    #         )
    #         request = documentai.types.ProcessRequest(name=self.processor_name, document=document)
    #         result = self.client.process_document(request=request)
    #         return result.document.text
    #     except Exception as e:
    #         logger.error(f"DocAIService: Error processing document {gcs_uri} with Document AI: {e}", exc_info=True)
    #         raise ContentRetrievalError(f"Failed to process document {gcs_uri} with Document AI: {e}")
