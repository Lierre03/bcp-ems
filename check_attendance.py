from database.db import get_db, init_db
from config import config
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)

# Initialize DB connection
init_db(config['development'].DB_CONFIG)
db = get_db()

# Find Paul
users = db.execute_query("SELECT * FROM users WHERE username LIKE %s OR first_name LIKE %s", ('%paul%', '%Paul%'))
print(f"Users found: {len(users)}")

for user in users:
    user_id = user['id']
    print(f"Checking records for user ID: {user_id} ({user['username']})")
    
    # Check attendance
    attendance = db.execute_query("SELECT * FROM event_attendance WHERE user_id = %s", (user_id,))
    print(f"Attendance records: {attendance}")
