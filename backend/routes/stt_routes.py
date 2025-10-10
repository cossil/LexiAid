# Speech-to-Text related routes will be added here.
import io
from flask import Blueprint, request, jsonify, current_app

stt_bp = Blueprint('stt_bp', __name__)

# Helper function to get user from token (adapted for blueprint context)
def _get_user_from_token():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return None, ({'status': 'error', 'message': 'No authorization token provided'}, 401)

    # Access services via current_app context
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    if not auth_svc:
        return None, ({'status': 'error', 'message': 'Auth service not available'}, 503)

    try:
        success, user_data = auth_svc.verify_id_token(token)
        if not success or not user_data:
            return None, ({'status': 'error', 'message': 'Invalid authorization token'}, 401)
        return user_data, None
    except Exception as e:
        print(f"Error verifying token in stt_routes helper: {e}")
        return None, ({'status': 'error', 'message': 'Failed to verify authorization token'}, 401)

@stt_bp.route('/transcribe', methods=['POST']) # Changed route from /api/stt/transcribe
def transcribe_audio():
    """Transcribe audio using Google Cloud Speech-to-Text"""
    user_data, error = _get_user_from_token()
    if error:
        return jsonify(error[0]), error[1]

    stt_tool_instance = current_app.config['TOOLS'].get('STTTool')
    if not stt_tool_instance:
         return jsonify({'status': 'error', 'message': 'STT Tool not available'}), 503

    try:
        # Check if the request contains audio data
        if 'file' not in request.files:
            return jsonify({'status': 'error', 'message': 'No audio file part in the request'}), 400

        audio_file = request.files['file']

        # Read audio data
        audio_data = audio_file.read()

        # Determine audio format (simple check based on filename extension)
        filename = audio_file.filename
        audio_format = None
        if filename.lower().endswith('.wav'):
            audio_format = 'audio/wav'
        elif filename.lower().endswith('.mp3'):
            audio_format = 'audio/mp3'
        elif filename.lower().endswith('.flac'):
             audio_format = 'audio/flac'
        elif filename.lower().endswith('.ogg'):
            # Common container for Opus, Vorbis. 
            # Assuming Opus as OGG_OPUS is a common Speech-to-Text encoding.
            audio_format = 'audio/ogg' # STTTool._determine_audio_config handles mapping to OGG_OPUS
        # Add more formats as needed...
        else:
             return jsonify({'status': 'error', 'message': 'Unsupported audio file format based on extension'}), 400


        if not audio_data:
            return jsonify({'status': 'error', 'message': 'Audio file is empty'}), 400

        # Get language code from query parameters (optional)
        # TODO: Consider getting language from user profile or document context
        language_code = request.args.get('language_code', 'en-US')

        # Transcribe the audio using the STT tool
        success, result = stt_tool_instance.transcribe_audio(
            audio_data=audio_data,
            audio_format=audio_format,
            language_code=language_code
        )

        if success:
            transcript_from_result = None # Initialize
            try:
                transcript_from_result = result['transcript'] # Direct access
            except KeyError:
                pass
            # Return transcription result
            return jsonify({
                'status': 'success',
                'transcription': transcript_from_result if transcript_from_result is not None else '',
                'confidence': result.get('confidence', 0.0),
                'language_code': result.get('language_code', language_code)
            })
        else:
            # Return error message
            return jsonify({
                'status': 'error',
                'message': result.get('error', 'Failed to transcribe audio')
            }), 500

    except Exception as e:
        print(f"Error in STT API: {e}")
        return jsonify({
            'status': 'error',
            'message': f'Error transcribing audio: {str(e)}'
        }), 500


@stt_bp.route('/languages', methods=['GET']) # Changed route from /api/stt/languages
def get_stt_languages():
    """Get available languages for Speech-to-Text"""
    user_data, error = _get_user_from_token()
    if error:
        return jsonify(error[0]), error[1]

    stt_tool_instance = current_app.config['TOOLS'].get('STTTool')
    if not stt_tool_instance:
         return jsonify({'status': 'error', 'message': 'STT Tool not available'}), 503

    # Get available languages using the STT Tool
    success, result = stt_tool_instance.get_supported_languages()

    if success:
        # 'result' is directly the list of languages if success is True
        languages = result 
        if not isinstance(languages, list):
            # Handle case where tool might not return a list as expected
             print(f"STT Tool get_supported_languages did not return a list. Got: {type(languages)}")
             return jsonify({'status':'error', 'message': 'STT service returned unexpected language format'}), 500

        return jsonify({
            'status': 'success',
            'languages': languages
        })
    else:
        return jsonify({
            'status': 'error',
            'message': result.get('error', 'Failed to retrieve available languages')
        }), 500