// EquipmentApprovalReview - Interface for reviewing equipment approval adjustments
const { useState, useEffect } = React;

window.EquipmentApprovalReview = function EquipmentApprovalReview({ eventId, onClose }) {
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [originalRequest, setOriginalRequest] = useState([]);
    const [approvedEquipment, setApprovedEquipment] = useState([]);
    const [responding, setResponding] = useState(false);
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactMessage, setContactMessage] = useState('');

    useEffect(() => {
        if (eventId) {
            fetchEventDetails();
        }
    }, [eventId]);

    const fetchEventDetails = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/events/${eventId}`, {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                setEvent(data.event);
                setApprovedEquipment(data.event.equipment || []);
                
                // Try to get original request from event history or notification
                // For now, we'll fetch from notification message
                await fetchOriginalRequest(eventId);
            }
        } catch (error) {
            console.error('Failed to fetch event details:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOriginalRequest = async (evtId) => {
        try {
            // Fetch notification to extract original quantities
            const response = await fetch('/api/notifications', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                const notification = data.notifications.find(n => n.eventId === evtId && n.type === 'equipment_adjusted');
                
                if (notification) {
                    // Parse original quantities from notification message
                    const original = parseOriginalFromNotification(notification.message, approvedEquipment);
                    setOriginalRequest(original);
                }
            }
        } catch (error) {
            console.error('Failed to fetch original request:', error);
        }
    };

    const parseOriginalFromNotification = (message, approved) => {
        // Parse message like "• Projector: 5/12 available" to extract original request
        const original = [];
        const lines = message.split('\n');
        
        lines.forEach(line => {
            const match = line.match(/• (.+): (\d+)\/(\d+) available/);
            if (match) {
                const [, name, approvedQty, requestedQty] = match;
                original.push({
                    name: name.trim(),
                    requestedQty: parseInt(requestedQty),
                    approvedQty: parseInt(approvedQty)
                });
            }
        });

        // Add any approved items that weren't in the adjustment message (fully approved)
        approved.forEach(item => {
            if (!original.find(o => o.name === item.name)) {
                original.push({
                    name: item.name,
                    requestedQty: item.quantity,
                    approvedQty: item.quantity
                });
            }
        });

        return original;
    };

    const handleAccept = async () => {
        setResponding(true);
        try {
            // Mark as acknowledged - update event or create a response record
            const response = await fetch(`/api/events/${eventId}/acknowledge-equipment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'accept',
                    message: 'Event organizer has accepted the adjusted equipment quantities.'
                })
            });

            if (response.ok) {
                alert('Equipment adjustments accepted. Your event will proceed with the approved equipment.');
                // Trigger notification refresh if available
                if (window.refreshNotifications) {
                    window.refreshNotifications();
                }
                if (onClose) onClose();
            } else {
                const errorData = await response.json();
                alert('Failed to acknowledge equipment adjustments: ' + (errorData.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to accept equipment:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setResponding(false);
        }
    };

    const handleRequestAlternatives = () => {
        setShowContactForm(true);
        setContactMessage(`I would like to request alternative equipment for "${event?.name}".

Requested changes:
`);
    };

    const handleContactAdmin = () => {
        setShowContactForm(true);
        setContactMessage(`Regarding the equipment approval for "${event?.name}":

`);
    };

    const handleSendContactMessage = async () => {
        if (!contactMessage.trim()) {
            alert('Please enter a message.');
            return;
        }

        setResponding(true);
        try {
            const response = await fetch(`/api/events/${eventId}/equipment-inquiry`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    action: 'request_alternatives',
                    message: contactMessage
                })
            });

            if (response.ok) {
                alert('Your request has been sent to the admin. You will be notified of their response.');
                setShowContactForm(false);
                if (onClose) onClose();
            } else {
                alert('Failed to send request.');
            }
        } catch (error) {
            console.error('Failed to send request:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setResponding(false);
        }
    };

    const handleCancel = async () => {
        if (!confirm('Are you sure you want to cancel this event due to insufficient equipment?')) {
            return;
        }

        setResponding(true);
        try {
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...event,
                    status: 'Cancelled',
                    cancellation_reason: 'Insufficient equipment available'
                })
            });

            if (response.ok) {
                alert('Event has been cancelled.');
                if (onClose) onClose();
            } else {
                alert('Failed to cancel event.');
            }
        } catch (error) {
            console.error('Failed to cancel event:', error);
            alert('An error occurred. Please try again.');
        } finally {
            setResponding(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading event details...</div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-red-500">Event not found</div>
            </div>
        );
    }

    const getStatusColor = (requested, approved) => {
        if (approved === requested) return 'text-green-600';
        if (approved === 0) return 'text-red-600';
        return 'text-yellow-600';
    };

    const getStatusIcon = (requested, approved) => {
        if (approved === requested) return '✓';
        if (approved === 0) return '✗';
        return '⚠';
    };

    return (
        <div className="bg-white rounded-lg shadow-lg max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">⚠️</span>
                        <div>
                            <h2 className="text-xl font-bold">Equipment Approval Review</h2>
                            <p className="text-sm text-yellow-100">Action required: Review adjusted equipment</p>
                        </div>
                    </div>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="text-white hover:text-yellow-100 text-2xl leading-none"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {/* Event Info */}
            <div className="px-6 py-4 bg-gray-50 border-b">
                <h3 className="font-bold text-lg text-gray-900">{event.name}</h3>
                <p className="text-sm text-gray-600">
                    {new Date(event.start_datetime).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                    })}
                </p>
            </div>

            {/* Main Content */}
            <div className="px-6 py-6">
                {!showContactForm ? (
                    <>
                        {/* Explanation */}
                        <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                            <div className="flex gap-3">
                                <span className="text-2xl">ℹ️</span>
                                <div>
                                    <h4 className="font-semibold text-blue-900 mb-1">Equipment Availability Update</h4>
                                    <p className="text-sm text-blue-800">
                                        Your equipment request has been reviewed. Due to availability constraints, 
                                        some items have been adjusted. Please review the changes below and choose how you'd like to proceed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Equipment Comparison Table */}
                        <div className="mb-6">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span>📋</span>
                                Equipment Comparison
                            </h4>
                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Equipment</th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Requested</th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Approved</th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {originalRequest.length > 0 ? originalRequest.map((item, index) => (
                                            <tr key={index} className={item.approvedQty < item.requestedQty ? 'bg-yellow-50' : ''}>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.name}</td>
                                                <td className="px-4 py-3 text-sm text-center text-gray-700">{item.requestedQty}</td>
                                                <td className="px-4 py-3 text-sm text-center">
                                                    <span className={`font-semibold ${getStatusColor(item.requestedQty, item.approvedQty)}`}>
                                                        {item.approvedQty}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-center">
                                                    <span className={`inline-flex items-center gap-1 ${getStatusColor(item.requestedQty, item.approvedQty)}`}>
                                                        {getStatusIcon(item.requestedQty, item.approvedQty)}
                                                        {item.approvedQty === item.requestedQty ? 'Full' : 
                                                         item.approvedQty === 0 ? 'Unavailable' : 'Partial'}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="4" className="px-4 py-6 text-center text-gray-500">
                                                    No equipment adjustments found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mb-4">
                            <h4 className="font-semibold text-gray-900 mb-3">How would you like to proceed?</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button
                                    onClick={handleAccept}
                                    disabled={responding}
                                    className="flex items-center gap-3 p-4 border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
                                >
                                    <span className="text-3xl">✅</span>
                                    <div className="text-left">
                                        <div className="font-semibold text-green-700">Accept & Proceed</div>
                                        <div className="text-xs text-gray-600">Continue with approved equipment</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleRequestAlternatives}
                                    disabled={responding}
                                    className="flex items-center gap-3 p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
                                >
                                    <span className="text-3xl">🔄</span>
                                    <div className="text-left">
                                        <div className="font-semibold text-blue-700">Request Alternatives</div>
                                        <div className="text-xs text-gray-600">Ask for different equipment options</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleContactAdmin}
                                    disabled={responding}
                                    className="flex items-center gap-3 p-4 border-2 border-purple-500 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
                                >
                                    <span className="text-3xl">✉️</span>
                                    <div className="text-left">
                                        <div className="font-semibold text-purple-700">Contact Admin</div>
                                        <div className="text-xs text-gray-600">Discuss options with administrator</div>
                                    </div>
                                </button>

                                <button
                                    onClick={handleCancel}
                                    disabled={responding}
                                    className="flex items-center gap-3 p-4 border-2 border-red-500 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                    <span className="text-3xl">❌</span>
                                    <div className="text-left">
                                        <div className="font-semibold text-red-700">Cancel Event</div>
                                        <div className="text-xs text-gray-600">Event cannot proceed as planned</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Contact Form */
                    <div>
                        <button
                            onClick={() => setShowContactForm(false)}
                            className="mb-4 text-blue-600 hover:text-blue-700 flex items-center gap-2"
                        >
                            ← Back to options
                        </button>
                        
                        <h4 className="font-semibold text-gray-900 mb-3">Send Message to Administrator</h4>
                        <textarea
                            value={contactMessage}
                            onChange={(e) => setContactMessage(e.target.value)}
                            className="w-full border rounded-lg p-3 mb-4 h-40"
                            placeholder="Describe your equipment needs or questions..."
                        />
                        
                        <div className="flex gap-3">
                            <button
                                onClick={handleSendContactMessage}
                                disabled={responding || !contactMessage.trim()}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {responding ? 'Sending...' : 'Send Message'}
                            </button>
                            <button
                                onClick={() => setShowContactForm(false)}
                                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t rounded-b-lg">
                <p className="text-xs text-gray-600">
                    💡 <strong>Tip:</strong> If you're unsure about which option to choose, contact the administrator 
                    to discuss your event requirements and explore available solutions.
                </p>
            </div>
        </div>
    );
};

window.EquipmentApprovalReview = EquipmentApprovalReview;
