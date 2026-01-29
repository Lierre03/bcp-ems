
import mysql.connector
import json

def simulate_php_query():
    print("--- SIMULATING PHP CALENDAR QUERY ---")
    try:
        # Connect to bcp_sms4_pcm (Default DB for PHP)
        conn = mysql.connector.connect(user='root', password='root', database='bcp_sms4_pcm')
        cursor = conn.cursor(dictionary=True)
        
        # This is the EXACT query from event_reservations_calendar.php
        query = """
        SELECT
            e.id as event_id,
            e.name as event_title,
            e.start_datetime,
            e.end_datetime,
            e.venue,
            e.deleted_at,
            COUNT(r.asset_id) as item_count,
            SUM(CASE WHEN r.status = 'Reserved' THEN 1 ELSE 0 END) as reserved_count,
            SUM(CASE WHEN r.status = 'Issued' THEN 1 ELSE 0 END) as issued_count
        FROM school_event_management.events e
        INNER JOIN event_asset_reservations r ON e.id = r.event_id
        WHERE e.deleted_at IS NULL
        GROUP BY e.id, e.name, e.start_datetime, e.end_datetime, e.venue
        ORDER BY e.start_datetime ASC
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        print(f"Query returned {len(results)} events.")
        print("-" * 50)
        
        found_56 = False
        for row in results:
            print(f"ID: {row['event_id']} | Title: {row['event_title']} | Date: {row['start_datetime']} | Items: {row['item_count']} | Reserved: {row['reserved_count']}")
            if row['event_id'] == 56:
                found_56 = True
                
        print("-" * 50)
        
        if not found_56:
            print("!!! Event 56 ('career fair' with 11/13 items) is MISSING from the result !!!")
            # Check why
            cursor.execute("SELECT id, name, deleted_at FROM school_event_management.events WHERE id = 56")
            e56 = cursor.fetchone()
            if e56:
                print(f"Event 56 Check: {e56}")
            else:
                print("Event 56 does not exist in events table.")
                
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    simulate_php_query()
