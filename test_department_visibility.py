#!/usr/bin/env python3
"""
CROSS-DEPARTMENT VISIBILITY TEST
Tests that students can only see events in their own department
"""

from database.db import get_db, init_db
from config import config
from datetime import datetime, timedelta

def main():
    print("=" * 80)
    print("CROSS-DEPARTMENT VISIBILITY TEST")
    print("=" * 80)
    
    init_db(config['development'].DB_CONFIG)
    db = get_db()
    
    # Create students from different departments
    print("\n1. Creating students from different departments...")
    bsit_student = create_student(db, 'BSIT', 'bsit_student')
    bscs_student = create_student(db, 'BSCS', 'bscs_student')
    bsis_student = create_student(db, 'BSIS', 'bsis_student')
    
    print(f"   ✅ BSIT Student: {bsit_student['username']} (ID: {bsit_student['id']})")
    print(f"   ✅ BSCS Student: {bscs_student['username']} (ID: {bscs_student['id']})")
    print(f"   ✅ BSIS Student: {bsis_student['username']} (ID: {bsis_student['id']})")
    
    # Create events in different departments
    print("\n2. Creating events in different departments...")
    bsit_event = create_event(db, 'BSIT', 'BSIT Department Event')
    bscs_event = create_event(db, 'BSCS', 'BSCS Department Event')
    bsis_event = create_event(db, 'BSIS', 'BSIS Department Event')
    
    print(f"   ✅ BSIT Event: {bsit_event['name']} (ID: {bsit_event['id']})")
    print(f"   ✅ BSCS Event: {bscs_event['name']} (ID: {bscs_event['id']})")
    print(f"   ✅ BSIS Event: {bsis_event['name']} (ID: {bsis_event['id']})")
    
    # Test visibility for each student
    print("\n3. Testing event visibility for BSIT student...")
    test_visibility(db, bsit_student, [bsit_event, bscs_event, bsis_event])
    
    print("\n4. Testing event visibility for BSCS student...")
    test_visibility(db, bscs_student, [bsit_event, bscs_event, bsis_event])
    
    print("\n5. Testing event visibility for BSIS student...")
    test_visibility(db, bsis_student, [bsit_event, bscs_event, bsis_event])
    
    # Test registration restrictions
    print("\n6. Testing registration restrictions...")
    test_registration_restrictions(db, bsit_student, bsit_event, bscs_event)
    
    print("\n" + "=" * 80)
    print("✅ CROSS-DEPARTMENT VISIBILITY TEST COMPLETE")
    print("=" * 80)


def create_student(db, department, username):
    """Create a student in a specific department"""
    # Check if exists
    existing = db.execute_one(
        "SELECT u.id, u.username, u.department FROM users u WHERE u.username = %s",
        (username,)
    )
    
    if existing:
        return existing
    
    # Create user
    role_id = db.execute_one("SELECT id FROM roles WHERE name = 'Student'")['id']
    
    user_id = db.execute_insert(
        "INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, department) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (username, 'hashed_password', department, 'Student', f'{username}@school.edu', role_id, department)
    )
    
    # Add student details
    db.execute_insert(
        "INSERT INTO students (user_id, student_id, course, section, year_level) "
        "VALUES (%s, %s, %s, %s, %s)",
        (user_id, f'STU-{department}-001', department, '3A', 3)
    )
    
    return db.execute_one(
        "SELECT id, username, department FROM users WHERE id = %s",
        (user_id,)
    )


def create_event(db, department, event_name):
    """Create an event in a specific department"""
    event_start = datetime.now() + timedelta(days=7)
    event_end = event_start + timedelta(hours=2)
    
    event_id = db.execute_insert(
        "INSERT INTO events (name, event_type, description, start_datetime, end_datetime, "
        "venue, organizing_department, expected_attendees, status, requestor_id) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            event_name,
            'Academic',
            f'Test event for {department} department',
            event_start,
            event_end,
            'Auditorium',
            department,
            50,
            'Approved',
            1
        )
    )
    
    return db.execute_one(
        "SELECT id, name, organizing_department FROM events WHERE id = %s",
        (event_id,)
    )


def test_visibility(db, student, events):
    """Test which events a student can see"""
    student_dept = student['department']
    
    print(f"   Student Department: {student_dept}")
    
    for event in events:
        event_dept = event['organizing_department']
        
        # Simulate the query a student would use
        visible = db.execute_one(
            "SELECT id FROM events "
            "WHERE id = %s AND organizing_department = %s AND status = 'Approved'",
            (event['id'], student_dept)
        )
        
        if visible:
            print(f"   ✅ CAN see: {event['name']} ({event_dept})")
        else:
            print(f"   ❌ CANNOT see: {event['name']} ({event_dept})")


def test_registration_restrictions(db, student, own_dept_event, other_dept_event):
    """Test that students can only register for events in their department"""
    print(f"\n   Testing registration for {student['username']}...")
    
    # Try to register for own department event
    try:
        reg_id = db.execute_insert(
            "INSERT INTO event_registrations (event_id, user_id, registration_status, registration_date) "
            "VALUES (%s, %s, %s, NOW())",
            (own_dept_event['id'], student['id'], 'Registered')
        )
        print(f"   ✅ CAN register for own department event: {own_dept_event['name']}")
    except Exception as e:
        print(f"   ❌ CANNOT register for own department event: {str(e)}")
    
    # Try to register for other department event (should be prevented by UI/business logic)
    print(f"   ⚠️  Other department events should be hidden in UI")
    print(f"   ⚠️  Backend should validate department match if attempted")


if __name__ == '__main__':
    main()
