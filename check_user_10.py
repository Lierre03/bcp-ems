import sys
sys.path.insert(0, '/home/ivy/Documents/School-Event-Management-Commision/rebuild')

import pymysql
from config import Config

conn = pymysql.connect(
    host=Config.DB_CONFIG['host'],
    user=Config.DB_CONFIG['user'],
    password=Config.DB_CONFIG['password'],
    database=Config.DB_CONFIG['database'],
    cursorclass=pymysql.cursors.DictCursor
)
cursor = conn.cursor()

# Check user 10
cursor.execute("""
    SELECT u.id, u.username, u.email, u.first_name, u.last_name, 
           r.name as role, u.account_status, u.is_active, u.department
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = 10
""")
user = cursor.fetchone()

if user:
    print("User 10 Details:")
    print(f"  Username: {user['username']}")
    print(f"  Email: {user['email']}")
    print(f"  Name: {user['first_name']} {user['last_name']}")
    print(f"  Role: {user['role']}")
    print(f"  Department: {user['department']}")
    print(f"  Account Status: {user['account_status']}")
    print(f"  Active: {'Yes' if user['is_active'] else 'No'}")
    print()
    print("Test Steps:")
    print("1. Login as Super Admin")
    print("2. Go to Account Approval Panel")
    print(f"3. Approve user '{user['username']}'")
    print(f"4. Check email: {user['email']}")
    print("5. Go to User Management")
    print(f"6. Edit user '{user['username']}'")
    print("7. Change role from Participant → Requestor")
    print("8. Set Department (if not set)")
    print("9. Click Update")
    print(f"10. Check email: {user['email']} for role upgrade notification")
else:
    print("User 10 not found")

cursor.close()
conn.close()
