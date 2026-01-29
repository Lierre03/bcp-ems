
import mysql.connector
import json

def check_equipment_column():
    try:
        conn = mysql.connector.connect(
            host="127.0.0.1",
            port=3306,
            user="root",
            password="root",
            database="school_event_management"
        )
        cursor = conn.cursor(dictionary=True)
        
        # Check an event that we reset but is not in reservations
        # Event 63 was in my previous list of reset events
        cursor.execute("SELECT id, name, equipment, equipment_approval_status FROM events WHERE id = 63")
        event = cursor.fetchone()
        
        if event:
            print(f"Event: {event['name']} (ID: {event['id']})")
            print(f"Status: {event['equipment_approval_status']}")
            print(f"Equipment JSON: {event['equipment']}")
        else:
            print("Event 63 not found.")
            
        conn.close()

    except mysql.connector.Error as err:
        print(f"Error: {err}")

if __name__ == "__main__":
    check_equipment_column()
