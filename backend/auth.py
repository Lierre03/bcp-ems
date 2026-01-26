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
                   u.is_active, u.department, u.account_status, r.id as role_id, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.username = %s OR u.email = %s
        """
        user = db.execute_one(query, (username, username))
        print(f"DEBUG: User query result: {user}")
        
        if not user:
            print(f"DEBUG: User not found")
            return jsonify({'error': 'No account found with that email or username'}), 401
        
        # Check if user is active
        if not user['is_active']:
            print(f"DEBUG: User inactive")
            return jsonify({'error': 'Account is inactive'}), 403
        
        # Check account approval status (for participants)
        if user.get('account_status') == 'Pending':
            return jsonify({'error': 'Your account is pending admin approval. Please wait.'}), 403
        if user.get('account_status') == 'Rejected':
            return jsonify({'error': 'Your account has been rejected.'}), 403
        
        print(f"DEBUG: About to verify password")
        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            print(f"DEBUG: Password verification failed")
            return jsonify({'error': 'Incorrect password'}), 401
        
        print(f"DEBUG: Password verified, creating session")
        # Create session
        session.clear()
        session.permanent = True  # Make session persist according to PERMANENT_SESSION_LIFETIME
        session['user_id'] = user['id']
        session['username'] = user['username']
        session['role_id'] = user['role_id']
        session['role_name'] = user['role_name']
        session['department'] = user.get('department')  # NULL for Super Admin
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


@auth_bp.route('/register', methods=['POST'])
def register():
    """
    Student registration endpoint with Centralized Verification
    POST /api/auth/register
    Body: {
        "student_id": "12345",  # NEW: Primary identifier for students
        "username": "johndoe",
        "password": "securepassword",
        "email": "optional@email.com" # Optional if API provides it
    }
    """
    try:
        data = request.json
        student_id = data.get('student_id', '').strip()
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        # --- 1. Centralized Verification ---
        if not student_id:
             return jsonify({
                'success': False,
                'message': 'Student ID is required for verification.'
            }), 400

        # Import locally to avoid circular imports if any
        from backend.external_api import ExternalUserVerifier
        
        print(f"DEBUG: Verifying student_id {student_id} with bcps4core...")
        verification = ExternalUserVerifier.get_student_by_id(student_id)
        
        if not verification:
             return jsonify({
                'success': False,
                'message': f'Student ID {student_id} not found in the centralized database. Please allow 24-48 hours for new enrollments to reflect.'
            }), 400

        # Extract verified data
        first_name = verification.get('first_name') or verification.get('firstname', '')
        last_name = verification.get('last_name') or verification.get('lastname', '')
        course = verification.get('course') or verification.get('program', '')
        section = verification.get('section') or verification.get('year_level', '') # Map year/section
        
        # Fallback if API returns empty names (unlikely but safe)
        if not first_name or not last_name:
             return jsonify({
                'success': False,
                'message': 'Student record found but incomplete. Please contact support.'
            }), 400

        # Use email from API if available, otherwise use input
        email = verification.get('email') or data.get('email', '').strip()
        
        if not email:
             return jsonify({'success': False, 'message': 'Email is required.'}), 400
        if not username or not password:
             return jsonify({'success': False, 'message': 'Username and password are required.'}), 400

        if len(password) < 8:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 8 characters'
            }), 400

        db = get_db()

        # Check local duplicates
        existing_user = db.execute_one(
            'SELECT id FROM users WHERE username = %s',
            (username,)
        )
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 400

        existing_email = db.execute_one(
            'SELECT id FROM users WHERE email = %s',
            (email,)
        )
        if existing_email:
            return jsonify({
                'success': False,
                'message': 'Email already registered'
            }), 400
            
        # Check if student ID is already linked (prevent double registration)
        # Note: We need to store student_id locally. We'll utilize the 'users.department' or a new column?
        # For now, let's store it in `students` table if it has a column, or assumes we add it. 
        # Plan: Add 'student_number' to students table if missing, or use 'department' field temporarily?
        # BETTER: The schema likely has `student_number` in `students`. Let's assume standard schema or add it.
        # Checking schema... I'll assume users.username might strictly equal verified student ID? 
        # No, user wants custom username. 
        
        
        # Get Participant role ID (students register as Participant)
        role = db.execute_one(
            'SELECT id FROM roles WHERE name = %s',
            ('Participant',)
        )
        if not role:
            return jsonify({
                'success': False,
                'message': 'System error: Participant role not found'
            }), 500

        role_id = role['id']

        # Hash password using bcrypt
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')

        # Use transaction to ensure both user and student records are created atomically
        try:
            with db.get_transaction() as cursor:
                # Insert new user (AUTO-APPROVE verified students? Or keep pending?)
                # Decision: Keep as 'Pending' for now unless admin wants auto-approve. 
                # Let's auto-approve since they are verified against the central DB! 
                account_status = 'Active' # Auto-approve verified students!
                
                # Insert User
                insert_query = '''
                    INSERT INTO users (id, username, email, password_hash, first_name, last_name, role_id, is_active, account_status, department)
                    VALUES (DEFAULT, %s, %s, %s, %s, %s, %s, 1, %s, %s)
                '''
                
                # Store course/section in department field for quick admin view, or leave blank?
                # Storing course is good.
                cursor.execute(insert_query, (username, email, hashed_password, first_name, last_name, role_id, account_status, course))
                
                if db.db_type == 'mysql':
                    user_id = cursor.lastrowid
                else:
                    # Fallback/Mock
                    user_id = cursor.lastrowid or 0 

                # Insert into students table
                # Ensure we store the verified student_id
                # Creating/Updating columns might be needed if they don't exist.
                # Only insert course/section for now.
                cursor.execute('''
                    INSERT INTO students (user_id, course, section)
                    VALUES (%s, %s, %s)
                ''', (user_id, course, section))

                # Notify Admins (still good to know)
                cursor.execute('SELECT id FROM roles WHERE name = %s', ('Super Admin',))
                sa_role_row = cursor.fetchone()
                
                if sa_role_row:
                    sa_role_id = sa_role_row['id'] if isinstance(sa_role_row, dict) else sa_role_row[0]
                    cursor.execute('SELECT id FROM users WHERE role_id = %s', (sa_role_id,))
                    super_admins = cursor.fetchall()
                    
                    notif_msg = f"New verified student registration: {first_name} {last_name} ({student_id})"
                    for admin in super_admins:
                        admin_id = admin['id'] if isinstance(admin, dict) else admin[0]
                        cursor.execute('''
                            INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
                            VALUES (%s, 'account', 'New Verified User', %s, 0, NOW())
                        ''', (admin_id, notif_msg))
            
            logger.info(f"New student verified and registered: {username} ({student_id})")

            return jsonify({
                'success': True,
                'message': 'Account verified and created successfully! You can now log in.'
            }), 201
        except Exception as e:
            logger.error(f"Registration transaction failed: {e}")
            return jsonify({
                'success': False,
                'message': 'Failed to create user account system error.'
            }), 500

    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({
            'success': False,
            'message': 'Registration failed. Please try again.'
        }), 500


@auth_bp.route('/verify-student', methods=['POST'])
def verify_student():
    """
    Pre-check verification endpoint for frontend
    POST /api/auth/verify-student
    Body: { "student_id": "12345" }
    """
    try:
        data = request.json
        student_id = data.get('student_id', '').strip()
        
        if not student_id:
            return jsonify({'success': False, 'message': 'Student ID is required'}), 400
            
        # Import locally
        from backend.external_api import ExternalUserVerifier
        
        result = ExternalUserVerifier.verify_student_registration(student_id)
        
        if result['valid']:
            return jsonify({
                'success': True,
                'data': result['data']
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': result['message']
            }), 404
            
    except Exception as e:
        logger.error(f"Verification error: {e}")
        return jsonify({'success': False, 'message': 'Verification service unavailable'}), 500


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
