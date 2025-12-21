// SmartAITrainer - Complete AI Training System with Full Event Data
// EXACTLY mirrors EventFormModal.js structure for comprehensive AI learning
const { useState, useEffect } = React;

window.SmartAITrainer = function SmartAITrainer() {
  const [mode, setMode] = useState('train');
  const [activeEquipmentTab, setActiveEquipmentTab] = useState('Audio & Visual');
  const [activeFormTab, setActiveFormTab] = useState('basic');
  const [checkedActivities, setCheckedActivities] = useState([]);
  const [checkedCatering, setCheckedCatering] = useState([]);
  const [checkedResources, setCheckedResources] = useState([]);
  const [budgetData, setBudgetData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);

  // Simplified form structure focused on training essentials (no dates needed for AI learning)
  const [formData, setFormData] = useState({
    name: '', type: 'Academic', venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '',
    description: '', timeline: [], catering: [], budgetCategories: []
  });

  const [trainingHistory, setTrainingHistory] = useState([]);
  const [predictionResult, setPredictionResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ trained: 0, accuracy: 0 });

  // EXACT same equipment categories as EventFormModal.js
  const equipmentCategories = {
    'Audio & Visual': ['Projector', 'Speaker', 'Microphone', 'Screen'],
    'Furniture & Setup': ['Tables', 'Chairs', 'Stage', 'Podium'],
    'Sports & Venue': ['Scoreboard', 'Lighting', 'Camera', 'First Aid Kit']
  };

  // Activity options - same as real event activities
  const activityOptions = [
    'Presentations', 'Judging', 'Awards Ceremony', 'Networking',
    'Registration', 'Setup', 'Teardown', 'Photo Session', 'Q&A'
  ];

  // Additional resources - real resource needs
  const resourceOptions = [
    'Certificates', 'Trophies', 'Medals', 'Ribbons', 'Name Tags',
    'Signage', 'Banners', 'Tablecloths', 'Centerpieces'
  ];

  // Venue options - same as EventFormModal.js
  const venueOptions = ['Auditorium', 'Gymnasium', 'Main Hall', 'Cafeteria', 'Lab', 'Courtyard', 'Library'];

  // Helper functions - same as EventFormModal.js
  const toggleEquipment = (equip) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equip)
        ? prev.equipment.filter(e => e !== equip)
        : [...prev.equipment, equip]
    }));
  };

  const toggleActivity = (item) => {
    const newActivities = checkedActivities.includes(item)
      ? checkedActivities.filter(a => a !== item)
      : [...checkedActivities, item];
    setCheckedActivities(newActivities);
    setFormData(prev => ({ ...prev, activities: newActivities }));
  };

  const toggleCatering = (item) => {
    const newCatering = checkedCatering.includes(item)
      ? checkedCatering.filter(c => c !== item)
      : [...checkedCatering, item];
    setCheckedCatering(newCatering);
    setFormData(prev => ({ ...prev, catering: newCatering }));
  };

  const toggleAdditionalResource = (item) => {
    const newResources = checkedResources.includes(item)
      ? checkedResources.filter(r => r !== item)
      : [...checkedResources, item];
    setCheckedResources(newResources);
    setFormData(prev => ({ ...prev, additionalResources: newResources }));
  };

  // Timeline management functions
  const addTimelinePhase = () => {
    const newPhase = {
      startTime: '09:00',
      endTime: '10:00',
      phase: ''
    };
    setFormData(prev => ({
      ...prev,
      timeline: [...prev.timeline, newPhase]
    }));
  };

  const updateTimelinePhase = (index, field, value) => {
    const updatedTimeline = [...formData.timeline];
    updatedTimeline[index][field] = value;
    setFormData(prev => ({ ...prev, timeline: updatedTimeline }));
  };

  const removeTimelinePhase = (index) => {
    const updatedTimeline = formData.timeline.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, timeline: updatedTimeline }));
  };

  // Budget category management functions
  const addBudgetCategory = () => {
    const newCategory = {
      name: '',
      amount: 0
    };
    setFormData(prev => ({
      ...prev,
      budgetCategories: [...prev.budgetCategories, newCategory]
    }));
  };

  const updateBudgetCategory = (index, field, value) => {
    const updatedCategories = [...formData.budgetCategories];
    if (field === 'amount') {
      updatedCategories[index][field] = parseFloat(value) || 0;
    } else {
      updatedCategories[index][field] = value;
    }
    setFormData(prev => ({ ...prev, budgetCategories: updatedCategories }));
  };

  const removeBudgetCategory = (index) => {
    const updatedCategories = formData.budgetCategories.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, budgetCategories: updatedCategories }));
  };

  useEffect(() => {
    loadStats();
    loadTrainingHistory();
  }, []);

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
    } catch (error) {
      console.error('Stats loading failed:', error);
    }
  };

  const loadTrainingHistory = async () => {
    try {
      const response = await fetch('/api/ml/training-data');
      const data = await response.json();
      if (data.success) {
        setTrainingHistory(data.data.slice(0, 5)); // Show last 5
      }
    } catch (error) {
      console.error('History loading failed:', error);
    }
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
          duration: 4 // Default duration
        })
      });

      const data = await response.json();

      if (data.success) {
        setPredictionResult(data);
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
    if (!predictionResult) {
      alert('Generate a prediction first!');
      return;
    }

    // Ask user to confirm the prediction was good
    const wasAccurate = confirm(`Was this prediction accurate for "${formData.name}"?\n\nBudget: ₱${predictionResult.estimatedBudget}\nEquipment: ${predictionResult.resources.join(', ')}\n\nClick OK if this was a good prediction to add to training data.`);

    if (!wasAccurate) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/ml/add-training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          eventName: formData.name,
          eventType: formData.type,
          attendees: parseInt(formData.attendees),
          budget: predictionResult.estimatedBudget,
          equipment: predictionResult.resources,
          activities: formData.timeline.map(t => `${t.startTime} - ${t.endTime}: ${t.phase}`), // Convert timeline to activities format
          catering: predictionResult.catering || [],
          additionalResources: []
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Added to training data! AI will learn from this.');
        loadStats();
        loadTrainingHistory();

        // Reset form
        setFormData({
          name: '', type: 'Academic', venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '',
          description: '', timeline: [], catering: []
        });
        setPredictionResult(null);
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
      const response = await fetch('/api/ml/train-models', {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        alert('🎉 AI models retrained! Predictions will be even better now.');
        loadStats();
      } else {
        alert('Training failed: ' + data.message);
      }
    } catch (error) {
      alert('Training error: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
        {/* Professional Tabbed Form */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Tab Navigation */}
          <div className="bg-white border-b border-slate-200">
            <div className="flex flex-wrap">
              {[
                { id: 'basic', label: 'Basic Info', icon: 'document' },
                { id: 'equipment', label: 'Equipment', icon: 'wrench' },
                { id: 'timeline', label: 'Timeline', icon: 'clock' },
                { id: 'budget', label: 'Budget', icon: 'currency-dollar' },
                { id: 'logistics', label: 'Logistics', icon: 'map-pin' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all relative ${
                    activeFormTab === tab.id
                      ? 'text-indigo-600 bg-indigo-50/50'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {tab.icon === 'document' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  {tab.icon === 'wrench' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  {tab.icon === 'clock' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx={12} cy={12} r={10} />
                      <polyline points="12,6 12,12 16,14" />
                    </svg>
                  )}
                  {tab.icon === 'currency-dollar' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1v22m0-22l-4 4m4-4l4 4m-4-4v22" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  )}
                  {tab.icon === 'map-pin' && (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <span className="whitespace-nowrap">{tab.label}</span>
                  {activeFormTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"></span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-8 min-h-[400px]">
            {/* Basic Info Tab - Compact */}
            {activeFormTab === 'basic' && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Basic Event Information</h3>
                  <p className="text-slate-500 text-sm">Enter the fundamental details about your event to help the AI understand the context.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Event Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                      placeholder="e.g. Annual Science Fair 2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Event Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white cursor-pointer"
                    >
                      <option value="">Select event type...</option>
                      <option>Academic</option>
                      <option>Sports</option>
                      <option>Cultural</option>
                      <option>Workshop</option>
                      <option>Seminar</option>
                    </select>
                  </div>
                  <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Goal</label>
                     <input 
                        type="text"
                        placeholder="e.g. Fundraising, Education"
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                     />
                  </div>
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Event Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Provide a detailed description of the event, themes, and special requirements..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      rows="4"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Equipment Tab */}
            {activeFormTab === 'equipment' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Equipment Selection</h3>
                    <p className="text-slate-500 text-sm">Log equipment used to improve resource prediction.</p>
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                    {formData.equipment.length} items selected
                  </div>
                </div>

                {/* Equipment Category Tabs */}
                <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                  {Object.keys(equipmentCategories).map((category) => {
                    const categoryItems = equipmentCategories[category];
                    const selectedCount = categoryItems.filter(item => formData.equipment.includes(item)).length;
                    return (
                      <button
                        key={category}
                        onClick={() => setActiveEquipmentTab(category)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                          activeEquipmentTab === category
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                        }`}
                      >
                        {category}
                        {selectedCount > 0 && (
                          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${
                            activeEquipmentTab === category ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                          }`}>
                            {selectedCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Equipment Grid */}
                <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {equipmentCategories[activeEquipmentTab].map(item => {
                      const isChecked = formData.equipment.includes(item);
                      return (
                        <button
                          key={item}
                          onClick={() => toggleEquipment(item)}
                          className={`group relative p-4 rounded-xl text-sm border text-left transition-all duration-200 ${
                            isChecked
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 ring-2 ring-indigo-600 ring-offset-2'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{item}</span>
                            {isChecked ? (
                              <svg className="w-5 h-5 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Timeline Tab */}
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

            {/* Budget Tab */}
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

            {/* Logistics Tab */}
            {activeFormTab === 'logistics' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-slate-800">Event Logistics</h3>
                  <p className="text-slate-500 text-sm">Key metrics for attendee and venue analysis</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Venue & Organizer */}
                  <div className="space-y-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Location & Host</h4>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Event Venue</label>
                      <select
                        value={formData.venue}
                        onChange={(e) => setFormData({...formData, venue: e.target.value})}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      >
                        {venueOptions.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Event Organizer</label>
                      <input
                        type="text"
                        value={formData.organizer}
                        onChange={(e) => setFormData({...formData, organizer: e.target.value})}
                        placeholder="Name of event organizer"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Attendees & Budget */}
                  <div className="space-y-6 bg-indigo-50/30 p-6 rounded-xl border border-indigo-100">
                     <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-2">Scale & Finance</h4>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Expected Attendees *</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={formData.attendees}
                          onChange={(e) => setFormData({...formData, attendees: e.target.value})}
                          placeholder="0"
                          className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pl-10"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Actual Budget (₱) *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-slate-500 font-medium">₱</span>
                        <input
                          type="number"
                          value={formData.budget}
                          onChange={(e) => setFormData({...formData, budget: e.target.value})}
                          placeholder="Total actual budget spent"
                          className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons - Professional & Aligned */}
          <div className="bg-slate-50 border-t border-slate-200 px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              {predictionResult ? (
                <span className="flex items-center text-emerald-600 font-medium">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Prediction generated successfully
                </span>
              ) : (
                <span>Complete the forms above to generate AI prediction</span>
              )}
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
              <button
                onClick={testPrediction}
                disabled={isProcessing || !formData.name || !formData.attendees}
                className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                   <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                   <span>🤖</span>
                )}
                Generate AI Prediction
              </button>

              {predictionResult && (
                <button
                  onClick={addToTraining}
                  disabled={isProcessing}
                  className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span>✅</span>
                  Confirm & Train
                </button>
              )}

              <button
                onClick={retrainModels}
                disabled={isProcessing || stats.trained < 3}
                className="flex-1 md:flex-none px-6 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <span>🔄</span>
                Retrain Model
              </button>
            </div>
          </div>
        </div>

        {/* AI Results Section - Modern Card */}
        {predictionResult && (
          <div className="mt-2 bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-xl p-6 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                 <div className="p-2 bg-emerald-100 rounded-lg">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 AI Prediction Analysis
               </h3>
               <span className="text-xs font-mono text-slate-400">ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Budget Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-full -mr-2 -mt-2 z-0"></div>
                <div className="relative z-10">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Estimated Budget</p>
                  <div className="text-3xl font-bold text-emerald-600 tracking-tight">
                    ₱{predictionResult.estimatedBudget?.toLocaleString()}
                  </div>
                  <div className="mt-2 text-xs text-slate-400">Based on {formData.attendees} attendees</div>
                </div>
              </div>

              {/* Equipment Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm md:col-span-2">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Recommended Resources</p>
                <div className="flex flex-wrap gap-2">
                  {predictionResult.resources?.length > 0 ? predictionResult.resources.map(item => (
                    <span key={item} className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5">
                       <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                       {item}
                    </span>
                  )) : (
                     <span className="text-slate-400 text-sm italic">No specific equipment recommended</span>
                  )}
                </div>
                {predictionResult.catering && predictionResult.catering.length > 0 && (
                   <div className="mt-4 pt-4 border-t border-slate-50">
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Suggested Catering</p>
                     <div className="flex flex-wrap gap-2">
                        {predictionResult.catering.map(item => (
                           <span key={item} className="bg-orange-50 text-orange-700 border border-orange-100 px-3 py-1.5 rounded-lg text-sm font-medium">
                              {item}
                           </span>
                        ))}
                     </div>
                   </div>
                )}
              </div>
            </div>
          </div>
        )}

    </div>
  );
};