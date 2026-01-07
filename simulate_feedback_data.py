
import pymysql
import datetime
import bcrypt

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

def simulate_feedback():
    conn = pymysql.connect(**DB_CONFIG)
    try:
        with conn.cursor() as cursor:
            # 1. Create Student2
            print("Creating Student2...")
            cursor.execute("SELECT id FROM users WHERE username='student2'")
            user2 = cursor.fetchone()
            
            if not user2:
                # Get role Participant
                cursor.execute("SELECT id FROM roles WHERE name='Participant'")
                role_id = cursor.fetchone()['id']
                
                cursor.execute("""
                    INSERT INTO users (username, email, password_hash, first_name, last_name, role_id, is_active, account_status)
                    VALUES ('student2', 'student2@example.com', 'hash', 'Student', 'Two', %s, 1, 'Approved')
                """, (role_id,))
                user2_id = cursor.lastrowid
            else:
                user2_id = user2['id']

            event_id = 59 # Campus Tech Showcase

            # 2. Add Attendance for Student2
            cursor.execute("DELETE FROM event_attendance WHERE event_id=%s AND user_id=%s", (event_id, user2_id))
            cursor.execute("""
                INSERT INTO event_attendance (event_id, user_id, check_in_datetime, check_in_method)
                VALUES (%s, %s, NOW(), 'Manual')
            """, (event_id, user2_id))

            # 3. Simulate Feedback Submission: Paul (ID 13)
            print("Simulating Paul's feedback...")
            cursor.execute("""
                INSERT INTO event_feedback (event_id, user_id, overall_rating, comments, created_at, updated_at)
                VALUES (%s, 13, 5, 'Paul loved it!', NOW(), NOW())
                ON DUPLICATE KEY UPDATE overall_rating=5, comments='Paul loved it! (Updated)'
            """, (event_id,))

            # 4. Simulate Feedback Submission: Student2
            print(f"Simulating Student2 (ID {user2_id}) feedback...")
            cursor.execute("""
                INSERT INTO event_feedback (event_id, user_id, overall_rating, comments, created_at, updated_at)
                VALUES (%s, %s, 3, 'Student2 thought it was okay.', NOW(), NOW())
                ON DUPLICATE KEY UPDATE overall_rating=3, comments='Student2 thought it was okay. (Updated)'
            """, (event_id, user2_id))
            
            # 5. Check DB Rows
            print("--- Database Content ---")
            cursor.execute("SELECT user_id, overall_rating, comments FROM event_feedback WHERE event_id=%s", (event_id,))
            rows = cursor.fetchall()
            for r in rows:
                print(r)
                
            if len(rows) < 2:
                print("FAIL: Database only has 1 row!")
            else:
                print(f"SUCCESS: Database has {len(rows)} rows.")

    finally:
        conn.close()

if __name__ == "__main__":
    simulate_feedback()
