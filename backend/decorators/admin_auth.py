"""
Admin Authentication Decorator for LexiAid Backend

This module provides the @require_admin decorator that restricts
access to admin-only endpoints based on a hardcoded email allowlist.

Usage:
    @app.route('/api/admin/endpoint')
    @require_auth      # Must run first to populate g.user_email
    @require_admin     # Checks if user is in ADMIN_EMAILS
    def admin_endpoint():
        ...
"""

import os
import logging
from functools import wraps
from flask import g, jsonify

logger = logging.getLogger(__name__)

# Load admin emails at module initialization (not per-request)
# This is a comma-separated list from the environment variable
_raw_admin_emails = os.environ.get('ADMIN_EMAILS', '')
ADMIN_EMAILS: set[str] = {
    email.strip().lower() 
    for email in _raw_admin_emails.split(',') 
    if email.strip()
}

if ADMIN_EMAILS:
    logger.info(f"Admin access configured for {len(ADMIN_EMAILS)} email(s)")
else:
    logger.warning("ADMIN_EMAILS not configured - all admin endpoints will be inaccessible")


def require_admin(f):
    """
    Decorator that restricts access to admin users only.
    
    MUST be used AFTER @require_auth decorator to ensure g.user_email is populated.
    
    Returns:
        403 Forbidden if user is not in ADMIN_EMAILS
        Proceeds to wrapped function if user is an admin
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get user email from Flask's g object (set by @require_auth)
        user_email = getattr(g, 'user_email', None)
        
        if not user_email:
            logger.warning("Admin access attempted without user_email in g object")
            return jsonify({
                "error": "Authentication required before admin check",
                "code": "AUTH_REQUIRED_FOR_ADMIN"
            }), 401
        
        # Normalize email for comparison
        normalized_email = user_email.strip().lower()
        
        # Check if user is in admin allowlist
        if normalized_email not in ADMIN_EMAILS:
            logger.warning(
                f"Unauthorized admin access attempt by: {user_email} "
                f"(user_id: {getattr(g, 'user_id', 'unknown')})"
            )
            return jsonify({
                "error": "Admin access required",
                "code": "FORBIDDEN"
            }), 403
        
        logger.info(f"Admin access granted to: {user_email}")
        return f(*args, **kwargs)
    
    return decorated_function
