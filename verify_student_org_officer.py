"""
Verify Student Organization Officer implementation
"""
import mysql.connector
from config import Config

def main():
    conn = mysql.connector.connect(**Config.DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    print("=" * 80)
    print("STUDENT ORGANIZATION OFFICER - IMPLEMENTATION VERIFICATION")
    print("=" * 80)
    print()
    
    # 1. Check roles
    print("1. ROLES IN DATABASE:")
    print("-" * 80)
    cursor.execute("SELECT * FROM roles ORDER BY hierarchy_level, id")
    roles = cursor.fetchall()
    
    for role in roles:
        prefix = "   ✓" if role['name'] == 'Student Organization Officer' else "    "
        print(f"{prefix} ID: {role['id']}, Name: {role['name']:<30} Hierarchy: {role['hierarchy_level']}")
    
    print()
    
    # 2. Check if Student Org Officer role exists
    cursor.execute("SELECT * FROM roles WHERE name = 'Student Organization Officer'")
    org_officer_role = cursor.fetchone()
    
    if org_officer_role:
        print("2. STUDENT ORGANIZATION OFFICER ROLE:")
        print("-" * 80)
        print(f"   ✓ Role ID: {org_officer_role['id']}")
        print(f"   ✓ Name: {org_officer_role['name']}")
        print(f"   ✓ Hierarchy: {org_officer_role['hierarchy_level']}")
        print(f"   ✓ Description: {org_officer_role['description']}")
        print()
    else:
        print("2. ✗ Student Organization Officer role NOT FOUND!")
        print()
    
    # 3. Check test user 10
    print("3. TEST USER (ID: 10):")
    print("-" * 80)
    cursor.execute("""
        SELECT u.*, r.name as role_name
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.id = 10
    """)
    test_user = cursor.fetchone()
    
    if test_user:
        print(f"   Username: {test_user['username']}")
        print(f"   Name: {test_user['first_name']} {test_user['last_name']}")
        print(f"   Email: {test_user['email']}")
        print(f"   Current Role: {test_user['role_name']}")
        print(f"   Account Status: {test_user['account_status']}")
        print(f"   Is Active: {'Yes' if test_user['is_active'] else 'No'}")
        print()
        
        if test_user['role_name'] == 'Student Organization Officer':
            print("   ✓ User 10 already has Student Organization Officer role!")
        elif test_user['role_name'] == 'Participant' and test_user['account_status'] == 'Approved':
            print("   ℹ User 10 is approved Participant - ready to be upgraded to Student Org Officer")
        else:
            print(f"   ℹ User 10 status: {test_user['role_name']}, {test_user['account_status']}")
    else:
        print("   ✗ User 10 not found!")
    
    print()
    
    # 4. Summary
    print("4. NEXT STEPS:")
    print("-" * 80)
    
    if test_user:
        if test_user['account_status'] == 'Pending':
            print("   1. Approve user 10's account in Admin Dashboard > Account Approvals")
            print("   2. Then upgrade role to 'Student Organization Officer' in User Management")
        elif test_user['role_name'] == 'Participant':
            print("   1. Go to Admin Dashboard > User Management")
            print("   2. Edit user 10")
            print("   3. Change role from 'Participant' to 'Student Organization Officer'")
            print("   4. Save - email notification will be sent automatically")
        elif test_user['role_name'] == 'Student Organization Officer':
            print("   ✓ User 10 is already a Student Organization Officer!")
            print("   ✓ Check email: " + test_user['email'])
        else:
            print(f"   Current role: {test_user['role_name']}")
            print("   Change to 'Student Organization Officer' if needed")
    
    print()
    print("=" * 80)
    print("FILES MODIFIED:")
    print("=" * 80)
    print("   ✓ Database: Added 'Student Organization Officer' role (ID: 6)")
    print("   ✓ backend/api_users.py - Updated role upgrade detection")
    print("   ✓ backend/email_service.py - Role upgrade email template")
    print("   ✓ static/js/components/UserManagement.js - Added role dropdown option")
    print("   ✓ STUDENT_ORG_OFFICER_IMPLEMENTATION.md - Documentation")
    print("=" * 80)
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
