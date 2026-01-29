
import mysql.connector

def check_reservations():
    try:
        conn = mysql.connector.connect(
            host="127.0.0.1",
            port=3306,
            user="root",
            password="root",
            database="bcp_sms4_pcm" # Assuming reservations are here based on previous context
        )
        cursor = conn.cursor(dictionary=True)
        
        print("Connected to bcp_sms4_pcm")
        
        cursor.execute("SELECT event_id, COUNT(*) as count FROM event_asset_reservations GROUP BY event_id")
        reservations = cursor.fetchall()
        
        print("\n--- Events with Reservations ---")
        for r in reservations:
            print(f"Event ID: {r['event_id']}, Count: {r['count']}")
            
        conn.close()

    except mysql.connector.Error as err:
        print(f"Error checking reservations: {err}")
        # Try school_event_management database if the first one fails or is empty
        try:
             conn = mysql.connector.connect(
                host="127.0.0.1",
                port=3306,
                user="root",
                password="root",
                database="school_event_management" 
            )
             cursor = conn.cursor(dictionary=True)
             print("\nChecking school_event_management for reservation table...")
             cursor.execute("SHOW TABLES LIKE 'event_asset_reservations'")
             if cursor.fetchone():
                 cursor.execute("SELECT event_id, COUNT(*) as count FROM event_asset_reservations GROUP BY event_id")
                 reservations = cursor.fetchall()
                 for r in reservations:
                     print(f"Event ID: {r['event_id']}, Count: {r['count']}")
             else:
                 print("Table event_asset_reservations not found in school_event_management")
             conn.close()
        except Exception as e:
            print(e)
            
if __name__ == "__main__":
    check_reservations()
