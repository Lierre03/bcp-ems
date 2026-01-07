
from app import create_app
from database.db import get_db

app = create_app()

with app.app_context():
    db = get_db()
    
    print("--- CHECKING BSIT EVENTS ---")
    bsit_events = db.execute_query("SELECT id, name, organizing_department, status FROM events WHERE organizing_department = 'BSIT'")
    print(f"BSIT Events: {len(bsit_events)}")
    for e in bsit_events:
        print(f" - {e['name']} ({e['status']})")

    if bsit_events:
         print("Updating BSIT events to 'IT Department'...")
         db.execute_query("UPDATE events SET organizing_department = 'IT Department' WHERE organizing_department = 'BSIT'")
         print("Update complete.")
