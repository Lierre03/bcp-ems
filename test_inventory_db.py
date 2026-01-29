import sys
import os

# Add the current directory to sys.path so we can import backend modules
sys.path.append(os.getcwd())

def test_connector():
    try:
        from backend.property_custodian_connector import connector
        print("Testing Property Custodian Connector...")
        
        # Test Connection
        conn = connector.get_connection()
        if conn:
            print("Connection Successful!")
            conn.close()
        else:
            print("Connection Failed!")
            return

        # Test Inventory View
        print("\nTesting get_inventory_view()...")
        inventory = connector.get_inventory_view()
        print(f"Inventory Count: {len(inventory)}")
        if len(inventory) > 0:
            print("First Item Sample:", inventory[0])
            
    except Exception as e:
        print(f"\nCRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_connector()
