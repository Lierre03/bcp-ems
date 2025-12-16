// ConflictResolutionPanel Component
window.ConflictResolutionPanel = function ConflictResolutionPanel() {
    const [conflicts, setConflicts] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [processingId, setProcessingId] = React.useState(null);
    const [venues, setVenues] = React.useState([]);

    React.useEffect(() => {
        fetchConflicts();
        fetchVenues();
    }, []);

    const fetchConflicts = async () => {
        try {
            const response = await fetch('/api/venues/conflicts');
            const data = await response.json();
            if (data.success) {
                setConflicts(data.conflicts);
            } else {
                setError('Failed to load conflicts');
            }
        } catch (err) {
            setError('Error connecting to server');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchVenues = async () => {
        try {
            const response = await fetch('/api/venues/');
            const data = await response.json();
            if (data.success) {
                setVenues(data.venues);
            }
        } catch (err) {
            console.error("Failed to load venues", err);
        }
    };

    const handleResolve = async (action, eventId, extraData = {}) => {
        if (!confirm(action === 'reject' ? 'Are you sure you want to reject this event?' : 'Change venue for this event?')) return;
        
        setProcessingId(eventId);
        try {
            const response = await fetch('/api/venues/resolve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    event_id: eventId,
                    ...extraData
                })
            });
            
            const data = await response.json();
            if (data.success) {
                // Refresh conflicts
                fetchConflicts();
                alert(data.message);
            } else {
                alert(data.error || 'Failed to resolve conflict');
            }
        } catch (err) {
            console.error(err);
            alert('Error processing request');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-6 md:p-12 text-center text-slate-500">Scanning for conflicts...</div>;
    
    if (conflicts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-12 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-base md:text-lg font-bold text-slate-800">No Conflicts Detected</h3>
                <p className="text-slate-500 text-sm mt-2">All scheduled events are conflict-free.</p>
            </div>
        );
    }

    return (
        <div className="space-y-2 md:space-y-3">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                            Found {conflicts.length} scheduling conflict{conflicts.length !== 1 ? 's' : ''}. 
                            Please resolve them by rejecting an event or changing its venue.
                        </p>
                    </div>
                </div>
            </div>

            {conflicts.map((conflict, idx) => (
                <div key={idx} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="text-red-500">⚠ Conflict at {conflict.venue}</span>
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${conflict.severity === 'High' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                            {conflict.severity} Severity
                        </span>
                    </div>
                    
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 relative">
                        {/* Vertical divider line */}
                        <div className="hidden md:block absolute left-1/2 top-6 bottom-6 w-px bg-slate-200"></div>

                        {/* Event 1 */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg text-slate-800">{conflict.event1.name}</h4>
                                    <p className="text-sm text-slate-500">by {conflict.event1.requestor}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    conflict.event1.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {conflict.event1.status}
                                </span>
                            </div>
                            
                            <div className="text-sm text-slate-600 space-y-1">
                                <p>📅 {new Date(conflict.event1.start).toLocaleDateString()}</p>
                                <p>⏰ {new Date(conflict.event1.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(conflict.event1.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                <p>🏷️ {conflict.event1.type}</p>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <button 
                                    onClick={() => handleResolve('reject', conflict.event1.id)}
                                    disabled={processingId === conflict.event1.id}
                                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium transition"
                                >
                                    Reject
                                </button>
                                <select 
                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
                                    onChange={(e) => {
                                        if(e.target.value) handleResolve('change_venue', conflict.event1.id, { new_venue: e.target.value });
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Move to...</option>
                                    {venues.filter(v => v.name !== conflict.venue).map(v => (
                                        <option key={v.id} value={v.name}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Event 2 */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg text-slate-800">{conflict.event2.name}</h4>
                                    <p className="text-sm text-slate-500">by {conflict.event2.requestor}</p>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    conflict.event2.status === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                    {conflict.event2.status}
                                </span>
                            </div>
                            
                            <div className="text-sm text-slate-600 space-y-1">
                                <p>📅 {new Date(conflict.event2.start).toLocaleDateString()}</p>
                                <p>⏰ {new Date(conflict.event2.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(conflict.event2.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                <p>🏷️ {conflict.event2.type}</p>
                            </div>

                            <div className="pt-4 flex gap-2">
                                <button 
                                    onClick={() => handleResolve('reject', conflict.event2.id)}
                                    disabled={processingId === conflict.event2.id}
                                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium transition"
                                >
                                    Reject
                                </button>
                                <select 
                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-sm"
                                    onChange={(e) => {
                                        if(e.target.value) handleResolve('change_venue', conflict.event2.id, { new_venue: e.target.value });
                                    }}
                                    defaultValue=""
                                >
                                    <option value="" disabled>Move to...</option>
                                    {venues.filter(v => v.name !== conflict.venue).map(v => (
                                        <option key={v.id} value={v.name}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};
