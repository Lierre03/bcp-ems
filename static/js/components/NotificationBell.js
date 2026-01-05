// Notification Bell Component
// Displays notifications with bell icon and dropdown panel
// Refactored to use Tailwind CSS

const NotificationBell = () => {
    const [notifications, setNotifications] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [isOpen, setIsOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [filterUnread, setFilterUnread] = React.useState(false);
    const dropdownRef = React.useRef(null);

    // Fetch notifications
    const fetchNotifications = React.useCallback(async () => {
        try {
            setLoading(true);
            // Always fetch all to manage filtering client-side for smoother UI
            const response = await fetch('/api/notifications?per_page=50');
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
    }, []);

    // Mark notification as read
    const markAsRead = async (notificationId, e) => {
        if (e) e.stopPropagation();
        try {
            const response = await fetch(`/api/notifications/${notificationId}/mark-read`, {
                method: 'POST'
            });

            if (response.ok) {
                setNotifications(prev =>
                    prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
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
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
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

        setIsOpen(false);

        // Context-aware routing
        if (notification.type === 'conflict_rejection' && notification.eventId) {
            sessionStorage.setItem('rescheduleEventId', notification.eventId);
            window.location.hash = `#/reschedule/${notification.eventId}`;
        } else if (notification.type === 'equipment_adjusted' && notification.eventId && window.openEquipmentReview) {
            window.openEquipmentReview(notification.eventId);
        } else if (notification.eventId && window.openEventForReview) {
            window.openEventForReview(notification.eventId);
        }
    };

    // Outside click handler
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Polling setup
    React.useEffect(() => {
        fetchNotifications();
        window.refreshNotifications = fetchNotifications;
        const interval = setInterval(fetchNotifications, 30000);
        return () => {
            clearInterval(interval);
            delete window.refreshNotifications;
        };
    }, [fetchNotifications]);

    // Helper: Time Ago
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

    // Helper: Icons
    const getNotificationContext = (type) => {
        switch (type) {
            case 'equipment_adjusted':
                return { icon: '⚙️', bg: 'bg-amber-100 text-amber-600', border: 'border-amber-200' };
            case 'venue_conflict':
                return { icon: '⚠️', bg: 'bg-red-100 text-red-600', border: 'border-red-200' };
            case 'status_update':
                return { icon: '📋', bg: 'bg-blue-100 text-blue-600', border: 'border-blue-200' };
            default:
                return { icon: '📢', bg: 'bg-slate-100 text-slate-600', border: 'border-slate-200' };
        }
    };

    const displayedNotifications = filterUnread
        ? notifications.filter(n => !n.isRead)
        : notifications;

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
            >
                <div className="w-6 h-6 flex items-center justify-center text-xl">
                    🔔
                </div>
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] border-2 border-white shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-96 bg-white border border-slate-200 rounded-xl shadow-2xl z-[1000] overflow-hidden animate-fade-in-down origin-top-right">

                    {/* Header */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-blue-100 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setFilterUnread(!filterUnread)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${filterUnread ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-200'}`}
                                title="Toggle Unread Filter"
                            >
                                {filterUnread ? 'Unread Only' : 'All'}
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                        {loading ? (
                            <div className="p-8 text-center text-slate-500">
                                <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2"></div>
                                <p className="text-xs">Loading updates...</p>
                            </div>
                        ) : displayedNotifications.length === 0 ? (
                            <div className="p-10 text-center text-slate-400">
                                <div className="text-4xl mb-2 opacity-50">🔕</div>
                                <p className="text-sm font-medium">No {filterUnread ? 'unread' : ''} notifications</p>
                            </div>
                        ) : (
                            displayedNotifications.map(notification => {
                                const style = getNotificationContext(notification.type);
                                return (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 relative group ${!notification.isRead ? 'bg-blue-50/50' : 'bg-white'}`}
                                    >
                                        <div className="flex gap-3">
                                            {/* Icon */}
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${style.bg} ${!notification.isRead ? 'ring-2 ring-white shadow-sm' : ''}`}>
                                                {style.icon}
                                            </div>

                                            {/* Text */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start gap-2">
                                                    <p className={`text-sm mb-0.5 ${!notification.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                        {notification.title}
                                                    </p>
                                                    {!notification.isRead && (
                                                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" title="Unread"></span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 leading-snug line-clamp-2 mb-1.5">
                                                    {notification.message}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                    <span>{formatTimeAgo(notification.createdAt)}</span>
                                                    {notification.eventName && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="font-medium text-slate-500">{notification.eventName}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 border-t border-slate-100 bg-slate-50 text-center">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium w-full py-1"
                        >
                            Close Panel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

window.NotificationBell = NotificationBell;

