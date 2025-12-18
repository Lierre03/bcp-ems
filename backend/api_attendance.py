# ============================================================================
# ATTENDANCE API MODULE
# QR code scanning, attendance tracking, and check-in management
# ============================================================================

from flask import Blueprint, request, jsonify, session
from backend.auth import require_role
from database.db import get_db
import logging
import qrcode
import io
import base64
from datetime import datetime

logger = logging.getLogger(__name__)

# Create blueprint
attendance_bp = Blueprint('attendance', __name__, url_prefix='/api/attendance')


# ============================================================================
# QR CODE MANAGEMENT
# ============================================================================

@attendance_bp.route('/generate-qr/<int:registration_id>', methods=['GET'])
@require_role(['Participant'])
def generate_qr_code(registration_id):
    """
    Generate QR code for a registration
    GET /api/attendance/generate-qr/123
    """
    try:
        db = get_db()

        # Get registration details
        registration = db.execute_one(
            "SELECT r.id, r.qr_code, r.registration_status, e.name as event_name, e.start_datetime "
            "FROM event_registrations r "
            "JOIN events e ON r.event_id = e.id "
            "WHERE r.id = %s AND r.user_id = %s",
            (registration_id, session['user_id'])
        )

        if not registration:
            return jsonify({'error': 'Registration not found'}), 404

        if registration['registration_status'] != 'Registered':
            return jsonify({'error': 'Only confirmed registrations can generate QR codes'}), 400

        # Generate QR code if not exists
        qr_data = registration['qr_code']
        if not qr_data:
            qr_data = f"REG-{registration['id']}-{session['user_id']}-{int(datetime.now().timestamp())}"
            # Update registration with QR code
            db.execute_update(
                "UPDATE event_registrations SET qr_code = %s WHERE id = %s",
                (qr_data, registration_id)
            )

        # Generate QR code image
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(qr_data)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()

        return jsonify({
            'success': True,
            'qr_code': qr_data,
            'qr_image': f"data:image/png;base64,{img_str}",
            'event_name': registration['event_name'],
            'registration_id': registration['id']
        }), 200

    except Exception as e:
        logger.error(f"Generate QR code error: {e}")
        return jsonify({'error': 'Failed to generate QR code'}), 500


# ============================================================================
# ATTENDANCE CHECK-IN
# ============================================================================

@attendance_bp.route('/check-in/<qr_code>', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def check_in_attendance(qr_code):
    """
    Check in participant using QR code
    POST /api/attendance/check-in/REG-123-456-789
    """
    try:
        db = get_db()

        # Parse QR code format: REG-{registration_id}-{user_id}-{timestamp}
        qr_parts = qr_code.split('-')
        if len(qr_parts) != 4 or qr_parts[0] != 'REG':
            return jsonify({
                'success': False,
                'error': 'Invalid QR code format'
            }), 400

        registration_id = int(qr_parts[1])
        user_id = int(qr_parts[2])

        # Verify registration exists and is valid
        registration = db.execute_one(
            "SELECT r.id, r.event_id, r.registration_status, r.qr_code, "
            "e.name as event_name, e.start_datetime, e.end_datetime, "
            "u.first_name, u.last_name, u.username "
            "FROM event_registrations r "
            "JOIN events e ON r.event_id = e.id "
            "JOIN users u ON r.user_id = u.id "
            "WHERE r.id = %s AND r.registration_status = 'Registered'",
            (registration_id,)
        )

        if not registration:
            return jsonify({
                'success': False,
                'error': 'Invalid or inactive registration'
            }), 400

        if registration['qr_code'] != qr_code:
            return jsonify({
                'success': False,
                'error': 'QR code does not match registration'
            }), 400

        # Check if already checked in
        existing_attendance = db.execute_one(
            "SELECT id FROM event_attendance WHERE event_id = %s AND user_id = %s",
            (registration['event_id'], user_id)
        )

        if existing_attendance:
            return jsonify({
                'success': False,
                'error': 'Already checked in',
                'participant': f"{registration['first_name']} {registration['last_name']}"
            }), 400

        # Record attendance
        attendance_id = db.execute_insert(
            "INSERT INTO event_attendance (event_id, user_id, check_in_datetime, check_in_method) "
            "VALUES (%s, %s, NOW(), 'QR')",
            (registration['event_id'], user_id)
        )

        logger.info(f"QR Check-in: {registration['first_name']} {registration['last_name']} for event {registration['event_name']}")

        return jsonify({
            'success': True,
            'message': 'Check-in successful',
            'participant': {
                'name': f"{registration['first_name']} {registration['last_name']}",
                'username': registration['username'],
                'event': registration['event_name'],
                'check_in_time': datetime.now().strftime('%I:%M %p')
            },
            'attendance_id': attendance_id
        }), 200

    except Exception as e:
        logger.error(f"QR check-in error: {e}")
        return jsonify({
            'success': False,
            'error': 'Check-in failed'
        }), 500


@attendance_bp.route('/manual-check-in', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def manual_check_in():
    """
    Manual check-in using participant ID or username
    POST /api/attendance/manual-check-in
    Body: { "event_id": 123, "participant_id": "johndoe" }
    """
    try:
        data = request.get_json()
        event_id = data.get('event_id')
        participant_id = data.get('participant_id')  # Can be ID or username

        if not event_id or not participant_id:
            return jsonify({'error': 'Missing event_id or participant_id'}), 400

        db = get_db()

        # Find user by ID or username
        if participant_id.isdigit():
            user_condition = "u.id = %s"
            user_param = int(participant_id)
        else:
            user_condition = "u.username = %s"
            user_param = participant_id

        # Check if user is registered for the event
        registration = db.execute_one(
            f"SELECT r.id, u.id as user_id, u.first_name, u.last_name, u.username, e.name as event_name "
            "FROM event_registrations r "
            "JOIN users u ON r.user_id = u.id "
            "JOIN events e ON r.event_id = e.id "
            f"WHERE r.event_id = %s AND {user_condition} AND r.registration_status = 'Registered'",
            (event_id, user_param)
        )

        if not registration:
            return jsonify({
                'success': False,
                'error': 'Participant not registered for this event'
            }), 400

        # Check if already checked in
        existing_attendance = db.execute_one(
            "SELECT id FROM event_attendance WHERE event_id = %s AND user_id = %s",
            (event_id, registration['user_id'])
        )

        if existing_attendance:
            return jsonify({
                'success': False,
                'error': 'Already checked in',
                'participant': f"{registration['first_name']} {registration['last_name']}"
            }), 400

        # Record attendance
        attendance_id = db.execute_insert(
            "INSERT INTO event_attendance (event_id, user_id, check_in_datetime, check_in_method) "
            "VALUES (%s, %s, NOW(), 'Manual')",
            (event_id, registration['user_id'])
        )

        logger.info(f"Manual Check-in: {registration['first_name']} {registration['last_name']} for event {registration['event_name']}")

        return jsonify({
            'success': True,
            'message': 'Manual check-in successful',
            'participant': {
                'name': f"{registration['first_name']} {registration['last_name']}",
                'username': registration['username'],
                'event': registration['event_name'],
                'check_in_time': datetime.now().strftime('%I:%M %p')
            },
            'attendance_id': attendance_id
        }), 200

    except Exception as e:
        logger.error(f"Manual check-in error: {e}")
        return jsonify({
            'success': False,
            'error': 'Manual check-in failed'
        }), 500


# ============================================================================
# ATTENDANCE REPORTS & ANALYTICS
# ============================================================================

@attendance_bp.route('/event/<int:event_id>', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor'])
def get_event_attendance(event_id):
    """
    Get attendance report for an event
    GET /api/attendance/event/123
    """
    try:
        db = get_db()

        # Get event details
        event = db.execute_one(
            "SELECT name, start_datetime, expected_attendees FROM events WHERE id = %s",
            (event_id,)
        )

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Get total registrations
        total_registered = db.execute_one(
            "SELECT COUNT(*) as count FROM event_registrations WHERE event_id = %s AND registration_status = 'Registered'",
            (event_id,)
        )['count']

        # Get attendance count
        attendance_count = db.execute_one(
            "SELECT COUNT(*) as count FROM event_attendance WHERE event_id = %s",
            (event_id,)
        )['count']

        # Get recent check-ins (last 10)
        recent_checkins = db.execute_query(
            "SELECT a.check_in_datetime, a.check_in_method, "
            "u.first_name, u.last_name, u.username "
            "FROM event_attendance a "
            "JOIN users u ON a.user_id = u.id "
            "WHERE a.event_id = %s "
            "ORDER BY a.check_in_datetime DESC "
            "LIMIT 10",
            (event_id,)
        )

        # Format recent check-ins
        for checkin in recent_checkins:
            checkin['check_in_time'] = checkin['check_in_datetime'].strftime('%I:%M %p')
            checkin['full_name'] = f"{checkin['first_name']} {checkin['last_name']}"

        return jsonify({
            'success': True,
            'event': {
                'id': event_id,
                'name': event['name'],
                'date': event['start_datetime'].strftime('%Y-%m-%d') if event['start_datetime'] else None,
                'expected_attendees': event.get('expected_attendees')
            },
            'attendance': {
                'total_registered': total_registered,
                'total_checked_in': attendance_count,
                'attendance_rate': round((attendance_count / total_registered * 100), 1) if total_registered > 0 else 0
            },
            'recent_checkins': recent_checkins
        }), 200

    except Exception as e:
        logger.error(f"Get event attendance error: {e}")
        return jsonify({'error': 'Failed to get attendance data'}), 500


@attendance_bp.route('/my-history', methods=['GET'])
@require_role(['Participant'])
def get_my_attendance_history():
    """
    Get current user's attendance history
    GET /api/attendance/my-history
    """
    try:
        db = get_db()

        history = db.execute_query(
            "SELECT a.check_in_datetime, a.check_in_method, "
            "e.name as event_name, e.start_datetime, e.end_datetime, e.venue "
            "FROM event_attendance a "
            "JOIN events e ON a.event_id = e.id "
            "WHERE a.user_id = %s "
            "ORDER BY a.check_in_datetime DESC",
            (session['user_id'],)
        )

        # Format the results
        for record in history:
            record['check_in_time'] = record['check_in_datetime'].strftime('%I:%M %p')
            record['event_date'] = record['start_datetime'].strftime('%Y-%m-%d')

        return jsonify({
            'success': True,
            'attendance_history': history
        }), 200

    except Exception as e:
        logger.error(f"Get my attendance history error: {e}")
        return jsonify({'error': 'Failed to get attendance history'}), 500


@attendance_bp.route('/event/<int:event_id>/full-report', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Requestor'])
def get_full_attendance_report(event_id):
    """
    Get complete attendance report with all participant details
    GET /api/attendance/event/123/full-report
    """
    try:
        db = get_db()

        # Get all registered participants with attendance status
        report = db.execute_query(
            "SELECT u.id, u.username, u.first_name, u.last_name, u.email, "
            "r.registration_status, "
            "a.check_in_datetime, a.check_in_method "
            "FROM event_registrations r "
            "JOIN users u ON r.user_id = u.id "
            "LEFT JOIN event_attendance a ON r.event_id = a.event_id AND r.user_id = a.user_id "
            "WHERE r.event_id = %s AND r.registration_status = 'Registered' "
            "ORDER BY u.last_name, u.first_name",
            (event_id,)
        )

        # Format results
        formatted_report = []
        for participant in report:
            formatted_report.append({
                'id': participant['id'],
                'name': f"{participant['first_name']} {participant['last_name']}",
                'username': participant['username'],
                'email': participant['email'],
                'registration_status': participant['registration_status'],
                'checked_in': participant['check_in_datetime'] is not None,
                'check_in_time': participant['check_in_datetime'].strftime('%I:%M %p') if participant['check_in_datetime'] else None,
                'check_in_method': participant['check_in_method'] or None
            })

        return jsonify({
            'success': True,
            'report': formatted_report,
            'total_registered': len(formatted_report),
            'total_checked_in': len([p for p in formatted_report if p['checked_in']])
        }), 200

    except Exception as e:
        logger.error(f"Get full attendance report error: {e}")
        return jsonify({'error': 'Failed to generate attendance report'}), 500
