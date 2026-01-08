import pymysql.cursors
from config import Config
from datetime import datetime
import json

def test_withdrawal_notification():
    """Simulate a withdrawal and verify notifications are created"""
    try:
        conf = Config.DB_CONFIG
        conn = pymysql.connect(
            host=conf['host'],
            user=conf['user'],
            password=conf['password'],
            database=conf['database'],
            port=conf['port'],
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
        )
        cursor = conn.cursor()
        
        # 1. Get event 57 details
        cursor.execute("SELECT * FROM events WHERE id = 57")
        event = cursor.fetchone()
        if not event:
            print("❌ Event 57 not found")
            conn.close()
            return
        
        print(f"✅ Event found: {event['name']}")
        print(f"   Current status: {event['status']}")
        
        # 2. Get requestor info (assuming user_id 2 is the requestor)
        cursor.execute("SELECT * FROM users WHERE id = %s", (event['requestor_id'],))
        requestor = cursor.fetchone()
        requestor_name = f"{requestor['first_name']} {requestor['last_name']}" if requestor else "Unknown User"
        
        # 3. Simulate withdrawal (Update status)
        print(f"\n📝 Simulating withdrawal...")
        cursor.execute(
            "UPDATE events SET status = 'Cancelled', updated_at = %s WHERE id = 57",
            (datetime.now(),)
        )
        print("✅ Event status updated to 'Cancelled'")
        
        # 4. Create notifications for Staff and Admins
        cursor.execute("""
            SELECT u.id, r.name as role FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE r.name IN ('Super Admin', 'Admin', 'Staff')
        """)
        recipients = cursor.fetchall()
        
        if not recipients:
            print("\n❌ No Admin/Staff users found in database")
            conn.close()
            return
        
        print(f"\n📬 Creating notifications for {len(recipients)} users...")
        
        notif_sql = """
            INSERT INTO notifications (user_id, title, message, type, event_id, is_read, created_at)
            VALUES (%s, %s, %s, %s, %s, 0, %s)
        """
        
        event_name = event.get('name', 'Event')
        title = "Event Withdrawn"
        message = f"{requestor_name} has withdrawn the proposal '{event_name}' due to inability to provide required equipment."
        
        for r in recipients:
            cursor.execute(notif_sql, (
                r['id'], 
                title, 
                message, 
                'status_update', 
                57, 
                datetime.now()
            ))
            print(f"   ✅ Notification sent to user {r['id']} ({r['role']})")
        
        # 5. Verify notifications were created
        cursor.execute("SELECT COUNT(*) as count FROM notifications WHERE event_id = 57 AND title = 'Event Withdrawn'")
        result = cursor.fetchone()
        
        print(f"\n✅ Total withdrawal notifications created: {result['count']}")
        
        # 6. Show sample notification
        cursor.execute("SELECT * FROM notifications WHERE event_id = 57 AND title = 'Event Withdrawn' LIMIT 1")
        sample = cursor.fetchone()
        if sample:
            print(f"\n📩 Sample Notification:")
            print(f"   User ID: {sample['user_id']}")
            print(f"   Title: {sample['title']}")
            print(f"   Message: {sample['message']}")
            print(f"   Type: {sample['type']}")
            print(f"   Created: {sample['created_at']}")
        
        cursor.close()
        conn.close()
        
        print("\n✅ Test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_withdrawal_notification()
