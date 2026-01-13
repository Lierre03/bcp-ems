
import psycopg
import json
import os

# Correct timeline data based on user request
new_activities = [
    {"startTime": "08:00", "endTime": "08:30", "phase": "Registration and attendance checking", "description": "Registration and attendance checking"},
    {"startTime": "08:30", "endTime": "08:45", "phase": "Opening prayer and Philippine National Anthem", "description": "Opening prayer and Philippine National Anthem"},
    {"startTime": "08:45", "endTime": "09:15", "phase": "Opening Remarks by College Dean", "description": "Opening Remarks by College Dean"},
    {"startTime": "09:15", "endTime": "10:15", "phase": "Academic policies and grading system orientation", "description": "Academic policies and grading system orientation"},
    {"startTime": "10:15", "endTime": "11:00", "phase": "Student services briefing", "description": "Student services briefing (registrar, library, guidance)"},
    {"startTime": "11:00", "endTime": "11:30", "phase": "Campus rules and policies", "description": "Campus rules, safety policies, and student organizations"},
    {"startTime": "11:30", "endTime": "12:00", "phase": "Closing remarks and dismissal", "description": "Closing remarks and dismissal"}
]

def fix_timeline():
    # Use the provided DATABASE_URL directly
    db_url = os.environ.get('DATABASE_URL')
    if not db_url:
        print("Error: DATABASE_URL environment variable is not set.")
        return

    print(f"Connecting to database...")
    
    try:
        # Connect directly using the DSN string
        conn = psycopg.connect(db_url)
        print("Connected to database.")
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    try:
        cur = conn.cursor()
        
        # Find the event
        # Using ILIKE to find it
        cur.execute("SELECT id, event_name FROM ai_training_data WHERE event_name ILIKE '%College Freshman Orientation%'")
        rows = cur.fetchall()
        
        if not rows:
            print("Event 'College Freshman Orientation' not found!")
            return
            
        print(f"Found {len(rows)} matching events.")

        for row in rows:
            event_id = row[0]
            event_name = row[1]
            print(f"Updating Event ID: {event_id} - {event_name}")

            # Update
            cur.execute(
                "UPDATE ai_training_data SET activities = %s WHERE id = %s",
                (json.dumps(new_activities), event_id)
            )
            
        conn.commit()
        print("Successfully updated activities timeline for all matching events.")

    except Exception as e:
        print(f"Error executing update: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    fix_timeline()
