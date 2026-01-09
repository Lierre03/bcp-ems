
import psycopg
import os

RENDER_DB_URL = "postgresql://school_event_management_user:eRcbN7ZSjcIA7GfEymBwXRpJL552320s@dpg-d5gd0ere5dus73dsmgc0-a.oregon-postgres.render.com/school_event_management"

def verify():
    tables = [
        "users", "roles", "students", "events", "event_registrations", 
        "event_feedback", "event_attendance", "equipment", "venues",
        "notifications", "ai_model_versions", "ai_training_data", 
        "event_status_history"
    ]
    
    print("Verifying row counts in Render PostgreSQL Database...")
    try:
        with psycopg.connect(RENDER_DB_URL) as conn:
            with conn.cursor() as cur:
                for table in tables:
                    try:
                        cur.execute(f'SELECT COUNT(*) FROM "{table}"')
                        count = cur.fetchone()[0]
                        print(f"{table}: {count} rows")
                    except Exception as e:
                        print(f"{table}: Error querying ({e})")
                        conn.rollback()
                        
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    verify()
