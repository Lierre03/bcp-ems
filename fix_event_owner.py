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

# Show all users
print("Available users:")
cursor.execute("SELECT u.id, u.username, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id")
users = cursor.fetchall()
for user in users:
    print(f"  ID {user['id']}: {user['username']} ({user['email']}) - {user['role']}")

print("\n" + "="*60)
print("Which user are you logged in as?")
print("Enter the user ID: ", end='')
user_id = input().strip()

if user_id.isdigit():
    user_id = int(user_id)
    
    # Update event 30 to belong to this user
    cursor.execute("UPDATE events SET requestor_id = %s WHERE id = 30", (user_id,))
    
    # Delete old notification
    cursor.execute("DELETE FROM notifications WHERE event_id = 30")
    
    # Create new notification for the correct user
    cursor.execute("SELECT name, venue, start_datetime FROM events WHERE id = 30")
    event = cursor.fetchone()
    
    cursor.execute("""
        INSERT INTO notifications (user_id, type, title, message, event_id, is_read, created_at)
        VALUES (%s, %s, %s, %s, %s, FALSE, NOW())
    """, (
        user_id,
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
    
    print(f"\n✅ Event 30 updated!")
    print(f"   - Requestor changed to user ID {user_id}")
    print(f"   - Notification created for your account")
    print(f"\n📬 Refresh your browser - you should now see the notification!")
else:
    print("Invalid user ID")

cursor.close()
conn.close()
