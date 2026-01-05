#!/usr/bin/env python3
"""Add check_in_method column to event_attendance table"""
import sys
sys.path.append('.')
from config import Config
from database.db import init_db

def main():
    print("Adding check_in_method column to event_attendance...")
    db = init_db(Config.DB_CONFIG)
    
    with db.get_cursor() as cursor:
        # Check if column exists
        cursor.execute("""
            SELECT COUNT(*) as count FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = 'school_event_management' 
            AND TABLE_NAME = 'event_attendance' 
            AND COLUMN_NAME = 'check_in_method'
        """)
        exists = cursor.fetchone()['count'] > 0
        
        if exists:
            print("✓ Column already exists")
        else:
            cursor.execute("""
                ALTER TABLE event_attendance 
                ADD COLUMN check_in_method ENUM('QR', 'Manual') DEFAULT 'QR' 
                AFTER check_in_datetime
            """)
            print("✓ Column added successfully")
    
    print("\nDone!")

if __name__ == "__main__":
    main()
