import sys
import os

# Add backend to sys.path so we can import 'app' and it can find its dependencies
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from database.db import get_db
from app import create_app
import json

app = create_app()

def inspect_data():
    with app.app_context():
        db = get_db()
        
        print("=== CATEGORIES ===")
        cats = db.execute_query("SELECT DISTINCT category FROM equipment ORDER BY category")
        for c in cats:
            print(f"- {c['category']}")
            
        print("\n=== EQUIPMENT IN TARGET CATEGORIES ===")
        target_cats = ['Amenities', 'Facilities & Amenities', 'Furniture', 'Furniture & Setup']
        
        for cat in target_cats:
            print(f"\n--- {cat} ---")
            items = db.execute_query("SELECT id, name, total_quantity, category FROM equipment WHERE category = %s ORDER BY name", (cat,))
            for i in items:
                print(f"ID: {i['id']}, Name: '{i['name']}', Qty: {i['total_quantity']}")

        print("\n=== EVENT EQUIPMENT JSON SAMPLE ===")
        events = db.execute_query("SELECT id, equipment FROM events WHERE equipment IS NOT NULL AND equipment != '[]' LIMIT 3")
        for e in events:
            print(f"Event ID: {e['id']}")
            print(e['equipment'])

if __name__ == '__main__':
    inspect_data()
