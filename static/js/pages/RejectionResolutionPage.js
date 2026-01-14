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
            const response = await fetch(`/api/events/${eventId}`);
            const data = await response.json();

            if (data.success && data.event) {
                let evt = data.event;
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
        // For partial acceptance, no extra confirm needed usually, but good to be safe? maybe not.

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
                    onResolveComplete();
                } else {
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

    // Categorize items
    const approvedItems = [];
    const partialItems = [];
    const rejectedItems = [];

    equipment.forEach(item => {
        const status = (item.status || 'Pending').trim();
        const requested = parseInt(item.requested || item.quantity || item.qty || 0);
        const approved = parseInt(item.approved_quantity !== undefined ? item.approved_quantity : requested);

        if (status === 'Rejected') {
            rejectedItems.push({ ...item, requested, approved });
        } else if (status === 'Approved') {
            if (approved < requested) {
                partialItems.push({ ...item, requested, approved });
            } else {
                approvedItems.push({ ...item, requested, approved });
            }
        }
        // pending items ignored in this view? or shown as approved? 
        // usually this view is for 'Action Required', implying review is done.
    });

    const hasIssues = rejectedItems.length > 0 || partialItems.length > 0;

    if (!hasIssues) {
        return (
            <div className="max-w-3xl mx-auto mt-10 p-8 bg-white rounded-xl shadow-lg text-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">All Issues Resolved!</h2>
                <p className="text-gray-600 mb-6">There are no rejected or partially approved items requiring attention.</p>
                <button onClick={onResolveComplete} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                    Return to Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <button onClick={onBack} className="flex items-center text-gray-500 hover:text-gray-800 transition mb-4">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                Back to Dashboard
            </button>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-600 to-red-600 px-6 py-6 text-white">
                    <h1 className="text-2xl font-bold mb-1">Equipment Status Update</h1>
                    <p className="text-red-100 opacity-90">
                        Some adjustments were made to your equipment requests for <span className="font-bold underline">{event.name}</span>. Please review below.
                    </p>
                </div>

                <div className="p-6 space-y-8">

                    {/* Approved Items Section (Read Only) */}
                    {approvedItems.length > 0 && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                                <span className="w-2 h-6 bg-green-500 rounded-full mr-2"></span>
                                Approved Items
                            </h3>
                            <div className="space-y-3">
                                {approvedItems.map((item, idx) => (
                                    <div key={idx} className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-blue-900">{item.name}</span>
                                            <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">Approved</span>
                                        </div>
                                        <div className="text-sm font-medium text-blue-800">
                                            Quantity: {item.approved}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Required Section */}
                    {(partialItems.length > 0 || rejectedItems.length > 0) && (
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                                <span className="w-2 h-6 bg-red-500 rounded-full mr-2"></span>
                                Action Required
                            </h3>
                            <div className="space-y-4">

                                {/* Partially Approved Items */}
                                {partialItems.map((item, idx) => (
                                    <div key={`partial-${idx}`} className="bg-white border border-amber-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-lg text-gray-900">{item.name}</h4>
                                                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2 py-0.5 rounded border border-amber-200">Partially Approved</span>
                                                </div>
                                                <div className="text-sm text-gray-600">
                                                    You requested <strong className="text-gray-900">{item.requested}</strong>, but only <strong className="text-amber-700">{item.approved}</strong> are available.
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                                <button
                                                    disabled={!!processing}
                                                    onClick={() => handleAction('accept_partial', item.name)}
                                                    className="px-4 py-2 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg font-medium text-sm hover:bg-amber-200 transition"
                                                >
                                                    Accept {item.approved} Units
                                                </button>
                                                <button
                                                    disabled={!!processing}
                                                    onClick={() => handleAction('self_provide', item.name)}
                                                    className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium text-sm hover:bg-blue-50 transition"
                                                >
                                                    I'll Provide All {item.requested}
                                                </button>
                                                <button
                                                    disabled={!!processing}
                                                    onClick={() => handleAction('remove_item', item.name)}
                                                    className="px-4 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg font-medium text-sm hover:text-red-600 hover:border-red-200 transition"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Rejected Items */}
                                {rejectedItems.map((item, idx) => (
                                    <div key={`rejected-${idx}`} className="bg-white border border-red-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-bold text-lg text-gray-900">{item.name}</h4>
                                                    <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-0.5 rounded border border-red-200">Rejected</span>
                                                </div>
                                                <div className="text-sm text-gray-600 mb-1">
                                                    Requested Quantity: {item.requested}
                                                </div>
                                                <div className="text-sm bg-red-50 text-red-800 px-3 py-1.5 rounded inline-block">
                                                    <strong>Reason:</strong> {item.rejection_reason || 'Unavailable'}
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                                <button
                                                    disabled={!!processing}
                                                    onClick={() => handleAction('self_provide', item.name)}
                                                    className="px-4 py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium text-sm hover:bg-blue-50 transition"
                                                >
                                                    I'll Provide It
                                                </button>
                                                <button
                                                    disabled={!!processing}
                                                    onClick={() => handleAction('remove_item', item.name)}
                                                    className="px-4 py-2 bg-white text-gray-500 border border-gray-200 rounded-lg font-medium text-sm hover:text-red-600 hover:border-red-200 transition"
                                                >
                                                    Remove Request
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
