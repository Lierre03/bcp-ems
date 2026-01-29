import sys
import os
import json
sys.path.append(os.getcwd())

from database.db import get_db, init_db
from config import config

class MockAppConfig:
    def __init__(self):
        raw_config = config['development']
        self.DB_CONFIG = raw_config.DB_CONFIG

def inspect_event_requests():
    try:
        app_config = MockAppConfig()
        init_db(app_config.DB_CONFIG)
        db = get_db()
        
        print("--- Inspecting Event Equipment Requests ---")
        
        # Fetch events that have equipment requests
        query = "SELECT title, equipment, status, start_date FROM events WHERE equipment IS NOT NULL AND equipment != '[]' LIMIT 5"
        events = db.execute_query(query)
        
        if not events:
            print("No events found with equipment requests.")
            return

        for e in events:
            print(f"\nEvent: {e['title']} ({e['status']})")
            print(f"Raw Equipment JSON: {e['equipment']}")
            try:
                # Try parsing if it's a string
                if isinstance(e['equipment'], str):
                    parsed = json.loads(e['equipment'])
                    print(f"Parsed: {parsed}")
                else:
                    print(f"Data is already type: {type(e['equipment'])}")
            except Exception as err:
                print(f"JSON Parse Error: {err}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_event_requests()
