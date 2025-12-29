#!/usr/bin/env python3
"""
Add JSON columns to events table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.db import init_db
from config import Config

def add_json_columns():
    """Add JSON columns to events table"""
    init_db(Config.DB_CONFIG)
    from database.db import get_db
    db = get_db()
    
    try:
        print("Checking and adding JSON columns to events table...")
        
        # Check if budget column exists
        try:
            db.execute_update("""
                ALTER TABLE events 
                ADD COLUMN budget DECIMAL(10,2) DEFAULT 0.00 AFTER expected_attendees
            """)
            print("✓ Added 'budget' column")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("✓ 'budget' column already exists")
            else:
                print(f"Warning for budget column: {e}")
        
        # Add equipment JSON column
        try:
            db.execute_update("""
                ALTER TABLE events 
                ADD COLUMN equipment JSON DEFAULT NULL AFTER budget
            """)
            print("✓ Added 'equipment' JSON column")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("✓ 'equipment' column already exists")
            else:
                print(f"Warning for equipment column: {e}")
        
        # Add timeline JSON column
        try:
            db.execute_update("""
                ALTER TABLE events 
                ADD COLUMN timeline JSON DEFAULT NULL AFTER equipment
            """)
            print("✓ Added 'timeline' JSON column")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("✓ 'timeline' column already exists")
            else:
                print(f"Warning for timeline column: {e}")
        
        # Add budget_breakdown JSON column
        try:
            db.execute_update("""
                ALTER TABLE events 
                ADD COLUMN budget_breakdown JSON DEFAULT NULL AFTER timeline
            """)
            print("✓ Added 'budget_breakdown' JSON column")
        except Exception as e:
            if "Duplicate column name" in str(e):
                print("✓ 'budget_breakdown' column already exists")
            else:
                print(f"Warning for budget_breakdown column: {e}")
        
        # Drop old normalized tables if they exist
        print("\nRemoving old normalized tables (if they exist)...")
        try:
            db.execute_update("DROP TABLE IF EXISTS budget_breakdown")
            print("✓ Dropped old budget_breakdown table")
        except:
            pass
            
        try:
            db.execute_update("DROP TABLE IF EXISTS event_activities")
            print("✓ Dropped old event_activities table")
        except:
            pass
            
        try:
            db.execute_update("DROP TABLE IF EXISTS event_equipment")
            print("✓ Dropped old event_equipment table")
        except:
            pass
        
        print("\n✅ Migration completed successfully!")
        print("Your events table now has JSON columns for equipment, timeline, and budget_breakdown")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    add_json_columns()
