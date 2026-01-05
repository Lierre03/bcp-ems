
import sqlite3
import os

DB_PATH = 'school_event_management.db'

def inspect_db():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("Tables found:")
    for t in tables:
        print(f"- {t[0]}")
    
    print("\n\nSchema Details:")
    # Get schema for key tables
    key_tables = ['users', 'events', 'equipment_inventory', 'attendance', 'venues', 'notifications']
    for table_name in key_tables:
        print(f"\n--- Table: {table_name} ---")
        cursor.execute(f"SELECT sql FROM sqlite_master WHERE type='table' AND name='{table_name}';")
        schema = cursor.fetchone()
        if schema:
            print(schema[0])
        else:
            print("(Table not found)")

    conn.close()

if __name__ == "__main__":
    inspect_db()
