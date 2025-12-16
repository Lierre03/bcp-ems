from database.db import get_db, init_db
from config import Config
import json
import decimal
from datetime import date, datetime, timedelta

def test_endpoints():
    init_db(Config.DB_CONFIG)
    db = get_db()
    
    print("\n=== TESTING /api/venues/equipment ===")
    try:
        query = """
            SELECT 
                e.id, e.name, e.category, e.total_quantity, e.status,
                COALESCE(SUM(CASE 
                    WHEN ev.status IN ('Approved', 'Ongoing') AND ev.deleted_at IS NULL 
                    THEN ee.quantity ELSE 0 END), 0) as in_use,
                GROUP_CONCAT(DISTINCT CASE 
                    WHEN ev.status IN ('Approved', 'Ongoing') AND ev.deleted_at IS NULL 
                    THEN ev.name END SEPARATOR ', ') as used_by_events
            FROM equipment e
            LEFT JOIN event_equipment ee ON e.name = ee.equipment_name
            LEFT JOIN events ev ON ee.event_id = ev.id
            GROUP BY e.id
            ORDER BY e.category, e.name
        """
        equipment = db.execute_query(query)
        
        # Simulate the processing loop
        for item in equipment:
            item['in_use'] = int(item['in_use'])
            item['available'] = item['total_quantity'] - item['in_use']
            item['used_by'] = item['used_by_events'] if item['used_by_events'] else '—'
            
            if item['available'] <= 0:
                item['status'] = 'Out of Stock'
            elif item['available'] < item['total_quantity']:
                item['status'] = 'In Use'
            else:
                item['status'] = 'In Stock'
        
        print("SUCCESS: Retrieved equipment count:", len(equipment))
        # Try to serialize without default=str to mimic Flask jsonify
        json.dumps(equipment)
        print("SUCCESS: Equipment serialization check passed")
        
    except Exception as e:
        print(f"ERROR in equipment: {e}")
        import traceback
        traceback.print_exc()

    print("\n=== TESTING /api/events ===")
    try:
        query = """
            SELECT e.id, 
                   e.name,
                   e.event_type as type,
                   DATE_FORMAT(e.start_datetime, '%%Y-%%m-%%d') as date,
                   DATE_FORMAT(e.end_datetime, '%%Y-%%m-%%d') as endDate,
                   DATE_FORMAT(e.start_datetime, '%%H:%%i') as startTime,
                   DATE_FORMAT(e.end_datetime, '%%H:%%i') as endTime,
                   e.expected_attendees as attendees,
                   e.status,
                   e.description,
                   e.venue,
                   COALESCE(b.total_budget, 0) as budget,
                   COALESCE(e.organizer, CONCAT(u.first_name, ' ', u.last_name)) as organizer,
                   u.username as requestor_username,
                   e.requestor_id
            FROM events e
            JOIN users u ON e.requestor_id = u.id
            LEFT JOIN budgets b ON e.id = b.event_id
            WHERE e.deleted_at IS NULL
            ORDER BY e.start_datetime DESC
        """
        events = db.execute_query(query)
        
        # Simulate the processing loop
        for e in events:
            if e.get('budget') is not None:
                e['budget'] = float(e['budget'])
                
        print("SUCCESS: Retrieved events count:", len(events))
        # Try to serialize to JSON to catch any other serialization errors
        json.dumps(events, default=str)
        print("SUCCESS: Events serialization check passed")
        
    except Exception as e:
        print(f"ERROR in events: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_endpoints()
