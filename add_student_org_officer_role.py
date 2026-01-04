"""
Add Student Organization Officer role to the database
"""
import mysql.connector
from config import Config

def main():
    conn = mysql.connector.connect(**Config.DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    
    # Check existing roles
    print("=" * 80)
    print("CURRENT ROLES IN DATABASE")
    print("=" * 80)
    cursor.execute("SELECT * FROM roles ORDER BY hierarchy_level")
    roles = cursor.fetchall()
    
    for role in roles:
        print(f"ID: {role['id']}, Name: {role['name']}, Hierarchy: {role['hierarchy_level']}")
        print(f"   Description: {role['description']}")
        print()
    
    # Check if Student Organization Officer already exists
    cursor.execute("SELECT * FROM roles WHERE name = 'Student Organization Officer'")
    existing = cursor.fetchone()
    
    if existing:
        print("✓ Student Organization Officer role already exists!")
        print(f"  ID: {existing['id']}, Hierarchy: {existing['hierarchy_level']}")
    else:
        print("Adding Student Organization Officer role...")
        
        # Insert new role between Requestor (4) and Participant (5)
        # We'll use hierarchy level 4.5, but since it's INT, we need to shift others
        # Actually, let's just add it at level 4 and shift Requestor to 3.5
        # Or simpler: add as level 4 (same as Requestor but different role)
        
        cursor.execute("""
            INSERT INTO roles (name, description, hierarchy_level) 
            VALUES ('Student Organization Officer', 
                    'Student organization leaders who can create and manage events for their organizations', 
                    4)
        """)
        conn.commit()
        
        print("✓ Student Organization Officer role added successfully!")
        
        # Show updated roles
        print("\n" + "=" * 80)
        print("UPDATED ROLES")
        print("=" * 80)
        cursor.execute("SELECT * FROM roles ORDER BY hierarchy_level, id")
        roles = cursor.fetchall()
        
        for role in roles:
            print(f"ID: {role['id']}, Name: {role['name']}, Hierarchy: {role['hierarchy_level']}")
            print(f"   Description: {role['description']}")
            print()
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
