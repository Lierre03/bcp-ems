from database.db import get_db, init_db
from config import Config
import json

def check_event_type():
    init_db(Config.DB_CONFIG)
    db = get_db()
    
    print("\nChecking event 51 type...")
    event = db.execute_one("SELECT id, name, event_type FROM events WHERE id=51")
    print(json.dumps(event, default=str, indent=2))

if __name__ == "__main__":
    check_event_type()
