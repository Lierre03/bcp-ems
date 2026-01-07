from database.db import get_db
from app import create_app
import bcrypt
from datetime import datetime, timedelta

app = create_app('development')
ctx = app.app_context()
ctx.push()
db = get_db()

def setup_data():
    try:
        # 1. Create/Ensure user 'paul' exists
        password_hash = bcrypt.hashpw('password123'.encode('utf-8'), bcrypt.gensalt(rounds=12)).decode('utf-8')
        
        # Check if paul exists
        paul = db.execute_one("SELECT id FROM users WHERE username = 'paul'")
        if not paul:
            print("Creating user 'paul'...")
            # Get Participant role
            role = db.execute_one("SELECT id FROM roles WHERE name = 'Participant'")
            if not role:
                print("Error: Participant role not found")
                return
            
            with db.get_transaction() as cursor:
                cursor.execute("""
                    INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, is_active, account_status) 
                    VALUES ('paul', 'paul@student.edu', %s, 'Paul', 'Student', %s, 1, 'Approved')
                """, (password_hash, role['id']))
                paul_id = cursor.lastrowid
                
                # Check student record
                cursor.execute("INSERT INTO students (user_id, course, section) VALUES (%s, 'BSIT', '1A')", (paul_id,))
        else:
            print("User 'paul' already exists.")
            paul_id = paul['id']
            # Ensure password is known
            db.execute_update("UPDATE users SET password_hash = %s, account_status='Approved', is_active=1 WHERE id = %s", (password_hash, paul_id))

        # 2. Find requestor for event (use admin 'itdept')
        organizer = db.execute_one("SELECT id FROM users WHERE username = 'itdept'")
        if not organizer:
            print("Error: 'itdept' user not found for organizer")
            return
        organizer_id = organizer['id']

        # 3. Create 'Orientation' Event (Completed, Yesterday)
        yesterday = datetime.now() - timedelta(days=1)
        end_time = yesterday + timedelta(hours=3)
        
        print("Creating 'Freshman Orientation' event...")
        with db.get_transaction() as cursor:
            cursor.execute("""
                INSERT INTO events (
                    name, event_type, description, start_datetime, end_datetime, 
                    status, venue, organizer, organizing_department, requestor_id
                ) VALUES (
                    'Freshman Orientation 2026', 'Academic', 'Welcome event for new students', 
                    %s, %s, 'Completed', 'Main Auditorium', 'IT Department', 'IT Department', %s
                )
            """, (yesterday, end_time, organizer_id))
            event_id = cursor.lastrowid

            # 4. Register Paul
            print(f"Registering paul (id={paul_id}) for event {event_id}...")
            cursor.execute("""
                INSERT INTO event_registrations (event_id, user_id, registration_status)
                VALUES (%s, %s, 'Registered')
            """, (event_id, paul_id))
            
            # 5. Mark Attendance (Present)
            print("Marking attendance...")
            cursor.execute("""
                INSERT INTO event_attendance (event_id, user_id, attendance_status, check_in_datetime)
                VALUES (%s, %s, 'Present', %s)
            """, (event_id, paul_id, yesterday))

        print("Data setup complete!")
        print(f"Event ID: {event_id}")
        print("User: paul / password123")
        
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    setup_data()
