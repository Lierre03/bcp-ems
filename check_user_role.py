
import psycopg
import os

def check_user():
    db_url = "postgresql://school_event_management_user:eRcbN7ZSjcIA7GfEymBwXRpJL552320s@dpg-d5gd0ere5dus73dsmgc0-a.oregon-postgres.render.com/school_event_management"
    
    try:
        conn = psycopg.connect(db_url)
        cur = conn.cursor()
        
        # Get roles to map ID
        cur.execute("SELECT id, name FROM roles")
        roles = {r[0]: r[1] for r in cur.fetchall()}
        print(f"Roles: {roles}")
        
        # Check for Pending/Review events explicitly shared with BSIT
        print("\n--- Checking Pending Events Shared with BSIT ---")
        cur.execute("""
            SELECT name, organizing_department, status, shared_with_departments 
            FROM events 
            WHERE organizing_department != 'BSIT' 
            AND status IN ('Pending', 'Under Review')
            AND 'BSIT' = ANY(shared_with_departments)
        """)
        shared_events = cur.fetchall()
        if shared_events:
            for e in shared_events:
                print(f"SHARED VISIBLE EVENT: {e[0]} | Dept: {e[1]} | Status: {e[2]}")
        else:
            print("No pending/review events are shared with BSIT.")
            
        print("\n--- Checking Pending Events NOT Shared but Visible (Should be None) ---")
        # Double check the query again
        pass

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_user()
