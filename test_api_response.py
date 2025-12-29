#!/usr/bin/env python3
"""Test to see what get_events API returns"""

import requests
import json

# Start a session
session = requests.Session()

# Login first
login_response = session.post('http://localhost:5001/api/auth/login', json={
    'username': 'admin',
    'password': 'admin123'
})

if login_response.status_code == 200:
    print("✓ Logged in successfully\n")
    
    # Get events
    events_response = session.get('http://localhost:5001/api/events')
    
    if events_response.status_code == 200:
        data = events_response.json()
        events = data.get('events', [])
        
        print(f"Found {len(events)} events\n")
        
        # Show first 3 events
        for event in events[:3]:
            print(f"Event ID {event['id']}: {event['name']}")
            print(f"  Equipment: {event.get('equipment', 'NOT FOUND')}")
            print(f"  Activities: {event.get('activities', 'NOT FOUND')}")
            print(f"  Budget Breakdown: {event.get('budget_breakdown', 'NOT FOUND')}")
            print()
    else:
        print(f"Failed to get events: {events_response.status_code}")
        print(events_response.text)
else:
    print(f"Login failed: {login_response.status_code}")
    print(login_response.text)
