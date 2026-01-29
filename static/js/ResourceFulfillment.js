const { useState, useEffect, useMemo } = React;

window.ResourceFulfillment = function ResourceFulfillment() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [activeTab, setActiveTab] = useState('All');
    const [expandedEvents, setExpandedEvents] = useState({});

    // Track which item lists are expanded (Show All vs Show Top 6)
    const [expandedLists, setExpandedLists] = useState({});

    // Track pending reservations: { [eventId]: { [itemName]: reservedQty } }
    const [pendingReservations, setPendingReservations] = useState({});

    // Issuance Modal State Removed - Issuance now handled in Property Custodian System
    
    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await fetch('/api/inventory/fulfillment', { credentials: 'include' });
            const result = await response.json();
            if (result.success) {
                setEvents(result.data);
                if (result.data.length > 0) {
                    setExpandedEvents({ [result.data[0].event_id]: true });
                }
            }
        } catch (error) {
            console.error('Error fetching dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    // --- Computed Stats ---
    const stats = useMemo(() => {
        const activeEvents = events.filter(e => e.event_status !== 'Completed');
        return {
            active: activeEvents.length,
            ready: activeEvents.filter(e => e.status === 'Ready').length,
            shortage: activeEvents.filter(e => e.status !== 'Ready').length,
            completed: events.filter(e => e.event_status === 'Completed').length
        };
    }, [events]);

    const filteredEvents = useMemo(() => {
        if (activeTab === 'Completed') {
            return events.filter(e => e.event_status === 'Completed'); // Only Completed
        }

        // Base: All Non-Completed Events
        const activeBase = events.filter(e => e.event_status !== 'Completed');

        if (activeTab === 'All') return activeBase;
        if (activeTab === 'Ready') return activeBase.filter(e => e.status === 'Ready');
        if (activeTab === 'Shortage') return activeBase.filter(e => e.status !== 'Ready');

        return activeBase;
    }, [events, activeTab]);

    // --- Actions ---

    const toggleReserveItem = (eventId, item) => {
        setPendingReservations(prev => {
            const eventPending = prev[eventId] || {};
            const isSelected = eventPending.hasOwnProperty(item.name);

            if (isSelected) {
                const newPending = { ...eventPending };
                delete newPending[item.name];
                return { ...prev, [eventId]: newPending };
            } else {
                const reservedAlready = item.qty_reserved || 0;
                const effectiveNeeded = Math.max(0, item.qty_needed - reservedAlready);

                if (effectiveNeeded <= 0) return prev;

                const qtyToReserve = Math.min(effectiveNeeded, item.qty_available);
                return {
                    ...prev,
                    [eventId]: {
                        ...eventPending,
                        [item.name]: qtyToReserve
                    }
                };
            }
        });
    };

    const toggleReserveAll = (event) => {
        setPendingReservations(prev => {
            const eventPending = prev[event.event_id] || {};
            // Check if all VALID items (qty available > 0) are selected
            const validItems = event.items.filter(i => i.qty_available > 0);
            const allSelected = validItems.length > 0 && validItems.every(i => eventPending.hasOwnProperty(i.name));

            if (allSelected) {
                const { [event.event_id]: removed, ...rest } = prev;
                return rest;
            } else {
                const newEventPending = {};
                event.items.forEach(item => {
                    const reservedAlready = item.qty_reserved || 0;
                    const effectiveNeeded = Math.max(0, item.qty_needed - reservedAlready);

                    if (effectiveNeeded > 0 && item.qty_available > 0) {
                        const qty = Math.min(effectiveNeeded, item.qty_available);
                        if (qty > 0) newEventPending[item.name] = qty;
                    }
                });
                return { ...prev, [event.event_id]: newEventPending };
            }
        });
    };

    const handleConfirmReservation = async (event, e) => {
        if (e) e.stopPropagation();

        const eventPending = pendingReservations[event.event_id] || {};
        const itemsToReserve = Object.entries(eventPending).map(([name, qty]) => ({ name, qty }));

        if (itemsToReserve.length === 0) {
            alert("No items selected for reservation.");
            return;
        }

        if (!confirm(`Confirm reservation for ${itemsToReserve.length} items?`)) return;

        setProcessingId(event.event_id);

        try {
            const response = await fetch('/api/inventory/reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: event.event_id,
                    title: event.title,
                    items: itemsToReserve
                }),
                credentials: 'include'
            });

            const res = await response.json();
            if (response.ok) {
                alert('Success: ' + res.message);
                setPendingReservations(prev => {
                    const { [event.event_id]: removed, ...rest } = prev;
                    return rest;
                });
                fetchDashboard();
            } else {
                alert('Error: ' + res.message);
            }
        } catch (error) {
            console.error('Reservation error:', error);
            alert('Failed to reserve items');
        } finally {
            setProcessingId(null);
        }
    };



    const toggleExpand = (id) => {
        setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleListExpand = (id) => {
        setExpandedLists(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // --- Render Helpers ---

    const getIconPath = (item) => {
        const cat = (item.category || '').toLowerCase();
        if (cat.includes('it') || cat.includes('tech')) return "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z";
        if (cat.includes('sound') || cat.includes('audio')) return "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z";
        return "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4";
    };

    const StatusBadge = ({ available, needed }) => {
        let status = 'Ready';
        let style = 'bg-emerald-100 text-emerald-700';
        let dot = 'bg-emerald-500';

        if (available === 0) {
            status = 'Unavailable';
            style = 'bg-red-100 text-red-700';
            dot = 'bg-red-500';
        } else if (available < needed) {
            status = 'Shortage';
            style = 'bg-amber-100 text-amber-700';
            dot = 'bg-amber-500';
        }

        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-[100px] justify-center ${style}`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`}></span>
                {status}
            </span>
        );
    };

    const StockListRow = ({ item, eventId, isReadOnly }) => {
        const eventPending = pendingReservations[eventId] || {};
        const reservedQty = eventPending[item.name];
        const isSelected = reservedQty !== undefined;

        const isShortage = item.qty_available < item.qty_needed;
        const isZero = item.qty_available <= 0;

        const reservedAlready = item.qty_reserved || 0;
        const isFulfilled = reservedAlready >= item.qty_needed;
        const maxEffectiveNeeded = Math.max(0, item.qty_needed - reservedAlready);

        // Icon Style: ALWAYS Neutral (Professional)
        let iconBg = "bg-slate-50 text-slate-400";

        // Row Style
        let rowStyle = "bg-white border-slate-100";
        if (isSelected) rowStyle = "bg-indigo-50/10 border-indigo-200 ring-1 ring-indigo-50";

        return (
            <div className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${rowStyle}`}>
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${iconBg}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={getIconPath(item)} /></svg>
                    </div>

                    <div className="min-w-0">
                        <h4 className={`font-bold text-sm mb-0.5 ${isSelected ? 'text-indigo-900' : 'text-slate-800'}`} title={item.name}>{item.name}</h4>
                        <div className="text-xs font-medium flex items-center gap-2">
                            <span className="text-slate-400">
                                {item.category || 'Equipment'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center w-12">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Req</div>
                        <div className="text-sm font-bold text-slate-900">{item.qty_needed}</div>
                    </div>
                    {!isReadOnly && (
                        <>
                            <div className="text-center w-12 border-l border-slate-100">
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Avail</div>
                                <div className="text-sm font-bold text-slate-800">
                                    {item.qty_available}
                                </div>
                            </div>
                            {/* Shortage/Ready/Reserved/Partial Badge */}
                            <div className="pl-2 border-l border-slate-100 w-[110px] flex justify-center hidden md:flex">
                                {isFulfilled ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-[100px] justify-center bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm transition-all animate-in fade-in zoom-in-95">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500"></span>
                                        RESERVED
                                    </span>
                                ) : reservedAlready > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider w-[100px] justify-center bg-amber-50 text-amber-600 border border-amber-100 shadow-sm transition-all animate-in fade-in zoom-in-95">
                                        <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500"></span>
                                        PARTIAL
                                    </span>
                                ) : (
                                    <StatusBadge available={item.qty_available} needed={item.qty_needed} />
                                )}
                            </div>
                        </>
                    )}

                    {/* Selection Button */}
                    <div className="pl-2">
                        {!isReadOnly && !isFulfilled && (
                            <button
                                onClick={() => toggleReserveItem(eventId, item)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-all duration-200 ${isSelected
                                    ? (isZero
                                        ? 'bg-red-500 border-red-500 text-white shadow-md shadow-red-200 hover:bg-red-600' // Unavailable -> Red
                                        : 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700' // Available -> Indigo
                                    )
                                    : 'bg-white border-slate-200 text-slate-300 hover:border-indigo-300 hover:text-indigo-300'
                                    }`}
                                title={isSelected ? "Cancel" : "Select"}
                            >
                                {isSelected ? (
                                    isZero ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg> // X Icon for Rejection
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg> // Check for Success
                                    )
                                ) : (
                                    isZero ? (
                                        // Unavailable Unselected -> Ban/Prohibited Icon
                                        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636" /></svg>
                                    ) : (
                                        // Available Unselected -> Plus Icon
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    )
                                )}
                            </button>
                        )}
                        {isFulfilled && (
                            // Use Neutral Slate/Gray for "Done" state instead of Green
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-100 text-slate-400 border border-slate-200">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const TabButton = ({ label, count, active, onClick }) => (
        <button
            onClick={onClick}
            className={`px-4 py-2 text-sm font-bold rounded-full transition-all border ${active
                ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-105'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
        >
            {label}
            {count !== undefined && <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>}
        </button>
    );

    const StatCard = ({ label, value, type, isActive, onClick }) => {
        let iconBg = "bg-slate-100";
        let iconColor = "text-slate-500";
        if (type === 'pending') { iconBg = "bg-indigo-50"; iconColor = "text-indigo-600"; }
        if (type === 'ready') { iconBg = "bg-emerald-50"; iconColor = "text-emerald-500"; }
        if (type === 'shortage') { iconBg = "bg-red-50"; iconColor = "text-red-500"; }

        return (
            <div
                onClick={onClick}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isActive
                    ? 'bg-white border-indigo-600 shadow-sm ring-1 ring-indigo-600'
                    : 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'}`}
            >
                <div className={`w-10 h-10 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0`}>
                    <span className="text-lg font-bold">{value}</span>
                </div>
                <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight">{label}</h4>
                </div>
            </div>
        );
    };



    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[500px]">
            <div className="w-12 h-12 border-4 border-slate-100 border-t-slate-800 rounded-full animate-spin mb-4"></div>
            <p className="font-medium text-slate-400 text-sm">Loading...</p>
        </div>
    );

    return (
        <div className="max-w-[1200px] mx-auto p-8 font-sans text-slate-900 bg-white min-h-screen">
            <div className="flex items-center justify-end mb-6">
                <button
                    onClick={fetchDashboard}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 shadow-sm text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-xs transition-colors"
                >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    Refresh
                </button>
            </div>

            {/* Stats / Filter Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Active Events"
                    value={stats.active}
                    type="pending"
                    isActive={activeTab === 'All'}
                    onClick={() => setActiveTab('All')}
                />
                <StatCard
                    label="Ready to Fulfill"
                    value={stats.ready}
                    type="ready"
                    isActive={activeTab === 'Ready'}
                    onClick={() => setActiveTab('Ready')}
                />
                <StatCard
                    label="Shortage Alert"
                    value={stats.shortage}
                    type="shortage"
                    isActive={activeTab === 'Shortage'}
                    onClick={() => setActiveTab('Shortage')}
                />

                {/* Completed Tab as a Card for consistency */}
                <div
                    onClick={() => setActiveTab('Completed')}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${activeTab === 'Completed'
                        ? 'bg-white border-slate-900 shadow-sm ring-1 ring-slate-900'
                        : 'bg-slate-50 border-slate-200 shadow-sm opacity-80 hover:opacity-100 hover:border-slate-300'}`}
                >
                    <div className="w-10 h-10 rounded-lg bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold">{stats.completed}</span>
                    </div>
                    <div>
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Completed History</h4>
                    </div>
                </div>
            </div>

            {/* List Header */}
            <div className="flex items-center justify-between mb-6 px-1">
                <h2 className="text-lg font-bold text-slate-900">
                    {activeTab === 'All' && 'All Active Events'}
                    {activeTab === 'Ready' && 'Ready for Fulfillment'}
                    {activeTab === 'Shortage' && 'Events with Shortages'}
                    {activeTab === 'Completed' && 'Completed Event History'}
                </h2>
                <div className="text-sm font-medium text-slate-500">
                    Showing {filteredEvents.length} events
                </div>
            </div>

            {/* Unified Event List */}
            <div className="space-y-6">
                {filteredEvents.length === 0 && (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-medium">No events found in this category.</p>
                    </div>
                )}

                {filteredEvents.map(event => {
                    const isExpanded = expandedEvents[event.event_id];
                    const selectedCount = Object.keys(pendingReservations[event.event_id] || {}).length;
                    const isCompleted = event.event_status === 'Completed';

                    return (
                        <div key={event.event_id} className={`bg-white rounded-2xl border transition-all overflow-hidden ${isCompleted ? 'border-slate-200' : 'border-slate-200 shadow-sm hover:shadow-md'}`}>
                            {/* Card Header */}
                            <div className="p-6 pl-8 flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(event.event_id)}>
                                <div className="flex flex-col gap-1.5">
                                    <h3 className={`text-lg font-bold ${isCompleted ? 'text-slate-600' : 'text-slate-900'}`}>{event.title}</h3>
                                    <div className="flex items-center gap-6 text-sm font-medium text-slate-500">
                                        <span>{new Date(event.start_date).toLocaleDateString()}</span>
                                        <span>{event.items.length} items</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Action Buttons: ONLY for Active Events */}
                                    {!isCompleted && (
                                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                            {(selectedCount > 0) && (
                                                <button
                                                    onClick={(e) => handleConfirmReservation(event, e)}
                                                    disabled={processingId === event.event_id}
                                                    className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
                                                >
                                                    Confirm ({selectedCount})
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {isCompleted && (
                                        <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-slate-200">
                                            Completed
                                        </span>
                                    )}

                                    <div className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Card Content */}
                            {isExpanded && (
                                <div className="transition-all duration-300 ease-in-out bg-white border-t border-slate-100">
                                    <div className="p-8 pt-6">
                                        <div className="flex items-center justify-between mb-4 px-1">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                                Resource Allocation
                                            </h4>

                                            {/* Select All Button: ONLY for Active Events */}
                                            {!isCompleted && (
                                                <button
                                                    onClick={() => toggleReserveAll(event)}
                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                                >
                                                    {Object.keys(pendingReservations[event.event_id] || {}).length > 0
                                                        ? 'Deselect All'
                                                        : 'Select All Available'}
                                                </button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            {event.items.map((item, idx) => (
                                                <StockListRow key={idx} item={item} eventId={event.event_id} isReadOnly={isCompleted} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
