import sys
import os
sys.path.append(os.getcwd())

from backend.property_custodian_connector import connector

def audit_inventory():
    try:
        conn = connector.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        print("=== INVENTORY AUDIT REPORT ===")
        
        # 1. Catalog Count
        cursor.execute("SELECT COUNT(*) as total FROM bcp_sms4_items")
        total_items = cursor.fetchone()['total']
        print(f"\n[Catalog] Total Unique Item Definitions (bcp_sms4_items): {total_items}")
        
        # 2. Asset Status Breakdown
        print("\n[Assets] Breakdown by Status (bcp_sms4_asset):")
        cursor.execute("SELECT status, COUNT(*) as count FROM bcp_sms4_asset GROUP BY status")
        asset_stats = cursor.fetchall()
        total_assets = 0
        for row in asset_stats:
            print(f"  - {row['status']}: {row['count']}")
            total_assets += row['count']
        print(f"  > Total Assets Record: {total_assets}")

        # 3. Consumable Status Breakdown
        print("\n[Consumables] Breakdown by Status (bcp_sms4_consumable):")
        cursor.execute("SELECT status, COUNT(*) as count FROM bcp_sms4_consumable GROUP BY status")
        consumable_stats = cursor.fetchall()
        total_consumables = 0
        for row in consumable_stats:
            print(f"  - {row['status']}: {row['count']}")
            total_consumables += row['count']
        print(f"  > Total Consumables Record: {total_consumables}")
        
        # 4. Filter Logic Check (What we are showing vs hiding)
        # Current Logic: Assets IN ('In-Storage', 'In-Use') AND Consumables != 'Expired'
        
        visible_assets = sum(r['count'] for r in asset_stats if r['status'] in ['In-Storage', 'In-Use'])
        hidden_assets = total_assets - visible_assets
        
        visible_consumables = sum(r['count'] for r in consumable_stats if r['status'] != 'Expired')
        hidden_consumables = total_consumables - visible_consumables
        
        print(f"\n[View Logic Check]")
        print(f"  - Visible Assets (In-Storage + In-Use): {visible_assets}")
        print(f"  - Hidden Assets (Damaged/Lost/Disp/etc): {hidden_assets}")
        print(f"  - Visible Consumables (Not Expired): {visible_consumables}")
        print(f"  - Hidden Consumables (Expired): {hidden_consumables}")
        
        print("\n--> Expecting to see Total Rows in UI: " + str(visible_assets + visible_consumables))

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    audit_inventory()
