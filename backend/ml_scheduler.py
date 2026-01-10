"""
AI-Powered Scheduling Suggestions
Uses historical data and ML patterns to suggest optimal reschedule dates.
Pattern: 1 date BEFORE conflict, 4 dates AFTER conflict.
"""

from datetime import datetime, timedelta
from database.db import get_db
import json


def suggest_reschedule_dates_ai(venue, requested_start, requested_end, event_type=None, exclude_event_id=None):
    """
    AI-driven date suggestions: 1 BEFORE, 4 AFTER the conflict.
    Uses ML to learn optimal times from historical data.
    Checks for conflicts across ALL departments and venues system-wide.
    
    Args:
        venue: Venue name
        requested_start: Original requested start datetime
        requested_end: Original requested end datetime  
        event_type: Type of event (Academic, Sports, etc.)
        exclude_event_id: Event ID to exclude from conflict checking
    
    Returns:
        list: Array of 5 suggested dates (1 before, 4 after) with confidence scores
    """
    db = get_db()
    duration_hours = (requested_end - requested_start).total_seconds() / 3600
    suggestions = []
    
    # CRITICAL: Preserve user's original time - only change the DATE
    original_time = requested_start.time()
    
    # Step 1: Find 1 date BEFORE the conflict
    before_candidates = []
    for days_before in range(1, 15):  # Try up to 2 weeks before
        candidate_date = (requested_start - timedelta(days=days_before)).date()
        
        # Use user's ORIGINAL time, not AI-learned times
        slot_start = datetime.combine(candidate_date, original_time)
        slot_end = slot_start + timedelta(hours=duration_hours)
        
        # Skip if in the past
        if slot_start < datetime.now():
            continue
        
        # Check for conflicts across ALL departments and venues
        if _is_slot_available_globally(db, venue, slot_start, slot_end, exclude_event_id):
            confidence = _calculate_confidence(db, event_type, venue, slot_start, -days_before)
            before_candidates.append({
                'start': slot_start.strftime('%Y-%m-%d %H:%M'),
                'end': slot_end.strftime('%Y-%m-%d %H:%M'),
                'day': slot_start.strftime('%A, %B %d'),
                'time_display': f"{slot_start.strftime('%I:%M %p')} - {slot_end.strftime('%I:%M %p')}",
                'confidence': confidence,
                'days_offset': -days_before,
                'ai_recommended': confidence > 0.7
            })
            break  # We only need 1 "before" option
    
    # Step 2: Find 4 dates AFTER the conflict
    after_candidates = []
    for days_after in range(1, 30):  # Try up to 1 month after
        candidate_date = (requested_start + timedelta(days=days_after)).date()
        
        # Use user's ORIGINAL time, not AI-learned times
        slot_start = datetime.combine(candidate_date, original_time)
        slot_end = slot_start + timedelta(hours=duration_hours)
        
        # Check for conflicts across ALL departments and venues
        if _is_slot_available_globally(db, venue, slot_start, slot_end, exclude_event_id):
            confidence = _calculate_confidence(db, event_type, venue, slot_start, days_after)
            after_candidates.append({
                'start': slot_start.strftime('%Y-%m-%d %H:%M'),
                'end': slot_end.strftime('%Y-%m-%d %H:%M'),
                'day': slot_start.strftime('%A, %B %d'),
                'time_display': f"{slot_start.strftime('%I:%M %p')} - {slot_end.strftime('%I:%M %p')}",
                'confidence': confidence,
                'days_offset': days_after,
                'ai_recommended': confidence > 0.7
            })
            
            if len(after_candidates) >= 4:
                break  # We have our 4 "after" options
    
    # Combine: 1 before + 4 after
    suggestions = before_candidates[:1] + after_candidates[:4]
    
    return suggestions


def _is_slot_available_globally(db, venue, slot_start, slot_end, exclude_event_id):
    """
    Check if a time slot is available across ALL departments and venues.
    Returns True only if NO conflicts exist system-wide.
    
    Overlap logic: Two time ranges overlap if start_A < end_B AND end_A > start_B
    """
    # Check for ANY event (across all departments) that conflicts with this slot
    conflicts = db.execute_query("""
        SELECT id, name, organizing_department
        FROM events
        WHERE venue = %s
        AND deleted_at IS NULL
        AND status IN ('Pending', 'Under Review', 'Approved', 'Ongoing')
        AND start_datetime < %s 
        AND end_datetime > %s
        AND id != %s
    """, (
        venue,
        slot_end.strftime('%Y-%m-%d %H:%M:%S'),
        slot_start.strftime('%Y-%m-%d %H:%M:%S'),
        exclude_event_id or 0
    ))
    
    # If any conflicts found, slot is NOT available
    return len(conflicts) == 0


def _learn_time_preferences(db, event_type, venue):
    """
    Learn preferred time slots from historical successful events.
    Returns list of datetime.time objects sorted by popularity.
    """
    from datetime import time
    
    # Query completed events of similar type
    query = """
        SELECT TIME(start_datetime) as start_time, COUNT(*) as frequency
        FROM events
        WHERE status IN ('Completed', 'Approved')
        AND deleted_at IS NULL
    """
    params = []
    
    if event_type:
        query += " AND event_type = %s"
        params.append(event_type)
    
    if venue:
        query += " AND venue = %s"
        params.append(venue)
    
    query += " GROUP BY start_time ORDER BY frequency DESC LIMIT 5"
    
    results = db.execute_query(query, tuple(params))
    
    # Extract preferred times
    preferred_times = []
    for row in results:
        if row['start_time']:
            # Convert timedelta to time object
            if isinstance(row['start_time'], timedelta):
                total_seconds = int(row['start_time'].total_seconds())
                hours = total_seconds // 3600
                minutes = (total_seconds % 3600) // 60
                preferred_times.append(time(hours, minutes))
            else:
                preferred_times.append(row['start_time'])
    
    # Fallback to common times if no historical data
    if not preferred_times:
        preferred_times = [
            time(8, 0),   # 8:00 AM
            time(14, 0),  # 2:00 PM
            time(13, 0),  # 1:00 PM
            time(9, 0),   # 9:00 AM
        ]
    
    return preferred_times


def _calculate_confidence(db, event_type, venue, proposed_datetime, days_offset):
    """
    Calculate confidence score for a proposed datetime based on historical patterns.
    Returns float between 0.0 and 1.0
    """
    confidence = 0.5  # Base confidence
    
    # Factor 1: Similar events at this venue
        SELECT COUNT(*) as count
        FROM events
        WHERE venue = %s
        AND event_type = %s
        AND status IN ('Completed', 'Approved')
        AND (EXTRACT(DOW FROM start_datetime) + 1) = %s
        AND deleted_at IS NULL
    """, (venue, event_type, proposed_datetime.weekday() + 2)) 
    # Python weekday() is 0=Mon, 6=Sun. 
    # Postgres DOW is 0=Sun, 1=Mon... 6=Sat.
    # We want to match:
    # If Python is Mon(0) -> We want Postgres Mon(1)
    # If Python is Sun(6) -> We want Postgres Sun(0)
    
    # Wait, simpler logic:
    # Python weekday(): Mon=0, Tue=1 ... Sun=6
    # Postgres DOW: Sun=0, Mon=1 ... Sat=6
    
    # Let's just use Python to get the DOW integers aligned with Postgres
    # Target in Postgres: Mon=1, Tue=2... Sat=6, Sun=0
    
    # Python 0 (Mon) -> Target 1
    # Python 1 (Tue) -> Target 2
    # ...
    # Python 5 (Sat) -> Target 6
    # Python 6 (Sun) -> Target 0
    
    # So: target = (python_day + 1) % 7
    
    # Corrected Query:
    # AND EXTRACT(DOW FROM start_datetime) = %s
    # param: (proposed_datetime.weekday() + 1) % 7
    
    if similar_events and similar_events[0]['count'] > 0:
        # More historical precedent = higher confidence
        confidence += min(0.3, similar_events[0]['count'] * 0.05)
    
    # Factor 2: Prefer dates closer to original (less disruption)
    proximity_bonus = max(0, 0.2 - abs(days_offset) * 0.02)
    confidence += proximity_bonus
    
    # Factor 3: Prefer dates AFTER conflict (respects first-come-first-served)
    if days_offset > 0:  # After the conflict
        confidence += 0.15
    elif days_offset < 0:  # Before the conflict
        confidence += 0.05  # Small bonus for the one "before" option
    
    # Factor 4: Avoid weekends for academic events
    if event_type == 'Academic' and proposed_datetime.weekday() >= 5:
        confidence -= 0.2
    
    # Factor 5: Prefer cultural/sports events on weekends
    if event_type in ['Cultural', 'Sports'] and proposed_datetime.weekday() >= 5:
        confidence += 0.1
    
    return min(1.0, max(0.1, confidence))  # Clamp between 0.1 and 1.0
