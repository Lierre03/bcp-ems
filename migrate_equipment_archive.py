#!/usr/bin/env python3
"""
Migration script to add archive functionality to equipment table
"""
import psycopg2
import os

# Render PostgreSQL connection string
DATABASE_URL = os.getenv('DATABASE_URL', 
    'postgresql://school_event_management_user:eRcbN7ZSjcIA7GfEymBwXRpJL552320s@dpg-d5gd0ere5dus73dsmgc0-a.oregon-postgres.render.com/school_event_management'
)

def run_migration():
    """Run the equipment archive migration"""
    try:
        print("Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("\n=== Adding archive columns to equipment table ===")
        cursor.execute("""
            ALTER TABLE equipment 
            ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS archived_by INTEGER,
            ADD COLUMN IF NOT EXISTS archive_reason TEXT
        """)
        print("✓ Archive columns added")
        
        print("\n=== Creating equipment_quantity_logs table ===")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS equipment_quantity_logs (
                id SERIAL PRIMARY KEY,
                equipment_id INTEGER NOT NULL,
                change_type VARCHAR(10) NOT NULL CHECK (change_type IN ('ADD', 'REDUCE')),
                quantity_change INTEGER NOT NULL,
                reason TEXT,
                changed_by INTEGER,
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                previous_quantity INTEGER NOT NULL,
                new_quantity INTEGER NOT NULL
            )
        """)
        print("✓ Quantity logs table created")
        
        print("\n=== Creating indexes ===")
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_equipment_archived ON equipment(archived)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_quantity_logs_equipment ON equipment_quantity_logs(equipment_id)
        """)
        print("✓ Indexes created")
        
        conn.commit()
        
        print("\n=== Verifying migration ===")
        cursor.execute("""
            SELECT column_name, data_type, is_nullable, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'equipment' 
            AND column_name IN ('archived', 'archived_at', 'archived_by', 'archive_reason')
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        print("\nEquipment table columns:")
        for col in columns:
            print(f"  - {col[0]} ({col[1]})")
        
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'equipment_quantity_logs'
            ORDER BY ordinal_position
        """)
        
        log_columns = cursor.fetchall()
        print("\nQuantity logs table columns:")
        for col in log_columns:
            print(f"  - {col[0]} ({col[1]})")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Migration completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    run_migration()
