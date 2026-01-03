# ============================================================================
# VENUES & RESOURCES API
# Manage venues, equipment, and conflict detection
# ============================================================================

from flask import Blueprint, request, jsonify, session
from backend.auth import require_role
from database.db import get_db
from datetime import datetime, timedelta
import json
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
        
        # First, get all equipment from the equipment table
        equipment_list = db.execute_query("""
            SELECT id, name, category, total_quantity, status
            FROM equipment
            ORDER BY category, name
        """)
        
        # Then, get all approved/ongoing events with equipment JSON
        events_with_equipment = db.execute_query("""
            SELECT id, name, equipment
            FROM events
            WHERE status IN ('Approved', 'Ongoing') 
            AND deleted_at IS NULL
            AND equipment IS NOT NULL
            AND equipment != ''
            AND equipment != 'null'
        """)
        
        # Calculate in_use for each equipment item
        import json
        equipment_usage = {}  # {equipment_name: {'quantity': X, 'events': [...]}}
        
        for event in events_with_equipment:
            try:
                if event['equipment']:
                    equipment_data = json.loads(event['equipment'])
                    if isinstance(equipment_data, list):
                        for item in equipment_data:
                            if isinstance(item, dict) and 'name' in item and 'quantity' in item:
                                eq_name = item['name']
                                qty = int(item.get('quantity', 0))
                                
                                if eq_name not in equipment_usage:
                                    equipment_usage[eq_name] = {'quantity': 0, 'events': []}
                                
                                equipment_usage[eq_name]['quantity'] += qty
                                if event['name'] not in equipment_usage[eq_name]['events']:
                                    equipment_usage[eq_name]['events'].append(event['name'])
            except (json.JSONDecodeError, ValueError, TypeError) as e:
                logger.error(f"Error parsing equipment JSON for event {event.get('id')}: {e}")
                continue
        
        # Process the results to match frontend expectations
        equipment = []
        for item in equipment_list:
            try:
                eq_name = item['name']
                usage = equipment_usage.get(eq_name, {'quantity': 0, 'events': []})
                
                item['in_use'] = usage['quantity']
                item['available'] = item['total_quantity'] - item['in_use']
                item['used_by'] = ', '.join(usage['events']) if usage['events'] else '—'
                
                # Update status based on availability
                if item['available'] <= 0:
                    item['status'] = 'Out of Stock'
                elif item['available'] < item['total_quantity']:
                    item['status'] = 'In Use'
                else:
                    item['status'] = 'In Stock'
                
                equipment.append(item)
            except Exception as e:
                logger.error(f"Error processing equipment item {item.get('id')}: {e}")
                item['in_use'] = 0
                item['available'] = item['total_quantity']
                item['used_by'] = '—'
                equipment.append(item)
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

@venues_bp.route('/equipment/categories', methods=['GET'])
def get_equipment_categories():
    """Get all unique equipment categories from database"""
    try:
        db = get_db()
        categories = db.execute_query("SELECT DISTINCT category FROM equipment ORDER BY category")
        category_list = [row['category'] for row in categories]
        return jsonify({'success': True, 'categories': category_list})
    except Exception as e:
        logger.error(f"Error fetching categories: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

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
    Detect soft conflicts (Pending events competing for same venue/time)
    Staff resolves these by approving the best event in Account Approvals
    """
    try:
        db = get_db()
        
        # Find PENDING events that overlap - these are soft conflicts staff needs to resolve
        # Only show Pending status since those are actionable (staff approves best one)
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
                AND e1.status = 'Pending' AND e2.status = 'Pending'
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
                'severity': 'Medium'  # All soft conflicts are same priority - staff picks best
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
    """Get all equipment requests grouped by event - reads from events.equipment JSON column"""
    try:
        db = get_db()
        
        # 1. Get all events that have equipment in their JSON column
        # IMPORTANT: Only show events that department head already approved (Under Review or Approved status)
        # This enforces approval hierarchy: Dept Head → Equipment/Venue Staff
        query = """
            SELECT 
                e.id as event_id, 
                e.name as event_name, 
                e.start_datetime, 
                e.end_datetime,
                e.created_at,
                e.status as event_status,
                e.equipment,
                e.venue,
                e.venue_approval_status,
                e.equipment_approval_status,
                u.first_name, 
                u.last_name
            FROM events e
            JOIN users u ON e.requestor_id = u.id
            WHERE e.deleted_at IS NULL
            AND e.status IN ('Under Review', 'Approved')
            AND e.equipment IS NOT NULL
            AND e.equipment != '[]'
            AND e.equipment != 'null'
            ORDER BY e.start_datetime ASC
        """
        rows = db.execute_query(query)
        
        # 2. Get all equipment from the equipment table for availability calculation
        equipment_query = "SELECT name, total_quantity, category FROM equipment"
        equipment_rows = db.execute_query(equipment_query)
        equipment_map = {row['name']: {'total': row['total_quantity'], 'category': row['category']} for row in equipment_rows}
        
        # 3. Calculate current usage across all approved/ongoing events
        import json
        usage_map = {}
        for row in rows:
            if row['event_status'] in ['Approved', 'Ongoing'] and row['equipment']:
                try:
                    equipment_list = json.loads(row['equipment']) if isinstance(row['equipment'], str) else row['equipment']
                    if isinstance(equipment_list, list):
                        for item in equipment_list:
                            name = item.get('name')
                            qty = item.get('quantity', 1)
                            if name:
                                usage_map[name] = usage_map.get(name, 0) + qty
                except (json.JSONDecodeError, TypeError):
                    pass
        
        # 4. Build response with events and their equipment
        events_list = []
        stats = {
            'pending': 0,
            'approved': 0,
            'total': 0,
            'upcoming': 0
        }
        
        now = datetime.now()
        
        for row in rows:
            # Parse equipment JSON
            try:
                equipment_list = json.loads(row['equipment']) if isinstance(row['equipment'], str) else row['equipment']
                if not isinstance(equipment_list, list) or len(equipment_list) == 0:
                    continue
            except (json.JSONDecodeError, TypeError):
                continue
            
            # Calculate "Requested X days ago"
            created_at = row['created_at']
            days_ago = (now - created_at).days
            time_ago = f"{days_ago} days ago" if days_ago > 0 else "Today"
            
            # Build items list with availability
            items = []
            for item in equipment_list:
                name = item.get('name')
                requested_qty = item.get('quantity', 1)
                
                if name and name in equipment_map:
                    total = equipment_map[name]['total']
                    used = usage_map.get(name, 0)
                    category = equipment_map[name]['category']
                    
                    # If this event is approved/under review, subtract its usage from the used count
                    # to show the "available" correctly
                    if row['event_status'] in ['Approved', 'Ongoing', 'Under Review']:
                        available = total - (used - requested_qty)
                    else:
                        available = total - used
                    
                    # Determine item approval status based on event status
                    # Pending = waiting for staff approval
                    # Under Review or higher = staff has approved equipment
                    item_status = 'Approved' if row['event_status'] in ['Approved', 'Ongoing', 'Under Review'] else 'Pending'
                    
                    items.append({
                        'name': name,
                        'category': category,
                        'requested': requested_qty,
                        'available': max(0, available),
                        'status': item_status
                    })
            
            if items:  # Only include events that have valid equipment items
                event_obj = {
                    'id': row['event_id'],
                    'name': row['event_name'],
                    'date': row['start_datetime'].isoformat(),
                    'end_date': row['end_datetime'].isoformat() if row.get('end_datetime') else None,
                    'venue': row.get('venue'),
                    'venue_approval_status': row.get('venue_approval_status', 'Pending'),
                    'equipment_approval_status': row.get('equipment_approval_status', 'Pending'),
                    'requestor': f"{row['first_name']} {row['last_name']}",
                    'requested_at': time_ago,
                    'status': row['event_status'],  # Keep overall event status
                    'items': items
                }
                
                events_list.append(event_obj)
                stats['total'] += 1
                
                # Count as approved if both venue and equipment are approved
                venue_status = row.get('venue_approval_status', 'Pending')
                equipment_status = row.get('equipment_approval_status', 'Pending')
                
                if venue_status == 'Approved' and equipment_status == 'Approved':
                    stats['approved'] += 1
                else:
                    stats['pending'] += 1
                
                # Check if upcoming (next 7 days)
                if 0 <= (row['start_datetime'] - now).days <= 7:
                    stats['upcoming'] += 1
            
        return jsonify({
            'success': True,
            'stats': stats,
            'requests': events_list
        })
        
    except Exception as e:
        logger.error(f"Get requests error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@venues_bp.route('/requests/<int:event_id>/status', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def update_request_status(event_id):
    """Update venue or equipment approval status separately"""
    try:
        data = request.json
        status = data.get('status')  # 'Approved' or 'Rejected'
        approval_type = data.get('type')  # 'venue' or 'equipment'
        
        if status not in ['Approved', 'Rejected']:
            return jsonify({'error': 'Invalid status'}), 400
            
        if approval_type not in ['venue', 'equipment']:
            return jsonify({'error': 'Invalid type. Must be "venue" or "equipment"'}), 400
            
        db = get_db()
        
        # Get current event
        event = db.execute_one(
            "SELECT status, venue_approval_status, equipment_approval_status FROM events WHERE id = %s", 
            (event_id,)
        )
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        old_event_status = event['status']
        
        # Update the specific approval status
        if approval_type == 'venue':
            db.execute_update(
                "UPDATE events SET venue_approval_status = %s, updated_at = NOW() WHERE id = %s",
                (status, event_id)
            )
            message = f'Venue {status.lower()} successfully'
            log_reason = f'Venue {status.lower()} by Staff'
        else:  # equipment
            # If approving equipment, implement flexible approval (auto-adjust quantities)
            if status == 'Approved':
                # Get event's equipment JSON
                event_full = db.execute_one(
                    "SELECT equipment, requestor_id FROM events WHERE id = %s", 
                    (event_id,)
                )
                
                if event_full and event_full['equipment']:
                    try:
                        equipment_list = json.loads(event_full['equipment'])
                        adjusted_equipment = []
                        adjustments = []  # Track what was changed
                        
                        # Get all equipment from equipment table
                        all_equipment = db.execute_query("SELECT name, total_quantity FROM equipment WHERE status = 'Available'")
                        equipment_map = {eq['name']: eq['total_quantity'] for eq in all_equipment}
                        
                        # Calculate current usage (from Approved/Ongoing/Under Review events)
                        usage_query = """
                            SELECT equipment
                            FROM events
                            WHERE status IN ('Approved', 'Ongoing', 'Under Review')
                            AND deleted_at IS NULL
                            AND id != %s
                        """
                        usage_rows = db.execute_query(usage_query, (event_id,))
                        
                        usage_map = {}
                        for row in usage_rows:
                            try:
                                eq_list = json.loads(row['equipment'] or '[]')
                                for item in eq_list:
                                    name = item.get('name')
                                    qty = item.get('quantity', 0)
                                    if name:
                                        usage_map[name] = usage_map.get(name, 0) + qty
                            except:
                                continue
                        
                        # Process each equipment item
                        for item in equipment_list:
                            name = item.get('name')
                            requested_qty = item.get('quantity', 0)
                            
                            if not name or requested_qty <= 0:
                                continue
                                
                            # Calculate availability
                            total_stock = equipment_map.get(name, 0)
                            used_qty = usage_map.get(name, 0)
                            available_qty = max(0, total_stock - used_qty)
                            
                            if available_qty >= requested_qty:
                                # Fully available - approve as requested
                                adjusted_equipment.append({'name': name, 'quantity': requested_qty})
                            elif available_qty > 0:
                                # Partially available - approve reduced quantity
                                adjusted_equipment.append({'name': name, 'quantity': available_qty})
                                adjustments.append(f"{name}: {available_qty}/{requested_qty} available")
                            else:
                                # Not available - skip this item
                                adjustments.append(f"{name}: unavailable (requested {requested_qty})")
                        
                        # Update event with adjusted equipment
                        if adjusted_equipment != equipment_list:
                            db.execute_update(
                                "UPDATE events SET equipment = %s WHERE id = %s",
                                (json.dumps(adjusted_equipment), event_id)
                            )
                        
                        # Create notification for requestor if adjustments were made
                        if adjustments and event_full.get('requestor_id'):
                            event_name = event_full.get('name', 'Your Event')
                            notification_title = "Equipment Approval - Adjustments Made"
                            notification_msg = (
                                f"Your equipment request for '{event_name}' has been approved with adjustments:\n\n" +
                                "\n".join(f"• {adj}" for adj in adjustments) +
                                "\n\nPlease review the updated equipment list."
                            )
                            
                            db.execute_insert(
                                """INSERT INTO notifications (user_id, event_id, type, title, message, created_at)
                                   VALUES (%s, %s, %s, %s, %s, NOW())""",
                                (event_full['requestor_id'], event_id, 'equipment_adjusted', notification_title, notification_msg)
                            )
                        
                    except (json.JSONDecodeError, Exception) as e:
                        logger.error(f"Equipment adjustment error: {str(e)}")
            
            db.execute_update(
                "UPDATE events SET equipment_approval_status = %s, updated_at = NOW() WHERE id = %s",
                (status, event_id)
            )
            message = f'Equipment {status.lower()} successfully'
            log_reason = f'Equipment {status.lower()} by Staff'
        
        # Get updated approval statuses
        updated_event = db.execute_one(
            "SELECT venue_approval_status, equipment_approval_status FROM events WHERE id = %s", 
            (event_id,)
        )
        
        # Update overall event status based on both approvals
        new_event_status = old_event_status
        
        if status == 'Rejected':
            # If either is rejected, reject the whole event
            new_event_status = 'Rejected'
            db.execute_update(
                "UPDATE events SET status = %s WHERE id = %s",
                (new_event_status, event_id)
            )
        elif updated_event['venue_approval_status'] == 'Approved' and updated_event['equipment_approval_status'] == 'Approved':
            # Both resources approved - finalize event and reject conflicts
            if old_event_status == 'Under Review':
                # Auto-reject soft conflicts BEFORE finalizing
                from backend.api_events import _auto_reject_soft_conflicts
                rejected_count = _auto_reject_soft_conflicts(db, event_id)
                logger.info(f"Auto-rejected {rejected_count} conflicting events")
                
                new_event_status = 'Approved'
                log_reason = 'Resources approved by Staff (auto-rejected conflicts)'
                db.execute_update(
                    "UPDATE events SET status = %s WHERE id = %s",
                    (new_event_status, event_id)
                )
        
        # Log status history if table exists and status changed
        if new_event_status != old_event_status:
            try:
                db.execute_insert(
                    """INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
                       VALUES (%s, %s, %s, %s, %s)""",
                    (event_id, old_event_status, new_event_status, session.get('user_id'), log_reason)
                )
            except:
                pass  # Table might not exist
        
        return jsonify({'success': True, 'message': message})
        
    except Exception as e:
        logger.error(f"Update status error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500
