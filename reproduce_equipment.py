
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from rebuild.database.db import get_db, init_db
from rebuild.config import Config

def reproduce_equipment():
    init_db(Config.DB_CONFIG)
    db = get_db()
    
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
    
    try:
        print("Executing equipment query...")
        equipment = db.execute_query(query)
        print(f"Success! Retrieved {len(equipment)} items.")
        for item in equipment:
            print(item)
    except Exception as e:
        print(f"Query failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reproduce_equipment()
