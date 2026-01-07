
import pymysql
import json
import datetime

# DB Config (matching config.py)
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'school_event_management',
    'port': 3306,
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'autocommit': True
}

class DateTimeEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, datetime.datetime):
            return o.isoformat()
        return super().default(o)

def simulate_read():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # Simulate IT Admin
            user_dept = 'IT Department'
            
            print(f"--- Simulating GET /department for {user_dept} ---")
            
            # Sub-dept Logic
            dept_condition = "AND (e.organizing_department = %s OR e.organizing_department IN ('BSIT', 'BSCS', 'BSIS'))"
            params = [user_dept]
            
            query = """
                SELECT f.*, e.name as event_name, e.start_datetime, e.end_datetime,
                       u.first_name, u.last_name, u.username
                FROM event_feedback f
                JOIN events e ON f.event_id = e.id
                JOIN users u ON f.user_id = u.id
                WHERE e.deleted_at IS NULL
                {}
                ORDER BY f.created_at DESC
            """.format(dept_condition)

            cursor.execute(query, tuple(params))
            feedback_list = cursor.fetchall()

            cursor.execute(query, tuple(params))
            feedback_list = cursor.fetchall()

            # --- NEW AGGREGATION LOGIC ---
            events_map = {}
            for f in feedback_list:
                eid = f['event_id']
                if eid not in events_map:
                    events_map[eid] = {
                        'event_id': eid,
                        'event_name': f['event_name'],
                        'start_datetime': f['start_datetime'],
                        'end_datetime': f['end_datetime'],
                        'response_count': 0,
                        'ratings_sum': { 'overall': 0 },
                        'ratings_count': { 'overall': 0 },
                        'comments': []
                    }
                
                event = events_map[eid]
                event['response_count'] += 1
                
                # Check overall rating
                if f.get('overall_rating'):
                    event['ratings_sum']['overall'] += int(f['overall_rating'])
                    event['ratings_count']['overall'] += 1
                
                # Collect Comment
                if f.get('comments'):
                    event['comments'].append({
                        'user': f"{f['first_name']} {f['last_name']}", 
                        'text': f['comments']
                    })

            # Final List
            aggregated_list = []
            for eid, event in events_map.items():
                final_event = event.copy()
                del final_event['ratings_sum']
                del final_event['ratings_count']
                
                # Compute avg
                count = event['ratings_count']['overall']
                if count > 0:
                    final_event['overall_rating'] = event['ratings_sum']['overall'] / count
                else:
                    final_event['overall_rating'] = 0
                
                aggregated_list.append(final_event)

            # --- END NEW LOGIC ---

            # Print Result count
            print(f"Total Aggregated Events: {len(aggregated_list)}")
            
            # Dump JSON
            print(json.dumps(aggregated_list, cls=DateTimeEncoder, indent=2))

    finally:
        conn.close()

if __name__ == "__main__":
    simulate_read()
