
import pymysql

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

def mark_attended():
    conn = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Paul's ID is 13, Event ID is 59 (Campus Tech Showcase)
        user_id = 13
        event_id = 59
        
        print(f"Marking attendance for User {user_id} at Event {event_id}...")
        
        # Check if already attended to avoid dupe error
        cursor.execute("SELECT id FROM event_attendance WHERE event_id=%s AND user_id=%s", (event_id, user_id))
        if cursor.fetchone():
             print("User already marked as attended.")
             return

        query = """
            INSERT INTO event_attendance (event_id, user_id, check_in_datetime, check_in_method)
            VALUES (%s, %s, NOW(), 'Manual')
        """
        
        cursor.execute(query, (event_id, user_id))
        print("Success! Attendance record created.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    mark_attended()
