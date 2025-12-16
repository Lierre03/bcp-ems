
import pymysql

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'school_event_management',
    'port': 3306,
    'charset': 'utf8mb4'
}

def inspect_db():
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        tables = ['events', 'users', 'budgets', 'event_equipment', 'equipment']
        
        for table in tables:
            print(f"\n--- Table: {table} ---")
            try:
                cursor.execute(f"DESCRIBE {table}")
                columns = cursor.fetchall()
                for col in columns:
                    print(f"{col[0]} {col[1]}")
            except Exception as e:
                print(f"Error describing {table}: {e}")
                
        conn.close()
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    inspect_db()
