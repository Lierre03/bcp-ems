
import mysql.connector
import sys

def check_mysql():
    print("Checking MySQL Connection...")
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="school_event_management",
            port=3306
        )
        print("SUCCESS: Connected to MySQL database 'school_event_management'")
        
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"Found {len(tables)} tables:")
        for table in tables:
            print(f" - {table[0]}")
            
        conn.close()
        return True
    except Exception as e:
        print(f"ERROR: Failed to connect to MySQL: {e}")
        return False

if __name__ == "__main__":
    check_mysql()
