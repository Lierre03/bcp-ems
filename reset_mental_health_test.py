#!/usr/bin/env python3
"""
Reset Mental Health event to testable state for venue approval testing.
"""

import os
import psycopg2
from urllib.parse import urlparse

def reset_mental_health_event():
    """Reset Mental Health event for venue approval testing"""
    
    # Get database URL from environment
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        print("❌ DATABASE_URL environment variable not set")
        return False
    
    # Parse the database URL
    result = urlparse(database_url)
    
    try:
        # Connect to database
        conn = psycopg2.connect(
            host=result.hostname,
            port=result.port,
            database=result.path[1:],  # Remove leading slash
            user=result.username,
            password=result.password
        )
        
        cursor = conn.cursor()
        
        # Find the Mental Health event
        cursor.execute(
            "SELECT id, name FROM events WHERE name LIKE %s",
            ('%Mental Health%',)
        )
        event = cursor.fetchone()
        
        if not event:
            print("❌ Mental Health event not found")
            cursor.close()
            conn.close()
            return False
        
        event_id, event_name = event
        print(f"📋 Found event: {event_name} (ID: {event_id})")
        
        # Update to testable state
        cursor.execute(
            """UPDATE events 
               SET status = %s,
                   venue_approval_status = %s,
                   equipment_approval_status = %s,
                   updated_at = NOW()
               WHERE id = %s""",
            ('Under Review', 'Pending', 'Pending', event_id)
        )
        
        conn.commit()
        
        print("✅ Event updated successfully!")
        print("   Status: Under Review (Concept Approved)")
        print("   Venue Approval: Pending")
        print("   Equipment Approval: Pending")
        print("\n🧪 Ready for testing venue approval independently!")
        
        cursor.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False

if __name__ == '__main__':
    import sys
    try:
        success = reset_mental_health_event()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
