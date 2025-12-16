// AdminEventsManager - Main events management component (Reusable)
const { useState, useEffect } = React;

window.AdminEventsManager = function AdminEventsManager() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [budgetData, setBudgetData] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [selectedEventHistory, setSelectedEventHistory] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [activeEquipmentTab, setActiveEquipmentTab] = useState('Audio & Visual');
  const [checkedActivities, setCheckedActivities] = useState([]);
  const [checkedCatering, setCheckedCatering] = useState([]);
  const [checkedResources, setCheckedResources] = useState([]);
  const [formData, setFormData] = useState({
    name: '', type: 'Academic', date: '', endDate: '', startTime: '09:00', endTime: '17:00',
    venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '',
    status: 'Draft', description: '', activities: [], catering: [], additionalResources: []
  });

  const equipmentCategories = {
    'Audio & Visual': ['Projector', 'Sound System', 'Microphone', 'Screen'],
    'Furniture & Setup': ['Tables', 'Chairs', 'Stage', 'Podium'],
    'Sports & Venue': ['Goal Posts', 'Scoreboard', 'Lighting', 'Camera']
  };
  const venueOptions = ['Auditorium', 'Gymnasium', 'Main Hall', 'Cafeteria', 'Lab', 'Courtyard', 'Library'];

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await fetch('/api/events', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetUpdate = (updatedBudgetData) => {
    setBudgetData(updatedBudgetData);
    setFormData(prev => ({ ...prev, budget: updatedBudgetData.totalBudget }));
  };

  const handleEquipmentUpdate = (updatedEquipment) => {
    setFormData(prev => ({ ...prev, equipment: updatedEquipment }));
  };

  const handleAddEvent = () => {
    setEditingId(null);
    setFormData({
      name: '', type: 'Academic', date: '', endDate: '', startTime: '09:00', endTime: '17:00',
      venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '',
      status: 'Draft', description: '', activities: [], catering: [], additionalResources: []
    });
    setAiSuggestions(null);
    setShowModal(true);
  };

  const handleEditEvent = (event) => {
    setEditingId(event.id);
    setFormData({
      name: event.name || '', 
      type: event.type || 'Academic', 
      date: event.date || '', 
      endDate: event.endDate || event.date || '',
      startTime: event.startTime || '09:00', 
      endTime: event.endTime || '17:00', 
      venue: event.venue || '',
      equipment: event.equipment || [], 
      attendees: event.attendees || '', 
      budget: event.budget || '',
      organizer: event.organizer || '', 
      status: event.status || 'Planning', 
      description: event.description || '',
      activities: event.activities || [], 
      catering: event.catering || [], 
      additionalResources: event.additionalResources || []
    });
    setAiSuggestions(null);
    setShowModal(true);
  };

  const handleSaveEvent = async () => {
    if (!formData.name.trim() || !formData.date) {
      alert('Event name and date are required');
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const startDt = `${formData.date} ${formData.startTime}:00`;
      const endDt = `${formData.endDate || formData.date} ${formData.endTime}:00`;

      const eventData = {
        name: formData.name,
        event_type: formData.type,
        start_datetime: startDt,
        end_datetime: endDt,
        venue: formData.venue || '',
        organizer: formData.organizer || '',
        description: formData.description || '',
        expected_attendees: parseInt(formData.attendees) || 0,
        budget: parseFloat(formData.budget) || 0,
        requestor_id: user.id || 1,
        equipment: formData.equipment || [],
        activities: formData.activities || [],
        budget_breakdown: budgetData?.breakdown || {}
      };

      if (editingId) {
        const res = await fetch(`/api/events/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(eventData)
        });
        if (res.ok) {
          alert('Event updated successfully');
          loadEvents();
        } else {
          const err = await res.json();
          alert('Error: ' + (err.error || 'Failed to update'));
        }
      } else {
        const res = await fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(eventData)
        });
        if (res.ok) {
          alert('Event created successfully');
          loadEvents();
        } else {
          const err = await res.json();
          alert('Error: ' + (err.error || 'Failed to create'));
        }
      }

      setShowModal(false);
      setAiSuggestions(null);
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Error: ' + err.message);
    }
  };

  const handleAutoFill = async () => {
    if (!formData.name.trim()) {
      alert('Please enter an event name first!');
      return;
    }
    setAiLoading(true);
    try {
      const response = await fetch('/api/ml/predict-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName: formData.name, eventType: formData.type })
      });

      const aiData = await response.json();

      if (aiData.success) {
        const totalBudget = aiData.estimatedBudget || 50000;
        const budgetBreakdown = aiData.budgetBreakdown || {};
        const categories = Object.keys(budgetBreakdown);
        const breakdown = {};
        const percentages = [];
        let totalPercentage = 0;

        categories.forEach(cat => {
          const percentage = budgetBreakdown[cat] || 0;
          totalPercentage += percentage;
          const amount = Math.round((totalBudget * percentage) / 100);
          breakdown[cat] = { percentage: percentage, amount: amount };
          percentages.push(percentage);
        });

        if (totalPercentage > 100) {
          console.warn(`Budget percentages exceed 100% (${totalPercentage}%). Normalizing...`);
          const normalizedBreakdown = {};
          const normalizedPercentages = [];
          categories.forEach(cat => {
            const normalizedPct = Math.round((breakdown[cat].percentage / totalPercentage) * 100);
            const amount = Math.round((totalBudget * normalizedPct) / 100);
            normalizedBreakdown[cat] = { percentage: normalizedPct, amount: amount };
            normalizedPercentages.push(normalizedPct);
          });
          setBudgetData({
            totalBudget: totalBudget,
            categories: categories,
            breakdown: normalizedBreakdown,
            percentages: normalizedPercentages
          });
        } else {
          setBudgetData({
            totalBudget: totalBudget,
            categories: categories,
            breakdown: breakdown,
            percentages: percentages
          });
        }

        setResourceData({
          checklist: {
            'Resources': (aiData.resources || []).map(r => ({ name: r, status: 'available' }))
          }
        });

        setTimelineData({ timeline: aiData.timeline || [] });

        let updatedFormData = {
          ...formData,
          description: aiData.description,
          budget: totalBudget
        };

        if (aiData.resources && aiData.resources.length > 0) {
          updatedFormData = { ...updatedFormData, equipment: aiData.resources };
        }

        if (aiData.eventType && aiData.eventType !== formData.type) {
          updatedFormData = { ...updatedFormData, type: aiData.eventType };
        }

        if (aiData.timeline && aiData.timeline.length > 0) {
          const firstPhase = aiData.timeline[0];
          const lastPhase = aiData.timeline[aiData.timeline.length - 1];
          updatedFormData = {
            ...updatedFormData,
            startTime: firstPhase.startTime,
            endTime: lastPhase.endTime,
            // Map timeline phases to activities list with time range included
            activities: aiData.timeline.map(t => `${t.startTime} - ${t.endTime}: ${t.phase}`)
          };
        } else if (aiData.activities && aiData.activities.length > 0) {
           // Fallback to generic activities if no timeline
           updatedFormData = {
             ...updatedFormData,
             activities: aiData.activities
           };
        }

        setFormData(updatedFormData);
        setAiSuggestions({ success: true, confidence: aiData.confidence });
      } else {
        alert('AI analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert(`Backend Error: ${error.message}\n\nChecking:\n1. Backend running? (python app.py)\n2. Port 5000 accessible?`);
    }
    setAiLoading(false);
  };

  const toggleActivity = (item) => {
    const newActivities = checkedActivities.includes(item) 
      ? checkedActivities.filter(a => a !== item) 
      : [...checkedActivities, item];
    setCheckedActivities(newActivities);
    setFormData(prev => ({ ...prev, activities: newActivities }));
  };

  const toggleCatering = (item) => {
    setCheckedCatering(prev => 
      prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]
    );
  };

  const toggleAdditionalResource = (item) => {
    setCheckedResources(prev => 
      prev.includes(item) ? prev.filter(r => r !== item) : [...prev, item]
    );
  };

  const handleDeleteEvent = async (id) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        const res = await fetch(`/api/events/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) {
          alert('Event deleted successfully');
          loadEvents();
        } else {
          alert('Failed to delete event');
        }
      } catch (err) {
        console.error('Error deleting event:', err);
        alert('Error deleting event: ' + err.message);
      }
    }
  };

  const toggleEquipment = (equip) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equip)
        ? prev.equipment.filter(e => e !== equip)
        : [...prev.equipment, equip]
    }));
  };

  let filteredEvents = events.filter(e => {
    const matchStatus = filterStatus === 'All' || e.status === filterStatus;
    const matchType = filterType === 'All' || e.type === filterType;
    const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  if (sortBy === 'date') filteredEvents.sort((a, b) => new Date(a.date) - new Date(b.date));
  else if (sortBy === 'budget') filteredEvents.sort((a, b) => b.budget - a.budget);
  else if (sortBy === 'name') filteredEvents.sort((a, b) => a.name.localeCompare(b.name));

  const totalBudget = events.reduce((sum, e) => sum + (parseInt(e.budget) || 0), 0);
  const stats = {
    total: events.length,
    planning: events.filter(e => e.status === 'Planning').length,
    inProgress: events.filter(e => e.status === 'In Progress').length,
    completed: events.filter(e => e.status === 'Completed').length
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition">
          <p className="text-sm font-medium text-slate-600 mb-2">Total Events</p>
          <p className="text-3xl font-bold text-indigo-600">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition">
          <p className="text-sm font-medium text-slate-600 mb-2">Planning</p>
          <p className="text-3xl font-bold text-yellow-600">{stats.planning}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition">
          <p className="text-sm font-medium text-slate-600 mb-2">In Progress</p>
          <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-6 hover:shadow-lg transition">
          <p className="text-sm font-medium text-slate-600 mb-2">Total Budget</p>
          <p className="text-3xl font-bold text-green-600">₱{(totalBudget/1000).toFixed(0)}K</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-slate-900">Events Management</h2>
          <button onClick={handleAddEvent} className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold shadow-md">
            + Create Event
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="All">All Status</option>
            <option value="Draft">Draft</option>
            <option value="Pending">Pending</option>
            <option value="Under Review">Under Review</option>
            <option value="Approved">Approved</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option>All Types</option>
            <option>Academic</option>
            <option>Sports</option>
            <option>Cultural</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="budget">Sort by Budget</option>
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Event Name</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Type</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Date</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Budget</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Status</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Approvals</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredEvents.map(event => {
              const user = JSON.parse(localStorage.getItem('user') || '{}');
              return (
                <tr key={event.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{event.name}</div>
                    <div className="text-xs text-slate-500">{event.organizer}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      event.type === 'Academic' ? 'bg-blue-100 text-blue-700' :
                      event.type === 'Sports' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {event.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <div>{event.date}</div>
                    <div className="text-xs text-slate-400">{event.startTime} - {event.endTime}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">₱{Number(event.budget || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-6 py-4">
                    <ApprovalActions event={event} userRole={user.role_name} onSuccess={loadEvents} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => handleEditEvent(event)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs font-semibold">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteEvent(event.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-xs font-semibold">
                        Delete
                      </button>
                      <button onClick={() => setSelectedEventHistory(event.id)} className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-xs font-semibold">
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* History Modal */}
      {selectedEventHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedEventHistory(null)}>
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Event Status History</h3>
              <button onClick={() => setSelectedEventHistory(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <EventStatusTimeline eventId={selectedEventHistory} />
          </div>
        </div>
      )}

      {/* Modal Overlay */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowModal(false)}></div>
      )}

      {/* Modal Content - Created by EventFormModal component */}
      {showModal && (
        <EventFormModal
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          aiLoading={aiLoading}
          aiSuggestions={aiSuggestions}
          budgetData={budgetData}
          resourceData={resourceData}
          timelineData={timelineData}
          activeEquipmentTab={activeEquipmentTab}
          setActiveEquipmentTab={setActiveEquipmentTab}
          checkedActivities={checkedActivities}
          checkedCatering={checkedCatering}
          checkedResources={checkedResources}
          equipmentCategories={equipmentCategories}
          venueOptions={venueOptions}
          handleAutoFill={handleAutoFill}
          handleSaveEvent={handleSaveEvent}
          setShowModal={setShowModal}
          toggleEquipment={toggleEquipment}
          toggleActivity={toggleActivity}
          toggleCatering={toggleCatering}
          toggleAdditionalResource={toggleAdditionalResource}
          handleBudgetUpdate={handleBudgetUpdate}
          handleEquipmentUpdate={handleEquipmentUpdate}
          setAiSuggestions={setAiSuggestions}
          setBudgetData={setBudgetData}
        />
      )}
    </div>
  );
}
