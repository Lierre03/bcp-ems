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
@require_role(['Participant', 'Student', 'Student Organization Officer'])
def submit_feedback(event_id):
    """
    Submit comprehensive feedback for an attended event
    POST /api/feedback/submit/123
    Body: includes overall, venue, activities, organization, PLUS
          registration_process, speaker_effectiveness, content_relevance, net_promoter_score,
          key_takeaways, future_interest
    """
    try:
        data = request.get_json()

        # Validate required fields
        required_fields = ['overall_rating']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400

        # Validate standard rating ranges (1-5)
        rating_fields = ['overall_rating', 'venue_rating', 'activities_rating', 'organization_rating', 
                         'registration_process', 'speaker_effectiveness', 'content_relevance']
        for field in rating_fields:
            if field in data and data[field] is not None:
                rating = data[field]
                try:
                    rating = int(rating)
                    if rating < 1 or rating > 5:
                        return jsonify({'error': f'{field} must be between 1 and 5'}), 400
                except (ValueError, TypeError):
                     return jsonify({'error': f'{field} must be an integer'}), 400

        # Validate NPS (0-10)
        if 'net_promoter_score' in data and data['net_promoter_score'] is not None:
             try:
                nps = int(data['net_promoter_score'])
                if nps < 0 or nps > 10:
                    return jsonify({'error': 'Net Promoter Score must be between 0 and 10'}), 400
             except (ValueError, TypeError):
                return jsonify({'error': 'NPS must be an integer'}), 400

        # Check if user attended this event
        db = get_db()
        attendance = db.execute_one(
            "SELECT id FROM event_attendance WHERE event_id = %s AND user_id = %s",
            (event_id, session['user_id'])
        )

        if not attendance:
            return jsonify({'error': 'You must attend the event before submitting feedback'}), 403

        # Check if event has ended
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
            
            all_fields = [
                'overall_rating', 'venue_rating', 'activities_rating', 'organization_rating',
                'registration_process', 'speaker_effectiveness', 'content_relevance', 
                'net_promoter_score', 'key_takeaways', 'future_interest', 'comments'
            ]

            for field in all_fields:
                if field in data:
                    update_fields.append(f"{field} = %s")
                    params.append(data.get(field))

            params.append(event_id)
            params.append(session['user_id'])

            query = f"UPDATE event_feedback SET {', '.join(update_fields)}, updated_at = NOW() WHERE event_id = %s AND user_id = %s"
            db.execute_update(query, tuple(params))

            logger.info(f"Feedback updated: Event {event_id}, User {session['username']}")
            return jsonify({'success': True, 'message': 'Feedback updated successfully'}), 200

        else:
            # Insert new feedback
            fields = [
                'event_id', 'user_id', 'overall_rating', 'venue_rating',
                'activities_rating', 'organization_rating', 'comments',
                'registration_process', 'speaker_effectiveness', 'content_relevance', 
                'net_promoter_score', 'key_takeaways', 'future_interest'
            ]
            
            placeholders = ', '.join(['%s'] * len(fields))
            columns = ', '.join(fields)
            
            query = f"INSERT INTO event_feedback ({columns}) VALUES ({placeholders})"

            db.execute_insert(query, (
                event_id,
                session['user_id'],
                data['overall_rating'],
                data.get('venue_rating'),
                data.get('activities_rating'),
                data.get('organization_rating'),
                data.get('comments', ''),
                data.get('registration_process'),
                data.get('speaker_effectiveness'),
                data.get('content_relevance'),
                data.get('net_promoter_score'),
                data.get('key_takeaways', ''),
                data.get('future_interest') # Boolean or None
            ))

            logger.info(f"Feedback submitted: Event {event_id}, User {session['username']}")
            return jsonify({'success': True, 'message': 'Feedback submitted successfully'}), 201

    except Exception as e:
        logger.error(f"Submit feedback error: {e}")
        return jsonify({'error': 'Failed to submit feedback'}), 500


@feedback_bp.route('/my-feedback', methods=['GET'])
@require_role(['Participant', 'Student', 'Student Organization Officer'])
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
            # Convert ratings to integers
            rating_fields = [
                'overall_rating', 'venue_rating', 'activities_rating', 'organization_rating',
                'registration_process', 'speaker_effectiveness', 'content_relevance', 
                'net_promoter_score'
            ]
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

@feedback_bp.route('/department', methods=['GET'])
@require_role(['Super Admin', 'Admin'])
def get_department_feedback():
    """
    Get all feedback for events in the user's department
    GET /api/feedback/department
    """
    try:
        db = get_db()
        user_role = session.get('role_name')
        user_dept = session.get('department')
        print(f"DEBUG: Feedback Request - Role: {user_role}, Dept: {user_dept}")
        
        # Super Admin sees all
        dept_condition = ""
        params = []
        
        if user_role != 'Super Admin':
            if not user_dept:
                return jsonify({'success': True, 'feedback': []}), 200 # No department assigned
            
            # Special case for IT Department (sees BSIT, BSCS, BSIS)
            if user_dept == 'IT Department':
                 dept_condition = "AND (e.organizing_department = %s OR e.organizing_department IN ('BSIT', 'BSCS', 'BSIS'))"
                 params.append(user_dept)
            else:
                 dept_condition = "AND e.organizing_department = %s"
                 params.append(user_dept)

        query = """
            SELECT f.*, e.name as event_name, e.start_datetime, e.end_datetime,
                   u.first_name, u.last_name, u.username
            FROM event_feedback f
            JOIN events e ON f.event_id = e.id
            JOIN users u ON f.user_id = u.id
            WHERE e.deleted_at IS NULL
            {}
            ORDER BY f.created_at DESC
        """.format(dept_condition)

        feedback_list = db.execute_query(query, tuple(params))

        # Aggregate results by event
        events_map = {}
        
        for f in feedback_list:
            eid = f['event_id']
            if eid not in events_map:
                events_map[eid] = {
                    'event_id': eid,
                    'event_name': f['event_name'],
                    'start_datetime': f['start_datetime'],
                    'end_datetime': f['end_datetime'],
                    'venue': f.get('venue', ''), # Ensure venue exists in query if needed
                    'response_count': 0,
                    'ratings_sum': {
                        'overall': 0, 'venue': 0, 'activities': 0, 'organization': 0,
                        'registration': 0, 'speakers': 0, 'content': 0
                    },
                    'ratings_count': {
                         'overall': 0, 'venue': 0, 'activities': 0, 'organization': 0,
                         'registration': 0, 'speakers': 0, 'content': 0
                    },
                    'comments': []
                }
            
            event = events_map[eid]
            event['response_count'] += 1
            
            # Collect Rating Stats
            rating_map = {
                'overall': 'overall_rating', 'venue': 'venue_rating', 
                'activities': 'activities_rating', 'organization': 'organization_rating',
                'registration': 'registration_process', 'speakers': 'speaker_effectiveness',
                'content': 'content_relevance'
            }
            
            for key, db_col in rating_map.items():
                val = f.get(db_col)
                if val is not None:
                    try:
                        val = int(val)
                        event['ratings_sum'][key] += val
                        event['ratings_count'][key] += 1
                    except (ValueError, TypeError):
                        pass

            # Collect Comment
            if f.get('comments'):
                event['comments'].append({
                    'user': "Student", # Anonymized for privacy
                    # 'username': f['username'], # Removed for privacy
                    'text': f['comments'],
                    'rating': int(f['overall_rating']) if f.get('overall_rating') else None,
                    'date': f['created_at'].strftime('%Y-%m-%d') if f.get('created_at') else None
                })

        # Calculate Averages and Final List
        aggregated_list = []
        for eid, event in events_map.items():
            final_event = {
                'event_id': event['event_id'],
                'event_name': event['event_name'],
                'start_datetime': event['start_datetime'],
                'end_datetime': event['end_datetime'],
                'response_count': event['response_count'],
                'comments': event['comments']
            }
            
            # Compute avgs
            for key in event['ratings_sum']:
                count = event['ratings_count'][key]
                if count > 0:
                    final_event[f'{key}_rating'] = round(event['ratings_sum'][key] / count, 1)
                else:
                    final_event[f'{key}_rating'] = None # Or 0
            
            # Map specific keys for frontend compatibility
            final_event['overall_rating'] = final_event['overall_rating']
            final_event['venue_rating'] = final_event['venue_rating']
            final_event['activities_rating'] = final_event['activities_rating']
            final_event['organization_rating'] = final_event['organization_rating']
            final_event['speaker_effectiveness'] = final_event['speakers_rating']
            final_event['content_relevance'] = final_event['content_rating']
            final_event['registration_process'] = final_event['registration_rating']

            # Date Formatting
            if final_event.get('start_datetime'):
                 # Ensure it's treated as string/iso for JSON
                 pass 

            aggregated_list.append(final_event)

        return jsonify({
            'success': True,
            'feedback': aggregated_list,
            'department': user_dept if user_role != 'Super Admin' else 'All'
        }), 200

    except Exception as e:
        logger.error(f"Get department feedback error: {e}")
        return jsonify({'error': 'Failed to retrieve department feedback'}), 500


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
@require_role(['Participant', 'Student', 'Student Organization Officer'])
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
@require_role(['Participant', 'Student', 'Student Organization Officer'])
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
              AND (f.id IS NULL)
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
