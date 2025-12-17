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
  const [aiPlan, setAiPlan] = useState(null);
  const [rescheduleTimeline, setRescheduleTimeline] = useState([]);
  const [manualEnd, setManualEnd] = useState(false);

  // Timeline helpers
  const format12h = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m);
    return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
  };

  const getDurationMinutes = (phase) => {
    if (typeof phase.duration === 'number') return phase.duration;
    if (phase.duration && typeof phase.duration === 'string') {
      const m = phase.duration.match(/(\d+)\s*hr/i);
      const n = phase.duration.match(/(\d+)\s*min/i);
      return (m ? parseInt(m[1], 10) * 60 : 0) + (n ? parseInt(n[1], 10) : 0);
    }
    const startSrc = phase.rawStart || phase.startTime;
    const endSrc = phase.rawEnd || phase.endTime;
    if (startSrc && endSrc && /^\d{2}:\d{2}$/.test(startSrc) && /^\d{2}:\d{2}$/.test(endSrc)) {
      const [sH, sM] = startSrc.split(':').map(Number);
      const [eH, eM] = endSrc.split(':').map(Number);
      return Math.max(0, (eH * 60 + eM) - (sH * 60 + sM));
    }
    return 0;
  };

  const rebuildTimeline = (phases, startISO, endISO = null) => {
    if (!phases || !phases.length || !startISO) return [];
    let cursor = new Date(startISO);
    let available = null;
    if (endISO) available = Math.max(1, (new Date(endISO) - cursor) / 60000);
    const totalAi = phases.reduce((s, p) => s + getDurationMinutes(p), 0) || 1;
    const scale = available ? Math.max(0.25, available / totalAi) : 1;

    const result = [];
    for (const p of phases) {
      const dur = Math.max(1, Math.round(getDurationMinutes(p) * scale));
      let end = new Date(cursor.getTime() + dur * 60000);
      if (endISO && end > new Date(endISO)) end = new Date(endISO);
      const startRaw = cursor.toTimeString().slice(0,5);
      const endRaw = end.toTimeString().slice(0,5);
      result.push({
        ...p,
        rawStart: startRaw,
        rawEnd: endRaw,
        startTime: format12h(startRaw),
        endTime: format12h(endRaw),
        duration: dur
      });
      cursor = end;
    }
    return result;
  };

  const addMinutesToTime = (timeStr, minutes, dateStr) => {
    const base = new Date(`${dateStr}T${timeStr}:00`);
    base.setMinutes(base.getMinutes() + minutes);
    const hh = base.getHours().toString().padStart(2, '0');
    const mm = base.getMinutes().toString().padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const ensureAiPlan = async () => {
    if (aiPlan) return aiPlan;
    const res = await fetch('/api/ml/predict-resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventName: fullEventData?.name || event.name,
        eventType: fullEventData?.event_type || fullEventData?.type || event.type,
        attendees: fullEventData?.expected_attendees || fullEventData?.attendees || 100
      })
    });
    const data = await res.json();
    const plan = data.success && data.timeline ? data.timeline : [];
    setAiPlan(plan);
    return plan;
  };

  const refreshRescheduleTimeline = async (dateStr, startTimeStr, endTimeOverride = null) => {
    if (!dateStr || !startTimeStr) return;
    const plan = await ensureAiPlan();
    if (!plan.length) {
      setRescheduleTimeline([]);
      return;
    }
    const isoStart = `${dateStr}T${startTimeStr}:00`;
    const endStr = endTimeOverride || rescheduleDates.endTime;
    const isoEnd = endStr ? `${dateStr}T${endStr}:00` : null;
    setRescheduleTimeline(rebuildTimeline(plan, isoStart, isoEnd));
    if (!manualEnd) {
      const totalMinutes = plan.reduce((sum, p) => sum + getDurationMinutes(p), 0) || 60;
      const autoEnd = addMinutesToTime(startTimeStr, totalMinutes, dateStr);
      setRescheduleDates(prev => ({ ...prev, endTime: autoEnd }));
    }
  };

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole = user?.role_name;

  // Helper function to format datetime to 12-hour time without timezone issues
  const formatTime12Hour = (datetimeStr) => {
    if (!datetimeStr) return '';
    
    try {
      // Handle different datetime formats
      let timePart;
      
      // Check for RFC 2822 format: "Fri, 19 Dec 2025 07:00:00 GMT"
      const rfcMatch = datetimeStr.match(/(\d{2}):(\d{2}):(\d{2})/);
      if (rfcMatch) {
        timePart = `${rfcMatch[1]}:${rfcMatch[2]}`;
      }
      // Check for ISO format with T: "2025-12-19T07:00:00"
      else if (datetimeStr.includes('T') && !datetimeStr.includes('GMT')) {
        timePart = datetimeStr.split('T')[1]?.substring(0, 5);
      }
      // Check for space-separated format: "2025-12-19 07:00:00"
      else if (datetimeStr.match(/\d{4}-\d{2}-\d{2}\s/)) {
        timePart = datetimeStr.split(' ')[1]?.substring(0, 5);
      }
      
      if (!timePart || !timePart.includes(':')) return '';
      
      const [hours24, minutes] = timePart.split(':').map(Number);
      if (isNaN(hours24) || isNaN(minutes)) return '';
      
      const period = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = hours24 % 12 || 12;
      
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch (e) {
      console.error('Error formatting time:', datetimeStr, e);
      return '';
    }
  };

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
    
    const startDateTime = `${rescheduleDates.date}T${rescheduleDates.startTime}:00`;
    const endDateTime = `${rescheduleDates.date}T${rescheduleDates.endTime}:00`;

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
    
    const startDateTime = `${rescheduleDates.date}T${rescheduleDates.startTime}:00`;
    const endDateTime = `${rescheduleDates.date}T${rescheduleDates.endTime}:00`;

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
      // Use cached AI plan or fetch once
      const baseTimeline = await ensureAiPlan();
      const adjustedTimeline = rebuildTimeline(
        baseTimeline,
        `${rescheduleDates.date}T${rescheduleDates.startTime}:00`,
        `${rescheduleDates.date}T${rescheduleDates.endTime}:00`
      );
      const activities = adjustedTimeline.map(p => `${p.rawStart} - ${p.rawEnd}: ${p.phase}`);

      const response = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          start_datetime: startDateTime,
          end_datetime: endDateTime,
          status: 'Pending',
          reason: 'Rescheduled by Admin due to conflict',
          activities
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Event rescheduled and sent to Pending status.');
        setShowReviewModal(false);
        setIsRescheduling(false);
        setFullEventData(null); // Clear state to force fresh fetch
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
      // Add cache busting to ensure fresh data
      const res = await fetch(`/api/events/${event.id}?_=${Date.now()}`, { 
        credentials: 'include',
        cache: 'no-store'
      });
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
        setFullEventData(null);
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

      {/* Review Modal - OPTIMIZED DASHBOARD LAYOUT */}
      {showReviewModal && fullEventData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden">
            
            {/* Header - Fixed */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                {isRescheduling ? (
                    <span className="flex items-center gap-2 text-yellow-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Reschedule Event Mode
                    </span>
                ) : (
                    <>
                        Review Event Details
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${fullEventData.has_conflicts ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                            {fullEventData.has_conflicts ? 'Conflict Detected' : 'Clear'}
                        </span>
                    </>
                )}
              </h2>
              <button onClick={() => { setShowReviewModal(false); setFullEventData(null); setIsRescheduling(false); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Main Content - Swappable Views */}
            <div className="p-4 bg-gray-50 flex-1 overflow-y-auto">
              {!isRescheduling ? (
                  // STANDARD VIEW: 3-Column Grid Details
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
                    {/* COLUMN 1: Basic Info, Venue Status, & Equipment */}
                    <div className="flex flex-col gap-4">
                      {/* Basic Info */}
                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex-shrink-0">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                           <h3 className="text-xs font-bold text-slate-700 uppercase">Event Overview</h3>
                        </div>
                        <div className="p-3">
                          <div className="space-y-3">
                            <div><span className="text-[10px] text-slate-500 uppercase font-bold block">Event Name</span><p className="text-sm font-semibold text-slate-800">{fullEventData.name}</p></div>
                            <div className="grid grid-cols-2 gap-2">
                               <div><span className="text-[10px] text-slate-500 uppercase font-bold block">Type</span><p className="text-sm text-slate-800">{fullEventData.event_type || fullEventData.type}</p></div>
                               <div><span className="text-[10px] text-slate-500 uppercase font-bold block">Venue</span><p className="text-sm text-slate-800">{fullEventData.venue}</p></div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <div><span className="text-[10px] text-slate-500 uppercase font-bold block">Date</span><p className="text-sm text-slate-800">{fullEventData.start_datetime ? new Date(fullEventData.start_datetime).toLocaleDateString() : fullEventData.date}</p></div>
                               <div><span className="text-[10px] text-slate-500 uppercase font-bold block">Time</span><p className="text-sm text-slate-800">
                                {formatTime12Hour(fullEventData.start_datetime)} - {formatTime12Hour(fullEventData.end_datetime)}
                              </p></div>
                            </div>
                            {fullEventData.description && (
                              <div className="pt-2 border-t border-slate-100">
                                <span className="text-[10px] text-slate-500 uppercase font-bold block">Description</span>
                                <p className="text-xs text-slate-600 leading-snug line-clamp-3">{fullEventData.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Card */}
                      <div className="flex-shrink-0">
                      {fullEventData.has_conflicts ? (
                        <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
                          <div className="bg-red-50 px-3 py-2 border-b border-red-100">
                            <h3 className="text-xs font-bold text-red-700 flex items-center gap-2">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                              Conflicts Detected
                            </h3>
                          </div>
                          <div className="p-2 overflow-y-auto max-h-[150px]">
                            <ul className="space-y-1">
                              {fullEventData.conflicts.map(conflict => (
                                <li key={conflict.id} className="text-xs bg-red-50 p-2 rounded border border-red-100 text-red-800">
                                  <div className="font-bold">{conflict.name}</div>
                                  <div>{formatTime12Hour(conflict.start_datetime)} - {formatTime12Hour(conflict.end_datetime)}</div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : (
                         <div className="bg-white rounded-lg border border-green-200 shadow-sm overflow-hidden">
                          <div className="bg-green-50 px-3 py-2 border-b border-green-100">
                            <h3 className="text-xs font-bold text-green-700">Venue Status</h3>
                          </div>
                          <div className="p-3 bg-green-50/50 text-green-800 text-xs flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            Venue is available.
                          </div>
                        </div>
                      )}
                      </div>

                      {/* Equipment */}
                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                           <h3 className="text-xs font-bold text-slate-700 uppercase">Equipment ({fullEventData.equipment ? fullEventData.equipment.length : 0})</h3>
                        </div>
                        <div className="p-3 bg-white flex-1 overflow-y-auto min-h-[100px]">
                          {fullEventData.equipment && fullEventData.equipment.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {fullEventData.equipment.map((item, idx) => (
                                <span key={idx} className="px-2 py-1 bg-orange-50 text-orange-700 border border-orange-200 rounded text-xs font-medium flex items-center gap-1">
                                  {item.equipment_name}
                                  <span className="bg-orange-200 text-orange-800 text-[10px] px-1 rounded-full">x{item.quantity}</span>
                                </span>
                              ))}
                            </div>
                          ) : <p className="text-xs text-gray-400 italic">No equipment requested.</p>}
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 2: Budget Breakdown (Full Height) */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                         <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                           <h3 className="text-xs font-bold text-slate-700 uppercase">Budget Analysis</h3>
                           <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Total: ₱{fullEventData.budget || fullEventData.total_budget}</span>
                        </div>
                        <div className="p-3 flex-1 overflow-y-auto">
                           {fullEventData.budget_breakdown && (
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
                              onUpdate={() => {}} 
                            />
                          )}
                        </div>
                    </div>

                    {/* COLUMN 3: Timeline (Full Height) */}
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                      <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                          <h3 className="text-xs font-bold text-slate-700 uppercase">Event Schedule</h3>
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto">
                        {fullEventData.activities && fullEventData.activities.length > 0 ? (
                            <EventTimelineGenerator 
                            timelineData={{
                                timeline: fullEventData.activities.map(activity => {
                                const name = activity.activity_name || '';
                                const timeMatch = name.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}):\s*(.*)$/);
                                if (timeMatch) {
                                    const start = timeMatch[1];
                                    const end = timeMatch[2];
                                    let duration = 'N/A';
                                    try {
                                    const [sH, sM] = start.split(':').map(Number);
                                    const [eH, eM] = end.split(':').map(Number);
                                    const diff = (eH * 60 + eM) - (sH * 60 + sM);
                                    if (diff >= 0) {
                                        const h = Math.floor(diff / 60);
                                        const m = diff % 60;
                                        if (h > 0 && m > 0) duration = `${h}h ${m}m`;
                                        else if (h > 0) duration = `${h}h`;
                                        else duration = `${m}m`;
                                    }
                                    } catch (e) {}
                                    return { startTime: start, endTime: end, phase: timeMatch[3], description: 'Planned activity', duration: duration };
                                }
                                return { startTime: 'TBD', endTime: 'TBD', phase: name, description: 'Planned activity', duration: 'N/A' };
                                })
                            }}
                            />
                        ) : <p className="text-xs text-gray-400 italic">No activities listed.</p>}
                      </div>
                    </div>
                  </div>
              ) : (
                  // RESCHEDULE VIEW: REPLACES MAIN CONTENT (Full Screen Mode)
                  <div className="flex flex-col h-full gap-4">
                      {/* Controls Toolbar */}
                      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex flex-wrap gap-4 items-end shadow-sm flex-shrink-0">
                         <div className="flex flex-col">
                           <label className="text-xs font-bold text-yellow-800 uppercase mb-1">New Date</label>
                           <input 
                              type="date" 
                              className="border border-yellow-300 rounded px-3 py-1.5 text-sm bg-white shadow-sm focus:ring-2 focus:ring-yellow-400 outline-none" 
                              value={rescheduleDates.date}
                              onChange={e => {
                                setRescheduleDates({...rescheduleDates, date: e.target.value, startTime: '', endTime: ''});
                                fetchDaySchedule(e.target.value);
                              }}
                           />
                         </div>
                         <div className="flex flex-col">
                           <label className="text-xs font-bold text-yellow-800 uppercase mb-1">Start Time</label>
                           <select 
                              className="border border-yellow-300 rounded px-3 py-1.5 text-sm bg-white shadow-sm focus:ring-2 focus:ring-yellow-400 outline-none min-w-[120px]"
                              value={rescheduleDates.startTime}
                              onChange={e => {
                                setRescheduleDates({...rescheduleDates, startTime: e.target.value});
                                setManualEnd(false);
                                refreshRescheduleTimeline(rescheduleDates.date, e.target.value);
                              }}
                              disabled={!rescheduleDates.date}
                           >
                              <option value="">Select...</option>
                              {generateTimeSlots().map(time => {
                                const blocked = isTimeBlocked(time);
                                return <option key={time} value={time} disabled={blocked} className={blocked ? 'bg-gray-100 text-gray-400' : ''}>{format12h(time)} {blocked ? '(Booked)' : ''}</option>
                              })}
                           </select>
                         </div>
                         <div className="flex flex-col">
                           <label className="text-xs font-bold text-yellow-800 uppercase mb-1">End Time</label>
                           <select 
                              className="border border-yellow-300 rounded px-3 py-1.5 text-sm bg-white shadow-sm focus:ring-2 focus:ring-yellow-400 outline-none min-w-[120px]"
                              value={rescheduleDates.endTime}
                              onChange={e => {
                                setManualEnd(true);
                                setRescheduleDates({...rescheduleDates, endTime: e.target.value});
                                refreshRescheduleTimeline(rescheduleDates.date, rescheduleDates.startTime, e.target.value);
                              }}
                              disabled={!rescheduleDates.startTime}
                           >
                              <option value="">Select...</option>
                              {generateTimeSlots().map(time => {
                                 if (time <= rescheduleDates.startTime) return null;
                                 const blocked = isTimeBlocked(time);
                                 return <option key={time} value={time} disabled={blocked} className={blocked ? 'bg-gray-100 text-gray-400' : ''}>{format12h(time)} {blocked ? '(Booked)' : ''}</option>
                              })}
                           </select>
                         </div>
                      </div>

                      {/* Main Visualization Area (Split) */}
                      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
                         {/* Left: Booked Slots List */}
                         <div className="bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                               <h3 className="text-xs font-bold text-gray-500 uppercase">Booked Slots</h3>
                               <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{daySchedule.length}</span>
                            </div>
                            <div className="overflow-y-auto p-2 flex-1 space-y-2">
                               {daySchedule.length > 0 ? (
                                  daySchedule.map(evt => (
                                    <div key={evt.id} className="p-2 bg-gray-50 rounded border border-gray-100 text-xs">
                                       <div className="font-bold text-gray-700">{evt.title}</div>
                                       <div className="text-gray-500">{new Date(evt.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(evt.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                                    </div>
                                  ))
                               ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs italic p-4 text-center">
                                     <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                     No conflicting bookings found for this date.
                                  </div>
                               )}
                            </div>
                         </div>

                         {/* Right: Full Timeline - Container Removed */}
                         <div className="lg:col-span-3 flex flex-col min-h-0">
                               {rescheduleTimeline.length > 0 ? (
                                  <div className="h-full overflow-y-auto pr-1">
                                     <EventTimelineGenerator timelineData={{ timeline: rescheduleTimeline }} />
                                  </div>
                               ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg bg-white">
                                     <span>Select a Date and Start Time to preview the generated timeline.</span>
                                  </div>
                               )}
                         </div>
                      </div>
                  </div>
              )}
            </div>

            {/* Footer - Buttons */}
            <div className="bg-white px-6 py-3 border-t border-gray-200 flex-shrink-0 flex justify-end gap-3">
              {isRescheduling ? (
                <>
                  <button 
                    onClick={() => setIsRescheduling(false)} 
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-semibold transition shadow-sm text-gray-700"
                  >
                    Cancel Reschedule
                  </button>
                  <button 
                    onClick={handleRescheduleConfirm} 
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition shadow-sm flex items-center gap-2"
                  >
                    <span>Confirm & Update</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setShowReviewModal(false); setFullEventData(null); setIsRescheduling(false); }} disabled={loading} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-semibold transition disabled:opacity-50">Cancel</button>
                  {fullEventData.has_conflicts ? (
                    <button onClick={() => { 
                      setIsRescheduling(true); 
                      // FIX: Ensure YYYY-MM-DD format strictly for input[type=date]
                      const start = fullEventData.start_datetime ? fullEventData.start_datetime.substring(0, 10) : ''; 
                      setRescheduleDates({ date: start, startTime: '', endTime: '' }); 
                      fetchDaySchedule(start); 
                    }} disabled={loading} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Suggest Reschedule
                    </button>
                  ) : (
                    <button onClick={() => confirmApproval()} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition disabled:opacity-50 shadow-sm">{loading ? 'Processing...' : 'Approve Event'}</button>
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
                <select value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none">
                  <option value="">Select a reason...</option>
                  {rejectReasons.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {selectedReason === 'Other (specify below)' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                  <textarea value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="Provide details..." rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none" />
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
              <button onClick={() => { setShowRejectModal(false); setSelectedReason(''); setCustomNote(''); }} disabled={loading} className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-semibold transition disabled:opacity-50">Cancel</button>
              <button onClick={handleReject} disabled={loading || !selectedReason} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition">{loading ? 'Processing...' : 'Reject Event'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}