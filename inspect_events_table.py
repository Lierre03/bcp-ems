
import mysql.connector

def inspect_events():
    try:
        # Connect to school_event_management
        conn = mysql.connector.connect(
            host="127.0.0.1",
            port=3306,
            user="root",
            password="root",
            database="school_event_management"
        )
        cursor = conn.cursor(dictionary=True)
        
        print("Connected to school_event_management")
        
        # Describe events table
        print("\n--- Columns in events table ---")
        cursor.execute("DESCRIBE events")
        columns = cursor.fetchall()
        for col in columns:
            print(f"{col['Field']} ({col['Type']})")
            
        # Get data for Event 55 (Career Fair) or just recent events
        print("\n--- Recent Events Status ---")
        cursor.execute("SELECT id, name, status FROM events ORDER BY id DESC LIMIT 5")
        events = cursor.fetchall()
        for e in events:
            print(f"ID: {e['id']}, Name: {e['name']}, Status: {e['status']}")
            
        conn.close()

    except mysql.connector.Error as err:
        print(f"Error: {err}")

if __name__ == "__main__":
    inspect_events()
