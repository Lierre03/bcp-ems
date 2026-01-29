
import mysql.connector
import json

try:
    conn = mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="", # Trying empty password first, then 'root' if fails
        database="school_event_management"
    )
except:
     conn = mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="root",
        database="school_event_management"
    )

cursor = conn.cursor(dictionary=True)

# Find the event
print("--- Checking Event Requirements ---")
cursor.execute("SELECT id, name, equipment FROM events WHERE id = 55")
event = cursor.fetchone()

if event:
    print(f"Event: {event['name']} (ID: {event['id']})")
    print(f"Raw Equipment Field: {event['equipment']}")
    
    # Also check the requested_equipment table if it exists (based on previous context)
    try:
        cursor.execute(f"SELECT * FROM event_equipment WHERE event_id = 55")
        requested_items = cursor.fetchall()
        if requested_items:
            print("\n--- Requested Items (event_equipment table) ---")
            for item in requested_items:
                print(item)
        else:
            print("\nNo items found in 'event_equipment' table.")
    except Exception as e:
        print(f"Could not check event_equipment table: {e}")

else:
    print("Event 55 not found.")

conn.close()
