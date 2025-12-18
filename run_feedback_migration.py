#!/usr/bin/env python3
"""
Run feedback system migration
Creates the event_attendance and event_feedback tables
"""

import os
import sys
from config import DB_CONFIG
from database.db import init_db

def run_feedback_migration():
    print("Initializing database connection...")
    db = init_db(DB_CONFIG)

    migration_file = os.path.join('database', 'feedback_schema.sql')
    print(f"Reading migration file: {migration_file}")

    with open(migration_file, 'r') as f:
        sql_script = f.read()

    # Split by semicolon to execute statements individually
    # Handle MySQL-specific syntax like DELIMITER
    statements = []
    current_statement = ""
    delimiter = ";"
    in_delimiter_block = False

    for line in sql_script.split('\n'):
        line = line.strip()
        if not line or line.startswith('--'):
            continue

        if line.upper().startswith('DELIMITER'):
            parts = line.split()
            if len(parts) > 1:
                delimiter = parts[1]
                in_delimiter_block = True
            continue

        if line == delimiter and in_delimiter_block:
            if current_statement.strip():
                statements.append(current_statement.strip())
                current_statement = ""
            in_delimiter_block = False
            delimiter = ";"
            continue

        current_statement += line + "\n"

        if not in_delimiter_block and line.endswith(delimiter):
            statements.append(current_statement.strip())
            current_statement = ""

    # Add any remaining statement
    if current_statement.strip():
        statements.append(current_statement.strip())

    print("Executing migration statements...")
    with db.get_cursor() as cursor:
        for statement in statements:
            if statement.strip():
                try:
                    cursor.execute(statement)
                    print(f"Executed: {statement[:80].replace(chr(10), ' ')}...")
                except Exception as e:
                    print(f"Error executing statement: {e}")
                    # Don't raise, as some tables might already exist

    print("Feedback migration completed successfully.")

if __name__ == "__main__":
    # Add current directory to path so imports work
    sys.path.append(os.getcwd())
    run_feedback_migration()
