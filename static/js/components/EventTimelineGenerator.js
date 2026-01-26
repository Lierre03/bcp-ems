// EventTimelineGenerator Component - AI-generated event timeline with editing capabilities
window.EventTimelineGenerator = function EventTimelineGenerator({ timelineData, onTimelineUpdate, initialEditMode = false }) {
  const [expandedPhase, setExpandedPhase] = React.useState(0);
  const [isEditing, setIsEditing] = React.useState(initialEditMode);

  // Initialize editedTimeline immediately if initialEditMode is true
  // If timeline is empty, start with one empty phase for user input
  // Helper to normalize timeline items
  const normalizeTimelineItems = (items) => {
    if (!items || !Array.isArray(items)) return [];
    return items.map(item => {
      if (typeof item === 'string') {
        return {
          phase: item,
          description: '',
          startTime: '09:00',
          endTime: '10:00',
          duration: 60
        };
      }
      return item; // Keep existing object structure including description
    });
  };

  // Initialize editedTimeline immediately if initialEditMode is true
  const getInitialEditedTimeline = () => {
    if (!initialEditMode) return null;

    const timeline = timelineData?.timeline || [];
    if (timeline.length === 0) {
      return [{
        phase: '',
        description: '',
        startTime: '09:00',
        endTime: '10:00',
        duration: 60
      }];
    }

    // Use robust normalization
    return JSON.parse(JSON.stringify(normalizeTimelineItems(timeline)));
  };

  const [editedTimeline, setEditedTimeline] = React.useState(getInitialEditedTimeline());
  const [currentTimeline, setCurrentTimeline] = React.useState(timelineData?.timeline || []);

  // Update currentTimeline when timelineData changes
  React.useEffect(() => {
    if (timelineData?.timeline) {
      setCurrentTimeline(timelineData.timeline);
    }
  }, [timelineData]);

  // Initialize edit mode on mount if initialEditMode is true and editedTimeline not set
  React.useEffect(() => {
    if (initialEditMode && timelineData?.timeline && !editedTimeline) {
      const timeline = timelineData.timeline;
      if (timeline.length === 0) {
        setEditedTimeline([{
          phase: '',
          description: '',
          startTime: '09:00',
          endTime: '10:00',
          duration: 60
        }]);
      } else {
        setEditedTimeline(JSON.parse(JSON.stringify(normalizeTimelineItems(timeline))));
      }
    }
  }, [initialEditMode, timelineData]);

  if (!timelineData) return null;

  // Initialize edited timeline when entering edit mode
  const startEditing = () => {
    setEditedTimeline(JSON.parse(JSON.stringify(timelineData.timeline)));
    setIsEditing(true);
  };

  // Save changes and exit edit mode
  const saveChanges = () => {
    // Always exit edit mode first
    setIsEditing(false);

    if (editedTimeline) {
      // Update local timeline
      setCurrentTimeline(editedTimeline);

      // Call callback if available
      if (onTimelineUpdate) {
        onTimelineUpdate({ ...timelineData, timeline: editedTimeline });
      }
    }

    setEditedTimeline(null);
  };

  // Cancel editing and discard changes
  const cancelEditing = () => {
    setIsEditing(false);
    setEditedTimeline(null);
  };

  // Calculate duration in minutes between two times
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diffMs = end - start;
    return Math.max(0, Math.round(diffMs / (1000 * 60))); // Convert to minutes
  };

  // Update a specific phase in the edited timeline
  const updatePhase = (index, field, value) => {
    if (!editedTimeline) return;
    const updated = [...editedTimeline];
    const phase = { ...updated[index], [field]: value };

    // Auto-calculate duration when start or end time changes
    if (field === 'startTime' || field === 'endTime') {
      phase.duration = calculateDuration(
        field === 'startTime' ? value : phase.startTime,
        field === 'endTime' ? value : phase.endTime
      );
    }

    updated[index] = phase;
    setEditedTimeline(updated);
    // Auto-save changes immediately
    setCurrentTimeline(updated);
    if (onTimelineUpdate) {
      onTimelineUpdate({ ...timelineData, timeline: updated });
    }
    // Auto-save changes immediately
    setCurrentTimeline(updated);
    if (onTimelineUpdate) {
      onTimelineUpdate({ ...timelineData, timeline: updated });
    }
  };

  // Add a new phase
  const addPhase = () => {
    if (!editedTimeline) return;
    const newPhase = {
      phase: '',
      description: '',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60
    };
    const updated = [...editedTimeline, newPhase];
    setEditedTimeline(updated);

    // Auto-save changes immediately
    setCurrentTimeline(updated);
    if (onTimelineUpdate) {
      onTimelineUpdate({ ...timelineData, timeline: updated });
    }
  };

  // Remove a phase
  const removePhase = (index) => {
    if (!editedTimeline || editedTimeline.length <= 1) return;
    const updated = editedTimeline.filter((_, i) => i !== index);
    setEditedTimeline(updated);

    // Auto-save changes immediately
    setCurrentTimeline(updated);
    if (onTimelineUpdate) {
      onTimelineUpdate({ ...timelineData, timeline: updated });
    }
  };

  // Use edited timeline if in edit mode, otherwise use current timeline
  // Fallback to empty array if both are null/undefined
  const displayTimeline = isEditing
    ? (editedTimeline || currentTimeline || [])
    : (currentTimeline || []);

  // Normalize displayTimeline for rendering if it contains strings
  const normalizedTimeline = displayTimeline.map(item => {
    if (typeof item === 'string') {
      return {
        phase: item,
        description: '',
        startTime: '09:00',
        endTime: '10:00',
        duration: 60
      };
    }
    return item;
  });

  // Convert 24-hour time to 12-hour format with AM/PM
  const formatTime12Hour = (time) => {
    if (!time || time === 'TBD') return time;
    const match = time.match(/^(\d{2}):(\d{2})$/);
    if (!match) return time;
    let [, hours, minutes] = match;
    hours = parseInt(hours);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Event Timeline
        </h3>
      </div>
      <div className="p-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="space-y-2">
          {normalizedTimeline.map((phase, idx) => (
            <div key={idx} className="border border-slate-200 rounded overflow-hidden">
              {!isEditing ? (
                <button onClick={() => setExpandedPhase(expandedPhase === idx ? -1 : idx)} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-200 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-700">{idx + 1}</span>
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-700 text-sm">{phase.phase}</p>
                      <p className="text-xs text-slate-600">{formatTime12Hour(phase.startTime)} - {formatTime12Hour(phase.endTime)}</p>
                    </div>
                  </div>
                  <svg className={`w-4 h-4 text-slate-600 transition ${expandedPhase === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                </button>
              ) : (
                <div className="px-3 py-2 bg-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-700">{idx + 1}</span>
                    </div>
                    <div className="text-left flex-1">
                      <input
                        type="text"
                        value={phase.phase}
                        onChange={(e) => updatePhase(idx, 'phase', e.target.value)}
                        placeholder="Enter phase name (e.g., Registration, Opening Ceremony)"
                        className="w-full px-2 py-1 text-sm font-semibold text-slate-700 border border-slate-300 rounded mb-1 placeholder:text-slate-400 placeholder:font-normal"
                      />
                      <div className="flex gap-2">
                        <input
                          type="time"
                          value={phase.startTime}
                          onChange={(e) => updatePhase(idx, 'startTime', e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                          title="Start time"
                        />
                        <span className="text-xs text-slate-500 self-center">to</span>
                        <input
                          type="time"
                          value={phase.endTime}
                          onChange={(e) => updatePhase(idx, 'endTime', e.target.value)}
                          className="px-2 py-1 text-xs border border-slate-300 rounded"
                          title="End time"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removePhase(idx)}
                    disabled={normalizedTimeline.length <= 1}
                    className="text-red-500 hover:text-red-700 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              )}

              {expandedPhase === idx && !isEditing && (
                <div className="p-3 bg-white border-t border-slate-200">
                  <p className="text-sm text-slate-700 leading-relaxed">{phase.description}</p>
                </div>
              )}

              {isEditing && (
                <div className="p-3 bg-white border-t border-slate-200">
                  <textarea
                    value={phase.description}
                    onChange={(e) => updatePhase(idx, 'description', e.target.value)}
                    placeholder="Add a description for this phase (optional)"
                    className="w-full px-2 py-1 text-xs text-slate-700 border border-slate-300 rounded mb-2 placeholder:text-slate-400"
                    rows="2"
                  />

                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Phase Button */}
        {isEditing && (
          <div className="mt-3">
            <button
              onClick={addPhase}
              className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 hover:text-gray-900 font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Add Another Phase
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
