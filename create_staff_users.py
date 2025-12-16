
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from rebuild.database.db import init_db, get_db
from rebuild.config import Config

def create_staff_user():
    init_db(Config.DB_CONFIG)
    db = get_db()
    
    # Check if Staff role exists
    role = db.execute_one("SELECT id FROM roles WHERE name = 'Staff'")
    if not role:
        print("Error: Staff role not found in database")
        return
    
    role_id = role['id']
    
    # Create test staff users
    staff_users = [
        {
            'username': 'staff',
            'email': 'staff@school.edu',
            'password': 'staff123',
            'first_name': 'John',
            'last_name': 'Smith'
        },
        {
            'username': 'staff2',
            'email': 'staff2@school.edu',
            'password': 'staff123',
            'first_name': 'Jane',
            'last_name': 'Doe'
        }
    ]
    
    for user in staff_users:
        # Check if user already exists
        existing = db.execute_one("SELECT id FROM users WHERE username = %s", (user['username'],))
        if existing:
            print(f"User '{user['username']}' already exists (ID: {existing['id']})")
            continue
        
        # Hash password
        password_hash = bcrypt.hashpw(user['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Insert user
        try:
            user_id = db.execute_insert(
                """INSERT INTO users (username, email, password_hash, role_id, first_name, last_name, is_active)
                   VALUES (%s, %s, %s, %s, %s, %s, 1)""",
                (user['username'], user['email'], password_hash, role_id, user['first_name'], user['last_name'])
            )
            print(f"✓ Created Staff user: {user['username']} (ID: {user_id})")
            print(f"  Email: {user['email']}")
            print(f"  Password: {user['password']}")
        except Exception as e:
            print(f"✗ Error creating user {user['username']}: {e}")

if __name__ == "__main__":
    print("Creating Staff test accounts...\n")
    create_staff_user()
    print("\nDone!")
