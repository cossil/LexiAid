"""
Admin Routes for LexiAid Backend

This module provides admin-only API endpoints for:
- System statistics and analytics
- User management and listing
- Feedback review and management

All endpoints require both authentication (@require_auth) and 
admin authorization (@require_admin).
"""

from flask import Blueprint, request, jsonify, current_app, g
from backend.decorators import require_auth, require_admin

admin_bp = Blueprint('admin_bp', __name__)


@admin_bp.route('/stats', methods=['GET'])
@require_auth
@require_admin
def get_admin_stats():
    """
    Get aggregated system statistics for admin dashboard.
    
    Returns:
        JSON with counts for users, documents, and feedback
    """
    firestore_service = current_app.config.get('FIRESTORE_SERVICE')
    if not firestore_service:
        current_app.logger.error('Firestore service unavailable for admin stats')
        return jsonify({
            'success': False,
            'error': 'Service unavailable'
        }), 503
    
    try:
        stats = firestore_service.get_stats()
        return jsonify({
            'success': True,
            'data': stats
        }), 200
    except Exception as e:
        current_app.logger.error(f'Error fetching admin stats: {e}')
        return jsonify({
            'success': False,
            'error': 'Failed to fetch statistics',
            'detail': str(e)
        }), 500


@admin_bp.route('/users', methods=['GET'])
@require_auth
@require_admin
def get_admin_users():
    """
    List all users from Firebase Auth with pagination.
    
    Query Parameters:
        - limit: Number of users per page (default: 50, max: 100)
        - page_token: Token for fetching next page
        
    Returns:
        JSON with user list and pagination info
    """
    auth_service = current_app.config.get('AUTH_SERVICE')
    if not auth_service:
        current_app.logger.error('Auth service unavailable for admin users')
        return jsonify({
            'success': False,
            'error': 'Service unavailable'
        }), 503
    
    # Parse query parameters
    try:
        limit = min(int(request.args.get('limit', 50)), 100)  # Cap at 100
    except ValueError:
        limit = 50
    
    page_token = request.args.get('page_token')
    
    try:
        result = auth_service.list_users(page_token=page_token, max_results=limit)
        
        # Check for errors from the service
        if 'error' in result:
            return jsonify({
                'success': False,
                'error': 'Failed to list users',
                'detail': result['error']
            }), 500
        
        # Optionally enrich with Firestore profile data
        firestore_service = current_app.config.get('FIRESTORE_SERVICE')
        if firestore_service:
            for user in result['users']:
                try:
                    profile = firestore_service.get_user(user['uid'])
                    if profile:
                        user['profile'] = {
                            'preferences': profile.get('preferences', {}),
                            'gamification': profile.get('gamification', {})
                        }
                except Exception as profile_err:
                    current_app.logger.debug(f"Could not fetch profile for {user['uid']}: {profile_err}")
        
        return jsonify({
            'success': True,
            'data': {
                'users': result['users'],
                'pagination': {
                    'page_token': result.get('page_token'),
                    'has_more': result.get('has_more', False),
                    'returned': len(result['users'])
                }
            }
        }), 200
    except Exception as e:
        current_app.logger.error(f'Error listing admin users: {e}')
        return jsonify({
            'success': False,
            'error': 'Failed to list users',
            'detail': str(e)
        }), 500


@admin_bp.route('/feedback', methods=['GET'])
@require_auth
@require_admin
def get_admin_feedback():
    """
    Retrieve all feedback reports for admin review.
    
    Query Parameters:
        - limit: Number of items per page (default: 50)
        - offset: Number of items to skip (default: 0)
        - status: Filter by status ('new', 'reviewed', 'resolved')
        - type: Filter by feedback type ('bug', 'accessibility', 'suggestion')
        
    Returns:
        JSON with feedback list and pagination info
    """
    firestore_service = current_app.config.get('FIRESTORE_SERVICE')
    if not firestore_service:
        current_app.logger.error('Firestore service unavailable for admin feedback')
        return jsonify({
            'success': False,
            'error': 'Service unavailable'
        }), 503
    
    # Parse query parameters
    try:
        limit = min(int(request.args.get('limit', 50)), 100)  # Cap at 100
    except ValueError:
        limit = 50
    
    try:
        offset = max(int(request.args.get('offset', 0)), 0)  # Ensure non-negative
    except ValueError:
        offset = 0
    
    status = request.args.get('status')
    feedback_type = request.args.get('type')
    
    try:
        result = firestore_service.get_all_feedback(
            limit=limit,
            offset=offset,
            status=status,
            feedback_type=feedback_type
        )
        
        # Check for errors from the service
        if 'error' in result:
            return jsonify({
                'success': False,
                'error': 'Failed to fetch feedback',
                'detail': result['error']
            }), 500
        
        return jsonify({
            'success': True,
            'data': result
        }), 200
    except Exception as e:
        current_app.logger.error(f'Error fetching admin feedback: {e}')
        return jsonify({
            'success': False,
            'error': 'Failed to fetch feedback',
            'detail': str(e)
        }), 500


@admin_bp.route('/users/sync', methods=['POST'])
@require_auth
@require_admin
def sync_users():
    """
    Sync all Auth users to Firestore Profiles.
    Iterates through all users and ensures a profile exists.
    """
    auth_service = current_app.config.get('AUTH_SERVICE')
    firestore_service = current_app.config.get('FIRESTORE_SERVICE')
    
    if not auth_service or not firestore_service:
        return jsonify({
            'success': False,
            'error': 'Services unavailable'
        }), 503

    fixed_count = 0
    total_processed = 0
    page_token = None
    
    try:
        while True:
            result = auth_service.list_users(page_token=page_token, max_results=100)
            if 'error' in result:
                raise Exception(result['error'])
            
            users = result['users']
            for user in users:
                try:
                    # We use the auth display name as a fallback
                    created = firestore_service.ensure_user_profile(
                        user_id=user['uid'],
                        email=user['email'],
                        display_name=user.get('displayName')
                    )
                    if created:
                        fixed_count += 1
                except Exception as e:
                    current_app.logger.error(f"Failed to sync user {user['uid']}: {e}")
                
                total_processed += 1

            if not result.get('has_more'):
                break
                
            page_token = result.get('page_token')
            
        return jsonify({
            'success': True,
            'data': {
                'processed': total_processed,
                'fixed': fixed_count
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error syncing users: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to sync users',
            'detail': str(e)
        }), 500
