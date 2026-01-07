
import pymysql
import datetime

# DB Config (matching config.py)
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'school_event_management',
    'port': 3306,
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': True
}

def register_user():
    conn = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Paul's ID is 13, Event ID is 59 (Campus Tech Showcase)
        user_id = 13
        event_id = 59
        
        print(f"Registering User {user_id} for Event {event_id}...")
        
        # Check if already registered
        cursor.execute("SELECT id FROM event_registrations WHERE event_id=%s AND user_id=%s", (event_id, user_id))
        if cursor.fetchone():
             print("User already registered.")
             return

        # Generate mock QR code
        qr_code = f"REG-999-{user_id}-{int(datetime.datetime.now().timestamp())}"

        query = """
            INSERT INTO event_registrations (event_id, user_id, registration_date, registration_status, qr_code)
            VALUES (%s, %s, NOW(), 'Registered', %s)
        """
        
        cursor.execute(query, (event_id, user_id, qr_code))
        print("Success! Registration record created.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    register_user()
