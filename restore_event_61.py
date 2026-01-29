
import mysql.connector

def get_connection():
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='root',
        database='school_event_management',
        port=3306,
        autocommit=True
    )

def restore_event(event_id):
    conn = get_connection()
    cursor = conn.cursor()
    print(f"--- Restoring Event {event_id} ---")
    
    cursor.execute("UPDATE events SET deleted_at = NULL WHERE id = %s", (event_id,))
    print(f"Event {event_id} restored (deleted_at set to NULL).")
    
    conn.close()

if __name__ == "__main__":
    restore_event(61)
