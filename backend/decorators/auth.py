"""
Authentication Decorator for LexiAid Backend

This module provides the @require_auth decorator that validates
Firebase ID tokens and populates g.user_id and g.user_email.
"""

import traceback
from functools import wraps
from flask import request, jsonify, g, current_app


def require_auth(f):
    """
    Decorator that requires a valid Firebase ID token.
    
    Validates the Bearer token from the Authorization header,
    and populates g.user_id and g.user_email on success.
    
    Returns:
        401 Unauthorized if token is missing or invalid
        Proceeds to wrapped function if token is valid
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({
                "error": "Authorization header is missing or invalid",
                "code": "UNAUTHENTICATED"
            }), 401
        
        token = auth_header.split('Bearer ')[1]
        auth_service = current_app.config.get('AUTH_SERVICE')
        if not auth_service:
            current_app.logger.error("ERROR: Authentication service not available in app config")
            return jsonify({
                "error": "Authentication service not available",
                "code": "AUTH_SERVICE_UNAVAILABLE"
            }), 500

        try:
            success, token_data = auth_service.verify_id_token(token)
            
            if not success or not token_data:
                current_app.logger.debug(
                    f"DEBUG: AuthService.verify_id_token returned success={success}, "
                    f"token_data present={token_data is not None}"
                )
                return jsonify({
                    "error": "Invalid or expired token",
                    "details": "Token verification failed by auth service.",
                    "code": "INVALID_TOKEN_AUTH_SERVICE"
                }), 401

            user_id = token_data.get('uid')
            
            if not user_id:
                current_app.logger.error(
                    f"ERROR: User ID ('uid') not found in verified token data: {token_data}"
                )
                return jsonify({
                    "error": "User ID not found in token claims",
                    "code": "USER_ID_NOT_IN_TOKEN_CLAIMS"
                }), 401
            
            g.user_id = user_id
            g.user_email = token_data.get('email')
        except Exception as e:
            current_app.logger.error(
                f"ERROR: Unexpected issue during token verification process: {e}"
            )
            traceback.print_exc()
            return jsonify({
                "error": "Token verification process failed unexpectedly",
                "details": str(e),
                "code": "VERIFICATION_PROCESS_ERROR"
            }), 401
        
        return f(*args, **kwargs)
    return decorated_function
