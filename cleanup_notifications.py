#!/usr/bin/env python3
"""
Clean up old conflict notifications - remove suggested dates from existing messages
"""

from database.db import get_db, init_db
from config import config
import re

def main():
    # Initialize database
    init_db(config['development'].DB_CONFIG)
    db = get_db()
    
    print("=" * 80)
    print("CLEANING UP OLD CONFLICT NOTIFICATIONS")
    print("=" * 80)
    
    # Get all conflict_rejection notifications
    notifications = db.execute_query("""
        SELECT id, title, message 
        FROM notifications 
        WHERE type = 'conflict_rejection'
    """)
    
    print(f"\nFound {len(notifications)} conflict notifications")
    
    updated_count = 0
    for notif in notifications:
        original_message = notif['message']
        
        # Remove "Suggested times:" section and everything after it
        # Pattern: Remove from "\n\nSuggested times:" onwards
        cleaned_message = re.sub(r'\n\nSuggested times:.*$', '', original_message, flags=re.DOTALL)
        
        # Add the new call-to-action if not present
        if 'View Details' not in cleaned_message:
            if 'reschedule your event or cancel it' in cleaned_message:
                cleaned_message = cleaned_message.replace(
                    'Please reschedule your event or cancel it.',
                    'Please click "View Details" to reschedule your event.'
                )
            else:
                cleaned_message += '\n\nPlease click "View Details" to reschedule your event.'
        
        # Update if changed
        if cleaned_message != original_message:
            db.execute_update("""
                UPDATE notifications 
                SET message = %s 
                WHERE id = %s
            """, (cleaned_message, notif['id']))
            updated_count += 1
            print(f"✓ Updated notification ID {notif['id']}")
    
    print(f"\n✅ Updated {updated_count} notification(s)")
    print("=" * 80)

if __name__ == '__main__':
    main()
