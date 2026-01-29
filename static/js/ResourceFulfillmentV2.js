const { useState, useEffect, useMemo } = React;

window.ResourceFulfillmentV2 = function ResourceFulfillmentV2() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [activeTab, setActiveTab] = useState('All');
    const [expandedEvents, setExpandedEvents] = useState({});
    
    // Track pending reservations: { [eventId]: { [itemName]: reservedQty } }
    const [pendingReservations, setPendingReservations] = useState({});

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const response = await fetch('/api/inventory/fulfillment', { credentials: 'include' });
            const result = await response.json();
            if (result.success) {
                setEvents(result.data);
                // Auto-expand first event if available
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
            return events.filter(e => e.event_status === 'Completed');
        }

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

    const toggleSelectAll = (eventId, items, e) => {
        if (e) e.stopPropagation();

        setPendingReservations(prev => {
            const eventPending = prev[eventId] || {};
            
            // Filter items that CAN be selected (not fulfilled, available > 0)
            const selectableItems = items.filter(item => {
                const reservedAlready = item.qty_reserved || 0;
                const effectiveNeeded = Math.max(0, item.qty_needed - reservedAlready);
                return effectiveNeeded > 0 && item.qty_available > 0;
            });

            if (selectableItems.length === 0) return prev;

            // Check if all selectable items are currently selected
            const allSelected = selectableItems.every(item => eventPending.hasOwnProperty(item.name));

            if (allSelected) {
                // Deselect All
                const newPending = { ...prev };
                delete newPending[eventId];
                return newPending;
            } else {
                // Select All
                const newEventPending = { ...eventPending };
                selectableItems.forEach(item => {
                    const reservedAlready = item.qty_reserved || 0;
                    const effectiveNeeded = Math.max(0, item.qty_needed - reservedAlready);
                    const qtyToReserve = Math.min(effectiveNeeded, item.qty_available);
                    newEventPending[item.name] = qtyToReserve;
                });

                return {
                    ...prev,
                    [eventId]: newEventPending
                };
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

    const getCategoryIcon = (category) => {
        const cat = (category || '').toLowerCase();
        if (cat.includes('sound') || cat.includes('mic') || cat.includes('speaker')) {
          return React.createElement('svg', { className: "w-6 h-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" })
          );
        }
        if (cat.includes('it') || cat.includes('tech') || cat.includes('projector') || cat.includes('laptop')) {
          return React.createElement('svg', { className: "w-6 h-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" })
          );
        }
        if (cat.includes('furniture') || cat.includes('chair') || cat.includes('table')) {
          return React.createElement('svg', { className: "w-6 h-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" })
          );
        }
        return React.createElement('svg', { className: "w-6 h-6", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
          React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" })
        );
    };

    if (loading) return React.createElement('div', { className: "p-8 text-center text-slate-500" }, "Loading dashboard...");

    return React.createElement('div', { className: "p-6 space-y-6 max-w-[1600px] mx-auto" },
        
        // Header & Stats
        React.createElement('div', { className: "flex flex-col gap-6 mb-8" },
            
            React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-4 gap-4" },
                // Active Events
                React.createElement('div', { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm" },
                    React.createElement('div', { className: "flex items-center justify-between mb-2" },
                        React.createElement('span', { className: "text-slate-500 font-medium text-sm" }, "Active Events"),
                        React.createElement('div', { className: "w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600" },
                            React.createElement('svg', { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" })
                            )
                        )
                    ),
                    React.createElement('div', { className: "text-2xl font-bold text-slate-900" }, stats.active)
                ),
                // Ready to Fulfill
                React.createElement('div', { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm" },
                    React.createElement('div', { className: "flex items-center justify-between mb-2" },
                        React.createElement('span', { className: "text-slate-500 font-medium text-sm" }, "Ready to Fulfill"),
                        React.createElement('div', { className: "w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600" },
                            React.createElement('svg', { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" })
                            )
                        )
                    ),
                    React.createElement('div', { className: "text-2xl font-bold text-slate-900" }, stats.ready)
                ),
                // Shortage/Issue
                React.createElement('div', { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm" },
                    React.createElement('div', { className: "flex items-center justify-between mb-2" },
                        React.createElement('span', { className: "text-slate-500 font-medium text-sm" }, "Shortages"),
                        React.createElement('div', { className: "w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600" },
                            React.createElement('svg', { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" })
                            )
                        )
                    ),
                    React.createElement('div', { className: "text-2xl font-bold text-slate-900" }, stats.shortage)
                ),
                // Completed
                React.createElement('div', { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm" },
                    React.createElement('div', { className: "flex items-center justify-between mb-2" },
                        React.createElement('span', { className: "text-slate-500 font-medium text-sm" }, "Completed"),
                        React.createElement('div', { className: "w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600" },
                            React.createElement('svg', { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" })
                            )
                        )
                    ),
                    React.createElement('div', { className: "text-2xl font-bold text-slate-900" }, stats.completed)
                )
            )
        ),

        // Tabs
        React.createElement('div', { className: "flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit" },
            ['All', 'Ready', 'Shortage', 'Completed'].map(tab => {
                const isActive = activeTab === tab;
                const count = tab === 'All' ? activeTab !== 'Completed' ? stats.active : events.filter(e => e.event_status !== 'Completed').length
                    : tab === 'Ready' ? stats.ready
                    : tab === 'Shortage' ? stats.shortage
                    : stats.completed;

                return React.createElement('button', {
                    key: tab,
                    onClick: () => setActiveTab(tab),
                    className: `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`
                },
                    tab,
                    React.createElement('span', {
                        className: `px-2 py-0.5 rounded-full text-xs ${
                            isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-600'
                        }`
                    }, count)
                );
            })
        ),

        // Event List
        React.createElement('div', { className: "space-y-6" },
            filteredEvents.length === 0 ? React.createElement('div', { className: "text-center py-12 text-slate-400" }, "No events found.") :
            filteredEvents.map(event => {
                const isExpanded = expandedEvents[event.event_id];
                const eventPending = pendingReservations[event.event_id] || {};
                const selectedCount = Object.keys(eventPending).length;

                // Logic for Select All
                const selectableItems = event.items.filter(item => {
                    const reservedAlready = item.qty_reserved || 0;
                    const effectiveNeeded = Math.max(0, item.qty_needed - reservedAlready);
                    return effectiveNeeded > 0 && item.qty_available > 0;
                });
                const hasSelectable = selectableItems.length > 0;
                const allSelected = hasSelectable && selectableItems.every(item => eventPending.hasOwnProperty(item.name));

                return React.createElement('div', {
                    key: event.event_id,
                    className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
                },
                    // Header
                    React.createElement('div', { className: "p-6" },
                        React.createElement('div', { className: "flex items-start justify-between mb-4" },
                            React.createElement('div', null,
                                React.createElement('h3', { className: "text-lg font-semibold text-slate-900 leading-tight" }, event.title),
                                React.createElement('div', { className: "flex items-center gap-4 mt-2 text-sm text-slate-500" },
                                    React.createElement('span', { className: "flex items-center gap-1.5" },
                                        React.createElement('svg', { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" })
                                        ),
                                        // Simple date formatting
                                        `${new Date().toLocaleDateString()} — Event #${event.event_id}`
                                    ),
                                    React.createElement('span', { className: "flex items-center gap-1.5" },
                                        React.createElement('svg', { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                            React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" })
                                        ),
                                        event.organizer || event.requestor_name || event.requestor_username || 'Unknown Organizer'
                                    )
                                )
                            ),
                            React.createElement('span', {
                                className: `px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg uppercase tracking-wider`
                            }, event.status || 'Pending')
                        )
                    ),

                    // Equipment Section Header (Expand Toggle)
                    React.createElement('div', { 
                        className: "border-t border-slate-100 px-6 py-4 bg-slate-50/50 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors",
                        onClick: () => toggleExpand(event.event_id)
                    },
                        React.createElement('div', { className: "flex items-center gap-3" },
                            React.createElement('div', { className: "w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm" },
                                React.createElement('svg', { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" })
                                )
                            ),
                            React.createElement('div', null,
                                React.createElement('p', { className: "font-medium text-slate-900" }, `Equipment Items (${event.items.length})`),
                                React.createElement('p', { className: "text-xs text-slate-500" }, isExpanded ? "Click to collapse" : "Click to view equipment details")
                            )
                        ),
                        React.createElement('div', { className: "flex items-center gap-4" },
                            // Select/Deselect All Button
                            isExpanded && hasSelectable && React.createElement('button', {
                                onClick: (e) => toggleSelectAll(event.event_id, event.items, e),
                                className: `text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                                    allSelected 
                                    ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800' 
                                    : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 hover:text-indigo-800'
                                }`
                            }, allSelected ? "Deselect All" : "Select All"),

                            // Action Button (Confirm Reservation) - Visible ONLY when items are selected AND Expanded
                            isExpanded && selectedCount > 0 && React.createElement('button', {
                                onClick: (e) => handleConfirmReservation(event, e),
                                className: "flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            },
                                React.createElement('svg', { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                    React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" })
                                ),
                                `Reserve ${selectedCount} Item${selectedCount !== 1 ? 's' : ''}`
                            ),
                            React.createElement('svg', { 
                                className: `w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`, 
                                fill: "none", 
                                viewBox: "0 0 24 24", 
                                stroke: "currentColor" 
                            },
                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M19 9l-7 7-7-7" })
                            )
                        )
                    ),

                    // Equipment Grid - The Requested V2 Feature
                    isExpanded && React.createElement('div', { className: "p-6 bg-slate-50 border-t border-slate-100" },
                        React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },
                            event.items.map((item, idx) => {
                                const eventPending = pendingReservations[event.event_id] || {};
                                const reservedQty = eventPending[item.name];
                                const isSelected = reservedQty !== undefined;
                                
                                const reservedAlready = item.qty_reserved || 0;
                                const isFulfilled = reservedAlready >= item.qty_needed;
                                const isUnavailable = item.qty_available <= 0;
                                const isShortage = item.qty_available < item.qty_needed;
                                
                                return React.createElement('div', {
                                    key: item.name + idx,
                                    className: `grid grid-cols-12 gap-2 items-center p-4 rounded-xl border transition-all ${
                                        isSelected ? 'bg-indigo-50 border-indigo-200 ring-1 ring-indigo-200 shadow-sm' : 
                                        isFulfilled ? 'bg-gray-50 border-gray-200' :
                                        isUnavailable ? 'bg-red-50 border-red-100 shadow-sm' : // Added shadow-sm here
                                        'bg-white border-slate-200 shadow-sm'
                                    }`
                                },
                                    // Col 1: Details (4 cols)
                                    React.createElement('div', { className: "col-span-4 flex items-center gap-3 min-w-0" },
                                        React.createElement('div', { 
                                            className: `w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center border ${
                                                isFulfilled ? 'bg-white border-gray-200 text-gray-400' :
                                                isUnavailable ? 'bg-white border-red-100 text-red-500' :
                                                isSelected ? 'bg-white border-indigo-100 text-indigo-500' :
                                                'bg-slate-50 border-slate-100 text-slate-500'
                                            }`
                                        }, getCategoryIcon(item.category)),
                                        React.createElement('div', { className: "min-w-0 truncate" },
                                            React.createElement('h4', { className: "font-bold text-slate-800 text-sm truncate" }, item.name),
                                            React.createElement('span', { className: "mt-0.5 text-[11px] font-medium text-slate-500 block truncate" }, 
                                                item.category || 'Equipment'
                                            )
                                        )
                                    ),
                                    
                                    // Col 2: Requested (2 cols)
                                    React.createElement('div', { className: "col-span-2 text-center flex flex-col justify-center" },
                                        React.createElement('span', { className: "text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5" }, "Req"),
                                        React.createElement('span', { className: "font-bold text-sm text-slate-900" }, item.qty_needed)
                                    ),

                                    // Col 3: Available (2 cols)
                                    React.createElement('div', { className: "col-span-2 text-center flex flex-col justify-center" },
                                        React.createElement('span', { className: "text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5" }, "Avail"),
                                        React.createElement('span', { className: `px-1.5 py-0.5 rounded text-sm font-bold inline-block mx-auto ${
                                            isUnavailable ? 'text-red-500 bg-red-50' : 
                                            isShortage ? 'text-amber-600 bg-amber-50' :
                                            'text-emerald-600 bg-emerald-50'
                                        }` }, item.qty_available)
                                    ),

                                    // Col 4: Status Badge (2 cols) - New Position
                                    React.createElement('div', { className: "col-span-2 flex justify-center items-center" },
                                        isUnavailable ? React.createElement('span', { className: "text-[9px] bg-red-100 text-red-700 px-2 py-1 rounded uppercase font-bold tracking-wider" }, "Unavailable") :
                                        isShortage ? React.createElement('span', { className: "text-[9px] bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase font-bold tracking-wider" }, "Shortage") :
                                        React.createElement('span', { className: "text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase font-bold tracking-wider" }, "Ready")
                                    ),
                                    
                                    // Col 5: Action (2 cols)
                                    React.createElement('div', { className: "col-span-2 flex justify-end" },
                                        event.event_status === 'Completed' ? 
                                        React.createElement('span', { className: "text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100" }, 
                                            "Done"
                                        ) :
                                        !isFulfilled ? React.createElement('button', {
                                            onClick: () => !isUnavailable && toggleReserveItem(event.event_id, item),
                                            disabled: isUnavailable, 
                                            title: isUnavailable ? "Out of Stock" : isSelected ? "Undo Selection" : "Reserve Item",
                                            className: `w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                                                isUnavailable ? 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed' :
                                                isSelected ? 'bg-indigo-600 border-indigo-600 text-white transform scale-105 shadow-sm' :
                                                'bg-white border-slate-300 text-slate-300 hover:border-indigo-500 hover:text-indigo-500'
                                            }`
                                        },
                                            isUnavailable ? React.createElement('svg', { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) // X Icon
                                            ) :
                                            isSelected ? React.createElement('svg', { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor" },
                                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" })
                                            ) :
                                            React.createElement('svg', { className: "w-4 h-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 3 },
                                                React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 13l4 4L19 7" })
                                            )
                                        ) : React.createElement('span', { className: "text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100" }, 
                                            "Reserved"
                                        )
                                    )
                                );
                            })
                        )
                    )
                );
            })
        )
    );
};
