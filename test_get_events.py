#!/usr/bin/env python3
"""Test script to check if get_events returns JSON columns correctly"""

import pymysql
import json
from config import Config

# Connect to database
db_config = Config.DB_CONFIG
conn = pymysql.connect(**db_config, cursorclass=pymysql.cursors.DictCursor)
cursor = conn.cursor()

# Test get_events query
query = """
    SELECT e.id, 
           e.name,
           e.budget,
           e.equipment,
           e.timeline,
           e.budget_breakdown
    FROM events e
    WHERE e.deleted_at IS NULL
    ORDER BY e.id DESC
    LIMIT 3
"""

cursor.execute(query)
events = cursor.fetchall()

print("Recent Events from Database:\n")
for event in events:
    print(f"Event ID {event['id']}: {event['name']}")
    print(f"  Budget: {event['budget']}")
    
    # Parse equipment
    if event['equipment']:
        equipment = json.loads(event['equipment']) if isinstance(event['equipment'], str) else event['equipment']
        print(f"  Equipment: {equipment}")
    else:
        print(f"  Equipment: None")
    
    # Parse timeline (should map to activities)
    if event['timeline']:
        timeline = json.loads(event['timeline']) if isinstance(event['timeline'], str) else event['timeline']
        print(f"  Timeline/Activities: {timeline[:2] if len(timeline) > 2 else timeline}")  # Show first 2
    else:
        print(f"  Timeline/Activities: None")
    
    # Parse budget_breakdown
    if event['budget_breakdown']:
        breakdown = json.loads(event['budget_breakdown']) if isinstance(event['budget_breakdown'], str) else event['budget_breakdown']
        print(f"  Budget Breakdown: {breakdown}")
    else:
        print(f"  Budget Breakdown: None")
    
    print()

cursor.close()
conn.close()

print("\n✓ Database query test complete")
