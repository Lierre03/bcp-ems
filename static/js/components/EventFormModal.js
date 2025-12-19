// EventFormModal - Reusable event creation/edit modal
// Updated for responsiveness and matching panel heights
window.EventFormModal = function EventFormModal({
  editingId, formData, setFormData, aiLoading, aiSuggestions,
  budgetData, resourceData, timelineData, activeEquipmentTab, setActiveEquipmentTab,
  checkedActivities, checkedCatering, checkedResources,
  equipmentCategories, venueOptions,
  handleAutoFill, handleSaveEvent, setShowModal, toggleEquipment,
  toggleActivity, toggleCatering, toggleAdditionalResource,
  handleBudgetUpdate, handleEquipmentUpdate, setAiSuggestions, setBudgetData
}) {
  // We use ReactDOM.createPortal to render the modal at the document body level.
  // This ensures the backdrop covers the entire screen regardless of parent CSS (z-index, overflow, relative positioning).
  
  // Ensure we have a valid DOM node to attach to (fallback to body if needed)
  const portalTarget = document.body;

  if (!portalTarget) return null;

  return ReactDOM.createPortal(
    // BACKDROP WRAPPER: Covers entire screen using viewport units to guarantee full coverage
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.1)', // Removed dark black, kept very slight tint for definition
        backdropFilter: 'blur(8px)', // Increased blur for a better "glass" effect
        zIndex: 9999, // Extremely high z-index to sit on top of everything
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={() => setShowModal(false)}
    >
      {/* MODAL CONTAINER: Removed fixed positioning, now centered by parent flex */}
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
        
        {/* CREATE EVENT MODAL - Fixed Height to match AI Panel */}
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl" style={{width: '600px', flexShrink: 1, height: '743px', maxHeight: '90vh', display: 'flex', flexDirection: 'column'}}>
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-4 flex-shrink-0">
            <h2 className="text-lg font-bold text-white">{editingId ? 'Edit Event' : 'Create New Event'}</h2>
          </div>

          {/* Form Content - Optimized for the fixed height */}
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
                      setFormData({...formData, name: newName});

                      // Real-time classification if name is not empty
                      if (newName.trim().length > 2) {
                        try {
                          const response = await fetch('/api/ml/classify-event-type', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text: newName })
                          });

                          const result = await response.json();
                          if (result.success && result.confidence > 40) {
                            // Auto-select event type if confidence is good
                            setFormData(prev => ({...prev, name: newName, type: result.eventType}));
                          }
                        } catch (error) {
                          console.log('Classification failed, using manual selection');
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter event name"
                  />
                  {formData.name && formData.name.length > 2 && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <span>🤖 AI Classification Active</span>
                    </div>
                  )}
                </div>

                {/* Type & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Event Type *</label>
                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
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
                    <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">End Date</label>
                    <input type="date" value={formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
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
                    const categoriesToShow = resourceData && resourceData.checklist && Object.keys(resourceData.checklist).length > 0 
                      ? resourceData.checklist 
                      : equipmentCategories;
                    const firstCategory = Object.keys(categoriesToShow)[0];
                    const currentTab = activeEquipmentTab && Object.keys(categoriesToShow).includes(activeEquipmentTab) 
                      ? activeEquipmentTab 
                      : firstCategory;

                    return (
                      <>
                        <div className="flex gap-1 mb-2 border-b border-gray-300 overflow-x-auto pb-1">
                          {Object.keys(categoriesToShow).map((category) => (
                            <button 
                              key={category}
                              onClick={() => setActiveEquipmentTab(category)} 
                              className={`equipment-tab px-3 py-1.5 text-xs font-medium whitespace-nowrap transition ${currentTab === category ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>

                        <div className="tab-content bg-blue-50 border border-blue-200 rounded p-3">
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const items = categoriesToShow[currentTab];
                              if (Array.isArray(items)) {
                                return items.map(item => {
                                  const itemName = typeof item === 'string' ? item : item.name;
                                  const isChecked = formData.equipment.includes(itemName);
                                  return (
                                    <button 
                                      key={itemName} 
                                      onClick={() => toggleEquipment(itemName)} 
                                      className={`px-3 py-1.5 rounded text-xs font-medium transition ${isChecked ? 'bg-blue-500 text-white border border-blue-600 hover:bg-blue-600' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                    >
                                      {isChecked ? '✓ ' : ''}{itemName}
                                    </button>
                                  );
                                });
                              }
                              return null;
                            })()}
                          </div>
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
                      <input type="number" value={formData.attendees} onChange={(e) => setFormData({...formData, attendees: e.target.value})} placeholder="0" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Budget (₱)</label>
                      <input type="number" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} placeholder="0.00" className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 px-5 py-4 border-t border-gray-200 bg-white flex-shrink-0">
            <button onClick={handleAutoFill} disabled={aiLoading} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
              {aiLoading ? 'Analyzing...' : 'AI Auto-Organize'}
            </button>
            <button onClick={() => setShowModal(false)} className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-semibold hover:bg-gray-50 transition shadow-sm">Cancel</button>
            <button onClick={handleSaveEvent} className="px-6 py-2 bg-blue-700 text-white rounded text-sm font-semibold hover:bg-blue-800 transition shadow-sm">{editingId ? 'Update' : 'Create'}</button>
          </div>
        </div>

        {/* AI ANALYSIS MODAL - ORIGINAL DESIGN & HEIGHT */}
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
                  {aiSuggestions.budgetBreakdown && (
                    <p className="text-xs text-slate-500 mt-1 leading-tight">{aiSuggestions.budgetBreakdown}</p>
                  )}
                </div>
              )}

              {/* Activities */}
              {formData.activities.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-violet-100 rounded flex items-center justify-center"><svg className="w-3 h-3 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <p className="text-xs font-bold text-slate-700 uppercase">Activities</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{formData.activities.map(a => {const isChecked = checkedActivities.includes(a); return <button key={a} onClick={() => toggleActivity(a)} className={`px-2 py-1 rounded text-xs border font-medium transition ${isChecked ? 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100' : 'bg-slate-50 text-slate-400 border-slate-300 hover:bg-slate-100'}`}>{isChecked ? '✓ ' : ''}{a}</button>;})}</div>
                </div>
              )}

              {/* Catering */}
              {formData.catering.length > 0 && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center"><svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg></div>
                    <p className="text-xs font-bold text-slate-700 uppercase">Catering</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">{formData.catering.map(c => {const isChecked = checkedCatering.includes(c); return <button key={c} onClick={() => toggleCatering(c)} className={`px-2 py-1 rounded text-xs border font-medium transition ${isChecked ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-slate-50 text-slate-400 border-slate-300 hover:bg-slate-100'}`}>{isChecked ? '✓ ' : ''}{c}</button>;})}</div>
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
                {timelineData && <EventTimelineGenerator timelineData={timelineData} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    portalTarget // PORTAL DESTINATION
  );
}
