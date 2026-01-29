import sys
import os
sys.path.append(os.getcwd())

from backend.property_custodian_connector import connector

def inspect_asset_schema():
    try:
        conn = connector.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        print("--- Inspecting bcp_sms4_asset ---")
        cursor.execute("DESCRIBE bcp_sms4_asset")
        schema = cursor.fetchall()
        for col in schema:
            print(f"{col['Field']} - {col['Type']}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_asset_schema()
