
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

def inspect_attendance():
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("\n--- Table: event_attendance ---")
        cursor.execute(f"SHOW CREATE TABLE event_attendance;")
        schema = cursor.fetchone()
        if schema:
            print(schema[1])
        else:
            print("Table not found")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_attendance()
