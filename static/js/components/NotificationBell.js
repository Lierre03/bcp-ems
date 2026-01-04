// Notification Bell Component
// Displays notifications with bell icon and dropdown panel

const NotificationBell = () => {
    const [notifications, setNotifications] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [isOpen, setIsOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const dropdownRef = React.useRef(null);

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/notifications');
            const data = await response.json();
            
            if (data.success) {
                setNotifications(data.notifications || []);
                setUnreadCount(data.unread || 0);
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    // Mark notification as read
    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/mark-read`, {
                method: 'POST'
            });
            
            if (response.ok) {
                // Update local state
                setNotifications(prev => 
                    prev.map(n => n.id === notificationId ? {...n, isRead: true} : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            const response = await fetch('/api/notifications/mark-all-read', {
                method: 'POST'
            });
            
            if (response.ok) {
                setNotifications(prev => prev.map(n => ({...n, isRead: true})));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    };

    // Handle notification click
    const handleNotificationClick = (notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        
        // Close the dropdown
        setIsOpen(false);
        
        // Route based on notification type
        if (notification.type === 'conflict_rejection' && notification.eventId) {
            // For conflict rejections, navigate to dedicated reschedule page
            sessionStorage.setItem('rescheduleEventId', notification.eventId);
            window.location.hash = `#/reschedule/${notification.eventId}`;
        } else if (notification.type === 'equipment_adjusted' && notification.eventId && window.openEquipmentReview) {
            // For equipment adjustments, open the dedicated review interface
            window.openEquipmentReview(notification.eventId);
        } else if (notification.eventId && window.openEventForReview) {
            // For other notifications, open the event details
            window.openEventForReview(notification.eventId);
        }
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Fetch notifications on mount and set up polling
    React.useEffect(() => {
        fetchNotifications();
        
        // Expose refresh function globally
        window.refreshNotifications = fetchNotifications;
        
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000);
        
        return () => {
            clearInterval(interval);
            delete window.refreshNotifications;
        };
    }, []);

    // Format time ago
    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        switch(type) {
            case 'equipment_adjusted':
                return '⚙️';
            case 'venue_conflict':
                return '⚠️';
            case 'status_update':
                return '📋';
            default:
                return '📢';
        }
    };

    return (
        <div className="notification-bell-container" ref={dropdownRef} style={{position: 'relative'}}>
            {/* Bell Icon Button */}
            <button 
                className="notification-bell-btn"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    fontSize: '24px',
                    color: '#333'
                }}
            >
                🔔
                {unreadCount > 0 && (
                    <span 
                        className="notification-badge"
                        style={{
                            position: 'absolute',
                            top: '2px',
                            right: '2px',
                            background: '#dc3545',
                            color: 'white',
                            borderRadius: '10px',
                            padding: '2px 6px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            minWidth: '18px',
                            textAlign: 'center'
                        }}
                    >
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div 
                    className="notification-dropdown"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        marginTop: '8px',
                        width: '360px',
                        maxHeight: '500px',
                        background: 'white',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 1000,
                        overflow: 'hidden'
                    }}
                >
                    {/* Header */}
                    <div 
                        className="notification-header"
                        style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #eee',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: '#f8f9fa'
                        }}
                    >
                        <h3 style={{margin: 0, fontSize: '16px', fontWeight: 600}}>
                            Notifications {unreadCount > 0 && `(${unreadCount})`}
                        </h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#007bff',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    padding: '4px 8px'
                                }}
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div 
                        className="notification-list"
                        style={{
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}
                    >
                        {loading ? (
                            <div style={{padding: '20px', textAlign: 'center', color: '#666'}}>
                                Loading...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{padding: '40px 20px', textAlign: 'center', color: '#999'}}>
                                <div style={{fontSize: '48px', marginBottom: '12px'}}>🔕</div>
                                <p style={{margin: 0}}>No notifications</p>
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className="notification-item"
                                    onClick={() => handleNotificationClick(notification)}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f0f0f0',
                                        cursor: 'pointer',
                                        background: notification.isRead ? 'white' : '#f0f7ff',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#e8f4ff'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = notification.isRead ? 'white' : '#f0f7ff'}
                                >
                                    <div style={{display: 'flex', gap: '12px'}}>
                                        <div style={{fontSize: '24px', flexShrink: 0}}>
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div style={{flex: 1, minWidth: 0}}>
                                            <div style={{
                                                fontWeight: notification.isRead ? 'normal' : 'bold',
                                                fontSize: '14px',
                                                marginBottom: '4px',
                                                color: '#333'
                                            }}>
                                                {notification.title}
                                            </div>
                                            <div style={{
                                                fontSize: '13px',
                                                color: '#666',
                                                marginBottom: '6px',
                                                whiteSpace: 'pre-line',
                                                wordBreak: 'break-word'
                                            }}>
                                                {notification.message}
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#999',
                                                display: 'flex',
                                                gap: '8px',
                                                alignItems: 'center'
                                            }}>
                                                <span>{formatTimeAgo(notification.createdAt)}</span>
                                                {notification.eventName && (
                                                    <>
                                                        <span>•</span>
                                                        <span>{notification.eventName}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {!notification.isRead && (
                                            <div style={{
                                                width: '8px',
                                                height: '8px',
                                                borderRadius: '50%',
                                                background: '#007bff',
                                                flexShrink: 0,
                                                marginTop: '6px'
                                            }}></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div 
                            className="notification-footer"
                            style={{
                                padding: '12px 16px',
                                borderTop: '1px solid #eee',
                                textAlign: 'center',
                                background: '#f8f9fa'
                            }}
                        >
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#007bff',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    padding: '4px 8px'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

window.NotificationBell = NotificationBell;
