
// InventoryCalendar Component - For Property Custodians to view reservations and issue items
window.InventoryCalendar = function InventoryCalendar() {
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [selectedEvent, setSelectedEvent] = React.useState(null); // For manifest modal
    const [manifest, setManifest] = React.useState([]);
    const [manifestLoading, setManifestLoading] = React.useState(false);
    const [issueProcessing, setIssueProcessing] = React.useState(false);

    // Fetch calendar data on mount or date change
    React.useEffect(() => {
        fetchEvents();
    }, [currentDate]);

    const fetchEvents = () => {
        setLoading(true);
        fetch('/api/inventory/calendar')
            .then(res => res.json())
            .then(data => {
                if (data.success) setEvents(data.events);
                setLoading(false);
            })
            .catch(err => {
                console.error('Failed to load inventory calendar', err);
                setLoading(false);
            });
    };

    // Calendar Logic helpers
    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(currentDate);
    const daysArray = [...Array(days).keys()].map(i => i + 1);
    const emptyDays = [...Array(firstDay).keys()];

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const getEventsForDay = (day) => {
        return events.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate.getDate() === day &&
                eventDate.getMonth() === currentDate.getMonth() &&
                eventDate.getFullYear() === currentDate.getFullYear();
        });
    };

    const handleEventClick = (event, e) => {
        e.stopPropagation();
        setSelectedEvent(event);
        loadManifest(event.id);
    };

    const loadManifest = (eventId) => {
        setManifestLoading(true);
        fetch(`/api/inventory/manifest/${eventId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) setManifest(data.manifest);
                setManifestLoading(false);
            })
            .catch(err => {
                console.error(err);
                setManifestLoading(false);
            });
    };

    const handleIssueItems = () => {
        if (!selectedEvent || issueProcessing) return;

        if (!confirm(`Are you sure you want to ISSUE ${selectedEvent.item_count} items for "${selectedEvent.title}"?\n\nThis will mark them as 'In-Use' in the Property System.`)) return;

        setIssueProcessing(true);

        fetch('/api/inventory/issue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: selectedEvent.id,
                title: selectedEvent.title
            })
        })
            .then(res => res.json())
            .then(data => {
                setIssueProcessing(false);
                if (data.success) {
                    alert("Items Issued Successfully!");
                    setSelectedEvent(null);
                    fetchEvents(); // Refresh calendar status
                } else {
                    alert("Failed: " + data.message);
                }
            })
            .catch(err => {
                setIssueProcessing(false);
                alert("Error issuing items: " + err);
            });
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Inventory Logistics Calendar
                </h2>
                <div className="flex bg-slate-800 rounded-lg p-1">
                    <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-700 rounded transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="px-3 flex items-center font-semibold text-sm">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                    <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-700 rounded transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
                {loading ? <div className="text-center p-10 text-slate-500">Loading...</div> : (
                    <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                        {/* Headers */}
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase">
                                {d}
                            </div>
                        ))}
                        {/* Empty */}
                        {emptyDays.map(i => <div key={`e-${i}`} className="bg-white min-h-[100px]"></div>)}
                        {/* Days */}
                        {daysArray.map(day => {
                            const dayEvents = getEventsForDay(day);
                            const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                            return (
                                <div key={day} className={`bg-white min-h-[100px] p-2 hover:bg-slate-50 transition border-t border-l border-slate-100 ${isToday ? 'bg-blue-50/30' : ''}`}>
                                    <div className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{day}</div>
                                    <div className="space-y-1">
                                        {dayEvents.map(ev => (
                                            <div
                                                key={ev.id}
                                                onClick={(e) => handleEventClick(ev, e)}
                                                className={`text-[10px] px-2 py-1.5 rounded border cursor-pointer hover:opacity-80 transition shadow-sm ${ev.colorClass}`}
                                            >
                                                <div className="font-bold truncate">{ev.title}</div>
                                                <div className="flex justify-between mt-0.5">
                                                    <span>{ev.item_count} Assets</span>
                                                    <span className="uppercase text-[9px] opacity-75">{ev.status}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Manifest Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{selectedEvent.title}</h3>
                                <p className="text-sm text-slate-500">
                                    {new Date(selectedEvent.start).toLocaleDateString()} at {selectedEvent.venue}
                                </p>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">Item Manifest</h4>

                            {manifestLoading ? (
                                <div className="text-center py-10 text-slate-400">Loading items...</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                                        <tr>
                                            <th className="px-3 py-2 rounded-l">Item Name</th>
                                            <th className="px-3 py-2">Category</th>
                                            <th className="px-3 py-2">Property Tag</th>
                                            <th className="px-3 py-2 rounded-r">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {manifest.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 text-slate-700">
                                                <td className="px-3 py-2 font-medium">{item.item_name}</td>
                                                <td className="px-3 py-2 text-slate-500">{item.category}</td>
                                                <td className="px-3 py-2 font-mono text-xs">{item.property_tag}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${item.status === 'Issued' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                        {manifest.length === 0 && <tr><td colSpan="4" className="text-center py-4">No items found</td></tr>}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-xl">
                            <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded font-medium text-sm transition">
                                Close
                            </button>
                            {selectedEvent.status !== 'Issued' && manifest.length > 0 && (
                                <button
                                    onClick={handleIssueItems}
                                    disabled={issueProcessing}
                                    className={`px-6 py-2 bg-green-600 text-white rounded font-bold shadow-sm hover:shadow-lg hover:bg-green-700 transition flex items-center gap-2 ${issueProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {issueProcessing ? 'Processing...' : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                            CONFIRM ISSUANCE
                                        </>
                                    )}
                                </button>
                            )}
                            {selectedEvent.status === 'Issued' && (
                                <div className="px-4 py-2 bg-slate-100 text-slate-500 rounded border border-slate-200 text-sm font-medium flex items-center gap-2 cursor-not-allowed">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Already Issued
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
