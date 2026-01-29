
import mysql.connector

def restore_event_56():
    try:
        conn = mysql.connector.connect(
            user='root', 
            password='root', 
            database='school_event_management'
        )
        cursor = conn.cursor()
        
        print("Restoring Event 56 (Undeleting)...")
        cursor.execute("UPDATE events SET deleted_at = NULL WHERE id = 56")
        
        # Also check Event 24 if that was missing
        cursor.execute("UPDATE events SET deleted_at = NULL WHERE id = 24")
        
        conn.commit()
        print(f"Restored. Rows affected: {cursor.rowcount}") # Note: rowcount might duplicate if multiple queries
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    restore_event_56()
