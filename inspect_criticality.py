import sys
import os
sys.path.append(os.getcwd())

from backend.property_custodian_connector import connector

def inspect_criticality():
    try:
        conn = connector.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        print("--- Inspecting bcp_sms4_criticality_levels ---")
        try:
            cursor.execute("SELECT * FROM bcp_sms4_criticality_levels")
            levels = cursor.fetchall()
            for l in levels:
                print(l)
        except Exception as e:
            print(f"Error fetching criticality: {e}")
            # If table name is wrong, list tables
            cursor.execute("SHOW TABLES LIKE '%criticality%'")
            print(cursor.fetchall())

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_criticality()
