"""
Storage Service module for AI Tutor Application

This module handles interactions with Google Cloud Storage,
providing file upload, download and management functionality.
"""

import os
import uuid
from typing import Dict, Any, Optional, Tuple, BinaryIO
from google.cloud import storage
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class StorageService:
    """Service class for Google Cloud Storage operations"""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one Storage connection"""
        if cls._instance is None:
            cls._instance = super(StorageService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize Google Cloud Storage client"""
        # Get bucket name from environment variables
        self.bucket_name = os.getenv('GCS_BUCKET_NAME')
        if not self.bucket_name:
            raise ValueError("GCS_BUCKET_NAME not found in environment variables")
        
        # Initialize storage client
        self.storage_client = storage.Client()
        
        # Get bucket
        self.bucket = self.storage_client.bucket(self.bucket_name)
    
    def upload_file(
        self, 
        file_content: BinaryIO, 
        content_type: str, 
        user_id: str, 
        original_filename: str = None
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Upload a file to Google Cloud Storage
        
        Args:
            file_content: File content as bytes or file-like object
            content_type: MIME type of the file
            user_id: Firebase Auth UID of the file owner
            original_filename: Original filename
            
        Returns:
            Tuple of (success: bool, file_metadata: Optional[Dict])
        """
        try:
            # Generate a unique filename
            unique_id = str(uuid.uuid4())
            extension = os.path.splitext(original_filename)[1] if original_filename else ""
            safe_filename = f"{unique_id}{extension}" if extension else unique_id
            
            # Create a file path with user ID for organization
            file_path = f"{user_id}/{safe_filename}"
            
            # Create a blob and upload the file
            blob = self.bucket.blob(file_path)
            blob.upload_from_file(
                file_content,
                content_type=content_type,
                client=self.storage_client
            )
            
            # Make the blob publicly readable if needed (optional)
            # blob.make_public()
            
            # Return success with file metadata
            file_metadata = {
                'storageRef': file_path,
                'gcsUri': f"gs://{self.bucket_name}/{file_path}",
                'contentType': content_type,
                'size': blob.size,
                'originalFilename': original_filename
            }
            
            return True, file_metadata
        except Exception as e:
            print(f"Error uploading file: {e}")
            return False, None
    
    def get_file(self, file_path: str) -> Tuple[bool, Optional[bytes]]:
        """
        Get a file from Google Cloud Storage
        
        Args:
            file_path: Path to the file in GCS
            
        Returns:
            Tuple of (success: bool, file_content: Optional[bytes])
        """
        try:
            blob_name = file_path
            # If file_path is a full GCS URI, extract the object path
            prefix_to_strip = f"gs://{self.bucket.name}/"
            if file_path.startswith(prefix_to_strip):
                blob_name = file_path[len(prefix_to_strip):]
            
            # Get the blob
            blob = self.bucket.blob(blob_name)
            
            # Download the content
            content = blob.download_as_bytes()
            
            return True, content
        except Exception as e:
            print(f"Error downloading file: {e}")
            return False, None
    
    def delete_file(self, file_path: str) -> bool:
        """
        Delete a file from Google Cloud Storage
        
        Args:
            file_path: Path to the file in GCS
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            # Get the blob
            blob = self.bucket.blob(file_path)
            
            # Delete the blob
            blob.delete()
            
            return True
        except Exception as e:
            print(f"Error deleting file: {e}")
            return False
    
    def get_signed_url(self, file_path: str, expiration_minutes: int = 15) -> Optional[str]:
        """
        Generate a signed URL for temporary access to a private file
        
        Args:
            file_path: Path to the file in GCS
            expiration_minutes: URL expiration time in minutes
            
        Returns:
            Signed URL if generated successfully, None otherwise
        """
        try:
            # Get the blob
            blob = self.bucket.blob(file_path)
            
            # Generate signed URL
            url = blob.generate_signed_url(
                version="v4",
                expiration=expiration_minutes * 60,  # Convert to seconds
                method="GET"
            )
            
            return url
        except Exception as e:
            print(f"Error generating signed URL: {e}")
            return None
    
    def list_user_files(self, user_id: str, prefix: str = None) -> list:
        """
        List all files for a user, optionally filtered by prefix
        
        Args:
            user_id: Firebase Auth UID
            prefix: Optional additional prefix to filter by
            
        Returns:
            List of file metadata
        """
        try:
            # Create the full prefix
            full_prefix = f"{user_id}/"
            if prefix:
                full_prefix += prefix
            
            # List blobs with the prefix
            blobs = self.storage_client.list_blobs(
                self.bucket_name,
                prefix=full_prefix
            )
            
            # Return list of file metadata
            return [
                {
                    'storageRef': blob.name,
                    'gcsUri': f"gs://{self.bucket_name}/{blob.name}",
                    'contentType': blob.content_type,
                    'size': blob.size,
                    'updated': blob.updated
                }
                for blob in blobs
            ]
        except Exception as e:
            print(f"Error listing files: {e}")
            return []
            
    def get_public_url(self, file_path: str) -> str:
        """
        Get a public URL for a file (only works if the file is public)
        
        Args:
            file_path: Path to the file in GCS
            
        Returns:
            Public URL for the file
        """
        blob = self.bucket.blob(file_path)
        return f"https://storage.googleapis.com/{self.bucket_name}/{file_path}"
    
    def copy_file(self, source_path: str, destination_path: str) -> bool:
        """
        Copy a file within GCS
        
        Args:
            source_path: Source file path
            destination_path: Destination file path
            
        Returns:
            True if copy was successful, False otherwise
        """
        try:
            # Get the source blob
            source_blob = self.bucket.blob(source_path)
            
            # Copy to destination
            destination_blob = self.bucket.copy_blob(
                source_blob, self.bucket, destination_path
            )
            
            return True
        except Exception as e:
            print(f"Error copying file: {e}")
            return False

    def upload_string_as_file(
        self,
        content_string: str,
        content_type: str,
        user_id: str,
        base_filename: str,
        sub_folder: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Upload a string content as a file to Google Cloud Storage.

        Args:
            content_string: The string content to upload.
            content_type: MIME type of the file (e.g., 'application/json', 'text/plain').
            user_id: Firebase Auth UID of the file owner.
            base_filename: A base filename (e.g., 'layout.json', 'transcript.txt') to help construct the GCS path.

        Returns:
            Tuple of (success: bool, file_metadata: Optional[Dict])
        """
        try:
            # Generate a unique prefix for the filename to ensure uniqueness if needed,
            # or use a predictable name if base_filename is already unique per document_id.
            # For simplicity, let's assume base_filename is structured to be unique enough under user_id.
            # Example: base_filename could be f"{document_id}_layout.json"
            
            if sub_folder:
                file_path = f"{user_id}/{sub_folder}/{base_filename}"
            else:
                file_path = f"{user_id}/{base_filename}"
            
            blob = self.bucket.blob(file_path)
            blob.upload_from_string(
                content_string,
                content_type=content_type,
                client=self.storage_client
            )
            
            file_metadata = {
                'storageRef': file_path,
                'gcsUri': f"gs://{self.bucket_name}/{file_path}",
                'contentType': content_type,
                'size': len(content_string.encode('utf-8')), # Approximate size
                'originalFilename': base_filename 
            }
            
            print(f"Successfully uploaded string as file to {file_metadata['gcsUri']}")
            return True, file_metadata
        except Exception as e:
            print(f"Error uploading string as file ({base_filename}): {e}")
            return False, None

    def upload_bytes_as_file(
        self,
        content_bytes: bytes,
        content_type: str,
        user_id: str,
        base_filename: str,
        sub_folder: Optional[str] = None
    ) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Upload bytes content as a file to Google Cloud Storage.

        Args:
            content_bytes: The bytes content to upload.
            content_type: MIME type of the file (e.g., 'audio/mpeg').
            user_id: Firebase Auth UID of the file owner.
            base_filename: A base filename (e.g., 'audio.mp3') to construct the GCS path.
            sub_folder: Optional sub-folder to store the file in.

        Returns:
            Tuple of (success: bool, file_metadata: Optional[Dict])
        """
        try:
            if sub_folder:
                file_path = f"{user_id}/{sub_folder}/{base_filename}"
            else:
                file_path = f"{user_id}/{base_filename}"
            
            blob = self.bucket.blob(file_path)
            blob.upload_from_string(
                content_bytes,
                content_type=content_type
            )
            
            file_metadata = {
                'storageRef': file_path,
                'gcsUri': f"gs://{self.bucket_name}/{file_path}",
                'contentType': content_type,
                'size': len(content_bytes),
                'originalFilename': base_filename 
            }
            
            print(f"Successfully uploaded bytes as file to {file_metadata['gcsUri']}")
            return True, file_metadata
        except Exception as e:
            print(f"Error uploading bytes as file ({base_filename}): {e}")
            return False, None

    def download_file_as_string(self, gcs_uri: str) -> Optional[str]:
        """
        Download a file from GCS and return its content as a string.

        Args:
            gcs_uri: The GCS URI of the file to download (e.g., gs://bucket_name/path/to/blob).

        Returns:
            The file content as a string if successful, None otherwise.
        """
        try:
            if not gcs_uri.startswith(f"gs://{self.bucket_name}/"):
                print(f"Error: GCS URI '{gcs_uri}' does not match expected bucket '{self.bucket_name}'.")
                return None

            blob_name = gcs_uri.replace(f"gs://{self.bucket_name}/", "", 1)
            blob = self.bucket.blob(blob_name)

            if not blob.exists():
                print(f"Error: Blob '{blob_name}' not found in bucket '{self.bucket_name}'.")
                return None

            content_string = blob.download_as_text()
            print(f"Successfully downloaded string from {gcs_uri}. Length: {len(content_string)}")
            return content_string
        except Exception as e:
            print(f"Error downloading file {gcs_uri} as string: {e}")
            return None

    def delete_file_from_gcs(self, gcs_uri: str) -> bool:
        """
        Delete a file from Google Cloud Storage given its GCS URI.

        Args:
            gcs_uri: The GCS URI of the file to delete (e.g., gs://bucket_name/path/to/blob).

        Returns:
            True if deletion was successful or blob didn't exist, False otherwise.
        """
        try:
            if not gcs_uri.startswith(f"gs://{self.bucket_name}/"):
                print(f"Error: GCS URI '{gcs_uri}' does not match expected bucket '{self.bucket_name}'.")
                return False

            blob_name = gcs_uri.replace(f"gs://{self.bucket_name}/", "", 1)
            blob = self.bucket.blob(blob_name)

            if not blob.exists():
                print(f"Info: Blob '{blob_name}' not found in bucket '{self.bucket_name}'. No action taken.")
                return True # Or False, depending on desired behavior for non-existent files

            blob.delete()
            print(f"Successfully deleted blob '{blob_name}' from bucket '{self.bucket_name}'.")
            return True
        except Exception as e:
            print(f"Error deleting file {gcs_uri} from GCS: {e}")
            return False
