
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rebuild.database.db import get_db, init_db
from rebuild.config import Config

def reproduce():
    init_db(Config.DB_CONFIG)
    db = get_db()
    
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
    
    try:
        print("Executing query...")
        events = db.execute_query(query)
        print(f"Success! Retrieved {len(events)} events.")
        for e in events:
            print(e)
    except Exception as e:
        print(f"Query failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reproduce()
