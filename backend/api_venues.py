# ============================================================================
# VENUES & RESOURCES API
# Manage venues, equipment, and conflict detection
# ============================================================================

from flask import Blueprint, request, jsonify, session
from backend.auth import require_role
from database.db import get_db
from datetime import datetime, timedelta
import logging
import traceback

logger = logging.getLogger(__name__)

venues_bp = Blueprint('venues', __name__, url_prefix='/api/venues')

# Hardcoded venues for MVP (In production, this would be a database table)
VENUES = [
    {'id': 1, 'name': 'Auditorium', 'type': 'Auditorium', 'capacity': 500, 'color': 'blue'},
    {'id': 2, 'name': 'Gymnasium', 'type': 'Gym', 'capacity': 1000, 'color': 'orange'},
    {'id': 3, 'name': 'Main Hall', 'type': 'Hall', 'capacity': 200, 'color': 'purple'},
    {'id': 4, 'name': 'Cafeteria', 'type': 'Hall', 'capacity': 150, 'color': 'indigo'},
    {'id': 5, 'name': 'Lab', 'type': 'Lab', 'capacity': 50, 'color': 'teal'},
    {'id': 6, 'name': 'Courtyard', 'type': 'Outdoor', 'capacity': 2000, 'color': 'green'},
    {'id': 7, 'name': 'Library', 'type': 'Indoor', 'capacity': 100, 'color': 'gray'}
]

# ============================================================================
# VENUE ENDPOINTS
# ============================================================================

@venues_bp.route('/', methods=['GET'])
def get_venues():
    """Get all available venues"""
    return jsonify({'success': True, 'venues': VENUES})

@venues_bp.route('/equipment', methods=['GET'])
def get_equipment():
    """Get all available equipment from database with usage stats"""
    print("\n=== GET /api/venues/equipment called ===")
    try:
        db = get_db()
        print("Database connection obtained")
        # Fetch equipment with calculated in_use count and usage details
        # We only count equipment for events that are Approved or Ongoing
        query = """
            SELECT 
                e.id, e.name, e.category, e.total_quantity, e.status,
                COALESCE(SUM(CASE 
                    WHEN ev.status IN ('Approved', 'Ongoing') AND ev.deleted_at IS NULL 
                    THEN ee.quantity ELSE 0 END), 0) as in_use,
                GROUP_CONCAT(DISTINCT CASE 
                    WHEN ev.status IN ('Approved', 'Ongoing') AND ev.deleted_at IS NULL 
                    THEN ev.name END SEPARATOR ', ') as used_by_events
            FROM equipment e
            LEFT JOIN event_equipment ee ON e.name = ee.equipment_name
            LEFT JOIN events ev ON ee.event_id = ev.id
            GROUP BY e.id
            ORDER BY e.category, e.name
        """
        equipment = db.execute_query(query)
        
        # Process the results to match frontend expectations
        for item in equipment:
            try:
                item['in_use'] = int(item['in_use']) if item['in_use'] is not None else 0
                item['available'] = item['total_quantity'] - item['in_use']
                item['used_by'] = item['used_by_events'] if item['used_by_events'] else '—'
                
                # Update status based on availability
                if item['available'] <= 0:
                    item['status'] = 'Out of Stock'
                elif item['available'] < item['total_quantity']:
                    item['status'] = 'In Use'
                else:
                    item['status'] = 'In Stock'
            except Exception as e:
                logger.error(f"Error processing equipment item {item.get('id')}: {e}")
                item['in_use'] = 0
                item['available'] = 0
                item['status'] = 'Error'

        return jsonify({'success': True, 'equipment': equipment})
    except Exception as e:
        logger.error(f"Error fetching equipment: {e}")
        import traceback
        traceback_str = traceback.format_exc()
        print(traceback_str)
        return jsonify({
            'success': False, 
            'error': str(e),
            'traceback': traceback_str
        }), 500

@venues_bp.route('/equipment', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def add_equipment():
    """Add new equipment to inventory"""
    try:
        data = request.get_json()
        name = data.get('name')
        category = data.get('category')
        total_quantity = data.get('total_quantity')
        
        if not all([name, category, total_quantity]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
            
        db = get_db()
        query = "INSERT INTO equipment (name, category, total_quantity) VALUES (%s, %s, %s)"
        equipment_id = db.execute_insert(query, (name, category, total_quantity))
        
        return jsonify({
            'success': True, 
            'message': 'Equipment added successfully',
            'equipment': {
                'id': equipment_id,
                'name': name,
                'category': category,
                'total_quantity': total_quantity
            }
        })
    except Exception as e:
        logger.error(f"Error adding equipment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@venues_bp.route('/conflicts', methods=['GET'])
def get_conflicts():
    """
    Detect overlapping bookings for venues
    Returns a list of conflict groups
    """
    try:
        db = get_db()
        
        # Find events that overlap in time and use the same venue
        # We look for events that are NOT rejected and NOT deleted
        query = """
            SELECT 
                e1.id as id1, e1.name as name1, e1.venue as venue1, 
                e1.start_datetime as start1, e1.end_datetime as end1, 
                e1.status as status1, e1.event_type as type1,
                u1.first_name as fn1, u1.last_name as ln1,
                
                e2.id as id2, e2.name as name2, e2.venue as venue2, 
                e2.start_datetime as start2, e2.end_datetime as end2, 
                e2.status as status2, e2.event_type as type2,
                u2.first_name as fn2, u2.last_name as ln2
            FROM events e1
            JOIN events e2 ON e1.venue = e2.venue 
                AND e1.id < e2.id  -- Avoid duplicates and self-matches
            JOIN users u1 ON e1.requestor_id = u1.id
            JOIN users u2 ON e2.requestor_id = u2.id
            WHERE 
                e1.deleted_at IS NULL AND e2.deleted_at IS NULL
                AND e1.status != 'Rejected' AND e2.status != 'Rejected'
                AND e1.start_datetime < e2.end_datetime 
                AND e1.end_datetime > e2.start_datetime
            ORDER BY e1.start_datetime ASC
        """
        
        conflicts_raw = db.execute_query(query)
        
        conflicts = []
        for c in conflicts_raw:
            conflicts.append({
                'venue': c['venue1'],
                'event1': {
                    'id': c['id1'],
                    'name': c['name1'],
                    'start': c['start1'].isoformat(),
                    'end': c['end1'].isoformat(),
                    'status': c['status1'],
                    'type': c['type1'],
                    'requestor': f"{c['fn1']} {c['ln1']}"
                },
                'event2': {
                    'id': c['id2'],
                    'name': c['name2'],
                    'start': c['start2'].isoformat(),
                    'end': c['end2'].isoformat(),
                    'status': c['status2'],
                    'type': c['type2'],
                    'requestor': f"{c['fn2']} {c['ln2']}"
                },
                'severity': 'High' if c['status1'] == 'Approved' and c['status2'] == 'Approved' else 'Medium'
            })
            
        return jsonify({'success': True, 'conflicts': conflicts})
        
    except Exception as e:
        logger.error(f"Error detecting conflicts: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@venues_bp.route('/resolve', methods=['POST'])
@require_role(['Admin', 'Super Admin', 'Staff'])
def resolve_conflict():
    """
    Resolve a conflict by rejecting one event or updating its venue
    """
    try:
        data = request.get_json()
        action = data.get('action') # 'reject' or 'change_venue'
        event_id = data.get('event_id')
        
        db = get_db()
        
        if action == 'reject':
            reason = data.get('reason', 'Conflict resolution')
            
            # Update status to Rejected
            db.execute_query(
                "UPDATE events SET status = 'Rejected' WHERE id = %s",
                (event_id,)
            )
            
            # Log history
            db.execute_query(
                """INSERT INTO event_status_history 
                   (event_id, old_status, new_status, changed_by, reason)
                   VALUES (%s, (SELECT status FROM events WHERE id=%s), 'Rejected', %s, %s)""",
                (event_id, event_id, session.get('user_id'), reason)
            )
            
            return jsonify({'success': True, 'message': 'Event rejected successfully'})
            
        elif action == 'change_venue':
            new_venue = data.get('new_venue')
            if not new_venue:
                return jsonify({'success': False, 'error': 'New venue is required'}), 400
                
            db.execute_query(
                "UPDATE events SET venue = %s WHERE id = %s",
                (new_venue, event_id)
            )
            
            return jsonify({'success': True, 'message': 'Venue updated successfully'})
            
        else:
            return jsonify({'success': False, 'error': 'Invalid action'}), 400
            
    except Exception as e:
        logger.error(f"Error resolving conflict: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@venues_bp.route('/calendar', methods=['GET'])
def get_venue_calendar():
    """
    Get events formatted for calendar view
    Query Params: month (YYYY-MM), venue_id (optional)
    """
    try:
        month_str = request.args.get('month')
        venue_filter = request.args.get('venue_id')
        
        db = get_db()
        
        # Base query
        query = """
            SELECT e.id, e.name, e.venue, e.start_datetime, e.end_datetime, 
                   e.status, e.event_type, u.first_name, u.last_name
            FROM events e
            JOIN users u ON e.requestor_id = u.id
            WHERE e.deleted_at IS NULL
        """
        params = []
        
        # Filter by month if provided
        if month_str:
            query += " AND DATE_FORMAT(e.start_datetime, '%%Y-%%m') = %s"
            params.append(month_str)
            
        # Filter by venue if provided
        if venue_filter:
            # Find venue name from ID
            venue_name = next((v['name'] for v in VENUES if str(v['id']) == venue_filter), None)
            if venue_name:
                query += " AND e.venue = %s"
                params.append(venue_name)
        
        query += " ORDER BY e.start_datetime ASC"
        
        events = db.execute_query(query, tuple(params))
        
        # Format for frontend
        calendar_events = []
        for event in events:
            # Determine color based on status
            color_class = 'bg-gray-100 text-gray-600 border-gray-200' # Default for Draft
            if event['status'] == 'Approved':
                color_class = 'bg-green-100 text-green-800 border-green-200'
            elif event['status'] == 'Pending':
                color_class = 'bg-yellow-100 text-yellow-800 border-yellow-200'
            elif event['status'] == 'Under Review':
                color_class = 'bg-purple-100 text-purple-800 border-purple-200'
            elif event['status'] == 'Draft':
                color_class = 'bg-slate-100 text-slate-600 border-slate-200 border-dashed'
                
            calendar_events.append({
                'id': event['id'],
                'title': event['name'],
                'start': event['start_datetime'].isoformat(),
                'end': event['end_datetime'].isoformat(),
                'venue': event['venue'],
                'status': event['status'],
                'organizer': f"{event['first_name']} {event['last_name']}",
                'colorClass': color_class
            })
            
        return jsonify({'success': True, 'events': calendar_events})
        
    except Exception as e:
        logger.error(f"Calendar error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

def get_venue_conflicts(db, venue, start_str, end_str, exclude_event_id=None):
    """Helper to check for venue conflicts"""
    query = """
        SELECT id, name, start_datetime, end_datetime, status 
        FROM events 
        WHERE venue = %s 
        AND status IN ('Approved', 'Pending', 'Under Review')
        AND deleted_at IS NULL
        AND (
            (start_datetime <= %s AND end_datetime > %s) OR
            (start_datetime < %s AND end_datetime >= %s) OR
            (start_datetime >= %s AND end_datetime <= %s)
        )
    """
    params = [venue, end_str, start_str, end_str, start_str, start_str, end_str]
    
    if exclude_event_id:
        query += " AND id != %s"
        params.append(exclude_event_id)
        
    return db.execute_query(query, tuple(params))

@venues_bp.route('/check-conflicts', methods=['POST'])
def check_conflicts():
    """Check if a proposed event conflicts with existing ones"""
    try:
        data = request.json
        venue = data.get('venue')
        start_str = data.get('start_datetime') # ISO format
        end_str = data.get('end_datetime')
        exclude_event_id = data.get('exclude_event_id')
        
        if not venue or not start_str or not end_str:
            return jsonify({'error': 'Missing parameters'}), 400
            
        db = get_db()
        conflicts = get_venue_conflicts(db, venue, start_str, end_str, exclude_event_id)
        
        return jsonify({
            'success': True, 
            'has_conflicts': len(conflicts) > 0,
            'conflicts': conflicts
        })
        
    except Exception as e:
        logger.error(f"Conflict check error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


# ============================================================================
# EQUIPMENT APPROVAL ENDPOINTS
# ============================================================================

@venues_bp.route('/requests', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def get_equipment_requests():
    """Get all equipment requests grouped by event"""
    try:
        db = get_db()
        
        # 1. Get all events that have equipment requests
        query = """
            SELECT 
                e.id as event_id, e.name as event_name, e.start_datetime, e.created_at,
                u.first_name, u.last_name,
                ee.id as req_id, ee.equipment_name, ee.quantity, ee.status as req_status,
                eq.category, eq.total_quantity
            FROM events e
            JOIN event_equipment ee ON e.id = ee.event_id
            JOIN users u ON e.requestor_id = u.id
            LEFT JOIN equipment eq ON ee.equipment_name = eq.name
            WHERE e.deleted_at IS NULL
            ORDER BY e.start_datetime ASC
        """
        rows = db.execute_query(query)
        
        # 2. Calculate availability for each item
        # We need to know how many are used by OTHER approved/ongoing events at the SAME time
        # For simplicity in MVP, we'll just check global usage or assume availability based on total - current usage
        # A better approach is time-based availability, but that's complex.
        # Let's stick to the "In Use" logic we used in get_equipment()
        
        usage_query = """
            SELECT equipment_name, SUM(quantity) as used_qty
            FROM event_equipment ee
            JOIN events e ON ee.event_id = e.id
            WHERE e.status IN ('Approved', 'Ongoing') 
            AND e.deleted_at IS NULL
            GROUP BY equipment_name
        """
        usage_rows = db.execute_query(usage_query)
        usage_map = {row['equipment_name']: int(row['used_qty']) for row in usage_rows}
        
        # 3. Group by Event
        events_map = {}
        stats = {
            'pending': 0,
            'approved': 0,
            'total': 0,
            'upcoming': 0
        }
        
        now = datetime.now()
        
        for row in rows:
            evt_id = row['event_id']
            if evt_id not in events_map:
                # Calculate "Requested X days ago"
                created_at = row['created_at']
                days_ago = (now - created_at).days
                time_ago = f"{days_ago} days ago" if days_ago > 0 else "Today"
                
                events_map[evt_id] = {
                    'id': evt_id,
                    'name': row['event_name'],
                    'date': row['start_datetime'].isoformat(),
                    'requestor': f"{row['first_name']} {row['last_name']}",
                    'requested_at': time_ago,
                    'status': 'Pending', # Default, will update based on items
                    'items': []
                }
                stats['total'] += 1
                
                # Check if upcoming (next 7 days)
                if 0 <= (row['start_datetime'] - now).days <= 7:
                    stats['upcoming'] += 1
            
            # Calculate availability
            # Available = Total - (Used by others)
            # Note: If this event is already approved, its own usage is in usage_map.
            # We should probably subtract it if we want "Available for THIS request"
            # But for "Approval", we want to know if we CAN approve it.
            
            total = row['total_quantity'] or 0
            used = usage_map.get(row['equipment_name'], 0)
            
            # If this request is NOT approved yet, 'used' doesn't include it.
            # If it IS approved, 'used' includes it.
            # We want to show how many are left.
            
            available = total - used
            # If the request is already approved, we should add its quantity back to available 
            # to show that "these are the ones you secured"
            if row['req_status'] == 'Approved':
                available += row['quantity']
                
            events_map[evt_id]['items'].append({
                'id': row['req_id'],
                'name': row['equipment_name'],
                'category': row['category'] or 'General',
                'requested': row['quantity'],
                'available': max(0, available),
                'status': row['req_status']
            })
            
        # 4. Determine Event Request Status
        # If ALL items are Approved -> Approved
        # If ANY item is Rejected -> Rejected (or Partial)
        # Else -> Pending
        
        final_events = []
        for evt in events_map.values():
            statuses = [item['status'] for item in evt['items']]
            
            if all(s == 'Approved' for s in statuses):
                evt['status'] = 'Approved'
                stats['approved'] += 1
            elif any(s == 'Rejected' for s in statuses):
                evt['status'] = 'Rejected'
            else:
                evt['status'] = 'Pending'
                stats['pending'] += 1
                
            final_events.append(evt)
            
        return jsonify({
            'success': True,
            'stats': stats,
            'requests': final_events
        })
        
    except Exception as e:
        logger.error(f"Get requests error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@venues_bp.route('/requests/<int:event_id>/status', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def update_request_status(event_id):
    """Update status of all equipment requests for an event"""
    try:
        data = request.json
        status = data.get('status') # 'Approved' or 'Rejected'
        
        if status not in ['Approved', 'Rejected']:
            return jsonify({'error': 'Invalid status'}), 400
            
        db = get_db()
        
        # Update all items for this event
        db.execute_update(
            "UPDATE event_equipment SET status = %s WHERE event_id = %s",
            (status, event_id)
        )
        
        # Update event status based on equipment approval
        if status == 'Approved':
            # Change event status to "Under Review" (Staff approved resources, awaiting Admin final approval)
            db.execute_update(
                "UPDATE events SET status = 'Under Review', updated_at = NOW() WHERE id = %s",
                (event_id,)
            )
            # Log status history
            db.execute_insert(
                """INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
                   VALUES (%s, 'Pending', 'Under Review', %s, %s)""",
                (event_id, session['user_id'], 'All equipment approved by Staff')
            )
        elif status == 'Rejected':
            # Change event status to "Rejected" 
            db.execute_update(
                "UPDATE events SET status = 'Rejected', updated_at = NOW() WHERE id = %s",
                (event_id,)
            )
            # Log status history
            db.execute_insert(
                """INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
                   VALUES (%s, 'Pending', 'Rejected', %s, %s)""",
                (event_id, session['user_id'], 'Equipment request rejected by Staff')
            )
        
        return jsonify({'success': True, 'message': f'Requests {status}. Event status updated.'})
        
    except Exception as e:
        logger.error(f"Update status error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
