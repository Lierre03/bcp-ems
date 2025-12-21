                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    # ============================================================================
# FEEDBACK API MODULE
# Event feedback collection, analytics, and management
# ============================================================================

from flask import Blueprint, request, jsonify, session
from backend.auth import require_role
from database.db import get_db
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Create blueprint
feedback_bp = Blueprint('feedback', __name__, url_prefix='/api/feedback')


# ============================================================================
# FEEDBACK SUBMISSION & MANAGEMENT
# ============================================================================

@feedback_bp.route('/submit/<int:event_id>', methods=['POST'])
@require_role(['Participant'])
def submit_feedback(event_id):
    """
    Submit feedback for an attended event
    POST /api/feedback/submit/123
    Body: {
        "overall_rating": 5,
        "venue_rating": 4,
        "activities_rating": 5,
        "organization_rating": 4,
        "comments": "Great event!..."
    }
    """
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['overall_rating']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate rating ranges (1-5)
        rating_fields = ['overall_rating', 'venue_rating', 'activities_rating', 'organization_rating']
        for field in rating_fields:
            if field in data:
                rating = data[field]
                if not isinstance(rating, int) or rating < 1 or rating > 5:
                    return jsonify({'error': f'{field} must be an integer between 1 and 5'}), 400

        # Check if user attended this event
        db = get_db()
        attendance = db.execute_one(
            "SELECT id FROM event_attendance WHERE event_id = %s AND user_id = %s",
            (event_id, session['user_id'])
        )

        if not attendance:
            return jsonify({'error': 'You must attend the event before submitting feedback'}), 403

        # Check if event has ended (allow feedback for past events)
        event = db.execute_one(
            "SELECT end_datetime FROM events WHERE id = %s AND status IN ('Completed', 'Ongoing')",
            (event_id,)
        )

        if not event:
            return jsonify({'error': 'Event not found or not yet completed'}), 404

        # Check if feedback already exists
        existing_feedback = db.execute_one(
            "SELECT id, can_edit FROM event_feedback WHERE event_id = %s AND user_id = %s",
            (event_id, session['user_id'])
        )

        if existing_feedback:
            if not existing_feedback['can_edit']:
                return jsonify({'error': 'Feedback edit window has expired (24 hours after submission)'}), 403

            # Update existing feedback
            update_fields = []
            params = []

            for field in ['overall_rating', 'venue_rating', 'activities_rating', 'organization_rating', 'comments']:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    params.append(data[field])

            params.append(event_id)
            params.append(session['user_id'])

            query = f"UPDATE event_feedback SET {', '.join(update_fields)}, updated_at = NOW() WHERE event_id = %s AND user_id = %s"
            db.execute_update(query, tuple(params))

            logger.info(f"Feedback updated: Event {event_id}, User {session['username']}")
            return jsonify({'success': True, 'message': 'Feedback updated successfully'}), 200

        else:
            # Insert new feedback
            query = """
                INSERT INTO event_feedback (
                    event_id, user_id, overall_rating, venue_rating,
                    activities_rating, organization_rating, comments
                ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            """

            db.execute_insert(query, (
                event_id,
                session['user_id'],
                data['overall_rating'],
                data.get('venue_rating'),
                data.get('activities_rating'),
                data.get('organization_rating'),
                data.get('comments', '')
            ))

            logger.info(f"Feedback submitted: Event {event_id}, User {session['username']}")
            return jsonify({'success': True, 'message': 'Feedback submitted successfully'}), 201

    except Exception as e:
        logger.error(f"Submit feedback error: {e}")
        return jsonify({'error': 'Failed to submit feedback'}), 500


@feedback_bp.route('/my-feedback', methods=['GET'])
@require_role(['Participant'])
def get_my_feedback():
    """
    Get user's own feedback history
    GET /api/feedback/my-feedback
    """
    try:
        db = get_db()
        query = """
            SELECT f.*, e.name as event_name, e.start_datetime, e.end_datetime,
                   e.venue, TIMESTAMPDIFF(HOUR, f.created_at, NOW()) as hours_since_submission
            FROM event_feedback f
            JOIN events e ON f.event_id = e.id
            WHERE f.user_id = %s
            ORDER BY f.created_at DESC
        """

        feedback_list = db.execute_query(query, (session['user_id'],))

        # Format the results
        for feedback in feedback_list:
            # Convert ratings to integers
            rating_fields = ['overall_rating', 'venue_rating', 'activities_rating', 'organization_rating']
            for field in rating_fields:
                if feedback.get(field) is not None:
                    feedback[field] = int(feedback[field])

            # Check if still editable
            feedback['can_edit'] = feedback['can_edit'] and feedback['hours_since_submission'] < 24

        return jsonify({
            'success': True,
            'feedback': feedback_list
        }), 200

    except Exception as e:
        logger.error(f"Get my feedback error: {e}")
        return jsonify({'error': 'Failed to retrieve feedback'}), 500


@feedback_bp.route('/event/<int:event_id>', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff'])
def get_event_feedback(event_id):
    """
    Get all feedback for a specific event (admin analytics)
    GET /api/feedback/event/123
    """
    try:
        db = get_db()

        # Get event details
        event = db.execute_one(
            "SELECT name, start_datetime FROM events WHERE id = %s",
            (event_id,)
        )

        if not event:
            return jsonify({'error': 'Event not found'}), 404

        # Get all feedback for this event
        query = """
            SELECT f.*, u.first_name, u.last_name, u.username,
                   TIMESTAMPDIFF(HOUR, f.created_at, NOW()) as hours_since_submission
            FROM event_feedback f
            JOIN users u ON f.user_id = u.id
            WHERE f.event_id = %s
            ORDER BY f.created_at DESC
        """

        feedback_list = db.execute_query(query, (event_id,))

        # Calculate analytics
        if feedback_list:
            ratings = {
                'overall': [],
                'venue': [],
                'activities': [],
                'organization': []
            }

            for feedback in feedback_list:
                # Convert to integers
                rating_fields = ['overall_rating', 'venue_rating', 'venue_rating', 'activities_rating', 'organization_rating']
                for field in rating_fields:
                    if feedback.get(field) is not None:
                        feedback[field] = int(feedback[field])

                        # Add to analytics
                        if field == 'overall_rating':
                            ratings['overall'].append(feedback[field])
                        elif field == 'venue_rating':
                            ratings['venue'].append(feedback[field])
                        elif field == 'activities_rating':
                            ratings['activities'].append(feedback[field])
                        elif field == 'organization_rating':
                            ratings['organization'].append(feedback[field])

            # Calculate averages
            analytics = {}
            for category, values in ratings.items():
                if values:
                    analytics[f'{category}_avg'] = round(sum(values) / len(values), 1)
                    analytics[f'{category}_count'] = len(values)
                else:
                    analytics[f'{category}_avg'] = None
                    analytics[f'{category}_count'] = 0

            analytics['total_responses'] = len(feedback_list)
        else:
            analytics = {
                'overall_avg': None, 'overall_count': 0,
                'venue_avg': None, 'venue_count': 0,
                'activities_avg': None, 'activities_count': 0,
                'organization_avg': None, 'organization_count': 0,
                'total_responses': 0
            }

        return jsonify({
            'success': True,
            'event': {
                'id': event_id,
                'name': event['name'],
                'date': event['start_datetime'].strftime('%Y-%m-%d')
            },
            'feedback': feedback_list,
            'analytics': analytics
        }), 200

    except Exception as e:
        logger.error(f"Get event feedback error: {e}")
        return jsonify({'error': 'Failed to retrieve event feedback'}), 500


@feedback_bp.route('/analytics/overview', methods=['GET'])
@require_role(['Super Admin', 'Admin'])
def get_feedback_analytics():
    """
    Get overall feedback analytics across all events
    GET /api/feedback/analytics/overview
    """
    try:
        db = get_db()

        # Get feedback summary across all completed events
        query = """
            SELECT
                COUNT(*) as total_feedback,
                AVG(overall_rating) as overall_avg,
                AVG(venue_rating) as venue_avg,
                AVG(activities_rating) as activities_avg,
                AVG(organization_rating) as organization_avg
            FROM event_feedback f
            JOIN events e ON f.event_id = e.id
            WHERE e.status = 'Completed'
        """

        summary = db.execute_one(query)

        # Convert to proper types
        analytics = {}
        for key, value in summary.items():
            if 'avg' in key and value is not None:
                analytics[key] = round(float(value), 1)
            else:
                analytics[key] = int(value) if value is not None else 0

        # Get recent feedback (last 30 days)
        recent_query = """
            SELECT f.*, e.name as event_name, u.first_name, u.last_name
            FROM event_feedback f
            JOIN events e ON f.event_id = e.id
            JOIN users u ON f.user_id = u.id
            WHERE f.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            ORDER BY f.created_at DESC
            LIMIT 10
        """

        recent_feedback = db.execute_query(recent_query)

        # Format recent feedback
        for feedback in recent_feedback:
            rating_fields = ['overall_rating', 'venue_rating', 'activities_rating', 'organization_rating']
            for field in rating_fields:
                if feedback.get(field) is not None:
                    feedback[field] = int(feedback[field])

        return jsonify({
            'success': True,
            'analytics': analytics,
            'recent_feedback': recent_feedback
        }), 200

    except Exception as e:
        logger.error(f"Get feedback analytics error: {e}")
        return jsonify({'error': 'Failed to retrieve analytics'}), 500


@feedback_bp.route('/check-eligibility/<int:event_id>', methods=['GET'])
@require_role(['Participant'])
def check_feedback_eligibility(event_id):
    """
    Check if user can submit feedback for an event
    GET /api/feedback/check-eligibility/123
    """
    try:
        db = get_db()

        # Check if user attended the event
        attendance = db.execute_one(
            "SELECT id FROM event_attendance WHERE event_id = %s AND user_id = %s",
            (event_id, session['user_id'])
        )

        if not attendance:
            return jsonify({
                'eligible': False,
                'reason': 'You must attend the event to submit feedback'
            }), 200

        # Check if event is completed
        event = db.execute_one(
            "SELECT status FROM events WHERE id = %s",
            (event_id,)
        )

        if not event or event['status'] not in ['Completed', 'Ongoing']:
            return jsonify({
                'eligible': False,
                'reason': 'Event must be completed to submit feedback'
            }), 200

        # Check if feedback already exists
        existing_feedback = db.execute_one(
            "SELECT id, can_edit FROM event_feedback WHERE event_id = %s AND user_id = %s",
            (event_id, session['user_id'])
        )

        if existing_feedback:
            if existing_feedback['can_edit']:
                return jsonify({
                    'eligible': True,
                    'existing': True,
                    'can_edit': True
                }), 200
            else:
                return jsonify({
                    'eligible': False,
                    'reason': 'Feedback edit window has expired (24 hours after submission)',
                    'existing': True,
                    'can_edit': False
                }), 200

        return jsonify({
            'eligible': True,
            'existing': False,
            'can_edit': True
        }), 200

    except Exception as e:
        logger.error(f"Check feedback eligibility error: {e}")
        return jsonify({'error': 'Failed to check eligibility'}), 500


@feedback_bp.route('/pending', methods=['GET'])
@require_role(['Participant'])
def get_pending_feedback():
    """
    Get events that need feedback from the student
    GET /api/feedback/pending
    Returns events that:
    - Student attended (have attendance record)
    - Event is completed
    - No feedback submitted yet OR feedback exists but can still be edited
    """
    try:
        db = get_db()

        # Get events that need feedback
        query = """
            SELECT DISTINCT e.id, e.name, e.event_type, e.start_datetime, e.end_datetime,
                   e.venue, e.description, ea.check_in_datetime
            FROM events e
            JOIN event_attendance ea ON e.id = ea.event_id
            LEFT JOIN event_feedback f ON e.id = f.event_id AND ea.user_id = f.user_id
            WHERE ea.user_id = %s
              AND e.status IN ('Completed', 'Ongoing')
              AND e.deleted_at IS NULL
              AND (f.id IS NULL OR (f.can_edit = TRUE AND f.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)))
            ORDER BY e.end_datetime DESC
        """

        pending_events = db.execute_query(query, (session['user_id'],))

        # Format the results
        for event in pending_events:
            event['start_datetime'] = event['start_datetime'].isoformat() if event['start_datetime'] else None
            event['end_datetime'] = event['end_datetime'].isoformat() if event['end_datetime'] else None
            event['check_in_datetime'] = event['check_in_datetime'].isoformat() if event['check_in_datetime'] else None

        return jsonify({
            'success': True,
            'pending_events': pending_events,
            'count': len(pending_events)
        }), 200

    except Exception as e:
        logger.error(f"Get pending feedback error: {e}")
        return jsonify({'error': 'Failed to get pending feedback'}), 500
