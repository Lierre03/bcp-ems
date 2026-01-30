// VenueApprovals.js - Venue Approval page based on StaffEquipmentApprovals
// Exact copy of logic but focused on Venue Approvals

const { useState, useEffect } = React;

const VenueApprovals = () => {
    // ------------------------------------------------
    // STATE
    // ------------------------------------------------
    const [activeTab, setActiveTab] = useState('All');
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        total: 0,
        upcoming: 0
    });
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
    const [rejectionModal, setRejectionModal] = useState({ isOpen: false, eventId: null });

    // ------------------------------------------------
    // EFFECTS
    // ------------------------------------------------
    useEffect(() => {
        fetchRequests();
    }, []);

    // ------------------------------------------------
    // API CALLS
    // ------------------------------------------------
    const fetchRequests = async () => {
        try {
            // Using existing endpoint that returns all requests including venue status
            const response = await fetch('/api/venues/requests');
            const data = await response.json();
            if (data.success) {
                // We keep all requests, but UI will focus on venue status
                setRequests(data.requests);
                
                // Recalculate stats specifically for Venue if needed, or use reported stats
                // The API provides general stats. Let's recalculate for venue specific if needed.
                // For now, using API stats as they are 'requests' stats.
                // But let's refine stats for Venues only in UI logic if required.
                // The provided stats object seems global for the endpoint.
                setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (eventId, action, reason = null) => {
        try {
            console.log(`Updating venue for event ${eventId} to status: ${action}`);

            const payload = {
                status: action,
                type: 'venue', // Hardcoded to venue
                reason: reason
            };

            const response = await fetch(`/api/venues/requests/${eventId}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setModal({ isOpen: true, type: 'success', title: 'Success', message: data.message });
                fetchRequests(); // Refresh list
            } else {
                setModal({ isOpen: true, type: 'error', title: 'Error', message: data.error || 'Failed to update status' });
            }
        } catch (error) {
            console.error('Exception in handleAction:', error);
            setModal({ isOpen: true, type: 'error', title: 'Error', message: 'An error occurred while processing your request' });
        }
    };

    // ------------------------------------------------
    // HELPERS
    // ------------------------------------------------
    const openRejectionModal = (eventId) => {
        setRejectionModal({ isOpen: true, eventId });
    };

    // Filter Logic: Venue Specific
    const filteredRequests = requests.filter(req => {
        // We only care about requests that HAVE a venue
        if (!req.venue) return false;

        if (activeTab === 'All') return true;
        if (activeTab === 'Pending') return req.venue_approval_status === 'Pending';
        if (activeTab === 'Approved') return req.venue_approval_status === 'Approved';
        if (activeTab === 'Rejected') return req.venue_approval_status === 'Rejected';
        return true;
    });

    // ------------------------------------------------
    // ICONS (Consistent with EquipmentApprovals)
    // ------------------------------------------------
    const getClockIcon = () => React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }));
    const getCheckCircleIcon = () => React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' }));
    const getBoxIcon = () => React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' })); // Building icon for Venue
    const getCalendarIcon = () => React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }));

    if (loading) return React.createElement('div', { className: "p-8 text-center" }, "Loading...");

    // ------------------------------------------------
    // RENDER
    // ------------------------------------------------
    return (
        React.createElement('div', { className: "p-6 max-w-7xl mx-auto" },
            // Stat Cards - Reusing StatCard component logic inline or from window if available
            // Assuming StatCard is not global, recreating simple structure
            React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" },
                React.createElement(StatCard, { icon: getClockIcon(), bg: "bg-orange-500", label: "Pending Venue", value: requests.filter(r => r.venue && r.venue_approval_status === 'Pending').length, sub: "Awaiting review" }),
                React.createElement(StatCard, { icon: getCheckCircleIcon(), bg: "bg-emerald-500", label: "Approved", value: requests.filter(r => r.venue && r.venue_approval_status === 'Approved').length, sub: "This week" }),
                React.createElement(StatCard, { icon: getBoxIcon(), bg: "bg-indigo-500", label: "Venue Requests", value: requests.filter(r => r.venue).length, sub: "Total" }),
                React.createElement(StatCard, { icon: getCalendarIcon(), bg: "bg-purple-500", label: "Upcoming Events", value: stats.upcoming, sub: "Next 7 days" })
            ),

            // Tabs
            React.createElement('div', { className: "bg-white rounded-lg border border-slate-200 p-1 mb-6 inline-flex" },
                ['All', 'Pending', 'Approved', 'Rejected'].map(tab => {
                    let count = 0;
                    if (tab === 'All') count = requests.filter(r => r.venue).length;
                    else count = requests.filter(r => r.venue && r.venue_approval_status === tab).length;

                    return React.createElement('button', {
                        key: tab,
                        onClick: () => setActiveTab(tab),
                        className: `px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`
                    },
                        tab,
                        React.createElement('span', { className: `ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}` }, count)
                    );
                })
            ),

            // Request List
            React.createElement('div', { className: "space-y-4" },
                filteredRequests.length === 0 && React.createElement('div', { className: "text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200" }, "No venue requests found."),
                
                filteredRequests.map(request =>
                    React.createElement('div', { key: request.id, className: "bg-white rounded-lg border-2 border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md" },
                        // Conflict Banner
                        request.has_conflict && React.createElement('div', { className: "bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2" },
                            React.createElement('svg', { className: "w-5 h-5 text-amber-600 flex-shrink-0", fill: 'currentColor', viewBox: '0 0 20 20' },
                                React.createElement('path', { fillRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z', clipRule: 'evenodd' })
                            ),
                            React.createElement('div', { className: "flex-1" },
                                React.createElement('span', { className: "text-amber-900 font-medium text-sm" }, `Venue conflict with "${request.conflict_with}"`),
                                React.createElement('span', { className: "text-amber-700 text-xs block mt-0.5" }, 'FCFS Policy: Approve the earliest submission first')
                            )
                        ),

                        // Header
                        React.createElement('div', { className: "p-5" },
                            React.createElement('div', { className: "flex items-start justify-between mb-3" },
                                React.createElement('h3', { className: "font-semibold text-slate-900 text-lg leading-tight pr-4" }, request.name),
                                request.has_conflict && React.createElement('span', { className: "px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-md flex-shrink-0 border border-amber-200" }, 'CONFLICT')
                            ),
                            React.createElement('div', { className: "flex items-center gap-5 text-sm text-slate-600" },
                                React.createElement('span', { className: "flex items-center gap-1.5" },
                                    React.createElement('svg', { className: "w-4 h-4 text-slate-400", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })),
                                    React.createElement('span', { className: "font-medium" }, new Date(request.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
                                ),
                                React.createElement('span', { className: "flex items-center gap-1.5" },
                                    React.createElement('svg', { className: "w-4 h-4 text-slate-400", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })),
                                    request.requestor
                                ),
                                React.createElement('span', { className: `flex items-center gap-1.5 ${request.has_conflict ? 'text-amber-700 font-semibold' : ''}` },
                                    React.createElement('svg', { className: `w-4 h-4 ${request.has_conflict ? 'text-amber-600' : 'text-slate-400'}`, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })),
                                    request.requested_at
                                )
                            )
                        ),

                        // Venue Approval Action Area
                        React.createElement('div', { className: "border-t border-slate-200 bg-slate-50/50" },
                            React.createElement('div', { className: "px-5 py-4 flex items-center justify-between" },
                                React.createElement('div', { className: "flex items-center gap-3" },
                                    React.createElement('div', { className: "w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center" },
                                        React.createElement('svg', { className: "w-5 h-5 text-indigo-600", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' })
                                        )
                                    ),
                                    React.createElement('div', null,
                                        React.createElement('p', { className: "font-medium text-slate-900 text-sm" }, request.venue),
                                        React.createElement('p', { className: "text-xs text-slate-500 mt-0.5" }, "Venue Request")
                                    )
                                ),
                                React.createElement('div', { className: "flex items-center gap-3" },
                                    React.createElement(ApprovalStatusBadge, { status: request.venue_approval_status }),
                                    
                                    request.venue_approval_status === 'Pending' && React.createElement('div', { className: "flex items-center gap-2 pl-3 border-l border-slate-200" },
                                        React.createElement('button', {
                                            onClick: () => openRejectionModal(request.id),
                                            className: "px-4 py-2 text-sm font-medium text-red-700 bg-white border border-slate-300 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-800 transition-colors shadow-sm"
                                        }, 'Reject'),
                                        React.createElement('button', {
                                            onClick: () => handleAction(request.id, 'Approved'),
                                            className: "px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                                        }, 'Approve Venue')
                                    )
                                )
                            )
                        )
                    )
                )
            ),

            // Modals
            React.createElement(StatusModal, {
                isOpen: modal.isOpen,
                type: modal.type,
                title: modal.title,
                message: modal.message,
                onClose: () => setModal(prev => ({ ...prev, isOpen: false }))
            }),
            
            React.createElement(RejectionModal, {
                isOpen: rejectionModal.isOpen,
                onClose: () => setRejectionModal({ isOpen: false, eventId: null }),
                onConfirm: (reason) => {
                    handleAction(rejectionModal.eventId, 'Rejected', reason);
                    setRejectionModal({ isOpen: false, eventId: null });
                }
            })
        )
    );
};

// Sub-components used within VenueApprovals (Duplicated/Reused from StaffEquipmentApprovals pattern)
const StatCard = ({ icon, bg, label, value, sub }) =>
    React.createElement('div', { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4" },
        React.createElement('div', { className: `p-3 rounded-lg ${bg} shadow-sm` }, icon),
        React.createElement('div', null,
            React.createElement('p', { className: "text-sm font-medium text-slate-500" }, label),
            React.createElement('h3', { className: "text-2xl font-bold text-slate-900" }, value),
            React.createElement('p', { className: "text-xs text-slate-400 mt-1" }, sub)
        )
    );

const ApprovalStatusBadge = ({ status }) => {
    const styles = {
        Pending: 'bg-slate-100 text-slate-700 border-slate-300',
        Approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        Rejected: 'bg-red-50 text-red-700 border-red-300'
    };
    const getIcon = (s) => {
        if (s === 'Approved') return React.createElement('svg', { className: "w-3.5 h-3.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' }));
        if (s === 'Rejected') return React.createElement('svg', { className: "w-3.5 h-3.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' }));
        return React.createElement('svg', { className: "w-3.5 h-3.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' }, React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }));
    };
    return React.createElement('span', { className: `px-3 py-1.5 rounded-md text-xs font-medium border inline-flex items-center gap-1.5 ${styles[status] || styles.Pending}` }, getIcon(status), status);
};

const StatusModal = ({ isOpen, type, title, message, onClose }) => {
    if (!isOpen) return null;
    return React.createElement('div', { className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" },
        React.createElement('div', { className: "bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" },
            React.createElement('div', { className: "p-6 text-center" },
                React.createElement('div', { className: `w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}` },
                    React.createElement('svg', { className: "w-7 h-7", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
                        type === 'success' ? React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M5 13l4 4L19 7" }) : React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M6 18L18 6M6 6l12 12" })
                    )
                ),
                React.createElement('h3', { className: "text-lg font-bold text-slate-900 mb-2" }, title),
                React.createElement('p', { className: "text-sm text-slate-600 mb-6" }, message),
                React.createElement('button', { onClick: onClose, className: `w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white ${type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}` }, "Okay")
            )
        )
    );
};

const RejectionModal = ({ isOpen, onClose, onConfirm }) => {
    const [reason, setReason] = useState('Scheduling Conflict');
    const [customReason, setCustomReason] = useState('');
    if (!isOpen) return null;
    return React.createElement('div', { className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" },
        React.createElement('div', { className: "bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" },
            React.createElement('div', { className: "p-6" },
                React.createElement('h3', { className: "text-lg font-bold text-slate-900 mb-4" }, "Reject Venue Request"),
                React.createElement('div', { className: "space-y-4" },
                    React.createElement('div', null,
                        React.createElement('label', { className: "block text-sm font-medium text-slate-700 mb-1" }, "Reason"),
                        React.createElement('select', { value: reason, onChange: (e) => setReason(e.target.value), className: "w-full rounded-lg border-slate-300 shadow-sm p-2 border" },
                            ['Scheduling Conflict', 'Venue Maintenance', 'Policy Violation', 'Other'].map(r => React.createElement('option', { key: r, value: r }, r))
                        )
                    ),
                    reason === 'Other' && React.createElement('div', null,
                        React.createElement('label', { className: "block text-sm font-medium text-slate-700 mb-1" }, "Specific Details"),
                        React.createElement('textarea', { value: customReason, onChange: (e) => setCustomReason(e.target.value), className: "w-full rounded-lg border-slate-300 shadow-sm p-2 border", rows: 3 })
                    )
                ),
                React.createElement('div', { className: "flex items-center gap-3 mt-8" },
                    React.createElement('button', { onClick: onClose, className: "flex-1 py-2.5 px-4 rounded-xl font-medium text-slate-700 hover:bg-slate-100" }, "Cancel"),
                    React.createElement('button', { onClick: () => onConfirm(reason === 'Other' ? customReason : reason), className: "flex-1 py-2.5 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700" }, "Confirm Rejection")
                )
            )
        )
    );
};

window.VenueApprovals = VenueApprovals;
