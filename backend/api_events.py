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
import json

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

def _auto_reject_soft_conflicts(db, approved_event_id):
    """
    Auto-reject pending events that conflict with the approved event.
    Creates in-app notifications for affected students.
    """
    from backend.event_helpers import suggest_alternative_times
    from datetime import datetime
    
    # Get approved event details
    event = db.execute_one(
        "SELECT name, venue, start_datetime, end_datetime, requestor_id, event_type FROM events WHERE id = %s",
        (approved_event_id,)
    )
    
    if not event:
        return 0
    
    # Find soft conflicts (pending events at same venue/time)
    start_str = event['start_datetime'].strftime('%Y-%m-%d %H:%M:%S')
    end_str = event['end_datetime'].strftime('%Y-%m-%d %H:%M:%S')
    
    soft_conflicts = db.execute_query("""
        SELECT id, name, requestor_id, start_datetime, end_datetime, status
        FROM events 
        WHERE venue = %s 
        AND status IN ('Pending', 'Under Review')
        AND id != %s
        AND (
            (start_datetime < %s AND end_datetime > %s) OR
            (start_datetime < %s AND end_datetime >= %s) OR
            (start_datetime >= %s AND start_datetime < %s)
        )
        AND deleted_at IS NULL
    """, (event['venue'], approved_event_id, end_str, start_str, end_str, end_str, start_str, end_str))
    
    for conflict in soft_conflicts:
        # Get current status for history logging
        current_status = conflict.get('status', 'Under Review')
        
        # Update to Conflict_Rejected status AND set venue/equipment approvals to Rejected
        db.execute_update("""
            UPDATE events 
            SET status = 'Conflict_Rejected',
                venue_approval_status = 'Rejected',
                equipment_approval_status = 'Rejected',
                conflict_resolution_note = %s,
                conflicted_with_event_id = %s,
                updated_at = NOW()
            WHERE id = %s
        """, (
            f"Another event was approved for {event['venue']} at this time slot.",
            approved_event_id,
            conflict['id']
        ))
        
        
        # Create notification for affected student
        # Note: Suggested dates removed from notification for simplicity
        # Users will see comprehensive AI suggestions on the reschedule page
        db.execute_insert("""
            INSERT INTO notifications (user_id, type, title, message, event_id, is_read, created_at)
            VALUES (%s, %s, %s, %s, %s, FALSE, NOW())
        """, (
            conflict['requestor_id'],
            'conflict_rejection',
            f'⚠️ Action Required: "{conflict["name"]}" Needs Rescheduling',
            f'Your event could not be approved due to a scheduling conflict.\n\n'
            f'Another event ("{event["name"]}") was approved for:\n'
            f'• Venue: {event["venue"]}\n'
            f'• Time: {event["start_datetime"]}\n\n'
            f'Please click "Reschedule" to choose a new date.',
            conflict['id']
        ))
        
        # Log history (use safe session access)
        db.execute_insert("""
            INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
            VALUES (%s, %s, 'Conflict_Rejected', %s, %s)
        """, (
            conflict['id'],
            current_status,
            session.get('user_id') if session else None,  # Safe session access
            f'Auto-rejected: conflicted with approved event #{approved_event_id}'
        ))
        
        logger.info(f"Event {conflict['id']} auto-rejected due to conflict with {approved_event_id}")
    
    return len(soft_conflicts)


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

    # Update status (auto-rejection now happens at Staff approval stage, not here)
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
    
    logger.info(f"Event {event_id} status: {current_status} -> {new_status} by {session['username']}")
    
    # ------------------------------------------------------------------
    # NOTIFICATION LOGIC (Added for Student Org Officer & Requestors)
    # ------------------------------------------------------------------
    try:
        if new_status in ['Approved', 'Rejected', 'Under Review']:
            notif_title = ""
            notif_message = ""
            notif_type = ""
            
            if new_status == 'Approved':
                notif_type = 'status_update'
                notif_title = f"Event Approved: {event['name']}"
                notif_message = f"Good news! Your event '{event['name']}' has been officially APPROVED. You can now proceed with your preparations."
            
            elif new_status == 'Rejected':
                notif_type = 'status_update'
                notif_title = f"Event Rejected: {event['name']}"
                notif_message = f"Your event '{event['name']}' was rejected.\n\nReason: {reason or 'No reason provided.'}"
            
            elif new_status == 'Under Review':
                notif_type = 'status_update'
                notif_title = f"Proposal Accepted: {event['name']}"
                notif_message = f"Your event proposal '{event['name']}' has been accepted by the Department Head and is now Under Review for resource approval."
            
            # Insert Notification
            if notif_type:
                db.execute_insert(
                    """INSERT INTO notifications (user_id, event_id, type, title, message, is_read, created_at)
                       VALUES (%s, %s, %s, %s, %s, FALSE, NOW())""",
                    (event['requestor_id'], event_id, notif_type, notif_title, notif_message)
                )
                logger.info(f"Notification sent to user {event['requestor_id']} for event {new_status}")

    except Exception as notif_err:
        logger.error(f"Failed to send notification: {notif_err}")
    
    return True, f'Event {action}ed successfully', 200


# ============================================================================
# REAL-TIME AVAILABILITY CHECK (Protected Hours + FCFS)
# ============================================================================

@events_bp.route('/check-availability', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor'])
def check_availability():
    """
    Real-time venue availability check (hard and soft conflicts).
    
    GET /api/events/check-availability?venue=Auditorium&start=2026-02-15T08:00&end=2026-02-15T17:00
    
    Returns: {can_submit, conflict_type, conflicts, message, alternatives}
    """
    from backend.event_helpers import validate_event_booking
    from datetime import datetime
    
    try:
        venue = request.args.get('venue')
        start_str = request.args.get('start')
        end_str = request.args.get('end')
        exclude_event_id = request.args.get('exclude_event_id', type=int)
        
        if not all([venue, start_str, end_str]):
            return jsonify({
                'can_submit': False,
                'message': 'Missing required parameters: venue, start, end',
                'conflicts': [],
                'alternatives': []
            }), 400
        
        # Parse datetime (support ISO and datetime-local formats)
        try:
            start_datetime = datetime.fromisoformat(start_str.replace('Z', '+00:00').replace('T', ' '))
        except:
            try:
                start_datetime = datetime.strptime(start_str, '%Y-%m-%dT%H:%M')
            except:
                start_datetime = datetime.strptime(start_str, '%Y-%m-%d %H:%M')
        
        try:
            end_datetime = datetime.fromisoformat(end_str.replace('Z', '+00:00').replace('T', ' '))
        except:
            try:
                end_datetime = datetime.strptime(end_str, '%Y-%m-%dT%H:%M')
            except:
                end_datetime = datetime.strptime(end_str, '%Y-%m-%d %H:%M')
        
        db = get_db()
        result = validate_event_booking(db, venue, start_datetime, end_datetime, exclude_event_id)
        
        logger.info(f"Availability check: {venue} {start_str}-{end_str} → {result['conflict_type'] or 'available'}")
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error checking availability: {e}")
        traceback.print_exc()
        return jsonify({
            'can_submit': False,
            'message': f'Error: {str(e)}',
            'conflicts': [],
            'alternatives': []
        }), 500


# ============================================================================
# EVENT CRUD OPERATIONS
# ============================================================================

@events_bp.route('', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor', 'Participant', 'Student Organization Officer'])
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
                   TO_CHAR(e.start_datetime, 'YYYY-MM-DD') as date,
                   TO_CHAR(e.end_datetime, 'YYYY-MM-DD') as endDate,
                   TO_CHAR(e.start_datetime, 'HH24:MI') as startTime,
                   TO_CHAR(e.end_datetime, 'HH24:MI') as endTime,
                   e.expected_attendees as attendees,
                   e.status,
                   e.description,
                   e.venue,
                   e.budget,
                   e.equipment,
                   e.timeline,
                   e.budget_breakdown,
                   e.additional_resources,
                   e.organizing_department,
                   COALESCE(e.organizer, u.first_name || ' ' || u.last_name) as organizer,
                   u.username as requestor_username,
                   e.requestor_id
            FROM events e
            JOIN users u ON e.requestor_id = u.id
            WHERE e.deleted_at IS NULL
        """
        params = []
        
        # Department-based filtering:
        # - Admin: See only their department's events (department-specific)
        # - Staff: See ALL events (they manage equipment/venues for everyone)
        # - Super Admin: See ALL events (unrestricted access)
        # - Requestor: See only their own events
        # - Participant: See only their department's events (based on student course)
        user_department = session.get('department')
        user_role = session.get('role_name')
        user_id = session.get('user_id')
        
        if user_role == 'Admin' and user_department:
            # Admin is department-restricted
            if user_department == 'IT Department':
                 # IT Department sees BSIT, BSCS, BSIS events too
                 query += " AND (e.organizing_department = %s OR e.organizing_department IN ('BSIT', 'BSCS', 'BSIS'))"
                 params.append(user_department)
                 logger.info(f"Filtering events for Admin department: {user_department} (incl. sub-departments)")
            else:
                 query += " AND e.organizing_department = %s"
                 params.append(user_department)
                 logger.info(f"Filtering events for Admin department: {user_department}")
        elif user_role == 'Requestor':
            # Requestors see only their own events
            query += " AND e.requestor_id = %s"
            params.append(user_id)
            logger.info(f"Filtering events for requestor: {user_id}")
        elif user_role == 'Participant':
            # Students/Participants see only their department's events
            # Get student's course from students table
            student = db.execute_one(
                "SELECT course FROM students WHERE user_id = %s",
                (user_id,)
            )
            if student and student.get('course'):
                query += " AND e.organizing_department = %s"
                params.append(student['course'])
                logger.info(f"Filtering events for Participant department: {student['course']}")
            else:
                # If student record not found, show only approved events as fallback
                query += " AND e.status = 'Approved'"
                logger.info(f"Participant has no department, showing only Approved events")
            logger.info(f"Filtering events for requestor: {session['user_id']}")
        # Super Admin and Staff - no filter, see all events
        
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
        
        # Convert Decimal types to float and parse JSON columns
        for e in events:
            try:
                if e.get('budget') is not None:
                    e['budget'] = float(e['budget'])
            except Exception as conversion_err:
                logger.error(f"Error converting budget for event {e.get('id')}: {conversion_err}")
                e['budget'] = 0.0
            
            # Parse JSON columns
            try:
                equipment_val = e.get('equipment')
                if equipment_val is not None and equipment_val != '':
                    try:
                        e['equipment'] = json.loads(equipment_val) if isinstance(equipment_val, str) else equipment_val
                    except (json.JSONDecodeError, TypeError):
                        e['equipment'] = []
                else:
                    e['equipment'] = []
            except Exception as ex:
                logger.error(f"Error parsing equipment for event {e.get('id')}: {ex}")
                e['equipment'] = []
            
            try:
                timeline_val = e.get('timeline')
                if timeline_val is not None and timeline_val != '':
                    try:
                        timeline_data = json.loads(timeline_val) if isinstance(timeline_val, str) else timeline_val
                    except (json.JSONDecodeError, TypeError):
                        timeline_data = []
                    e['activities'] = timeline_data  # Map timeline to activities for frontend
                    if 'timeline' in e:
                        del e['timeline']  # Remove timeline key
                else:
                    e['activities'] = []
            except Exception as ex:
                logger.error(f"Error parsing timeline for event {e.get('id')}: {ex}")
                e['activities'] = []
            
            try:
                breakdown_val = e.get('budget_breakdown')
                if breakdown_val is not None and breakdown_val != '':
                    try:
                        e['budget_breakdown'] = json.loads(breakdown_val) if isinstance(breakdown_val, str) else breakdown_val
                    except (json.JSONDecodeError, TypeError):
                        e['budget_breakdown'] = []
                else:
                    e['budget_breakdown'] = {}
            except Exception as ex:
                logger.error(f"Error parsing budget_breakdown for event {e.get('id')}: {ex}")
                e['budget_breakdown'] = {}
            
            try:
                resources_val = e.get('additional_resources')
                if resources_val is not None and resources_val != '':
                    try:
                        e['additional_resources'] = json.loads(resources_val) if isinstance(resources_val, str) else resources_val
                    except (json.JSONDecodeError, TypeError):
                        e['additional_resources'] = []
                else:
                    e['additional_resources'] = []
            except Exception as ex:
                logger.error(f"Error parsing additional_resources for event {e.get('id')}: {ex}")
                e['additional_resources'] = []
        
        # DEBUG: Log what we're returning for event 12
        for e in events:
            if e.get('id') == 12:
                logger.info(f"DEBUG Event 12 data being returned:")
                logger.info(f"  equipment: {e.get('equipment')}")
                logger.info(f"  activities: {e.get('activities')}")
                logger.info(f"  budget_breakdown: {e.get('budget_breakdown')}")
        
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
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor', 'Participant', 'Student Organization Officer'])
def get_event(event_id):
    """Get single event by ID with all details"""
    try:
        db = get_db()
        # All data is in events table as JSON - no need for joins to old tables
        query = """
            SELECT e.*, u.username as requestor_username,
                   u.first_name || ' ' || u.last_name as requestor_name
            FROM events e
            JOIN users u ON e.requestor_id = u.id
            WHERE e.id = %s AND e.deleted_at IS NULL
        """
        event = db.execute_one(query, (event_id,))
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
            
        # Convert Decimal types
        if event.get('budget') is not None:
            event['budget'] = float(event['budget'])
        if event.get('spent') is not None:
            event['spent'] = float(event['spent'])
        
        # Parse JSON columns from events table
        import json
        if event.get('equipment') and isinstance(event['equipment'], str):
            event['equipment'] = json.loads(event['equipment'])
        if event.get('timeline') and isinstance(event['timeline'], str):
            event['timeline'] = json.loads(event['timeline'])
            event['activities'] = event['timeline']  # Map timeline to activities for frontend compatibility
        if event.get('budget_breakdown') and isinstance(event['budget_breakdown'], str):
            event['budget_breakdown'] = json.loads(event['budget_breakdown'])
        if event.get('additional_resources') and isinstance(event['additional_resources'], str):
            event['additional_resources'] = json.loads(event['additional_resources'])
        
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
@require_role(['Super Admin', 'Admin', 'Requestor', 'Student Organization Officer'])
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
        required_fields = ['name', 'event_type', 'start_datetime', 'end_datetime', 'venue']
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
        
        # Convert equipment and timeline to JSON
        import json
        equipment_json = json.dumps(data.get('equipment', [])) if data.get('equipment') else None
        timeline_json = json.dumps(data.get('activities', [])) if data.get('activities') else None
        budget_breakdown_json = json.dumps(data.get('budget_breakdown', {})) if data.get('budget_breakdown') else None
        additional_resources_json = json.dumps(data.get('additional_resources', [])) if data.get('additional_resources') else None
        
        # Determine organizing department and status based on role
        user_role = session.get('role_name')
        user_department = session.get('department')
        user_id = session.get('user_id')
        
        # Get organizing_department from request or default to user's department
        organizing_dept = data.get('organizing_department') or user_department
        
        # Fallback: If no department found and user is a student/officer, check students table
        if not organizing_dept and user_role in ['Student Organization Officer', 'Student', 'Requestor']:
            student_record = db.execute_one("SELECT course FROM students WHERE user_id = %s", (user_id,))
            if student_record and student_record.get('course'):
                mapped_dept = student_record['course']
                # Map course codes to Departments if needed
                course_map = {
                    'BSIT': 'IT Department',
                    'BSCS': 'IT Department', 
                    'BSIS': 'IT Department',
                    # Add others as needed
                }
                organizing_dept = course_map.get(mapped_dept, mapped_dept)
                logger.info(f"Resolved organizing_department from student course: {mapped_dept} -> {organizing_dept}")
        
        # Role-based initial status:
        # - Admin/Super Admin: Auto-approve (status='Approved')
        # - Requestor: Needs approval (status='Pending')
        if user_role in ['Super Admin', 'Admin']:
            initial_status = 'Approved'
        else:
            initial_status = 'Pending'
        
        logger.info(f"Creating event with JSON data:")
        logger.info(f"  Equipment: {equipment_json}")
        logger.info(f"  Activities/Timeline: {timeline_json}")
        logger.info(f"  Budget Breakdown: {budget_breakdown_json}")
        logger.info(f"  Organizing Department: {organizing_dept}")
        logger.info(f"  Initial Status: {initial_status} (Role: {user_role})")
        
        query = """
            INSERT INTO events (
                name, event_type, description, start_datetime, end_datetime,
                venue, organizer, expected_attendees, budget, equipment, timeline, budget_breakdown, additional_resources,
                organizing_department, status, requestor_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            data.get('budget', 0),
            equipment_json,
            timeline_json,
            budget_breakdown_json,
            additional_resources_json,
            organizing_dept,
            initial_status,
            session['user_id']
        ))
        
        # Note: No need to call save_budget_breakdown, save_event_equipment, save_event_activities
        # Everything is stored as JSON in the events table
        
        # Log status history
        history_query = """
            INSERT INTO event_status_history (event_id, old_status, new_status, changed_by, reason)
            VALUES (%s, NULL, %s, %s, %s)
        """
        db.execute_insert(history_query, (
            event_id,
            initial_status,
            session['user_id'],
            f'Event created by {user_role}'
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
@require_role(['Super Admin', 'Admin', 'Requestor', 'Student Organization Officer'])
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
        
        import json
        
        allowed_fields = [
            'name', 'event_type', 'description', 'start_datetime', 'end_datetime',
            'venue', 'organizer', 'expected_attendees', 'budget', 'status', 'organizing_department',
            'venue_approval_status', 'equipment_approval_status'
        ]
        
        for field in allowed_fields:
            if field in data:
                update_fields.append(f"{field} = %s")
                params.append(data[field])
        
        # Handle JSON fields
        if 'equipment' in data:
            update_fields.append("equipment = %s")
            equipment_json = json.dumps(data['equipment']) if data['equipment'] else None
            params.append(equipment_json)
            logger.info(f"Saving equipment: {equipment_json}")
        
        if 'activities' in data:
            update_fields.append("timeline = %s")
            activities_json = json.dumps(data['activities']) if data['activities'] else None
            params.append(activities_json)
            logger.info(f"Saving activities to timeline: {activities_json}")
            
        if 'budget_breakdown' in data:
            update_fields.append("budget_breakdown = %s")
            breakdown_json = json.dumps(data['budget_breakdown']) if data['budget_breakdown'] else None
            params.append(breakdown_json)
            logger.info(f"Saving budget_breakdown: {breakdown_json}")
        
        if 'additional_resources' in data:
            update_fields.append("additional_resources = %s")
            resources_json = json.dumps(data['additional_resources']) if data['additional_resources'] else None
            params.append(resources_json)
            logger.info(f"Saving additional_resources: {resources_json}")
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        # Add updated_at
        update_fields.append("updated_at = NOW()")
        params.append(event_id)
        
        query = f"UPDATE events SET {', '.join(update_fields)} WHERE id = %s"
        db.execute_update(query, tuple(params))
        
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
@require_role(['Super Admin', 'Admin', 'Requestor', 'Student Organization Officer'])
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
            SELECT h.*, u.first_name || ' ' || u.last_name as changed_by_name
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
@require_role(['Super Admin', 'Admin', 'Requestor', 'Student Organization Officer'])
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

        # Auto-reject soft conflicts when approving
        _auto_reject_soft_conflicts(db, event_id)

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

        # Send Notification (Super Admin Bypass)
        try:
            # Get requestor_id
            evt_details = db.execute_one("SELECT requestor_id, name FROM events WHERE id=%s", (event_id,))
            if evt_details:
                db.execute_insert(
                    """INSERT INTO notifications (user_id, event_id, type, title, message, is_read, created_at)
                       VALUES (%s, %s, %s, %s, %s, FALSE, NOW())""",
                    (
                        evt_details['requestor_id'], 
                        event_id, 
                        'status_update', 
                        f"Event Approved: {evt_details['name']}", 
                        f"Good news! Your event '{evt_details['name']}' has been officially APPROVED by Super Admin."
                    )
                )
        except Exception as e:
            logger.error(f"Failed to send superadmin notification: {e}")
        
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
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor', 'Participant', 'Student', 'Student Organization Officer'])
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
            SELECT e.id, e.name, e.event_type, e.description, e.status,
                   e.start_datetime, e.end_datetime,
                   e.venue, e.expected_attendees, e.max_attendees,
                   COALESCE(b.total_budget, 0) as budget,
                   COALESCE(e.organizer, u.first_name || ' ' || u.last_name) as organizer
            FROM events e
            JOIN users u ON e.requestor_id = u.id
            LEFT JOIN budgets b ON e.id = b.event_id
            WHERE e.status IN ('Approved', 'Completed', 'Ongoing')
              AND e.deleted_at IS NULL
              AND e.start_datetime >= %s
              AND e.start_datetime < %s
            ORDER BY e.start_datetime
        """

        events = db.execute_query(query, (start_date, end_date))

        # Convert Decimal types to float for JSON serialization
        for event in events:
            # Format dates to ISO strings (without timezone) to ensure frontend treats as local time
            if event.get('start_datetime'):
                event['start_datetime'] = event['start_datetime'].isoformat()
            if event.get('end_datetime'):
                event['end_datetime'] = event['end_datetime'].isoformat()

            if event.get('budget') is not None:
                event['budget'] = float(event['budget'])

        return jsonify({
            'success': True,
            'events': events
        }), 200

    except Exception as e:
        logger.error(f"Get approved events error: {e}")
        return jsonify({'error': 'Failed to fetch approved events'}), 500


@events_bp.route('/<int:event_id>/acknowledge-equipment', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Student'])
def acknowledge_equipment(event_id):
    """
    Acknowledge equipment approval adjustments
    POST /api/events/<event_id>/acknowledge-equipment
    Body: { "action": "accept", "message": "..." }
    """
    try:
        data = request.get_json()
        action = data.get('action', 'accept')
        message = data.get('message', '')
        user_id = session.get('user_id')

        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        db = get_db()

        # Verify the event exists and user is the requestor
        event = db.execute_query(
            "SELECT e.*, u.username, u.first_name, u.last_name FROM events e JOIN users u ON e.requestor_id = u.id WHERE e.id = %s AND e.deleted_at IS NULL",
            (event_id,)
        )
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        event = event[0]

        # Mark all equipment_adjusted notifications for this event as read
        db.execute_update(
            """UPDATE notifications 
               SET is_read = 1 
               WHERE event_id = %s 
               AND user_id = %s 
               AND type = 'equipment_adjusted'""",
            (event_id, user_id)
        )

        # Update event to add a note about acknowledgment
        current_description = event.get('description') or ''
        acknowledgment_note = f"\n\n--- Equipment Acknowledgment ---\nOrganizer has accepted the adjusted equipment quantities on {datetime.now().strftime('%Y-%m-%d %H:%M')}."
        
        db.execute_update(
            "UPDATE events SET description = %s WHERE id = %s",
            ((current_description + acknowledgment_note), event_id)
        )

        # Notify admins that organizer has accepted the equipment adjustments
        admin_users = db.execute_query(
            """SELECT u.id FROM users u
               JOIN roles r ON u.role_id = r.id
               WHERE r.name IN ('Super Admin', 'Admin', 'Staff') 
               AND u.is_active = 1"""
        )

        organizer_name = f"{event.get('first_name', '')} {event.get('last_name', '')}".strip() or event.get('username', 'Organizer')
        admin_notification_title = f"Equipment Acknowledged - {event['name']}"
        admin_notification_msg = f"{organizer_name} has accepted the adjusted equipment for '{event['name']}'. The event will proceed with the approved equipment."

        for admin in admin_users:
            db.execute_insert(
                """INSERT INTO notifications (user_id, event_id, type, title, message, created_at)
                   VALUES (%s, %s, %s, %s, %s, NOW())""",
                (admin['id'], event_id, 'status_update', admin_notification_title, admin_notification_msg)
            )

        logger.info(f"User {user_id} acknowledged equipment for event {event_id}: {action}")

        return jsonify({
            'success': True,
            'message': 'Equipment adjustments acknowledged'
        }), 200

    except Exception as e:
        logger.error(f"Acknowledge equipment error: {e}")
        logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500
        return jsonify({'error': 'Failed to acknowledge equipment adjustments'}), 500


@events_bp.route('/<int:event_id>/equipment-inquiry', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Student'])
def equipment_inquiry(event_id):
    """
    Send inquiry/request about equipment to administrators
    POST /api/events/<event_id>/equipment-inquiry
    Body: { "action": "request_alternatives", "message": "..." }
    """
    try:
        data = request.get_json()
        action = data.get('action', 'inquiry')
        message = data.get('message', '')
        user_id = session.get('user_id')

        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        if not message.strip():
            return jsonify({'error': 'Message is required'}), 400

        db = get_db()

        # Verify the event exists
        event = db.execute_query(
            "SELECT name, requestor_id FROM events WHERE id = %s AND deleted_at IS NULL",
            (event_id,)
        )
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        event = event[0]

        # Get admin users to send notification to
        admins = db.execute_query(
            """SELECT u.id FROM users u
               JOIN roles r ON u.role_id = r.id
               WHERE r.name IN ('Super Admin', 'Admin', 'Staff') 
               AND u.is_active = 1"""
        )

        # Create notifications for all admins
        notification_title = "Equipment Inquiry - " + event['name']
        for admin in admins:
            db.execute_insert(
                """INSERT INTO notifications (user_id, event_id, type, title, message, created_at)
                   VALUES (%s, %s, %s, %s, %s, NOW())""",
                (admin['id'], event_id, 'general', notification_title, message)
            )

        logger.info(f"User {user_id} sent equipment inquiry for event {event_id}")

        return jsonify({
            'success': True,
            'message': 'Your inquiry has been sent to administrators'
        }), 200

    except Exception as e:
        logger.error(f"Equipment inquiry error: {e}")
        return jsonify({'error': 'Failed to send inquiry'}), 500

# ============================================================================
# EVENT PDF EXPORT
# ============================================================================

@events_bp.route('/<int:event_id>/export-pdf', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor'])
def export_event_pdf(event_id):
    """
    Export event as PDF guideline and checklist
    GET /api/events/<id>/export-pdf
    """
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Image
        from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
        from reportlab.graphics.shapes import Drawing, Rect
        from reportlab.graphics import renderPDF
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from io import BytesIO
        from flask import send_file
        
        # Register font that supports Philippine Peso symbol (₱)
        try:
            pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
            peso_font = 'DejaVuSans'
        except:
            peso_font = 'Helvetica'  # Fallback if font not found
        
        # Create a custom checkbox drawing
        def create_checkbox():
            """Create a white-filled checkbox with black border"""
            d = Drawing(10, 10)
            # White filled rectangle with black border
            checkbox = Rect(1, 1, 8, 8, fillColor=colors.white, strokeColor=colors.black, strokeWidth=1)
            d.add(checkbox)
            return d
        
        db = get_db()
        
        # Get event details with all related data
        event = db.execute_one("""
            SELECT e.*, 
                   u.first_name || ' ' || u.last_name as requestor_name,
                   u.email as requestor_email
            FROM events e
            LEFT JOIN users u ON e.requestor_id = u.id
            WHERE e.id = %s AND e.deleted_at IS NULL
        """, (event_id,))
        
        if not event:
            return jsonify({'error': 'Event not found'}), 404
        
        # Parse JSON fields
        import json
        equipment = json.loads(event['equipment']) if event.get('equipment') else []
        timeline = json.loads(event['timeline']) if event.get('timeline') else []
        budget_breakdown_data = json.loads(event['budget_breakdown']) if event.get('budget_breakdown') else []
        
        # Convert budget_breakdown to list format for PDF
        budget_breakdown = []
        if isinstance(budget_breakdown_data, dict):
            for category, details in budget_breakdown_data.items():
                if isinstance(details, dict):
                    budget_breakdown.append({
                        'category': category,
                        'amount': details.get('amount', 0)
                    })
        elif isinstance(budget_breakdown_data, list):
            budget_breakdown = budget_breakdown_data
        
        # Use timeline as activities
        activities = timeline
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter,
                               rightMargin=0.75*inch, leftMargin=0.75*inch,
                               topMargin=0.75*inch, bottomMargin=0.75*inch)
        
        # Container for PDF elements
        story = []
        
        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        )
        
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#64748b'),
            spaceAfter=20,
            alignment=TA_CENTER
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#1e40af'),
            spaceAfter=8,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        )
        
        # Header
        story.append(Paragraph("EVENT PLANNING GUIDELINE", title_style))
        story.append(Paragraph("Comprehensive Checklist & Resource Guide", subtitle_style))
        story.append(Spacer(1, 0.2*inch))
        
        # Event Information Section
        story.append(Paragraph("📋 EVENT INFORMATION", heading_style))
        
        event_info = [
            ['Event Name:', event['name']],
            ['Event Type:', event['event_type']],
            ['Date:', f"{event['start_datetime'].strftime('%B %d, %Y')}"],
            ['Time:', f"{event['start_datetime'].strftime('%I:%M %p')} - {event['end_datetime'].strftime('%I:%M %p')}"],
            ['Venue:', event['venue']],
            ['Expected Attendees:', f"{event['expected_attendees']:,}"],
            ['Status:', event['status']],
            ['Organizer:', event['organizer'] or event['requestor_name']],
            ['Contact:', event['requestor_email']],
            ['Total Budget:', f"₱{event['budget']:,.2f}"]
        ]
        
        t = Table(event_info, colWidths=[2*inch, 4.5*inch])
        t.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), peso_font),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#475569')),
            ('TEXTCOLOR', (1, 0), (1, -1), colors.HexColor('#1e293b')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 0.15*inch))
        
        # Description
        if event.get('description'):
            story.append(Paragraph("📝 EVENT DESCRIPTION", heading_style))
            story.append(Paragraph(event['description'], styles['Normal']))
            story.append(Spacer(1, 0.15*inch))
        
        # Budget Breakdown Checklist
        if budget_breakdown:
            story.append(Paragraph("💰 BUDGET BREAKDOWN CHECKLIST", heading_style))
            budget_data = [[create_checkbox(), 'Category', 'Amount', 'Status']]
            for item in budget_breakdown:
                budget_data.append([
                    create_checkbox(),
                    item['category'],
                    f"₱{item['amount']:,.2f}",
                    ''
                ])
            budget_data.append([
                '',
                'TOTAL',
                f"₱{event['budget']:,.2f}",
                ''
            ])
            
            t = Table(budget_data, colWidths=[0.4*inch, 2.5*inch, 1.5*inch, 2.1*inch])
            t.setStyle(TableStyle([
                ('FONTNAME', (1, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTNAME', (2, 1), (2, -1), peso_font),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e0e7ff')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('VALIGN', (0, 0), (0, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f1f5f9')),
            ]))
            story.append(t)
            story.append(Spacer(1, 0.15*inch))
        
        # Equipment Checklist
        if equipment:
            story.append(Paragraph("📦 EQUIPMENT & RESOURCES CHECKLIST", heading_style))
            equip_data = [[create_checkbox(), 'Item', 'Quantity', 'Status', 'Notes']]
            for item in equipment:
                equip_data.append([
                    create_checkbox(),
                    item['name'],
                    str(item['quantity']),
                    '',
                    ''
                ])
            
            t = Table(equip_data, colWidths=[0.4*inch, 2.2*inch, 0.8*inch, 1.1*inch, 1.9*inch])
            t.setStyle(TableStyle([
                ('FONTNAME', (1, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dbeafe')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('VALIGN', (0, 0), (0, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(t)
            story.append(Spacer(1, 0.15*inch))
        
        # Timeline/Schedule Checklist
        if activities:
            story.append(PageBreak())
            story.append(Paragraph("📅 EVENT TIMELINE & ACTIVITY CHECKLIST", heading_style))
            timeline_data = [[create_checkbox(), 'Time', 'Activity/Phase', 'Status']]
            for activity in activities:
                # Handle both timeline format (startTime, endTime, phase) and activity format
                if isinstance(activity, dict):
                    time_str = activity.get('startTime', '')
                    if activity.get('endTime'):
                        time_str += f" - {activity.get('endTime')}"
                    phase = activity.get('phase', activity.get('activity_name', str(activity)))
                else:
                    time_str = ''
                    phase = str(activity)
                
                timeline_data.append([
                    create_checkbox(),
                    time_str,
                    phase,
                    ''
                ])
            
            t = Table(timeline_data, colWidths=[0.4*inch, 1.2*inch, 3.8*inch, 1.1*inch])
            t.setStyle(TableStyle([
                ('FONTNAME', (1, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fef3c7')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#92400e')),
                ('ALIGN', (0, 0), (0, -1), 'CENTER'),
                ('VALIGN', (0, 0), (0, -1), 'MIDDLE'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(t)
            story.append(Spacer(1, 0.15*inch))
        
        # Pre-Event Checklist
        story.append(Paragraph("✅ PRE-EVENT PREPARATION CHECKLIST", heading_style))
        prep_items = [
            'Venue booking confirmed',
            'All equipment reserved and available',
            'Budget approved and allocated',
            'Participants/attendees notified',
            'Marketing materials prepared',
            'Staff/volunteers briefed',
            'Emergency contact list prepared',
            'Backup plans documented',
            'Technical rehearsal completed',
            'Final walkthrough done'
        ]
        
        # Create table for pre-event checklist with drawn checkboxes
        prep_data = [[create_checkbox(), item] for item in prep_items]
        prep_table = Table(prep_data, colWidths=[0.3*inch, 6.2*inch])
        prep_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (1, 0), (1, -1), 10),
            ('RIGHTPADDING', (1, 0), (1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(prep_table)
        
        story.append(Spacer(1, 0.2*inch))
        
        # Post-Event Checklist
        story.append(Paragraph("📋 POST-EVENT CHECKLIST", heading_style))
        post_items = [
            'All equipment returned and accounted for',
            'Venue cleaned and restored',
            'Final attendance recorded',
            'Feedback forms collected',
            'Photos/documentation archived',
            'Thank you notes sent',
            'Final expense report submitted',
            'Lessons learned documented',
            'Event report completed',
            'Event marked as completed in system'
        ]
        
        # Create table for post-event checklist with drawn checkboxes
        post_data = [[create_checkbox(), item] for item in post_items]
        post_table = Table(post_data, colWidths=[0.3*inch, 6.2*inch])
        post_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (1, 0), (1, -1), 10),
            ('RIGHTPADDING', (1, 0), (1, -1), 0),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(post_table)
        
        # Footer
        story.append(Spacer(1, 0.3*inch))
        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#94a3b8'),
            alignment=TA_CENTER
        )
        story.append(Paragraph(
            f"Generated on {datetime.now().strftime('%B %d, %Y at %I:%M %p')} | School Event Management System",
            footer_style
        ))
        
        # Build PDF
        doc.build(story)
        
        # Prepare file for download
        buffer.seek(0)
        filename = f"Event_Guideline_{event['name'].replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
        
        is_preview = request.args.get('preview') == 'true'
        
        return send_file(
            buffer,
            mimetype='application/pdf',
            as_attachment=not is_preview,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"PDF export error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Event ID: {event_id}")
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate PDF: {str(e)}'}), 500
@events_bp.route('/<int:event_id>/resolve-rejection', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor', 'Student Organization Officer'])
def resolve_rejection(event_id):
    """
    Handle user resolution for rejected equipment items.
    Actions: 'self_provide', 'remove_item', 'cancel_event'
    """
    try:
        data = request.json
        action = data.get('action')
        item_name = data.get('item_name')
        
        db = get_db()
        
        # Get event
        event = db.execute_one("SELECT * FROM events WHERE id = %s", (event_id,))
        if not event:
            return jsonify({'success': False, 'error': 'Event not found'}), 404
            
        # Verify ownership
        if event['requestor_id'] != session['user_id'] and session.get('role') not in ['Super Admin', 'Admin', 'Staff']:
             return jsonify({'success': False, 'error': 'Unauthorized'}), 403

        if action == 'cancel_event':
            # 1. Update event status
            db.execute_update(
                "UPDATE events SET status = 'Cancelled', updated_at = %s WHERE id = %s",
                (datetime.now(), event_id)
            )
            
            # 2. Setup Notification Logic
            try:
                # Get all Admin and Staff IDs
                recipients = db.execute_query("""
                    SELECT u.id FROM users u
                    JOIN roles r ON u.role_id = r.id
                    WHERE r.name IN ('Super Admin', 'Admin', 'Staff')
                """)
                
                if recipients:
                    notif_sql = """
                        INSERT INTO notifications (user_id, title, message, type, event_id, is_read, created_at)
                        VALUES (%s, %s, %s, %s, %s, 0, %s)
                    """
                    
                    event_name = event.get('name', 'Event')
                    requestor_name = f"{session.get('first_name', 'User')} {session.get('last_name', '')}"
                    title = "Event Withdrawn"
                    message = f"{requestor_name} has withdrawn the proposal '{event_name}' due to inability to provide required equipment."
                    
                    for r in recipients:
                        db.execute_update(notif_sql, (
                            r['id'], 
                            title, 
                            message, 
                            'status_update', 
                            event_id, 
                            datetime.now()
                        ))
                    logger.info(f"Notified {len(recipients)} admins/staff about withdrawal of event {event_id}")
            except Exception as notif_err:
                logger.error(f"Failed to send withdrawal notifications: {notif_err}")
                # Don't fail the request if notifications fail
            
            return jsonify({'success': True, 'message': 'Event cancelled'})

        elif action in ['self_provide', 'remove_item']:
            # Load equipment list
            equipment_list = []
            if event.get('equipment') and isinstance(event['equipment'], str):
                equipment_list = json.loads(event['equipment'])
            elif isinstance(event.get('equipment'), list):
                equipment_list = event['equipment']

            updated_list = []
            item_found = False
            
            for item in equipment_list:
                if item.get('name') == item_name:
                    item_found = True
                    if action == 'remove_item':
                        continue # Skip adding it to new list
                    elif action == 'self_provide':
                        item['status'] = 'Self-Provided'
                        item['rejection_reason'] = None # Clear reason
                updated_list.append(item)
            
            if not item_found:
                 return jsonify({'success': False, 'error': 'Item not found'}), 404

            # Update Equipment List
            db.execute_update(
                "UPDATE events SET equipment = %s WHERE id = %s",
                (json.dumps(updated_list), event_id)
            )

            # Re-evaluate overall status (Wait until ALL rejections are resolved before approving)
            # FIX: Use case-insensitive check for 'rejected' status to prevent premature approval
            remaining_rejections = any(
                str(i.get('status')).strip().lower() == 'rejected' 
                for i in updated_list
            )
            
            new_status = event.get('equipment_approval_status', 'Pending') 
            
            if not remaining_rejections:
                 # Only approve if ALL items are resolved (no 'rejected' items left)
                 new_status = 'Approved'
                 db.execute_update(
                    "UPDATE events SET equipment_approval_status = 'Approved', updated_at = NOW() WHERE id = %s",
                    (event_id,)
                 )
            else:
                 # If issues remain, ensure status is NOT Approved (revert to Under Review/Pending if needed)
                 # Ideally keep it as is, or set to 'Under Review' to indicate ongoing resolution
                 if new_status == 'Approved':
                      new_status = 'Under Review'
                      db.execute_update(
                        "UPDATE events SET equipment_approval_status = 'Under Review' WHERE id = %s",
                        (event_id,)
                      )

            return jsonify({'success': True, 'message': 'Resolution applied', 'new_status': new_status})

    except Exception as e:
        logger.error(f"Error resolving rejection: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
