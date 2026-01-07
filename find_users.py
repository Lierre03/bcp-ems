
import pymysql

# DB Config (matching config.py)
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'school_event_management',
    'port': 3306,
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def find_users():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # Find Paul
            print("--- Searching for Paul ---")
            cursor.execute("""
                SELECT u.id, u.username, u.first_name, u.last_name, u.department, r.name as role 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE u.username LIKE '%paul%' OR u.first_name LIKE '%paul%' OR u.last_name LIKE '%paul%'
            """)
            pauls = cursor.fetchall()
            for p in pauls:
                print(p)
                
            # Find IT Dept users
            print("\n--- Searching for IT / Admin Users ---")
            cursor.execute("""
                SELECT u.id, u.username, u.department, r.name as role 
                FROM users u 
                JOIN roles r ON u.role_id = r.id 
                WHERE u.department LIKE '%IT%' OR r.name IN ('Admin', 'Super Admin')
            """)
            admins = cursor.fetchall()
            for a in admins:
                print(a)

    finally:
        conn.close()

if __name__ == "__main__":
    find_users()
