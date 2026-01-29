import sys
import os
sys.path.append(os.getcwd())

from backend.property_custodian_connector import connector

def inspect_consumables():
    try:
        conn = connector.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        print("--- Consumables Structure & Data ---")
        cursor.execute("SELECT * FROM bcp_sms4_consumable LIMIT 5")
        rows = cursor.fetchall()
        for row in rows:
            print(row)
            
        print(f"\nTotal Consumables Rows: {len(rows)}")
        
        cursor.execute("DESCRIBE bcp_sms4_consumable")
        schema = cursor.fetchall()
        print("\nSchema:")
        for col in schema:
            print(f"{col['Field']} - {col['Type']}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_consumables()
