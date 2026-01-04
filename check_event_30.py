import sys
sys.path.insert(0, '/home/ivy/Documents/School-Event-Management-Commision/rebuild')

import pymysql
from config import Config

conn = pymysql.connect(
    host=Config.DB_CONFIG['host'],
    user=Config.DB_CONFIG['user'],
    password=Config.DB_CONFIG['password'],
    database=Config.DB_CONFIG['database'],
    cursorclass=pymysql.cursors.DictCursor
)
cursor = conn.cursor()

# Check event 30
cursor.execute("SELECT id, name, start_datetime, end_datetime, status, venue_approval_status FROM events WHERE id = 30")
event = cursor.fetchone()

print("Event 30 Details:")
print(f"  Name: {event['name']}")
print(f"  Start: {event['start_datetime']}")
print(f"  End: {event['end_datetime']}")
print(f"  Status: {event['status']}")
print(f"  Venue Approval: {event['venue_approval_status']}")

# Check for notifications
cursor.execute("""
    SELECT id, user_id, type, title, message, event_id, is_read 
    FROM notifications 
    WHERE event_id = 30
    ORDER BY created_at DESC
""")
notifications = cursor.fetchall()

print(f"\nNotifications for Event 30: {len(notifications)}")
for notif in notifications:
    print(f"  - Type: {notif['type']}, Read: {notif['is_read']}")
    print(f"    Title: {notif['title']}")
    print(f"    User ID: {notif['user_id']}")

cursor.close()
conn.close()
