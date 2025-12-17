import sys
sys.path.insert(0, '.')

from flask import Flask
from config import Config
from database.db import init_db
from backend.api_users import users_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = 'test'
app.config['SESSION_TYPE'] = 'filesystem'

# Initialize database
init_db(Config.DB_CONFIG)

# Register blueprint
app.register_blueprint(users_bp)

# Create a test request context with a super admin session
with app.test_request_context():
    from flask import session
    
    # Simulate logged in super admin
    with app.test_client() as client:
        # First, let's check if we can get the endpoint without auth
        print("Testing /api/users endpoint...")
        
        # Set session manually
        with client.session_transaction() as sess:
            # Get a super admin user ID from database
            from database.db import get_db
            db = get_db()
            
            admin = db.execute_one('''
                SELECT u.id FROM users u
                JOIN roles r ON u.role_id = r.id
                WHERE r.name = 'Super Admin'
                LIMIT 1
            ''')
            
            if admin:
                print(f"Found Super Admin user with ID: {admin['id']}")
                sess['user_id'] = admin['id']
            else:
                print("ERROR: No Super Admin user found in database!")
                print("\nChecking all roles:")
                roles = db.execute_query('SELECT * FROM roles')
                for role in roles:
                    print(f"  - {role}")
                print("\nChecking all users:")
                users = db.execute_query('SELECT id, username, role_id FROM users')
                for user in users:
                    print(f"  - ID: {user['id']}, Username: {user['username']}, Role ID: {user['role_id']}")
                sys.exit(1)
        
        # Now make the request
        response = client.get('/api/users')
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Data: {response.get_json()}")
