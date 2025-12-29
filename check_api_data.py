#!/usr/bin/env python3
"""Check what get_events API actually returns"""

import pymysql
import json
from config import Config

# First, check database directly
print("=" * 60)
print("CHECKING DATABASE DIRECTLY")
print("=" * 60)

db_config = Config.DB_CONFIG
conn = pymysql.connect(**db_config, cursorclass=pymysql.cursors.DictCursor)
cursor = conn.cursor()

cursor.execute('SELECT id, name, equipment, timeline, budget_breakdown FROM events WHERE id = 12')
event = cursor.fetchone()

if event:
    print(f"\nEvent ID {event['id']}: {event['name']}")
    print(f"\nEquipment (raw): {event['equipment']}")
    print(f"\nTimeline (raw): {event['timeline']}")
    print(f"\nBudget Breakdown (raw): {event['budget_breakdown']}")
    
    # Now parse it like the API should
    print("\n" + "=" * 60)
    print("PARSING LIKE API SHOULD DO")
    print("=" * 60)
    
    if event['equipment']:
        equipment = json.loads(event['equipment']) if isinstance(event['equipment'], str) else event['equipment']
        print(f"\nEquipment (parsed): {equipment}")
    
    if event['timeline']:
        timeline = json.loads(event['timeline']) if isinstance(event['timeline'], str) else event['timeline']
        print(f"\nTimeline/Activities (parsed): {timeline}")
    
    if event['budget_breakdown']:
        breakdown = json.loads(event['budget_breakdown']) if isinstance(event['budget_breakdown'], str) else event['budget_breakdown']
        print(f"\nBudget Breakdown (parsed): {breakdown}")
else:
    print("Event 12 not found!")

cursor.close()
conn.close()
