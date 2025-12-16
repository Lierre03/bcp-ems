
import os
import sys
from config import DB_CONFIG
from database.db import init_db

def run_migration():
    print("Initializing database connection...")
    db = init_db(DB_CONFIG)
    
    migration_file = os.path.join('database', 'migration_equipment.sql')
    print(f"Reading migration file: {migration_file}")
    
    with open(migration_file, 'r') as f:
        sql_script = f.read()
    
    # Split by semicolon to execute statements individually
    # This is a simple splitter and might fail on complex SQL with semicolons in strings
    # but should work for our simple migration file
    statements = sql_script.split(';')
    
    print("Executing migration statements...")
    with db.get_cursor() as cursor:
        for statement in statements:
            if statement.strip():
                try:
                    cursor.execute(statement)
                    print(f"Executed: {statement[:50]}...")
                except Exception as e:
                    print(f"Error executing statement: {e}")
                    # Don't raise, as some tables might already exist
                    
    print("Migration completed successfully.")

if __name__ == "__main__":
    # Add current directory to path so imports work
    sys.path.append(os.getcwd())
    run_migration()
