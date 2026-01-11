
const EquipmentApprovals = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    total: 0,
    upcoming: 0
  });
  const [loading, setLoading] = useState(true);
  const [expandedEquipment, setExpandedEquipment] = useState({});
  const [modal, setModal] = useState({ isOpen: false, type: 'success', title: '', message: '' });
  const [rejectionModal, setRejectionModal] = useState({ isOpen: false, eventId: null, type: null, itemName: null });
  const [pendingDecisions, setPendingDecisions] = useState({}); // { eventId: { itemName: { status: 'Approved'/'Rejected', reason: '' } } }

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/venues/requests');
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests);
        setStats(data.stats);
        // Reset pending decisions on refresh
        setPendingDecisions({});
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSubmit = async (eventId) => {
    try {
      const eventDecisions = pendingDecisions[eventId] || {};
      const request = requests.find(r => r.id === eventId);
      if (!request) return;

      // Construct the full equipment list with updated statuses
      const updatedEquipmentList = request.items.map(item => {
        const decision = eventDecisions[item.name];
        if (decision) {
          return {
            ...item,
            status: decision.status,
            rejection_reason: decision.reason || null,
            approved_quantity: decision.approved_quantity || item.requested // Default to requested if not specified
          };
        }
        // Default to Approved if no decision made? Or keep as is?
        // Strategy: If user explicitly marked it, use that. Else default to 'Approved' if submitting?
        // Or requiring explicit decision for everything? 
        // Let's assume unchecked items are 'Approved' implicitly if the user clicks "Approve All Pending" or similar.
        // For now, let's say unchecked items retain their status OR default to Approved if 'Pending'.
        return item.status === 'Pending' ? { ...item, status: 'Approved' } : item;
      });

      const payload = {
        type: 'equipment',
        equipment_list: updatedEquipmentList
      };

      const response = await fetch(`/api/venues/requests/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.success) {
        setModal({ isOpen: true, type: 'success', title: 'Review Submitted', message: data.message });
        fetchRequests();
      } else {
        setModal({ isOpen: true, type: 'error', title: 'Error', message: data.error });
      }

    } catch (error) {
      console.error('Batch submit error:', error);
    }
  };

  const toggleDecision = (eventId, itemName, status, reason = null, approvedQuantity = null) => {
    console.log('[DEBUG] toggleDecision called:', { eventId, itemName, status, reason });
    setPendingDecisions(prev => {
      const eventDecisions = prev[eventId] || {};

      // If clicking same status, toggle off (unless it's a partial approval update OR we are setting a reason)
      // If we are setting a reason (Revocation), we NEVER want to toggle off.
      if (eventDecisions[itemName]?.status === status && !approvedQuantity && !reason) {
        console.log('[DEBUG] Toggling OFF (removing decision)');
        const newDecisions = { ...eventDecisions };
        delete newDecisions[itemName];
        return { ...prev, [eventId]: newDecisions };
      }

      const newItemState = { status, reason, approved_quantity: approvedQuantity };
      console.log('[DEBUG] Setting new item state:', newItemState);

      return {
        ...prev,
        [eventId]: {
          ...eventDecisions,
          [itemName]: newItemState
        }
      };
    });
  };

  const bulkToggle = (eventId, items, status) => {
    setPendingDecisions(prev => {
      const newEventDecisions = { ...prev[eventId] };
      items.forEach(item => {
        // Only affect pending items or override existing
        newEventDecisions[item.name] = { status, reason: null };
      });
      return { ...prev, [eventId]: newEventDecisions };
    });
  };

  const handleAction = async (eventId, type, action, reason = null, rejectedItem = null) => {
    // Legacy handleAction for Venue only now, or single clicks if needed
    // ... (Keep existing implementation for Venue)
    try {
      console.log(`Updating ${type} for event ${eventId} to status: ${action}`);

      const payload = {
        status: action,
        type: type,
        reason: reason
      };

      // If it's a batch rejection being passed from RejectionModal (local state update)
      if (type === 'equipment_batch_local') {
        toggleDecision(eventId, rejectedItem, 'Rejected', reason);
        setRejectionModal({ isOpen: false, eventId: null, type: null, itemName: null });
        return;
      }

      const response = await fetch(`/api/venues/requests/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      // ... rest of function
      const data = await response.json();
      if (response.ok && data.success) {
        setModal({ isOpen: true, type: 'success', title: 'Success', message: data.message });
        fetchRequests();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openRejectionModal = (eventId, type, itemName = null, isRevoke = false) => {
    setRejectionModal({ isOpen: true, eventId, type, itemName, isRevoke });
  };

  const getCategoryIcon = (category) => {
    const iconProps = { className: "w-5 h-5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' };
    switch (category?.toLowerCase()) {
      case 'av':
      case 'audio & visual':
        return React.createElement('svg', iconProps,
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' })
        );
      case 'it':
        return React.createElement('svg', iconProps,
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
        );
      case 'furniture':
        return React.createElement('svg', iconProps,
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M20.354 15.354A9 9 0 015.646 5.646 9.001 9.001 0 0020.354 15.354z' })
        );
      default:
        return React.createElement('svg', iconProps,
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' })
        );
    }
  };

  const getClockIcon = () => {
    return React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
    );
  };

  const getCheckCircleIcon = () => {
    return React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' })
    );
  };

  const getBoxIcon = () => {
    return React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' })
    );
  };

  const getCalendarIcon = () => {
    return React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
    );
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'All') return true;
    // Show in Pending if either venue or equipment is pending
    if (activeTab === 'Pending') {
      return req.venue_approval_status === 'Pending' || req.equipment_approval_status === 'Pending';
    }
    // Show in Approved if both are approved
    if (activeTab === 'Approved') {
      return req.venue_approval_status === 'Approved' && req.equipment_approval_status === 'Approved';
    }
    // Show in Rejected if either is rejected
    if (activeTab === 'Rejected') {
      return req.venue_approval_status === 'Rejected' || req.equipment_approval_status === 'Rejected';
    }
    return true;
  });

  if (loading) return React.createElement('div', { className: "p-8 text-center" }, "Loading...");

  return (
    React.createElement('div', { className: "p-6 max-w-7xl mx-auto" },
      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" },
        React.createElement(StatCard, {
          icon: getClockIcon(),
          bg: "bg-orange-500",
          label: "Pending Approval",
          value: stats.pending,
          sub: "Awaiting review"
        }),
        React.createElement(StatCard, {
          icon: getCheckCircleIcon(),
          bg: "bg-emerald-500",
          label: "Approved",
          value: stats.approved,
          sub: "This week"
        }),
        React.createElement(StatCard, {
          icon: getBoxIcon(),
          bg: "bg-indigo-500",
          label: "Total Requests",
          value: stats.total,
          sub: "All time"
        }),
        React.createElement(StatCard, {
          icon: getCalendarIcon(),
          bg: "bg-purple-500",
          label: "Upcoming Events",
          value: stats.upcoming,
          sub: "Next 7 days"
        })
      ),

      React.createElement('div', { className: "bg-white rounded-lg border border-slate-200 p-1 mb-6 inline-flex" },
        ['All', 'Pending', 'Approved', 'Rejected'].map(tab => {
          let count = 0;
          if (tab === 'All') {
            count = requests.length;
          } else if (tab === 'Pending') {
            count = requests.filter(r => r.venue_approval_status === 'Pending' || r.equipment_approval_status === 'Pending').length;
          } else if (tab === 'Approved') {
            count = requests.filter(r => r.venue_approval_status === 'Approved' && r.equipment_approval_status === 'Approved').length;
          } else if (tab === 'Rejected') {
            count = requests.filter(r => r.venue_approval_status === 'Rejected' || r.equipment_approval_status === 'Rejected').length;
          }

          return React.createElement('button', {
            key: tab,
            onClick: () => setActiveTab(tab),
            className: `px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab
              ? 'bg-indigo-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
              }`
          },
            tab,
            React.createElement('span', {
              className: `ml-2 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
                }`
            }, count)
          );
        })
      ),

      React.createElement('div', { className: "space-y-4" },
        filteredRequests.map(request =>
          React.createElement('div', {
            key: request.id,
            className: "bg-white rounded-lg border-2 border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
          },
            // Conflict Warning Banner (only if conflict exists)
            request.has_conflict && React.createElement('div', { className: "bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2" },
              React.createElement('svg', { className: "w-5 h-5 text-amber-600 flex-shrink-0", fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z', clipRule: 'evenodd' })
              ),
              React.createElement('div', { className: "flex-1" },
                React.createElement('span', { className: "text-amber-900 font-medium text-sm" },
                  `Venue conflict with "${request.conflict_with}"`
                ),
                React.createElement('span', { className: "text-amber-700 text-xs block mt-0.5" },
                  'FCFS Policy: Approve the earliest submission first'
                )
              )
            ),

            // Event Header - Clean & Professional
            React.createElement('div', { className: "p-5" },
              React.createElement('div', { className: "flex items-start justify-between mb-3" },
                React.createElement('h3', { className: "font-semibold text-slate-900 text-lg leading-tight pr-4" }, request.name),
                request.has_conflict && React.createElement('span', {
                  className: "px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-md flex-shrink-0 border border-amber-200"
                }, 'CONFLICT')
              ),
              React.createElement('div', { className: "flex items-center gap-5 text-sm text-slate-600" },
                React.createElement('span', { className: "flex items-center gap-1.5" },
                  React.createElement('svg', { className: "w-4 h-4 text-slate-400", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
                  ),
                  React.createElement('span', { className: "font-medium" },
                    new Date(request.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  )
                ),
                React.createElement('span', { className: "flex items-center gap-1.5" },
                  React.createElement('svg', { className: "w-4 h-4 text-slate-400", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })
                  ),
                  request.requestor
                ),
                React.createElement('span', {
                  className: `flex items-center gap-1.5 ${request.has_conflict ? 'text-amber-700 font-semibold' : ''}`,
                  title: request.created_at ? new Date(request.created_at).toLocaleString() : ''
                },
                  React.createElement('svg', { className: `w-4 h-4 ${request.has_conflict ? 'text-amber-600' : 'text-slate-400'}`, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
                  ),
                  request.requested_at
                )
              )
            ),

            // Venue Approval Section - Minimal Design
            request.venue && React.createElement('div', { className: "border-t border-slate-200" },
              React.createElement('div', { className: "px-5 py-4 flex items-center justify-between" },
                React.createElement('div', { className: "flex items-center gap-3" },
                  React.createElement('div', { className: "w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center" },
                    React.createElement('svg', { className: "w-5 h-5 text-slate-600", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
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
                  request.venue_approval_status === 'Pending' && React.createElement('div', { className: "flex items-center gap-2" },
                    React.createElement('button', {
                      onClick: () => openRejectionModal(request.id, 'venue'),
                      className: "px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    }, 'Reject'),
                    React.createElement('button', {
                      onClick: () => handleAction(request.id, 'venue', 'Approved'),
                      className: "px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    }, 'Approve')
                  )
                )
              )
            ),

            // Equipment Approval Section - Minimal Design
            React.createElement('div', { className: "border-t border-slate-200" },
              React.createElement('div', {
                className: "px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors",
                onClick: () => setExpandedEquipment(prev => ({ ...prev, [request.id]: !prev[request.id] }))
              },
                React.createElement('div', { className: "flex items-center gap-3 flex-1" },
                  React.createElement('div', { className: "w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center" },
                    React.createElement('svg', { className: "w-5 h-5 text-slate-600", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' })
                    )
                  ),
                  React.createElement('div', { className: "flex-1" },
                    React.createElement('p', { className: "font-medium text-slate-900 text-sm" }, `Equipment (${request.items.length} items)`),
                    React.createElement('p', { className: "text-xs text-slate-500 mt-0.5" },
                      expandedEquipment[request.id] ? "Click to hide details" : "Click to view details"
                    )
                  ),
                  React.createElement('svg', {
                    className: `w-5 h-5 text-slate-400 transition-transform ${expandedEquipment[request.id] ? 'rotate-180' : ''}`,
                    fill: 'none',
                    stroke: 'currentColor',
                    viewBox: '0 0 24 24'
                  },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 9l-7 7-7-7' })
                  )
                ),
                React.createElement('div', { className: "flex items-center gap-3 ml-3", onClick: (e) => e.stopPropagation() },
                  React.createElement(ApprovalStatusBadge, { status: request.equipment_approval_status }),
                  request.equipment_approval_status === 'Pending' && React.createElement('div', { className: "flex items-center gap-2" },
                    // Bulk Actions (Only visible when expanded)
                    expandedEquipment[request.id] && React.createElement('div', { className: "flex items-center gap-1 mr-2 border-r border-slate-200 pr-3" },
                      React.createElement('button', {
                        onClick: (e) => { e.stopPropagation(); bulkToggle(request.id, request.items, 'Approved'); },
                        className: "text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2 py-1 rounded"
                      }, "Approve All"),
                      React.createElement('button', {
                        onClick: (e) => {
                          e.stopPropagation();
                          // For bulk reject, we might want a reason... but for now just mark Rejected and let them fill? 
                          // Or maybe just reject without reason for efficiency, or default reason.
                          // Let's set it to Rejected, if they want to explain they can go row by row or we use a default.
                          // Actually better UX: Open modal for global reason? 
                          // Simplest for now: Bulk reject sets status 'Rejected' with 'Batch Rejected' reason or empty.
                          // Let's open the bulk rejection modal? No, that complicates local state.
                          // Just set status. The user can click individual X if they want specific reasons.
                          bulkToggle(request.id, request.items, 'Rejected');
                        },
                        className: "text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                      }, "Reject All")
                    ),
                  )
                )
              ),

              // Equipment List (Collapsible) - Grid Layout
              expandedEquipment[request.id] && React.createElement('div', { className: "px-5 pb-4 pt-2 bg-slate-50/50 border-t border-slate-100" },
                // Grid Header
                React.createElement('div', { className: "grid grid-cols-12 gap-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2" },
                  React.createElement('div', { className: "col-span-4" }, "Item Details"),
                  React.createElement('div', { className: "col-span-2 text-center" }, "Requested"),
                  React.createElement('div', { className: "col-span-2 text-center" }, "Available"),
                  React.createElement('div', { className: "col-span-4 text-right" }, "Actions")
                ),
                // Grid Items
                React.createElement('div', { className: "space-y-2" },
                  request.items.map((item, index) => {
                    const parentIsPending = request.equipment_approval_status === 'Pending';
                    const decision = pendingDecisions[request.id]?.[item.name];

                    // IF the overall request is Pending, treat items as 'Pending' (unchecked) 
                    // unless a specific local decision exists.
                    // This forces the user to manually approve/check items during review.
                    let effectiveStatus = item.status;
                    if (parentIsPending && !decision) {
                      effectiveStatus = 'Pending';
                    } else if (decision) {
                      effectiveStatus = decision.status;
                    }

                    const isRejected = effectiveStatus && effectiveStatus.toLowerCase() === 'rejected';
                    const isApproved = effectiveStatus === 'Approved';
                    const isSelfProvided = effectiveStatus === 'Self-Provided';

                    const approvedQty = decision?.approved_quantity || (isApproved ? item.requested : null);

                    const isUnavailable = item.available <= 0;
                    const isInsufficient = item.available < item.requested;
                    const isPartial = isApproved && approvedQty < item.requested;

                    return React.createElement('div', {
                      key: `${request.id}-${item.name}-${index}`,
                      className: `grid grid-cols-12 gap-4 items-center p-4 rounded-xl border transition-all ${isRejected ? 'bg-red-50 border-red-100' :
                        isSelfProvided ? 'bg-gray-50 border-gray-200' :
                          isUnavailable ? 'bg-red-50 border-red-100' :
                            isInsufficient ? 'bg-orange-100 border-orange-300' :
                              'bg-white border-slate-200 shadow-sm'
                        }`
                    },
                      // Column 1: Item Details
                      React.createElement('div', { className: "col-span-4 flex items-center gap-4" },
                        // Contextual Icon Color
                        React.createElement('div', {
                          className: `w-12 h-12 rounded-lg bg-white flex items-center justify-center border ${isRejected ? 'text-slate-400 border-slate-200' :
                            isSelfProvided ? 'text-gray-400 border-gray-200' :
                              isUnavailable ? 'text-red-500 border-red-100' :
                                isInsufficient ? 'text-orange-600 border-orange-200' :
                                  'text-indigo-600 border-indigo-100'
                            }`
                        },
                          getCategoryIcon(item.category)
                        ),
                        React.createElement('div', null,
                          React.createElement('div', { className: "flex items-center gap-2" },
                            React.createElement('p', { className: `font-bold text-slate-800 ${isRejected ? 'line-through opacity-50' : ''}` }, item.name),
                            // Insufficient Badge (Red/Pink with Icon)
                            isInsufficient && !isUnavailable && !isRejected && React.createElement('span', { className: "text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold flex items-center gap-1" },
                              React.createElement('span', null, "▲"), "Insufficient"
                            ),
                            // Unavailable Badge (Red)
                            isUnavailable && !isRejected && React.createElement('span', { className: "text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold" }, "⊘ Unavailable")
                          ),
                          // Category Badge (Pill style)
                          React.createElement('span', { className: "inline-block mt-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-500" }, item.category)
                        )
                      ),

                      // Column 2: Requested
                      React.createElement('div', { className: "col-span-2 text-center" },
                        React.createElement('span', { className: "font-bold text-lg text-slate-900" }, item.requested)
                      ),

                      // Column 3: Available
                      React.createElement('div', { className: "col-span-2 text-center flex justify-center" },
                        React.createElement('span', {
                          className: `px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 ${isUnavailable ? 'text-red-500 bg-red-100/50' :
                            isInsufficient ? 'text-red-600 bg-red-50 border border-red-100' :
                              'text-emerald-600 bg-emerald-50'
                            }`
                        },
                          item.available,
                          isInsufficient && !isUnavailable && React.createElement('span', { className: "text-[10px]" }, "↓")
                        )
                      ),

                      // Column 4: Actions
                      React.createElement('div', { className: "col-span-4 flex justify-end items-center gap-4" },
                        // Unavailable Text
                        isUnavailable && !isRejected && !isSelfProvided ? React.createElement('span', { className: "text-xs font-bold text-red-500 italic" }, "Cannot fulfill!") : null,

                        // Self Provided Badge
                        isSelfProvided && React.createElement('span', { className: "px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200" }, "Self-Provided"),

                        // Partial Approve Button
                        isInsufficient && !isUnavailable && !isRejected && !isPartial && React.createElement('button', {
                          type: 'button',
                          onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleDecision(request.id, item.name, 'Approved', null, item.available);
                          },
                          className: "text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        }, `Partially Approve (${item.available})`),

                        // Partial Approved Badge (if active)
                        isPartial && React.createElement('span', { className: "text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200" },
                          `Approved: ${approvedQty}`
                        ),

                        // Approve Button (Check Icon) - HIDDEN if Insufficient or Self-Provided
                        !isInsufficient && !isUnavailable && !isSelfProvided && React.createElement('button', {
                          type: 'button',
                          title: isApproved ? "Undo Approval" : "Approve",
                          onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            const isDbApproved = item.status === 'Approved';
                            const hasDecision = !!decision;

                            if (isApproved) {
                              if (isDbApproved && !hasDecision) {
                                // Revoke DB Approval -> Open Modal
                                openRejectionModal(request.id, 'equipment_batch_local', item.name, true);
                              } else {
                                // Undo Local Approval -> Pending
                                toggleDecision(request.id, item.name, 'Pending');
                              }
                            } else {
                              toggleDecision(request.id, item.name, 'Approved');
                            }
                          },
                          className: `w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isApproved
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm transform scale-105'
                            : 'bg-white border-slate-300 text-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                            }`
                        },
                          React.createElement('svg', { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" },
                            React.createElement('path', { d: "M5 13l4 4L19 7" }))
                        ),

                        // Reject Button (X Icon)
                        React.createElement('button', {
                          type: 'button',
                          title: isRejected ? "Undo Rejection" : "Reject",
                          onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isRejected) {
                              toggleDecision(request.id, item.name, 'Pending'); // Un-reject
                            } else {
                              openRejectionModal(request.id, 'equipment_batch_local', item.name);
                            }
                          },
                          className: `w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isRejected
                            ? 'bg-red-500 border-red-500 text-white shadow-sm transform scale-105'
                            : 'bg-white border-slate-300 text-slate-300 hover:border-red-500 hover:text-red-500'
                            }`
                        },
                          React.createElement('svg', { className: "w-5 h-5", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" },
                            React.createElement('path', { d: "M6 18L18 6M6 6l12 12" }))
                        )
                      )
                    );
                  })
                ),
                // Batch Submit Footer for this Request
                Object.keys(pendingDecisions[request.id] || {}).length > 0 && React.createElement('div', {
                  className: "sticky bottom-0 bg-white border-t border-slate-200 p-3 flex justify-between items-center shadow-lg animate-slide-up rounded-b-lg mt-2"
                },
                  React.createElement('span', { className: "text-sm text-slate-600 font-medium ml-2" },
                    `${Object.keys(pendingDecisions[request.id]).length} changes pending`
                  ),
                  React.createElement('div', { className: "flex gap-2" },
                    React.createElement('button', {
                      onClick: () => setPendingDecisions(prev => { const n = { ...prev }; delete n[request.id]; return n; }),
                      className: "px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    }, "Cancel"),
                    React.createElement('button', {
                      onClick: () => handleBatchSubmit(request.id),
                      className: "px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                    }, "Submit Review")
                  )
                )
              )
            )
          )
        )
      ),
      React.createElement(StatusModal, {
        isOpen: modal.isOpen,
        type: modal.type,
        title: modal.title,
        message: modal.message,
        onClose: () => setModal(prev => ({ ...prev, isOpen: false }))
      }),
      React.createElement(RejectionModal, {
        isOpen: rejectionModal.isOpen,
        itemName: rejectionModal.itemName,
        onClose: () => setRejectionModal({ isOpen: false, eventId: null, type: null, itemName: null }),
        onConfirm: (reason) => {
          console.log('[DEBUG] Confirming Rejection', { type: rejectionModal.type, eventId: rejectionModal.eventId, item: rejectionModal.itemName, reason });
          if (rejectionModal.type === 'equipment_batch_local') {
            toggleDecision(rejectionModal.eventId, rejectionModal.itemName, 'Rejected', reason);
            setRejectionModal({ isOpen: false, eventId: null, type: null, itemName: null });
          } else {
            handleAction(rejectionModal.eventId, rejectionModal.type, 'Rejected', reason, rejectionModal.itemName);
          }
        }
      })
    )
  );
};

const StatCard = ({ icon, bg, label, value, sub }) =>
  React.createElement('div', { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4" },
    React.createElement('div', { className: `p-3 rounded-lg ${bg} shadow-sm` },
      icon
    ),
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
    Rejected: 'bg-slate-100 text-slate-600 border-slate-300'
  };

  const getIcon = (status) => {
    if (status === 'Pending') {
      return React.createElement('svg', { className: "w-3.5 h-3.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
      );
    } else if (status === 'Approved') {
      return React.createElement('svg', { className: "w-3.5 h-3.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
      );
    } else {
      return React.createElement('svg', { className: "w-3.5 h-3.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
      );
    }
  };

  return React.createElement('span', { className: `px-3 py-1.5 rounded-md text-xs font-medium border inline-flex items-center gap-1.5 ${styles[status] || styles.Pending}` },
    getIcon(status),
    status
  );
};



const StatusModal = ({ isOpen, type, title, message, onClose }) => {
  if (!isOpen) return null;

  return React.createElement('div', { className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" },
    React.createElement('div', { className: "bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all animate-scale-in" },
      React.createElement('div', { className: "p-6 text-center" },
        React.createElement('div', { className: `w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center ${type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}` },
          React.createElement('svg', { className: "w-7 h-7", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
            type === 'success'
              ? React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M5 13l4 4L19 7" })
              : React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M6 18L18 6M6 6l12 12" })
          )
        ),
        React.createElement('h3', { className: "text-lg font-bold text-slate-900 mb-2" }, title),
        React.createElement('p', { className: "text-sm text-slate-600 mb-6 leading-relaxed" }, message),
        React.createElement('button', {
          onClick: onClose,
          className: `w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white transition-all transform active:scale-95 ${type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200'}`
        }, "Okay")
      )
    )
  );
};

const RejectionModal = ({ isOpen, itemName, isRevoke, onClose, onConfirm }) => {
  const [reason, setReason] = useState('Scheduling Conflict');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen) return null;

  return React.createElement('div', { className: "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in" },
    React.createElement('div', { className: "bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all animate-scale-in" },
      React.createElement('div', { className: "p-6" },
        React.createElement('div', { className: "flex items-center gap-3 mb-4 text-red-600" },
          React.createElement('div', { className: "p-2 bg-red-100 rounded-full" },
            React.createElement('svg', { className: "w-6 h-6", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" },
              React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: "2", d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" })
            )
          ),
          React.createElement('h3', { className: "text-lg font-bold text-slate-900" },
            isRevoke ? `Revoke Approval: ${itemName}` : (itemName ? `Reject Item: ${itemName} ` : "Reject Request")
          )
        ),

        React.createElement('p', { className: "text-slate-600 text-sm mb-4" },
          isRevoke
            ? "Please selection a reason for revoking this approval. The requestor will be notified."
            : "Please select a reason for this rejection. This will be shared with the requestor."
        ),

        React.createElement('div', { className: "space-y-4" },
          React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium text-slate-700 mb-1" }, "Reason"),
            React.createElement('select', {
              value: reason,
              onChange: (e) => setReason(e.target.value),
              className: "w-full rounded-lg border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border"
            },
              ['Scheduling Conflict', 'Maintenance/Repair', 'Policy Violation', 'Inventory Shortage', 'Other'].map(r =>
                React.createElement('option', { key: r, value: r }, r)
              )
            )
          ),

          reason === 'Other' && React.createElement('div', null,
            React.createElement('label', { className: "block text-sm font-medium text-slate-700 mb-1" }, "Specific Details"),
            React.createElement('textarea', {
              value: customReason,
              onChange: (e) => setCustomReason(e.target.value),
              placeholder: "Please provide more details...",
              className: "w-full rounded-lg border-slate-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2 border",
              rows: 3
            })
          )
        ),

        React.createElement('div', { className: "flex items-center gap-3 mt-8" },
          React.createElement('button', {
            onClick: onClose,
            className: "flex-1 py-2.5 px-4 rounded-xl font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          }, "Cancel"),
          React.createElement('button', {
            onClick: () => onConfirm(reason === 'Other' ? customReason : reason),
            disabled: reason === 'Other' && !customReason.trim(),
            className: "flex-1 py-2.5 px-4 rounded-xl font-semibold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          }, isRevoke ? "Confirm Revocation" : "Confirm Rejection")
        )
      )
    )
  );
};

window.EquipmentApprovals = EquipmentApprovals;
