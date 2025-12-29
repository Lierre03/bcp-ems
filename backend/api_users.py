# ============================================================================
# USER MANAGEMENT API
# API endpoints for user CRUD operations (Super Admin only)
# ============================================================================

from flask import Blueprint, request, jsonify, session
from functools import wraps
from database.db import get_db
import bcrypt

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


def super_admin_required(f):
    """Decorator to require Super Admin role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            user_id = session.get('user_id')
            print(f"DEBUG super_admin_required: user_id = {user_id}")
            
            if not user_id:
                print("DEBUG: No user_id in session")
                return jsonify({'success': False, 'message': 'Unauthorized'}), 401
            
            db = get_db()
            result = db.execute_one('''
                SELECT r.name FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE u.id = %s
            ''', (user_id,))
            
            print(f"DEBUG: User role = {result['name'] if result else 'None'}")
            
            if not result or result['name'] != 'Super Admin':
                print(f"DEBUG: Access denied - role is {result['name'] if result else 'None'}")
                return jsonify({'success': False, 'message': 'Forbidden - Super Admin only'}), 403
            
            print("DEBUG: Super Admin access granted")
            return f(*args, **kwargs)
        except Exception as e:
            print(f"ERROR in super_admin_required: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({'success': False, 'message': f'Auth error: {str(e)}'}), 500
    return decorated_function


def hash_password(password):
    """Hash password using bcrypt"""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')


@users_bp.route('', methods=['GET'])
@super_admin_required
def get_users():
    """Get all users"""
    try:
        db = get_db()
        users = db.execute_query('''
            SELECT u.id, u.username, u.first_name, u.last_name, u.email, u.is_active, u.department, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        ''')
        
        user_list = []
        for user in users:
            full_name = f"{user['first_name'] or ''} {user['last_name'] or ''}".strip() or user['username']
            user_list.append({
                'id': user['id'],
                'username': user['username'],
                'full_name': full_name,
                'email': user['email'] or '',
                'status': 'active' if user['is_active'] else 'inactive',
                'role_name': user['role_name'],
                'department': user.get('department') or None
            })
        
        return jsonify({'success': True, 'users': user_list})
    except Exception as e:
        print(f"Error getting users: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@users_bp.route('', methods=['POST'])
@super_admin_required
def create_user():
    """Create new user"""
    try:
        data = request.json
        username = data.get('username')
        full_name = data.get('full_name', '')
        email = data.get('email', '')
        role = data.get('role', 'Requestor')
        # Department handling: NULL for Super Admin/Staff, actual value for Admin/Requestor
        department = data.get('department')
        if not department or department.strip() == '':
            department = None
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'}), 400
        
        # Split full_name into first and last
        name_parts = full_name.strip().split(' ', 1) if full_name else ['', '']
        first_name = name_parts[0] if len(name_parts) > 0 else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        db = get_db()
        
        # Check if username exists
        existing = db.execute_one('SELECT id FROM users WHERE username = %s', (username,))
        if existing:
            return jsonify({'success': False, 'message': 'Username already exists'}), 400
        
        # Get role ID
        role_row = db.execute_one('SELECT id FROM roles WHERE name = %s', (role,))
        if not role_row:
            return jsonify({'success': False, 'message': 'Invalid role'}), 400
        
        role_id = role_row['id']
        hashed_password = hash_password(password)
        
        # Insert user
        db.execute_insert('''
            INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, department, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 1)
        ''', (username, hashed_password, first_name, last_name, email, role_id, department))
        
        return jsonify({'success': True, 'message': 'User created successfully'})
    except Exception as e:
        print(f"Error creating user: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@users_bp.route('/<int:user_id>', methods=['PUT'])
@super_admin_required
def update_user(user_id):
    """Update user"""
    try:
        data = request.json
        full_name = data.get('full_name', '')
        email = data.get('email', '')
        role = data.get('role')
        # Department handling: NULL for Super Admin/Staff, actual value for Admin/Requestor
        department = data.get('department')
        if not department or department.strip() == '':
            department = None
        password = data.get('password')
        
        if not role:
            return jsonify({'success': False, 'message': 'Role is required'}), 400
        
        # Split full_name into first and last
        name_parts = full_name.strip().split(' ', 1) if full_name else ['', '']
        first_name = name_parts[0] if len(name_parts) > 0 else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''
        
        db = get_db()
        
        # Get role ID
        role_row = db.execute_one('SELECT id FROM roles WHERE name = %s', (role,))
        if not role_row:
            return jsonify({'success': False, 'message': 'Invalid role'}), 400
        
        role_id = role_row['id']
        
        # Update user
        if password:
            hashed_password = hash_password(password)
            db.execute_update('''
                UPDATE users 
                SET first_name = %s, last_name = %s, email = %s, role_id = %s, department = %s, password_hash = %s
                WHERE id = %s
            ''', (first_name, last_name, email, role_id, department, hashed_password, user_id))
        else:
            db.execute_update('''
                UPDATE users 
                SET first_name = %s, last_name = %s, email = %s, role_id = %s, department = %s
                WHERE id = %s
            ''', (first_name, last_name, email, role_id, department, user_id))
        
        return jsonify({'success': True, 'message': 'User updated successfully'})
    except Exception as e:
        print(f"Error updating user: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@users_bp.route('/<int:user_id>/toggle-status', methods=['POST'])
@super_admin_required
def toggle_user_status(user_id):
    """Toggle user active/inactive status"""
    try:
        db = get_db()
        
        # Get current status
        row = db.execute_one('SELECT is_active FROM users WHERE id = %s', (user_id,))
        if not row:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        current_active = row['is_active']
        new_active = 0 if current_active else 1
        new_status = 'active' if new_active else 'inactive'
        
        db.execute_update('UPDATE users SET is_active = %s WHERE id = %s', (new_active, user_id))
        
        return jsonify({'success': True, 'message': f'User {new_status}'})
    except Exception as e:
        print(f"Error toggling status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


@users_bp.route('/<int:user_id>/reset-password', methods=['POST'])
@super_admin_required
def reset_password(user_id):
    """Reset user password"""
    try:
        data = request.json
        password = data.get('password')
        
        if not password:
            return jsonify({'success': False, 'message': 'Password required'}), 400
        
        db = get_db()
        hashed_password = hash_password(password)
        db.execute_update('UPDATE users SET password_hash = %s WHERE id = %s', (hashed_password, user_id))
        
        return jsonify({'success': True, 'message': 'Password reset successfully'})
    except Exception as e:
        print(f"Error resetting password: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500
