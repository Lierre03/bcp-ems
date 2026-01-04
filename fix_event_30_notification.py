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

# Update event 30 to Conflict_Rejected status
cursor.execute("""
    UPDATE events 
    SET status = 'Conflict_Rejected'
    WHERE id = 30
""")

# Get the requestor user ID for the event
cursor.execute("SELECT requestor_id, name, venue, start_datetime FROM events WHERE id = 30")
event = cursor.fetchone()

# Create notification for the event
cursor.execute("""
    INSERT INTO notifications (user_id, type, title, message, event_id, is_read, created_at)
    VALUES (%s, %s, %s, %s, %s, FALSE, NOW())
""", (
    event['requestor_id'],
    'conflict_rejection',
    f'⚠️ Action Required: "{event["name"]}" Needs Rescheduling',
    f'Your event could not be approved due to a scheduling conflict.\n\n'
    f'Another event was approved for:\n'
    f'• Venue: {event["venue"]}\n'
    f'• Time: {event["start_datetime"]}\n\n'
    f'Please reschedule your event or cancel it.',
    30
))

conn.commit()

print("✅ Event 30 updated:")
print("   - Status: Conflict_Rejected")
print("   - Notification created for user", event['requestor_id'])
print("\n📬 You should now see a notification bell with this event!")
print("   Click the notification to be redirected to reschedule page")

cursor.close()
conn.close()
