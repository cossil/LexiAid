"""
Decorators package for LexiAid backend.
"""

from backend.decorators.auth import require_auth
from backend.decorators.admin_auth import require_admin

__all__ = ['require_auth', 'require_admin']
