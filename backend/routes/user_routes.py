from flask import Blueprint, request, jsonify, current_app, g
from pydantic import BaseModel, Field, EmailStr, ValidationError, ConfigDict
from typing import Optional, Literal
from backend.decorators.auth import require_auth

user_bp = Blueprint('user_bp', __name__, url_prefix='/api/users')

# --- Pydantic Models ---

class UserPreferences(BaseModel):
    # Visual Settings
    fontSize: int = Field(default=16, ge=10, le=32)
    fontFamily: Literal['OpenDyslexic', 'Inter', 'Arial'] = 'OpenDyslexic'
    lineSpacing: float = Field(default=1.5, ge=1.0, le=3.0)
    wordSpacing: float = Field(default=1.2, ge=0.5, le=2.0)
    textColor: str = Field(default='#000000')
    backgroundColor: str = Field(default='#f8f9fa')
    highContrast: bool = False
    
    # TTS Settings
    uiTtsEnabled: bool = True
    ttsVoice: str = 'en-US-Wavenet-D'
    ttsSpeed: float = Field(default=1.0, ge=0.5, le=2.0)
    ttsPitch: float = Field(default=0.0, ge=-20.0, le=20.0)
    
    # Cloud TTS Settings (New)
    cloudTtsEnabled: Optional[bool] = False
    cloudTtsVoice: Optional[str] = 'en-US-Neural2-F'
    ttsDelay: Optional[float] = None

    # Answer Formulation Settings (New)
    answerFormulationAutoPause: Optional[bool] = False
    answerFormulationPauseDuration: Optional[float] = None
    answerFormulationSessionsCompleted: Optional[int] = 0
    answerFormulationAutoPauseSuggestionDismissed: Optional[bool] = False
    answerFormulationOnboardingCompleted: Optional[bool] = False

class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: Optional[str] = None

class UserUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    display_name: Optional[str] = Field(default=None, alias='displayName')
    preferences: Optional[UserPreferences] = None
    date_of_birth: Optional[str] = Field(default=None, alias='dateOfBirth')
    visual_impairment: Optional[bool] = Field(default=None, alias='visualImpairment')
    school_context: Optional[str] = Field(default=None, alias='schoolContext')
    adapt_to_age: Optional[bool] = Field(default=None, alias='adaptToAge')

class EmailRequest(BaseModel):
    email: EmailStr

# --- Routes ---

@user_bp.route('', methods=['POST'])
def create_user():
    """Create a new user (Auth + Firestore Profile)"""
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    firestore_svc = current_app.config['SERVICES'].get('FirestoreService')

    if not auth_svc or not firestore_svc:
        return jsonify({'status': 'error', 'message': 'Services unavailable'}), 503

    # 1. Validate Request
    try:
        data = UserCreateRequest(**request.json)
    except ValidationError as e:
        return jsonify({'status': 'error', 'message': e.errors()}), 400

    # 2. Create in Firebase Auth
    success, user_id = auth_svc.create_user(
        email=data.email,
        password=data.password,
        display_name=data.display_name
    )

    if not success:
        return jsonify({'status': 'error', 'message': 'Failed to create authentication user'}), 500

    # 3. Create in Firestore (Schema Enforcement)
    try:
        firestore_svc.create_user(user_id, {
            'email': data.email,
            'displayName': data.display_name,
            # Preferences and gamification defaults are handled by the service
        })
    except Exception as e:
        # Rollback: Delete Auth user if Firestore creation fails
        auth_svc.delete_user(user_id)
        return jsonify({'status': 'error', 'message': f'Failed to create user profile: {str(e)}'}), 500

    return jsonify({
        'status': 'success',
        'message': 'User created successfully',
        'userId': user_id
    }), 201

@user_bp.route('', methods=['DELETE'])
@require_auth
def delete_user():
    """Delete user and all associated data (Auth + Firestore + GCS)"""
    user_id = g.user_id  # Populated by @require_auth
    
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    firestore_svc = current_app.config['SERVICES'].get('FirestoreService')

    if not auth_svc or not firestore_svc:
        return jsonify({'status': 'error', 'message': 'Services unavailable'}), 503

    # 1. Delete Data (Firestore + GCS)
    data_deleted = firestore_svc.delete_user_data(user_id)
    
    if not data_deleted:
        # Log error but attempt to continue to Auth deletion to prevent "zombie" accounts
        current_app.logger.warning(f"Partial data deletion failure for user {user_id}")

    # 2. Delete Auth Account
    auth_deleted = auth_svc.delete_user(user_id)

    if not auth_deleted:
         return jsonify({'status': 'error', 'message': 'Failed to delete authentication account'}), 500

    return jsonify({'status': 'success', 'message': 'User account and data deleted'}), 200

@user_bp.route('/init', methods=['POST'])
@require_auth
def initialize_user():
    """
    Initialize user profile if it doesn't exist.
    Used primarily for Google Sign-In and legacy users.
    """
    user_id = g.user_id  # Populated by @require_auth
    user_email = g.user_email  # Also populated by @require_auth
    
    firestore_svc = current_app.config['SERVICES'].get('FirestoreService')
    auth_svc = current_app.config['SERVICES'].get('AuthService')

    if not firestore_svc:
        return jsonify({'status': 'error', 'message': 'Services unavailable'}), 503

    # Get display name from Auth service if available
    display_name = None
    if auth_svc:
        auth_user = auth_svc.get_user(user_id)
        if auth_user:
            display_name = auth_user.get('displayName')

    if not user_email:
        return jsonify({'status': 'error', 'message': 'User has no email'}), 400

    try:
        created = firestore_svc.ensure_user_profile(user_id, user_email, display_name)
        return jsonify({
            'status': 'success',
            'message': 'User initialized',
            'created': created
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error initializing user {user_id}: {e}")
        return jsonify({'status': 'error', 'message': 'Failed to initialize user'}), 500

@user_bp.route('/profile', methods=['PUT'])
@require_auth
def update_user_profile():
    """Update user profile (Preferences, Display Name, & Onboarding Data)"""
    user_id = g.user_id  # Populated by @require_auth
    
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    firestore_svc = current_app.config['SERVICES'].get('FirestoreService')

    if not auth_svc or not firestore_svc:
        return jsonify({'status': 'error', 'message': 'Services unavailable'}), 503

    # Validate Request
    try:
        current_app.logger.debug(f"update_user_profile payload: {request.json or 'None'}")
        data = UserUpdateRequest(**request.json)
    except ValidationError as e:
        current_app.logger.debug(f"Validation Error: {e.errors()}")
        return jsonify({'status': 'error', 'message': e.errors()}), 400

    # 1. Update Root Level Fields (DisplayName, Onboarding Data)
    updates = {}
    raw_data = request.json or {}
    
    # Handle Display Name
    display_name_to_update = raw_data.get('displayName')
    if not display_name_to_update and data.display_name:
         display_name_to_update = data.display_name

    if display_name_to_update:
        # Update in Auth Service as well
        auth_svc.update_user(user_id, {'display_name': display_name_to_update})
        updates['displayName'] = display_name_to_update
    
    # Handle Onboarding Fields - Explicitly using raw JSON to avoid aliasing issues
    if 'dateOfBirth' in raw_data:
        updates['dateOfBirth'] = raw_data['dateOfBirth']
    
    if 'visualImpairment' in raw_data:
        updates['visualImpairment'] = raw_data['visualImpairment']
        
    if 'schoolContext' in raw_data:
        updates['schoolContext'] = raw_data['schoolContext']
        
    if 'adaptToAge' in raw_data:
        updates['adaptToAge'] = raw_data['adaptToAge']
        
    # Apply root updates if any
    if updates:
        current_app.logger.debug(f"Applying updates for user {user_id}: {updates}")
        success = firestore_svc.update_user(user_id, updates)
        current_app.logger.debug(f"Firestore update result: {success}")
        
        # Immediate Read-Back
        updated_doc = firestore_svc.get_user(user_id)
        if updated_doc:
            current_app.logger.debug(f"Read-back verification for {user_id}: dob={updated_doc.get('dateOfBirth')}, school={updated_doc.get('schoolContext')}")
        else:
            current_app.logger.debug(f"Read-back failed! Document not found for {user_id}")

    # 2. Update Preferences (if provided)
    if data.preferences:
        # Dump Pydantic model to dict
        prefs_dict = data.preferences.model_dump(exclude_unset=True)
        firestore_svc.update_user_preferences(user_id, prefs_dict)

    return jsonify({'status': 'success', 'message': 'Profile updated'}), 200

@user_bp.route('/verify-email', methods=['POST'])
@require_auth
def generate_verify_email_link():
    """Generate email verification link for the authenticated user"""
    user_email = g.user_email  # Populated by @require_auth
    
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    if not auth_svc:
        return jsonify({'status': 'error', 'message': 'Auth service unavailable'}), 503

    if not user_email:
        return jsonify({'status': 'error', 'message': 'User has no email'}), 400

    link = auth_svc.generate_email_verification_link(user_email)
    if link:
        return jsonify({'status': 'success', 'link': link}), 200
    else:
        return jsonify({'status': 'error', 'message': 'Failed to generate link'}), 500

@user_bp.route('/profile', methods=['GET'])
@require_auth
def get_user_profile():
    """Get user profile data"""
    user_id = g.user_id  # Populated by @require_auth
    
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    firestore_svc = current_app.config['SERVICES'].get('FirestoreService')

    if not auth_svc or not firestore_svc:
        return jsonify({'status': 'error', 'message': 'Authentication or Firestore service not available'}), 503
    
    # Get user profile from Firestore
    try:
        firestore_user = firestore_svc.get_user(user_id)
        if firestore_user:
            # Get user info from Firebase Auth for the latest display name
            auth_user = auth_svc.get_user(user_id)
            
            # Combine data, with Auth data taking precedence for displayName
            if auth_user and auth_user.get('displayName'):
                firestore_user['displayName'] = auth_user['displayName']
            
            return jsonify({
                'status': 'success',
                'data': firestore_user
            })
        else:
            # If no Firestore profile exists, use Firebase Auth data only
            auth_user = auth_svc.get_user(user_id)
            if auth_user:
                return jsonify({
                    'status': 'success',
                    'data': auth_user
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'User profile not found'
                }), 404
    except Exception as e:
        current_app.logger.error(f"Error retrieving user profile: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve user profile'
        }), 500
