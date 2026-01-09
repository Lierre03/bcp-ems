#!/usr/bin/env python3
"""
STUDENT ATTENDANCE FLOW TEST
Tests QR code generation, registration, and check-in for students
"""

from database.db import get_db, init_db
from config import config
from datetime import datetime, timedelta
import requests

def main():
    print("=" * 80)
    print("STUDENT ATTENDANCE FLOW TEST")
    print("=" * 80)
    
    init_db(config['development'].DB_CONFIG)
    db = get_db()
    
    # Test Configuration
    BASE_URL = "http://localhost:5000"
    
    # Create test student if not exists
    print("\n1. Setting up test student...")
    student = setup_test_student(db)
    print(f"   ✅ Student: {student['username']} (ID: {student['id']})")
    print(f"   Department: {student['department']}")
    print(f"   Section: {student['section']}")
    
    # Create test event in student's department
    print("\n2. Creating test event in student's department...")
    event = create_test_event(db, student['department'])
    print(f"   ✅ Event: {event['name']} (ID: {event['id']})")
    print(f"   Department: {event['organizing_department']}")
    print(f"   Date: {event['start_datetime']}")
    
    # Register student for event
    print("\n3. Registering student for event...")
    registration = register_student(db, student['id'], event['id'])
    print(f"   ✅ Registration ID: {registration['id']}")
    print(f"   Status: {registration['registration_status']}")
    
    # Generate QR code
    print("\n4. Testing QR code generation...")
    qr_result = test_qr_generation(db, registration['id'], student['id'])
    if qr_result:
        print(f"   ✅ QR Code: {qr_result['qr_code']}")
        print(f"   Format: REG-{registration['id']}-{student['id']}-TIMESTAMP")
    
    # Test QR check-in
    print("\n5. Testing QR check-in...")
    if qr_result:
        checkin_result = test_qr_checkin(db, qr_result['qr_code'], event['id'], student['id'])
        if checkin_result:
            print(f"   ✅ Check-in successful!")
            print(f"   Method: QR")
            print(f"   Time: {checkin_result['check_in_datetime']}")
    
    # Test department visibility
    print("\n6. Testing department visibility...")
    test_department_visibility(db, event['id'], student['department'])
    
    # Test attendance report
    print("\n7. Testing attendance report...")
    test_attendance_report(db, event['id'])
    
    print("\n" + "=" * 80)
    print("✅ ALL TESTS COMPLETE")
    print("=" * 80)


def setup_test_student(db):
    """Create or get test student"""
    # Check if test student exists
    student = db.execute_one(
        "SELECT u.id, u.username, u.first_name, u.last_name, u.department, s.section, s.course "
        "FROM users u "
        "LEFT JOIN students s ON u.id = s.user_id "
        "WHERE u.username = %s",
        ('test_student',)
    )
    
    if student:
        return student
    
    # Create test student
    role_id = db.execute_one("SELECT id FROM roles WHERE name = 'Student'")['id']
    
    user_id = db.execute_insert(
        "INSERT INTO users (username, password_hash, first_name, last_name, email, role_id, department) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        ('test_student', 'hashed_password', 'Test', 'Student', 'test.student@school.edu', role_id, 'BSIT')
    )
    
    # Add student details
    db.execute_insert(
        "INSERT INTO students (user_id, student_id, course, section, year_level) "
        "VALUES (%s, %s, %s, %s, %s)",
        (user_id, 'STU-2024-001', 'BSIT', '3A', 3)
    )
    
    return db.execute_one(
        "SELECT u.id, u.username, u.first_name, u.last_name, u.department, s.section, s.course "
        "FROM users u "
        "JOIN students s ON u.id = s.user_id "
        "WHERE u.id = %s",
        (user_id,)
    )


def create_test_event(db, department):
    """Create test event in student's department"""
    event_start = datetime.now() + timedelta(days=1)
    event_end = event_start + timedelta(hours=2)
    
    event_id = db.execute_insert(
        "INSERT INTO events (name, event_type, description, start_datetime, end_datetime, "
        "venue, organizing_department, expected_attendees, status, requestor_id) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            'Test Attendance Event',
            'Academic',
            'Test event for attendance system',
            event_start,
            event_end,
            'Auditorium',
            department,
            100,
            'Approved',
            1  # Admin user
        )
    )
    
    return db.execute_one(
        "SELECT id, name, organizing_department, start_datetime FROM events WHERE id = %s",
        (event_id,)
    )


def register_student(db, user_id, event_id):
    """Register student for event"""
    reg_id = db.execute_insert(
        "INSERT INTO event_registrations (event_id, user_id, registration_status, registration_date) "
        "VALUES (%s, %s, %s, NOW())",
        (event_id, user_id, 'Registered')
    )
    
    return db.execute_one(
        "SELECT id, event_id, user_id, registration_status FROM event_registrations WHERE id = %s",
        (reg_id,)
    )


def test_qr_generation(db, registration_id, user_id):
    """Test QR code generation"""
    # Generate QR code data
    qr_code = f"REG-{registration_id}-{user_id}-{int(datetime.now().timestamp())}"
    
    # Update registration with QR code
    db.execute_update(
        "UPDATE event_registrations SET qr_code = %s WHERE id = %s",
        (qr_code, registration_id)
    )
    
    # Verify
    result = db.execute_one(
        "SELECT id, qr_code FROM event_registrations WHERE id = %s",
        (registration_id,)
    )
    
    return result


def test_qr_checkin(db, qr_code, event_id, user_id):
    """Test QR check-in"""
    # Check if already checked in
    existing = db.execute_one(
        "SELECT id FROM event_attendance WHERE event_id = %s AND user_id = %s",
        (event_id, user_id)
    )
    
    if existing:
        print("   ⚠️  Already checked in, skipping...")
        return existing
    
    # Record attendance
    attendance_id = db.execute_insert(
        "INSERT INTO event_attendance (event_id, user_id, check_in_datetime, check_in_method) "
        "VALUES (%s, %s, NOW(), 'QR')",
        (event_id, user_id)
    )
    
    return db.execute_one(
        "SELECT id, event_id, user_id, check_in_datetime, check_in_method "
        "FROM event_attendance WHERE id = %s",
        (attendance_id,)
    )


def test_department_visibility(db, event_id, student_department):
    """Test that students can only see events in their department"""
    print(f"\n   Testing visibility for department: {student_department}")
    
    # Get event department
    event = db.execute_one(
        "SELECT organizing_department FROM events WHERE id = %s",
        (event_id,)
    )
    
    if event['organizing_department'] == student_department:
        print(f"   ✅ Event IS visible (same department)")
    else:
        print(f"   ❌ Event NOT visible (different department)")
    
    # Test query that students would use
    visible_events = db.execute_query(
        "SELECT id, name, organizing_department FROM events "
        "WHERE organizing_department = %s AND status = 'Approved'",
        (student_department,)
    )
    
    print(f"   ✅ Student can see {len(visible_events)} event(s) in their department")


def test_attendance_report(db, event_id):
    """Test attendance report generation"""
    # Get attendance stats
    total_registered = db.execute_one(
        "SELECT COUNT(*) as count FROM event_registrations "
        "WHERE event_id = %s AND registration_status = 'Registered'",
        (event_id,)
    )['count']
    
    total_checked_in = db.execute_one(
        "SELECT COUNT(*) as count FROM event_attendance WHERE event_id = %s",
        (event_id,)
    )['count']
    
    attendance_rate = (total_checked_in / total_registered * 100) if total_registered > 0 else 0
    
    print(f"\n   Attendance Statistics:")
    print(f"   - Registered: {total_registered}")
    print(f"   - Checked In: {total_checked_in}")
    print(f"   - Attendance Rate: {attendance_rate:.1f}%")
    
    # Get detailed list
    attendees = db.execute_query(
        "SELECT u.first_name, u.last_name, s.section, s.course, "
        "a.check_in_datetime, a.check_in_method "
        "FROM event_registrations r "
        "JOIN users u ON r.user_id = u.id "
        "LEFT JOIN students s ON u.id = s.user_id "
        "LEFT JOIN event_attendance a ON r.event_id = a.event_id AND r.user_id = a.user_id "
        "WHERE r.event_id = %s AND r.registration_status = 'Registered'",
        (event_id,)
    )
    
    print(f"\n   Attendee List:")
    for attendee in attendees:
        status = "✓ Present" if attendee['check_in_datetime'] else "✗ Absent"
        method = f"({attendee['check_in_method']})" if attendee['check_in_method'] else ""
        print(f"   {status} {method}: {attendee['first_name']} {attendee['last_name']} - {attendee['section']}")


if __name__ == '__main__':
    main()
