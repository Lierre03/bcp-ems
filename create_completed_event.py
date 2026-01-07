
import pymysql
import json
import datetime
import random

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

def create_event():
    conn = None
    try:
        conn = pymysql.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # 1. Use Paul directly
        student_id = 13 # Paul's ID
        
        # 2. Event Data
        event_name = "Campus Tech Showcase" # Realistic name
        start_dt = "2026-01-06 09:00:00"
        end_dt = "2026-01-06 17:00:00"
        
        # JSON Data
        timeline = [
            {"phase": "Opening", "start": "09:00", "end": "10:00", "description": "Intro"},
            {"phase": "Main Activity", "start": "10:00", "end": "16:00", "description": "Fun stuff"},
            {"phase": "Closing", "start": "16:00", "end": "17:00", "description": "Outro"}
        ]
        
        equipment = [
            {"name": "Projector", "quantity": 1}
        ]
        
        budget_breakdown = {
            "Food": {"amount": 5000, "percentage": 50},
            "Decor": {"amount": 5000, "percentage": 50}
        }
        
        additional_resources = [
            {"name": "Extra Chairs", "description": "50 chairs"}
        ]

        query = """
            INSERT INTO events (
                name, event_type, description, start_datetime, end_datetime,
                venue, organizer, expected_attendees, budget, equipment, timeline, budget_breakdown, additional_resources,
                organizing_department, status, requestor_id, created_at, updated_at, 
                venue_approval_status, equipment_approval_status
            ) VALUES (
                %s, %s, %s, %s, %s, 
                %s, %s, %s, %s, %s, %s, %s, %s, 
                %s, %s, %s, NOW(), NOW(),
                'Approved', 'Approved'
            )
        """
        
        values = (
            event_name, 'Academic', 'Annual technology showcase for student projects.', start_dt, end_dt,
            'Audio Visual Room', 'Paul Test', 100, 15000, 
            json.dumps(equipment), json.dumps(timeline), json.dumps(budget_breakdown), json.dumps(additional_resources),
            'BSIT', 'Completed', student_id
        )
        
        cursor.execute(query, values)
        event_id = cursor.lastrowid
        
        print(f"Successfully created completed event ID: {event_id}")
        print(f"Name: {event_name}")
        print(f"Date: {start_dt}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    create_event()
