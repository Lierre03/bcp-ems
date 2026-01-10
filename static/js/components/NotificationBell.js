// Notification Bell Component
// Displays notifications with bell icon and dropdown panel
// Refactored to use Tailwind CSS with Premium UI Design

const NotificationBell = () => {
    const [notifications, setNotifications] = React.useState([]);
    const [unreadCount, setUnreadCount] = React.useState(0);
    const [isOpen, setIsOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [filterUnread, setFilterUnread] = React.useState(false);
    const [withdrawalModal, setWithdrawalModal] = React.useState({ isOpen: false, data: null, loading: false });
    const dropdownRef = React.useRef(null);

    // Fetch notifications
    const fetchNotifications = React.useCallback(async () => {
        try {
            // Loading state only on initial load to avoid flickering
            if (notifications.length === 0 && !loading) setLoading(true);

            // Prevent fetch if user is not logged in (Stop 401 loop)
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                setLoading(false);
                return;
            }

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

    // Helper: Icons & Styles
    const getNotificationContext = (type) => {
        switch (type) {
            case 'equipment_adjusted':
                return {
                    icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    ),
                    bg: 'bg-amber-50 text-amber-600',
                    border: 'border-amber-100',
                    dot: 'bg-amber-500',
                    button: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 shadow-amber-200'
                };
            case 'venue_conflict':
            case 'conflict_rejection':
                return {
                    icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ),
                    bg: 'bg-red-50 text-red-600',
                    border: 'border-red-100',
                    dot: 'bg-red-500',
                    button: 'bg-red-600 hover:bg-red-700 active:bg-red-800 shadow-red-200'
                };
            case 'status_update':
                return {
                    icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    ),
                    bg: 'bg-blue-50 text-blue-600',
                    border: 'border-blue-100',
                    dot: 'bg-blue-500',
                    button: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-200'
                };
            default:
                return {
                    icon: (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    ),
                    bg: 'bg-indigo-50 text-indigo-600',
                    border: 'border-indigo-100',
                    dot: 'bg-indigo-500',
                    button: 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-indigo-200'
                };
        }
    };

    // Helper: Parse Rich Content
    const parseNotificationContent = (text) => {
        if (!text) return null;

        // Replace literal \n strings with actual newlines
        text = text.replace(/\\n/g, '\n').replace(/\\/g, '');
        const lines = text.split('\n');
        const elements = [];
        let currentSection = null;
        let lineIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];

            // Remove emoji prefixes
            line = line.replace(/^[✅❌⚠️📋🎯]+\s*/g, '');

            // Replace "Qty:" with "Quantity:"
            line = line.replace(/\(Qty:\s*(\d+)\)/g, '(Quantity: $1)');

            // Check if it's a section header (APPROVED:, REJECTED:, etc.)
            const headerMatch = line.match(/^(APPROVED|REJECTED|PARTIALLY APPROVED):?$/i);
            if (headerMatch) {
                currentSection = headerMatch[1].toUpperCase();
                continue;
            }

            // Check for equipment list items: "- ItemName (Quantity: X)"
            const equipmentMatch = line.match(/^-\s*(.+?)\s*\(Quantity:\s*(\d+)\)/);
            if (equipmentMatch && currentSection) {
                const [, itemName, quantity] = equipmentMatch;
                const status = currentSection;

                let statusClass = 'bg-slate-100 text-slate-700 border-slate-200';
                let bgClass = 'bg-slate-50 border-slate-200';
                let icon = null;

                if (status === 'APPROVED') {
                    statusClass = 'bg-blue-100 text-blue-800 border-blue-200';
                    bgClass = 'bg-blue-50 border-blue-200';
                    icon = (
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    );
                } else if (status === 'REJECTED') {
                    statusClass = 'bg-red-100 text-red-800 border-red-200';
                    bgClass = 'bg-red-50 border-red-200';
                    icon = (
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    );
                } else if (status === 'PARTIALLY APPROVED') {
                    statusClass = 'bg-amber-100 text-amber-800 border-amber-200';
                    bgClass = 'bg-amber-50 border-amber-200';
                    icon = (
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    );
                }

                elements.push(
                    <div key={lineIndex++} className={`rounded-lg border p-3 mb-2 ${bgClass}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{itemName}</p>
                                <p className="text-xs text-gray-600 mt-0.5">Quantity: {quantity}</p>
                            </div>
                            <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusClass}`}>
                                {icon}
                                {status === 'APPROVED' ? 'Approved' :
                                    status === 'REJECTED' ? 'Rejected' :
                                        'Partial'}
                            </span>
                        </div>
                    </div>
                );
                continue;
            }

            // Check for rejected items with reason: "- ItemName (Reason)" under REJECTED section
            const rejectedReasonMatch = line.match(/^-\s*(.+?)\s*\(([^)]+)\)$/);
            if (rejectedReasonMatch && currentSection === 'REJECTED') {
                const [, itemName, reason] = rejectedReasonMatch;

                elements.push(
                    <div key={lineIndex++} className="rounded-lg border border-red-200 p-3 mb-2 bg-red-50">
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{itemName}</p>
                            </div>
                            <span className="flex items-center px-2.5 py-1 rounded-full text-xs font-bold border bg-red-100 text-red-800 border-red-200">
                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                Rejected
                            </span>
                        </div>
                        <div className="mt-2 text-xs text-red-700 bg-white/50 p-2 rounded border border-red-200/50">
                            <span className="font-medium">Reason:</span> {reason}
                        </div>
                    </div>
                );
                continue;
            }

            // Check for old format: "- Item Name: Status (Reason)"
            const itemMatch = line.match(/^- (.*?): (Approved|Rejected|Partially Approved)(?: \((.*)\))?/);
            if (itemMatch) {
                const [, itemName, status, reason] = itemMatch;
                let statusClass = 'bg-slate-100 text-slate-700 border-slate-200';
                let bgClass = 'bg-slate-50 border-slate-200';
                let icon = null;

                if (status === 'Approved') {
                    statusClass = 'bg-blue-100 text-blue-800 border-blue-200';
                    bgClass = 'bg-blue-50 border-blue-200';
                    icon = (
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    );
                } else if (status === 'Rejected') {
                    statusClass = 'bg-red-100 text-red-800 border-red-200';
                    bgClass = 'bg-red-50 border-red-200';
                    icon = (
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    );
                } else if (status === 'Partially Approved') {
                    statusClass = 'bg-amber-100 text-amber-800 border-amber-200';
                    bgClass = 'bg-amber-50 border-amber-200';
                    icon = (
                        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    );
                }

                const cleanReason = reason ? reason.replace(/^Reason:\s*/i, '') : '';

                elements.push(
                    <div key={lineIndex++} className={`rounded-lg border p-3 mb-2 ${bgClass}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <p className="font-semibold text-gray-900 text-sm">{itemName}</p>
                            </div>
                            <span className={`flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${statusClass}`}>
                                {icon}
                                {status}
                            </span>
                        </div>
                        {cleanReason && (
                            <div className="mt-2 text-xs text-gray-600 bg-white/50 p-2 rounded border border-gray-200/50">
                                <span className="font-medium">Note:</span> {cleanReason}
                            </div>
                        )}
                    </div>
                );
                continue;
            }

            // Regular text lines (summary, headings, etc.)
            if (line.trim() === '') {
                elements.push(<div key={lineIndex++} className="h-2"></div>);
            } else {
                elements.push(
                    <p key={lineIndex++} className="mb-2 text-slate-600 text-sm leading-relaxed">
                        {line}
                    </p>
                );
            }
        }

        return elements;
    };

    // Notification Detail Modal Component
    const NotificationDetailModal = ({ notification, onClose, onAction }) => {
        if (!notification) return null;

        const style = getNotificationContext(notification.type);
        const formattedDate = new Date(notification.created_at || notification.createdAt).toLocaleString(undefined, {
            dateStyle: 'full',
            timeStyle: 'short'
        });

        return (
            <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                ></div>

                {/* Modal Content */}
                <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 flex flex-col max-h-[90vh] animate-scale-in">

                    {/* Header */}
                    <div className={`px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 rounded-t-2xl ${style.button.split(' ')[0]}`}>
                        <div className="flex gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/20 backdrop-blur-sm shadow-sm text-white`}>
                                {style.icon}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white leading-snug">
                                    {notification.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 text-sm text-white/80 font-medium">
                                    <span>{formattedDate}</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                            {/* Dynamic Content Parsing */}
                            <div className="text-slate-700">
                                {parseNotificationContent(notification.message)}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3 rounded-b-2xl">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Dismiss
                        </button>
                        {/* Only show View Details for actionable notifications (not equipment review/withdrawal) */}
                        {(notification.eventId || notification.link) &&
                            !notification.title.toLowerCase().includes('review complete') &&
                            !notification.title.toLowerCase().includes('withdrawn') && (
                                <button
                                    onClick={() => onAction(notification)}
                                    className={`px-5 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all flex items-center gap-2 ${style.button}`}
                                >
                                    <span>{notification.type === 'conflict_rejection' ? 'Reschedule' : 'View Details'}</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            )}
                    </div>
                </div>
            </div>
        );
    };

    const [selectedNotification, setSelectedNotification] = React.useState(null);

    // Handle notification click - Opens Modal or Direct Action
    const handleNotificationClick = (notification) => {
        // Mark as read immediately when opening
        if (!notification.isRead) {
            markAsRead(notification.id);
        }

        // Close dropdown
        setIsOpen(false);

        // DIRECT ACTION: For withdrawal notifications, skip intermediate modal
        if (notification.title && notification.title.toLowerCase().includes('withdrawn') && notification.eventId) {
            fetchWithdrawalInfo(notification.eventId);
            return;
        }

        // For all other notifications, open the intermediate modal
        setSelectedNotification(notification);
    };

    // Fetch Withdrawal Info
    const fetchWithdrawalInfo = async (eventId) => {
        setWithdrawalModal({ isOpen: true, data: null, loading: true });
        try {
            const response = await fetch(`/api/events/${eventId}`);
            const data = await response.json();
            if (data.success && data.event) {
                setWithdrawalModal({ isOpen: true, data: data.event, loading: false });
            } else {
                setWithdrawalModal({ isOpen: true, data: null, loading: false });
            }
        } catch (error) {
            console.error('Error fetching withdrawal info:', error);
            setWithdrawalModal({ isOpen: true, data: null, loading: false });
        }
    };

    // Handle Modal Action (Redirect)
    const handleModalAction = (notification) => {
        setSelectedNotification(null);

        // Check if it's a withdrawal notification - show modal instead of routing
        if (notification.title && notification.title.toLowerCase().includes('withdrawn') && notification.eventId) {
            fetchWithdrawalInfo(notification.eventId);
            return;
        }

        // Context-aware routing
        if (notification.type === 'conflict_rejection' && notification.eventId) {
            sessionStorage.setItem('rescheduleEventId', notification.eventId);
            window.location.hash = `#/reschedule/${notification.eventId}`;
        } else if ((notification.type === 'equipment_adjusted' || (notification.title && notification.title.includes('Adjustment'))) && notification.eventId) {
            window.location.hash = `#/resolve-rejection/${notification.eventId}`;
        } else if (notification.eventId && window.openEventForReview) {
            window.openEventForReview(notification.eventId);
        } else if (notification.type === 'status_update' && notification.title.toLowerCase().includes('priority update') && notification.eventId) {
            window.location.hash = `#/resolve-rejection/${notification.eventId}`;
        } else if (notification.eventId) {
            // Fallback for students/other roles
            // Use sessionStorage for generic deep linking if needed by student.html (standard view)
            sessionStorage.setItem('openEventId', notification.eventId);
            window.location.hash = `#/my-events`;
        }
    };

    const displayedNotifications = filterUnread
        ? notifications.filter(n => !n.isRead)
        : notifications;

    // Withdrawal Info Modal Component
    const WithdrawalInfoModal = () => {
        if (!withdrawalModal.isOpen) return null;

        const event = withdrawalModal.data;
        const rejectedEquipment = event?.equipment?.filter(e => e.status && e.status.toLowerCase() === 'rejected') || [];

        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={() => setWithdrawalModal({ isOpen: false, data: null, loading: false })}>
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-500 to-gray-600 px-6 py-4 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Event Withdrawal Details
                        </h2>
                        <button onClick={() => setWithdrawalModal({ isOpen: false, data: null, loading: false })} className="text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {withdrawalModal.loading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto"></div>
                                <p className="mt-4 text-gray-500">Loading details...</p>
                            </div>
                        ) : event ? (
                            <div className="space-y-4">
                                {/* Event Name */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Event Name</label>
                                    <p className="text-lg font-bold text-gray-900">{event.name}</p>
                                </div>

                                {/* Requestor */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Withdrawn By</label>
                                    <p className="text-gray-800">{event.requestor_name || 'Unknown'}</p>
                                </div>

                                {/* Timestamp */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Withdrawn On</label>
                                    <p className="text-gray-800">{event.updated_at ? new Date(event.updated_at).toLocaleString() : 'N/A'}</p>
                                </div>

                                {/* Rejected Equipment */}
                                {rejectedEquipment.length > 0 && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Rejected Equipment (Reason for Withdrawal)</label>
                                        <div className="space-y-2">
                                            {rejectedEquipment.map((item, idx) => (
                                                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-red-900">{item.name}</p>
                                                            <p className="text-sm text-red-700">Qty: {item.quantity}</p>
                                                        </div>
                                                    </div>
                                                    {item.rejection_reason && (
                                                        <p className="text-xs text-red-600 mt-2 italic">Reason: {item.rejection_reason}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Info Message */}
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <p className="text-sm text-gray-700">
                                        <span className="font-semibold">Note:</span> This event was withdrawn by the requestor due to inability to provide the required equipment.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <p className="text-red-600">Failed to load event details.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                        <button onClick={() => setWithdrawalModal({ isOpen: false, data: null, loading: false })} className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-full transition-all duration-300 ${isOpen ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                title="Notifications"
            >
                <div className={`w-6 h-6 flex items-center justify-center transition-transform ${isOpen ? 'scale-110' : ''}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 grid min-h-[18px] min-w-[18px] translate-x-1/4 -translate-y-1/4 place-items-center rounded-full bg-red-500 py-0.5 px-1.5 text-[10px] font-bold leading-none text-white border-2 border-white shadow-sm ring-1 ring-black/5">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel - Glassmorphism & Animation */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-3 w-[400px] bg-white/95 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-xl shadow-slate-200/50 z-[1000] overflow-hidden origin-top-right animate-fade-in-down ring-1 ring-black/5">

                    {/* Header */}
                    <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center sticky top-0 backdrop-blur-md z-10">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-800 text-sm tracking-tight">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                                    {unreadCount} New
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setFilterUnread(!filterUnread)}
                                className={`text-xs px-2.5 py-1 rounded-md transition-all font-medium border ${filterUnread
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                                    : 'text-slate-500 border-transparent hover:bg-slate-100'
                                    }`}
                            >
                                {filterUnread ? 'Unread' : 'All Updates'}
                            </button>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                                >
                                    Mark all read
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {loading && notifications.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <svg className="animate-spin h-8 w-8 mx-auto text-indigo-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="text-sm font-medium">Checking for updates...</p>
                            </div>
                        ) : displayedNotifications.length === 0 ? (
                            <div className="py-16 px-8 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner border border-slate-100">
                                    📭
                                </div>
                                <h4 className="text-slate-800 font-semibold mb-1">All caught up!</h4>
                                <p className="text-sm text-slate-500">No {filterUnread ? 'unread' : ''} notifications to display.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {displayedNotifications.map(notification => {
                                    const style = getNotificationContext(notification.type);
                                    return (
                                        <div
                                            key={notification.id}
                                            onClick={() => handleNotificationClick(notification)}
                                            className={`group px-5 py-4 cursor-pointer transition-all hover:bg-slate-50 relative ${!notification.isRead ? 'bg-indigo-50/30' : 'bg-white'
                                                }`}
                                        >
                                            <div className="flex gap-4">
                                                {/* Icon Container */}
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bg} ${!notification.isRead ? 'shadow-md shadow-indigo-100' : ''} group-hover:scale-105 transition-transform duration-300`}>
                                                    {style.icon}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <div className="flex justify-between items-start gap-3 mb-1">
                                                        <p className={`text-sm leading-tight ${!notification.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                                                            }`}>
                                                            {notification.title}
                                                        </p>
                                                        {!notification.isRead && (
                                                            <div className={`w-2 h-2 rounded-full ${style.dot} flex-shrink-0 mt-1.5 shadow-sm animate-pulse`}></div>
                                                        )}
                                                    </div>

                                                    <p className={`text-xs leading-relaxed mb-2 line-clamp-2 ${!notification.isRead ? 'text-slate-700' : 'text-slate-500'}`}>
                                                        {notification.message.replace(/\\n/g, ' ').replace(/\n/g, ' ')}
                                                    </p>

                                                    {/* Meta Info */}
                                                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                                                        <span className="flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {formatTimeAgo(notification.created_at || notification.createdAt)}
                                                            {/* Handle both casing from DB vs JS convention */}
                                                        </span>
                                                        {notification.eventName && (
                                                            <>
                                                                <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                                <span className="text-indigo-500 truncate max-w-[150px]">
                                                                    {notification.eventName}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Left accent border for unread */}
                                            {!notification.isRead && (
                                                <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r ${style.dot.replace('bg-', 'bg-')}`}></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm text-center">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium w-full py-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Render Detail Modal */}
            {selectedNotification && (
                <NotificationDetailModal
                    notification={selectedNotification}
                    onClose={() => setSelectedNotification(null)}
                    onAction={handleModalAction}
                />
            )}

            {/* Withdrawal Info Modal */}
            <WithdrawalInfoModal />
        </div>
    );
};

window.NotificationBell = NotificationBell;

