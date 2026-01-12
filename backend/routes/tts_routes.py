from flask import Blueprint, request, jsonify, current_app, send_file, g
import io
import tempfile
import base64

from backend.services.tts_service import TTSService, TTSServiceError

tts_bp = Blueprint('tts_bp', __name__, url_prefix='/api/tts')

# Helper function to get user from token (adapted for blueprint context)
def _get_user_from_token():
    """Helper function to get user data from Firebase ID token."""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None, ({'status': 'error', 'message': 'No authorization token provided'}, 401)
    
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    if not auth_svc:
        current_app.logger.error("AuthService not available in _get_user_from_token (tts_routes).")
        return None, ({'status': 'error', 'message': 'Authentication service not available'}, 503)

    try:
        success, user_data = auth_svc.verify_id_token(token)
        if not success or not user_data:
            return None, ({'status': 'error', 'message': 'Invalid or expired token'}, 401)
        return user_data, None
    except Exception as e:
        current_app.logger.error(f"Exception during token verification in tts_routes: {str(e)}")
        return None, ({'status': 'error', 'message': 'Failed to verify authorization token'}, 401)

@tts_bp.before_request
def before_request_func():
    """Authenticate user before every request to this blueprint."""
    if request.method == 'OPTIONS':
        return

    user_data, error = _get_user_from_token()
    if error:
        current_app.logger.error(f"Auth error in tts_bp.before_request for {request.endpoint}: {error[0]['message'] if isinstance(error[0], dict) else str(error[0])}")
        return jsonify(error[0]), error[1]
    
    g.user = user_data


@tts_bp.route('/synthesize', methods=['POST'])
def tts_synthesize():
    """
    Synthesizes text to speech using TTSService.
    Expects a JSON payload with a 'text' field.
    Returns audio data as base64-encoded MP3 with timepoints.
    """
    user_id = g.user.get('uid') if g.user else 'unknown'
    
    if not request.is_json:
        current_app.logger.error(f"TTS Synthesis: Request is not JSON. Content-Type: {request.headers.get('Content-Type')}")
        return jsonify(error="Request must be JSON"), 400

    data = request.get_json()
    text_to_synthesize = data.get('text')
    voice_name = data.get('voice_name')
    speaking_rate = data.get('speaking_rate')
    pitch = data.get('pitch')

    if not text_to_synthesize:
        current_app.logger.error(f"TTS Synthesis: Missing 'text' in JSON payload. Received data: {data}")
        return jsonify(error="Missing 'text' in JSON payload"), 400

    try:
        tts_service = TTSService()
        if not tts_service.is_functional():
            current_app.logger.error(f"User {user_id} attempted to use TTS, but service is not functional.")
            return jsonify(error="TTS service is not available"), 503

        tts_response = tts_service.synthesize_text(
            text=text_to_synthesize,
            voice_name=voice_name,
            speaking_rate=speaking_rate,
            pitch=pitch
        )

        if tts_response and tts_response.get("audio_content"):
            audio_content = tts_response["audio_content"]
            timepoints = tts_response.get("timepoints", [])
            encoded_audio = base64.b64encode(audio_content).decode('utf-8')

            current_app.logger.info(f"Successfully synthesized audio for user {user_id}, text: '{text_to_synthesize[:50]}...'")
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


@tts_bp.route('/voices', methods=['GET'])
def get_available_voices():
    """Get available voices for Text-to-Speech"""
    tts_tool_instance = current_app.config['TOOLS'].get('TTSTool')
    if not tts_tool_instance:
        return jsonify({'status': 'error', 'message': 'TTS Tool not available'}), 503

    language_code = request.args.get('language_code')
    success, result = tts_tool_instance.get_available_voices(language_code=language_code)
    
    if success:
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
