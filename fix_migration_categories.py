import sys
import os
sys.path.append(os.getcwd())

from backend.property_custodian_connector import connector

# Correction Map: Item Name -> New Correct Category
CORRECTIONS = {
    'Fire Extinguisher': 'Safety',
    'First Aid Kits': 'Safety',
    'Safety barricades': 'Safety',
    'Water Dispenser': 'Amenities',
    'Trash Bins': 'Amenities',
    'Basketball': 'Sports Equipment',
    'Volleyball': 'Sports Equipment',
    'Badminton racket': 'Sports Equipment',
    'Sports net': 'Sports Equipment',
    'Whiteboard': 'Furniture',
    'Chairs': 'Furniture',
    'Tables': 'Furniture',
    'Podium': 'Furniture',
    'Stage': 'Furniture',
    'Projector': 'Electronics',
    'Speaker': 'Electronics',
    'Microphone': 'Electronics',
    'Screen': 'Electronics',
    'Camera': 'Electronics',
    'Lighting': 'Electronics',
    'Scoreboard': 'Electronics'
}

def fix_categories():
    try:
        conn = connector.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        print("--- Fixing Migration Categories ---")
        
        updated_count = 0
        
        for item_name, new_category in CORRECTIONS.items():
            # Check if item exists first
            cursor.execute("SELECT item_id, category FROM bcp_sms4_items WHERE item_name = %s", (item_name,))
            item = cursor.fetchone()
            
            if item:
                old_category = item['category']
                if old_category != new_category:
                    print(f"Updating '{item_name}': {old_category} -> {new_category}")
                    cursor.execute("UPDATE bcp_sms4_items SET category = %s WHERE item_id = %s", (new_category, item['item_id']))
                    updated_count += 1
                else:
                    print(f"Skipping '{item_name}': Already {new_category}")
            else:
                print(f"Warning: Item '{item_name}' not found.")
        
        conn.commit()
        print(f"\nTotal Updated: {updated_count}")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_categories()
