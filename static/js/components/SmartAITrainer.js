// SmartAITrainer - Complete Database-Driven Version (Restored Original UI)
const { useState, useEffect } = React;

window.SmartAITrainer = function SmartAITrainer() {
  const [activeEquipmentTab, setActiveEquipmentTab] = useState('Audio & Visual');
  const [activeFormTab, setActiveFormTab] = useState('basic');
  
  // Dynamic Equipment Categories (Fetched from API)
  const [equipmentCategories, setEquipmentCategories] = useState({
    'Audio & Visual': ['Projector', 'Speaker', 'Microphone', 'Screen'],
    'Furniture & Setup': ['Tables', 'Chairs', 'Stage', 'Podium'],
    'Sports & Venue': ['Scoreboard', 'Lighting', 'Camera', 'First Aid Kit']
  });
  
  // FORM DATA STATE
  const [formData, setFormData] = useState({
    name: '', type: 'Academic', venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '',
    description: '', timeline: [], budgetCategories: [], additionalResources: []
  });

  const [newResourceItem, setNewResourceItem] = useState(''); // State for new resource input

  const [trainingHistory, setTrainingHistory] = useState([]);
  const [predictionResult, setPredictionResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ trained: 0, accuracy: 0 });

  const venueOptions = ['Auditorium', 'Gymnasium', 'Main Hall', 'Cafeteria', 'Lab', 'Courtyard', 'Library'];

  useEffect(() => {
    loadStats();
    loadTrainingHistory();
    loadEquipmentOptions();
  }, []);

  const loadEquipmentOptions = async () => {
    try {
        const response = await fetch('/api/ml/equipment-options');
        const data = await response.json();
        if (data.success && data.categories) {
            setEquipmentCategories(data.categories);
        }
    } catch (error) {
        console.error('Failed to load equipment options:', error);
    }
  };

  // --- Helper Functions ---
  const toggleEquipment = (equip) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equip)
        ? prev.equipment.filter(e => e !== equip)
        : [...prev.equipment, equip]
    }));
  };

  // Additional Resource Helpers
  const addResource = () => {
    if (newResourceItem.trim()) {
      setFormData(prev => ({
        ...prev,
        additionalResources: [...prev.additionalResources, newResourceItem.trim()]
      }));
      setNewResourceItem('');
    }
  };
  
  const removeResource = (index) => {
    setFormData(prev => ({ ...prev, additionalResources: prev.additionalResources.filter((_, i) => i !== index) }));
  };

  const addTimelinePhase = () => {
    setFormData(prev => ({
      ...prev,
      timeline: [...prev.timeline, { startTime: '09:00', endTime: '10:00', phase: '' }]
    }));
  };

  const updateTimelinePhase = (index, field, value) => {
    const updated = [...formData.timeline];
    updated[index][field] = value;
    setFormData(prev => ({ ...prev, timeline: updated }));
  };

  const removeTimelinePhase = (index) => {
    setFormData(prev => ({ ...prev, timeline: prev.timeline.filter((_, i) => i !== index) }));
  };

  const addBudgetCategory = () => {
    setFormData(prev => ({
      ...prev,
      budgetCategories: [...prev.budgetCategories, { name: '', amount: 0 }]
    }));
  };

  const updateBudgetCategory = (index, field, value) => {
    const updated = [...formData.budgetCategories];
    if (field === 'amount') updated[index][field] = parseFloat(value) || 0;
    else updated[index][field] = value;
    setFormData(prev => ({ ...prev, budgetCategories: updated }));
  };

  const removeBudgetCategory = (index) => {
    setFormData(prev => ({ ...prev, budgetCategories: prev.budgetCategories.filter((_, i) => i !== index) }));
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/ml/training-stats');
      const data = await response.json();
      if (data.success) {
        setStats({
          trained: data.total_samples || 0,
          accuracy: data.total_samples > 5 ? Math.min(90 + (data.total_samples - 5), 98) : 70
        });
      }
    } catch (error) { console.error('Stats failed', error); }
  };

  const loadTrainingHistory = async () => {
    try {
      const response = await fetch('/api/ml/training-data');
      const data = await response.json();
      if (data.success) {
        setTrainingHistory(data.data || []);
      }
    } catch (error) { console.error('History failed', error); }
  };

  const testPrediction = async () => {
    if (!formData.name || !formData.attendees) {
      alert('Please fill in event name and attendees');
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ml/predict-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: formData.type,
          expectedAttendees: parseInt(formData.attendees),
          duration: 4
        })
      });

      const data = await response.json();

      if (data.success) {
        setPredictionResult(data);
        if (!formData.budget) setFormData(prev => ({...prev, budget: data.estimatedBudget}));
      } else {
        alert('Prediction failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      alert('Prediction error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const addToTraining = async () => {
    if (!formData.name || !formData.budget) {
        alert("Please ensure Event Name and Budget are filled out.");
        return;
    }

    const confirmMsg = `Save this event data to the training set?\n\nEvent: ${formData.name}\nBudget: ₱${formData.budget}\n\nThe AI will learn from YOUR inputs, not its own guess.`;
    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ml/add-training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // Basic Info
          eventName: formData.name,
          eventType: formData.type,
          description: formData.description,
          
          // Logistics
          venue: formData.venue,
          organizer: formData.organizer,
          attendees: parseInt(formData.attendees),
          
          // Budget (Learning from user input)
          budget: parseFloat(formData.budget),
          budgetBreakdown: formData.budgetCategories, 
          
          // Resources
          equipment: formData.equipment,
          activities: formData.timeline.map(t => `${t.startTime} - ${t.endTime}: ${t.phase}`),
          
          // Additional Resources (No catering)
          additionalResources: formData.additionalResources || []
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Added to training data! The AI model will improve upon retraining.');
        loadStats();
        loadTrainingHistory();
        loadEquipmentOptions(); 
        
        // Reset Form
        setFormData({
            name: '', type: 'Academic', venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '',
            description: '', timeline: [], budgetCategories: [], additionalResources: []
        });
        setPredictionResult(null);
        setActiveFormTab('basic');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const retrainModels = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ml/train-models', { method: 'POST', credentials: 'include' });
      const data = await response.json();
      if (data.success) {
        alert('🎉 AI models retrained successfully!');
        loadStats();
      } else {
        alert('Training failed: ' + data.message);
      }
    } catch (error) { alert('Training error: ' + error.message); } 
    finally { setIsProcessing(false); }
  };

  return (
    <div className="flex flex-col gap-4">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-slate-200">
            <div className="flex flex-wrap">
              {[
                { id: 'basic', label: 'Basic Info', icon: 'document' },
                { id: 'equipment', label: 'Equipment', icon: 'wrench' },
                { id: 'timeline', label: 'Timeline', icon: 'clock' },
                { id: 'budget', label: 'Budget', icon: 'currency-dollar' },
                { id: 'logistics', label: 'Logistics', icon: 'map-pin' },
                { id: 'resources', label: 'Add. Resources', icon: 'archive' } 
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all relative ${
                    activeFormTab === tab.id ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {activeFormTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></span>}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-6 min-h-[300px]">
            {activeFormTab === 'basic' && (
              <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Event Name *</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" placeholder="e.g. Annual Science Fair 2024" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Event Type *</label>
                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                      <option>Academic</option><option>Sports</option><option>Cultural</option><option>Workshop</option><option>Seminar</option>
                    </select>
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm" rows="3" />
                </div>
              </div>
            )}

            {activeFormTab === 'equipment' && (
              <div className="max-w-5xl mx-auto space-y-6">
                 {/* Dynamic Equipment Category Tabs */}
                 <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                    {Object.keys(equipmentCategories).map(cat => (
                        <button key={cat} onClick={() => setActiveEquipmentTab(cat)} className={`px-4 py-2 rounded-full text-sm font-medium ${activeEquipmentTab === cat ? 'bg-indigo-600 text-white' : 'bg-white border text-slate-600'}`}>{cat}</button>
                    ))}
                 </div>
                 {/* Equipment Grid */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(equipmentCategories[activeEquipmentTab] || []).map(item => (
                        <button key={item} onClick={() => toggleEquipment(item)} className={`p-4 rounded-xl text-sm border text-left transition-all ${formData.equipment.includes(item) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                            <div className="flex justify-between items-center">
                                {item}
                                {formData.equipment.includes(item) && <span>✓</span>}
                            </div>
                        </button>
                    ))}
                 </div>
              </div>
            )}
            
            {activeFormTab === 'timeline' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Event Timeline</h3>
                    <p className="text-slate-500 text-sm">Sequence of activities for flow optimization.</p>
                  </div>
                  <button
                    onClick={addTimelinePhase}
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Add Phase
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.timeline.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-slate-900 font-medium">No timeline set</p>
                      <p className="text-slate-500 text-sm">Click "Add Phase" to start mapping out the event schedule</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                      {/* Header Row */}
                      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <div className="col-span-3">Start</div>
                        <div className="col-span-3">End</div>
                        <div className="col-span-5">Activity</div>
                        <div className="col-span-1"></div>
                      </div>

                      {/* Timeline Phase Rows */}
                      {formData.timeline.map((phase, index) => (
                        <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors group">
                          <div className="col-span-3">
                            <input
                              type="time"
                              value={phase.startTime}
                              onChange={(e) => updateTimelinePhase(index, 'startTime', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="time"
                              value={phase.endTime}
                              onChange={(e) => updateTimelinePhase(index, 'endTime', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={phase.phase}
                              onChange={(e) => updateTimelinePhase(index, 'phase', e.target.value)}
                              placeholder="e.g. Opening Ceremony"
                              className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              onClick={() => removeTimelinePhase(index)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              title="Remove phase"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeFormTab === 'budget' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Budget Breakdown</h3>
                    <p className="text-slate-500 text-sm">Track actual spend for smarter estimation.</p>
                  </div>
                  <button
                    onClick={addBudgetCategory}
                    className="px-4 py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Add Category
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.budgetCategories.length === 0 ? (
                    <div className="bg-amber-50/50 border-2 border-dashed border-amber-200 rounded-xl p-8 text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-slate-900 font-medium">No budget data</p>
                      <p className="text-slate-500 text-sm">Break down the expenses to train the financial model</p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-sm">
                      <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-amber-50/50 text-xs font-semibold text-amber-700 uppercase tracking-wider">
                        <div className="col-span-5">Category Name</div>
                        <div className="col-span-3">Amount (₱)</div>
                        <div className="col-span-3">Allocation</div>
                        <div className="col-span-1"></div>
                      </div>

                      {formData.budgetCategories.map((category, index) => {
                        const percentage = formData.budget && category.amount ?
                          Math.round((category.amount / parseFloat(formData.budget)) * 100) : 0;
                        return (
                          <div key={index} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-amber-50/20 transition-colors">
                            <div className="col-span-5">
                              <input
                                type="text"
                                value={category.name}
                                onChange={(e) => updateBudgetCategory(index, 'name', e.target.value)}
                                placeholder="e.g. Venue Rental"
                                className="w-full px-3 py-2 border border-slate-200 rounded bg-white text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                              />
                            </div>
                            <div className="col-span-3">
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-xs">₱</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={category.amount || ''}
                                  onChange={(e) => updateBudgetCategory(index, 'amount', e.target.value)}
                                  placeholder="0"
                                  className="w-full pl-6 pr-3 py-2 border border-slate-200 rounded bg-white text-sm focus:ring-1 focus:ring-amber-500 focus:border-amber-500 text-right font-mono"
                                />
                              </div>
                            </div>
                            <div className="col-span-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-amber-500 rounded-full" style={{width: `${Math.min(percentage, 100)}%`}}></div>
                                </div>
                                <span className="text-xs font-medium text-amber-700 w-8 text-right">{percentage}%</span>
                              </div>
                            </div>
                            <div className="col-span-1 text-right">
                              <button
                                onClick={() => removeBudgetCategory(index)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {formData.budget && formData.budgetCategories.length > 0 && (
                  <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100 flex items-center justify-between">
                    <div>
                      <span className="block text-amber-800 text-sm font-medium opacity-80">Total Allocation</span>
                      <span className="text-2xl font-bold text-amber-900">
                        ₱{formData.budgetCategories.reduce((total, cat) => total + (cat.amount || 0), 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-amber-800 text-sm font-medium opacity-80">Actual Total Budget</span>
                      <span className="text-xl font-bold text-amber-900">
                        ₱{parseFloat(formData.budget).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeFormTab === 'logistics' && (
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Venue</label>
                        <select value={formData.venue} onChange={(e) => setFormData({...formData, venue: e.target.value})} className="w-full border border-slate-300 p-3 rounded-lg bg-white text-sm">
                            {venueOptions.map(v => <option key={v}>{v}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Organizer</label>
                        <input type="text" value={formData.organizer} onChange={(e) => setFormData({...formData, organizer: e.target.value})} className="w-full border border-slate-300 p-3 rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Attendees</label>
                        <input type="number" value={formData.attendees} onChange={(e) => setFormData({...formData, attendees: e.target.value})} className="w-full border border-slate-300 p-3 rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Total Budget (₱)</label>
                        <input type="number" value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="w-full border border-slate-300 p-3 rounded-lg text-sm" />
                    </div>
                </div>
            )}

            {/* Additional Resources Tab Content - Adjusted Spacing */}
            {activeFormTab === 'resources' && (
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-teal-50/50 p-4 rounded-xl border border-teal-100" style={{minHeight: '200px'}}>
                    <h4 className="text-sm font-bold text-teal-800 mb-2">Additional Resources</h4>
                    <p className="text-xs text-slate-500 mb-3">Add non-equipment items like decorations, certificates, ice, etc.</p>
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            value={newResourceItem} 
                            onChange={(e) => setNewResourceItem(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addResource()}
                            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500" 
                            placeholder="e.g. Certificates, Medals"
                        />
                        <button onClick={addResource} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 shadow-sm">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {formData.additionalResources.map((item, idx) => (
                            <span key={idx} className="bg-white border border-teal-200 text-teal-700 px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm animate-in fade-in zoom-in duration-200">
                                {item}
                                <button onClick={() => removeResource(idx)} className="text-teal-400 hover:text-red-500 font-bold ml-1">×</button>
                            </span>
                        ))}
                        {formData.additionalResources.length === 0 && (
                            <div className="w-full text-center py-8">
                                <span className="text-slate-400 text-sm italic">No extra items added yet</span>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            )}

          </div>

          <div className="bg-slate-50 border-t border-slate-200 px-4 py-4 md:px-6 flex flex-col md:flex-row justify-end gap-3">
              <button onClick={testPrediction} disabled={isProcessing} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all">
                 {isProcessing ? 'Thinking...' : 'Generate Prediction'}
              </button>
              {predictionResult && (
                  <button onClick={addToTraining} disabled={isProcessing} className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-all flex items-center gap-2">
                     <span>✅</span> Confirm & Train
                  </button>
              )}
              <button onClick={retrainModels} disabled={isProcessing} className="px-6 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 shadow-sm transition-all">
                  Retrain Model
              </button>
          </div>
        </div>
    </div>
  );
};