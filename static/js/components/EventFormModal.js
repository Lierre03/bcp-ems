// EventFormModal - Reusable event creation/edit modal
// Updated: Clean tabbed interface for better organization of manual inputs vs AI
window.EventFormModal = function EventFormModal({
  editingId, formData, setFormData, aiLoading, aiSuggestions,
  budgetData, resourceData, timelineData, activeEquipmentTab, setActiveEquipmentTab,
  checkedActivities, checkedResources,
  equipmentCategories, venueOptions,
  handleAutoFill, handleSaveEvent, setShowModal, toggleEquipment,
  toggleActivity, toggleAdditionalResource, setCheckedResources,
  handleBudgetUpdate, handleEquipmentUpdate, setAiSuggestions, setBudgetData, setTimelineData,
  modelStatus, budgetEstimate, lastAIRequest, hasEnoughData, activeTab: parentActiveTab, onTabChange,
  isConflictRejected
}) {
  // Manual input states
  const [manualResources, setManualResources] = React.useState([]);
  const [activeTab, setActiveTab] = React.useState(parentActiveTab || 'details');
  const [sharedDepartments, setSharedDepartments] = React.useState([]);

  // Sync activeTab with parent when parentActiveTab changes
  React.useEffect(() => {
    if (parentActiveTab) {
      setActiveTab(parentActiveTab);
    }
  }, [parentActiveTab]);

  // Notify parent when activeTab changes
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  // Sync manualResources to parent checkedResources
  React.useEffect(() => {
    if (setCheckedResources && manualResources.length >= 0) {
      // Extract just the names from manualResources and update checkedResources
      const resourceNames = manualResources
        .map(r => r && r.name)
        .filter(name => name && typeof name === 'string' && name.trim());
      setCheckedResources(resourceNames);
    }
  }, [manualResources, setCheckedResources]);

  // LOCAL budget state - isolated from parent's AI data to prevent auto-fill in the form
  const [userBudgetData, setUserBudgetData] = React.useState({
    totalBudget: 0,
    categories: [''],
    breakdown: {
      '': { amount: 0, percentage: 0 }
    },
    percentages: [0]
  });

  // LOCAL timeline state - isolated from parent's AI data to prevent auto-fill in the form
  const [userTimelineData, setUserTimelineData] = React.useState({
    timeline: [],
    totalDuration: 0
  });

  // LOCAL equipment state - isolated from parent's AI data to prevent auto-fill in the form
  const [userEquipmentData, setUserEquipmentData] = React.useState({
    equipment: [] // Array of {name: string, quantity: number}
  });

  // Initialize on component mount or when event ID changes
  React.useEffect(() => {
    // If we're editing and have budgetData, use it. Otherwise start fresh
    if (budgetData && Object.keys(budgetData.breakdown || {}).length > 0) {
      setUserBudgetData(budgetData);
    } else {
      // Reset local user budget to one empty category on new event
      setUserBudgetData({
        totalBudget: formData.budget || 0,
        categories: [''],
        breakdown: {
          '': { amount: 0, percentage: 0 }
        },
        percentages: [0]
      });
    }

    // If we're editing and have timelineData, use it. Otherwise start fresh
    if (timelineData && timelineData.timeline && timelineData.timeline.length > 0) {
      setUserTimelineData(timelineData);
    } else {
      // Reset local user timeline to empty on new event
      setUserTimelineData({
        timeline: [],
        totalDuration: 0
      });
    }

    // Reset local user equipment to empty on new event (we don't have equipment data passed yet)
    setUserEquipmentData({
      equipment: formData.equipment || []
    });

    // Initialize manualResources from checkedResources when editing
    if (checkedResources && checkedResources.length > 0) {
      setManualResources(
        checkedResources.map(res => {
          if (typeof res === 'string') {
            return { name: res, description: '' };
          } else if (typeof res === 'object') {
            return {
              name: res.name || res.resource_name || '',
              description: res.description || ''
            };
          }
          return null;
        }).filter(r => r && r.name)
      );
    } else {
      setManualResources([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]); // Only re-initialize when editing a different event

  // Sync userBudgetData total to parent formData.budget (but don't overwrite budgetData which contains AI suggestions)
  React.useEffect(() => {
    if (userBudgetData && userBudgetData.totalBudget) {
      // Only update the form's budget field, not the budgetData (which holds AI suggestions)
      setFormData(prev => ({ ...prev, budget: userBudgetData.totalBudget }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBudgetData?.totalBudget]); // Only sync total budget changes

  // Sync userEquipmentData to parent formData.equipment
  React.useEffect(() => {
    if (handleEquipmentUpdate && userEquipmentData.equipment) {
      handleEquipmentUpdate(userEquipmentData.equipment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEquipmentData]); // Only depend on userEquipmentData, not the callback

  // Sync userTimelineData to parent formData.activities
  React.useEffect(() => {
    if (setFormData && userTimelineData.timeline) {
      // Convert timeline phases to activity format for the backend
      const activities = userTimelineData.timeline
        .filter(phase => phase.phase && phase.phase.trim()) // Only include phases with names
        .map(phase => ({
          activity_name: `${phase.startTime || ''} - ${phase.endTime || ''}: ${phase.phase}`,
          phase: phase.phase, // KEEPTHE PHASE!
          description: phase.description || '',
          startTime: phase.startTime || '',
          endTime: phase.endTime || '',
          duration: phase.duration || 0
        }));
      setFormData(prev => ({ ...prev, activities }));
    }
  }, [userTimelineData, setFormData]);

  // Sync sharedDepartments to formData
  React.useEffect(() => {
    setFormData(prev => ({ ...prev, shared_with_departments: sharedDepartments }));
  }, [sharedDepartments, setFormData]);

  // Sync manualResources to parent formData.additionalResources
  React.useEffect(() => {
    if (setFormData) {
      setFormData(prev => ({ ...prev, additionalResources: manualResources || [] }));
    }
  }, [manualResources, setFormData]);

  // We use ReactDOM.createPortal to render the modal at the document body level.
  const portalTarget = document.body;

  if (!portalTarget) return null;

  // Check if AI suggestions are stale
  const isStale = lastAIRequest && aiSuggestions && (
    lastAIRequest.eventType !== formData.type ||
    lastAIRequest.expectedAttendees !== parseInt(formData.attendees)
  );

  const tabs = [
    { id: 'details', label: 'Event Details', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { id: 'equipment', label: 'Required Equipment', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg> },
    { id: 'budget', label: 'Smart Budget', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'timeline', label: 'Timeline', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'resources', label: 'Additional Resources', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> }
  ];

  return ReactDOM.createPortal(
    // BACKDROP WRAPPER
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Slightly darker for better focus
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={() => setShowModal(false)}
    >
      {/* MODAL CONTAINER */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-start',
          justifyContent: 'center', /* Ensures content is centered */
          transition: 'all 500ms ease-out',
          maxHeight: '100vh',
          width: '100%', /* CHANGED from 'auto' to '100%' to allow children to expand */
          maxWidth: '98vw'
        }}
      >

        {/* CREATE EVENT MODAL */}
        <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col flex-1 max-w-5xl h-[750px] max-h-[90vh]">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-4 flex-shrink-0 flex justify-between items-center">
            <h2 className="text-lg font-bold text-white tracking-wide">{editingId ? 'Edit Event' : 'Create New Event'}</h2>
            <div className="text-blue-100 text-xs font-medium bg-blue-800 bg-opacity-30 px-2 py-1 rounded">
              {formData.status}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${activeTab === tab.id
                  ? 'text-blue-700 bg-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
              >
                {tab.icon}
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-hidden relative bg-gray-50/30">
            <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-5">

              {/* === TAB 1: DETAILS === */}
              {activeTab === 'details' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 animate-fadeIn">
                  {/* LEFT COLUMN */}
                  <div className="md:col-span-2 space-y-4">
                    {/* Event Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Event Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={async (e) => {
                          const newName = e.target.value;
                          setFormData(prev => ({ ...prev, name: newName }));
                          setAiSuggestions(null); // Clear suggestions on edit

                          // Real-time classification
                          if (newName.trim().length > 2) {
                            try {
                              const response = await fetch('/api/ml/classify-event-type', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ text: newName })
                              });
                              const result = await response.json();
                              // Only update if confidence is high and type is valid
                              const validTypes = ['Academic', 'Sports', 'Cultural', 'Workshop', 'Other'];
                              if (result.success && result.confidence > 30 && validTypes.includes(result.eventType)) {
                                setFormData(prev => ({ ...prev, type: result.eventType }));
                              }
                            } catch (error) { }
                          }
                        }}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        placeholder="e.g., Annual Science Fair 2024"
                        autoFocus
                      />
                      {formData.name && formData.name.length > 2 && (
                        <div className="text-[10px] text-blue-600 mt-1 flex items-center gap-1 font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          AI Classification Active
                        </div>
                      )}
                    </div>

                    {/* Type & Status */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Event Type <span className="text-red-500">*</span></label>
                        <select
                          value={formData.type}
                          onChange={(e) => { setFormData({ ...formData, type: e.target.value }); setAiSuggestions(null); }}
                          className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                        >
                          <option>Academic</option>
                          <option>Sports</option>
                          <option>Cultural</option>
                          <option>Workshop</option>
                          <option>Other</option>
                        </select>
                      </div>
                      {editingId ? (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Status</label>
                          <div className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${formData.status === 'Approved' ? 'bg-green-500' :
                              formData.status === 'Pending' ? 'bg-yellow-500' :
                                formData.status === 'Under Review' ? 'bg-blue-500' :
                                  formData.status === 'Ongoing' ? 'bg-purple-500' :
                                    formData.status === 'Completed' ? 'bg-teal-500' :
                                      formData.status === 'Rejected' ? 'bg-red-500' : 'bg-gray-400'
                              }`}></div>
                            <span className="font-medium text-slate-700">{formData.status}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">Status changes through approval workflow</p>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Submission Status</label>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            <p className="text-xs text-blue-900 font-medium">Auto-assigned on submission</p>
                            <p className="text-[10px] text-blue-700 mt-0.5">Your event will be reviewed by the department</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* Date Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Date <span className="text-red-500">*</span></label>
                        <input type="date" value={formData.date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">End Date</label>
                        <input type="date" value={formData.endDate} min={formData.date || new Date().toISOString().split('T')[0]} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                      </div>
                    </div>

                    {/* Time Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">Start Time</label>
                        <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">End Time</label>
                        <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" />
                      </div>
                    </div>


                    {/* Description moved here */}
                    <div className="mt-4">
                      <label className="block text-xs font-bold text-gray-700 mb-1.5">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Describe the event, goals, and requirements..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 h-28 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm resize-none"
                      ></textarea>
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-4">


                    {/* LOGISTICS CARD */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-100 pb-2">Logistics & Venue</h3>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Venue</label>
                          <select
                            value={formData.venue}
                            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                            className={`w-full px-2 py-2 border rounded text-sm bg-gray-50 focus:bg-white transition-colors ${!formData.venue ? 'text-gray-400 border-gray-300' : 'text-gray-700 border-gray-300 focus:border-blue-500'}`}
                          >
                            <option value="" disabled>Select Venue</option>
                            {venueOptions.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Organizer</label>
                          <input type="text" value={formData.organizer} onChange={(e) => setFormData({ ...formData, organizer: e.target.value })} placeholder="Organizer name" className="w-full px-2 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-gray-50 focus:bg-white" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Organizing Department</label>
                          <select
                            value={formData.organizing_department || ''}
                            onChange={(e) => setFormData({ ...formData, organizing_department: e.target.value })}
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-gray-50 focus:bg-white transition-colors"
                          >
                            <option value="">Select Department</option>
                            <optgroup label="Information Technology & Engineering">
                              <option value="BSIT">BS Information Technology (BSIT)</option>
                              <option value="BSCpE">BS Computer Engineering (BSCpE)</option>
                              <option value="BSIS">BS Information Systems (BSIS)</option>
                            </optgroup>
                            <optgroup label="Business & Management">
                              <option value="BSBA">BS Business Administration (BSBA)</option>
                              <option value="BSOA">BS Office Administration (BSOA)</option>
                              <option value="BSHRM">BS Hotel & Restaurant Mgt (BSHRM)</option>
                              <option value="BSTM">BS Tourism Management (BSTM)</option>
                              <option value="BSAct">BS Accounting Technology (BSAct)</option>
                            </optgroup>
                            <optgroup label="Education & Arts">
                              <option value="BEEd">BS Elementary Education (BEEd)</option>
                              <option value="BSEd">BS Secondary Education (BSEd)</option>
                              <option value="BTTE">BS Technical Teacher Educ (BTTE)</option>
                              <option value="BLIS">Bachelor of Library & Info Sci (BLIS)</option>
                              <option value="BSPsych">BS Psychology (BSPsych)</option>
                              <option value="BSCrim">BS Criminology (BSCrim)</option>
                            </optgroup>
                            <option value="General">General/Cross-Department</option>
                          </select>
                        </div>

                        {/* Cross-Department Sharing - Only show when General/Cross-Department is selected */}
                        {formData.organizing_department === 'General' && (
                          <div className="col-span-2 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                              </svg>
                              <label className="text-sm font-semibold text-gray-900">Share with Other Departments</label>
                              <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                            </div>
                            <p className="text-xs text-gray-600 mb-3">Select departments that can view and register for this event</p>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { value: 'BSIT', label: 'BSIT' },
                                { value: 'BSCpE', label: 'BSCpE' },
                                { value: 'BSIS', label: 'BS IS' },
                                { value: 'BSBA', label: 'BSBA' },
                                { value: 'BSOA', label: 'BSOA' },
                                { value: 'BSHRM', label: 'BSHRM' },
                                { value: 'BSTM', label: 'BSTM' },
                                { value: 'BSAct', label: 'BSAct' },
                                { value: 'BEEd', label: 'BEEd' },
                                { value: 'BSEd', label: 'BSEd' },
                                { value: 'BTTE', label: 'BTTE' },
                                { value: 'BSPsych', label: 'BSPsych' },
                                { value: 'BSCrim', label: 'BSCrim' },
                              ].map(dept => (
                                <label key={dept.value} className="flex items-center space-x-2 text-xs cursor-pointer hover:bg-gray-50 p-2 rounded border border-transparent hover:border-gray-300 transition-all">
                                  <input
                                    type="checkbox"
                                    value={dept.value}
                                    checked={sharedDepartments.includes(dept.value)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSharedDepartments([...sharedDepartments, dept.value]);
                                      } else {
                                        setSharedDepartments(sharedDepartments.filter(d => d !== dept.value));
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                                  />
                                  <span className="text-gray-700 font-medium">{dept.label}</span>
                                </label>
                              ))}
                            </div>
                            {sharedDepartments.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-gray-200">
                                <div className="flex items-center gap-2 text-xs">
                                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-gray-700">
                                    <span className="font-semibold">Shared with:</span> {sharedDepartments.join(', ')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Attendees</label>
                          <input
                            type="number"
                            value={formData.attendees}
                            onChange={(e) => {
                              const newAttendees = e.target.value;
                              const attendeeCount = parseInt(newAttendees) || 0;

                              // Budget scaling logic
                              let newBudget = formData.budget;
                              if (budgetData && budgetData.totalBudget && aiSuggestions) {
                                const baseBudget = budgetData.totalBudget;
                                const baseAttendees = aiSuggestions.suggestedAttendees || parseInt(formData.attendees) || 100;
                                if (baseAttendees > 0 && attendeeCount > 0) {
                                  const ratio = attendeeCount / baseAttendees;
                                  newBudget = Math.round(baseBudget * ratio);
                                }
                              }

                              setFormData({ ...formData, attendees: newAttendees, budget: newBudget });

                              // Recalculate breakdown
                              if (budgetData && budgetData.breakdown && newBudget > 0) {
                                const { categories, breakdown } = budgetData;
                                const newBreakdown = {};
                                const newPercentages = [];
                                categories.forEach(cat => {
                                  const percentage = breakdown[cat].percentage;
                                  const amount = Math.round((newBudget * percentage) / 100);
                                  newBreakdown[cat] = { percentage, amount };
                                  newPercentages.push(percentage);
                                });
                                handleBudgetUpdate({ totalBudget: newBudget, categories, breakdown: newBreakdown, percentages: newPercentages });
                              }
                            }}
                            placeholder="0"
                            className="w-full px-2 py-2 border border-gray-300 rounded text-sm text-gray-700 bg-gray-50 focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Total Budget (₱)</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={formData.budget}
                              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                              placeholder="0.00"
                              className="w-full px-2 py-2 border border-gray-300 rounded text-sm text-gray-700 font-medium text-emerald-700 bg-emerald-50 focus:bg-white border-emerald-200"
                            />
                            {budgetEstimate && formData.name.trim().length >= 3 && !formData.budget && (
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                Est: ₱{budgetEstimate.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB 2: SMART BUDGET === */}
              {activeTab === 'budget' && (
                <div className="h-full flex flex-col animate-fadeIn">
                  <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <div className="flex gap-3 items-start mb-3">
                      <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-blue-900">Budget Management</h4>
                        <p className="text-xs text-blue-700 mt-1">
                          Use the chart to visualize allocation. Add categories and edit amounts to build your budget.
                          {aiSuggestions && " Or use AI Auto-Organize for suggestions."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 shadow-sm min-h-[300px]">
                    <SmartBudgetBreakdown
                      budgetData={userBudgetData}
                      onUpdate={setUserBudgetData}
                      onBudgetUpdate={handleBudgetUpdate}
                    />
                  </div>
                </div>
              )}

              {/* === TAB 3: TIMELINE === */}
              {activeTab === 'timeline' && (
                <div className="h-full flex flex-col animate-fadeIn">
                  <div className="mb-4 bg-purple-50 border border-purple-100 rounded-lg p-3 flex gap-3 items-start">
                    <div className="bg-purple-100 p-2 rounded-full text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-purple-900">Event Schedule</h4>
                      <p className="text-xs text-purple-700 mt-1">
                        Plan your event phases minute-by-minute. The "Auto-Organize" button below can generate this for you.
                      </p>
                    </div>
                  </div>

                  <div className="flex-1">
                    <EventTimelineGenerator
                      key={JSON.stringify(userTimelineData.timeline)}
                      timelineData={userTimelineData}
                      initialEditMode={true}
                      onTimelineUpdate={(updatedTimeline) => {
                        setUserTimelineData(updatedTimeline);
                        const activities = updatedTimeline.timeline.map(phase =>
                          `${phase.startTime} - ${phase.endTime}: ${phase.phase}`
                        );
                        setFormData(prev => ({ ...prev, activities }));
                      }}
                    />
                  </div>
                </div>
              )}

              {/* === TAB 4: EXTRAS === */}
              {activeTab === 'resources' && (
                <div className="h-full flex flex-col animate-fadeIn">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Additional Resources</h3>
                      <p className="text-xs text-slate-500">Items not covered in standard equipment lists</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualResources([...manualResources, { name: '', description: '' }])}
                      className="px-3 py-1.5 bg-teal-600 text-white text-xs font-medium rounded hover:bg-teal-700 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                      Add Item
                    </button>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex-1 overflow-y-auto">
                    {manualResources.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                        <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        <p className="text-sm">No additional items added manually.</p>
                        <p className="text-xs mt-1">Click "Add Item" or use AI Auto-Organize to generate suggestions.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {manualResources.map((resource, index) => (
                          <div key={index} className="flex gap-3 items-start bg-white p-3 rounded border border-gray-200 shadow-sm group">
                            <div className="mt-2 text-gray-400 text-xs font-bold w-4 text-center">{index + 1}</div>
                            <div className="flex-1 space-y-2">
                              <input
                                type="text"
                                value={resource.name}
                                onChange={(e) => {
                                  const updated = [...manualResources];
                                  updated[index].name = e.target.value;
                                  setManualResources(updated);
                                }}
                                placeholder="Item name (e.g., Security Personnel)"
                                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setManualResources(manualResources.filter((_, i) => i !== index))}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition mt-1"
                              title="Remove"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* === TAB 5: REQUIRED EQUIPMENT === */}
              {activeTab === 'equipment' && (
                <div className="h-full flex flex-col animate-fadeIn">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Required Equipment</h3>
                      <p className="text-xs text-slate-500">Select items needed for the event from standard inventory</p>
                    </div>
                  </div>

                  {(() => {
                    const aiResourceNames = resourceData && resourceData.checklist && resourceData.checklist.Resources
                      ? resourceData.checklist.Resources.map(item => typeof item === 'string' ? item : (item.name || item))
                      : [];

                    const firstCategory = Object.keys(equipmentCategories)[0];
                    const currentTab = activeEquipmentTab && Object.keys(equipmentCategories).includes(activeEquipmentTab)
                      ? activeEquipmentTab
                      : firstCategory;

                    return (
                      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden flex-1 flex flex-col">
                        <div className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-gray-50 px-2 pt-2 scrollbar-hide flex-shrink-0">
                          {Object.keys(equipmentCategories).map((category) => {
                            const categoryItems = equipmentCategories[category].map(item =>
                              typeof item === 'string' ? item : item.name
                            );
                            const selectedCount = categoryItems.filter(itemName =>
                              userEquipmentData.equipment.some(eq => eq.name === itemName)
                            ).length;

                            return (
                              <button
                                key={category}
                                onClick={() => setActiveEquipmentTab(category)}
                                className={`px-4 py-3 text-sm font-medium whitespace-nowrap rounded-t-lg transition-all ${currentTab === category
                                  ? 'bg-white text-blue-600 border-t border-x border-gray-200 shadow-sm -mb-px relative z-10'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                  }`}
                              >
                                {category}
                                {selectedCount > 0 && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                                    {selectedCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                          {/* Equipment category selection as buttons */}
                          <div className="flex flex-wrap gap-2 pb-4 border-b border-gray-200">
                            {equipmentCategories[currentTab].map(item => {
                              const itemName = typeof item === 'string' ? item : item.name;
                              const existingEquipment = userEquipmentData.equipment.find(eq => eq.name === itemName);
                              const isAISuggested = aiResourceNames.includes(itemName);
                              return (
                                <button
                                  key={itemName}
                                  onClick={() => {
                                    if (existingEquipment) {
                                      setUserEquipmentData({
                                        equipment: userEquipmentData.equipment.filter(e => e.name !== itemName)
                                      });
                                    } else {
                                      setUserEquipmentData({
                                        equipment: [...userEquipmentData.equipment, { name: itemName, quantity: 1 }]
                                      });
                                    }
                                  }}
                                  className={`px-4 py-2 rounded-lg text-sm border font-medium transition flex items-center gap-2 ${existingEquipment
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                    : isAISuggested
                                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dashed-border'
                                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                  {existingEquipment && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                  {isAISuggested && !existingEquipment && <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                                  {itemName}
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected equipment with quantity inputs */}
                          {userEquipmentData.equipment.length > 0 ? (
                            <div className="space-y-3">
                              <label className="block text-sm font-bold text-gray-700 mb-2">Selected Equipment List</label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {userEquipmentData.equipment.map((item, index) => (
                                  <div key={index} className="flex gap-3 items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <span className="flex-1 text-sm text-slate-700 font-medium">{item.name}</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">Quantity:</span>
                                      <input
                                        type="number"
                                        placeholder="Quantity"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => {
                                          const newEquipment = [...userEquipmentData.equipment];
                                          newEquipment[index].quantity = parseInt(e.target.value) || 1;
                                          setUserEquipmentData({ equipment: newEquipment });
                                        }}
                                        className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newEquipment = userEquipmentData.equipment.filter((_, i) => i !== index);
                                        setUserEquipmentData({ equipment: newEquipment });
                                      }}
                                      className="p-1.5 bg-red-50 text-red-500 rounded hover:bg-red-100 transition"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                              <svg className="w-10 h-10 mb-2 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                              <p className="text-sm">No equipment selected yet.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="flex gap-4 px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0 items-center">
            <button
              onClick={handleAutoFill}
              disabled={aiLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md relative overflow-hidden group"
            >
              <span className="absolute inset-0 w-full h-full bg-white opacity-0 group-hover:opacity-10 transition-opacity"></span>
              {aiLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Analyzing Event...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                  AI Auto-Organize
                </>
              )}
              {hasEnoughData && hasEnoughData() && !aiLoading && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              )}
            </button>

            <div className="h-8 w-px bg-gray-300 mx-2"></div>

            <button onClick={() => setShowModal(false)} className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition shadow-sm">
              Cancel
            </button>
            <button onClick={handleSaveEvent} className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg text-sm font-semibold hover:from-emerald-700 hover:to-teal-700 transition shadow-md flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              {editingId ? 'Update Event' : 'Create Event'}
            </button>
          </div>
        </div>

        {/* AI ANALYSIS MODAL - Side Panel */}
        {aiSuggestions && (
          <div className="bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col w-[450px] max-w-md h-[750px] max-h-[90vh] border-l-4 border-slate-900 animate-slideInRight">
            {/* AI Modal Header */}
            <div className="bg-slate-900 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                  AI Analysis
                </h3>
                <button onClick={() => setAiSuggestions(null)} className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-full transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* AI Content */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar bg-slate-50">
              {/* Low Confidence / Unknown Event Warning */}
              {aiSuggestions && (aiSuggestions.confidence < 70 || !aiSuggestions.confidence) && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-300 flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-bold text-yellow-900">
                      {aiSuggestions.confidence < 30 ? '❓ Unknown Event Type' : '⚠️ Limited Training Data'}
                    </p>
                    <p className="text-xs text-yellow-800 mt-1 leading-relaxed">
                      {aiSuggestions.confidence < 30
                        ? 'The AI does not recognize this event type or cannot find similar events in the training database. Suggestions are based on general patterns and may not be accurate. Please manually review all recommendations.'
                        : 'This event type has limited training data, which may result in less accurate AI suggestions. Please review and adjust recommendations based on your specific needs.'
                      }
                    </p>
                  </div>
                </div>
              )}

              {/* Stale Data Warning */}
              {isStale && (
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-xs font-bold text-amber-800">Suggestions outdated</p>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      Parameters changed. Refresh for new accuracy.
                    </p>
                    <button onClick={handleAutoFill} className="mt-2 text-xs font-bold text-amber-700 hover:text-amber-900 underline flex items-center gap-1">
                      Refresh Analysis
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-xs font-semibold text-gray-500 uppercase">Confidence</span>
                <span className="text-sm font-bold text-indigo-700">{aiSuggestions.confidence || '92.5'}%</span>
              </div>

              {/* AI Description Suggestion (Moved to match Details Tab) */}
              {aiSuggestions.description && (
                <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" /></svg>
                      Suggested Description
                    </h4>
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, description: aiSuggestions.description }))}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="relative group">
                    <p className="text-xs text-gray-600 italic line-clamp-4 group-hover:line-clamp-none transition-all duration-300">
                      "{aiSuggestions.description}"
                    </p>
                  </div>
                </div>
              )}

              {/* Suggested Venue (Moved below Description) */}
              {aiSuggestions.suggestedVenue && (
                <div className="bg-white rounded-lg p-4 border border-pink-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-pink-900 flex items-center gap-2">
                      <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                      Suggested Venue
                    </h4>
                    {formData.venue !== aiSuggestions.suggestedVenue ? (
                      <button
                        onClick={() => setFormData({ ...formData, venue: aiSuggestions.suggestedVenue })}
                        className="text-xs font-bold text-pink-600 hover:text-pink-800 hover:bg-pink-50 px-2 py-1 rounded transition"
                      >
                        Apply
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        Applied
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{aiSuggestions.suggestedVenue}</p>
                    <p className="text-xs text-gray-500 mt-1">Based on similar events</p>
                  </div>
                </div>
              )}

              {/* AI Equipment Suggestions (Moved to First Actionable Item) */}
              {aiSuggestions.equipmentSuggestions && aiSuggestions.equipmentSuggestions.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-700 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      Suggested Equipment
                    </h4>
                    <button
                      onClick={() => {
                        // Merge AI equipment with existing equipment
                        const existingNames = new Set(userEquipmentData.equipment.map(e => e.name));
                        // Access equipmentSuggestions from correct property
                        const suggestions = aiSuggestions.equipmentSuggestions || [];

                        const newItems = suggestions
                          .map(item => {
                            const name = typeof item === 'string' ? item : (item.name || item);
                            // Defensive parsing for quantity
                            let quantity = 1;
                            if (typeof item === 'object') {
                              quantity = parseInt(item.quantity);
                              if (isNaN(quantity) || quantity < 1) quantity = 1;
                            }
                            return { name, quantity };
                          })
                          .filter(obj => !existingNames.has(obj.name));

                        if (newItems.length > 0) {
                          setUserEquipmentData(prev => ({
                            equipment: [...prev.equipment, ...newItems]
                          }));
                          // Switch tab to show additions
                          if (handleTabChange) {
                            handleTabChange('equipment');
                          }
                        }
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition"
                    >
                      Apply All
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {aiSuggestions.equipmentSuggestions.map((rec, idx) => {
                      const isAlreadyAdded = userEquipmentData.equipment.some(e => e.name === rec.name);
                      return (
                        <button
                          key={rec.name || idx}
                          onClick={() => {
                            if (!isAlreadyAdded) {
                              let quantity = 1;
                              if (rec.quantity) {
                                quantity = parseInt(rec.quantity);
                                if (isNaN(quantity) || quantity < 1) quantity = 1;
                              }

                              setUserEquipmentData(prev => ({
                                equipment: [...prev.equipment, { name: rec.name, quantity: quantity }]
                              }));
                            } else {
                              setUserEquipmentData(prev => ({
                                equipment: prev.equipment.filter(e => e.name !== rec.name)
                              }));
                            }
                            // Local update if needed for immediate feedback (though parent state update might be enough if reactive)
                            // If we want to switch tabs to show the addition:
                            if (handleTabChange) {
                              console.log('Auto-switching tab to equipment');
                              handleTabChange('equipment');
                            } else {
                              console.warn('handleTabChange not available');
                            }
                          }}
                          className={`p-3 rounded-lg border-2 transition text-left ${isAlreadyAdded
                            ? 'bg-emerald-50 border-emerald-300 hover:border-red-400 hover:bg-red-50 cursor-pointer active:scale-95'
                            : 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100 cursor-pointer active:scale-95'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">{rec.name}</p>
                              <p className="text-xs text-gray-600 mt-1">Quantity: {rec.quantity || 1}</p>
                            </div>
                            {isAlreadyAdded ? (
                              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </div>
                          {rec.reason && (
                            <div className="relative group mt-2">
                              <p className="text-xs text-gray-600 italic line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                                "{rec.reason}"
                              </p>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Estimated Budget */}
              {aiSuggestions.estimatedBudget && (
                <div className="bg-white rounded-lg p-4 border-l-4 border-emerald-500 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Suggested Budget</p>
                      <p className="text-xl font-extrabold text-emerald-700">₱{typeof aiSuggestions.estimatedBudget === 'number' ? aiSuggestions.estimatedBudget.toLocaleString() : aiSuggestions.estimatedBudget}</p>
                    </div>
                  </div>
                </div>
              )}



              {/* AI Equipment Suggestions */}




              {/* AI Budget Suggestions - Clickable Cards */}
              {aiSuggestions && aiSuggestions.budgetBreakdown && Object.keys(aiSuggestions.budgetBreakdown).length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5.36 4.24l-.707.707M5.343 19.364l-.707-.707m2.828-2.828l-.707.707" />
                      </svg>
                      AI Suggestions
                    </h4>
                    <button
                      onClick={() => {
                        // Apply all suggestions - remove empty categories first
                        const allCats = Object.keys(aiSuggestions.budgetBreakdown);
                        if (allCats.length > 0) {
                          // Create fresh budget data without empty categories
                          // Handle data whether it is simple number or object
                          const totalBudget = aiSuggestions.estimatedBudget || userBudgetData.totalBudget || 50000;

                          const breakdown = {};
                          const newPercentages = [];

                          allCats.forEach(cat => {
                            const rawVal = aiSuggestions.budgetBreakdown[cat];
                            const amount = typeof rawVal === 'object' ? (rawVal.amount || 0) : (rawVal || 0);
                            const percentage = typeof rawVal === 'object'
                              ? (rawVal.percentage || 0)
                              : (totalBudget > 0 ? Math.round((amount / totalBudget) * 100) : 0);

                            breakdown[cat] = { amount, percentage };
                            newPercentages.push(percentage);
                          });

                          const updatedData = {
                            totalBudget: totalBudget,
                            categories: allCats,
                            percentages: newPercentages,
                            breakdown: breakdown
                          };
                          setUserBudgetData(updatedData);
                          // PROPAGATE TO PARENT!
                          if (handleBudgetUpdate) {
                            handleBudgetUpdate(updatedData);
                          }
                          setTimeout(() => handleTabChange('budget'), 10);
                        }
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition"
                    >
                      Apply All
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">Click a category to add it to your budget</p>

                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {Object.entries(aiSuggestions.budgetBreakdown).map(([category, data]) => {
                      const isAlreadyAdded = userBudgetData && userBudgetData.categories && userBudgetData.categories.includes(category);

                      // Handle both simple number and object format
                      const amount = typeof data === 'object' ? (data.amount || 0) : (data || 0);
                      const percentage = typeof data === 'object' ? (data.percentage || 0) : 0; // Don't calc % for sidebar view unless needed

                      return (
                        <button
                          key={category}
                          onClick={() => {
                            if (!isAlreadyAdded) {
                              // Add this category to the user's budget - create completely new objects
                              // Remove empty categories (ones with empty string names)
                              const existingCategories = (userBudgetData.categories || []).filter(cat => cat !== '');
                              const existingPercentages = existingCategories.map(cat => userBudgetData.breakdown[cat]?.percentage || 0);
                              const existingBreakdown = {};
                              existingCategories.forEach(cat => {
                                if (userBudgetData.breakdown[cat]) {
                                  existingBreakdown[cat] = { ...userBudgetData.breakdown[cat] };
                                }
                              });

                              // Calculate percentage for new item
                              const currentTotal = userBudgetData.totalBudget || aiSuggestions.estimatedBudget || 50000;
                              const newPercentage = currentTotal > 0 ? Math.round((amount / currentTotal) * 100) : 0;

                              const newCategories = [...existingCategories, category];
                              const newPercentages = [...existingPercentages, newPercentage];
                              const newBreakdown = {
                                ...existingBreakdown,
                                [category]: { amount: amount, percentage: newPercentage }
                              };
                              const updatedData = {
                                totalBudget: userBudgetData.totalBudget,
                                categories: newCategories,
                                percentages: newPercentages,
                                breakdown: newBreakdown
                              };
                              setUserBudgetData(updatedData);
                              // PROPAGATE TO PARENT!
                              if (handleBudgetUpdate) {
                                handleBudgetUpdate(updatedData);
                              }
                              // Switch to budget tab after state updates
                              setTimeout(() => handleTabChange('budget'), 10);
                            } else {
                              // Remove this category from the user's budget
                              const filteredCategories = userBudgetData.categories.filter(cat => cat !== category);
                              const filteredPercentages = filteredCategories.map(cat => userBudgetData.breakdown[cat]?.percentage || 0);
                              const filteredBreakdown = {};
                              filteredCategories.forEach(cat => {
                                if (userBudgetData.breakdown[cat]) {
                                  filteredBreakdown[cat] = { ...userBudgetData.breakdown[cat] };
                                }
                              });

                              const updatedData = {
                                totalBudget: userBudgetData.totalBudget,
                                categories: filteredCategories,
                                percentages: filteredPercentages,
                                breakdown: filteredBreakdown
                              };
                              setUserBudgetData(updatedData);
                              // PROPAGATE TO PARENT!
                              if (handleBudgetUpdate) {
                                handleBudgetUpdate(updatedData);
                              }
                              setTimeout(() => handleTabChange('budget'), 10);
                            }
                          }}
                          className={`p-3 rounded-lg border-2 transition text-left ${isAlreadyAdded
                            ? 'bg-emerald-50 border-emerald-300 hover:border-red-400 hover:bg-red-50 cursor-pointer active:scale-95'
                            : 'bg-blue-50 border-blue-200 hover:border-blue-400 hover:bg-blue-100 cursor-pointer active:scale-95'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">{category}</p>
                              <p className="text-xs text-gray-600 mt-1">₱{amount.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {percentage > 0 && (
                                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">{percentage}%</span>
                              )}
                              {isAlreadyAdded ? (
                                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {aiSuggestions && aiSuggestions.timeline && aiSuggestions.timeline.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-purple-900 flex items-center gap-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Timeline Suggestions
                    </h4>
                    <button
                      onClick={() => {
                        // Create new timeline array, avoiding duplicates
                        const existingPhases = new Set(userTimelineData.timeline.map(p => p.phase));
                        const uniqueNewPhases = aiSuggestions.timeline.filter(p => !existingPhases.has(p.phase));

                        const newTimeline = [...userTimelineData.timeline, ...uniqueNewPhases].sort((a, b) => {
                          const timeA = a.startTime || '00:00';
                          const timeB = b.startTime || '00:00';
                          return timeA.localeCompare(timeB);
                        });

                        // Calculate duration approximately
                        const addedDuration = uniqueNewPhases.reduce((acc, curr) => acc + (curr.duration || 0), 0);
                        const newTotalDuration = (userTimelineData.totalDuration || 0) + addedDuration;

                        setUserTimelineData({
                          timeline: newTimeline,
                          totalDuration: newTotalDuration
                        });
                        // Switch to timeline tab after state updates
                        setTimeout(() => handleTabChange('timeline'), 10);
                      }}
                      className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:bg-purple-50 px-2 py-1 rounded transition"
                    >
                      Apply All
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-3">Click a phase to add it to your timeline</p>

                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto custom-scrollbar">
                    {aiSuggestions.timeline.map((phase, idx) => {
                      const isAlreadyAdded = userTimelineData.timeline && userTimelineData.timeline.some(p => p.phase === phase.phase);
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (!isAlreadyAdded) {
                              // Create a new timeline and sort by start time
                              const newTimeline = [...userTimelineData.timeline, phase].sort((a, b) => {
                                const timeA = a.startTime || '00:00';
                                const timeB = b.startTime || '00:00';
                                return timeA.localeCompare(timeB);
                              });
                              setUserTimelineData({
                                timeline: newTimeline,
                                totalDuration: (userTimelineData.totalDuration || 0) + (phase.duration || 0)
                              });
                              // Switch to timeline tab after state updates
                              setTimeout(() => handleTabChange('timeline'), 10);
                            } else {
                              // REMOVE: Filter out this phase
                              const newTimeline = userTimelineData.timeline.filter(p => p.phase !== phase.phase);

                              setUserTimelineData({
                                timeline: newTimeline,
                                totalDuration: Math.max(0, (userTimelineData.totalDuration || 0) - (phase.duration || 0))
                              });
                              setTimeout(() => handleTabChange('timeline'), 10);
                            }
                          }}
                          className={`p-3 rounded-lg border-2 transition text-left ${isAlreadyAdded
                            ? 'bg-emerald-50 border-emerald-300 hover:border-red-400 hover:bg-red-50 cursor-pointer active:scale-95'
                            : 'bg-purple-50 border-purple-200 hover:border-purple-400 hover:bg-purple-100 cursor-pointer active:scale-95'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">{phase.phase}</p>
                              <p className="text-xs text-gray-600 mt-1">{phase.startTime} - {phase.endTime}</p>
                              {phase.description && (
                                <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{phase.description}</p>
                              )}
                            </div>
                            {isAlreadyAdded ? (
                              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}



              {/* Suggested Resources (Moved to End) */}
              {aiSuggestions.additionalResources && aiSuggestions.additionalResources.length > 0 && (
                <div className="bg-white rounded-lg p-4 border border-teal-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-teal-800 uppercase flex items-center gap-2">
                      <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                      Suggested Resources
                    </h4>

                    {/* Check if all suggested resources are already added */}
                    {(() => {
                      const allSuggestedAdded = aiSuggestions.additionalResources.every(r => {
                        const rName = typeof r === 'string' ? r : (r && r.name ? r.name : '');
                        return manualResources.some(res => (typeof res === 'string' ? res : res.name) === rName);
                      });

                      return !allSuggestedAdded && (
                        <button
                          onClick={() => {
                            // Add all suggested resources that aren't already added
                            const resourcesToAdd = aiSuggestions.additionalResources
                              .map(r => {
                                const name = typeof r === 'string' ? r : (r && r.name ? r.name : '');
                                return { name, description: '' };
                              })
                              .filter(r => !manualResources.some(existing =>
                                (typeof existing === 'string' ? existing : existing.name) === r.name
                              ));

                            if (resourcesToAdd.length > 0) {
                              setManualResources([...manualResources, ...resourcesToAdd]);
                              if (handleTabChange) handleTabChange('resources');
                            }
                          }}
                          className="text-xs font-bold text-teal-600 hover:text-teal-800 hover:bg-teal-50 px-2 py-1 rounded transition flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                          Apply All
                        </button>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {aiSuggestions.additionalResources.map((r, idx) => {
                      // Handle both string and object formats
                      const resourceName = typeof r === 'string' ? r : (r && r.name ? r.name : '');
                      // Check against manualResources (local state) instead of parent prop
                      const isChecked = manualResources.some(res => (typeof res === 'string' ? res : res.name) === resourceName);

                      return (
                        <button
                          key={resourceName || idx}
                          onClick={() => {
                            // Local toggle function
                            if (isChecked) {
                              setManualResources(manualResources.filter(res => (typeof res === 'string' ? res : res.name) !== resourceName));
                            } else {
                              setManualResources([...manualResources, { name: resourceName, description: '' }]);
                            }
                            // Auto-switch to resources tab to show the action
                            if (handleTabChange) {
                              handleTabChange('resources');
                            }
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 group text-left ${isChecked
                              ? 'bg-teal-50 border-teal-200 shadow-sm'
                              : 'bg-white border-gray-100 hover:border-teal-200 hover:bg-teal-50/30 hover:shadow-sm'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isChecked ? 'bg-teal-100 text-teal-600' : 'bg-gray-100 text-gray-400 group-hover:bg-teal-50 group-hover:text-teal-500'
                              }`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                            </div>
                            <div>
                              <p className={`text-sm font-semibold transition-colors ${isChecked ? 'text-teal-800' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                {resourceName}
                              </p>
                            </div>
                          </div>

                          {isChecked ? (
                            <span className="text-xs font-bold text-teal-600 flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-teal-100">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                              Added
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-gray-400 group-hover:text-teal-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                              Add
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}


            </div>
          </div>
        )}



        <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes slideInRight { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
        .animate-slideInRight { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .dashed-border { background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='6' ry='6' stroke='%2315803D' stroke-width='1' stroke-dasharray='4%2c 4' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e"); border: none; }
      `}</style>
      </div>
    </div>,
    portalTarget
  );
}