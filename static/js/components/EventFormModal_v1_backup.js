// EventFormModal - Reusable event creation/edit modal
// Updated: Smart AI assistance with inline hints and readiness indicators
window.EventFormModal = function EventFormModal({
  editingId, formData, setFormData, aiLoading, aiSuggestions,
  budgetData, resourceData, timelineData, activeEquipmentTab, setActiveEquipmentTab,
  checkedActivities, checkedResources,
  equipmentCategories, venueOptions,
  handleAutoFill, handleSaveEvent, setShowModal, toggleEquipment,
  toggleActivity, toggleAdditionalResource,
  handleBudgetUpdate, handleEquipmentUpdate, setAiSuggestions, setBudgetData, setTimelineData,
  modelStatus, budgetEstimate, lastAIRequest, hasEnoughData
}) {
  // We use ReactDOM.createPortal to render the modal at the document body level.
  const portalTarget = document.body;

  if (!portalTarget) return null;
  
  // Check if AI suggestions are stale
  const isStale = lastAIRequest && aiSuggestions && (
    lastAIRequest.eventType !== formData.type ||
    lastAIRequest.expectedAttendees !== parseInt(formData.attendees)
  );

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
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(8px)',
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
          transition: 'all 500ms ease-out', 
          maxHeight: '100vh', 
          width: 'auto', 
          maxWidth: '98vw'
        }}
      >
        
        {/* CREATE EVENT MODAL */}
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl" style={{width: '750px', flexShrink: 1, height: '743px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-4 flex-shrink-0">
            <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Event' : 'Create New Event'}</h2>
          </div>

          {/* Form Content */}
          <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
            <div className="grid grid-cols-3 gap-4">
              {/* LEFT COLUMN */}
              <div className="col-span-2 space-y-3">
                {/* Event Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={async (e) => {
                      const newName = e.target.value;
                      // 1. Immediate state update to ensure UI is responsive
                      setFormData(prev => ({...prev, name: newName}));
                      
                      // Clear AI suggestions when event name changes
                      setAiSuggestions(null);

                      // 2. Real-time classification (Subtle background update only)
                      if (newName.trim().length > 2) {
                        try {
                          const response = await fetch('/api/ml/classify-event-type', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: newName })
                          });

                          const result = await response.json();
                          if (result.success && result.confidence > 30) {
                            // Only update the TYPE dropdown automatically
                            // This is helpful but non-intrusive
                            setFormData(prev => ({...prev, type: result.eventType}));
                            
                            // NOTE: We don't set aiSuggestions here to avoid auto-opening the modal
                            // The classified type is stored in formData.type and will be used by handleAutoFill
                          }
                        } catch (error) {
                          // Silent fail for background classification
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter event name"
                  />
                  {formData.name && formData.name.length > 2 && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      AI Classification Active
                    </div>
                  )}
                </div>

                {/* Type & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Event Type *</label>
                    <select value={formData.type} onChange={(e) => { setFormData({...formData, type: e.target.value}); setAiSuggestions(null); }} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option>Academic</option>
                      <option>Sports</option>
                      <option>Cultural</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                      <option>Planning</option>
                      <option>In Progress</option>
                      <option>Completed</option>
                    </select>
                  </div>
                </div>

                {/* Date Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
                    <input type="date" value={formData.date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                    <input type="date" value={formData.endDate} min={formData.date || new Date().toISOString().split('T')[0]} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                {/* Time Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                    <input type="time" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                    <input type="time" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                {/* Equipment Section */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <h3 className="text-xs font-bold text-gray-900 mb-2">Equipment</h3>
                  {(() => {
                    const aiResourceNames = resourceData && resourceData.checklist && resourceData.checklist.Resources
                      ? resourceData.checklist.Resources.map(item => typeof item === 'string' ? item : (item.name || item))
                      : [];

                    const firstCategory = Object.keys(equipmentCategories)[0];
                    const currentTab = activeEquipmentTab && Object.keys(equipmentCategories).includes(activeEquipmentTab)
                      ? activeEquipmentTab
                      : firstCategory;

                    return (
                      <>
                        <div className="flex gap-1 mb-2 border-b border-gray-300 overflow-x-auto pb-1">
                          {Object.keys(equipmentCategories).map((category) => {
                            const categoryItems = equipmentCategories[category].map(item =>
                              typeof item === 'string' ? item : item.name
                            );
                            const selectedCount = categoryItems.filter(itemName =>
                              formData.equipment.includes(itemName)
                            ).length;

                            return (
                              <button
                                key={category}
                                onClick={() => setActiveEquipmentTab(category)}
                                className={`equipment-tab px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${
                                  currentTab === category ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                {category}
                                {selectedCount > 0 && (
                                  <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full">
                                    {selectedCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="tab-content bg-blue-50 border border-blue-200 rounded p-3">
                          <div className="flex flex-wrap gap-2">
                            {equipmentCategories[currentTab].map(item => {
                              const itemName = typeof item === 'string' ? item : item.name;
                              const isChecked = formData.equipment.includes(itemName);
                              const isAISuggested = aiResourceNames.includes(itemName);
                              return (
                                <button
                                  key={itemName}
                                  onClick={() => toggleEquipment(itemName)}
                                  className={`px-3 py-1.5 rounded text-xs border font-medium transition flex items-center gap-1 ${
                                    isChecked
                                      ? 'bg-blue-500 text-white border-blue-600 hover:bg-blue-600'
                                      : isAISuggested
                                      ? 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200'
                                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                  }`}
                                  title={isAISuggested ? 'AI Suggested' : ''}
                                >
                                  {isChecked && <span>✓</span>}
                                  {isAISuggested && !isChecked && (
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                                    </svg>
                                  )}
                                  {itemName}
                                </button>
                              );
                            })}
                          </div>
                          {aiResourceNames.length > 0 && (
                            <div className="mt-2 text-xs text-green-700 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              AI suggested equipment highlighted in green
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-3">
                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Event description" className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 h-24" style={{resize: 'none'}}></textarea>
                </div>

                {/* LOGISTICS SECTION */}
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <h3 className="text-xs font-bold text-gray-700 uppercase mb-3">Logistics & Venue</h3>

                  <div className="grid grid-cols-1 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Venue</label>
                      <select value={formData.venue} onChange={(e) => setFormData({...formData, venue: e.target.value})} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 bg-white">{venueOptions.map(v => <option key={v}>{v}</option>)}</select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Organizer</label>
                      <input type="text" value={formData.organizer} onChange={(e) => setFormData({...formData, organizer: e.target.value})} placeholder="Organizer name" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Attendees</label>
                      <input type="number" value={formData.attendees} onChange={(e) => {
                        const newAttendees = e.target.value;
                        const attendeeCount = parseInt(newAttendees) || 0;
                        
                        // Calculate budget proportionally based on AI data
                        let newBudget = formData.budget;
                        
                        if (budgetData && budgetData.totalBudget && aiSuggestions) {
                          // Use ratio: if AI suggested X attendees for Y budget,
                          // then new attendees should have proportional budget
                          const baseBudget = budgetData.totalBudget;
                          const baseAttendees = aiSuggestions.suggestedAttendees || parseInt(formData.attendees) || 100;
                          
                          if (baseAttendees > 0 && attendeeCount > 0) {
                            const ratio = attendeeCount / baseAttendees;
                            newBudget = Math.round(baseBudget * ratio);
                          }
                        }
                        
                        // Update form data
                        setFormData({
                          ...formData, 
                          attendees: newAttendees,
                          budget: newBudget
                        });
                        
                        // If budget breakdown exists, recalculate it proportionally
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
                          
                          handleBudgetUpdate({
                            totalBudget: newBudget,
                            categories,
                            breakdown: newBreakdown,
                            percentages: newPercentages
                          });
                        }
                      }} placeholder="0" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Budget (₱)</label>
                      <div className="relative">
                        <input type="number" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} placeholder="0.00" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700" />
                        {budgetEstimate && formData.name.trim().length >= 3 && !formData.budget && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                            </svg>
                            Est: ₱{budgetEstimate.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-200 bg-white flex-shrink-0">
            <button onClick={handleAutoFill} disabled={aiLoading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm relative">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
              {aiLoading ? 'Analyzing...' : 'AI Auto-Organize'}
              {hasEnoughData && hasEnoughData() && !aiLoading && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full" title="Ready for AI suggestions"></span>
              )}
              {!modelStatus.ready && !aiLoading && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 border-2 border-white rounded-full" title="Using basic estimates"></span>
              )}
            </button>
            <button onClick={() => setShowModal(false)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition shadow-sm">Cancel</button>
            <button onClick={handleSaveEvent} className="px-6 py-2 bg-blue-700 text-white rounded text-sm font-semibold hover:bg-blue-800 transition shadow-sm">{editingId ? 'Update' : 'Create'}</button>
          </div>
        </div>

        {/* AI ANALYSIS MODAL - Shows only when data is generated manually */}
        {aiSuggestions && (
          <div className="bg-white rounded-lg overflow-hidden shadow-lg" style={{width: '550px', height: '743px', maxHeight: '90vh', flexShrink: 0, display: 'flex', flexDirection: 'column'}}>
            {/* AI Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-4 border-b border-indigo-700 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                  AI Analysis
                </h3>
                <button onClick={() => setAiSuggestions(null)} className="text-white hover:bg-indigo-600 p-1 rounded transition">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* AI Content - Single column, compact, scrollable */}
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              {/* Stale Data Warning */}
              {isStale && (
                <div className="bg-yellow-50 rounded-lg px-3 py-2 border border-yellow-200 flex items-start gap-2">
                  <svg className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-yellow-800">Suggestions may be outdated</p>
                    <p className="text-xs text-yellow-700 mt-0.5">
                      Based on {lastAIRequest.expectedAttendees} attendees ({formData.type})
                    </p>
                    <button 
                      onClick={handleAutoFill} 
                      className="mt-1.5 text-xs font-medium text-yellow-800 hover:text-yellow-900 underline flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh with current data
                    </button>
                  </div>
                </div>
              )}
              
              {/* Confidence Score */}
              <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
                <p className="text-xs text-slate-700"><span className="font-semibold">Model Confidence:</span> {aiSuggestions.confidence || '92.5'}%</p>
              </div>

              {/* Estimated Budget */}
              {aiSuggestions.estimatedBudget && (
                <div className="bg-white rounded-lg p-3 border-l-4 border-emerald-500 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-emerald-100 rounded flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Budget</p>
                      <p className="text-lg font-bold text-emerald-700">₱{typeof aiSuggestions.estimatedBudget === 'number' ? aiSuggestions.estimatedBudget.toLocaleString() : aiSuggestions.estimatedBudget}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Resources */}
              {formData.additionalResources.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-teal-100 rounded flex items-center justify-center"><svg className="w-3 h-3 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <p className="text-xs font-bold text-slate-700 uppercase">Additional Items</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{formData.additionalResources.map(r => {const isChecked = checkedResources.includes(r); return <button key={r} onClick={() => toggleAdditionalResource(r)} className={`px-2 py-1 rounded text-xs border font-medium transition ${isChecked ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' : 'bg-slate-50 text-slate-400 border-slate-300 hover:bg-slate-100'}`}>{isChecked ? '✓ ' : ''}{r}</button>;})}</div>
                </div>
              )}

              {/* THREE NEW AUTOMATION FEATURES - Original Render */}
              <div className="border-t border-slate-200 pt-3 mt-3">
                {budgetData && <SmartBudgetBreakdown budgetData={budgetData} onUpdate={setBudgetData} onBudgetUpdate={handleBudgetUpdate} />}
                {resourceData && <ResourceRequirementsChecklist resourceData={resourceData} formData={formData} onEquipmentUpdate={handleEquipmentUpdate} />}
                {timelineData && <EventTimelineGenerator timelineData={timelineData} onTimelineUpdate={(updatedTimeline) => {
                  // Convert timeline back to activities format
                  const activities = updatedTimeline.timeline.map(phase =>
                    `${phase.startTime} - ${phase.endTime}: ${phase.phase}`
                  );
                  setFormData(prev => ({ ...prev, activities }));
                }} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    portalTarget
  );
}