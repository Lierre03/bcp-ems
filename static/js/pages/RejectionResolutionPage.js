window.RejectionResolutionPage = function RejectionResolutionPage({ eventId, onBack, onResolveComplete }) {
    const [event, setEvent] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [processing, setProcessing] = React.useState(null); // 'item_name' or 'cancel'

    React.useEffect(() => {
        loadEventDetails();
    }, [eventId]);

    const loadEventDetails = async () => {
        try {
            setLoading(true);
            // Use singular endpoint to get specific event details
            const response = await fetch(`/api/events/${eventId}`);
            const data = await response.json();

            if (data.success && data.event) {
                let evt = data.event;
                // Ensure equipment is parsed if string (double check)
                if (typeof evt.equipment === 'string') {
                    try { evt.equipment = JSON.parse(evt.equipment); } catch (e) { }
                }
                setEvent(evt);
            } else {
                setError('Event not found or failed to load');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (action, itemName = null) => {
        if (action === 'cancel_event' && !confirm('Are you sure you want to withdraw this entire event proposal? This cannot be undone.')) return;
        if (action === 'remove_item' && !confirm(`Remove ${itemName} from your request?`)) return;

        setProcessing(itemName || 'cancel');
        try {
            const res = await fetch(`/api/events/${eventId}/resolve-rejection`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, item_name: itemName })
            });
            const data = await res.json();

            if (data.success) {
                if (data.new_status === 'Approved' || action === 'cancel_event') {
                    // Fully resolved
                    onResolveComplete();
                } else {
                    // Refresh local data
                    loadEventDetails();
                }
            } else {
                alert(data.error || 'Action failed');
            }
        } catch (err) {
            alert('Network error');
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div className="p-10 text-center text-gray-500">Loading event details...</div>;
    if (error) return <div className="p-10 text-center text-red-500">Error: {error} <br /><button onClick={onBack} className="mt-4 text-blue-600 underline">Back to Dashboard</button></div>;
    if (!event) return null;

    const equipment = event.equipment || [];
    const rejectedItems = equipment.filter(e => e.status && e.status.trim().toLowerCase() === 'rejected');

    if (rejectedItems.length === 0) {
        return (
            <div className="max-w-3xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">All Issues Resolved!</h2>
                <p className="text-gray-600 mb-6">There are no rejected items remaining for this event.</p>
                <button onClick={onResolveComplete} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header / Nav */}
            <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 transition mb-4">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Dashboard
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-6 text-white">
                    <h1 className="text-2xl font-bold mb-1">Action Required</h1>
                    <p className="text-red-100 opacity-90">
                        Equipment requests for <span className="font-bold underline">{event.name}</span> were rejected. Please resolve these issues to proceed.
                    </p>
                </div>

                <div className="p-6">
                    <div className="mb-6 bg-red-50 border border-red-100 rounded-lg p-4 text-sm text-red-800">
                        <strong className="block mb-1">What happens now?</strong>
                        Your event is currently <strong>{event.status}</strong>. You must address each rejected item below by either providing it yourself or removing it from the request.
                        Once all items are resolved, your event will automatically be re-evaluated for approval.
                    </div>

                    <div className="space-y-4">
                        {rejectedItems.map((item, idx) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition card-hover">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                                            <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded">Rejected</span>
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            <span className="font-medium">Requested Qty:</span> {item.quantity}
                                        </div>
                                        <div className="mt-2 text-sm bg-gray-50 p-2 rounded border border-gray-100 text-gray-700">
                                            <span className="font-bold text-red-600">Reason:</span> {item.rejection_reason || 'No reason provided'}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 w-48 flex-shrink-0">
                                        <button
                                            disabled={!!processing}
                                            onClick={() => handleAction('self_provide', item.name)}
                                            className="w-full py-2 px-3 bg-white border border-blue-600 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-50 transition flex items-center justify-center gap-2"
                                        >
                                            {processing === item.name ? 'Processing...' : (
                                                <>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                    I'll Provide It
                                                </>
                                            )}
                                        </button>
                                        <button
                                            disabled={!!processing}
                                            onClick={() => handleAction('remove_item', item.name)}
                                            className="w-full py-2 px-3 bg-white border border-gray-300 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition flex items-center justify-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Remove Request
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
                        <div className="text-sm text-gray-500 italic">
                            Can't proceed without these items?
                        </div>
                        <button
                            disabled={!!processing}
                            onClick={() => handleAction('cancel_event')}
                            className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline flex items-center opacity-70 hover:opacity-100 transition"
                        >
                            Withdraw Event Proposal
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
