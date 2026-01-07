from database.db import get_db, init_db
from app import create_app
import logging

app = create_app('development')

with app.app_context():
    db = get_db()
    
    # helper to find a completed event
    event = db.execute_one("SELECT id FROM events WHERE status='Completed' LIMIT 1")
    if not event:
        print("No completed event found. Creating one...")
        db.execute_update("""
            INSERT INTO events (name, event_type, start_datetime, end_datetime, status, requestor_id, organizing_department)
            VALUES ('Test Event for Feedback', 'Workshop', NOW(), NOW(), 'Completed', 1, 'BSIT')
        """)
        event = db.execute_one("SELECT id FROM events WHERE name='Test Event for Feedback' LIMIT 1")
    
    print(f"Using Event ID: {event['id']}")

    # Insert feedback
    db.execute_update("""
        INSERT INTO event_feedback (event_id, user_id, overall_rating, venue_rating, activities_rating, organization_rating, comments)
        VALUES (%s, 1, 5, 4, 5, 4, 'Great event!')
    """, (event['id'],))
    
    print("Dummy feedback inserted.")
