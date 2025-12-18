
import pymysql
import json

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'school_event_management',
    'port': 3306,
    'charset': 'utf8mb4'
}

def check_students_table():
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # Check if students table exists
        cursor.execute("SHOW TABLES LIKE 'students'")
        result = cursor.fetchone()
        
        if result:
            print("Table 'students' FOUND.")
            cursor.execute("DESCRIBE students")
            columns = cursor.fetchall()
            print("Columns:")
            for col in columns:
                print(f"  - {col[0]} ({col[1]})")
        else:
            print("Table 'students' NOT FOUND.")
            
            # List all tables just in case
            print("\nAll tables:")
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            for t in tables:
                print(f"  - {t[0]}")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn.open:
            conn.close()

if __name__ == "__main__":
    check_students_table()
