#!/usr/bin/env python3

# Simple test to debug the login issue

import sys
sys.path.insert(0, '.')

from config import config
from database.db import Database
import bcrypt

# Test database connection
print("1. Testing database connection...")
try:
    db_config = config['development'].DB_CONFIG
    db = Database(db_config)
    connection = db.connect()
    print("✓ Database connected successfully")
except Exception as e:
    print(f"✗ Database connection failed: {e}")
    exit(1)

# Test user query
print("2. Testing user query...")
try:
    query = """
        SELECT u.id, u.username, u.password_hash, u.first_name, u.last_name,
               u.is_active, r.id as role_id, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.username = %s
    """
    user = db.execute_one(query, ('admin',))
    print(f"✓ User found: {user}")
except Exception as e:
    print(f"✗ User query failed: {e}")
    exit(1)

# Test password verification
print("3. Testing password verification...")
try:
    password = 'admin123'
    stored_hash = user['password_hash']
    result = bcrypt.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    print(f"✓ Password verification: {result}")
except Exception as e:
    print(f"✗ Password verification failed: {e}")
    exit(1)

print("All tests passed! The database and authentication should work.")