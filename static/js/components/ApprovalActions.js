// ApprovalActions Component - Reusable approval workflow actions
const { useState } = React;

window.ApprovalActions = function ApprovalActions({ event, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [fullEventData, setFullEventData] = useState(null);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleDates, setRescheduleDates] = useState({ date: '', startTime: '', endTime: '' });
  const [daySchedule, setDaySchedule] = useState([]);
  const [checkingSchedule, setCheckingSchedule] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole = user?.role_name;

  // Generate time slots (07:00 to 22:00 in 30 min increments)
  const generateTimeSlots = () => {
    const slots = [];
    for (let h = 7; h <= 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour = h.toString().padStart(2, '0');
        const min = m.toString().padStart(2, '0');
        slots.push(`${hour}:${min}`);
      }
    }
    return slots;
  };

  // Check if a time slot is blocked
  const isTimeBlocked = (timeStr) => {
    if (!daySchedule.length || !rescheduleDates.date) return false;
    
    const checkTime = new Date(`${rescheduleDates.date}T${timeStr}`);
    
    return daySchedule.some(evt => {
      const evtStart = new Date(evt.start);
      const evtEnd = new Date(evt.end);
      // Check if time is within an event (inclusive of start, exclusive of end)
      return checkTime >= evtStart && checkTime < evtEnd;
    });
  };

  // Fetch schedule for the selected day to show availability
  const fetchDaySchedule = async (dateStr) => {
    if (!dateStr || !fullEventData?.venue) return;
    
    setCheckingSchedule(true);
    const month = dateStr.slice(0, 7); // YYYY-MM
    
    try {
      const res = await fetch(`/api/venues/calendar?month=${month}`);
      const data = await res.json();
      if (data.success) {
        // Filter for this venue and this day
        const venueName = fullEventData.venue;
        const dayEvents = data.events.filter(e => 
          e.venue === venueName && 
          e.start.startsWith(dateStr) &&
          e.id !== event.id && // Exclude current event
          e.status !== 'Rejected'
        );
        setDaySchedule(dayEvents.sort((a, b) => a.start.localeCompare(b.start)));
      }
    } catch (err) {
      console.error("Error fetching schedule:", err);
    } finally {
      setCheckingSchedule(false);
    }
  };

  // Check for conflicts before confirming
  const checkConflicts = async () => {
    if (!rescheduleDates.date || !rescheduleDates.startTime || !rescheduleDates.endTime) return true;
    
    const startDateTime = `${rescheduleDates.date}T${rescheduleDates.startTime}`;
    const endDateTime = `${rescheduleDates.date}T${rescheduleDates.endTime}`;

    try {
      const res = await fetch('/api/venues/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue: fullEventData.venue,
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          exclude_event_id: event.id
        })
      });
      const data = await res.json();
      return data.has_conflicts;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const handleRescheduleConfirm = async () => {
    // Validate dates
    if (!rescheduleDates.date || !rescheduleDates.startTime || !rescheduleDates.endTime) {
      alert('Please select date, start time, and end time');
      return;
    }
    
    const startDateTime = `${rescheduleDates.date}T${rescheduleDates.startTime}`;
    const endDateTime = `${rescheduleDates.date}T${rescheduleDates.endTime}`;

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      alert('End time must be after start time');
      return;
    }

    // Check conflicts
    const hasConflicts = await checkConflicts();
    if (hasConflicts) {
      alert('The selected time slot conflicts with an existing booking. Please choose a different time.');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          status: 'Pending',
          reason: 'Rescheduled by Admin due to conflict'
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Event rescheduled and sent to Pending status.');
        setShowReviewModal(false);
        if (onSuccess) onSuccess();
      } else {
        alert(data.error || 'Failed to reschedule');
      }
    } catch (err) {
      console.error(err);
      alert('Error rescheduling event');
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = userRole === 'Super Admin';
  const isAdmin = userRole === 'Admin';
  const isStaffOnly = userRole === 'Staff' && !isSuperAdmin && !isAdmin;
  const isRequestorOnly = userRole === 'Requestor' && !isSuperAdmin && !isAdmin && !isStaffOnly;

  const rejectReasons = [
    'Budget exceeded',
    'Venue unavailable',
    'Insufficient resources',
    'Timeline conflict',
    'Incomplete information',
    'Policy violation',
    'Duplicate event',
    'Other (specify below)'
  ];

  const getAvailableActions = () => {
    const actions = [];
    const status = event.status;

    // Super Admin: Review & Approve at Pending/Under Review, Reject any status
    if (isSuperAdmin) {
      if (status === 'Pending' || status === 'Under Review') {
        actions.push({ label: 'Review & Approve', endpoint: 'superadmin-approve', variant: 'success' });
      }
      if (status !== 'Archived') {
        actions.push({ label: 'Reject', endpoint: 'reject', variant: 'danger' });
      }
      return actions;
    }

    // Admin: Approve at Under Review
    if (isAdmin && status === 'Under Review') {
      actions.push({ label: 'Approve Event', endpoint: 'approve', variant: 'success' });
      actions.push({ label: 'Reject', endpoint: 'reject', variant: 'danger' });
      return actions;
    }

    // Staff: Approve & Forward at Pending
    if (isStaffOnly && status === 'Pending') {
      actions.push({ label: 'Approve & Forward', endpoint: 'approve-forward', variant: 'primary' });
      actions.push({ label: 'Reject', endpoint: 'reject', variant: 'danger' });
      return actions;
    }

    return actions;
  };

  const fetchFullEventData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setFullEventData(data.event);
        setShowReviewModal(true);
      } else {
        alert('Failed to load event details');
      }
    } catch (err) {
      console.error('Failed to fetch event:', err);
      alert('Error loading event details');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (endpoint) => {
    if (endpoint === 'superadmin-approve') {
      await fetchFullEventData();
      return;
    }

    if (endpoint === 'reject') {
      setShowRejectModal(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Action completed successfully');
        if (onSuccess) onSuccess();
      } else {
        alert(data.message || 'Action failed');
      }
    } catch (err) {
      console.error('Action failed:', err);
      alert('Error performing action');
    } finally {
      setLoading(false);
    }
  };

  const confirmApproval = async (actionOnConflict = null) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/superadmin-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action_on_conflict: actionOnConflict })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Event approved successfully');
        setShowReviewModal(false);
        if (onSuccess) onSuccess();
      } else {
        alert(data.message || 'Approval failed');
      }
    } catch (err) {
      console.error('Approval failed:', err);
      alert('Error approving event');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReason) {
      alert('Please select a rejection reason');
      return;
    }
    const reason = selectedReason === 'Other (specify below)' ? customNote : selectedReason;
    if (!reason.trim()) {
      alert('Please provide rejection details');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        alert(data.message || 'Event rejected');
        setShowRejectModal(false);
        setSelectedReason('');
        setCustomNote('');
        if (onSuccess) onSuccess();
      } else {
        alert(data.message || 'Rejection failed');
      }
    } catch (err) {
      console.error('Rejection failed:', err);
      alert('Error rejecting event');
    } finally {
      setLoading(false);
    }
  };

  const actions = getAvailableActions();
  if (!actions.length) return null;

  return (
    <div className="flex gap-1">
      {actions.map(action => {
        const isReject = action.variant === 'danger';
        const isReview = action.endpoint === 'superadmin-approve';
        const isApprove = action.variant === 'success' && !isReview;
        
        return (
          <button 
            key={action.endpoint}
            onClick={() => handleApprovalAction(action.endpoint)} 
            disabled={loading}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isReject ? 'text-red-600 hover:bg-red-50' :
              isReview ? 'text-blue-600 hover:bg-blue-50' :
              isApprove ? 'text-green-600 hover:bg-green-50' :
              'text-slate-600 hover:bg-slate-100'
            }`}
            title={loading ? 'Processing...' : action.label}
          >
            {isReject ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : isReview ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        );
      })}

      {/* Review Modal */}
      {showReviewModal && fullEventData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Review Event Details</h2>
              <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 bg-gray-50 min-h-full space-y-6">
              {/* Basic Info */}
              <div className="w-full">
                <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 border-b border-blue-700">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Basic Information
                    </h3>
                  </div>
                  <div className="p-4 bg-gradient-to-b from-slate-50 to-white">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                      <div><span className="text-xs text-slate-500 uppercase font-bold">Event Name</span><p className="font-medium text-slate-800">{fullEventData.name}</p></div>
                      <div><span className="text-xs text-slate-500 uppercase font-bold">Type</span><p className="font-medium text-slate-800">{fullEventData.event_type || fullEventData.type}</p></div>
                      <div><span className="text-xs text-slate-500 uppercase font-bold">Date</span><p className="font-medium text-slate-800">{fullEventData.start_datetime ? new Date(fullEventData.start_datetime).toLocaleDateString() : fullEventData.date}</p></div>
                      <div><span className="text-xs text-slate-500 uppercase font-bold">Time</span><p className="font-medium text-slate-800">
                        {fullEventData.start_datetime ? new Date(fullEventData.start_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : fullEventData.startTime} - 
                        {fullEventData.end_datetime ? new Date(fullEventData.end_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : fullEventData.endTime}
                      </p></div>
                      <div><span className="text-xs text-slate-500 uppercase font-bold">Venue</span><p className="font-medium text-slate-800">{fullEventData.venue}</p></div>
                      <div><span className="text-xs text-slate-500 uppercase font-bold">Budget</span><p className="font-medium text-emerald-600">₱{fullEventData.budget || fullEventData.total_budget}</p></div>
                    </div>
                    {fullEventData.description && (
                      <div className="mt-4 pt-3 border-t border-slate-200">
                        <span className="text-xs text-slate-500 uppercase font-bold">Description</span>
                        <p className="text-sm mt-1 text-slate-700 leading-relaxed">{fullEventData.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Conflict Check */}
              {fullEventData.has_conflicts && (
                <div className="w-full">
                  <div className="bg-white rounded-lg border border-red-200 shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 border-b border-red-700">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Venue Conflicts Detected
                      </h3>
                    </div>
                    <div className="p-4 bg-red-50">
                      <p className="text-sm text-red-800 mb-2 font-medium">The following events conflict with this booking:</p>
                      <ul className="space-y-2">
                        {fullEventData.conflicts.map(conflict => (
                          <li key={conflict.id} className="text-sm bg-white p-2 rounded border border-red-200 text-red-700 flex justify-between items-center">
                            <span><strong>{conflict.name}</strong> ({conflict.status})</span>
                            <span className="text-xs bg-red-100 px-2 py-1 rounded">
                              {new Date(conflict.start_datetime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - 
                              {new Date(conflict.end_datetime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* No Conflicts Message */}
              {!fullEventData.has_conflicts && (
                 <div className="w-full">
                  <div className="bg-white rounded-lg border border-green-200 shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 border-b border-green-700">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Venue Availability
                      </h3>
                    </div>
                    <div className="p-4 bg-green-50">
                      <p className="text-sm text-green-800 font-medium flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        Venue is available for the selected time slot.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Equipment */}
              {fullEventData.equipment && fullEventData.equipment.length > 0 && (
                <div className="w-full">
                  <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 border-b border-orange-600">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Equipment & Resources
                      </h3>
                    </div>
                    <div className="p-4 bg-gradient-to-b from-slate-50 to-white">
                      <div className="flex flex-wrap gap-2">
                        {fullEventData.equipment.map((item, idx) => (
                          <span key={idx} className="px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg text-sm font-medium flex items-center gap-2">
                            {item.equipment_name}
                            <span className="bg-orange-200 text-orange-800 text-xs px-1.5 py-0.5 rounded-full">x{item.quantity}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Budget Breakdown */}
              {fullEventData.budget_breakdown && fullEventData.budget_breakdown.length > 0 && (
                <SmartBudgetBreakdown 
                  budgetData={{
                    totalBudget: fullEventData.budget || fullEventData.total_budget,
                    categories: fullEventData.budget_breakdown.map(b => b.category),
                    breakdown: fullEventData.budget_breakdown.reduce((acc, item) => {
                      acc[item.category] = { amount: item.amount, percentage: item.percentage };
                      return acc;
                    }, {}),
                    percentages: fullEventData.budget_breakdown.map(b => b.percentage)
                  }}
                  onUpdate={() => {}} // Read-only
                />
              )}

              {/* Activities / Timeline */}
              {fullEventData.activities && fullEventData.activities.length > 0 && (
                <EventTimelineGenerator 
                  timelineData={{
                    timeline: fullEventData.activities.map(activity => {
                      const name = activity.activity_name || '';
                      const timeMatch = name.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}):\s*(.*)$/);
                      
                      if (timeMatch) {
                        const start = timeMatch[1];
                        const end = timeMatch[2];
                        
                        // Calculate duration
                        let duration = 'N/A';
                        try {
                          const [sH, sM] = start.split(':').map(Number);
                          const [eH, eM] = end.split(':').map(Number);
                          const diff = (eH * 60 + eM) - (sH * 60 + sM);
                          if (diff >= 0) {
                              const h = Math.floor(diff / 60);
                              const m = diff % 60;
                              if (h > 0 && m > 0) duration = `${h} hr ${m} min`;
                              else if (h > 0) duration = `${h} hr`;
                              else duration = `${m} min`;
                          }
                        } catch (e) {}

                        return {
                          startTime: start,
                          endTime: end,
                          phase: timeMatch[3],
                          description: 'Planned activity',
                          duration: duration
                        };
                      }
                      
                      return {
                        startTime: 'TBD',
                        endTime: 'TBD',
                        phase: name,
                        description: 'Planned activity',
                        duration: 'N/A'
                      };
                    })
                  }}
                />
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              {isRescheduling ? (
                <div className="flex flex-col w-full gap-3 bg-yellow-50 p-3 rounded border border-yellow-200">
                  <div className="flex justify-between items-start">
                    <h4 className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      Reschedule Event
                    </h4>
                    <button onClick={() => setIsRescheduling(false)} className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-col">
                        <label className="text-xs font-bold text-gray-500 uppercase">New Date</label>
                        <input 
                          type="date" 
                          className="border rounded px-2 py-1 text-sm"
                          value={rescheduleDates.date}
                          onChange={e => {
                            setRescheduleDates({...rescheduleDates, date: e.target.value, startTime: '', endTime: ''});
                            fetchDaySchedule(e.target.value);
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col">
                          <label className="text-xs font-bold text-gray-500 uppercase">Start Time</label>
                          <select 
                            className="border rounded px-2 py-1 text-sm"
                            value={rescheduleDates.startTime}
                            onChange={e => setRescheduleDates({...rescheduleDates, startTime: e.target.value})}
                            disabled={!rescheduleDates.date}
                          >
                            <option value="">Select...</option>
                            {generateTimeSlots().map(time => {
                              const blocked = isTimeBlocked(time);
                              return (
                                <option key={time} value={time} disabled={blocked} className={blocked ? 'text-gray-400 bg-gray-100' : ''}>
                                  {time} {blocked ? '(Booked)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                        <div className="flex flex-col">
                          <label className="text-xs font-bold text-gray-500 uppercase">End Time</label>
                          <select 
                            className="border rounded px-2 py-1 text-sm"
                            value={rescheduleDates.endTime}
                            onChange={e => setRescheduleDates({...rescheduleDates, endTime: e.target.value})}
                            disabled={!rescheduleDates.startTime}
                          >
                            <option value="">Select...</option>
                            {generateTimeSlots().map(time => {
                              if (time <= rescheduleDates.startTime) return null;
                              const blocked = isTimeBlocked(time);
                              return (
                                <option key={time} value={time} disabled={blocked} className={blocked ? 'text-gray-400 bg-gray-100' : ''}>
                                  {time} {blocked ? '(Booked)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-2 rounded border border-gray-200 max-h-32 overflow-y-auto">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1 sticky top-0 bg-white">
                        {checkingSchedule ? 'Checking availability...' : `Booked Slots for ${rescheduleDates.date ? new Date(rescheduleDates.date).toLocaleDateString() : 'Selected Date'}`}
                      </p>
                      {daySchedule.length > 0 ? (
                        <ul className="space-y-1">
                          {daySchedule.map(evt => (
                            <li key={evt.id} className="text-xs flex justify-between text-gray-600 bg-gray-50 p-1 rounded">
                              <span>{new Date(evt.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(evt.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                              <span className="truncate max-w-[100px]">{evt.title}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No other bookings for this venue on this day.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-2">
                    <button 
                      onClick={() => setIsRescheduling(false)}
                      className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleRescheduleConfirm}
                      className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium shadow-sm"
                    >
                      Confirm & Send to Pending
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => setShowReviewModal(false)} 
                    disabled={loading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-semibold transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  
                  {fullEventData.has_conflicts ? (
                    <button 
                      onClick={() => {
                        setIsRescheduling(true);
                        const start = fullEventData.start_datetime ? fullEventData.start_datetime.slice(0, 16) : '';
                        setRescheduleDates({ date: start, startTime: '', endTime: '' });
                        fetchDaySchedule(start);
                      }} 
                      disabled={loading}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Suggest Reschedule
                    </button>
                  ) : (
                    <button 
                      onClick={() => confirmApproval()} 
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition disabled:opacity-50 shadow-sm"
                    >
                      {loading ? 'Processing...' : 'Approve Event'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-xl font-bold text-gray-900">Reject Event</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Reason for Rejection</label>
                <select 
                  value={selectedReason} 
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                >
                  <option value="">Select a reason...</option>
                  {rejectReasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {selectedReason === 'Other (specify below)' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                  <textarea 
                    value={customNote} 
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Provide details..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  />
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button 
                onClick={() => { setShowRejectModal(false); setSelectedReason(''); setCustomNote(''); }} 
                disabled={loading}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleReject} 
                disabled={loading || !selectedReason} 
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Processing...' : 'Reject Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
