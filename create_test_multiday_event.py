import sys
sys.path.insert(0, '/home/ivy/Documents/School-Event-Management-Commision/rebuild')

import pymysql
from config import Config
import json

# Connect to database
conn = pymysql.connect(
    host=Config.DB_CONFIG['host'],
    user=Config.DB_CONFIG['user'],
    password=Config.DB_CONFIG['password'],
    database=Config.DB_CONFIG['database'],
    cursorclass=pymysql.cursors.DictCursor
)
cursor = conn.cursor()

# Create multi-day event
event_data = {
    'name': 'Annual STEM Innovation Fair 2026',
    'event_type': 'Workshop',
    'description': 'Three-day science, technology, engineering, and mathematics exhibition featuring student projects, workshops, and industry talks. Day 1: Setup and opening ceremony, Day 2: Main exhibition and workshops, Day 3: Awards and closing.',
    'start_datetime': '2026-03-10 08:00:00',
    'end_datetime': '2026-03-12 17:00:00',
    'venue': 'Gymnasium',
    'organizer': 'Science Department',
    'expected_attendees': 250,
    'budget': 12500,
    'status': 'Rejected',
    'venue_approval_status': 'Rejected',
    'equipment_approval_status': 'Pending',
    'organizing_department': 'Science Department',
    'conflict_resolution_note': 'Another event was approved for Gymnasium at this time slot.'
}

# Get a requestor user ID
cursor.execute("SELECT id FROM users WHERE role_id = (SELECT id FROM roles WHERE name = 'Requestor') LIMIT 1")
requestor = cursor.fetchone()
if not requestor:
    print("No requestor user found. Using first available user...")
    cursor.execute("SELECT id FROM users LIMIT 1")
    any_user = cursor.fetchone()
    requestor_id = any_user['id'] if any_user else 1
else:
    requestor_id = requestor['id']

# JSON fields
equipment = [
    {'item': 'Projector', 'quantity': 3},
    {'item': 'Sound System', 'quantity': 2},
    {'item': 'Display Booths', 'quantity': 20},
    {'item': 'Tables', 'quantity': 30},
    {'item': 'Chairs', 'quantity': 100}
]

timeline = [
    {'time': '08:00', 'activity': 'Setup and Registration - Day 1', 'description': 'Participants set up booths'},
    {'time': '10:00', 'activity': 'Opening Ceremony', 'description': 'Welcome speech and fair overview'},
    {'time': '11:00', 'activity': 'Exhibition Day 1', 'description': 'Project displays and demonstrations'},
    {'time': '08:00', 'activity': 'Day 2 - Main Exhibition', 'description': 'Peak exhibition hours'},
    {'time': '13:00', 'activity': 'Workshop Sessions', 'description': 'Hands-on STEM workshops'},
    {'time': '08:00', 'activity': 'Day 3 - Final Day', 'description': 'Last day of exhibition'},
    {'time': '14:00', 'activity': 'Awards Ceremony', 'description': 'Recognizing outstanding projects'},
    {'time': '16:00', 'activity': 'Closing and Teardown', 'description': 'Event conclusion'}
]

budget_breakdown = {
    'Venue Rental': 4500,
    'Equipment Rental': 2000,
    'Materials & Supplies': 2500,
    'Catering (3 days)': 2000,
    'Awards & Prizes': 1000,
    'Marketing': 500
}

additional_resources = [
    {'type': 'Staff', 'details': '5 volunteers per day'},
    {'type': 'Parking', 'details': 'Reserved parking for exhibitors'},
    {'type': 'Security', 'details': '24/7 security during event'}
]

# Insert event
cursor.execute("""
    INSERT INTO events (
        name, event_type, description, start_datetime, end_datetime,
        venue, organizer, expected_attendees, budget, status,
        venue_approval_status, equipment_approval_status,
        organizing_department, requestor_id, conflict_resolution_note,
        equipment, timeline, budget_breakdown, additional_resources,
        created_at, updated_at
    ) VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
    )
""", (
    event_data['name'], event_data['event_type'], event_data['description'],
    event_data['start_datetime'], event_data['end_datetime'],
    event_data['venue'], event_data['organizer'], event_data['expected_attendees'],
    event_data['budget'], event_data['status'], event_data['venue_approval_status'],
    event_data['equipment_approval_status'], event_data['organizing_department'],
    requestor_id, event_data['conflict_resolution_note'],
    json.dumps(equipment), json.dumps(timeline), json.dumps(budget_breakdown),
    json.dumps(additional_resources)
))

conn.commit()
event_id = cursor.lastrowid

cursor.close()
conn.close()

print(f"✅ Multi-day event created successfully!")
print(f"Event ID: {event_id}")
print(f"Event Name: {event_data['name']}")
print(f"Duration: March 10-12, 2026 (3 days)")
print(f"Venue: {event_data['venue']}")
print(f"Status: {event_data['status']}")
print(f"\nTo test reschedule:")
print(f"1. Go to the admin dashboard")
print(f"2. Look for notifications about this rejected event")
print(f"3. Click 'Reschedule' to test the multi-day reschedule feature")
print(f"4. Or navigate to: #/reschedule/{event_id}")
