
import mysql.connector

def check_both_dbs():
    dbs = ['bcp_sms4_pcm', 'school_event_management']
    
    for db in dbs:
        print(f"\n--- Checking database: {db} ---")
        try:
            conn = mysql.connector.connect(
                host="127.0.0.1",
                port=3306,
                user="root",
                password="root",
                database=db
            )
            cursor = conn.cursor(dictionary=True)
            
            # Check if table exists
            cursor.execute("SHOW TABLES LIKE 'event_asset_reservations'")
            if not cursor.fetchone():
                print("Table event_asset_reservations DOES NOT EXIST.")
                conn.close()
                continue
                
            cursor.execute("SELECT event_id, COUNT(*) as count FROM event_asset_reservations GROUP BY event_id")
            reservations = cursor.fetchall()
            
            if not reservations:
                 print("Table exists but is EMPTY.")
            else:
                for r in reservations:
                    print(f"Event ID: {r['event_id']}, Count: {r['count']}")
                    # Get event name to match screenshot
                    # This requires logic to join across DBs if the event table is in school_event_management
                    # But for now let's just see IDs.
                
            conn.close()
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_both_dbs()
