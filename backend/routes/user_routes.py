from flask import Blueprint, request, jsonify, current_app

user_bp = Blueprint('user_bp', __name__, url_prefix='/api/users')

@user_bp.route('/profile', methods=['GET'])
def get_user_profile():
    """Get user profile data"""
    # Verify the Firebase ID token
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({
            'status': 'error',
            'message': 'No authorization token provided'
        }), 401
        
    auth_svc = current_app.config['SERVICES'].get('AuthService')
    firestore_svc = current_app.config['SERVICES'].get('FirestoreService')

    if not auth_svc or not firestore_svc:
        return jsonify({'status': 'error', 'message': 'Authentication or Firestore service not available'}), 503

    # Verify token and get user ID using verify_id_token method
    try:
        success, user_data = auth_svc.verify_id_token(token)
        if not success or not user_data:
            return jsonify({
                'status': 'error',
                'message': 'Invalid authorization token'
            }), 401
        
        user_id = user_data['uid']
    except Exception as e:
        print(f"Error verifying token: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to verify authorization token'
        }), 401
    
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
        print(f"Error retrieving user profile: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to retrieve user profile'
        }), 500
