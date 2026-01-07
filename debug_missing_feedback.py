
from app import create_app
from database.db import get_db

app = create_app()

with app.app_context():
    db = get_db()
    
    print("--- CHECKING IT DEPT USER ---")
    user = db.execute_one("SELECT id, username, department FROM users WHERE username = 'itdept'")
    print(f"User: {user}")

    print("\n--- CHECKING EVENTS FOR THIS DEPT ---")
    events = db.execute_query("SELECT id, name, organizing_department FROM events WHERE organizing_department = %s", (user['department'],))
    print(f"Events found: {len(events)}")
    for e in events:
        print(f" - {e['name']} (ID: {e['id']})")
        
        # Check feedback for this event
        feedback = db.execute_query("SELECT id, overall_rating FROM event_feedback WHERE event_id = %s", (e['id'],))
        print(f"   -> Feedback count: {len(feedback)}")
