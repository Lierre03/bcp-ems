# ============================================================================
# EVENTS API MODULE
# Event CRUD operations, status management, approval workflow
# ============================================================================

from flask import Blueprint, request, jsonify, session
from backend.auth import require_role
from backend.event_helpers import (
    save_event_equipment, save_event_activities, save_budget_breakdown,
    get_event_equipment, get_event_activities, get_budget_breakdown
)
from backend.api_venues import get_venue_conflicts
from database.db import get_db
from datetime import datetime
import logging
import traceback

logger = logging.getLogger(__name__)

# Create blueprint
events_bp = Blueprint('events', __name__, url_prefix='/api/events')


# ============================================================================
# STATUS WORKFLOW CONFIGURATION (Reusable)
# ============================================================================

# Valid status transitions: {current_status: {action: (new_status, allowed_roles)}}
STATUS_TRANSITIONS = {
    'Pending': {
        'review': ('Under Review', ['Super Admin', 'Admin', 'Staff']),
        'reject': ('Rejected', ['Super Admin', 'Admin', 'Staff'])
    },
    'Under Review': {
        'approve': ('Approved', ['Super Admin', 'Admin']),
        'reject': ('Rejected', ['Super Admin', 'Admin'])
    },
    'Approved': {
        'start': ('Ongoing', ['Super Admin', 'Admin', 'Staff']),
        'reject': ('Rejected', ['Super Admin', 'Admin'])
    },
    'Ongoing': {
        'complete': ('Completed', ['Super Admin', 'Admin', 'Staff'])
    },
    'Completed': {
        'archive': ('Archived', ['Super Admin', 'Admin'])
    }
}

# Status display info for frontend
STATUS_INFO = {
    'Pending': {'color': 'yellow', 'icon': 'clock', 'label': 'Pending Approval'},
    'Under Review': {'color': 'blue', 'icon': 'search', 'label': 'Under Review'},
    'Approved': {'color': 'green', 'icon': 'check', 'label': 'Approved'},
    'Rejected': {'color': 'red', 'icon': 'x', 'label': 'Rejected'},
    'Ongoing': {'color': 'purple', 'icon': 'play', 'label': 'Ongoing'},
    'Completed': {'color': 'teal', 'icon': 'flag', 'label': 'Completed'},
    'Archived': {'color': 'slate', 'icon': 'archive', 'label': 'Archived'}
}

def _handle_conflicts(db, event_id, action_on_conflict):
    """
    Handle conflicts based on the selected action.
    action_on_conflict: 'cancel_others' | 'overbook'
    """
    if action_on_conflict == 'overbook':
        logger.warning(f"Event {event_id} force approved with overbooking (conflicts ignored)")
        return

    if action_on_conflict != 'cancel_others':
        return
        
    # Get event details to check conflicts
    event = db.execute_one(
        "SELECT venue, start_datetime, end_datetime FROM events WHERE id = %s",
        (event_id,)
    )
    
    if not event:
        return

    # Find conflicting events
    conflicts = get_venue_conflicts(
        db, 
        event['venue'], 
        event['start_datetime'], 
        event['end_datetime'], 
        exclude_event_id=event_id
    )
    
    for conflict in conflicts:
        # Set conflicting event to Pending (can be rescheduled)
        db.execute_update(
            "UPDATE events SET status = 'Pending', updated_at = NOW() WHERE id = %s",
            (conflict['id'],)
        )
        
        # Log history
        db.execute_insert(
            """INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
               VALUES (%s, %s, 'Pending', %s, %s)""",
            (conflict['id'], conflict['status'], session['user_id'], f"Displaced by high priority event #{event_id}")
        )
        logger.info(f"Event {conflict['id']} displaced by {event_id}")


def _change_event_status(event_id, action, reason=None, action_on_conflict=None):
    """
    Reusable helper to change event status with validation and history logging.
    Returns (success, message, http_code)
    """
    db = get_db()
    
    # Get current event
    event = db.execute_one(
        "SELECT id, name, status, requestor_id FROM events WHERE id = %s AND deleted_at IS NULL",
        (event_id,)
    )
    
    if not event:
        return False, 'Event not found', 404
    
    current_status = event['status']
    
    # Check if transition is valid
    if current_status not in STATUS_TRANSITIONS:
        return False, f'No actions available for status: {current_status}', 400
    
    if action not in STATUS_TRANSITIONS[current_status]:
        valid_actions = list(STATUS_TRANSITIONS[current_status].keys())
        return False, f'Invalid action "{action}" for status "{current_status}". Valid: {valid_actions}', 400
    
    new_status, allowed_roles = STATUS_TRANSITIONS[current_status][action]
    
    # Check role permission
    if session.get('role_name') not in allowed_roles:
        return False, f'Role "{session.get("role_name")}" cannot perform "{action}"', 403
    
    # Rejection requires reason
    if action == 'reject' and not reason:
        return False, 'Rejection reason is required (min 10 characters)', 400
    
    if action == 'reject' and len(reason) < 10:
        return False, 'Rejection reason must be at least 10 characters', 400
    
    # Handle conflicts if approving
    if new_status == 'Approved' and action_on_conflict:
        _handle_conflicts(db, event_id, action_on_conflict)

    # Update status
    db.execute_update(
        "UPDATE events SET status = %s, updated_at = NOW() WHERE id = %s",
        (new_status, event_id)
    )
    
    # Log to history
    db.execute_insert(
        """INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
           VALUES (%s, %s, %s, %s, %s)""",
        (event_id, current_status, new_status, session['user_id'], reason or f'Status changed via {action}')
    )
    
    logger.info(f"Event {event_id} status: {current_status} → {new_status} by {session['username']}")
    
    return True, f'Event {action}ed successfully', 200


# ============================================================================
# EVENT CRUD OPERATIONS
# ============================================================================

@events_bp.route('', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor', 'Participant'])
def get_events():
    """
    Get all events (with optional filters)
    GET /api/events?status=Planning&type=Academic&requestor_id=5
    """
    print("\n=== GET /api/events called ===")
    print(f"User role: {session.get('role_name')}")
    try:
        db = get_db()
        print("Database connection obtained")
        
        # Build query with filters - use aliases to match frontend expectations
        query = """
            SELECT e.id, 
                   e.name,
                   e.event_type as type,
                   DATE_FORMAT(e.start_datetime, '%%Y-%%m-%%d') as date,
                   DATE_FORMAT(e.end_datetime, '%%Y-%%m-%%d') as endDate,
                   DATE_FORMAT(e.start_datetime, '%%H:%%i') as startTime,
                   DATE_FORMAT(e.end_datetime, '%%H:%%i') as endTime,
                   e.expected_attendees as attendees,
                   e.status,
                   e.description,
                   e.venue,
                   COALESCE(b.total_budget, 0) as budget,
                   COALESCE(e.organizer, CONCAT(u.first_name, ' ', u.last_name)) as organizer,
                   u.username as requestor_username,
                   e.requestor_id
            FROM events e
            JOIN users u ON e.requestor_id = u.id
            LEFT JOIN budgets b ON e.id = b.event_id
            WHERE e.deleted_at IS NULL
        """
        params = []
        
        # Apply filters
        if request.args.get('status'):
            query += " AND e.status = %s"
            params.append(request.args.get('status'))
        
        if request.args.get('type'):
            query += " AND e.event_type = %s"
            params.append(request.args.get('type'))
        
        if request.args.get('requestor_id'):
            query += " AND e.requestor_id = %s"
            params.append(request.args.get('requestor_id'))
        
        # Order by date
        query += " ORDER BY e.start_datetime DESC"
        
        events = db.execute_query(query, tuple(params))
        
        # Convert Decimal types to float for JSON serialization
        for e in events:
            try:
                if e.get('budget') is not None:
                    e['budget'] = float(e['budget'])
            except Exception as conversion_err:
                logger.error(f"Error converting budget for event {e.get('id')}: {conversion_err}")
                e['budget'] = 0.0
        
        return jsonify({
            'success': True,
            'events': events,
            'count': len(events)
        }), 200
        
    except Exception as e:
        logger.error(f"Get events error: {e}")
        import traceback
        traceback_str = traceback.format_exc()
        print(traceback_str) # Ensure it prints to stdout/stderr
        return jsonify({
            'error': 'Failed to fetch events', 
            'details': str(e),
            'traceback': traceback_str
        }), 500


@events_bp.route('/<int:event_id>', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor', 'Participant'])
def get_event(event_id):
    """Get single event by ID with all details"""
    try:
        db = get_db()
        query = """
            SELECT e.*, u.username as requestor_username,
                   CONCAT(u.first_name, ' ', u.last_name) as requestor_name,
                   b.total_budget, b.is_ai_predicted, b.prediction_confidence
            FROM events e
            JOIN users u ON e.requestor_id = u.id
            LEFT JOIN budgets b ON e.id = b.event_id
            WHERE e.id = %s AND e.deleted_at IS NULL
        """
        event = db.execute_one(query, (event_id,))
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
            
        # Convert Decimal types
        if event.get('total_budget') is not None:
            event['total_budget'] = float(event['total_budget'])
        if event.get('budget') is not None:
            event['budget'] = float(event['budget'])
        if event.get('spent') is not None:
            event['spent'] = float(event['spent'])
        if event.get('prediction_confidence') is not None:
            event['prediction_confidence'] = float(event['prediction_confidence'])
        
        # Get related data
        event['equipment'] = get_event_equipment(db, event_id)
        event['activities'] = get_event_activities(db, event_id)
        event['budget_breakdown'] = get_budget_breakdown(db, event_id)
        
        # Check for conflicts
        if event.get('venue') and event.get('start_datetime') and event.get('end_datetime'):
             conflicts = get_venue_conflicts(
                 db, 
                 event['venue'], 
                 event['start_datetime'], 
                 event['end_datetime'], 
                 exclude_event_id=event_id
             )
             
             # Format conflict dates to ISO strings to prevent timezone shifting in frontend
             for conflict in conflicts:
                 if conflict.get('start_datetime'):
                     conflict['start_datetime'] = conflict['start_datetime'].isoformat()
                 if conflict.get('end_datetime'):
                     conflict['end_datetime'] = conflict['end_datetime'].isoformat()
                     
             event['conflicts'] = conflicts
             event['has_conflicts'] = len(conflicts) > 0
        else:
             event['conflicts'] = []
             event['has_conflicts'] = False
        
        return jsonify({'success': True, 'event': event}), 200
        
    except Exception as e:
        logger.error(f"Get event error: {e}")
        return jsonify({'error': 'Failed to fetch event'}), 500


@events_bp.route('', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Requestor'])
def create_event():
    """
    Create new event
    POST /api/events
    Body: {
        "name": "Science Fair 2025",
        "event_type": "Academic",
        "description": "...",
        "start_datetime": "2025-12-20 09:00:00",
        "end_datetime": "2025-12-20 17:00:00",
        "venue": "Auditorium",
        "organizer": "Dr. Smith",
        "expected_attendees": 200,
        "budget": 50000,
        "equipment": ["Projector", "Sound System"]
    }
    """
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['name', 'event_type', 'start_datetime', 'end_datetime']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Validate dates
        start_dt = datetime.strptime(data['start_datetime'], '%Y-%m-%d %H:%M:%S')
        end_dt = datetime.strptime(data['end_datetime'], '%Y-%m-%d %H:%M:%S')
        
        if end_dt <= start_dt:
            return jsonify({'error': 'End time must be after start time'}), 400
        
        if start_dt < datetime.now():
            return jsonify({'error': 'Event cannot be in the past'}), 400
        
        # Insert event
        db = get_db()
        query = """
            INSERT INTO events (
                name, event_type, description, start_datetime, end_datetime,
                venue, organizer, expected_attendees, status, requestor_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        event_id = db.execute_insert(query, (
            data['name'],
            data['event_type'],
            data.get('description', ''),
            data['start_datetime'],
            data['end_datetime'],
            data.get('venue', ''),
            data.get('organizer', ''),
            data.get('expected_attendees', 0),
            data.get('status', 'Pending'),
            session['user_id']
        ))
        
        # Insert budget and related data
        if data.get('budget'):
            db.execute_insert(
                "INSERT INTO budgets (event_id, total_budget, is_ai_predicted, prediction_confidence) VALUES (%s, %s, %s, %s)",
                (event_id, data['budget'], data.get('is_ai_predicted', False), data.get('prediction_confidence'))
            )
            save_budget_breakdown(db, event_id, data.get('budget_breakdown', {}))
        
        # Save equipment, activities
        save_event_equipment(db, event_id, data.get('equipment', []))
        save_event_activities(db, event_id, data.get('activities', []))
        
        # Log status history
        history_query = """
            INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
            VALUES (%s, NULL, %s, %s, %s)
        """
        db.execute_insert(history_query, (
            event_id,
            data.get('status', 'Pending'),
            session['user_id'],
            'Event created'
        ))
        
        logger.info(f"Event created: ID={event_id}, Name={data['name']}, User={session['username']}")
        
        return jsonify({
            'success': True,
            'message': 'Event created successfully',
            'event_id': event_id
        }), 201
        
    except Exception as e:
        logger.error(f"Create event error: {e}")
        return jsonify({'error': 'Failed to create event', 'details': str(e)}), 500


@events_bp.route('/<int:event_id>', methods=['PUT'])
@require_role(['Super Admin', 'Admin', 'Requestor'])
def update_event(event_id):
    """
    Update existing event
    PUT /api/events/123
    """
    try:
        data = request.get_json()
        db = get_db()
        
        # Check if event exists
        event = db.execute_one(
            "SELECT * FROM events WHERE id = %s AND deleted_at IS NULL",
            (event_id,)
        )
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        # Permission check: Only requestor or admin can edit
        if session['role_name'] not in ['Super Admin', 'Admin']:
            if event['requestor_id'] != session['user_id']:
                return jsonify({'error': 'You can only edit your own events'}), 403
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        allowed_fields = [
            'name', 'event_type', 'description', 'start_datetime', 'end_datetime',
            'venue', 'organizer', 'expected_attendees', 'status'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        # Add updated_at
        update_fields.append("updated_at = NOW()")
        params.append(event_id)
        
        query = f"UPDATE events SET {', '.join(update_fields)} WHERE id = %s"
        db.execute_update(query, tuple(params))
        
        # Update budget if provided
        if 'budget' in data:
            budget_exists = db.execute_one(
                "SELECT id FROM budgets WHERE event_id = %s",
                (event_id,)
            )
            
            if budget_exists:
                db.execute_update(
                    "UPDATE budgets SET total_budget = %s, updated_at = NOW() WHERE event_id = %s",
                    (data['budget'], event_id)
                )
            else:
                db.execute_insert(
                    "INSERT INTO budgets (event_id, total_budget) VALUES (%s, %s)",
                    (event_id, data['budget'])
                )

        # Update activities timeline if provided
        if 'activities' in data:
            save_event_activities(db, event_id, data.get('activities') or [])
        
        # Log status change if status updated
        if 'status' in data and data['status'] != event['status']:
            db.execute_insert(
                """INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
                   VALUES (%s, %s, %s, %s, %s)""",
                (event_id, event['status'], data['status'], session['user_id'], data.get('reason', 'Status updated'))
            )
        
        logger.info(f"Event updated: ID={event_id}, User={session['username']}")
        
        return jsonify({
            'success': True,
            'message': 'Event updated successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Update event error: {e}")
        return jsonify({'error': 'Failed to update event', 'details': str(e)}), 500


@events_bp.route('/<int:event_id>', methods=['DELETE'])
@require_role(['Super Admin', 'Admin', 'Requestor'])
def delete_event(event_id):
    """
    Soft delete event
    DELETE /api/events/123
    """
    try:
        db = get_db()
        
        # Check if event exists
        event = db.execute_one(
            "SELECT * FROM events WHERE id = %s AND deleted_at IS NULL",
            (event_id,)
        )
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        # Permission check
        if session['role_name'] not in ['Super Admin', 'Admin']:
            if event['requestor_id'] != session['user_id']:
                return jsonify({'error': 'You can only delete your own events'}), 403
        
        # Soft delete
        db.execute_update(
            "UPDATE events SET deleted_at = NOW() WHERE id = %s",
            (event_id,)
        )
        
        logger.info(f"Event deleted: ID={event_id}, User={session['username']}")
        
        return jsonify({
            'success': True,
            'message': 'Event deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Delete event error: {e}")
        return jsonify({'error': 'Failed to delete event'}), 500


# ============================================================================
# EVENT STATUS HISTORY
# ============================================================================

@events_bp.route('/<int:event_id>/history', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor'])
def get_event_history(event_id):
    """Get status change history for an event"""
    try:
        db = get_db()
        query = """
            SELECT h.*, CONCAT(u.first_name, ' ', u.last_name) as changed_by_name
            FROM event_status_history h
            JOIN users u ON h.changed_by = u.id
            WHERE h.event_id = %s
            ORDER BY h.changed_at DESC
        """
        history = db.execute_query(query, (event_id,))
        
        return jsonify({
            'success': True,
            'history': history
        }), 200
        
    except Exception as e:
        logger.error(f"Get event history error: {e}")
        return jsonify({'error': 'Failed to fetch history'}), 500


# ============================================================================
# APPROVAL WORKFLOW ENDPOINTS (Using reusable _change_event_status)
# ============================================================================

@events_bp.route('/<int:event_id>/submit', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Requestor'])
def submit_event(event_id):
    """Submit draft event for approval: Draft → Pending"""
    try:
        success, message, code = _change_event_status(event_id, 'submit')
        return jsonify({'success': success, 'message': message}), code
    except Exception as e:
        logger.error(f"Submit event error: {e}")
        return jsonify({'error': str(e)}), 500


@events_bp.route('/<int:event_id>/review', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def review_event(event_id):
    """Staff reviews event: Pending → Under Review"""
    try:
        data = request.get_json() or {}
        success, message, code = _change_event_status(event_id, 'review', data.get('reason'))
        return jsonify({'success': success, 'message': message}), code
    except Exception as e:
        logger.error(f"Review event error: {e}")
        return jsonify({'error': str(e)}), 500


@events_bp.route('/<int:event_id>/approve', methods=['POST'])
@require_role(['Super Admin', 'Admin'])
def approve_event(event_id):
    """Admin final approval: Under Review → Approved"""
    try:
        data = request.get_json() or {}
        success, message, code = _change_event_status(
            event_id, 
            'approve', 
            data.get('reason'),
            action_on_conflict=data.get('action_on_conflict')
        )
        return jsonify({'success': success, 'message': message}), code
    except Exception as e:
        logger.error(f"Approve event error: {e}")
        return jsonify({'error': str(e)}), 500


@events_bp.route('/<int:event_id>/superadmin-approve', methods=['POST'])
@require_role(['Super Admin'])
def superadmin_approve_event(event_id):
    """Super Admin bypass approval: Any → Approved"""
    try:
        data = request.get_json() or {}
        action_on_conflict = data.get('action_on_conflict')
        
        # We bypass the standard state machine for Super Admin power
        db = get_db()
        
        # Get current event
        event = db.execute_one(
            "SELECT id, status FROM events WHERE id = %s AND deleted_at IS NULL",
            (event_id,)
        )
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
            
        current_status = event['status']
        new_status = 'Approved'
        
        if current_status == new_status:
             return jsonify({'success': True, 'message': 'Event is already approved'}), 200

        # Handle conflicts
        if action_on_conflict:
            _handle_conflicts(db, event_id, action_on_conflict)

        # Update status
        db.execute_update(
            "UPDATE events SET status = %s, updated_at = NOW() WHERE id = %s",
            (new_status, event_id)
        )
        
        # Log to history
        db.execute_insert(
            """INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
               VALUES (%s, %s, %s, %s, %s)""",
            (event_id, current_status, new_status, session['user_id'], 'Super Admin Direct Approval')
        )
        
        logger.info(f"Event {event_id} Super Admin Approved: {current_status} → {new_status} by {session['username']}")
        
        return jsonify({'success': True, 'message': 'Event approved successfully'}), 200
        
    except Exception as e:
        logger.error(f"Super Admin Approve event error: {e}")
        return jsonify({'error': str(e)}), 500


@events_bp.route('/<int:event_id>/reject', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def reject_event(event_id):
    """Reject event with reason: Any → Draft"""
    try:
        data = request.get_json() or {}
        success, message, code = _change_event_status(event_id, 'reject', data.get('reason'))
        return jsonify({'success': success, 'message': message}), code
    except Exception as e:
        logger.error(f"Reject event error: {e}")
        return jsonify({'error': str(e)}), 500


@events_bp.route('/<int:event_id>/start', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def start_event(event_id):
    """Start approved event: Approved → Ongoing"""
    try:
        success, message, code = _change_event_status(event_id, 'start')
        return jsonify({'success': success, 'message': message}), code
    except Exception as e:
        logger.error(f"Start event error: {e}")
        return jsonify({'error': str(e)}), 500


@events_bp.route('/<int:event_id>/complete', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def complete_event(event_id):
    """Complete ongoing event: Ongoing → Completed"""
    try:
        success, message, code = _change_event_status(event_id, 'complete')
        return jsonify({'success': success, 'message': message}), code
    except Exception as e:
        logger.error(f"Complete event error: {e}")
        return jsonify({'error': str(e)}), 500


@events_bp.route('/status-config', methods=['GET'])
def get_status_config():
    """Get status workflow configuration for frontend"""
    return jsonify({
        'success': True,
        'transitions': STATUS_TRANSITIONS,
        'statusInfo': STATUS_INFO
    }), 200


@events_bp.route('/approved', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor', 'Participant'])
def get_approved_events():
    """
    Get approved events for calendar display
    GET /api/events/approved?month=2025-12
    """
    try:
        month_param = request.args.get('month')
        if not month_param:
            return jsonify({'error': 'Month parameter required (format: YYYY-MM)'}), 400

        db = get_db()

        # Parse month parameter and get date range
        year, month = map(int, month_param.split('-'))
        start_date = f"{year:04d}-{month:02d}-01"
        if month == 12:
            end_date = f"{year+1:04d}-01-01"
        else:
            end_date = f"{year:04d}-{month+1:02d}-01"

        query = """
            SELECT e.id, e.name, e.event_type, e.description,
                   e.start_datetime, e.end_datetime,
                   e.venue, e.expected_attendees, e.max_attendees,
                   COALESCE(b.total_budget, 0) as budget,
                   COALESCE(e.organizer, CONCAT(u.first_name, ' ', u.last_name)) as organizer
            FROM events e
            JOIN users u ON e.requestor_id = u.id
            LEFT JOIN budgets b ON e.id = b.event_id
            WHERE e.status = 'Approved'
              AND e.deleted_at IS NULL
              AND e.start_datetime >= %s
              AND e.start_datetime < %s
            ORDER BY e.start_datetime
        """

        events = db.execute_query(query, (start_date, end_date))

        # Convert Decimal types to float for JSON serialization
        for event in events:
            if event.get('budget') is not None:
                event['budget'] = float(event['budget'])

        return jsonify({
            'success': True,
            'events': events
        }), 200

    except Exception as e:
        logger.error(f"Get approved events error: {e}")
        return jsonify({'error': 'Failed to fetch approved events'}), 500
