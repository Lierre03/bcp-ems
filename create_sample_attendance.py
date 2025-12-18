#!/usr/bin/env python3
"""
Create sample attendance data for testing feedback system
"""

import sys
sys.path.append('.')
from config import Config
from database.db import init_db

def create_sample_attendance():
    print("Initializing database connection...")
    db = init_db(Config.DB_CONFIG)

    try:
        with db.get_cursor() as cursor:
            print('Creating sample attendance records...')

            # Get a completed event ID (or create one if none exist)
            event_check = cursor.execute("SELECT id FROM events WHERE status = 'Completed' LIMIT 1")
            event_result = cursor.fetchone()

            if not event_result:
                print('No completed events found. Creating a sample completed event...')
                # Create a sample completed event
                cursor.execute("""
                    INSERT INTO events (name, event_type, description, start_datetime, end_datetime,
                                      venue, organizer, expected_attendees, status, requestor_id)
                    VALUES ('Sample Completed Event', 'Academic',
                           'This is a sample completed event for testing feedback',
                           '2024-12-01 10:00:00', '2024-12-01 16:00:00',
                           'Auditorium', 'Test Organizer', 50, 'Completed', 1)
                """)
                event_id = cursor.lastrowid
                print(f'Created sample event with ID: {event_id}')
            else:
                event_id = event_result[0]
                print(f'Using existing completed event with ID: {event_id}')

            # Create attendance records for student users
            print('Creating attendance records...')
            cursor.execute("""
                INSERT IGNORE INTO event_attendance (event_id, user_id, check_in_datetime, attendance_status)
                SELECT %s, u.id, '2024-12-01 09:45:00', 'Present'
                FROM users u
                WHERE u.role_id = (SELECT id FROM roles WHERE name = 'Participant')
                LIMIT 3
            """, (event_id,))

            print('Sample attendance data created successfully!')

            # Check the results
            cursor.execute("""
                SELECT COUNT(*) as attendance_count
                FROM event_attendance ea
                JOIN events e ON ea.event_id = e.id
                WHERE e.status = 'Completed'
            """)
            result = cursor.fetchone()
            print(f'Total attendance records for completed events: {result[0] if result else 0}')

    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_sample_attendance()
