#!/usr/bin/env python3
"""
Migration script to add budget column to events table and create supporting tables
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.db import Database, init_db
from config import Config

def run_migration():
    """Run database migration"""
    # Initialize database
    init_db(Config.DB_CONFIG)
    from database.db import get_db
    db = get_db()
    
    try:
        print("Starting migration...")
        
        # 1. Add budget column to events table
        print("\n1. Adding budget column to events table...")
        db.execute_update("""
            ALTER TABLE events 
            ADD COLUMN IF NOT EXISTS budget DECIMAL(10,2) DEFAULT 0.00 AFTER expected_attendees
        """)
        print("✓ Budget column added successfully")
        
        # 2. Update existing events with budget from budgets table if it exists
        print("\n2. Migrating budget data from budgets table...")
        db.execute_update("""
            UPDATE events e
            LEFT JOIN budgets b ON e.id = b.event_id
            SET e.budget = COALESCE(b.total_budget, 0.00)
            WHERE b.id IS NOT NULL
        """)
        print("✓ Budget data migrated successfully")
        
        # 3. Create event_equipment table if not exists
        print("\n3. Creating event_equipment table...")
        db.execute_update("""
            CREATE TABLE IF NOT EXISTS event_equipment (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                equipment_name VARCHAR(200) NOT NULL,
                quantity INT DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                INDEX idx_event (event_id)
            ) ENGINE=InnoDB
        """)
        print("✓ event_equipment table created successfully")
        
        # 4. Create event_activities table if not exists
        print("\n4. Creating event_activities table...")
        db.execute_update("""
            CREATE TABLE IF NOT EXISTS event_activities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                activity_name VARCHAR(500) NOT NULL,
                sequence_order INT DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                INDEX idx_event (event_id),
                INDEX idx_order (event_id, sequence_order)
            ) ENGINE=InnoDB
        """)
        print("✓ event_activities table created successfully")
        
        # 5. Create budget_breakdown table if not exists
        print("\n5. Creating budget_breakdown table...")
        db.execute_update("""
            CREATE TABLE IF NOT EXISTS budget_breakdown (
                id INT AUTO_INCREMENT PRIMARY KEY,
                event_id INT NOT NULL,
                category VARCHAR(100) NOT NULL,
                amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
                INDEX idx_event (event_id),
                UNIQUE KEY unique_event_category (event_id, category)
            ) ENGINE=InnoDB
        """)
        print("✓ budget_breakdown table created successfully")
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
