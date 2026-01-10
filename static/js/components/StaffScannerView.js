
window.StaffScannerView = function StaffScannerView() {
    const [activeView, setActiveView] = React.useState('list'); // 'list' or 'scanner'
    const [selectedEventId, setSelectedEventId] = React.useState(null);
    const [events, setEvents] = React.useState([]);
    const [loadingEvents, setLoadingEvents] = React.useState(true);
    const QRScanner = window.QRScanner;

    React.useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            const res = await fetch('/api/events?status=Approved', { credentials: 'include' });
            const data = await res.json();
            if (data.success) {
                setEvents(data.events || []);
            }
        } catch (error) {
            console.error('Error loading events:', error);
        } finally {
            setLoadingEvents(false);
        }
    };

    const handleEventSelect = (eventId) => {
        setSelectedEventId(eventId);
        setActiveView('scanner');
    };

    const handleBack = () => {
        setSelectedEventId(null);
        setActiveView('list');
    };

    if (activeView === 'scanner') {
        return (
            <div>
                <button
                    onClick={handleBack}
                    className="mb-4 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Event Selection
                </button>
                <QRScanner eventId={selectedEventId} />
            </div>
        );
    }

    return (
        <div>
            <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Event for Attendance</h2>
                <p className="text-gray-600 mb-6">Choose an event to start scanning QR codes for attendance check-in.</p>

                {/* Camera Requirements Notice */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-yellow-900 mb-2">📷 Camera Requirements</h4>
                    <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• Camera access is required for QR scanning</li>
                        <li>• Allow camera permissions when prompted</li>
                        <li>• Use HTTPS connection for camera access</li>
                        <li>• Use Manual Check-in as backup if camera fails</li>
                    </ul>
                </div>

                {/* Event Selection */}
                <div className="grid gap-4">
                    {loadingEvents ? (
                        <div className="text-center py-8 text-gray-500">Loading events...</div>
                    ) : events.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No approved events available for attendance tracking.</div>
                    ) : (
                        events.map(event => {
                            const eventStart = new Date(`${event.date}T${event.startTime || '00:00'}`);
                            const now = new Date();
                            // Logic from staff.html: isUpcoming = eventStart > now
                            // But usually we want to scan for current events too. 
                            // The logic in staff.html: `const isUpcoming = eventStart > now;`
                            // And `onClick={() => !isUpcoming && ...}`
                            // This implies we CANNOT scan for upcoming events? Only past/current?
                            // Wait, if it's strictly > now, then we can only scan once it starts.
                            // That seems strict but I will copy it faithfully for now.
                            // Actually, let's relax it slightly or allow 'Today' events.
                            // But for parity, I will stick to the existing logic:
                            const isUpcoming = eventStart > now;
                            // Wait, if I created an event for today at 2pm, and it is 1pm, I can't scan?
                            // Maybe that's intended. Scan starts at start time.

                            return (
                                <div key={event.id}
                                    className={`border border-gray-200 rounded-lg p-4 transition ${isUpcoming ? 'opacity-75 bg-gray-50 cursor-not-allowed' : 'hover:border-blue-300 cursor-pointer bg-white'}`}
                                    onClick={() => !isUpcoming && handleEventSelect(event.id)}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{event.name}</h3>
                                            <p className="text-sm text-gray-600">
                                                {new Date(event.date).toLocaleDateString()} • {event.venue}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Status: {event.approval_status || event.status} • Expected: {event.attendees || event.expected_attendees || 'N/A'}
                                            </p>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${isUpcoming ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                            {isUpcoming ? 'Upcoming' : 'Available'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
