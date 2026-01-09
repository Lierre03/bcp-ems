#!/usr/bin/env python3
"""
Import MySQL data to PostgreSQL on Render
Reads from local SQLite/MySQL and writes to Render PostgreSQL
"""

import psycopg
import sqlite3
import sys

# Render PostgreSQL connection
RENDER_DB_URL = "postgresql://school_event_management_user:eRcbN7ZSjcIA7GfEymBwXRpJL552320s@dpg-d5gd0ere5dus73dsmgc0-a.oregon-postgres.render.com/school_event_management"

# Local SQLite database
LOCAL_DB = "school_event_management.db"

def import_data():
    """Import data from SQLite to PostgreSQL"""
    
    print("Connecting to local SQLite database...")
    local_conn = sqlite3.connect(LOCAL_DB)
    local_cursor = local_conn.cursor()
    
    print("Connecting to Render PostgreSQL...")
    render_conn = psycopg.connect(RENDER_DB_URL)
    render_cursor = render_conn.cursor()
    
    # Get all tables
    local_cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in local_cursor.fetchall()]
    
    print(f"Found {len(tables)} tables to import")
    
    for table in tables:
        print(f"\nImporting table: {table}")
        
        # Get data from SQLite
        local_cursor.execute(f"SELECT * FROM {table}")
        rows = local_cursor.fetchall()
        
        if not rows:
            print(f"  No data in {table}")
            continue
            
        # Get column names
        local_cursor.execute(f"PRAGMA table_info({table})")
        columns = [col[1] for col in local_cursor.fetchall()]
        
        # Insert into PostgreSQL
        placeholders = ', '.join(['%s'] * len(columns))
        insert_sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
        
        success_count = 0
        for row in rows:
            try:
                render_cursor.execute(insert_sql, row)
                success_count += 1
            except Exception as e:
                print(f"  Error inserting row: {e}")
                continue
        
        render_conn.commit()
        print(f"  ✅ Imported {success_count}/{len(rows)} rows")
    
    local_conn.close()
    render_conn.close()
    
    print("\n✅ Import complete!")

if __name__ == '__main__':
    try:
        import_data()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
