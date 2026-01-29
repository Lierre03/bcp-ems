from database.db import get_db, init_db
from config import Config
import json

def debug_events():
    try:
        init_db(Config.DB_CONFIG)
        db = get_db()
        query = "SELECT id, name, status, equipment FROM events"
        events = db.execute_query(query)
        
        print(f"Found {len(events)} events.")
        for e in events:
            print(f"ID: {e['id']}, Name: {e['name']}, Status: {e['status']}")
            print(f"Raw Equipment: {e['equipment']}")
            try:
                parsed = json.loads(e['equipment']) if isinstance(e['equipment'], str) else e['equipment']
                print(f"Parsed: {parsed}")
                if isinstance(parsed, list):
                    for item in parsed:
                        print(f" - Item: {item.get('name')}, Qty: {item.get('qty')}")
            except Exception as err:
                print(f"Parsing error: {err}")
            print("-" * 20)
            
    except Exception as e:
        print(f"Database Error: {e}")

if __name__ == "__main__":
    debug_events()
