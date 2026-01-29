
import mysql.connector
import json

def diagnose_events():
    print("--- DIAGNOSTIC START ---")
    
    # 1. Connect to Event DB to find the Event IDs
    try:
        conn = mysql.connector.connect(user='root', password='root', database='school_event_management')
        cursor = conn.cursor(dictionary=True)
        
        # Find 'career fair' and 'Tech Conference'
        cursor.execute("SELECT id, name, start_datetime, equipment_approval_status, equipment FROM events WHERE name LIKE '%career%' OR name LIKE '%Tech%'")
        events = cursor.fetchall()
        
        event_ids = []
        if not events:
            print("No matching events found in 'school_event_management.events'")
        else:
            for e in events:
                print(f"\nEVENT Found: ID={e['id']}, Name='{e['name']}', Status='{e['equipment_approval_status']}'")
                event_ids.append(e['id'])
                # Check status
                
        conn.close()
    except Exception as e:
        print(f"Error connecting to Events DB: {e}")
        return

    # 2. Connect to Inventory DB to check Reservations
    if event_ids:
        try:
            conn_inv = mysql.connector.connect(user='root', password='root', database='bcp_sms4_pcm')
            cursor_inv = conn_inv.cursor(dictionary=True)
            
            format_ids = ','.join(map(str, event_ids))
            query = f"SELECT event_id, COUNT(*) as reserved_count, MAX(status) as status FROM event_asset_reservations WHERE event_id IN ({format_ids}) GROUP BY event_id"
            
            cursor_inv.execute(query)
            reservations = cursor_inv.fetchall()
            
            print("\n--- RESERVATIONS (bcp_sms4_pcm.event_asset_reservations) ---")
            reserved_map = {r['event_id']: r for r in reservations}
            
            for eid in event_ids:
                if eid in reserved_map:
                    print(f"Event {eid}: {reserved_map[eid]['reserved_count']} items reserved. Status: {reserved_map[eid]['status']}")
                else:
                    print(f"Event {eid}: NO RESERVATIONS found.")
                    
            conn_inv.close()
            
        except Exception as e:
            print(f"Error connecting to Inventory DB: {e}")

if __name__ == "__main__":
    diagnose_events()
