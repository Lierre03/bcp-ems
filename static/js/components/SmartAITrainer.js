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

  // Equipment quantities state
  const [equipmentQuantities, setEquipmentQuantities] = useState({});

  const [newResourceItem, setNewResourceItem] = useState(''); // State for new resource input

  const [trainingHistory, setTrainingHistory] = useState([]);
  const [predictionResult, setPredictionResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({ trained: 0, accuracy: 0 });
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const venueOptions = ['Auditorium', 'Gymnasium', 'Main Hall', 'Cafeteria', 'Lab', 'Courtyard', 'Library'];

  useEffect(() => {
    loadStats();
    loadTrainingHistory();
    loadEquipmentOptions();
  }, []);

  // Initialize Flatpickr time pickers for timeline
  useEffect(() => {
    if (activeFormTab === 'timeline' && formData.timeline.length > 0 && typeof window !== 'undefined' && window.flatpickr) {
      // Small delay to ensure DOM is ready and Flatpickr is loaded
      setTimeout(() => {
        formData.timeline.forEach((phase, index) => {
          // Initialize start time picker
          const startPicker = document.getElementById(`start-time-${index}`);
          if (startPicker && !startPicker._flatpickr) {
            window.flatpickr(startPicker, {
              enableTime: true,
              noCalendar: true,
              dateFormat: "H:i",
              time_24hr: false,
              defaultDate: phase.startTime,
              onChange: (selectedDates, dateStr) => {
                updateTimelinePhase(index, 'startTime', dateStr);
              }
            });
          }

          // Initialize end time picker
          const endPicker = document.getElementById(`end-time-${index}`);
          if (endPicker && !endPicker._flatpickr) {
            window.flatpickr(endPicker, {
              enableTime: true,
              noCalendar: true,
              dateFormat: "H:i",
              time_24hr: false,
              defaultDate: phase.endTime,
              onChange: (selectedDates, dateStr) => {
                updateTimelinePhase(index, 'endTime', dateStr);
              }
            });
          }
        });
      }, 1000); // Increased delay to ensure Flatpickr is fully loaded
    }
  }, [activeFormTab, formData.timeline]);



  // Auto-calculate total budget from categories
  useEffect(() => {
    const totalFromCategories = formData.budgetCategories.reduce((total, cat) => total + (cat.amount || 0), 0);
    if (totalFromCategories > 0 && totalFromCategories !== parseFloat(formData.budget || 0)) {
      setFormData(prev => ({ ...prev, budget: totalFromCategories.toString() }));
    }
  }, [formData.budgetCategories]);



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
    setFormData(prev => {
      const isSelected = prev.equipment.some(item => item.name === equip);
      let newEquipment;
      if (isSelected) {
        // Remove equipment
        newEquipment = prev.equipment.filter(item => item.name !== equip);
        // Also remove from quantities
        const newQuantities = {...equipmentQuantities};
        delete newQuantities[equip];
        setEquipmentQuantities(newQuantities);
      } else {
        // Add equipment with default quantity of 1
        newEquipment = [...prev.equipment, { name: equip, quantity: 1 }];
        setEquipmentQuantities(prev => ({ ...prev, [equip]: 1 }));
      }
      return { ...prev, equipment: newEquipment };
    });
  };

  const updateEquipmentQuantity = (equip, quantity) => {
    // Allow empty strings during typing, store as string temporarily
    if (quantity === '') {
      setEquipmentQuantities(prev => ({ ...prev, [equip]: '' }));
      setFormData(prev => ({
        ...prev,
        equipment: prev.equipment.map(item =>
          item.name === equip ? { ...item, quantity: 1 } : item
        )
      }));
      return;
    }

    const numValue = parseInt(quantity);
    const validQty = isNaN(numValue) ? 1 : Math.max(1, numValue);
    setEquipmentQuantities(prev => ({ ...prev, [equip]: validQty }));
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.map(item =>
        item.name === equip ? { ...item, quantity: validQty } : item
      )
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
    setFormData(prev => {
      const lastPhase = prev.timeline[prev.timeline.length - 1];
      const startTime = lastPhase ? lastPhase.endTime : '09:00';
      const endTime = lastPhase ? lastPhase.endTime : '10:00'; // For first phase, use default; for others, start where previous ended

      return {
        ...prev,
        timeline: [...prev.timeline, { startTime, endTime, phase: '' }]
      };
    });
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
          attendees: parseInt(formData.attendees),
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
                { id: 'resources', label: 'Add. Resources', icon: 'archive' },
                { id: 'history', label: 'Training History', icon: 'history' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFormTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all relative ${
                    activeFormTab === tab.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
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
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Venue</label>
                    <select value={formData.venue} onChange={(e) => setFormData({...formData, venue: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-white">
                        {venueOptions.map(v => <option key={v}>{v}</option>)}
                    </select>
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                    <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 border border-slate-300 rounded-lg text-sm" rows="3" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Organizer</label>
                    <input type="text" value={formData.organizer} onChange={(e) => setFormData({...formData, organizer: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Attendees *</label>
                    <input type="number" value={formData.attendees} onChange={(e) => setFormData({...formData, attendees: e.target.value})} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm" />
                </div>
              </div>
            )}

            {activeFormTab === 'equipment' && (
              <div className="max-w-5xl mx-auto space-y-6">
                 {/* Dynamic Equipment Category Tabs */}
                 <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
                    {Object.keys(equipmentCategories).map(cat => (
                        <button key={cat} onClick={() => setActiveEquipmentTab(cat)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${activeEquipmentTab === cat ? 'bg-blue-900 text-white hover:bg-blue-800' : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'}`}>{cat}</button>
                    ))}
                 </div>

                 {/* Equipment Grid with Inline Quantity Controls */}
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(equipmentCategories[activeEquipmentTab] || []).map(item => {
                      const isSelected = formData.equipment.some(e => e.name === item);
                      const currentQuantity = formData.equipment.find(e => e.name === item)?.quantity || 1;

                      return (
                        <div
                          key={item}
                          onClick={() => toggleEquipment(item)}
                          className={`relative p-4 rounded-xl border transition-all cursor-pointer ${isSelected ? 'bg-blue-800 text-white border-blue-800 shadow-lg hover:bg-blue-900' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:shadow-md hover:bg-blue-50/50'}`}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <span className="font-medium text-sm leading-tight pr-2">{item}</span>
                            {!isSelected && (
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                                +
                              </div>
                            )}
                          </div>

                          {isSelected && (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1">
                                <label className="text-xs opacity-90">Qty:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="999"
                                  defaultValue={currentQuantity}
                                  onBlur={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value) && value >= 1) {
                                      updateEquipmentQuantity(item, e.target.value);
                                    } else {
                                      e.target.value = currentQuantity.toString();
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-16 px-2 py-1 border border-white/30 rounded text-sm bg-white/10 text-white placeholder-white/50 focus:ring-1 focus:ring-white/50 focus:border-white/50 text-center font-medium"
                                  placeholder="1"
                                />
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleEquipment(item); }}
                                className="flex-shrink-0 w-6 h-6 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                                title="Remove equipment"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                 </div>

                 {/* Summary of Selected Equipment */}
                 {formData.equipment.length > 0 && (
                   <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4">
                     <div className="flex items-center justify-between mb-2">
                       <h4 className="text-sm font-semibold text-slate-800">Selected Equipment Summary</h4>
                       <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full border">
                         {formData.equipment.length} item{formData.equipment.length !== 1 ? 's' : ''}
                       </span>
                     </div>
                     <div className="text-xs text-slate-600 space-y-1">
                       {formData.equipment.map((equip, index) => (
                         <div key={index} className="flex justify-between">
                           <span>{equip.name}</span>
                           <span className="font-medium">×{equip.quantity}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
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
                              id={`start-time-${index}`}
                              type="text"
                              value={phase.startTime}
                              onChange={(e) => updateTimelinePhase(index, 'startTime', e.target.value)}
                              className="flatpickr-input w-full px-3 py-2 border border-slate-200 rounded bg-white text-sm cursor-pointer"
                              placeholder="Start time"
                              readOnly
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              id={`end-time-${index}`}
                              type="text"
                              value={phase.endTime}
                              onChange={(e) => updateTimelinePhase(index, 'endTime', e.target.value)}
                              className="flatpickr-input w-full px-3 py-2 border border-slate-200 rounded bg-white text-sm cursor-pointer"
                              placeholder="End time"
                              readOnly
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

            {/* Training History Tab Content */}
            {activeFormTab === 'history' && (
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Training History</h3>
                    <p className="text-slate-500 text-sm">Verify your database uploads and track AI learning progress.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-slate-600">Total Training Samples</div>
                      <div className="text-lg font-bold text-blue-600">{stats.trained}</div>
                    </div>
                    <button
                      onClick={() => loadTrainingHistory()}
                      className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>
                </div>

                {trainingHistory.length === 0 ? (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <p className="text-slate-900 font-medium text-lg">No training data yet</p>
                    <p className="text-slate-500 text-sm mt-1">Complete and submit event forms to see your training history here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Event Name</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Budget</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date Added</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {trainingHistory.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="text-sm font-medium text-slate-900">{item.eventName}</div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                    {item.eventType}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-mono text-slate-900">₱{item.budget?.toLocaleString()}</span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm text-slate-500">
                                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <button
                                    onClick={() => {
                                      console.log('Selected item:', item);
                                      setSelectedHistoryItem(item);
                                    }}
                                    className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                                  >
                                    View Details
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
                        <div className="flex items-center justify-between text-sm text-slate-600">
                          <span>Showing {trainingHistory.length} training sample{trainingHistory.length !== 1 ? 's' : ''}</span>
                          <span>Click "View Details" for full information</span>
                        </div>
                      </div>
                    </div>

                    {/* Beautiful Detailed Modal */}
                    {selectedHistoryItem && (
                      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-slate-200">
                          {/* Modern Header */}
                          <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-8 py-8 text-white overflow-hidden">
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-10">
                              <div className="absolute top-0 left-0 w-full h-full bg-white" style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                              }}></div>
                            </div>

                            <div className="relative flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                <div className="w-16 h-16 bg-white bg-opacity-25 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <div>
                                  <h1 className="text-3xl font-bold mb-1">{selectedHistoryItem.eventName}</h1>
                                  <p className="text-blue-100 text-lg">Complete Training Data Overview</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setSelectedHistoryItem(null)}
                                className="w-12 h-12 bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-105"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Content */}
                          <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                            {/* Stats Cards */}
                            <div className="px-8 py-8 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className="text-3xl font-bold text-slate-900">{selectedHistoryItem.attendees}</div>
                                      <div className="text-sm text-slate-600 font-medium">Expected Attendees</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className="text-2xl font-bold text-slate-900">₱{selectedHistoryItem.budget?.toLocaleString()}</div>
                                      <div className="text-sm text-slate-600 font-medium">Total Budget</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                      </svg>
                                    </div>
                                    <div>
                                      <div className="text-3xl font-bold text-slate-900">{selectedHistoryItem.equipment?.length || 0}</div>
                                      <div className="text-sm text-slate-600 font-medium">Equipment Items</div>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200">
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.994 1.994 0 013 7V3a2 2 0 012-2z" />
                                      </svg>
                                    </div>
                                    <div>
                                      <span className="inline-block px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-bold rounded-xl shadow-sm">
                                        {selectedHistoryItem.eventType}
                                      </span>
                                      <div className="text-sm text-slate-600 font-medium mt-2">Event Category</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Information Sections */}
                            <div className="px-8 py-8">
                              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                {/* Left Column - Basic Info & Budget */}
                                <div className="xl:col-span-2 space-y-8">
                                  {/* Event Overview */}
                                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
                                    <div className="flex items-center gap-3 mb-6">
                                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <h3 className="text-xl font-bold text-slate-800">Event Overview</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                      <div className="space-y-4">
                                        <div>
                                          <label className="block text-sm font-semibold text-slate-600 mb-2">Venue & Organizer</label>
                                          <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                              </svg>
                                              <span className="text-slate-800 font-medium">{selectedHistoryItem.venue}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                              </svg>
                                              <span className="text-slate-800 font-medium">{selectedHistoryItem.organizer || 'Not specified'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <label className="block text-sm font-semibold text-slate-600 mb-2">Event Description</label>
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                          <p className="text-slate-700 leading-relaxed">{selectedHistoryItem.description || 'No description was provided for this event.'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Budget Breakdown */}
                                  <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
                                    <div className="flex items-center gap-3 mb-6">
                                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                      </div>
                                      <h3 className="text-xl font-bold text-slate-800">Budget Breakdown</h3>
                                    </div>

                                    {selectedHistoryItem.budget_breakdown && selectedHistoryItem.budget_breakdown.length > 0 ? (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedHistoryItem.budget_breakdown.map((item, index) => (
                                          <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                            <div className="flex justify-between items-center">
                                              <span className="text-slate-800 font-medium">{item.name}</span>
                                              <span className="text-lg font-bold text-green-700">₱{item.amount?.toLocaleString()}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-8">
                                        <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-slate-500 font-medium">No budget breakdown was recorded</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Right Column - Equipment & Timeline */}
                                <div className="space-y-8">
                                  {/* Equipment List */}
                                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                    <div className="flex items-center gap-3 mb-6">
                                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                      </div>
                                      <h3 className="text-lg font-bold text-slate-800">Equipment ({selectedHistoryItem.equipment?.length || 0})</h3>
                                    </div>

                                    {selectedHistoryItem.equipment?.length > 0 ? (
                                      <div className="space-y-3">
                                        {selectedHistoryItem.equipment.map((eq, idx) => (
                                          <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200">
                                            <span className="text-slate-800 font-medium">{eq.name}</span>
                                            <div className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm font-bold">
                                              {eq.quantity}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-6">
                                        <svg className="w-10 h-10 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                        <p className="text-slate-500 text-sm">No equipment recorded</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Event Timeline */}
                                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                    <div className="flex items-center gap-3 mb-6">
                                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <h3 className="text-lg font-bold text-slate-800">Timeline ({selectedHistoryItem.activities?.length || 0} phases)</h3>
                                    </div>

                                    {selectedHistoryItem.activities?.length > 0 ? (
                                      <div className="space-y-3">
                                        {selectedHistoryItem.activities.map((activity, idx) => (
                                          <div key={idx} className="flex items-center gap-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200">
                                            <div className="w-8 h-8 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-sm font-bold">
                                              {idx + 1}
                                            </div>
                                            <span className="text-slate-800 font-medium flex-1">{activity}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-6">
                                        <svg className="w-10 h-10 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <p className="text-slate-500 text-sm">No timeline recorded</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Additional Resources */}
                                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                                    <div className="flex items-center gap-3 mb-6">
                                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                      </div>
                                      <h3 className="text-lg font-bold text-slate-800">Additional Resources</h3>
                                    </div>

                                    {selectedHistoryItem.additionalResources?.length > 0 ? (
                                      <div className="flex flex-wrap gap-2">
                                        {selectedHistoryItem.additionalResources.map((res, idx) => (
                                          <span key={idx} className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-4 py-2 rounded-xl text-sm font-semibold border border-purple-200">
                                            {res}
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-center py-6">
                                        <svg className="w-10 h-10 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                        </svg>
                                        <p className="text-slate-500 text-sm">No additional resources</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Submission Info */}
                                  <div className="bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl p-6 border border-slate-300">
                                    <div className="flex items-center gap-3 mb-4">
                                      <div className="w-10 h-10 bg-slate-300 rounded-xl flex items-center justify-center">
                                        <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                      </div>
                                      <h3 className="text-lg font-bold text-slate-800">Submission Details</h3>
                                    </div>

                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center bg-white rounded-lg p-3">
                                        <span className="text-slate-600 font-medium">Date Submitted</span>
                                        <span className="text-slate-900 font-semibold">
                                          {selectedHistoryItem.created_at ? new Date(selectedHistoryItem.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          }) : 'N/A'}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center bg-white rounded-lg p-3">
                                        <span className="text-slate-600 font-medium">Time Submitted</span>
                                        <span className="text-slate-900 font-semibold">
                                          {selectedHistoryItem.created_at ? new Date(selectedHistoryItem.created_at).toLocaleTimeString('en-US', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                          }) : 'N/A'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
