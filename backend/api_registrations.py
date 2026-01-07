# ============================================================================
# EVENT REGISTRATION API MODULE
# Student event registration, cancellation, and management
# ============================================================================

from flask import Blueprint, request, jsonify, session
from backend.auth import require_role
from database.db import get_db
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

# Create blueprint
registration_bp = Blueprint('registration', __name__, url_prefix='/api/registration')


# ============================================================================
# REGISTRATION MANAGEMENT
# ============================================================================

@registration_bp.route('/register/<int:event_id>', methods=['POST'])
@require_role(['Participant', 'Student', 'Student Organization Officer'])
def register_for_event(event_id):
    """
    Register current user for an event
    POST /api/registration/register/123
    """
    try:
        db = get_db()

        # Check if event exists and is approved
        event = db.execute_one(
            "SELECT id, name, status, max_attendees FROM events WHERE id = %s AND deleted_at IS NULL",
            (event_id,)
        )

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        if event['status'] != 'Approved':
            return jsonify({'error': 'Event is not available for registration'}), 400

        # Check if user is already registered
        existing_registration = db.execute_one(
            "SELECT id, registration_status FROM event_registrations WHERE event_id = %s AND user_id = %s",
            (event_id, session['user_id'])
        )

        if existing_registration:
            if existing_registration['registration_status'] == 'Registered':
                return jsonify({'error': 'You are already registered for this event'}), 400
            elif existing_registration['registration_status'] == 'Cancelled':
                # Re-register cancelled registration
                db.execute_update(
                    "UPDATE event_registrations SET registration_status = 'Registered', updated_at = NOW() WHERE id = %s",
                    (existing_registration['id'],)
                )
                logger.info(f"User {session['username']} re-registered for event {event_id}")
                return jsonify({
                    'success': True,
                    'message': 'Successfully re-registered for event',
                    'registration_id': existing_registration['id']
                }), 200

        # Check capacity if max_attendees is set
        if event['max_attendees']:
            current_registrations = db.execute_one(
                "SELECT COUNT(*) as count FROM event_registrations WHERE event_id = %s AND registration_status = 'Registered'",
                (event_id,)
            )

            if current_registrations and current_registrations['count'] >= event['max_attendees']:
                # Add to waitlist
                registration_id = db.execute_insert(
                    "INSERT INTO event_registrations (event_id, user_id, registration_status) VALUES (%s, %s, 'Waitlisted')",
                    (event_id, session['user_id'])
                )
                logger.info(f"User {session['username']} added to waitlist for event {event_id}")
                return jsonify({
                    'success': True,
                    'message': 'Event is full. You have been added to the waitlist.',
                    'registration_id': registration_id,
                    'status': 'Waitlisted'
                }), 200

        # Register for the event
        registration_id = db.execute_insert(
            "INSERT INTO event_registrations (event_id, user_id, registration_status) VALUES (%s, %s, 'Registered')",
            (event_id, session['user_id'])
        )

        logger.info(f"User {session['username']} registered for event {event_id}")
        return jsonify({
            'success': True,
            'message': 'Successfully registered for event',
            'registration_id': registration_id
        }), 201

    except Exception as e:
        logger.error(f"Register for event error: {e}")
        return jsonify({'error': 'Failed to register for event'}), 500


@registration_bp.route('/unregister/<int:event_id>', methods=['POST'])
@require_role(['Participant', 'Student', 'Student Organization Officer'])
def unregister_from_event(event_id):
    """
    Unregister/cancel registration for an event
    POST /api/registration/unregister/123
    """
    try:
        db = get_db()

        # Check if registration exists
        registration = db.execute_one(
            "SELECT id, registration_status FROM event_registrations WHERE event_id = %s AND user_id = %s",
            (event_id, session['user_id'])
        )

        if not registration:
            return jsonify({'error': 'You are not registered for this event'}), 400

        if registration['registration_status'] == 'Cancelled':
            return jsonify({'error': 'Registration is already cancelled'}), 400

        # Cancel registration
        db.execute_update(
            "UPDATE event_registrations SET registration_status = 'Cancelled', updated_at = NOW() WHERE id = %s",
            (registration['id'],)
        )

        logger.info(f"User {session['username']} cancelled registration for event {event_id}")

        return jsonify({
            'success': True,
            'message': 'Registration cancelled successfully'
        }), 200

    except Exception as e:
        logger.error(f"Unregister from event error: {e}")
        return jsonify({'error': 'Failed to cancel registration'}), 500


@registration_bp.route('/my-registrations', methods=['GET'])
@require_role(['Participant', 'Student', 'Student Organization Officer'])
def get_my_registrations():
    """
    Get current user's event registrations
    GET /api/registration/my-registrations
    """
    try:
        db = get_db()

        query = """
            SELECT r.id, r.registration_status, r.registration_date, r.qr_code,
                   e.id as event_id, e.name, e.event_type, e.start_datetime, e.end_datetime,
                   e.venue, e.description
            FROM event_registrations r
            JOIN events e ON r.event_id = e.id
            WHERE r.user_id = %s AND r.registration_status IN ('Registered', 'Waitlisted')
            ORDER BY e.start_datetime
        """

        registrations = db.execute_query(query, (session['user_id'],))

        # Format the results
        for reg in registrations:
            reg['start_datetime'] = reg['start_datetime'].isoformat() if reg['start_datetime'] else None
            reg['end_datetime'] = reg['end_datetime'].isoformat() if reg['end_datetime'] else None
            reg['registration_date'] = reg['registration_date'].isoformat() if reg['registration_date'] else None

        return jsonify({
            'success': True,
            'registrations': registrations
        }), 200

    except Exception as e:
        logger.error(f"Get my registrations error: {e}")
        return jsonify({'error': 'Failed to retrieve registrations'}), 500


@registration_bp.route('/check-status/<int:event_id>', methods=['GET'])
@require_role(['Participant', 'Student', 'Student Organization Officer'])
def check_registration_status(event_id):
    """
    Check user's registration status for an event
    GET /api/registration/check-status/123
    """
    try:
        db = get_db()

        registration = db.execute_one(
            "SELECT registration_status, registration_date FROM event_registrations WHERE event_id = %s AND user_id = %s",
            (event_id, session['user_id'])
        )

        if not registration:
            return jsonify({
                'registered': False,
                'status': None,
                'registration_date': None
            }), 200

        return jsonify({
            'registered': True,
            'status': registration['registration_status'],
            'registration_date': registration['registration_date'].isoformat() if registration['registration_date'] else None
        }), 200

    except Exception as e:
        logger.error(f"Check registration status error: {e}")
        return jsonify({'error': 'Failed to check registration status'}), 500


@registration_bp.route('/event/<int:event_id>/stats', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def get_event_registration_stats(event_id):
    """
    Get registration statistics for an event (admin view)
    GET /api/registration/event/123/stats
    """
    try:
        db = get_db()

        # Get total registrations
        stats = db.execute_one(
            """
            SELECT
                COUNT(CASE WHEN registration_status = 'Registered' THEN 1 END) as registered_count,
                COUNT(CASE WHEN registration_status = 'Waitlisted' THEN 1 END) as waitlist_count,
                COUNT(CASE WHEN registration_status = 'Cancelled' THEN 1 END) as cancelled_count
            FROM event_registrations
            WHERE event_id = %s
            """,
            (event_id,)
        )

        # Get event capacity info
        event = db.execute_one(
            "SELECT max_attendees FROM events WHERE id = %s",
            (event_id,)
        )

        stats['max_attendees'] = event['max_attendees'] if event else None
        stats['available_spots'] = max(0, (event['max_attendees'] - stats['registered_count'])) if event and event['max_attendees'] else None

        return jsonify({
            'success': True,
            'stats': stats
        }), 200

    except Exception as e:
        logger.error(f"Get event registration stats error: {e}")
        return jsonify({'error': 'Failed to get registration statistics'}), 500


@registration_bp.route('/event/<int:event_id>/attendees', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def get_event_attendees(event_id):
    """
    Get list of registered attendees for an event (admin view)
    GET /api/registration/event/123/attendees
    """
    try:
        db = get_db()

        query = """
            SELECT r.registration_status, r.registration_date,
                   u.id, u.username, u.first_name, u.last_name, u.email
            FROM event_registrations r
            JOIN users u ON r.user_id = u.id
            WHERE r.event_id = %s AND r.registration_status IN ('Registered', 'Waitlisted')
            ORDER BY r.registration_date
        """

        attendees = db.execute_query(query, (event_id,))

        return jsonify({
            'success': True,
            'attendees': attendees
        }), 200

    except Exception as e:
        logger.error(f"Get event attendees error: {e}")
        return jsonify({'error': 'Failed to get attendees list'}), 500
