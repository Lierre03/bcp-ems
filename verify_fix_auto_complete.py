
import requests
import pymysql
import os
from datetime import datetime, timedelta

# DB Config
DB_CONFIG = {
    'host': os.environ.get('DB_HOST') or 'localhost',
    'user': os.environ.get('DB_USER') or 'root',
    'password': os.environ.get('DB_PASSWORD') or '',
    'database': os.environ.get('DB_NAME') or 'school_event_management',
    'port': int(os.environ.get('DB_PORT') or 3306),
    'charset': 'utf8mb4',
    'autocommit': True
}

def verify_fix():
    print("1. Setting up test event...")
    conn = pymysql.connect(**DB_CONFIG)
    cursor = conn.cursor()
    
    # Create an event that ended 1 hour ago
    past_time = datetime.now() - timedelta(hours=1)
    past_start = past_time - timedelta(hours=2)
    
    cursor.execute("""
        INSERT INTO events (name, event_type, start_datetime, end_datetime, status, requestor_id, organizing_department) 
        VALUES ('Test Past Event', 'Academic', %s, %s, 'Approved', 1, 'Computer Science')
    """, (past_start, past_time))
    event_id = cursor.lastrowid
    print(f"   Created event ID {event_id} with status 'Approved' (ended at {past_time})")
    
    try:
        print("\n2. Triggering lazy check via API call...")
        # Call any API endpoint
        response = requests.get('http://localhost:5001/api/events/test_health_check_or_similar') 
        # Note: calling any path starting with /api/ should trigger it. 
        # Using a dummy path is fine as long as the server handles it or 404s, 
        # but the before_request runs BEFORE the 404.
        
        try: 
             resp = requests.get('http://localhost:5001/api/venues/equipment')
             print(f"   API Response Status: {resp.status_code}")
        except Exception as e:
             print(f"   API Call Failed: {e}") 

        print("\n3. Verifying status update...")
        # Get DB time info
        cursor.execute("SELECT NOW(), @@system_time_zone, @@time_zone")
        db_time_info = cursor.fetchone()
        print(f"   DB NOW(): {db_time_info[0]} | SysTZ: {db_time_info[1]} | SessionTZ: {db_time_info[2]}")
        
        cursor.execute("SELECT status, end_datetime FROM events WHERE id = %s", (event_id,))
        row = cursor.fetchone()
        new_status = row[0]
        stored_end = row[1]
        print(f"   Event End: {stored_end}")
        
        print(f"   Event End: {stored_end}")
        
        if stored_end < db_time_info[0]:
             print("   Condition (End < NOW) SHOULD be True.")
        else:
             print("   Condition (End < NOW) is FALSE (Event is in the future relative to DB).")

        # REFRESH CONNECTION to ensure we see committed changes from valid transaction
        cursor.close()
        conn.close()
        print("   (Refreshing verification connection...)")
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        cursor.execute("SELECT status FROM events WHERE id = %s", (event_id,))
        row = cursor.fetchone()
        new_status = row[0]

        if new_status == 'Completed':
            print(f"SUCCESS! Event {event_id} status is now '{new_status}'")
            print("Auto-complete logic is working.")
        else:
            print(f"FAILED. Event {event_id} status is still '{new_status}'")
            # Extra debug
            print(f"DEBUG: Was looking for status changes on ID {event_id}")

        # Cleanup
        cursor.execute("DELETE FROM events WHERE id = %s", (event_id,))
        print("\nTest event cleaned up.")
        
    except Exception as e:
        print(f"Error during verification: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    verify_fix()
