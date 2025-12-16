# ============================================================================
# AUTHENTICATION MODULE
# Login, logout, session management, RBAC
# ============================================================================

from flask import Blueprint, request, jsonify, session
from functools import wraps
import bcrypt
import logging
from database.db import get_db

logger = logging.getLogger(__name__)

# Create blueprint
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# ============================================================================
# RBAC DECORATOR
# ============================================================================

def require_role(allowed_roles):
    """Decorator to enforce role-based access control"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if user is logged in
            if 'user_id' not in session:
                return jsonify({'error': 'Unauthorized', 'message': 'Please login'}), 401
            
            # Check if user has required role
            user_role = session.get('role_name')
            if user_role not in allowed_roles:
                return jsonify({
                    'error': 'Forbidden',
                    'message': f'Access denied. Required role: {", ".join(allowed_roles)}'
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@auth_bp.route('/login', methods=['POST'])
def login():
    """
    Login endpoint
    POST /api/auth/login
    Body: { "username": "admin", "password": "admin123" }
    """
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        print(f"DEBUG: Login attempt - username: {username}")
        
        # Validation
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Get user from database
        db = get_db()
        print(f"DEBUG: Database connection established")
        
        query = """
            SELECT u.id, u.username, u.email, u.password_hash, u.first_name, u.last_name,
                   u.is_active, r.id as role_id, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.username = %s
        """
        user = db.execute_one(query, (username,))
        print(f"DEBUG: User query result: {user}")
        
        if not user:
            print(f"DEBUG: User not found")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if user is active
        if not user['is_active']:
            print(f"DEBUG: User inactive")
            return jsonify({'error': 'Account is inactive'}), 403
        
        print(f"DEBUG: About to verify password")
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            print(f"DEBUG: Password verification failed")
            return jsonify({'error': 'Invalid credentials'}), 401
        
        print(f"DEBUG: Password verified, creating session")
        # Create session
        session.clear()
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role_id'] = user['role_id']
        session['role_name'] = user['role_name']
        session['full_name'] = f"{user['first_name']} {user['last_name']}"
        
        print(f"DEBUG: Session created successfully")
        logger.info(f"User logged in: {username} (Role: {user['role_name']})")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'role_name': user['role_name'],
                'full_name': f"{user['first_name']} {user['last_name']}"
            }
        }), 200
        
    except Exception as e:
        print(f"DEBUG: Exception occurred: {e}")
        logger.error(f"Login error: {e}")
        return jsonify({'error': 'Login failed', 'details': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout endpoint
    POST /api/auth/logout
    """
    try:
        username = session.get('username', 'Unknown')
        session.clear()
        logger.info(f"User logged out: {username}")
        
        return jsonify({
            'success': True,
            'message': 'Logout successful'
        }), 200
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'error': 'Logout failed'}), 500


@auth_bp.route('/session', methods=['GET'])
def check_session():
    """
    Check if user has active session
    GET /api/auth/session
    """
    if 'user_id' in session:
        return jsonify({
            'logged_in': True,
            'authenticated': True,
            'user': {
                'id': session['user_id'],
                'username': session['username'],
                'role_name': session['role_name'],
                'full_name': session['full_name']
            }
        }), 200
    else:
        return jsonify({'logged_in': False, 'authenticated': False}), 200


@auth_bp.route('/change-password', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor', 'Participant'])
def change_password():
    """
    Change password for logged-in user
    POST /api/auth/change-password
    Body: { "old_password": "...", "new_password": "..." }
    """
    try:
        data = request.get_json()
        old_password = data.get('old_password')
        new_password = data.get('new_password')
        
        # Validation
        if not old_password or not new_password:
            return jsonify({'error': 'Both old and new passwords required'}), 400
        
        if len(new_password) < 8:
            return jsonify({'error': 'New password must be at least 8 characters'}), 400
        
        # Get current user
        db = get_db()
        user = db.execute_one(
            "SELECT password_hash FROM users WHERE id = %s",
            (session['user_id'],)
        )
        
        # Verify old password
        if not bcrypt.checkpw(old_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            return jsonify({'error': 'Current password is incorrect'}), 401
        
        # Hash new password
        new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt(rounds=12))
        
        # Update password
        db.execute_update(
            "UPDATE users SET password_hash = %s, updated_at = NOW() WHERE id = %s",
            (new_hash.decode('utf-8'), session['user_id'])
        )
        
        logger.info(f"Password changed for user: {session['username']}")
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Password change error: {e}")
        return jsonify({'error': 'Password change failed'}), 500
