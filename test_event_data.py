"""
Test script to verify event data retrieval
"""
import sys
sys.path.insert(0, 'c:/Users/ivyri/Documents/LMS/rebuild')

from database.db import Database
from backend.event_helpers import get_event_equipment, get_event_activities, get_budget_breakdown

# Database config
config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'school_event_management',
    'port': 3306,
    'charset': 'utf8mb4'
}

# Initialize database
db = Database(config)
db.connect()

# Get the latest event ID
result = db.execute_query("SELECT MAX(id) as max_id FROM events")
if result and result[0]['max_id']:
    event_id = result[0]['max_id']
    print(f"\nTesting with Event ID: {event_id}\n")
    
    # Test equipment retrieval
    equipment = get_event_equipment(db, event_id)
    print("Equipment:")
    print(equipment)
    print(f"Type: {type(equipment)}")
    if equipment:
        print(f"First item type: {type(equipment[0])}")
        print(f"First item: {equipment[0]}")
    
    # Test activities retrieval
    activities = get_event_activities(db, event_id)
    print("\nActivities:")
    print(activities)
    print(f"Type: {type(activities)}")
    if activities:
        print(f"First item type: {type(activities[0])}")
        print(f"First item: {activities[0]}")
    
    # Test budget breakdown retrieval
    budget = get_budget_breakdown(db, event_id)
    print("\nBudget Breakdown:")
    print(budget)
    print(f"Type: {type(budget)}")
    if budget:
        print(f"First item type: {type(budget[0])}")
        print(f"First item: {budget[0]}")
else:
    print("No events found in database")

db.close()
