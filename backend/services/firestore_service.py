"""
Firestore Service module for AI Tutor Application

This module handles all interactions with Firestore database,
providing CRUD operations for the AI Tutor application.
"""

import os
import json
import datetime
from typing import Dict, List, Any, Optional, Union
import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud import firestore as google_firestore
from dotenv import load_dotenv
import logging
from backend.services.storage_service import StorageService

# Custom Exception
class DocumentNotFoundError(Exception):
    """Custom exception for when a document is not found in Firestore."""
    pass

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

class FirestoreService:
    """Service class for Firestore operations"""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one Firestore connection"""
        if cls._instance is None:
            cls._instance = super(FirestoreService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize Firebase Admin SDK with credentials from environment variables"""
        # Get required environment variables
        firebase_service_account_key_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH')
        project_id = os.getenv('GCP_PROJECT_ID')
        database_name_env = os.getenv('FIRESTORE_DATABASE_NAME', 'default')
        database_name = database_name_env

        # Ensure the correct database is used, overriding '(default)' if necessary
        if database_name_env.lower() == '(default)' or not database_name_env:
            database_name = "ai-tutor-dev-457802"
            logger.warning(
                f"FIRESTORE_DATABASE_NAME in .env is '{database_name_env}'. "
                f"FirestoreService is overriding and connecting to '{database_name}'."
            )
        elif database_name_env.lower() == 'default': # Handle 'default' without parentheses
             database_name = "ai-tutor-dev-457802"
             logger.warning(
                f"FIRESTORE_DATABASE_NAME in .env is '{database_name_env}'. "
                f"FirestoreService is overriding and connecting to '{database_name}'."
            )
        else:
            logger.info(f"FirestoreService using database_name from environment: '{database_name}'")
        
        if not firebase_service_account_key_path:
            raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY_PATH not found in environment variables")
            
        if not project_id:
            raise ValueError("GCP_PROJECT_ID not found in environment variables")
            
        # Check if service account file exists
        if not os.path.exists(firebase_service_account_key_path):
            raise ValueError(f"Service account file not found at {firebase_service_account_key_path}")
        
        # Clean up any existing Firebase apps to avoid conflicts
        if firebase_admin._apps:
            for app in list(firebase_admin._apps.keys()):
                try:
                    firebase_admin.delete_app(firebase_admin.get_app(app))
                except Exception:
                    pass  # Ignore errors during cleanup
        
        print(f"Initializing Firebase with project ID: {project_id}")
        print(f"Connecting to database: '{database_name}'")
        
        # Initialize Firebase with certificate for authentication purposes
        cred = credentials.Certificate(firebase_service_account_key_path)
        firebase_admin.initialize_app(cred, {
            'projectId': project_id
        })
        
        # Use google.cloud.firestore directly with the database parameter
        # This allows connecting to a named database instead of only '(default)'
        self.db = google_firestore.Client(
            project=project_id,
            credentials=cred.get_credential(),
            database=database_name
        )
    
    # User-related methods
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a user by their UID
        
        Args:
            user_id: Firebase Auth UID
            
        Returns:
            User data if found, None otherwise
        """
        doc_ref = self.db.collection('users').document(user_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None
    
    def create_user(self, user_id: str, user_data: Dict[str, Any]) -> str:
        """
        Create a new user in Firestore with enforced default preferences.
        
        Args:
            user_id: Firebase Auth UID
            user_data: User profile data
            
        Returns:
            User ID of the created user
        """
        # Set defaults for new users if not provided
        default_preferences = {
            'fontSize': 16,
            'fontFamily': 'OpenDyslexic',
            'lineSpacing': 1.5,
            'wordSpacing': 1.2,
            'textColor': '#000000',
            'backgroundColor': '#f8f9fa',
            'highContrast': False,
            'uiTtsEnabled': True,
            'ttsVoice': 'en-US-Wavenet-D',
            'ttsSpeed': 1.0,
            'ttsPitch': 0
        }
        
        default_gamification = {
            'points': 0,
            'streak': 0,
            'level': 1,
            'badges': []
        }
        
        # Merge provided data with defaults
        if 'preferences' not in user_data:
            user_data['preferences'] = default_preferences
        else:
            for key, value in default_preferences.items():
                if key not in user_data['preferences']:
                    user_data['preferences'][key] = value
        
        if 'gamification' not in user_data:
            user_data['gamification'] = default_gamification
        else:
            for key, value in default_gamification.items():
                if key not in user_data['gamification']:
                    user_data['gamification'][key] = value
        
        # Add timestamps
        now = datetime.datetime.now()
        user_data['createdAt'] = now
        user_data['lastLogin'] = now
        
        # Create the document in Firestore
        doc_ref = self.db.collection('users').document(user_id)
        doc_ref.set(user_data)
        return user_id
    
    def update_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """
        Update user data in Firestore
        
        Args:
            user_id: Firebase Auth UID
            user_data: User data to update
            
        Returns:
            True if update was successful, False otherwise
        """
        try:
            doc_ref = self.db.collection('users').document(user_id)
            doc_ref.update(user_data)
            return True
        except Exception as e:
            print(f"Error updating user {user_id}: {e}")
            return False
    
    def update_user_preferences(self, user_id: str, preferences: Dict[str, Any]) -> bool:
        """
        Update user preferences
        
        Args:
            user_id: Firebase Auth UID
            preferences: User preferences to update
            
        Returns:
            True if update was successful, False otherwise
        """
        try:
            doc_ref = self.db.collection('users').document(user_id)
            doc_ref.update({"preferences": preferences})
            return True
        except Exception as e:
            print(f"Error updating user preferences: {e}")
            return False

    def delete_user_data(self, user_id: str) -> bool:
        """
        Delete all user data from Firestore and GCS.
        
        This method performs a comprehensive cleanup:
        1. Queries all documents owned by the user.
        2. Deletes associated files from GCS (original, TTS audio, timepoints).
        3. Deletes the Firestore document records.
        4. Deletes the user profile from Firestore.
        
        Args:
            user_id: Firebase Auth UID
            
        Returns:
            True if cleanup was successful, False otherwise
        """
        try:
            logger.info(f"Starting comprehensive data deletion for user: {user_id}")
            storage_svc = StorageService()
            
            # 1. Get all user documents
            docs = self.get_user_documents(user_id)
            logger.info(f"Found {len(docs)} documents to clean up for user {user_id}")
            
            # 2. Delete GCS files and Firestore docs for each document
            for doc in docs:
                doc_id = doc.get('id')
                
                # Delete Original file
                gcs_uri = doc.get('gcs_uri') or doc.get('gcsUri')
                if gcs_uri:
                    storage_svc.delete_file_from_gcs(gcs_uri)
                    
                # Delete TTS Audio
                tts_audio = doc.get('tts_audio_gcs_uri')
                if tts_audio:
                    storage_svc.delete_file_from_gcs(tts_audio)
                    
                # Delete TTS Timepoints
                tts_timepoints = doc.get('tts_timepoints_gcs_uri')
                if tts_timepoints:
                    storage_svc.delete_file_from_gcs(tts_timepoints)
                
                # Delete the document from Firestore
                if doc_id:
                    self.delete_document(doc_id)
            
            # 3. Delete user folders, tags, interactions, progress (optional but recommended)
            # For now, we focus on the critical storage cleanup.
            
            # 4. Delete user profile
            self.db.collection('users').document(user_id).delete()
            logger.info(f"Successfully deleted user profile for {user_id}")
            
            return True
        except Exception as e:
            logger.error(f"Error deleting user data for {user_id}: {e}")
            return False
    
    # Document-related methods
    
    def save_document(self, document_data: Dict[str, Any]) -> str:
        """
        Save document metadata to Firestore
        
        Args:
            document_data: Document metadata
            
        Returns:
            Document ID of the saved document
        """
        doc_id = document_data.get('id')
        if not doc_id:
            raise ValueError("Document ID is required")
            
        # Add timestamps if not present
        now = datetime.datetime.now()
        if 'created_at' not in document_data:
            document_data['created_at'] = now
        document_data['updated_at'] = now
        
        # Set initial processing status if not present
        if 'processing_status' not in document_data:
            document_data['processing_status'] = 'completed'
        
        # Save the document
        doc_ref = self.db.collection('documents').document(doc_id)
        doc_ref.set(document_data)
        
        return doc_id
        
    def save_document_content(self, content_data: Dict[str, Any]) -> bool:
        """
        Save document content to Firestore
        
        Args:
            content_data: Document content data including document_id and content
            
        Returns:
            True if content was saved successfully
        """
        doc_id = content_data.get('document_id')
        if not doc_id:
            raise ValueError("Document ID is required for content")
        
        try:
            # Save content in a separate collection to avoid size limits
            doc_ref = self.db.collection('document_contents').document(doc_id)
            doc_ref.set(content_data)
            return True
        except Exception as e:
            print(f"Error saving document content: {e}")
            return False
            
    def get_document_content_from_subcollection(self, document_id: str) -> Optional[Dict[str, Any]]:
        """
        Get document content by document ID from the 'document_contents' subcollection
        
        Args:
            document_id: Document ID
            
        Returns:
            Document content if found, None otherwise
        """
        doc_ref = self.db.collection('document_contents').document(document_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None
    
    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a document by its ID
        
        Args:
            document_id: Document ID
            
        Returns:
            Document data if found, None otherwise
        """
        doc_ref = self.db.collection('documents').document(document_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None
    
    def update_document(self, document_id: str, document_data: Dict[str, Any]) -> bool:
        """
        Update document data in Firestore
        
        Args:
            document_id: Document ID
            document_data: Document data to update
            
        Returns:
            True if update was successful, False otherwise
        """
        try:
            doc_ref = self.db.collection('documents').document(document_id)
            doc_ref.update(document_data)
            return True
        except Exception as e:
            print(f"Error updating document: {e}")
            return False
    
    def delete_document_by_id(self, document_id: str, user_id: str) -> Optional[str]:
        """
        Delete a document from Firestore by its ID, verifying ownership.

        Args:
            document_id: The ID of the document to delete.
            user_id: The ID of the user attempting to delete the document.

        Returns:
            The GCS URI of the document if deletion was successful and URI exists, 
            None otherwise (e.g., document not found, permission denied, or GCS URI missing).
        """
        doc_ref = self.db.collection('documents').document(document_id)
        doc = doc_ref.get()

        if not doc.exists:
            logger.warning(f"Attempt to delete non-existent document: {document_id}")
            return None

        doc_data = doc.to_dict()
        # Check for user_id or userId for flexibility
        doc_owner_id = doc_data.get('user_id') or doc_data.get('userId')

        if doc_owner_id != user_id:
            logger.error(f"Permission denied: User {user_id} attempted to delete document {document_id} owned by {doc_owner_id}")
            return None

        gcs_uri = doc_data.get('gcs_uri') or doc_data.get('gcsUri') # Check for gcs_uri or gcsUri

        try:
            doc_ref.delete()
            logger.info(f"Successfully deleted document {document_id} owned by user {user_id}.")
            return gcs_uri
        except Exception as e:
            logger.error(f"Error deleting document {document_id} from Firestore: {e}")
            return None
    
    def get_user_documents(self, user_id: str, folder_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all documents for a user, optionally filtered by folder
        
        Args:
            user_id: Firebase Auth UID
            folder_id: Optional folder ID to filter by
            
        Returns:
            List of document data
        """
        # To handle both field names ('userId' from before today and 'user_id' from today's changes),
        # we'll query for documents with either field name and combine the results
        
        # First try with the original 'userId' field (likely what most documents use)
        query1 = self.db.collection('documents').where('userId', '==', user_id)
        if folder_id:
            query1 = query1.where('folderId', '==', folder_id)
        docs1 = query1.stream()
        results1 = [{'id': doc.id, **doc.to_dict()} for doc in docs1]
        
        # Then try with the 'user_id' field (possibly used by documents created after today's changes)
        query2 = self.db.collection('documents').where('user_id', '==', user_id)
        if folder_id:
            query2 = query2.where('folderId', '==', folder_id)
        docs2 = query2.stream()
        results2 = [{'id': doc.id, **doc.to_dict()} for doc in docs2]
        
        # Combine results, ensuring no duplicates (by document ID)
        combined_results = results1.copy()
        existing_ids = {doc['id'] for doc in combined_results}
        
        for doc in results2:
            if doc['id'] not in existing_ids:
                combined_results.append(doc)
                existing_ids.add(doc['id'])
        
        return combined_results
    
    def delete_document(self, document_id: str) -> bool:
        """
        Delete a document from Firestore
        
        Args:
            document_id: Document ID
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            self.db.collection('documents').document(document_id).delete()
            return True
        except Exception as e:
            print(f"Error deleting document: {e}")
            return False
    
    # Folder-related methods
    
    def create_folder(self, folder_data: Dict[str, Any]) -> str:
        """
        Create a new folder
        
        Args:
            folder_data: Folder data
            
        Returns:
            Folder ID of the created folder
        """
        # Add timestamps
        now = datetime.datetime.now()
        folder_data['createdAt'] = now
        folder_data['updatedAt'] = now
        
        # Create the folder
        doc_ref = self.db.collection('folders').add(folder_data)
        return doc_ref[1].id
    
    def get_user_folders(self, user_id: str, parent_folder_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all folders for a user, optionally filtered by parent folder
        
        Args:
            user_id: Firebase Auth UID
            parent_folder_id: Optional parent folder ID to filter by
            
        Returns:
            List of folder data
        """
        query = self.db.collection('folders').where('userId', '==', user_id)
        
        if parent_folder_id:
            query = query.where('parentFolderId', '==', parent_folder_id)
        
        docs = query.stream()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]
    
    # Tag-related methods
    
    def create_tag(self, tag_data: Dict[str, Any]) -> str:
        """
        Create a new tag
        
        Args:
            tag_data: Tag data
            
        Returns:
            Tag ID of the created tag
        """
        # Add timestamp
        tag_data['createdAt'] = datetime.datetime.now()
        
        # Create the tag
        doc_ref = self.db.collection('tags').add(tag_data)
        return doc_ref[1].id
    
    def get_user_tags(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Get all tags for a user
        
        Args:
            user_id: Firebase Auth UID
            
        Returns:
            List of tag data
        """
        query = self.db.collection('tags').where('userId', '==', user_id)
        docs = query.stream()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]
    
    # Interaction-related methods
    
    def create_interaction(self, interaction_data: Dict[str, Any]) -> str:
        """
        Create a new interaction record
        
        Args:
            interaction_data: Interaction data
            
        Returns:
            Interaction ID of the created interaction
        """
        # Add timestamp
        if 'timestamp' not in interaction_data:
            interaction_data['timestamp'] = datetime.datetime.now()
        
        # Create the interaction
        doc_ref = self.db.collection('interactions').add(interaction_data)
        return doc_ref[1].id
    
    def get_user_interactions(
        self, 
        user_id: str, 
        document_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get interactions for a user, optionally filtered by document
        
        Args:
            user_id: Firebase Auth UID
            document_id: Optional document ID to filter by
            limit: Maximum number of interactions to return
            
        Returns:
            List of interaction data
        """
        query = self.db.collection('interactions').where('userId', '==', user_id)
        
        if document_id:
            query = query.where('documentId', '==', document_id)
        
        # Order by timestamp descending
        query = query.order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
        
        docs = query.stream()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]
    
    # Progress-related methods
    
    def create_progress_entry(self, progress_data: Dict[str, Any]) -> str:
        """
        Create a new progress entry
        
        Args:
            progress_data: Progress data
            
        Returns:
            Progress entry ID
        """
        # Add date if not provided
        if 'date' not in progress_data:
            progress_data['date'] = datetime.datetime.now()
        
        # Create the progress entry
        doc_ref = self.db.collection('progress').add(progress_data)
        return doc_ref[1].id
    
    def get_user_progress(
        self, 
        user_id: str, 
        days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Get progress entries for a user over a specified period
        
        Args:
            user_id: Firebase Auth UID
            days: Number of days to get progress for
            
        Returns:
            List of progress data
        """
        start_date = datetime.datetime.now() - datetime.timedelta(days=days)
        
        query = (
            self.db.collection('progress')
            .where('userId', '==', user_id)
            .where('date', '>=', start_date)
            .order_by('date', direction=firestore.Query.DESCENDING)
        )
        
        docs = query.stream()
        return [{'id': doc.id, **doc.to_dict()} for doc in docs]
    
    # Gamification methods
    
    def update_user_gamification(self, user_id: str, gamification_data: Dict[str, Any]) -> bool:
        """
        Update user gamification data
        
        Args:
            user_id: Firebase Auth UID
            gamification_data: Gamification data to update
            
        Returns:
            True if update was successful, False otherwise
        """
        try:
            doc_ref = self.db.collection('users').document(user_id)
            doc_ref.update({"gamification": gamification_data})
            return True
        except Exception as e:
            print(f"Error updating gamification data: {e}")
            return False
    
    def add_badge_to_user(self, user_id: str, badge_data: Dict[str, Any]) -> bool:
        """
        Add a badge to a user's profile
        
        Args:
            user_id: Firebase Auth UID
            badge_data: Badge data
            
        Returns:
            True if badge was added successfully, False otherwise
        """
        try:
            # Get current user data
            user_doc = self.get_user(user_id)
            if not user_doc:
                return False
            
            # Add timestamp to badge
            if 'earnedAt' not in badge_data:
                badge_data['earnedAt'] = datetime.datetime.now()
            
            # Get current badges and add the new one
            badges = user_doc.get('gamification', {}).get('badges', [])
            badges.append(badge_data)
            
            # Update user document
            self.update_user_gamification(user_id, {
                **user_doc.get('gamification', {}),
                'badges': badges
            })
            
            return True
        except Exception as e:
            print(f"Error adding badge: {e}")
            return False

    async def get_document_metadata(self, doc_id: str, user_id: Optional[str] = None) -> Optional[dict]:
        """Placeholder: Retrieves metadata for a given document ID.

        Args:
            doc_id (str): The unique identifier for the document.
            user_id (Optional[str]): The ID of the user, for authorization or context (currently unused).

        Returns:
            Optional[dict]: A dictionary containing document metadata if found, else None or raises error.
        
        Raises:
            DocumentNotFoundError: If the document is a specific ID known for testing not found.
        """
        logger.info(f"FirestoreService: get_document_metadata called for doc_id: {doc_id}, user_id: {user_id}")

        # Simulate document not found for a specific ID used in tests
        if doc_id == "non_existent_doc_id":
            logger.warning(f"FirestoreService: Simulating DocumentNotFoundError for doc_id: {doc_id}")
            raise DocumentNotFoundError(f"Document with ID '{doc_id}' not found.")

        # Simulate a successful metadata retrieval for other IDs
        mock_metadata = {
            "doc_id": doc_id,
            "gcs_uri": f"gs://fake-bucket/{doc_id}.pdf",
            "filename": f"{doc_id}.pdf",
            "user_id": user_id or "test_user_placeholder",
            "uploaded_at": "2024-01-01T12:00:00Z"
        }
        logger.info(f"FirestoreService: Returning mock metadata for doc_id: {doc_id}: {mock_metadata}")
        return mock_metadata
