#!/usr/bin/env python3
"""
Migration: Add shared_with_departments column for cross-department event sharing
"""

import psycopg2
from psycopg2.extras import RealDictCursor

# Use Render external database URL
DATABASE_URL = "postgresql://school_event_management_user:eRcbN7ZSjcIA7GfEymBwXRpJL552320s@dpg-d5gd0ere5dus73dsmgc0-a.oregon-postgres.render.com/school_event_management"

try:
    # Connect to database
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    print("🔄 Starting migration: Add shared_with_departments column")
    
    # Step 1: Add column if it doesn't exist
    print("\n1. Adding shared_with_departments column...")
    cursor.execute("""
        ALTER TABLE events 
        ADD COLUMN IF NOT EXISTS shared_with_departments TEXT[] DEFAULT '{}';
    """)
    conn.commit()
    print("✅ Column added successfully")
    
    # Step 2: Migrate existing IT Department events to share with related programs
    print("\n2. Migrating existing IT Department events...")
    cursor.execute("""
        UPDATE events 
        SET shared_with_departments = ARRAY['BSIT', 'BSCS', 'BSIS']::TEXT[]
        WHERE organizing_department IN ('BSIT', 'BSCS', 'BSIS', 'IT Department', 'BSCpE')
        AND (shared_with_departments IS NULL OR shared_with_departments = '{}');
    """)
    affected_rows = cursor.rowcount
    conn.commit()
    print(f"✅ Updated {affected_rows} IT Department events to share across BSIT, BSCS, BSIS")
    
    # Step 3: Verify migration
    print("\n3. Verifying migration...")
    cursor.execute("""
        SELECT organizing_department, COUNT(*) as count, 
               COUNT(CASE WHEN shared_with_departments != '{}' THEN 1 END) as shared_count
        FROM events
        GROUP BY organizing_department
        ORDER BY organizing_department;
    """)
    results = cursor.fetchall()
    
    print("\nDepartment Event Summary:")
    print("-" * 60)
    for row in results:
        print(f"{row['organizing_department']:20} | Total: {row['count']:3} | Shared: {row['shared_count']:3}")
    
    print("\n✅ Migration completed successfully!")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"\n❌ Migration failed: {e}")
    if conn:
        conn.rollback()
    exit(1)
