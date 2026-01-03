# ============================================================================
# EVENT DETAILS HELPERS
# Reusable functions for managing event equipment, activities, and budget
# ============================================================================

from datetime import datetime, timedelta, time as time_type
import logging

logger = logging.getLogger(__name__)


# ============================================================================
# PROTECTED HOURS SYSTEM (Option B - Hybrid FCFS)
# ============================================================================

def time_ranges_overlap(start1, end1, start2, end2):
    """
    Check if two time ranges overlap.
    Args:
        start1, end1: First time range (datetime.time objects)
        start2, end2: Second time range (datetime.time objects)
    Returns:
        bool: True if ranges overlap
    """
    return start1 < end2 and end1 > start2


def check_protected_hours(db, venue, start_datetime, end_datetime, is_academic_event=False, is_official_event=False):
    """
    Check if event falls within protected time blocks.
    
    Args:
        db: Database connection
        venue: Venue name
        start_datetime: Event start (datetime object)
        end_datetime: Event end (datetime object)
        is_academic_event: Whether this is an academic requirement
        is_official_event: Whether this is an official university event
    
    Returns:
        tuple: (allowed: bool, reason: str, blocked_by: dict or None)
    """
    day_name = start_datetime.strftime('%A')  # 'Monday', 'Tuesday', etc.
    event_start_time = start_datetime.time()
    event_end_time = end_datetime.time()
    
    # Get protected blocks for this venue and day
    protected_blocks = db.execute_all("""
        SELECT * FROM venue_protected_hours 
        WHERE venue = %s AND day_of_week = %s
    """, (venue, day_name))
    
    if not protected_blocks:
        return True, "No protected hours for this time slot", None
    
    for block in protected_blocks:
        # Check if event overlaps with protected block
        if time_ranges_overlap(
            event_start_time, event_end_time,
            block['start_time'], block['end_time']
        ):
            # Academic/Official events can book Academic protected blocks
            if (is_academic_event or is_official_event) and block['block_type'] == 'Academic':
                return True, f"Academic/Official event approved for {block['block_type']} hours", block
            
            # Maintenance blocks are absolute (no override)
            if block['block_type'] == 'Maintenance':
                return False, f"Venue under maintenance: {block['start_time'].strftime('%I:%M %p')}-{block['end_time'].strftime('%I:%M %p')}", block
            
            # Regular events blocked by protected hours
            return False, f"{block['block_type']} hours reserved: {block['start_time'].strftime('%I:%M %p')}-{block['end_time'].strftime('%I:%M %p')}", block
    
    # No conflicts with protected blocks
    return True, "Time slot available", None


def suggest_alternative_times(db, venue, requested_start, requested_end, is_academic=False):
    """
    Find next available time slots for the same venue.
    
    Args:
        db: Database connection
        venue: Venue name
        requested_start: Requested start datetime
        requested_end: Requested end datetime
        is_academic: Whether this is an academic event
    
    Returns:
        list: Array of alternative slot dictionaries
    """
    from backend.api_venues import get_venue_conflicts
    
    duration_seconds = (requested_end - requested_start).total_seconds()
    duration_hours = duration_seconds / 3600
    
    alternatives = []
    search_date = requested_start.date()
    
    # Search next 14 days
    for day_offset in range(14):
        current_date = search_date + timedelta(days=day_offset)
        
        # Try common time slots: 8AM, 1PM, 6PM, 8PM
        for start_hour in [8, 13, 18, 20]:
            slot_start = datetime.combine(current_date, time_type(start_hour, 0))
            slot_end = slot_start + timedelta(seconds=duration_seconds)
            
            # Skip if in the past
            if slot_start < datetime.now():
                continue
            
            # Check protected hours
            protected_ok, _, _ = check_protected_hours(
                db, venue, slot_start, slot_end, is_academic, False
            )
            
            if not protected_ok:
                continue
            
            # Check existing conflicts
            conflicts = get_venue_conflicts(
                db, venue,
                slot_start.strftime('%Y-%m-%d %H:%M:%S'),
                slot_end.strftime('%Y-%m-%d %H:%M:%S')
            )
            
            if not conflicts:
                alternatives.append({
                    'start': slot_start.strftime('%Y-%m-%d %H:%M'),
                    'end': slot_end.strftime('%Y-%m-%d %H:%M'),
                    'day': slot_start.strftime('%A, %B %d'),
                    'time_display': f"{slot_start.strftime('%I:%M %p')} - {slot_end.strftime('%I:%M %p')}"
                })
            
            # Return first 5 alternatives
            if len(alternatives) >= 5:
                return alternatives
    
    return alternatives


def validate_event_booking(db, venue, start_datetime, end_datetime, is_academic=False, is_official=False, exclude_event_id=None):
    """
    Combined validation: Protected hours + existing conflicts.
    
    Args:
        db: Database connection
        venue: Venue name
        start_datetime: Event start (datetime object)
        end_datetime: Event end (datetime object)
        is_academic: Academic event flag
        is_official: Official event flag
        exclude_event_id: Event ID to exclude (for updates)
    
    Returns:
        dict: {
            'allowed': bool,
            'conflicts': list,
            'reason': str,
            'alternative_slots': list,
            'block_type': str or None
        }
    """
    from backend.api_venues import get_venue_conflicts
    
    # Step 1: Check protected hours
    protected_ok, protected_reason, blocked_by = check_protected_hours(
        db, venue, start_datetime, end_datetime, is_academic, is_official
    )
    
    if not protected_ok:
        alternatives = suggest_alternative_times(db, venue, start_datetime, end_datetime, is_academic)
        return {
            'allowed': False,
            'conflicts': [],
            'reason': f"⏰ Protected Time Block: {protected_reason}",
            'alternative_slots': alternatives,
            'block_type': 'protected_hours',
            'blocked_by': blocked_by
        }
    
    # Step 2: Check existing bookings (FCFS among allowed events)
    existing_conflicts = get_venue_conflicts(
        db, venue,
        start_datetime.strftime('%Y-%m-%d %H:%M:%S'),
        end_datetime.strftime('%Y-%m-%d %H:%M:%S'),
        exclude_event_id
    )
    
    if existing_conflicts:
        alternatives = suggest_alternative_times(db, venue, start_datetime, end_datetime, is_academic)
        return {
            'allowed': False,
            'conflicts': existing_conflicts,
            'reason': "📅 Venue already booked (first-come-first-served)",
            'alternative_slots': alternatives,
            'block_type': 'fcfs_conflict'
        }
    
    # All clear!
    return {
        'allowed': True,
        'conflicts': [],
        'reason': "✓ Venue available - booking confirmed",
        'alternative_slots': [],
        'block_type': None
    }


# ============================================================================
# EVENT EQUIPMENT/ACTIVITIES/BUDGET HELPERS
# ============================================================================

def save_event_equipment(db, event_id, equipment_list):
    """Save equipment items for an event"""
    if not equipment_list or not isinstance(equipment_list, list):
        return
    
    # First, clear existing equipment for this event (for updates)
    db.execute_update("DELETE FROM event_equipment WHERE event_id = %s", (event_id,))
    
    # Look up equipment IDs
    for item_name in equipment_list:
        # Handle both string names and objects
        name = item_name['name'] if isinstance(item_name, dict) else item_name
        quantity = item_name['quantity'] if isinstance(item_name, dict) else 1
        
        # Find equipment ID (Validation only)
        equip = db.execute_one("SELECT id FROM equipment WHERE name = %s", (name,))
        
        if equip:
            # Insert into linking table (using name as per schema)
            db.execute_insert(
                "INSERT INTO event_equipment (event_id, equipment_name, quantity) VALUES (%s, %s, %s)", 
                (event_id, name, quantity)
            )
        else:
            # Optional: Log warning that equipment was not found
            print(f"Warning: Equipment '{name}' not found in inventory.")


def save_event_activities(db, event_id, activities_list):
    """Save activities for an event"""
    if not activities_list or not isinstance(activities_list, list):
        return
    
    # First, clear existing activities for this event (for updates)
    db.execute_update("DELETE FROM event_activities WHERE event_id = %s", (event_id,))
    
    query = "INSERT INTO event_activities (event_id, activity_name, sequence_order) VALUES (%s, %s, %s)"
    for idx, activity in enumerate(activities_list):
        # Handle both string names and objects
        name = activity['activity_name'] if isinstance(activity, dict) else activity
        db.execute_insert(query, (event_id, name, idx))


def save_budget_breakdown(db, event_id, breakdown):
    """Save budget breakdown by category"""
    if not breakdown or not isinstance(breakdown, dict):
        return
    
    # First, clear existing breakdown for this event (for updates)
    db.execute_update("DELETE FROM budget_breakdown WHERE event_id = %s", (event_id,))
    
    query = "INSERT INTO budget_breakdown (event_id, category, amount, percentage) VALUES (%s, %s, %s, %s)"
    for category, details in breakdown.items():
        # Skip empty categories with no amount
        if not category and details.get('amount', 0) == 0:
            continue
        db.execute_insert(query, (
            event_id,
            category,
            details.get('amount', 0),
            details.get('percentage', 0)
        ))


def get_event_equipment(db, event_id):
    """Get equipment list for an event"""
    # Get equipment names directly from linking table
    query = """
        SELECT equipment_name, quantity 
        FROM event_equipment
        WHERE event_id = %s 
        ORDER BY equipment_name
    """
    rows = db.execute_query(query, (event_id,))
    
    if not rows:
        return []
    
    # Return objects with name and quantity to match frontend expectations
    return [{'name': row['equipment_name'], 'quantity': row['quantity']} for row in rows]


def get_event_activities(db, event_id):
    """Get activities list for an event"""
    rows = db.execute_query(
        "SELECT activity_name, sequence_order FROM event_activities WHERE event_id = %s ORDER BY sequence_order",
        (event_id,)
    )
    if not rows:
        return []
    # Return objects with activity_name and sequence_order properties
    return [{"activity_name": row['activity_name'], "sequence_order": row['sequence_order']} for row in rows]


def get_budget_breakdown(db, event_id):
    """Get budget breakdown for an event"""
    rows = db.execute_query(
        "SELECT category, amount, percentage FROM budget_breakdown WHERE event_id = %s",
        (event_id,)
    )
    if not rows:
        return []
    # Return array of objects with category, amount, and percentage
    return [{"category": row['category'], "amount": float(row['amount']), "percentage": float(row['percentage'])} for row in rows]
