import sys
import os
sys.path.append(os.getcwd())

import json
from database.db import get_db, init_db
from config import config

# Initialize DB connection for School Event Management (Source)
class MockApp:
    config = {}

def inspect_source_equipment():
    try:
        # Setup config - explicitly copy dict to avoid mappingproxy issue
        app = MockApp()
        raw_config = config['development']
        app.config = dict(raw_config.__dict__) if hasattr(raw_config, '__dict__') else {}
        # Manually ensure DB_CONFIG is there if not in __dict__
        if not app.config.get('DB_CONFIG'):
             app.config['DB_CONFIG'] = raw_config.DB_CONFIG
        
        init_db(app.config['DB_CONFIG'])
        db = get_db()
        
        print("--- Inspecting School Event Management Equipment ---")
        
        # Check if 'equipment' table exists and has data
        try:
            print("\n[Table: equipment]")
            data = db.execute_query("SELECT * FROM equipment LIMIT 5")
            if data:
                print(f"Found {len(data)} rows.")
                print(data[0])
            else:
                print("Table exists but is empty.")
                
                # If empty, maybe data is in 'events' table JSON?
                print("\n[Checking 'events' table for JSON equipment]")
                events = db.execute_query("SELECT equipment FROM events WHERE equipment IS NOT NULL AND equipment != '[]' LIMIT 3")
                for e in events:
                    print(e['equipment'])
        except Exception as e:
            print(f"Table 'equipment' error: {e}")

    except Exception as e:
        print(f"Connection Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    inspect_source_equipment()
