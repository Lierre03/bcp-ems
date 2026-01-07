
import pymysql

# DB Config (matching config.py)
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'school_event_management',
    'port': 3306,
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor
}

def check_schema():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            print("--- Table Structure ---")
            cursor.execute("DESCRIBE event_feedback")
            for col in cursor.fetchall():
                print(col)

            print("\n--- Keys/Indices ---")
            cursor.execute("SHOW KEYS FROM event_feedback")
            for key in cursor.fetchall():
                print(f"Key: {key['Key_name']}, Column: {key['Column_name']}, Non_unique: {key['Non_unique']}")

    finally:
        conn.close()

if __name__ == "__main__":
    check_schema()
