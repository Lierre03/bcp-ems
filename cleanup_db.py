import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))

from database.db import get_db
from app import create_app

app = create_app()

def cleanup_categories():
    with app.app_context():
        db = get_db()
        
        target_map = {
            'Amenities': 'Facilities & Amenities',
            'Furniture': 'Furniture & Setup'
        }
        
        print("Starting cleanup...")
        
        for source_cat, target_cat in target_map.items():
            print(f"\nProcessing {source_cat} -> {target_cat}")
            
            # Get all items in source category
            source_items = db.execute_query(
                "SELECT id, name, total_quantity, category FROM equipment WHERE category = %s", 
                (source_cat,)
            )
            
            if not source_items:
                print(f"No items found in {source_cat}")
                continue
                
            for s_item in source_items:
                # Check if item exists in target category
                t_item = db.execute_one(
                    "SELECT id, name, total_quantity FROM equipment WHERE category = %s AND name = %s",
                    (target_cat, s_item['name'])
                )
                
                if t_item:
                    # MERGE: Update target, delete source
                    new_qty = t_item['total_quantity'] + s_item['total_quantity']
                    
                    # Update target
                    db.execute_update(
                        "UPDATE equipment SET total_quantity = %s WHERE id = %s",
                        (new_qty, t_item['id'])
                    )
                    
                    # Delete source
                    db.execute_update(
                        "DELETE FROM equipment WHERE id = %s",
                        (s_item['id'],)
                    )
                    
                    print(f"[MERGE] {s_item['name']}: ID {s_item['id']} ({s_item['total_quantity']}) -> ID {t_item['id']} (New Total: {new_qty})")
                    
                else:
                    # MOVE: Update category
                    db.execute_update(
                        "UPDATE equipment SET category = %s WHERE id = %s",
                        (target_cat, s_item['id'])
                    )
                    
                    print(f"[MOVE] {s_item['name']} (ID {s_item['id']}) moved to {target_cat}")

        print("\nCleanup complete.")

if __name__ == '__main__':
    cleanup_categories()
