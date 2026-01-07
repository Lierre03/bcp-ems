
import os
import sys
import json
import logging
from datetime import datetime, timedelta

# Set up path to import app and config
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from database.db import get_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def insert_fake_event():
    """Insert a fake Freshmen Orientation event for testing"""
    app = create_app('development')
    
    with app.app_context():
        db = get_db()
        
        # 1. Find a suitable requestor (Student)
        logger.info("Looking for a Student user...")
        student = db.execute_one("""
            SELECT u.id, u.username, u.department, s.course 
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN students s ON u.id = s.user_id
            WHERE r.name IN ('Student', 'Participant')
            LIMIT 1
        """)
        
        if not student:
            # Create a dummy student if none exists
            logger.info("No student found, creating dummy student...")
            # This part is a simplified fallback; usually there should be users
            # Assuming there are users, otherwise we might fail or need to create one properly
            # Let's try to find ANY user if no student
            student = db.execute_one("SELECT id, username, department FROM users LIMIT 1")
            
        if not student:
            logger.error("No users found in database to assign as requestor.")
            return

        logger.info(f"Using requestor: {student['username']} (ID: {student['id']})")
        
        # 2. Event Details
        event_date = datetime.now().strftime('%Y-%m-%d')
        start_time = "08:00:00"
        end_time = "17:00:00"
        start_datetime = f"{event_date} {start_time}"
        end_datetime = f"{event_date} {end_time}"
        
        # Budget - Low budget, no food
        budget_total = 3500
        budget_breakdown = {
            "categories": ["Decorations", "Printing/Materials", "Miscellaneous"],
            "breakdown": {
                "Decorations": {"amount": 1500, "percentage": 42.8},
                "Printing/Materials": {"amount": 1500, "percentage": 42.8},
                "Miscellaneous": {"amount": 500, "percentage": 14.4}
            },
            "percentages": [42.8, 42.8, 14.4]
        }
        
        # Timeline
        timeline = [
            {"startTime": "08:00", "endTime": "09:00", "phase": "Registration", "description": "Student attendance signing"},
            {"startTime": "09:00", "endTime": "10:00", "phase": "Opening Ceremony", "description": "National Anthem, Invocation, Welcoming Remarks"},
            {"startTime": "10:00", "endTime": "12:00", "phase": "Department Orientations", "description": "Breakout sessions by department"},
            {"startTime": "12:00", "endTime": "13:00", "phase": "Lunch Break", "description": "Students bring their own meals"},
            {"startTime": "13:00", "endTime": "15:00", "phase": "Campus Tour", "description": "Guided tour of facilities"},
            {"startTime": "15:00", "endTime": "16:30", "phase": "Student Organization Fair", "description": "Visiting booths"},
            {"startTime": "16:30", "endTime": "17:00", "phase": "Closing Remarks", "description": "Announcements and dismissal"}
        ]
        
        # Equipment
        equipment = [
            {"name": "Sound System", "quantity": 1},
            {"name": "Microphone", "quantity": 3},
            {"name": "Projector", "quantity": 2},
            {"name": "Projector Screen", "quantity": 2},
            {"name": "Monoblock Chairs", "quantity": 500},
            {"name": "Long Table", "quantity": 10}
        ]
        
        # Additional Resources
        additional_resources = [
            {"name": "Guest Speaker Tokens", "description": "Simple tokens for speakers"},
            {"name": "Printed Certificates", "description": "For committee and speakers"},
            {"name": "Nametags", "description": "For freshers"},
            {"name": "Garbage Bags", "description": "For clean as you go"}
        ]

        # Organizing Dept
        # Try to use student's course/dept, else 'BSIT'
        organizing_dept = student.get('course') or student.get('department') or 'BSIT'
        
        # Map some common codes if needed (simple map)
        if organizing_dept == 'College of Computer Studies': 
            organizing_dept = 'BSIT'

        event_data = {
            "name": "Freshmen Orientation 2026",
            "event_type": "Academic", # Changed to Academic
            "description": "Annual orientation for incoming freshmen students to introduce them to school policies, campus life, and their respective departments.",
            "start_datetime": start_datetime,
            "end_datetime": end_datetime,
            "venue": "Gymnasium", # Generic venue
            "organizer": "Student Council / Admin",
            "expected_attendees": 500,
            "budget": budget_total,
            "equipment": json.dumps(equipment),
            "timeline": json.dumps(timeline),
            "budget_breakdown": json.dumps(budget_breakdown),
            "additional_resources": json.dumps(additional_resources),
            "organizing_department": organizing_dept,
            "status": "Pending", # Pending status
            "requestor_id": student['id']
        }
        
        logger.info(f"Inserting event: {event_data['name']} for Date: {event_date}")
        
        # Insert Query
        query = """
            INSERT INTO events (
                name, event_type, description, start_datetime, end_datetime,
                venue, organizer, expected_attendees, budget, equipment, timeline, budget_breakdown, additional_resources,
                organizing_department, status, requestor_id, created_at, updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, 
                %s, %s, %s, %s, %s, %s, %s, %s, 
                %s, %s, %s, NOW(), NOW()
            )
        """
        
        event_id = db.execute_insert(query, (
            event_data['name'],
            event_data['event_type'],
            event_data['description'],
            event_data['start_datetime'],
            event_data['end_datetime'],
            event_data['venue'],
            event_data['organizer'],
            event_data['expected_attendees'],
            event_data['budget'],
            event_data['equipment'],
            event_data['timeline'],
            event_data['budget_breakdown'],
            event_data['additional_resources'],
            event_data['organizing_department'],
            event_data['status'],
            event_data['requestor_id']
        ))
        
        # Add history log
        db.execute_insert("""
            INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
            VALUES (%s, NULL, %s, %s, 'Initial submission (inserted via script)')
        """, (event_id, 'Pending', student['id']))
        
        logger.info("="*50)
        logger.info(f"SUCCESS: Event inserted with ID: {event_id}")
        logger.info(f"Name: {event_data['name']}")
        logger.info(f"Status: {event_data['status']}")
        logger.info(f"Date: {event_date}")
        logger.info(f"Budget: ₱{budget_total}")
        logger.info("="*50)

if __name__ == '__main__':
    insert_fake_event()
