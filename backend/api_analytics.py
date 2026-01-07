# ============================================================================
# ANALYTICS API MODULE
# Dashboard metrics and statistics
# ============================================================================

from flask import Blueprint, jsonify, session
from backend.auth import require_role
from database.db import get_db
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')


@analytics_bp.route('/dashboard', methods=['GET'])
@require_role(['Super Admin', 'Admin'])
def get_dashboard_analytics():
    """
    Get comprehensive analytics for admin dashboard
    Returns: event stats, attendance, feedback, trends
    """
    try:
        user_role = session.get('role_name')
        user_dept = session.get('department')
        
        # Department filter for Admins
        dept_condition = ""
        params = []
        if user_role == 'Admin' and user_dept:
            dept_condition = "AND e.organizing_department = %s"
            params = [user_dept]
        
        # 1. EVENT STATISTICS BY STATUS
        status_query = """
            SELECT status, COUNT(*) as count
            FROM events e
            WHERE e.deleted_at IS NULL
            {}
            GROUP BY status
        """.format(dept_condition)
        status_stats = get_db().execute_query(status_query, tuple(params) if params else ())
        
        # 2. EVENTS BY TYPE
        type_query = """
            SELECT event_type, COUNT(*) as count
            FROM events e
            WHERE e.deleted_at IS NULL
            {}
            GROUP BY event_type
        """.format(dept_condition)
        type_stats = get_db().execute_query(type_query, tuple(params) if params else ())
        
        # 3. EVENTS BY DEPARTMENT (Super Admin only)
        dept_stats = []
        if user_role == 'Super Admin':
            dept_query = """
                SELECT 
                    COALESCE(organizing_department, 'Unassigned') as department,
                    COUNT(*) as count
                FROM events
                WHERE deleted_at IS NULL
                GROUP BY organizing_department
                ORDER BY count DESC
            """
            dept_stats = get_db().execute_query(dept_query)
        
        # 4. ATTENDANCE METRICS
        attendance_query = """
            SELECT 
                COUNT(DISTINCT er.id) as total_registrations,
                COUNT(DISTINCT ea.id) as total_attendees,
                COUNT(DISTINCT CASE WHEN ea.attendance_status = 'Present' THEN ea.id END) as present_count,
                COUNT(DISTINCT CASE WHEN ea.attendance_status = 'Late' THEN ea.id END) as late_count
            FROM events e
            LEFT JOIN event_registrations er ON e.id = er.event_id
            LEFT JOIN event_attendance ea ON e.id = ea.event_id
            WHERE e.deleted_at IS NULL
            {}
        """.format(dept_condition)
        attendance_stats = get_db().execute_one(attendance_query, tuple(params) if params else ())
        
        # Calculate attendance rate
        total_reg = attendance_stats.get('total_registrations', 0) or 0
        total_att = attendance_stats.get('total_attendees', 0) or 0
        attendance_rate = round((total_att / total_reg * 100), 1) if total_reg > 0 else 0
        
        # 5. FEEDBACK STATISTICS
        feedback_query = """
            SELECT 
                AVG(overall_rating) as avg_overall,
                AVG(venue_rating) as avg_venue,
                AVG(activities_rating) as avg_activities,
                AVG(organization_rating) as avg_organization,
                COUNT(*) as total_feedback
            FROM event_feedback ef
            JOIN events e ON ef.event_id = e.id
            WHERE e.deleted_at IS NULL
            {}
        """.format(dept_condition)
        feedback_stats = get_db().execute_one(feedback_query, tuple(params) if params else ())
        
        # 6. FEEDBACK BY EVENT TYPE
        feedback_by_type_query = """
            SELECT 
                e.event_type,
                AVG(ef.overall_rating) as avg_rating,
                COUNT(ef.id) as feedback_count
            FROM events e
            JOIN event_feedback ef ON e.id = ef.event_id
            WHERE e.deleted_at IS NULL
            {}
            GROUP BY e.event_type
            HAVING feedback_count > 0
            ORDER BY avg_rating DESC
        """.format(dept_condition)
        feedback_by_type = get_db().execute_query(feedback_by_type_query, tuple(params) if params else ())
        
        # 7. BUDGET STATISTICS
        budget_query = """
            SELECT 
                SUM(budget) as total_budget,
                AVG(budget) as avg_budget,
                MIN(budget) as min_budget,
                MAX(budget) as max_budget,
                SUM(CASE WHEN status = 'Completed' THEN budget ELSE 0 END) as completed_budget
            FROM events e
            WHERE e.deleted_at IS NULL AND e.budget > 0
            {}
        """.format(dept_condition)
        budget_stats = get_db().execute_one(budget_query, tuple(params) if params else ())
        
        # 8. MONTHLY EVENT TRENDS (last 6 months)
        monthly_query = """
            SELECT 
                DATE_FORMAT(start_datetime, '%%Y-%%m') as month,
                COUNT(*) as event_count,
                SUM(expected_attendees) as total_attendees
            FROM events e
            WHERE e.deleted_at IS NULL
            AND e.start_datetime >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            {}
            GROUP BY DATE_FORMAT(e.start_datetime, '%%Y-%%m')
            ORDER BY month ASC
        """.format(dept_condition)
        monthly_trends = get_db().execute_query(monthly_query, tuple(params) if params else ())
        
        # 9. UPCOMING EVENTS COUNT
        upcoming_query = """
            SELECT COUNT(*) as count
            FROM events e
            WHERE e.deleted_at IS NULL
            AND e.start_datetime > NOW()
            AND e.status IN ('Approved', 'Ongoing')
            {}
        """.format(dept_condition)
        upcoming_count = get_db().execute_one(upcoming_query, tuple(params) if params else ())
        
        # 10. TOP VENUES
        venue_query = """
            SELECT 
                venue,
                COUNT(*) as usage_count
            FROM events e
            WHERE e.deleted_at IS NULL
            AND e.venue IS NOT NULL
            {}
            GROUP BY venue
            ORDER BY usage_count DESC
            LIMIT 5
        """.format(dept_condition)
        top_venues = get_db().execute_query(venue_query, tuple(params) if params else ())

        # 11. FEEDBACK PER EVENT (Recent 10)
        feedback_events_query = """
            SELECT 
                e.id,
                e.name,
                e.start_datetime,
                AVG(ef.overall_rating) as avg_rating,
                COUNT(ef.id) as response_count
            FROM events e
            JOIN event_feedback ef ON e.id = ef.event_id
            WHERE e.deleted_at IS NULL
            {}
            GROUP BY e.id
            ORDER BY e.start_datetime DESC
            LIMIT 10
        """.format(dept_condition)
        feedback_events = get_db().execute_query(feedback_events_query, tuple(params) if params else ())
        
        # Format per_event ratings
        for event in feedback_events:
            if event.get('avg_rating'):
                event['avg_rating'] = float(event['avg_rating'])
            else:
                event['avg_rating'] = 0.0

        
        return jsonify({
            'success': True,
            'data': {
                'status_distribution': status_stats,
                'type_distribution': type_stats,
                'department_distribution': dept_stats,
                'attendance': {
                    'total_registrations': total_reg,
                    'total_attendees': total_att,
                    'present_count': attendance_stats.get('present_count', 0) or 0,
                    'late_count': attendance_stats.get('late_count', 0) or 0,
                    'attendance_rate': attendance_rate
                },
                'feedback': {
                    'avg_overall': round(feedback_stats.get('avg_overall', 0) or 0, 1),
                    'avg_venue': round(feedback_stats.get('avg_venue', 0) or 0, 1),
                    'avg_activities': round(feedback_stats.get('avg_activities', 0) or 0, 1),
                    'avg_organization': round(feedback_stats.get('avg_organization', 0) or 0, 1),
                    'total_feedback': feedback_stats.get('total_feedback', 0) or 0,
                    'by_type': feedback_by_type,
                    'per_event': feedback_events
                },
                'budget': {
                    'total': float(budget_stats.get('total_budget', 0) or 0),
                    'average': float(budget_stats.get('avg_budget', 0) or 0),
                    'min': float(budget_stats.get('min_budget', 0) or 0),
                    'max': float(budget_stats.get('max_budget', 0) or 0),
                    'completed': float(budget_stats.get('completed_budget', 0) or 0)
                },
                'trends': {
                    'monthly': monthly_trends,
                    'upcoming_events': upcoming_count.get('count', 0) or 0
                },
                'top_venues': top_venues
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Analytics dashboard error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
