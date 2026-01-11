// AdminEventsManager - Main events management component (Reusable)
const { useState, useEffect } = React;

window.AdminEventsManager = function AdminEventsManager({ eventIdToOpen }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sortBy, setSortBy] = useState('date');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterDepartment, setFilterDepartment] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [budgetData, setBudgetData] = useState(null);
  const [resourceData, setResourceData] = useState(null);
  const [selectedEventHistory, setSelectedEventHistory] = useState(null);
  // const [selectedEventAttendance, setSelectedEventAttendance] = useState(null); // Deprecated: Moved to dedicated tab
  const [timelineData, setTimelineData] = useState(null);
  const [activeEquipmentTab, setActiveEquipmentTab] = useState('Audio & Visual');
  const [checkedActivities, setCheckedActivities] = useState([]);
  const [checkedResources, setCheckedResources] = useState([]);
  const [activeModalTab, setActiveModalTab] = useState('details'); // Track which tab is active in modal
  const [formData, setFormData] = useState({
    name: '', type: 'Academic', date: '', endDate: '', startTime: '09:00', endTime: '17:00',
    venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '',
    status: 'Pending', description: '', activities: [], additionalResources: []
  });

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Delete Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);

  // AI Enhancement States
  const [modelStatus, setModelStatus] = useState({ ready: false, models: {} });
  const [budgetEstimate, setBudgetEstimate] = useState(null);
  const [lastAIRequest, setLastAIRequest] = useState(null);

  // Dynamic Equipment Categories State (Updated to fetch from DB)
  // Initial state serves as a fallback while loading
  const [equipmentCategories, setEquipmentCategories] = useState({
    'Audio & Visual': ['Projector', 'Speaker', 'Microphone', 'Screen'],
    'Furniture & Setup': ['Tables', 'Chairs', 'Stage', 'Podium'],
    'Sports & Venue': ['Scoreboard', 'Lighting', 'Camera', 'First Aid Kit']
  });

  const [venueOptions, setVenueOptions] = useState(['Auditorium', 'Gymnasium', 'Main Hall', 'Cafeteria', 'Lab', 'Courtyard', 'Library']);

  // Helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const formatTimeRange = (start, end) => {
    if (!start && !end) return '—';
    const to12h = (t) => {
      if (!t) return '';
      const [h, m] = t.split(':');
      const date = new Date();
      date.setHours(parseInt(h, 10), parseInt(m, 10));
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(date);
    };
    const startFmt = to12h(start);
    const endFmt = to12h(end);
    return `${startFmt}${endFmt ? ` – ${endFmt}` : ''}`;
  };

  useEffect(() => {
    fetchEvents();
    loadVenues();
    fetchEquipmentOptions(); // Load dynamic equipment on mount
    checkModelStatus(); // Check if AI models are ready

    // Check if there's an event to open from notification
    const eventIdToOpen = sessionStorage.getItem('openEventId');
    if (eventIdToOpen) {
      sessionStorage.removeItem('openEventId');
      // Wait a bit for events to load, then open
      setTimeout(() => {
        if (window.openEventEditor) {
          window.openEventEditor(parseInt(eventIdToOpen));
        }
      }, 500);
    }
  }, [sortBy, filterStatus, filterType]);

  // Open event when triggered from notification
  useEffect(() => {
    if (eventIdToOpen && events.length > 0) {
      const event = events.find(e => e.id === eventIdToOpen);
      if (event) {
        handleEditEvent(event);
      }
    }
  }, [eventIdToOpen, events]);

  // Check AI model status on mount
  const checkModelStatus = async () => {
    try {
      const response = await fetch('/api/ml/model-status');
      const data = await response.json();
      if (data.success) {
        setModelStatus(data);
      }
    } catch (error) {
      console.error('Failed to check model status:', error);
    }
  };

  const loadVenues = async () => {
    try {
      const res = await fetch('/api/venues/');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.venues) {
          setVenueOptions(data.venues.map(v => v.name));
        }
      }
    } catch (err) {
      console.error('Failed to load venues:', err);
    }
  };

  // NEW: Fetch dynamic equipment from database
  const fetchEquipmentOptions = async () => {
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

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        sort: sortBy,
        status: filterStatus !== 'All' ? filterStatus : '',
        type: filterType !== 'All' ? filterType : ''
      });

      const res = await fetch(`/api/events?${queryParams}`, { credentials: 'include' });
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

  // Helper: Check if enough data for AI suggestions
  const hasEnoughData = () => {
    return (
      formData.name.trim().length >= 3 &&
      formData.type &&
      formData.attendees &&
      parseInt(formData.attendees) > 0
    );
  };

  // Fetch quick budget estimate for inline hint
  const fetchBudgetEstimate = async (eventType, attendees = null) => {
    try {
      const response = await fetch('/api/ml/quick-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          attendees: attendees || 100
        })
      });
      const data = await response.json();
      if (data.success) {
        setBudgetEstimate(data.estimatedBudget);
      }
    } catch (error) {
      console.error('Failed to fetch budget estimate:', error);
    }
  };

  // Update budget estimate when type or attendees change
  useEffect(() => {
    if (formData.name.trim().length >= 3 && formData.type && formData.attendees && parseInt(formData.attendees) > 0) {
      const attendees = parseInt(formData.attendees);
      fetchBudgetEstimate(formData.type, attendees);
    } else {
      setBudgetEstimate(null);
    }
  }, [formData.name, formData.type, formData.attendees]);

  const handleAddEvent = () => {
    setEditingId(null);
    setFormData({
      name: '', type: 'Academic', date: '', endDate: '', startTime: '09:00', endTime: '17:00',
      venue: 'Auditorium', equipment: [], attendees: '', budget: '', organizer: '',
      status: 'Pending', description: '', activities: [], additionalResources: []
    });
    setCheckedResources([]);
    setCheckedActivities([]);
    setBudgetData(null);
    setTimelineData(null);
    setResourceData(null);
    setAiSuggestions(null);
    setActiveModalTab('details');
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
      organizing_department: event.organizing_department || '',
      status: event.status || 'Planning',
      description: event.description || '',
      activities: event.activities || [],

      additionalResources: event.additional_resources || []
    });

    // Load budget breakdown if exists
    // Load budget breakdown if exists
    if (event.budget_breakdown) {
      const breakdownData = event.budget_breakdown;
      // Check if it's the full structure (has categories/breakdown keys)
      if (breakdownData.categories && breakdownData.breakdown) {
        setBudgetData({
          totalBudget: event.budget || 0,
          categories: breakdownData.categories,
          breakdown: breakdownData.breakdown,
          percentages: breakdownData.percentages || []
        });
      } else {
        // Legacy: Convert budget_breakdown object (dictionary) to the format
        const categories = Object.keys(breakdownData);
        const percentages = categories.map(cat => breakdownData[cat]?.percentage || 0);

        setBudgetData({
          totalBudget: event.budget || 0,
          categories,
          breakdown: breakdownData,
          percentages
        });
      }
    } else {
      setBudgetData(null);
    }

    // Generate timeline data from activities if they exist
    if (event.activities && event.activities.length > 0) {
      const timeline = event.activities.map((activity, index) => {
        // Check if activity is already in the correct timeline format (object with phase)
        if (typeof activity === 'object' && activity.phase) {
          return activity;
        }

        // Check if activity is in the stored JSON format (object with activity_name, startTime, etc.)
        if (typeof activity === 'object' && activity.activity_name) {
          // Extract phase name from activity_name (format: "09:00 - 10:00: Phase Name")
          const timeMatch = activity.activity_name.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}):\s*(.+)$/);
          const phaseName = timeMatch ? timeMatch[3].trim() : activity.activity_name;

          return {
            phase: phaseName,
            startTime: activity.startTime || '09:00',
            endTime: activity.endTime || '10:00',
            duration: activity.duration || 60,
            description: activity.description || phaseName
          };
        }

        // Handle string format: "09:00 - 10:00: Phase Name"
        if (typeof activity === 'string') {
          const timeMatch = activity.match(/^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2}):\s*(.+)$/);
          if (timeMatch) {
            const [, startTime, endTime, phase] = timeMatch;
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);
            const duration = Math.round((end - start) / (1000 * 60)); // minutes

            return {
              phase: phase.trim(),
              startTime,
              endTime,
              duration,
              description: `${phase.trim()} phase`
            };
          } else {
            // Fallback for activities without time format
            return {
              phase: activity,
              startTime: '09:00',
              endTime: '10:00',
              duration: 60,
              description: activity
            };
          }
        }

        // Final fallback
        return {
          phase: 'Unknown',
          startTime: '09:00',
          endTime: '10:00',
          duration: 60,
          description: 'Unknown activity'
        };
      });

      setTimelineData({ timeline });
    } else {
      setTimelineData(null);
    }

    // Set checkedResources from event's additional_resources (backend uses snake_case)
    if (event.additional_resources && Array.isArray(event.additional_resources)) {
      setCheckedResources(event.additional_resources);
    } else {
      setCheckedResources([]);
    }

    setAiSuggestions(null);

    // Always set active tab to details so content is visible
    setActiveModalTab('details');

    setShowModal(true);
  };

  // Auto-trigger AI for conflict-rejected events
  useEffect(() => {
    if (showModal && editingId && formData.name) {
      // Find the event to check if it's conflict rejected
      const event = events.find(e => e.id === editingId);
      // Ensure we only trigger if not already loaded or loading
      if (event && event.status === 'Conflict_Rejected' && !aiSuggestions && !aiLoading) {
        // Trigger AI after a short delay to ensure modal is rendered
        setTimeout(() => {
          handleAutoFill();
        }, 300);
      }
    }
  }, [showModal, editingId]);

  // Expose function globally for notifications to trigger event editing
  useEffect(() => {
    window.openEventEditor = async (eventId) => {
      // Fetch event data if not already loaded
      let event = events.find(e => e.id === eventId);

      if (!event) {
        // Fetch the event from API
        try {
          const response = await fetch(`/api/events/${eventId}`);
          if (response.ok) {
            const data = await response.json();
            event = data.event;
          }
        } catch (error) {
          console.error('Failed to fetch event:', error);
          return;
        }
      }

      if (event) {
        handleEditEvent(event);
      }
    };

    return () => {
      delete window.openEventEditor;
    };
  }, [events]);

  const handleSaveEvent = async () => {
    if (!formData.name.trim() || !formData.date) {
      alert('Event name and date are required');
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const startDt = `${formData.date} ${formData.startTime}:00`;
      const endDt = `${formData.endDate || formData.date} ${formData.endTime}:00`;

      // Filter out empty categories from budget breakdown
      const filteredBudgetBreakdown = {};
      if (budgetData?.breakdown) {
        Object.entries(budgetData.breakdown).forEach(([category, details]) => {
          // Only include categories with a name and non-zero amount
          if (category.trim() && details.amount > 0) {
            filteredBudgetBreakdown[category] = details;
          }
        });
      }

      const eventData = {
        name: formData.name,
        event_type: formData.type,
        start_datetime: startDt,
        end_datetime: endDt,
        venue: formData.venue || '',
        organizer: formData.organizer || '',
        organizing_department: formData.organizing_department || '',
        description: formData.description || '',
        expected_attendees: parseInt(formData.attendees) || 0,
        budget: parseFloat(formData.budget) || 0,
        requestor_id: user.id || 1,
        equipment: formData.equipment || [],
        activities: formData.activities || [],
        budget_breakdown: filteredBudgetBreakdown,

        additional_resources: formData.additionalResources || []
      };

      console.log('=== Saving Event Data ===');
      console.log('formData.additionalResources (available options):', formData.additionalResources);
      console.log('checkedResources (selected items):', checkedResources);
      console.log('eventData.additional_resources:', eventData.additional_resources);

      const endpoint = editingId ? `/api/events/${editingId}` : '/api/events';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(eventData)
      });

      if (res.ok) {
        setSuccessMessage(`Event ${editingId ? 'updated' : 'created'} successfully`);
        setShowSuccessModal(true);
        fetchEvents();
        setShowModal(false);
        setAiSuggestions(null);
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Failed to save'));
      }
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

    // Check if models are trained
    if (!modelStatus.ready) {
      const needsTraining = modelStatus.training_samples >= 5;
      if (needsTraining) {
        alert('⚠️ AI models need training!\n\nYou have enough training data, but models haven\'t been trained yet.\n\nPlease visit the AI Training Dashboard to train the models first.');
      } else {
        alert('⚠️ Not enough training data!\n\nAI needs at least 5 validated events to learn from.\n\nUsing basic estimates for now. Add more training data in AI Training Dashboard for better predictions.');
      }
      // Continue with fallback estimates even without models
    }

    setAiLoading(true);
    try {
      // Use the form type (which was already updated by classification if applicable)
      const eventType = formData.type;

      const requestParams = {
        eventType: eventType,
        attendees: parseInt(formData.attendees) || 100,
        eventName: formData.name || '',  // Fixed: use formData.name not formData.eventName
        duration: 4
      };

      console.log('[DEBUG] AI Request - Event Name:', formData.name);
      console.log('[DEBUG] AI Request - Full Params:', requestParams);

      // Store request params for stale detection
      setLastAIRequest(requestParams);

      const response = await fetch('/api/ml/predict-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestParams)
      });

      const aiData = await response.json();
      console.log('[DEBUG] AI Response:', aiData);
      console.log('[DEBUG] AI Description:', aiData.description);
      console.log('[DEBUG] AI Suggested Attendees:', aiData.suggestedAttendees);

      if (aiData.success) {
        // --- 1. Populate AI Suggestions State ---
        // This is crucial for the "AI Analysis" panel to appear

        // Convert breakdown object to string for display to prevent React error
        const breakdownStr = aiData.budgetBreakdown
          ? Object.entries(aiData.budgetBreakdown)
            .map(([k, v]) => `${k}: ₱${typeof v === 'number' ? v.toLocaleString() : v}`)
            .join(', ')
          : '';

        // Identify equipment and resources
        const rawEquipment = aiData.equipment || aiData.resources || [];
        // Fix: Normalize equipment strings to objects so EventFormModal can render .name
        const equipment = rawEquipment.map(item => {
          return typeof item === 'string' ? { name: item, quantity: 1 } : item;
        });

        // Filter additional resources to remove any items that are already in equipment
        const rawResources = aiData.additionalResources || [];
        const additionalResources = rawResources.filter(r => {
          const rName = typeof r === 'string' ? r : r.name;
          return !equipment.some(e => e.name === rName);
        });

        setAiSuggestions({
          success: true,
          confidence: aiData.confidence,
          estimatedBudget: aiData.estimatedBudget,
          budgetBreakdown: aiData.budgetBreakdown, // Store FULL Object for sidebar
          timeline: aiData.timeline || [],
          equipmentSuggestions: equipment, // Now guaranteed to be objects with .name
          additionalResources: additionalResources, // Fix: Use filtered resources
          description: aiData.description,
          suggestedAttendees: aiData.suggestedAttendees,
          eventType: aiData.eventType
        });

        // FIX: Automatically update the accepted event type if it differs and confidence is adequate
        if (aiData.eventType && aiData.eventType !== formData.type) {
          console.log(`[Auto-Fill] Auto-switching type from ${formData.type} to ${aiData.eventType}`);
          setFormData(prev => ({
            ...prev,
            type: aiData.eventType
          }));
        }


        // AI suggestions will be shown in side panel, no need to force tab switch
        // User can navigate tabs freely while viewing AI suggestions

      } else {
        alert('AI analysis failed. Please try again.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      alert(`Backend Error: ${error.message}`);
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

  const toggleAdditionalResource = (item) => {
    console.log('toggleAdditionalResource called with:', item);
    const newResources = checkedResources.includes(item)
      ? checkedResources.filter(r => r !== item)
      : [...checkedResources, item];
    console.log('New checkedResources:', newResources);
    setCheckedResources(newResources);
  };

  const handleDeleteEvent = (id) => {
    setEventToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;

    try {
      const res = await fetch(`/api/events/${eventToDelete}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        setSuccessMessage('Event deleted successfully');
        setShowSuccessModal(true);
        fetchEvents(); // Reload events
      } else {
        alert('Failed to delete event');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Error deleting event: ' + err.message);
    } finally {
      setShowDeleteModal(false);
      setEventToDelete(null);
    }
  };

  const handleExportPDF = (eventId) => {
    // Open in new tab with preview=true to view inline
    window.open(`/api/events/${eventId}/export-pdf?preview=true`, '_blank');
  };

  const toggleEquipment = (item) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(item)
        ? prev.equipment.filter(i => i !== item)
        : [...prev.equipment, item]
    }));
  };

  // Filter Logic
  let filteredEvents = events.filter(e => {
    const matchStatus = filterStatus === 'All' || e.status === filterStatus;
    const matchType = filterType === 'All' || (e.event_type || e.type) === filterType;
    const matchDepartment = filterDepartment === 'All' || e.organizing_department === filterDepartment;
    const matchSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchType && matchDepartment && matchSearch;
  });

  if (sortBy === 'date') filteredEvents.sort((a, b) => new Date(a.start_datetime || a.date) - new Date(b.start_datetime || b.date));
  else if (sortBy === 'budget') filteredEvents.sort((a, b) => (parseFloat(b.budget) || 0) - (parseFloat(a.budget) || 0));
  else if (sortBy === 'name') filteredEvents.sort((a, b) => a.name.localeCompare(b.name));

  const totalBudget = events.reduce((sum, e) => sum + (parseInt(e.budget) || 0), 0);

  // Calculate improved metrics
  const now = new Date();
  const stats = {
    total: events.length,
    // Action Required: Events needing approval or review
    actionRequired: events.filter(e => e.status === 'Pending' || e.status === 'Under Review').length,
    // Upcoming: Approved events happening in the future
    upcoming: events.filter(e => {
      const isApproved = e.status === 'Approved';
      const isFuture = new Date(e.start_datetime || e.date) > now;
      return isApproved && isFuture;
    }).length,
    // Budget formatted
    formattedBudget: totalBudget >= 1000000
      ? `₱${(totalBudget / 1000000).toFixed(1)}M`
      : `₱${(totalBudget / 1000).toFixed(0)}K`
  };

  return (
    <div className="space-y-6">

      {/* Page Header */}
      {/* Page Header Removed - Redundant with Dashboard Header */}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        {/* Total Events */}
        <div className="bg-white rounded-xl p-3 md:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:gap-4">
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 mb-2 md:mb-0">
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center md:text-left">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider leading-tight">Total Events</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        {/* Action Required */}
        <div className="bg-white rounded-xl p-3 md:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:gap-4">
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 mb-2 md:mb-0">
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-center md:text-left">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider leading-tight">Action Required</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900">{stats.actionRequired}</p>
          </div>
        </div>

        {/* Upcoming Approved */}
        <div className="bg-white rounded-xl p-3 md:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:gap-4">
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-2 md:mb-0">
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-center md:text-left">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider leading-tight">Upcoming Approved</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900">{stats.upcoming}</p>
          </div>
        </div>

        {/* Total Budget */}
        <div className="bg-white rounded-xl p-3 md:p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:gap-4">
          <div className="w-8 h-8 md:w-12 md:h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2 md:mb-0">
            <svg className="w-4 h-4 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center md:text-left">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider leading-tight">Total Budget</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900">{stats.formattedBudget}</p>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {/* Header & Controls */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Events Management</h2>
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search */}
            <div className="relative w-full md:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 flex-1 justify-center md:justify-end">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="All">All Types</option>
                <option>Academic</option>
                <option>Sports</option>
                <option>Cultural</option>
              </select>

              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="All">All Departments</option>
                <optgroup label="IT & Engineering">
                  <option value="BSIT">BSIT</option>
                  <option value="BSCpE">BSCpE</option>
                  <option value="BSIS">BSIS</option>
                </optgroup>
                <optgroup label="Business & Management">
                  <option value="BSBA">BSBA</option>
                  <option value="BSOA">BSOA</option>
                  <option value="BSHRM">BSHRM</option>
                  <option value="BSTM">BSTM</option>
                  <option value="BSAct">BSAct</option>
                </optgroup>
                <optgroup label="Education & Arts">
                  <option value="BEEd">BEEd</option>
                  <option value="BSEd">BSEd</option>
                  <option value="BTTE">BTTE</option>
                  <option value="BLIS">BLIS</option>
                  <option value="BSPsych">BSPsych</option>
                  <option value="BSCrim">BSCrim</option>
                </optgroup>
                <option value="General">General/Cross-Dept</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500"
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="budget">Sort by Budget</option>
              </select>

              {/* Create Button */}
              <button
                onClick={handleAddEvent}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition font-medium flex items-center gap-2 text-sm shadow-sm ml-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Event
              </button>
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Event Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Type</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Department</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Schedule</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Approvals</th>
                <th className="px-4 py-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.map(event => {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                return (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 border border-slate-200 text-slate-500">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 text-sm leading-tight">{event.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{event.organizer || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {event.event_type || event.type}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">
                        {event.organizing_department || <span className="text-slate-400">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-slate-900 font-medium">
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(event.start_datetime || event.date)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTimeRange(event.startTime, event.endTime)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-900 text-sm">₱{Number(event.budget || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      {window.StatusBadge ? <StatusBadge status={event.status} /> : <span className="text-sm">{event.status}</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      {window.ApprovalActions && <ApprovalActions event={event} userRole={user.role_name} onSuccess={fetchEvents} />}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors hover:text-blue-600"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleExportPDF(event.id)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors hover:text-indigo-600"
                          title="Export PDF"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => setSelectedEventHistory(event.id)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors hover:text-orange-600"
                          title="History"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(event.id)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors hover:text-red-600"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
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
              {window.EventStatusTimeline && <EventStatusTimeline eventId={selectedEventHistory} />}
            </div>
          </div>
        )}

        {/* Attendance Modal - DEPRECATED: Now using dedicated tab */}
        {/* {selectedEventAttendance && (
        window.AttendanceModal && <AttendanceModal eventId={selectedEventAttendance} onClose={() => setSelectedEventAttendance(null)} />
      )} */}

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
            checkedResources={checkedResources}
            equipmentCategories={equipmentCategories}
            venueOptions={venueOptions}
            handleAutoFill={handleAutoFill}
            handleSaveEvent={handleSaveEvent}
            setShowModal={setShowModal}
            toggleEquipment={toggleEquipment}
            toggleActivity={toggleActivity}
            toggleAdditionalResource={toggleAdditionalResource}
            setCheckedResources={setCheckedResources}
            handleBudgetUpdate={handleBudgetUpdate}
            handleEquipmentUpdate={handleEquipmentUpdate}
            setAiSuggestions={setAiSuggestions}
            setBudgetData={setBudgetData}
            setTimelineData={setTimelineData}
            modelStatus={modelStatus}
            budgetEstimate={budgetEstimate}
            lastAIRequest={lastAIRequest}
            hasEnoughData={hasEnoughData}
            activeTab={activeModalTab}
            onTabChange={setActiveModalTab}
          />
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
                  onClick={() => setShowSuccessModal(false)}
                >
                  Okay
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full transform transition-all scale-100 overflow-hidden">
              <div className="p-6 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
                  <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Deletion</h3>
                <p className="text-slate-600 mb-8">Are you sure you want to delete this event? This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-base font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2.5 bg-red-600 text-base font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    onClick={confirmDelete}
                  >
                    Delete Event
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};