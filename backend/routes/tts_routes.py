from flask import Blueprint, request, jsonify, current_app, send_file, g
import io
import tempfile
import base64

# Assuming services are initialized elsewhere and passed or imported
# from services import TTSService, AuthService

# Placeholder for actual service instances
tts_service = None
auth_service = None

tts_bp = Blueprint('tts_bp', __name__, url_prefix='/api/tts')

# Helper function to get user from token (adapted for blueprint context)
def _get_user_from_token():
    """Helper function to get user data from Firebase ID token."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None, ({'status': 'error', 'message': 'No authorization token provided'}, 401)
    
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    if not auth_svc:
        # Log this critical error on the server
        current_app.logger.error("AuthService not available in _get_user_from_token (tts_routes).")
        return None, ({'status': 'error', 'message': 'Authentication service not available'}, 503)

    try:
        success, user_data = auth_svc.verify_id_token(token)
        if not success or not user_data:
            return None, ({'status': 'error', 'message': 'Invalid or expired token'}, 401)
        return user_data, None
    except Exception as e:
        # Log the exception details
        current_app.logger.error(f"Exception during token verification in tts_routes: {str(e)}")
        # Consider if more specific error handling or logging is needed here
        return None, ({'status': 'error', 'message': 'Failed to verify authorization token'}, 401)

@tts_bp.before_request
def before_request_func():
    """Authenticate user before every request to this blueprint, except for specific routes."""
    # Skip auth for OPTIONS requests
    if request.method == 'OPTIONS':
        return

    user_data, error = _get_user_from_token()
    if error:
        current_app.logger.error(f"Auth error in tts_bp.before_request for {request.endpoint}: {error[0]['message'] if isinstance(error[0], dict) else str(error[0])}")
        return jsonify(error[0]), error[1]
    
    g.user = user_data



@tts_bp.route('/voices', methods=['GET'])
def get_available_voices():
    """Get available voices for Text-to-Speech"""
    user_data, error = _get_user_from_token()
    if error:
        return jsonify(error[0]), error[1]

    tts_tool_instance = current_app.config['TOOLS'].get('TTSTool')
    if not tts_tool_instance:
         return jsonify({'status': 'error', 'message': 'TTS Tool not available'}), 503

    language_code = request.args.get('language_code')
    
    # Get available voices using the TTS tool
    success, result = tts_tool_instance.get_available_voices(language_code=language_code)
    
    if success:
        # Assuming result is the list of voices directly
        voices = result 
        if voices is None:
             raise ValueError("TTS Tool returned None for voices list")
             
        return jsonify({
            'status': 'success',
            'voices': voices
        })
    else:
        return jsonify({
            'status': 'error',
            'message': result.get('error', 'Failed to retrieve available voices')
        }), 500

# TODO: Add initialization logic to register this blueprint with the Flask app
# and inject dependencies (tts_service, auth_service)
