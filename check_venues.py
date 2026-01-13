
import psycopg
import os
import json

def check_venues():
    # External URL provided by user previously
    db_url = "postgresql://school_event_management_user:eRcbN7ZSjcIA7GfEymBwXRpJL552320s@dpg-d5gd0ere5dus73dsmgc0-a.oregon-postgres.render.com/school_event_management"
    
    try:
        conn = psycopg.connect(db_url)
        cur = conn.cursor()
        
        # Check count of events with venue
        cur.execute("SELECT COUNT(*) FROM ai_training_data WHERE venue IS NOT NULL AND venue != ''")
        count_with_venue = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM ai_training_data")
        total_count = cur.fetchone()[0]
        
        print(f"Events with Venue: {count_with_venue} / {total_count}")
        
        # Check specifically for College Freshman Orientation or similar
        cur.execute("SELECT event_name, venue FROM ai_training_data WHERE event_name ILIKE '%Orientation%' LIMIT 5")
        rows = cur.fetchall()
        print("\nOrientation Events:")
        for r in rows:
            print(f"  - {r[0]}: {r[1]}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_venues()
