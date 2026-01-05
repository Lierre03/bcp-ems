
import pymysql
import os

# Default config from config.py
DB_CONFIG = {
    'host': os.environ.get('DB_HOST') or 'localhost',
    'user': os.environ.get('DB_USER') or 'root',
    'password': os.environ.get('DB_PASSWORD') or '',
    'database': os.environ.get('DB_NAME') or 'school_event_management',
    'port': int(os.environ.get('DB_PORT') or 3306),
    'charset': 'utf8mb4'
}

def inspect_mysql():
    try:
        print(f"Connecting to MySQL: {DB_CONFIG['user']}@{DB_CONFIG['host']}/{DB_CONFIG['database']}")
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Get all tables
        cursor.execute("SHOW TABLES;")
        tables = cursor.fetchall()
        print("\nTables found:")
        table_names = [t[0] for t in tables]
        for t in table_names:
            print(f"- {t}")
        
        # Check key tables schemas
        key_tables = ['users', 'events', 'equipment', 'attendance', 'venues', 'notifications']
        
        print("\n\nSchema Details:")
        for table_name in key_tables:
            if table_name in table_names:
                print(f"\n--- Table: {table_name} ---")
                cursor.execute(f"SHOW CREATE TABLE {table_name};")
                schema = cursor.fetchone()
                print(schema[1]) # The Create Table statement
            else:
                print(f"\n--- Table: {table_name} ---")
                print("(Table NOT found in MySQL)")

        conn.close()
    except Exception as e:
        print(f"Error connecting to MySQL: {e}")

if __name__ == "__main__":
    inspect_mysql()
