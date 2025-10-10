"""
Authentication Service module for AI Tutor Application

This module handles Firebase Authentication verification and management,
providing secure authentication for the AI Tutor application.
"""

import os
import time
from datetime import datetime
from typing import Dict, Any, Optional, Tuple
import firebase_admin
from firebase_admin import auth, credentials
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AuthService:
    """Service class for Firebase Authentication operations"""
    
    _instance = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one Auth connection"""
        if cls._instance is None:
            cls._instance = super(AuthService, cls).__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        """Initialize Firebase Admin SDK with credentials from environment variables"""
        firebase_service_account_key_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_KEY_PATH')
        if not firebase_service_account_key_path:
            raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY_PATH not found in environment variables")
        
        # Initialize Firebase Admin SDK if not already initialized
        if not firebase_admin._apps:
            cred = credentials.Certificate(firebase_service_account_key_path)
            firebase_admin.initialize_app(cred)
    
    def verify_id_token(self, id_token: str) -> Tuple[bool, Optional[Dict[str, Any]]]:
        """
        Verify Firebase ID token and extract user information
        
        Args:
            id_token: Firebase ID token to verify
            
        Returns:
            Tuple of (success: bool, user_data: Optional[Dict])
        """
        try:
            # Print first few chars of token for debugging
            token_preview = id_token[:20] + '...' if len(id_token) > 20 else id_token
            print(f"Verifying token: {token_preview}")
            
            # Add a clock_skew_seconds parameter to handle minor time differences between systems
            # This helps with 'Token used too early' errors due to client/server clock differences
            # Values between 5-60 seconds are reasonable for most applications
            clock_skew_seconds = 60  # Allow up to 1 minute of clock skew
            
            # Verify the ID token with check_revoked=True and the clock tolerance
            decoded_token = auth.verify_id_token(
                id_token, 
                check_revoked=True,
                clock_skew_seconds=clock_skew_seconds
            )
        
            # Log successful verification
            expiry_timestamp = decoded_token['exp']
            print(f"Token verified successfully. Expires at: {datetime.fromtimestamp(expiry_timestamp)}")
            
            # Check if the token is expired
            if time.time() >= expiry_timestamp:
                print(f"Token is expired. Current time: {datetime.now()}, Expiry: {datetime.fromtimestamp(expiry_timestamp)}")
                return False, None
            
            # Extract user information
            user_id = decoded_token.get('uid')
            user_data = {
                'uid': user_id,
                'email': decoded_token.get('email'),
                'emailVerified': decoded_token.get('email_verified', False),
                'name': decoded_token.get('name'),
                'pictureUrl': decoded_token.get('picture')
            }
            
            print(f"Token verified for user: {user_data['email']}")
            return True, user_data
        except auth.InvalidIdTokenError as e:
            print(f"Invalid ID token: {e}")
            return False, None
        except auth.ExpiredIdTokenError as e:
            print(f"Expired ID token: {e}")
            return False, None
        except auth.RevokedIdTokenError as e:
            print(f"Revoked ID token: {e}")
            return False, None
        except auth.CertificateFetchError as e:
            print(f"Certificate fetch error: {e}")
            return False, None
        except Exception as e:
            print(f"Unexpected error verifying token: {e}")
            return False, None
    
    def get_user(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a user from Firebase Auth by their UID
        
        Args:
            user_id: Firebase Auth UID
            
        Returns:
            User data if found, None otherwise
        """
        try:
            user = auth.get_user(user_id)
            user_data = {
                'uid': user.uid,
                'email': user.email,
                'emailVerified': user.email_verified,
                'displayName': user.display_name,
                'photoURL': user.photo_url,
                'disabled': user.disabled,
                'creationTime': user.user_metadata.creation_timestamp,
                'lastSignInTime': user.user_metadata.last_sign_in_timestamp
            }
            return user_data
        except Exception as e:
            print(f"Error getting user: {e}")
            return None
    
    def create_user(self, email: str, password: str, display_name: str = None) -> Tuple[bool, Optional[str]]:
        """
        Create a new user in Firebase Auth
        
        Args:
            email: User email
            password: User password
            display_name: Optional display name
            
        Returns:
            Tuple of (success: bool, user_id: Optional[str])
        """
        try:
            user_properties = {
                'email': email,
                'password': password,
                'email_verified': False
            }
            
            if display_name:
                user_properties['display_name'] = display_name
            
            user = auth.create_user(**user_properties)
            return True, user.uid
        except Exception as e:
            print(f"Error creating user: {e}")
            return False, None
    
    def update_user(self, user_id: str, user_data: Dict[str, Any]) -> bool:
        """
        Update a user in Firebase Auth
        
        Args:
            user_id: Firebase Auth UID
            user_data: User data to update
            
        Returns:
            True if update was successful, False otherwise
        """
        try:
            auth.update_user(user_id, **user_data)
            return True
        except Exception as e:
            print(f"Error updating user: {e}")
            return False
    
    def delete_user(self, user_id: str) -> bool:
        """
        Delete a user from Firebase Auth
        
        Args:
            user_id: Firebase Auth UID
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            auth.delete_user(user_id)
            return True
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False
    
    def generate_email_verification_link(self, email: str) -> Optional[str]:
        """
        Generate an email verification link
        
        Args:
            email: User email
            
        Returns:
            Verification link if generated successfully, None otherwise
        """
        try:
            link = auth.generate_email_verification_link(email)
            return link
        except Exception as e:
            print(f"Error generating email verification link: {e}")
            return None
    
    def generate_password_reset_link(self, email: str) -> Optional[str]:
        """
        Generate a password reset link
        
        Args:
            email: User email
            
        Returns:
            Password reset link if generated successfully, None otherwise
        """
        try:
            link = auth.generate_password_reset_link(email)
            return link
        except Exception as e:
            print(f"Error generating password reset link: {e}")
            return None
