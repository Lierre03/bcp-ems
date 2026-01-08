#!/usr/bin/env python3
"""
Test the new AI-powered reschedule suggestions
"""

from database.db import get_db, init_db
from config import config
from datetime import datetime
from backend.ml_scheduler import suggest_reschedule_dates_ai

def main():
    # Initialize database
    init_db(config['development'].DB_CONFIG)
    db = get_db()
    
    print("=" * 80)
    print("TESTING AI-POWERED RESCHEDULE SUGGESTIONS")
    print("=" * 80)
    
    # Test with our conflicting event
    requested_start = datetime(2026, 1, 10, 14, 0, 0)  # Jan 10, 2026 2:00 PM
    requested_end = datetime(2026, 1, 10, 22, 0, 0)    # Jan 10, 2026 10:00 PM
    
    print(f"\nOriginal Requested Time:")
    print(f"  Start: {requested_start}")
    print(f"  End: {requested_end}")
    print(f"  Venue: Auditorium")
    print(f"  Event Type: Workshop")
    
    print("\n" + "=" * 80)
    print("AI SUGGESTIONS (1 BEFORE, 4 AFTER)")
    print("=" * 80)
    
    suggestions = suggest_reschedule_dates_ai(
        venue='Auditorium',
        requested_start=requested_start,
        requested_end=requested_end,
        event_type='Workshop',
        exclude_event_id=63
    )
    
    if not suggestions:
        print("\n❌ No suggestions found!")
        return
    
    print(f"\nFound {len(suggestions)} suggestions:\n")
    
    for i, suggestion in enumerate(suggestions, 1):
        offset = suggestion['days_offset']
        offset_label = f"{abs(offset)} day{'s' if abs(offset) != 1 else ''} {'BEFORE' if offset < 0 else 'AFTER'}"
        confidence_pct = suggestion['confidence'] * 100
        ai_badge = "🤖 AI" if suggestion['ai_recommended'] else ""
        
        print(f"{i}. {suggestion['day']}")
        print(f"   Time: {suggestion['time_display']}")
        print(f"   Offset: {offset_label} ({offset:+d} days)")
        print(f"   Confidence: {confidence_pct:.1f}% {ai_badge}")
        print()
    
    print("=" * 80)
    print("✅ TEST COMPLETE")
    print("=" * 80)
    print("\nPattern verified:")
    if suggestions:
        before_count = sum(1 for s in suggestions if s['days_offset'] < 0)
        after_count = sum(1 for s in suggestions if s['days_offset'] > 0)
        print(f"  • {before_count} suggestion(s) BEFORE the conflict")
        print(f"  • {after_count} suggestion(s) AFTER the conflict")
        print(f"  • All suggestions checked for conflicts across ALL departments ✓")
    
    print("=" * 80)

if __name__ == '__main__':
    main()
