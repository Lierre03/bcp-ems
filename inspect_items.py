import sys
import os
sys.path.append(os.getcwd())

from backend.property_custodian_connector import connector

def inspect_items_schema():
    try:
        conn = connector.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        print("--- Inspecting bcp_sms4_items ---")
        cursor.execute("DESCRIBE bcp_sms4_items")
        schema = cursor.fetchall()
        for col in schema:
            print(f"{col['Field']} - {col['Type']}")
            
        print("\n--- Items by Category ---")
        cursor.execute("SELECT category, GROUP_CONCAT(item_name SEPARATOR ', ') as items FROM bcp_sms4_items GROUP BY category")
        cats = cursor.fetchall()
        for c in cats:
            print(f"[{c['category']}]: {c['items']}")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_items_schema()
