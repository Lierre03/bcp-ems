# ============================================================================
# VENUES & RESOURCES API
# Manage venues, equipment, and conflict detection
# ============================================================================

from flask import Blueprint, request, jsonify, session
from backend.auth import require_role
from database.db import get_db
from datetime import datetime, timedelta
import logging

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
