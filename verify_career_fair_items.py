
import mysql.connector

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
print("--- Finding Event ---")
cursor.execute("SELECT id, name, start_datetime FROM events WHERE name LIKE '%Career fair%'")
events = cursor.fetchall()

if not events:
    print("Event 'Career fair' not found.")
else:
    for event in events:
        print(f"Event ID: {event['id']}, Name: {event['name']}, Date: {event['start_datetime']}")
        event_id = event['id']

        # Now check reservations in the other DB
        print(f"\n--- Reservations for Event {event_id} ---")
        try:
            cursor.execute(f"""
                SELECT 
                    r.id, r.asset_id, r.status,
                    a.property_tag,
                    i.item_name
                FROM bcp_sms4_pcm.event_asset_reservations r
                JOIN bcp_sms4_pcm.bcp_sms4_asset a ON r.asset_id = a.asset_id
                JOIN bcp_sms4_pcm.bcp_sms4_items i ON a.item_id = i.item_id
                WHERE r.event_id = {event_id}
            """)
            reservations = cursor.fetchall()
            
            if not reservations:
                print("No reservations found for this event.")
            else:
                print(f"Total Reservations: {len(reservations)}")
                for res in reservations:
                    print(f"- {res['item_name']} (Tag: {res['property_tag']}) [{res['status']}]")
        except Exception as e:
            print(f"Error querying reservations: {e}")

conn.close()
