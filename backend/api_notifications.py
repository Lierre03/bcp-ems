"""
Notifications API Blueprint
Handles in-system notifications for equipment adjustments and other events
"""

from flask import Blueprint, jsonify, request, session
from database.db import get_db
from backend.auth import require_role
import logging

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')


@notifications_bp.route('', methods=['GET'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Student', 'Participant', 'Student Organization Officer'])
def get_notifications():
    """Get notifications for current user"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        # Optional pagination
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        offset = (page - 1) * per_page
        
        # Optional filter by read/unread
        filter_read = request.args.get('unread_only', 'false').lower() == 'true'
        
        db = get_db()
        
        # Build query
        where_clause = "WHERE n.user_id = %s"
        params = [user_id]
        
        if filter_read:
            where_clause += " AND n.is_read = 0"
        
        # Get notifications with event details
        query = f"""
            SELECT 
                n.id,
                n.event_id,
                n.type,
                n.title,
                n.message,
                n.is_read,
                n.created_at,
                e.name as event_name,
                e.start_datetime as event_date
            FROM notifications n
            LEFT JOIN events e ON n.event_id = e.id
            {where_clause}
            ORDER BY n.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([per_page, offset])
        
        notifications = db.execute_query(query, tuple(params))
        
        # Get total count and unread count
        count_query = f"""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread
            FROM notifications
            WHERE user_id = %s
        """
        counts = db.execute_one(count_query, (user_id,))
        
        # Format notifications
        formatted_notifications = []
        for notif in notifications:
            formatted_notifications.append({
                'id': notif['id'],
                'eventId': notif['event_id'],
                'eventName': notif['event_name'],
                'eventDate': notif['event_date'].isoformat() if notif.get('event_date') else None,
                'type': notif['type'],
                'title': notif['title'],
                'message': notif['message'],
                'isRead': bool(notif['is_read']),
                'createdAt': notif['created_at'].isoformat()
            })
        
        return jsonify({
            'success': True,
            'notifications': formatted_notifications,
            'total': counts['total'],
            'unread': counts['unread'],
            'page': page,
            'perPage': per_page
        })
        
    except Exception as e:
        logger.error(f"Get notifications error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@notifications_bp.route('/<int:notification_id>/mark-read', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Student', 'Participant', 'Student Organization Officer'])
def mark_notification_read(notification_id):
    """Mark a notification as read"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        db = get_db()
        
        # Verify notification belongs to user
        notification = db.execute_one(
            "SELECT id FROM notifications WHERE id = %s AND user_id = %s",
            (notification_id, user_id)
        )
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Mark as read
        db.execute_update(
            "UPDATE notifications SET is_read = 1 WHERE id = %s",
            (notification_id,)
        )
        
        return jsonify({'success': True, 'message': 'Notification marked as read'})
        
    except Exception as e:
        logger.error(f"Mark read error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@notifications_bp.route('/mark-all-read', methods=['POST'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Student', 'Participant', 'Student Organization Officer'])
def mark_all_read():
    """Mark all notifications as read for current user"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        db = get_db()
        
        db.execute_update(
            "UPDATE notifications SET is_read = 1 WHERE user_id = %s AND is_read = 0",
            (user_id,)
        )
        
        return jsonify({'success': True, 'message': 'All notifications marked as read'})
        
    except Exception as e:
        logger.error(f"Mark all read error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@notifications_bp.route('/<int:notification_id>', methods=['DELETE'])
@require_role(['Super Admin', 'Admin', 'Staff', 'Student', 'Participant', 'Student Organization Officer'])
def delete_notification(notification_id):
    """Delete a notification"""
    try:
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Not authenticated'}), 401
        
        db = get_db()
        
        # Verify notification belongs to user
        notification = db.execute_one(
            "SELECT id FROM notifications WHERE id = %s AND user_id = %s",
            (notification_id, user_id)
        )
        
        if not notification:
            return jsonify({'error': 'Notification not found'}), 404
        
        # Delete notification
        db.execute_update(
            "DELETE FROM notifications WHERE id = %s",
            (notification_id,)
        )
        
        return jsonify({'success': True, 'message': 'Notification deleted'})
        
    except Exception as e:
        logger.error(f"Delete notification error: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
