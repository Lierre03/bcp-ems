// ApprovalActions Component - Reusable approval workflow actions
const { useState } = React;

window.ApprovalActions = function ApprovalActions({ event, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
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
  const [activeTab, setActiveTab] = useState('overview'); // Tab state for review modal

  const safeAlert = (msg, title='Alert') => {
      if (window.showAlert) window.showAlert(msg, title);
      else alert(msg);
  };

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
      const startRaw = cursor.toTimeString().slice(0, 5);
      const endRaw = end.toTimeString().slice(0, 5);
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
      safeAlert('Please select date, start time, and end time', 'Validation Error');
      return;
    }

    const startDateTime = `${rescheduleDates.date}T${rescheduleDates.startTime}:00`;
    const endDateTime = `${rescheduleDates.date}T${rescheduleDates.endTime}:00`;

    if (new Date(startDateTime) >= new Date(endDateTime)) {
      safeAlert('End time must be after start time', 'Validation Error');
      return;
    }

    // Check conflicts
    const hasConflicts = await checkConflicts();
    if (hasConflicts) {
      safeAlert('The selected time slot conflicts with an existing booking. Please choose a different time.', 'Conflict Detected');
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
        safeAlert('Event rescheduled and sent to Pending status.', 'Success');
        setShowReviewModal(false);
        setIsRescheduling(false);
        setFullEventData(null); // Clear state to force fresh fetch
        if (onSuccess) onSuccess();
      } else {
        safeAlert(data.error || 'Failed to reschedule', 'Error');
      }
    } catch (err) {
      console.error(err);
      safeAlert('Error rescheduling event', 'System Error');
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
    // Super Admin: Review & Approve at Pending/Under Review, Reject any status
    const isPastEvent = () => {
      const eventDate = new Date(event.start_datetime || event.date);
      const now = new Date();
      // Reset hours to compare just dates if you want strict day comparison, 
      // or compare full timestamps. User said "dates were past", so let's check full timestamp.
      return eventDate < now;
    };

    if (isPastEvent() && status !== 'Completed' && status !== 'Archived') {
      // If event is in the past, no approval actions allowed.
      // Unless it's already approved/ongoing/completed, in which case we might show Archive?
      // For Pending/Under Review past events, they should probably be Rejected or just not actionable.
      // User said: "approval button must now be there anymore"
      if (status === 'Pending' || status === 'Under Review') {
        if (isSuperAdmin) {
          // Optional: Allow Super Admin to reject past pending events
          actions.push({ label: 'Reject (Past Event)', endpoint: 'reject', variant: 'danger' });
        }
        return actions;
      }
    }

    if (isSuperAdmin) {
      if (status === 'Pending' || status === 'Under Review') {
        actions.push({ label: 'Review & Approve', endpoint: 'superadmin-approve', variant: 'success' });
      }
      // Only show Reject if not already finalized (Approved, Rejected, Completed, Archived)
      if (!['Approved', 'Rejected', 'Completed', 'Archived'].includes(status)) {
        actions.push({ label: 'Reject', endpoint: 'reject', variant: 'danger' });
      }
      return actions;
    }

    // Admin (Dept Head): Approve concept at Pending → changes to Under Review
    if (isAdmin && status === 'Pending') {
      actions.push({ label: 'Approve Concept', endpoint: 'review', variant: 'success' });
      actions.push({ label: 'Reject', endpoint: 'reject', variant: 'danger' });
      return actions;
    }

    // Staff (Facilities): Approve resources at Under Review → changes to Approved (triggers auto-reject)
    if (isStaffOnly && status === 'Under Review') {
      actions.push({ label: 'Approve Resources', endpoint: 'approve-forward', variant: 'primary' });
      actions.push({ label: 'Reject', endpoint: 'reject', variant: 'danger' });
      return actions;
    }

    console.log('📋 getAvailableActions:', actions);
    return actions;
  };

  const fetchFullEventData = async () => {
    setLoading(true);
    console.log('📥 fetchFullEventData started...');
    try {
      // Add cache busting to ensure fresh data
      const res = await fetch(`/api/events/${event.id}?_=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await res.json();
      console.log('📊 Full Event Data Received:', data.event);
      console.log('  - Equipment:', data.event?.equipment);
      console.log('  - Timeline:', data.event?.timeline);
      console.log('  - Budget Breakdown:', data.event?.budget_breakdown);
      console.log('  - Additional Resources:', data.event?.additional_resources);
      if (data.success) {
        setFullEventData(data.event);
        setShowReviewModal(true);
      } else {
        safeAlert('Failed to load event details', 'Error');
      }
    } catch (err) {
      console.error('Failed to fetch event:', err);
      safeAlert('Error loading event details', 'Network Error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (endpoint) => {
    console.log('🚀 handleApprovalAction called with endpoint:', endpoint);
    if (endpoint === 'superadmin-approve' || endpoint === 'review' || endpoint === 'approve-forward') {
      console.log('  -> Triggering Review Modal...');
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
        credentials: 'include',
        body: JSON.stringify({}) // Send empty JSON object
      });
      const data = await res.json();
      if (data.success) {
        safeAlert(data.message || 'Action completed successfully', 'Success');
        if (onSuccess) onSuccess();
      } else {
        safeAlert(data.message || 'Action failed', 'Error');
      }
    } catch (err) {
      console.error('Action failed:', err);
      safeAlert('Error performing action', 'System Error');
    } finally {
      setLoading(false);
    }
  };



  const performApproval = async (endpoint, payload = {}) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message || 'Action completed successfully');
        setShowSuccessModal(true);
        setShowReviewModal(false);
        setFullEventData(null);
        // Do NOT call onSuccess here to prevent unmounting/refreshing before the user sees the modal
      } else {
        safeAlert(data.message || 'Action failed', 'Error');
      }
    } catch (err) {
      console.error('Action failed:', err);
      safeAlert('Error performing action', 'System Error');
    } finally {
      setLoading(false);
    }
  };

  const confirmApproval = async (actionOnConflict = null) => {
    // Legacy support for superadmin confirm with conflict handling
    await performApproval('superadmin-approve', { action_on_conflict: actionOnConflict });
  };

  const handleReject = async () => {
    if (!selectedReason) {
      safeAlert('Please select a rejection reason', 'Validation Error');
      return;
    }

    // Build the full reason
    let reason;
    if (selectedReason === 'Other (specify below)') {
      // For "Other", custom note is required
      if (!customNote.trim()) {
        safeAlert('Please provide rejection details', 'Validation Error');
        return;
      }
      reason = customNote.trim();
    } else {
      // For predefined reasons, combine with custom note if provided
      reason = customNote.trim()
        ? `${selectedReason}: ${customNote.trim()}`
        : selectedReason;
    }

    // Validate minimum length
    if (reason.length < 10) {
      safeAlert('Rejection reason must be at least 10 characters', 'Validation Error');
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
        safeAlert(data.message || 'Event rejected', 'Rejected');
        setShowRejectModal(false);
        setSelectedReason('');
        setCustomNote('');
        if (onSuccess) onSuccess();
      } else {
        safeAlert(data.message || 'Rejection failed', 'Error');
      }
    } catch (err) {
      console.error('Rejection failed:', err);
      safeAlert('Error rejecting event', 'System Error');
    } finally {
      setLoading(false);
    }
  };

  const actions = getAvailableActions();

  // If no action is available (e.g. Approved, Rejected, Completed), show a status badge or summary
  // If no action is available, show a clean visual indicator
  if (!actions.length) {
    const status = event.status;

    // Default: Waiting (Hourglass) - for states where user has no action but event is ongoing
    let icon = (
      <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
    let title = "Waiting for other approvals";
    let bgClass = "bg-slate-50";

    if (status === 'Approved') {
      title = "Approved";
      bgClass = "bg-green-50";
      icon = (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (status === 'Rejected') {
      title = "Rejected";
      bgClass = "bg-red-50";
      icon = (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    } else if (status === 'Completed') {
      title = "Completed";
      bgClass = "bg-blue-50";
      icon = (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }

    return (
      <div className="flex items-center justify-center w-full" title={title}>
        <div className={`p-1.5 rounded-full ${bgClass} transition-colors`}>
          {icon}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1 w-full">
      {actions.map(action => {
        const isReject = action.variant === 'danger';
        const isReview = action.endpoint === 'superadmin-approve';
        const isApprove = action.variant === 'success' && !isReview;

        return (
          <button
            key={action.endpoint}
            onClick={() => handleApprovalAction(action.endpoint)}
            disabled={loading}
            className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isReject ? 'text-red-600 hover:bg-red-50' :
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
                // STANDARD VIEW: Tabbed Interface
                <div className="flex flex-col h-full">
                  {/* Tab Navigation */}
                  <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm border border-slate-200">
                    <button
                      onClick={() => setActiveTab('overview')}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${activeTab === 'overview'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab('budget')}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${activeTab === 'budget'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Budget
                    </button>
                    <button
                      onClick={() => setActiveTab('timeline')}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${activeTab === 'timeline'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Timeline
                    </button>
                    <button
                      onClick={() => setActiveTab('resources')}
                      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${activeTab === 'resources'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Resources
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto">
                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                      <div className="max-w-4xl mx-auto">
                        {/* Basic Info */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="p-6">
                            <div className="space-y-5">
                              <div>
                                <span className="text-xs text-slate-500 uppercase font-semibold block mb-1.5 tracking-wide">Event Name</span>
                                <p className="text-xl font-bold text-slate-900">{fullEventData.name}</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-lg p-4">
                                  <span className="text-xs text-slate-500 uppercase font-semibold block mb-1.5 tracking-wide">Type</span>
                                  <p className="text-base font-medium text-slate-800">{fullEventData.event_type || fullEventData.type}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                  <span className="text-xs text-slate-500 uppercase font-semibold block mb-1.5 tracking-wide">Venue</span>
                                  <p className="text-base font-medium text-slate-800">{fullEventData.venue}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-slate-50 rounded-lg p-4">
                                  <span className="text-xs text-slate-500 uppercase font-semibold block mb-1.5 tracking-wide">Date</span>
                                  <p className="text-base font-medium text-slate-800">{fullEventData.start_datetime ? new Date(fullEventData.start_datetime).toLocaleDateString() : fullEventData.date}</p>
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4">
                                  <span className="text-xs text-slate-500 uppercase font-semibold block mb-1.5 tracking-wide">Time</span>
                                  <p className="text-base font-medium text-slate-800">
                                    {formatTime12Hour(fullEventData.start_datetime)} - {formatTime12Hour(fullEventData.end_datetime)}
                                  </p>
                                </div>
                              </div>
                              {fullEventData.description && (
                                <div className="pt-4 mt-4 border-t border-slate-200">
                                  <span className="text-xs text-slate-500 uppercase font-semibold block mb-2 tracking-wide">Description</span>
                                  <p className="text-base text-slate-700 leading-relaxed">{fullEventData.description}</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Venue Status - Integrated */}
                          <div className="px-6 pb-6">
                            {fullEventData.has_conflicts ? (
                              <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-red-200 p-4">
                                <h4 className="text-sm font-bold text-red-700 flex items-center gap-2 mb-3">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                  Venue Conflicts Detected
                                </h4>
                                <ul className="space-y-2">
                                  {fullEventData.conflicts.map(conflict => (
                                    <li key={conflict.id} className="bg-white p-3 rounded-lg border border-red-200 shadow-sm">
                                      <div className="font-bold text-sm text-red-900">{conflict.name}</div>
                                      <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        {formatTime12Hour(conflict.start_datetime)} - {formatTime12Hour(conflict.end_datetime)}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : (
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-4 flex items-center gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-green-700">Venue Available</h4>
                                  <p className="text-xs text-green-600 mt-0.5">No scheduling conflicts detected</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* BUDGET TAB */}
                    {activeTab === 'budget' && (
                      <div className="max-w-4xl mx-auto">
                        {(() => {
                          const parsedData = fullEventData.budget_breakdown
                            ? (typeof fullEventData.budget_breakdown === 'string'
                              ? JSON.parse(fullEventData.budget_breakdown)
                              : fullEventData.budget_breakdown)
                            : null;

                          if (parsedData && typeof parsedData === 'object') {
                            // Helper to check for empty breakdown (legacy empty dict)
                            const isEmpty = Object.keys(parsedData).length === 0;
                            if (isEmpty) {
                              return (
                                <div className="text-center py-12">
                                  <p className="text-sm text-gray-400 italic">No budget breakdown available.</p>
                                </div>
                              );
                            }

                            // Check if it's the full structure (has categories/breakdown keys) or just the breakdown dictionary
                            const isFullStructure = Array.isArray(parsedData.categories) && typeof parsedData.breakdown === 'object';

                            const budgetData = isFullStructure ? {
                              totalBudget: fullEventData.budget || fullEventData.total_budget,
                              categories: parsedData.categories,
                              breakdown: parsedData.breakdown,
                              percentages: parsedData.percentages || []
                            } : {
                              // Legacy format: parsedData IS the breakdown dictionary
                              totalBudget: fullEventData.budget || fullEventData.total_budget,
                              categories: Object.keys(parsedData),
                              breakdown: parsedData,
                              percentages: Object.values(parsedData).map(d => d.percentage)
                            };

                            return (
                              <SmartBudgetBreakdown
                                budgetData={budgetData}
                                onUpdate={() => { }}
                              />
                            );
                          }

                          return (
                            <div className="text-center py-12">
                              <p className="text-sm text-gray-400 italic">No budget breakdown available.</p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* TIMELINE TAB */}
                    {activeTab === 'timeline' && (
                      <div className="max-w-4xl mx-auto">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 border-b border-slate-200">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              EVENT SCHEDULE
                            </h3>
                          </div>
                          <div className="p-6">
                            {(() => {
                              const timeline = fullEventData.timeline
                                ? (typeof fullEventData.timeline === 'string' ? JSON.parse(fullEventData.timeline) : fullEventData.timeline)
                                : fullEventData.activities;

                              if (timeline && timeline.length > 0) {
                                return (
                                  <EventTimelineGenerator
                                    timelineData={{ timeline }}
                                    onUpdate={() => { }}
                                  />
                                );
                              }

                              return (
                                <div className="text-center py-12">
                                  <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <p className="text-sm text-gray-400 italic">No timeline activities available.</p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* RESOURCES TAB */}
                    {activeTab === 'resources' && (
                      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Equipment */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                          <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-4 border-b border-slate-200">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                              </svg>
                              EQUIPMENT ({fullEventData.equipment ? fullEventData.equipment.length : 0})
                            </h3>
                          </div>
                          <div className="p-5">
                            {fullEventData.equipment && fullEventData.equipment.length > 0 ? (
                              <ul className="space-y-2">
                                {fullEventData.equipment.map((item, idx) => {
                                  const itemName = typeof item === 'string' ? item : (item.equipment_name || item.name || item);
                                  const quantity = typeof item === 'string' ? 1 : (item.quantity || 1);
                                  return (
                                    <li key={idx} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors">
                                      <span className="text-sm font-medium text-orange-900 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                        {itemName}
                                      </span>
                                      {quantity >= 1 && (
                                        <span className="bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">×{quantity}</span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-400 italic text-center py-8">No equipment requested.</p>
                            )}
                          </div>
                        </div>

                        {/* Additional Resources */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden">
                          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-5 py-4 border-b border-slate-200">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              ADDITIONAL RESOURCES ({fullEventData.additional_resources ? fullEventData.additional_resources.length : 0})
                            </h3>
                          </div>
                          <div className="p-5">
                            {fullEventData.additional_resources && fullEventData.additional_resources.length > 0 ? (
                              <ul className="space-y-2">
                                {fullEventData.additional_resources.map((resource, idx) => {
                                  const resourceName = typeof resource === 'string' ? resource : (resource.name || 'Unknown Item');
                                  const resourceDesc = typeof resource === 'object' && resource.description ? resource.description : '';
                                  return (
                                    <li key={idx} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors">
                                      <svg className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                      </svg>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-purple-900">{resourceName}</span>
                                        {resourceDesc && <span className="text-xs text-purple-700">{resourceDesc}</span>}
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : (
                              <p className="text-sm text-gray-400 italic text-center py-8">No additional resources requested.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
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
                          setRescheduleDates({ ...rescheduleDates, date: e.target.value, startTime: '', endTime: '' });
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
                          setRescheduleDates({ ...rescheduleDates, startTime: e.target.value });
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
                          setRescheduleDates({ ...rescheduleDates, endTime: e.target.value });
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
                              <div className="text-gray-500">{new Date(evt.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(evt.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                  <button onClick={() => {
                    // Determine correct endpoint based on role/status
                    const actions = getAvailableActions();
                    const approveAction = actions.find(a => a.variant === 'success' || a.variant === 'primary');
                    if (approveAction) {
                      if (approveAction.endpoint === 'superadmin-approve') {
                        confirmApproval();
                      } else {
                        // Direct API call
                        performApproval(approveAction.endpoint);
                      }
                    }
                  }} disabled={loading} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold transition disabled:opacity-50 shadow-sm">
                    {loading ? 'Processing...' : (fullEventData.has_conflicts && isSuperAdmin ? 'Approve (Auto-reject Conflicts)' : 'Approve Event')}
                  </button>
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
              {selectedReason && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {selectedReason === 'Other (specify below)' ? 'Specify Reason' : 'Additional Details (Optional)'}
                  </label>
                  <textarea value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder={selectedReason === 'Other (specify below)' ? 'Provide details (required, min 10 characters)...' : 'Add more context or explanation...'} rows="3" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none" />
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
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full transform transition-all scale-100 overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Success!</h3>
              <p className="text-slate-600 mb-8">{successMessage}</p>
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2.5 bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                onClick={() => {
                  setShowSuccessModal(false);
                  if (onSuccess) onSuccess();
                }}
              >
                Okay, got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
