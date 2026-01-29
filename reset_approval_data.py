
import mysql.connector

def get_connection(db_name):
    return mysql.connector.connect(
        host='localhost',
        user='root',
        password='root',
        database=db_name,
        port=3306,
        autocommit=True
    )

def reset_latest_events():
    print("--- Resetting Latest Event for Testing ---")
    
    # 1. Connect to Event DB
    try:
        conn_events = get_connection('school_event_management')
        cursor_events = conn_events.cursor(dictionary=True)
        print("Connected to Event DB.")
    except Exception as e:
        print(f"Failed to connect to Event DB: {e}")
        return

    # 2. Connect to Property DB
    try:
        conn_props = get_connection('bcp_sms4_pcm')
        cursor_props = conn_props.cursor(dictionary=True)
        print("Connected to Property DB.")
    except Exception as e:
        print(f"Failed to connect to Property DB: {e}")
        conn_events.close()
        return

    # 3. Get specific events requested by user
    # "Esports Tournament 2026" or "Test Event Update"
    query = """
        SELECT id, name, status, equipment_approval_status 
        FROM events 
        WHERE name LIKE '%Esports%' OR name LIKE '%Test Event Update%' OR name LIKE '%Student Council%'
        ORDER BY id DESC
    """
    cursor_events.execute(query)
    events = cursor_events.fetchall()
    
    if not events:
        print("No events found.")
        return

    print(f"Found {len(events)} recent events.")
    
    for event in events:
        event_id = event['id']
        print(f"\nProcessing Event: {event['name']} (ID: {event_id})")
        
        # 4. Find assets in Property DB
        cursor_props.execute("SELECT asset_id FROM event_asset_reservations WHERE event_id = %s", (event_id,))
        reservations = cursor_props.fetchall()
        asset_ids = [r['asset_id'] for r in reservations]
        
        if asset_ids:
            print(f" - Found {len(asset_ids)} reserved assets in Property DB. Freeing them...")
            
            # 5. Update Asset Status (Property DB)
            placeholders = ', '.join(['%s'] * len(asset_ids))
            cursor_props.execute(f"UPDATE bcp_sms4_asset SET status = 'In-Storage', assigned_to = NULL WHERE asset_id IN ({placeholders})", tuple(asset_ids))
            
            # 6. Delete Reservations (Property DB)
            cursor_props.execute("DELETE FROM event_asset_reservations WHERE event_id = %s", (event_id,))
            print(" - Reservations deleted.")
        else:
            print(" - No reservations found in Property DB.")
            
        # 7. Reset Event Status (Event DB)
        cursor_events.execute(
            "UPDATE events SET status = 'Approved', equipment_approval_status = 'Pending' WHERE id = %s", 
            (event_id,)
        )
        cursor_events.execute("DELETE FROM notifications WHERE event_id = %s", (event_id,))
        print(" - Event status reset and notifications cleared in Event DB.")

    conn_events.close()
    conn_props.close()
    print("\nDone.")

if __name__ == "__main__":
    reset_latest_events()
