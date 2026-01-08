#!/usr/bin/env python3
"""
Test AI reschedule with DIFFERENT times to verify no hardcoding
"""

from database.db import get_db, init_db
from config import config
from datetime import datetime
from backend.ml_scheduler import suggest_reschedule_dates_ai

def main():
    init_db(config['development'].DB_CONFIG)
    
    print("=" * 80)
    print("TESTING AI WITH DIFFERENT EVENT TIMES")
    print("=" * 80)
    
    # Test Case 1: Morning event (8 AM - 12 PM)
    print("\n📅 Test 1: Morning Event")
    print("-" * 80)
    test_event(
        start=datetime(2026, 1, 10, 8, 0, 0),   # 8:00 AM
        end=datetime(2026, 1, 10, 12, 0, 0),    # 12:00 PM
        name="Morning Workshop"
    )
    
    # Test Case 2: Afternoon event (2 PM - 6 PM)
    print("\n📅 Test 2: Afternoon Event")
    print("-" * 80)
    test_event(
        start=datetime(2026, 1, 10, 14, 0, 0),  # 2:00 PM
        end=datetime(2026, 1, 10, 18, 0, 0),    # 6:00 PM
        name="Afternoon Seminar"
    )
    
    # Test Case 3: Evening event (6 PM - 10 PM)
    print("\n📅 Test 3: Evening Event")
    print("-" * 80)
    test_event(
        start=datetime(2026, 1, 10, 18, 0, 0),  # 6:00 PM
        end=datetime(2026, 1, 10, 22, 0, 0),    # 10:00 PM
        name="Evening Conference"
    )
    
    # Test Case 4: All-day event (9 AM - 5 PM)
    print("\n📅 Test 4: All-Day Event")
    print("-" * 80)
    test_event(
        start=datetime(2026, 1, 10, 9, 0, 0),   # 9:00 AM
        end=datetime(2026, 1, 10, 17, 0, 0),    # 5:00 PM
        name="All-Day Training"
    )
    
    # Test Case 5: Odd time (10:30 AM - 3:45 PM)
    print("\n📅 Test 5: Odd Time Event")
    print("-" * 80)
    test_event(
        start=datetime(2026, 1, 10, 10, 30, 0),  # 10:30 AM
        end=datetime(2026, 1, 10, 15, 45, 0),    # 3:45 PM
        name="Custom Schedule Event"
    )
    
    print("\n" + "=" * 80)
    print("✅ ALL TESTS COMPLETE")
    print("=" * 80)

def test_event(start, end, name):
    print(f"Event: {name}")
    print(f"Original Time: {start.strftime('%I:%M %p')} - {end.strftime('%I:%M %p')}")
    
    suggestions = suggest_reschedule_dates_ai(
        venue='Auditorium',
        requested_start=start,
        requested_end=end,
        event_type='Academic',
        exclude_event_id=63
    )
    
    if suggestions:
        print(f"\n✅ Got {len(suggestions)} suggestions:")
        for i, s in enumerate(suggestions[:2], 1):  # Show first 2
            print(f"  {i}. {s['day']} @ {s['time_display']}")
        
        # Verify all suggestions use original time
        original_time_str = start.strftime('%I:%M %p')
        all_match = all(original_time_str in s['time_display'] for s in suggestions)
        
        if all_match:
            print(f"\n  ✅ All suggestions preserve original time: {original_time_str}")
        else:
            print(f"\n  ❌ ERROR: Some suggestions changed the time!")
    else:
        print("  ⚠️ No suggestions found")

if __name__ == '__main__':
    main()
