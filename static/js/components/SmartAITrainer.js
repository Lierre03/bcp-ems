// SmartAITrainer - Professional Tabbed Interface
const { useState, useEffect, useRef } = React;

window.SmartAITrainer = function SmartAITrainer({ onViewChange }) {
  const [view, setView] = useState('dashboard'); // dashboard | form | history
  const [activeTab, setActiveTab] = useState('basic'); // basic | equipment | timeline | budget | resources
  const [eqTab, setEqTab] = useState('Audio & Visual');
  const [eqCats, setEqCats] = useState({ 'Audio & Visual': ['Projector', 'Speaker', 'Microphone', 'Screen'], 'Furniture': ['Tables', 'Chairs', 'Stage', 'Podium'], 'Sports': ['Scoreboard', 'Lighting', 'Camera', 'First Aid Kit'] });
  const [form, setForm] = useState({ name: '', type: 'Academic', venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '', description: '', timelines: [], budgetCats: [], resources: [], timelineMode: 'single', currentDay: 1, multiDayTimelines: {} });
  const [newRes, setNewRes] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ trained: 0, accuracy: 70 });
  const [modal, setModal] = useState(null);
  const timeRefs = useRef({});

  const [venues, setVenues] = useState([]);
  const types = ['Academic', 'Sports', 'Cultural', 'Workshop', 'Seminar'];

  useEffect(() => { load(); }, []);

  // Notify parent when view changes
  useEffect(() => {
    if (onViewChange) onViewChange(view);
  }, [view, onViewChange]);

  useEffect(() => {
    if (view === 'form' && activeTab === 'timeline' && typeof flatpickr !== 'undefined') {
      // Destroy all existing flatpickr instances
      Object.keys(timeRefs.current).forEach(key => {
        if (timeRefs.current[key] && timeRefs.current[key]._flatpickr) {
          timeRefs.current[key]._flatpickr.destroy();
        }
      });

      // Create new flatpickr instances
      Object.keys(timeRefs.current).forEach(key => {
        if (timeRefs.current[key]) {
          flatpickr(timeRefs.current[key], {
            enableTime: true,
            noCalendar: true,
            dateFormat: "h:i K",
            time_24hr: false,
            onChange: function (selectedDates, dateStr, instance) {
              const ref = instance.element;
              const keyParts = Object.keys(timeRefs.current).find(k => timeRefs.current[k] === ref);
              if (keyParts) {
                const [type, day, index] = keyParts.split('-');
                const field = type === 'start' ? 'startTime' : 'endTime';
                updatePhase(parseInt(index), field, dateStr);
              }
            }
          });
        }
      });
    }
  }, [view, activeTab, form.timelines, form.multiDayTimelines, form.currentDay]);

  useEffect(() => {
    const t = form.budgetCats.reduce((s, c) => s + (c.amount || 0), 0);
    if (t > 0) setForm(p => ({ ...p, budget: t.toString() }));
  }, [form.budgetCats]);

  const load = async () => {
    try {
      const [s, h, e, v] = await Promise.all([
        fetch('/api/ml/training-stats').then(r => r.json()),
        fetch('/api/ml/training-data').then(r => r.json()),
        fetch('/api/ml/equipment-options').then(r => r.json()),
        fetch('/api/venues').then(r => r.json())
      ]);
      if (s.success) setStats({ trained: s.total_samples || 0, accuracy: s.accuracy || 70 });
      if (h.success) setHistory(h.data || []);
      if (e.success) setEqCats(e.categories);
      if (v.success && v.venues) setVenues(v.venues.map(venue => venue.name));
    } catch (e) { console.error(e); }
  };

  const toggleEq = (item) => setForm(p => ({ ...p, equipment: p.equipment.some(e => e.name === item) ? p.equipment.filter(e => e.name !== item) : [...p.equipment, { name: item, quantity: 1 }] }));
  const updateQty = (item, q) => setForm(p => ({ ...p, equipment: p.equipment.map(e => e.name === item ? { ...e, quantity: Math.max(1, +q || 1) } : e) }));

  const addPhase = () => {
    setForm(p => {
      if (p.timelineMode === 'multi') {
        const dayKey = `day${p.currentDay}`;
        const dayTimelines = p.multiDayTimelines[dayKey] || [];
        const lastPhase = dayTimelines[dayTimelines.length - 1];
        const startTime = lastPhase ? lastPhase.endTime : '09:00 AM';

        // Calculate end time (1 hour after start)
        let endTime = '10:00 AM';
        if (lastPhase && lastPhase.endTime) {
          const match = lastPhase.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (match) {
            let hours = parseInt(match[1]);
            const minutes = parseInt(match[2]);
            const period = match[3].toUpperCase();

            hours = hours + 1;
            if (hours > 12) hours = 1;
            endTime = `${hours}:${match[2]} ${period}`;
          }
        }

        return {
          ...p,
          multiDayTimelines: {
            ...p.multiDayTimelines,
            [dayKey]: [...dayTimelines, { startTime, endTime, phase: '', description: '' }]
          }
        };
      }

      const lastPhase = p.timelines[p.timelines.length - 1];
      const startTime = lastPhase ? lastPhase.endTime : '09:00 AM';

      // Calculate end time (1 hour after start)
      let endTime = '10:00 AM';
      if (lastPhase && lastPhase.endTime) {
        const match = lastPhase.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = parseInt(match[2]);
          const period = match[3].toUpperCase();

          hours = hours + 1;
          if (hours > 12) hours = 1;
          endTime = `${hours}:${match[2]} ${period}`;
        }
      }

      return { ...p, timelines: [...p.timelines, { startTime, endTime, phase: '', description: '' }] };
    });
  };

  const updatePhase = (i, k, v) => {
    setForm(p => {
      if (p.timelineMode === 'multi') {
        const dayKey = `day${p.currentDay}`;
        const dayTimelines = [...(p.multiDayTimelines[dayKey] || [])];
        dayTimelines[i][k] = v;
        return {
          ...p,
          multiDayTimelines: {
            ...p.multiDayTimelines,
            [dayKey]: dayTimelines
          }
        };
      }
      const t = [...p.timelines];
      t[i][k] = v;
      return { ...p, timelines: t };
    });
  };

  const delPhase = (i) => {
    setForm(p => {
      if (p.timelineMode === 'multi') {
        const dayKey = `day${p.currentDay}`;
        return {
          ...p,
          multiDayTimelines: {
            ...p.multiDayTimelines,
            [dayKey]: (p.multiDayTimelines[dayKey] || []).filter((_, j) => j !== i)
          }
        };
      }
      return { ...p, timelines: p.timelines.filter((_, j) => j !== i) };
    });
  };

  const addBudget = () => setForm(p => ({ ...p, budgetCats: [...p.budgetCats, { name: '', amount: 0 }] }));
  const updateBudget = (i, k, v) => { const c = [...form.budgetCats]; c[i][k] = k === 'amount' ? +v || 0 : v; setForm(p => ({ ...p, budgetCats: c })); };
  const delBudget = (i) => setForm(p => ({ ...p, budgetCats: p.budgetCats.filter((_, j) => j !== i) }));
  const addRes = () => { if (newRes.trim()) { setForm(p => ({ ...p, resources: [...p.resources, newRes.trim()] })); setNewRes(''); } };
  const delRes = (i) => setForm(p => ({ ...p, resources: p.resources.filter((_, j) => j !== i) }));

  const trainModels = async () => {
    if (history.length === 0) return alert("No training data available. Please add training data first.");
    setLoading(true);
    try {
      const t = await fetch('/api/ml/train-models', { method: 'POST', credentials: 'include' }).then(r => r.json());
      alert(t.success ? '✅ AI models trained successfully!' : 'Training initiated!');
      load();
    } catch (e) { alert('Error training models: ' + e.message); }
    finally { setLoading(false); }
  };

  const save = async () => {
    if (!form.name || !form.budget) return alert("Please fill Event Name and Budget.");
    setLoading(true);
    try {
      // Prepare activities based on timeline mode
      let activities;
      if (form.timelineMode === 'multi') {
        // Multi-day: save as object with day keys
        activities = form.multiDayTimelines;
      } else {
        // Single day: save as array
        activities = form.timelines;
      }

      const res = await fetch('/api/ml/add-training-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ eventName: form.name, eventType: form.type, description: form.description, venue: form.venue, organizer: form.organizer, attendees: +form.attendees || 0, budget: +form.budget, budgetBreakdown: form.budgetCats, equipment: form.equipment, activities: activities, additionalResources: form.resources })
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error);
      const t = await fetch('/api/ml/train-models', { method: 'POST', credentials: 'include' }).then(r => r.json());
      alert(t.success ? '✅ Training complete!' : '✅ Data saved!');
      load();
      setForm({ name: '', type: 'Academic', venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '', description: '', timelines: [], budgetCats: [], resources: [], timelineMode: 'single', currentDay: 1, multiDayTimelines: {} });
      setView('dashboard');
      setActiveTab('basic');
    } catch (e) { alert('Error: ' + e.message); }
    finally { setLoading(false); }
  };

  const deleteTrainingData = async (id) => {
    try {
      const res = await fetch(`/api/ml/training-data/${id}`, { method: 'DELETE' });
      const d = await res.json();
      if (d.success) {
        // Remove from local state immediately
        setHistory(prev => prev.filter(h => h.id !== id));
        // Also reload to be sure
        load();
      } else {
        alert('Error deleting data: ' + d.error);
      }
    } catch (e) {
      alert('Error deleting data: ' + e.message);
    }
  };

  const I = ({ d, c = "w-5 h-5" }) => <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={d} /></svg>;

  // Shared Modal Component
  const renderModal = () => {
    if (!modal) return null;

    const additionalResources = modal.additionalResources || modal.additional_resources || [];

    // Handle both array (single-day) and object (multi-day) activities
    const isMultiDay = modal.activities && typeof modal.activities === 'object' && !Array.isArray(modal.activities);
    const activitiesCount = isMultiDay
      ? Object.values(modal.activities).reduce((sum, dayActivities) => sum + (dayActivities?.length || 0), 0)
      : (modal.activities?.length || 0);

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setModal(null)}>
        <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="bg-gray-900 px-6 py-4 text-white border-b border-gray-800">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold mb-1">{modal.eventName}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>{modal.eventType}</span>
                  <span>•</span>
                  <span>{modal.venue}</span>
                </div>
              </div>
              <button onClick={() => setModal(null)} className="w-8 h-8 hover:bg-gray-800 rounded-lg flex items-center justify-center transition-colors">
                <I d="M6 18L18 6M6 6l12 12" c="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-auto max-h-[calc(90vh-80px)] p-6 bg-gray-50">

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Attendees</p>
                <p className="text-lg font-semibold text-gray-900">{modal.attendees || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Budget</p>
                <p className="text-lg font-semibold text-gray-900">₱{(modal.budget || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Equipment</p>
                <p className="text-lg font-semibold text-gray-900">{modal.equipment?.length || 0}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Phases</p>
                <p className="text-lg font-semibold text-gray-900">{activitiesCount}</p>
              </div>
            </div>

            {/* Basic Info */}
            {(modal.organizer || modal.description || modal.start_date || modal.end_date) && (
              <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Basic Information</h3>
                <div className="space-y-2">
                  {modal.organizer && (
                    <div className="flex">
                      <span className="text-xs text-gray-500 w-24 flex-shrink-0">Organizer:</span>
                      <span className="text-sm text-gray-900">{modal.organizer}</span>
                    </div>
                  )}
                  {(modal.start_date || modal.end_date) && (
                    <div className="flex">
                      <span className="text-xs text-gray-500 w-24 flex-shrink-0">Duration:</span>
                      <span className="text-sm text-gray-900">
                        {modal.start_date && modal.end_date
                          ? `${new Date(modal.start_date).toLocaleDateString()} - ${new Date(modal.end_date).toLocaleDateString()}`
                          : modal.start_date
                            ? new Date(modal.start_date).toLocaleDateString()
                            : new Date(modal.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {modal.description && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-700 leading-relaxed">{modal.description}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Equipment */}
            {modal.equipment?.length > 0 && (
              <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Equipment ({modal.equipment.length})</h3>
                <div className="grid grid-cols-2 gap-2">
                  {modal.equipment.map((e, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1.5 px-2 bg-gray-50 rounded">
                      <span className="text-gray-700">{e.name}</span>
                      <span className="text-gray-900 font-medium">×{e.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budget */}
            {modal.budget_breakdown?.length > 0 && (
              <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Budget Breakdown</h3>
                <div className="space-y-1.5">
                  {modal.budget_breakdown.map((b, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1.5">
                      <span className="text-gray-700">{b.name}</span>
                      <span className="text-gray-900 font-medium">₱{(b.amount || 0).toLocaleString()}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center text-sm py-2 border-t border-gray-200 font-semibold">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">₱{modal.budget_breakdown.reduce((sum, b) => sum + (b.amount || 0), 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Timeline */}
            {modal.activities && (Array.isArray(modal.activities) ? modal.activities.length > 0 : Object.keys(modal.activities).length > 0) && (
              <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Timeline ({activitiesCount})</h3>
                {isMultiDay ? (
                  // Multi-day timeline
                  <div className="space-y-4">
                    {Object.keys(modal.activities).sort().map((dayKey, dayIndex) => {
                      const dayActivities = modal.activities[dayKey];
                      if (!dayActivities || dayActivities.length === 0) return null;

                      return (
                        <div key={dayKey}>
                          <h4 className="text-xs font-bold text-gray-700 uppercase mb-2 pb-1 border-b border-gray-200">
                            {dayKey.replace('day', 'Day ')}
                          </h4>
                          <div className="space-y-2">
                            {dayActivities.map((activity, i) => {
                              if (typeof activity === 'string') {
                                const timeMatch = activity.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2}):\s*(.+)$/);
                                if (timeMatch) {
                                  return (
                                    <div key={i} className="flex gap-3 text-sm py-1.5">
                                      <span className="text-gray-500 font-mono text-xs w-24 flex-shrink-0">{timeMatch[1]} - {timeMatch[2]}</span>
                                      <span className="text-gray-700">{timeMatch[3]}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div key={i} className="text-sm text-gray-700 py-1">{activity}</div>
                                );
                              } else if (typeof activity === 'object') {
                                const startTime = activity.start_time || activity.startTime || '';
                                const endTime = activity.end_time || activity.endTime || '';
                                const phase = activity.phase || '';
                                const description = activity.description || '';

                                return (
                                  <div key={i} className="flex gap-3 text-sm py-1.5">
                                    {(startTime && endTime) && (
                                      <span className="text-gray-500 font-mono text-xs w-24 flex-shrink-0">{startTime} - {endTime}</span>
                                    )}
                                    <div className="flex-1">
                                      <div className="text-gray-900 font-medium">{phase}</div>
                                      {description && <div className="text-gray-500 text-xs mt-0.5">{description}</div>}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Single-day timeline
                  <div className="space-y-2">
                    {modal.activities.map((activity, i) => {
                      if (typeof activity === 'string') {
                        const timeMatch = activity.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2}):\s*(.+)$/);
                        if (timeMatch) {
                          return (
                            <div key={i} className="flex gap-3 text-sm py-1.5">
                              <span className="text-gray-500 font-mono text-xs w-24 flex-shrink-0">{timeMatch[1]} - {timeMatch[2]}</span>
                              <span className="text-gray-700">{timeMatch[3]}</span>
                            </div>
                          );
                        }
                        return (
                          <div key={i} className="text-sm text-gray-700 py-1">{activity}</div>
                        );
                      } else if (typeof activity === 'object') {
                        const startTime = activity.start_time || activity.startTime || '';
                        const endTime = activity.end_time || activity.endTime || '';
                        const phase = activity.phase || '';
                        const description = activity.description || '';

                        return (
                          <div key={i} className="flex gap-3 text-sm py-1.5">
                            {(startTime && endTime) && (
                              <span className="text-gray-500 font-mono text-xs w-24 flex-shrink-0">{startTime} - {endTime}</span>
                            )}
                            <div className="flex-1">
                              <div className="text-gray-900 font-medium">{phase}</div>
                              {description && <div className="text-gray-500 text-xs mt-0.5">{description}</div>}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Resources */}
            {additionalResources?.length > 0 && (
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Additional Resources ({additionalResources.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {additionalResources.map((resource, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm border border-gray-200">
                      {resource}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  };

  // Dashboard View
  if (view === 'dashboard') {
    return (
      <>
        <div className="h-full flex flex-col">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                  <I d="M12 6v6m0 0v6m0-6h6m-6 0H6" c="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Add Training Data</h3>
                  <p className="text-sm text-gray-500">Train the AI with new event patterns</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-6 flex-1">
                Add detailed event information including equipment, timeline, budget breakdown, and resources to improve AI predictions.
              </p>
              <button onClick={() => setView('form')} className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <I d="M12 4v16m8-8H4" c="w-5 h-5" /> Create New Entry
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-white">
                  <I d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" c="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Train AI Models</h3>
                  <p className="text-sm text-gray-500">{stats.trained} training samples</p>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-6 flex-1">
                Train the AI models with your existing training data to enable smart event predictions and recommendations.
              </p>
              <button onClick={trainModels} disabled={loading || history.length === 0} className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <I d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" c="w-5 h-5" /> {loading ? 'Training...' : 'Train Models Now'}
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white">
                    <I d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" c="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Training History</h3>
                    <p className="text-sm text-gray-500">{history.length} records</p>
                  </div>
                </div>
                <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
                  <I d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" c="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-auto space-y-2 max-h-64">
                {history.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <I d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" c="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No training data yet</p>
                  </div>
                ) : (
                  history.slice(0, 5).map((h, i) => (
                    <div key={i} onClick={() => setModal(h)} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-all">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">{h.eventName?.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate text-sm">{h.eventName}</p>
                        <p className="text-xs text-gray-500">{h.eventType} • ₱{h.budget?.toLocaleString()}</p>
                      </div>
                      <I d="M9 5l7 7-7 7" c="w-4 h-4 text-gray-400" />
                    </div>
                  ))
                )}
              </div>
              {history.length > 5 && (
                <button onClick={() => setView('history')} className="mt-4 w-full py-2 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                  View All ({history.length})
                </button>
              )}
            </div>
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  // History View
  if (view === 'history') {
    return (
      <>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setView('dashboard')} className="p-2 hover:bg-gray-100 rounded-lg">
                <I d="M15 19l-7-7 7-7" c="w-5 h-5 text-gray-600" />
              </button>
              <h2 className="text-xl font-bold text-gray-800">Training History</h2>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">{history.length} records</span>
            </div>
            <button onClick={load} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-200 flex items-center gap-2">
              <I d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" c="w-4 h-4" /> Refresh
            </button>
          </div>
          <div className="flex-1 overflow-auto grid gap-3">
            {history.map((h, i) => (
              <div key={i} onClick={() => setModal(h)} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:shadow-md hover:border-indigo-200 cursor-pointer transition-all">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">{h.eventName?.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{h.eventName}</p>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">{h.eventType}</span>
                    <span>₱{h.budget?.toLocaleString()}</span>
                    <span>{h.attendees} attendees</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Are you sure you want to delete this training data? This cannot be undone.')) {
                      deleteTrainingData(h.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" c="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
        {renderModal()}
      </>
    );
  }

  // Form View - Tabbed Interface
  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'equipment', label: 'Equipment', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'timeline', label: 'Timeline', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'budget', label: 'Budget', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'resources', label: 'Resources', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' }
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header - transparent to show gradient */}
      <div className="flex-shrink-0">
        <div className="max-w-7xl mx-auto px-8 py-5">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setView('dashboard')} className="p-2.5 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-indigo-50 hover:to-purple-50 rounded-xl transition-all shadow-sm hover:shadow group border border-gray-200">
                <I d="M15 19l-7-7 7-7" c="w-5 h-5 text-gray-500 group-hover:text-indigo-600" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse"></div>
                  <h1 className="text-2xl font-bold text-gray-900">Add Training Data</h1>
                </div>
                <p className="text-sm text-gray-600 mt-1 flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Configure event details to improve AI predictions
                </p>
              </div>
            </div>
            <button onClick={save} disabled={loading} className="group relative px-7 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2.5 hover:scale-105 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative flex items-center gap-2.5">
                {loading ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...</> : <><I d="M5 13l4 4L19 7" c="w-5 h-5" /> Save & Train</>}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Folder tabs + Content as one unit */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 pt-4 pb-8">
          {/* Folder Tabs - directly attached to content box */}
          <div className="flex items-end relative">
            {tabs.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="relative"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: activeTab === tab.id ? 'white' : 'transparent',
                  borderTop: activeTab === tab.id ? '1px solid #d1d5db' : 'none',
                  borderLeft: activeTab === tab.id ? '1px solid #d1d5db' : 'none',
                  borderRight: activeTab === tab.id ? '1px solid #d1d5db' : 'none',
                  borderBottom: 'none',
                  borderRadius: '8px 8px 0 0',
                  marginBottom: activeTab === tab.id ? '-1px' : '0',
                  paddingBottom: activeTab === tab.id ? '11px' : '10px',
                  position: 'relative',
                  zIndex: activeTab === tab.id ? 10 : 1,
                  cursor: 'pointer',
                  color: activeTab === tab.id ? '#111827' : '#6b7280',
                  transition: 'all 0.15s'
                }}
              >
                {/* Left curved corner SVG - only show if not first tab */}
                {activeTab === tab.id && idx > 0 && (
                  <svg style={{ position: 'absolute', left: '-10px', bottom: '0', width: '10px', height: '10px' }} viewBox="0 0 10 10" fill="none">
                    <path d="M10 10 L10 0 Q10 10 0 10 Z" fill="white" />
                    <path d="M10 0 Q10 10 0 10" stroke="#d1d5db" strokeWidth="1" fill="none" />
                  </svg>
                )}
                <span style={{ color: activeTab === tab.id ? '#4f46e5' : '#9ca3af' }}>
                  <I d={tab.icon} c="w-4 h-4" />
                </span>
                <span>{tab.label}</span>
                {/* Right curved corner SVG */}
                {activeTab === tab.id && (
                  <svg style={{ position: 'absolute', right: '-10px', bottom: '0', width: '10px', height: '10px' }} viewBox="0 0 10 10" fill="none">
                    <path d="M0 10 L0 0 Q0 10 10 10 Z" fill="white" />
                    <path d="M0 0 Q0 10 10 10" stroke="#d1d5db" strokeWidth="1" fill="none" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Content box - connected to tabs */}
          <div style={{
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0 8px 8px 8px',
            padding: '24px'
          }}>
            {activeTab === 'basic' && (
              <div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-900 mb-2.5">Event Name *</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Annual Science Fair 2024" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white/50 backdrop-blur-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm hover:shadow-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2.5">Event Type *</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white/50 backdrop-blur-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm hover:shadow-md">
                      {types.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2.5">Venue</label>
                    <select value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white/50 backdrop-blur-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm hover:shadow-md">
                      {venues.map(v => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2.5">Attendees *</label>
                    <input type="number" value={form.attendees} onChange={e => setForm({ ...form, attendees: e.target.value })} placeholder="Expected number of attendees" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white/50 backdrop-blur-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm hover:shadow-md" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2.5">Organizer</label>
                    <input type="text" value={form.organizer} onChange={e => setForm({ ...form, organizer: e.target.value })} placeholder="Department or organization" className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white/50 backdrop-blur-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all shadow-sm hover:shadow-md" />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-900 mb-2.5">Description</label>
                    <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows="4" placeholder="Brief description of the event..." className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm bg-white/50 backdrop-blur-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none shadow-sm hover:shadow-md" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'equipment' && (
              <div>
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                  {Object.keys(eqCats).map(c => (
                    <button key={c} onClick={() => setEqTab(c)} className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${eqTab === c ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{c}</button>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(eqCats[eqTab] || []).map(item => {
                    const sel = form.equipment.find(e => e.name === item);
                    return (
                      <div key={item} onClick={() => toggleEq(item)} className={`relative p-4 rounded-xl border transition-all cursor-pointer ${sel ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:shadow-md'}`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm leading-tight pr-2">{item}</span>
                          {!sel && <div className="w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xs font-bold">+</div>}
                        </div>
                        {sel && (
                          <div className="flex items-center gap-2 mt-2">
                            <label className="text-xs opacity-90">Quantity:</label>
                            <input type="number" min="1" value={sel.quantity} onClick={e => e.stopPropagation()} onChange={e => updateQty(item, e.target.value)} className="w-16 px-2 py-1 border border-white/30 rounded text-sm bg-white/10 text-white text-center" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {form.equipment.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-800">Selected Equipment</h4>
                      <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">{form.equipment.length} items</span>
                    </div>
                    <div className="space-y-2">
                      {form.equipment.map((e, i) => (
                        <div key={i} className="flex justify-between text-sm text-gray-700">
                          <span>{e.name}</span>
                          <span className="font-semibold">×{e.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timeline' && (
              <div>
                {/* Multi-day Timeline Options - Hidden since dates removed */}
                {false && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.timelineMode === 'multi'}
                        onChange={(e) => {
                          const mode = e.target.checked ? 'multi' : 'single';
                          setForm(p => ({ ...p, timelineMode: mode, currentDay: 1 }));
                        }}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700">Different timeline for each day</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      {form.timelineMode === 'multi'
                        ? 'Configure separate schedules for each day of the event'
                        : 'Same schedule will be used for all days'}
                    </p>
                  </div>
                )}

                {/* Day Selector for Multi-day */}
                {form.timelineMode === 'multi' && (
                  <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2">
                    <span className="text-sm font-semibold text-gray-700 flex-shrink-0">Select Day:</span>
                    {(() => {
                      const days = [];
                      const start = new Date(form.startDate);
                      const end = new Date(form.endDate);
                      const diffTime = Math.abs(end - start);
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                      for (let i = 1; i <= diffDays; i++) {
                        days.push(
                          <button
                            key={i}
                            onClick={() => setForm(p => ({ ...p, currentDay: i }))}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-shrink-0 ${form.currentDay === i
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              }`}
                          >
                            Day {i}
                          </button>
                        );
                      }
                      return days;
                    })()}
                  </div>
                )}

                <div className="flex items-center justify-end mb-4">
                  <button onClick={addPhase} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2">
                    <I d="M12 4v16m8-8H4" c="w-4 h-4" /> Add Phase
                  </button>
                </div>

                <div className="space-y-3">
                  {(() => {
                    // Get current timeline based on mode
                    const currentTimeline = form.timelineMode === 'multi'
                      ? (form.multiDayTimelines[`day${form.currentDay}`] || [])
                      : form.timelines;

                    return currentTimeline.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <I d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" c="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">
                          {form.timelineMode === 'multi'
                            ? `No timeline for Day ${form.currentDay} yet. Click "Add Phase" to start.`
                            : 'No timeline phases yet. Click "Add Phase" to start.'}
                        </p>
                      </div>
                    ) : currentTimeline.map((p, i) => (
                      <div key={`${form.currentDay}-${i}`} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm text-gray-400 font-bold w-6">{i + 1}</span>
                          <input type="text" ref={el => timeRefs.current[`start-${form.currentDay}-${i}`] = el} value={p.startTime} onChange={e => updatePhase(i, 'startTime', e.target.value)} placeholder="Start" className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-center" />
                          <span className="text-gray-400">→</span>
                          <input type="text" ref={el => timeRefs.current[`end-${form.currentDay}-${i}`] = el} value={p.endTime} onChange={e => updatePhase(i, 'endTime', e.target.value)} placeholder="End" className="w-20 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-center" />
                          <input type="text" value={p.phase} onChange={e => updatePhase(i, 'phase', e.target.value)} placeholder="Activity name" className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" />
                          <button onClick={() => delPhase(i)} className="text-gray-400 hover:text-red-500 p-2">
                            <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" c="w-5 h-5" />
                          </button>
                        </div>
                        <div className="ml-8">
                          <textarea
                            value={p.description || ''}
                            onChange={e => updatePhase(i, 'description', e.target.value)}
                            placeholder="Description of this activity (optional)..."
                            rows="2"
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                          />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {activeTab === 'budget' && (
              <div>
                <div className="flex items-center justify-end mb-4">
                  <button onClick={addBudget} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700 flex items-center gap-2">
                    <I d="M12 4v16m8-8H4" c="w-4 h-4" /> Add Category
                  </button>
                </div>
                <div className="space-y-3">
                  {form.budgetCats.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      <I d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" c="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No budget categories yet. Click "Add Category" to start.</p>
                    </div>
                  ) : form.budgetCats.map((c, i) => {
                    const pct = form.budget && c.amount ? Math.round((c.amount / +form.budget) * 100) : 0;
                    return (
                      <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-3 mb-3">
                          <input type="text" value={c.name} onChange={e => updateBudget(i, 'name', e.target.value)} placeholder="Category name" className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm" />
                          <div className="relative w-32">
                            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₱</span>
                            <input type="number" min="0" value={c.amount || ''} onChange={e => updateBudget(i, 'amount', e.target.value)} placeholder="0" className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-right" />
                          </div>
                          <button onClick={() => delBudget(i)} className="text-gray-400 hover:text-red-500 p-2">
                            <I d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" c="w-5 h-5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all" style={{ width: Math.min(pct, 100) + '%' }} />
                          </div>
                          <span className="text-sm font-bold text-amber-600 w-12 text-right">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {form.budget && form.budgetCats.length > 0 && (
                  <div className="mt-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-6 text-white">
                    <p className="text-sm opacity-90 mb-1">Total Budget</p>
                    <p className="text-3xl font-bold">₱{(+form.budget).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'resources' && (
              <div>
                <div className="flex gap-3 mb-4">
                  <input type="text" value={newRes} onChange={e => setNewRes(e.target.value)} onKeyPress={e => e.key === 'Enter' && addRes()} placeholder="Add resource item..." className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none" />
                  <button onClick={addRes} className="px-6 py-3 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.resources.length === 0 ? (
                    <div className="w-full text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      <I d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" c="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No additional resources added yet.</p>
                    </div>
                  ) : form.resources.map((r, i) => (
                    <span key={i} className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium border border-indigo-200">
                      {r}
                      <button onClick={() => delRes(i)} className="text-indigo-400 hover:text-red-500 font-bold">×</button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {renderModal()}
    </div>
  );
};
