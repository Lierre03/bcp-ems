"""
Remove the incorrect "Requestor" role from database
"""
import mysql.connector
from config import Config

def main():
    conn = mysql.connector.connect(**Config.DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    print("=" * 80)
    print("REMOVING INCORRECT 'REQUESTOR' ROLE")
    print("=" * 80)
    print()
    
    # Check current roles
    print("BEFORE:")
    cursor.execute("SELECT id, name FROM roles ORDER BY id")
    for role in cursor.fetchall():
        print(f"  ID {role['id']}: {role['name']}")
    print()
    
    # Check if any users have Requestor role
    cursor.execute("""
        SELECT COUNT(*) as count 
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name = 'Requestor'
    """)
    requestor_users = cursor.fetchone()['count']
    
    if requestor_users > 0:
        print(f"⚠️  Warning: {requestor_users} users currently have 'Requestor' role")
        print("   These users will be updated to 'Student Organization Officer'")
        print()
        
        # Get Student Org Officer role ID
        cursor.execute("SELECT id FROM roles WHERE name = 'Student Organization Officer'")
        org_officer_id = cursor.fetchone()['id']
        
        # Update users from Requestor to Student Organization Officer
        cursor.execute("""
            UPDATE users 
            SET role_id = %s 
            WHERE role_id = (SELECT id FROM roles WHERE name = 'Requestor')
        """, (org_officer_id,))
        
        print(f"✓ Updated {requestor_users} users to Student Organization Officer")
        print()
    
    # Delete Requestor role
    cursor.execute("DELETE FROM roles WHERE name = 'Requestor'")
    conn.commit()
    
    print("✓ 'Requestor' role deleted from database")
    print()
    
    # Show updated roles
    print("AFTER:")
    cursor.execute("SELECT id, name, hierarchy_level FROM roles ORDER BY hierarchy_level, id")
    for role in cursor.fetchall():
        print(f"  ID {role['id']}: {role['name']} (hierarchy {role['hierarchy_level']})")
    print()
    
    print("=" * 80)
    print("CLARIFICATION:")
    print("=" * 80)
    print("'Requestor' is NOT a role - it's just the events.requestor_id column name")
    print("that refers to whoever created the event.")
    print()
    print("Correct roles:")
    print("  1. Super Admin - Full system access")
    print("  2. Admin - Event approval, analytics")
    print("  3. Staff - Venue/equipment management")
    print("  4. Student Organization Officer - Can create events")
    print("  5. Participant - Can register for events")
    print("=" * 80)
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
