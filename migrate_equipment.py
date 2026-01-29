import sys
import os
import json
import uuid
import random
import datetime

sys.path.append(os.getcwd())

from database.db import get_db, init_db
from config import config
from backend.property_custodian_connector import connector

# Category Mapping (Event System -> Property Custodian)
CATEGORY_MAP = {
    'IT': 'Electronics',
    'Electronics': 'Electronics',
    'Sound System': 'Electronics',
    'Furniture': 'Furniture',
    'Office Supplies': 'Office Supplies',
    'Cleaning Supplies': 'Cleaning Supplies',
    'Others': 'Others'
}

def migrate_equipment():
    # 1. Connect to Source DB (School Event Management)
    print("--- Connecting to Source DB ---")
    app_config = MockAppConfig()
    init_db(app_config.DB_CONFIG)
    source_db = get_db()
    
    # Fetch all active equipment
    source_items = source_db.execute_query("SELECT * FROM equipment WHERE archived = 0")
    print(f"Found {len(source_items)} items in source database.")

    # 2. Connect to Destination DB (Property Custodian)
    print("\n--- Connecting to Destination DB ---")
    dest_conn = connector.get_connection()
    dest_cursor = dest_conn.cursor(dictionary=True)
    
    migrated_count = 0
    skipped_count = 0

    for item in source_items:
        name = item['name']
        source_cat = item['category']
        qty = item['total_quantity']
        
        # Map Category
        dest_cat = CATEGORY_MAP.get(source_cat, 'Others')
        
        # Check if item exists
        dest_cursor.execute("SELECT item_id FROM bcp_sms4_items WHERE item_name = %s", (name,))
        existing = dest_cursor.fetchone()
        
        if existing:
            print(f"[SKIP] Item '{name}' already exists (ID: {existing['item_id']})")
            skipped_count += 1
            continue
            
        print(f"[MIGRATE] Creating Item '{name}' (Category: {dest_cat}, Qty: {qty})...")
        
        # Insert into Items Table
        # We assume they are CONSUMABLES for now because creating ASSETS requires generating unique property tags for each qty
        # Strategy: Register as Consumable (Bulk) to be safe. User can convert later or we can prompt.
        # Given the prompt "properly inserted", let's make a judgment:
        # If Qty > 1, treating as Consumable is safer for bulk migration.
        # But 'Laptop' is definitely an Asset.
        
        # Better Strategy:
        # 1. Insert into bcp_sms4_items (as Asset or Consumable based on name heuristic?)
        # Let's default to 'Asset' for Electronics/Furniture and 'Consumable' for Supplies.
        
        item_type = 'Asset'
        if dest_cat in ['Office Supplies', 'Cleaning Supplies']:
            item_type = 'Consumable'
            
        # Insert Item Definition
        insert_item_sql = """
            INSERT INTO bcp_sms4_items 
            (item_name, category, item_type, unit, supplier_name, last_consumption_rate, criticality_id, stock_critical, stock_low, stock_medium, stock_high)
            VALUES (%s, %s, %s, 'units', 'Migrated Source', 0, 2, 5, 10, 20, 50)
        """
        dest_cursor.execute(insert_item_sql, (name, dest_cat, item_type))
        new_item_id = dest_cursor.lastrowid
        
        # Insert Quantity
        if item_type == 'Consumable':
            # Insert into Consumables
            insert_cons_sql = """
                INSERT INTO bcp_sms4_consumable 
                (item_id, unit, quantity, status, date_received, acquisition_type_id)
                VALUES (%s, 'units', %s, 'Available', NOW(), 1)
            """
            dest_cursor.execute(insert_cons_sql, (new_item_id, qty))
            
        else:
            # Insert IGNORE individual assets
            # We must generate unique property tags for each of the QTY
            # Format: MIG-YYYY-XXXX (MIG for Migrated)
            
            for i in range(qty):
                # Generate unique tag
                unique_suffix = random.randint(1000, 9999)
                prop_tag = f"MIG-{datetime.datetime.now().year}-{new_item_id}-{unique_suffix}-{i}"
                
                insert_asset_sql = """
                    INSERT INTO bcp_sms4_asset
                    (item_id, property_tag, status, acquisition_type_id, date_registered)
                    VALUES (%s, %s, 'In-Storage', 1, NOW())
                """
                dest_cursor.execute(insert_asset_sql, (new_item_id, prop_tag))
        
        migrated_count += 1
        
    dest_conn.commit()
    dest_cursor.close()
    dest_conn.close()
    
    print(f"\nMigration Complete!")
    print(f"Migrated: {migrated_count}")
    print(f"Skipped (Already Exists): {skipped_count}")

class MockAppConfig:
    def __init__(self):
        raw_config = config['development']
        self.DB_CONFIG = raw_config.DB_CONFIG

if __name__ == "__main__":
    migrate_equipment()
