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
# Hardcoded venues - MIGRATED TO DB (venues table)
# VENUES = [
#     {'id': 1, 'name': 'Auditorium', 'type': 'Auditorium', 'capacity': 500, 'color': 'blue'},
#     {'id': 2, 'name': 'Gymnasium', 'type': 'Gym', 'capacity': 1000, 'color': 'orange'},
#     {'id': 3, 'name': 'Main Hall', 'type': 'Hall', 'capacity': 200, 'color': 'purple'},
#     {'id': 4, 'name': 'Cafeteria', 'type': 'Hall', 'capacity': 150, 'color': 'indigo'},
#     {'id': 5, 'name': 'Lab', 'type': 'Lab', 'capacity': 50, 'color': 'teal'},
#     {'id': 6, 'name': 'Courtyard', 'type': 'Outdoor', 'capacity': 2000, 'color': 'green'},
#     {'id': 7, 'name': 'Library', 'type': 'Indoor', 'capacity': 100, 'color': 'gray'}
# ]

# ============================================================================
# VENUE ENDPOINTS
# ============================================================================

@venues_bp.route('/', methods=['GET'])
def get_venues():
    """Get all available venues"""
    try:
        db = get_db()
        venues = db.execute_query("SELECT * FROM venues WHERE is_active = 1 ORDER BY name")
        # Ensure format matches frontend expectations
        # DB columns: id, name, type, capacity, color
        return jsonify({'success': True, 'venues': venues})
    except Exception as e:
        logger.error(f"Error fetching venues: {e}")
        return jsonify({'success': False, 'message': 'Failed to load venues'}), 500

@venues_bp.route('/equipment', methods=['GET'])
def get_equipment():
    """Get all available equipment from database with usage stats"""
    print("\n=== GET /api/venues/equipment called ===")
    try:
        db = get_db()
        print("Database connection obtained")
        
        # Check if archived items should be included
        include_archived = request.args.get('include_archived', 'false').lower() == 'true'
        
        # First, get all equipment from the equipment table (filter archived by default)
        if include_archived:
            equipment_query = """
                SELECT id, name, category, total_quantity, status, archived, archived_at, archive_reason
                FROM equipment
                ORDER BY category, name
            """
        else:
            equipment_query = """
                SELECT id, name, category, total_quantity, status
                FROM equipment
                WHERE archived = FALSE OR archived IS NULL
                ORDER BY category, name
            """
        
        equipment_list = db.execute_query(equipment_query)
        
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
                                qty = int(item.get('approved_quantity', item.get('quantity', 0)))
                                
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

@venues_bp.route('/equipment/<int:equipment_id>/add-quantity', methods=['PATCH'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def add_equipment_quantity(equipment_id):
    """Add quantity to existing equipment (for newly purchased stock)"""
    try:
        data = request.get_json()
        quantity_to_add = data.get('quantity')

        if not quantity_to_add or quantity_to_add <= 0:
            return jsonify({'success': False, 'error': 'Invalid quantity'}), 400

        db = get_db()
        
        # Update total_quantity by adding the new quantity
        query = """
            UPDATE equipment 
            SET total_quantity = total_quantity + %s 
            WHERE id = %s
            RETURNING id, name, category, total_quantity
        """
        result = db.execute_one(query, (quantity_to_add, equipment_id))
        
        if not result:
            return jsonify({'success': False, 'error': 'Equipment not found'}), 404

        return jsonify({
            'success': True,
            'message': f'Added {quantity_to_add} units successfully',
            'equipment': result
        })
    except Exception as e:
        logger.error(f"Error adding equipment quantity: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@venues_bp.route('/equipment/<int:equipment_id>', methods=['PATCH'])
@require_role(['Super Admin'])
def update_equipment(equipment_id):
    """Update equipment name and category (Super Admin only)"""
    try:
        data = request.get_json()
        name = data.get('name')
        category = data.get('category')

        if not name or not category:
            return jsonify({'success': False, 'error': 'Name and category are required'}), 400

        db = get_db()
        query = """
            UPDATE equipment 
            SET name = %s, category = %s
            WHERE id = %s
            RETURNING id, name, category, total_quantity
        """
        result = db.execute_one(query, (name, category, equipment_id))
        
        if not result:
            return jsonify({'success': False, 'error': 'Equipment not found'}), 404

        return jsonify({
            'success': True,
            'message': 'Equipment updated successfully',
            'equipment': result
        })
    except Exception as e:
        logger.error(f"Error updating equipment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@venues_bp.route('/equipment/<int:equipment_id>/adjust-quantity', methods=['PATCH'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def adjust_equipment_quantity(equipment_id):
    """Add or reduce equipment quantity with audit logging"""
    try:
        data = request.get_json()
        change_type = data.get('change_type')  # 'ADD' or 'REDUCE'
        quantity = data.get('quantity')
        reason = data.get('reason', '')

        if not change_type or not quantity or quantity <= 0:
            return jsonify({'success': False, 'error': 'Invalid parameters'}), 400

        if change_type not in ['ADD', 'REDUCE']:
            return jsonify({'success': False, 'error': 'Invalid change type'}), 400

        if change_type == 'REDUCE' and not reason:
            return jsonify({'success': False, 'error': 'Reason required for reducing quantity'}), 400

        db = get_db()
        
        # Get current quantity
        current = db.execute_one("SELECT total_quantity FROM equipment WHERE id = %s", (equipment_id,))
        if not current:
            return jsonify({'success': False, 'error': 'Equipment not found'}), 404

        previous_qty = current['total_quantity']
        
        # Calculate new quantity
        if change_type == 'ADD':
            new_qty = previous_qty + quantity
            quantity_change = quantity
        else:  # REDUCE
            if previous_qty < quantity:
                return jsonify({'success': False, 'error': 'Cannot reduce more than available quantity'}), 400
            new_qty = previous_qty - quantity
            quantity_change = -quantity

        # Update equipment quantity
        update_query = """
            UPDATE equipment 
            SET total_quantity = %s
            WHERE id = %s
            RETURNING id, name, category, total_quantity
        """
        result = db.execute_one(update_query, (new_qty, equipment_id))

        # Log the change
        log_query = """
            INSERT INTO equipment_quantity_logs 
            (equipment_id, change_type, quantity_change, reason, changed_by, previous_quantity, new_quantity)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        db.execute_insert(log_query, (
            equipment_id,
            change_type,
            quantity_change,
            reason,
            session.get('user_id'),
            previous_qty,
            new_qty
        ))

        return jsonify({
            'success': True,
            'message': f'Quantity {change_type.lower()}ed successfully',
            'equipment': result,
            'previous_quantity': previous_qty,
            'new_quantity': new_qty
        })
    except Exception as e:
        logger.error(f"Error adjusting equipment quantity: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@venues_bp.route('/equipment/<int:equipment_id>/archive', methods=['POST'])
@require_role(['Super Admin', 'Admin'])
def archive_equipment(equipment_id):
    """Archive equipment"""
    try:
        data = request.get_json()
        reason = data.get('reason', '')

        db = get_db()
        query = """
            UPDATE equipment 
            SET archived = TRUE,
                archived_at = CURRENT_TIMESTAMP,
                archived_by = %s,
                archive_reason = %s
            WHERE id = %s
            RETURNING id, name
        """
        result = db.execute_one(query, (session.get('user_id'), reason, equipment_id))
        
        if not result:
            return jsonify({'success': False, 'error': 'Equipment not found'}), 404

        return jsonify({
            'success': True,
            'message': f"{result['name']} archived successfully"
        })
    except Exception as e:
        logger.error(f"Error archiving equipment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@venues_bp.route('/equipment/<int:equipment_id>/unarchive', methods=['POST'])
@require_role(['Super Admin', 'Admin'])
def unarchive_equipment(equipment_id):
    """Restore archived equipment"""
    try:
        db = get_db()
        query = """
            UPDATE equipment 
            SET archived = FALSE,
                archived_at = NULL,
                archived_by = NULL,
                archive_reason = NULL
            WHERE id = %s
            RETURNING id, name
        """
        result = db.execute_one(query, (equipment_id,))
        
        if not result:
            return jsonify({'success': False, 'error': 'Equipment not found'}), 404

        return jsonify({
            'success': True,
            'message': f"{result['name']} restored successfully"
        })
    except Exception as e:
        logger.error(f"Error unarchiving equipment: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@venues_bp.route('/equipment/<int:equipment_id>/logs', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def get_equipment_logs(equipment_id):
    """Get quantity change history for equipment"""
    try:
        db = get_db()
        query = """
            SELECT 
                l.id,
                l.change_type,
                l.quantity_change,
                l.reason,
                l.changed_at,
                l.previous_quantity,
                l.new_quantity,
                u.first_name || ' ' || u.last_name as changed_by_name
            FROM equipment_quantity_logs l
            LEFT JOIN users u ON l.changed_by = u.id
            WHERE l.equipment_id = %s
            ORDER BY l.changed_at DESC
        """
        logs = db.execute_query(query, (equipment_id,))

        return jsonify({
            'success': True,
            'logs': logs
        })
    except Exception as e:
        logger.error(f"Error fetching equipment logs: {e}")
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
        
        # Apply Role-Based Filtering (Matched to api_events.py logic)
        user_role = session.get('role_name')
        user_department = session.get('department')
        user_id = session.get('user_id')
        
        if user_role == 'Admin':
            # STRICT FILTERING for Admins
            # See: Own Dept Events OR Shared OR Approved/Ongoing/Completed from others
            dept_filter = user_department if user_department else 'Unassigned'
            query += """ AND (
                e.organizing_department = %s 
                OR %s = ANY(e.shared_with_departments)
                OR e.status IN ('Approved', 'Ongoing', 'Completed')
            )"""
            params.extend([dept_filter, dept_filter])
            
        elif user_role == 'Requestor':
            # Requestor sees only own events
            query += " AND e.requestor_id = %s"
            params.append(user_id)
            
        elif user_role == 'Participant':
            # Participant sees Dept + Shared
            student = db.execute_one(
                "SELECT course FROM students WHERE user_id = %s", (user_id,)
            )
            if student and student.get('course'):
                student_dept = student['course']
                query += " AND (e.organizing_department = %s OR %s = ANY(e.shared_with_departments))"
                params.extend([student_dept, student_dept])
            else:
                 query += " AND e.status = 'Approved'"

        # Filter by month if provided
        if month_str:
            query += " AND TO_CHAR(e.start_datetime, 'YYYY-MM') = %s"
            params.append(month_str)
            
        # Filter by venue if provided
        if venue_filter:
            # Find venue name from ID using DB
            venue_row = db.execute_one("SELECT name FROM venues WHERE id = %s", (venue_filter,))
            venue_name = venue_row['name'] if venue_row else None
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
            AND e.status IN ('Under Review', 'Approved', 'Rejected', 'Conflict_Rejected')
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
            
            # Calculate precise "Requested X time ago"
            created_at = row['created_at']
            time_diff = now - created_at
            days = time_diff.days
            hours = time_diff.seconds // 3600
            minutes = (time_diff.seconds % 3600) // 60
            
            if days > 0:
                time_ago = f"{days} day{'s' if days != 1 else ''} ago"
            elif hours > 0:
                time_ago = f"{hours} hour{'s' if hours != 1 else ''} ago"
            elif minutes > 0:
                time_ago = f"{minutes} minute{'s' if minutes != 1 else ''} ago"
            else:
                time_ago = "Just now"
            
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
                    
                    # Determine item approval status
                    # Priority: 1. Item-specific status (from JSON) 2. Overall event status logic
                    saved_status = item.get('status')
                    if saved_status:
                        item_status = saved_status
                    else:
                        # Fallback logic for legacy data or new items
                        item_status = 'Approved' if row['event_status'] in ['Approved', 'Ongoing', 'Under Review'] else 'Pending'
                    
                    items.append({
                        'name': name,
                        'category': category,
                        'requested': requested_qty,
                        'available': max(0, available),
                        'status': item_status
                    })
            
            if items:  # Only include events that have valid equipment items
                # Check for venue/time conflicts with other Under Review/Approved events
                has_conflict = False
                conflicting_event = None
                if row.get('venue'):
                    conflict_check = db.execute_query("""
                        SELECT id, name FROM events 
                        WHERE id != %s 
                        AND deleted_at IS NULL
                        AND status IN ('Under Review', 'Approved')
                        AND venue = %s
                        AND (
                            (start_datetime <= %s AND end_datetime > %s) OR
                            (start_datetime < %s AND end_datetime >= %s) OR
                            (start_datetime >= %s AND end_datetime <= %s)
                        )
                        ORDER BY created_at ASC
                        LIMIT 1
                    """, (row['event_id'], row['venue'], 
                           row['start_datetime'], row['start_datetime'],
                           row['end_datetime'], row['end_datetime'],
                           row['start_datetime'], row['end_datetime']))
                    if conflict_check:
                        has_conflict = True
                        conflicting_event = conflict_check[0]['name']
                
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
                    'created_at': row['created_at'].isoformat(),  # Exact timestamp for sorting
                    'status': row['event_status'],  # Keep overall event status
                    'has_conflict': has_conflict,
                    'conflict_with': conflicting_event,
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
        reason = data.get('reason')
        rejected_item_name = data.get('rejected_item_name')
        equipment_list_payload = data.get('equipment_list') # For batch review
        
        if not equipment_list_payload and status not in ['Approved', 'Rejected']:
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
            log_reason = f'Venue {status.lower()} by Staff. Reason: {reason}' if reason else f'Venue {status.lower()} by Staff'
            
            # Return success response for venue approval
            return jsonify({'success': True, 'message': message})
            
        else:  # equipment
            # Handle Batch Review (Full List Update)
            if equipment_list_payload:
                try:
                    # Validate list structure
                    if not isinstance(equipment_list_payload, list):
                        return jsonify({'error': 'Invalid equipment list format'}), 400
                    
                    # Update event equipment
                    db.execute_update(
                        "UPDATE events SET equipment = %s WHERE id = %s",
                        (json.dumps(equipment_list_payload), event_id)
                    )
                    
                    # Determine overall status
                    # If all items are Rejected -> Rejected
                    # If some items are Rejected -> Approved (with rejections)
                    # If all items are Approved -> Approved
                    
                    all_rejected = all(item.get('status') == 'Rejected' for item in equipment_list_payload)
                    any_rejected = any(item.get('status') == 'Rejected' for item in equipment_list_payload)
                    
                    # Check for partial approvals
                    any_partial = False
                    for item in equipment_list_payload:
                        if item.get('status') == 'Approved':
                            req = int(item.get('requested', item.get('quantity', 0)))
                            app = int(item.get('approved_quantity', req))
                            if app < req:
                                any_partial = True
                                break
                    
                    new_status = 'Rejected' if all_rejected else 'Approved'
                    
                    # Construct Notification Summary
                    approved_items = []
                    rejected_items = []
                    
                    for i in equipment_list_payload:
                        name = i.get('name', 'Unknown Item')
                        if i.get('status') == 'Rejected':
                            rejected_items.append(f"• {name}: 0/{i.get('requested', i.get('quantity', 0))} available (Rejected: {i.get('rejection_reason', 'No reason provided')})")
                        elif i.get('status') == 'Approved':
                            qty_requested = int(i.get('requested', i.get('quantity', 0)))
                            qty_approved = int(i.get('approved_quantity', qty_requested))
                            
                            # Format strictly for frontend parser: • Name: Approved/Requested available
                            approved_items.append(f"• {name}: {qty_approved}/{qty_requested} available")

                    notification_msg = "Your equipment request has been reviewed. Some adjustments were made based on availability:\n\n"
                    # Combine all items into one list for the parsing regex to work on all lines
                    all_items_msg = "\n".join(approved_items + rejected_items)
                    notification_msg += all_items_msg
                    
                    # Update status
                    db.execute_update(
                        "UPDATE events SET equipment_approval_status = %s, updated_at = NOW() WHERE id = %s",
                        (new_status, event_id)
                    )
                    
                    # Send Notification
                    event_full = db.execute_one("SELECT requestor_id, name FROM events WHERE id = %s", (event_id,))
                    if event_full:
                        # Determine notification type based on outcome
                        notif_type = 'status_update'
                        notif_title = f"Equipment Review Complete: {event_full['name']}"
                        
                        # If there are ANY rejections OR partial approvals, trigger the Adjustment Review Flow
                        if any_rejected or any_partial:
                            notif_type = 'equipment_adjusted'  # Triggers resolution/withdraw flow in frontend
                            notif_title = f"Action Required: Equipment Status Update for {event_full['name']}"
                        
                        db.execute_insert(
                            """INSERT INTO notifications (user_id, event_id, type, title, message, created_at)
                               VALUES (%s, %s, %s, %s, %s, NOW())""",
                            (
                                event_full['requestor_id'], 
                                event_id, 
                                notif_type, 
                                notif_title,
                                notification_msg
                            )
                        )
                    
                    return jsonify({'success': True, 'message': f'Equipment review submitted. Status: {new_status}'})

                except Exception as e:
                    logger.error(f"Batch review error: {e}")
                    return jsonify({'success': False, 'error': str(e)}), 500

            # Handle Item-Specific Rejection
            if rejected_item_name and status == 'Rejected':
                event_full = db.execute_one("SELECT equipment, requestor_id, name FROM events WHERE id = %s", (event_id,))
                if event_full and event_full['equipment']:
                    try:
                        equipment_list = json.loads(event_full['equipment'])
                        item_found = False
                        for item in equipment_list:
                            if item.get('name') == rejected_item_name:
                                item['status'] = 'Rejected'
                                item['rejection_reason'] = reason
                                item_found = True
                                break
                        
                        if item_found:
                            db.execute_update(
                                "UPDATE events SET equipment = %s WHERE id = %s",
                                (json.dumps(equipment_list), event_id)
                            )
                    except Exception as e:
                        logger.error(f"Item rejection error: {e}")
                        return jsonify({'success': False, 'error': 'Failed to reject item'}), 500
            
            return jsonify({'success': True, 'message': 'Status updated successfully'})

    except Exception as e:
        logger.error(f"Error in update_request_status: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


