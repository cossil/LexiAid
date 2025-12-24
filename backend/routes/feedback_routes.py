from flask import Blueprint, request, jsonify, current_app, g
from backend.decorators import require_auth

feedback_bp = Blueprint('feedback_bp', __name__)


def _validate_payload(payload: dict) -> tuple[dict, tuple[dict, int] | None]:
    """Validate payload and normalize keys."""
    feedback_type = payload.get('type')
    description = (payload.get('description') or '').strip()
    browser_info = payload.get('browser_info') or payload.get('browserInfo')

    errors = {}
    if not feedback_type:
        errors['type'] = 'Feedback type is required.'
    if not description:
        errors['description'] = 'Please provide a description.'
    if not browser_info:
        errors['browser_info'] = 'Browser information is required.'

    if errors:
        return {}, ({'status': 'error', 'message': 'Invalid payload', 'errors': errors}, 400)

    return {
        'type': feedback_type,
        'description': description,
        'browser_info': browser_info
    }, None


@feedback_bp.route('', methods=['POST'])
@require_auth
def submit_feedback():
    payload = request.get_json(silent=True) or {}
    normalized_payload, error = _validate_payload(payload)
    if error:
        return jsonify(error[0]), error[1]

    firestore_service = current_app.config['FIRESTORE_SERVICE']
    if not firestore_service:
        current_app.logger.error('Firestore service unavailable when submitting feedback.')
        return jsonify({'status': 'error', 'message': 'Service unavailable'}), 503

    feedback_doc = {
        **normalized_payload,
        'user_id': g.user_id,
        'email': getattr(g, 'user_email', None),
        'status': 'new'
    }

    try:
        doc_id = firestore_service.save_feedback(feedback_doc)
    except ValueError as exc:
        return jsonify({'status': 'error', 'message': str(exc)}), 400
    except Exception as exc:  # pragma: no cover - defensive logging
        current_app.logger.error('Failed to save feedback: %s', exc)
        return jsonify({'status': 'error', 'message': 'Failed to save feedback'}), 500

    return jsonify({'status': 'success', 'feedback_id': doc_id}), 201
