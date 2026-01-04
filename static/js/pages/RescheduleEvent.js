const RescheduleEvent = () => {
  const [event, setEvent] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [formData, setFormData] = React.useState({
    date: '',
    endDate: '',
    startTime: '',
    endTime: '',
    venue: ''
  });
  const [venueOptions, setVenueOptions] = React.useState([]);
  const [saving, setSaving] = React.useState(false);
  const [suggestedDates, setSuggestedDates] = React.useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = React.useState(false);
  const [appliedSuggestion, setAppliedSuggestion] = React.useState(null);

  // Helper function to format date as "Month Day, Year"
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Helper function to format time to 12-hour with AM/PM
  const formatTime = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  React.useEffect(() => {
    // Get event ID from URL hash or sessionStorage
    const hash = window.location.hash; // e.g., #/reschedule/29
    const eventId = hash.split('/')[2] || sessionStorage.getItem('rescheduleEventId');
    if (eventId) {
      fetchEventData(eventId);
      fetchVenues();
      sessionStorage.removeItem('rescheduleEventId');
    } else {
      window.location.hash = '#/admin';
    }
  }, []);

  const fetchSuggestedDates = async (eventData, venueValue) => {
    const eventToUse = eventData || event;
    const venueToUse = venueValue || formData.venue;
    
    if (!eventToUse || !eventToUse.id || !venueToUse || !eventToUse.start_datetime) {
      console.log('Missing required data for suggestions:', { event: eventToUse?.id, venue: venueToUse, start_datetime: eventToUse?.start_datetime });
      return;
    }

    setLoadingSuggestions(true);
    console.log('Fetching AI suggestions for:', { eventId: eventToUse.id, venue: venueToUse, originalDate: eventToUse.start_datetime });
    
    try {
      // Call ML API endpoint for AI-powered suggestions
      const res = await fetch('/api/ml/suggest-reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: eventToUse.id,
          venue: venueToUse,
          originalDate: eventToUse.start_datetime
        })
      });

      const data = await res.json();
      console.log('ML API response:', data);

      if (data.success && data.suggestions) {
        setSuggestedDates(data.suggestions);
        console.log('Set', data.suggestions.length, 'suggestions. Used ML:', data.usedML);
      } else {
        console.error('Failed to get suggestions:', data.error);
        setSuggestedDates([]);
      }
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      setSuggestedDates([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const applySuggestedDate = (suggestedDate, idx) => {
    setFormData({
      ...formData,
      date: suggestedDate.date,
      endDate: suggestedDate.endDate || suggestedDate.date
    });
    setAppliedSuggestion(idx);
    // Clear the indicator after 2 seconds
    setTimeout(() => setAppliedSuggestion(null), 2000);
  };

  const fetchEventData = async (eventId) => {
    try {
      console.log('Fetching event ID:', eventId);
      
      // Try fetching specific event first
      const res = await fetch(`/api/events/${eventId}`);
      console.log('Single event response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        const foundEvent = data.event || data; // Handle both wrapped and unwrapped responses
        console.log('Found event:', foundEvent);
        
        // Parse datetime fields as UTC to avoid timezone conversion
        const startDate = foundEvent.start_datetime ? new Date(foundEvent.start_datetime) : new Date();
        const endDate = foundEvent.end_datetime ? new Date(foundEvent.end_datetime) : startDate;
        
        // Extract time in UTC (not local time)
        const startTimeUTC = `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`;
        const endTimeUTC = `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`;
        
        setEvent(foundEvent);
        const newFormData = {
          date: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          startTime: startTimeUTC,
          endTime: endTimeUTC,
          venue: foundEvent.venue || ''
        };
        console.log('Form data set:', newFormData);
        console.log('Start date:', newFormData.date, 'End date:', newFormData.endDate, 'Same?', newFormData.date === newFormData.endDate);
        setFormData(newFormData);
        
        // Trigger AI suggestions immediately after loading event data
        if (foundEvent.venue) {
          console.log('Auto-triggering suggestions for venue:', foundEvent.venue);
          fetchSuggestedDates(foundEvent, foundEvent.venue);
        }
      } else {
        // Fallback: fetch all events and find the one
        console.log('Trying fallback - fetching all events');
        const allRes = await fetch('/api/events');
        const data = await allRes.json();
        console.log('All events data:', data);
        const events = Array.isArray(data) ? data : (data.events || []);
        console.log('Events array:', events);
        const foundEvent = events.find(e => e.id == eventId);
        console.log('Found event in array:', foundEvent);
        
        if (foundEvent) {
          setEvent(foundEvent);
          const newFormData = {
            date: foundEvent.date || '',
            endDate: foundEvent.endDate || foundEvent.date || '',
            startTime: foundEvent.startTime || '09:00',
            endTime: foundEvent.endTime || '17:00',
            venue: foundEvent.venue || ''
          };
          setFormData(newFormData);
          
          // Trigger AI suggestions immediately after loading event data
          if (foundEvent.venue) {
            console.log('Auto-triggering suggestions for venue:', foundEvent.venue);
            fetchSuggestedDates(foundEvent, foundEvent.venue);
          }
        } else {
          console.error('Event not found with ID:', eventId);
          alert('Event not found');
          window.location.hash = '#/admin';
        }
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      alert('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const fetchVenues = async () => {
    try {
      const res = await fetch('/api/venues');
      const data = await res.json();
      const venues = Array.isArray(data) ? data : (data.venues || []);
      setVenueOptions(venues.map(v => v.name || v));
    } catch (error) {
      console.error('Error fetching venues:', error);
      setVenueOptions(['Computer Laboratory & Auditorium', 'Gymnasium', 'Covered Court']);
    }
  };

  const handleSave = async () => {
    if (!formData.date || !formData.startTime || !formData.endTime || !formData.venue) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      // Construct datetime strings
      const startDatetime = `${formData.date}T${formData.startTime}:00`;
      const endDatetime = `${formData.endDate || formData.date}T${formData.endTime}:00`;
      
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          venue: formData.venue,
          status: 'Under Review', // Reset status for re-approval
          venue_approval_status: 'Pending',
          equipment_approval_status: 'Pending'
        })
      });

      if (res.ok) {
        alert('Event rescheduled successfully! It has been resubmitted for approval.');
        window.location.hash = '#/admin';
      } else {
        const error = await res.json();
        alert(`Failed to reschedule: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return React.createElement('div', { className: 'flex items-center justify-center h-screen bg-slate-50' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('svg', { className: 'animate-spin h-12 w-12 text-blue-600 mx-auto mb-4', fill: 'none', viewBox: '0 0 24 24' },
          React.createElement('circle', { className: 'opacity-25', cx: '12', cy: '12', r: '10', stroke: 'currentColor', strokeWidth: '4' }),
          React.createElement('path', { className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' })
        ),
        React.createElement('p', { className: 'text-gray-600 font-medium' }, 'Loading event details...')
      )
    );
  }

  if (!event) {
    return null;
  }

  return React.createElement('div', { className: 'min-h-screen bg-slate-50 py-6 px-4' },
    React.createElement('div', { className: 'max-w-6xl mx-auto' },
      // Header
      React.createElement('div', { className: 'mb-6' },
        React.createElement('button', {
          onClick: () => window.location.hash = '#/admin',
          className: 'flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition font-medium'
        },
          React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M15 19l-7-7 7-7' })
          ),
          'Back to Events'
        ),
        React.createElement('h1', { className: 'text-2xl font-bold text-gray-900' }, 'Reschedule Event'),
        React.createElement('p', { className: 'text-sm text-gray-600 mt-1' }, 'Update your event schedule to resolve the conflict')
      ),

      // Main Card with Grid Layout
      React.createElement('div', { className: 'bg-white rounded-lg shadow-sm border border-gray-200' },
        // Top sections (full width)
        React.createElement('div', null,
        // Conflict Alert Banner
        React.createElement('div', { className: 'bg-red-500 px-6 py-4' },
          React.createElement('div', { className: 'flex items-center gap-3 text-white' },
            React.createElement('svg', { className: 'w-6 h-6 flex-shrink-0', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z', clipRule: 'evenodd' })
            ),
            React.createElement('div', null,
              React.createElement('h2', { className: 'font-bold text-base' }, 'Event Automatically Rejected'),
              React.createElement('p', { className: 'text-sm text-red-50 mt-0.5' }, 
                'Another event reserved this venue first (First-Come-First-Served policy)'
              )
            )
          )
        ),

        // Event Info
        React.createElement('div', { className: 'px-6 py-5 border-b border-gray-200 bg-gray-50' },
          React.createElement('h3', { className: 'text-sm font-semibold text-gray-900 mb-3' }, event.name),
          React.createElement('div', { className: 'grid grid-cols-2 gap-4 text-xs' },
            React.createElement('div', null,
              React.createElement('span', { className: 'text-gray-500' }, 'Venue: '),
              React.createElement('span', { className: 'font-medium text-gray-900' }, event.venue)
            ),
            React.createElement('div', null,
              React.createElement('span', { className: 'text-gray-500' }, 'Date: '),
              React.createElement('span', { className: 'font-medium text-gray-900' }, 
                formatDate(formData.date), formData.endDate && formData.endDate !== formData.date ? ` - ${formatDate(formData.endDate)}` : ''
              )
            ),
            React.createElement('div', null,
              React.createElement('span', { className: 'text-gray-500' }, 'Time: '),
              React.createElement('span', { className: 'font-medium text-gray-900' }, `${formatTime(formData.startTime)} - ${formatTime(formData.endTime)}`)
            ),
            React.createElement('div', null,
              React.createElement('span', { className: 'text-gray-500' }, 'Attendees: '),
              React.createElement('span', { className: 'font-medium text-gray-900' }, event.expected_attendees || event.attendees)
            )
          )
        )
      ), // Close wrapper div for top sections

        // Grid Layout: Form + AI Suggestions Side-by-Side
        React.createElement('div', { className: 'grid grid-cols-1 lg:grid-cols-3' },
          // Form Section (2/3 width)
          React.createElement('div', { className: 'lg:col-span-2 p-6 space-y-5 border-r border-gray-200' },
          React.createElement('h3', { className: 'text-base font-semibold text-gray-900 mb-4' }, 'New Schedule'),

          // Venue
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' },
              'Venue ', React.createElement('span', { className: 'text-red-500' }, '*')
            ),
            React.createElement('select', {
              value: formData.venue,
              onChange: (e) => setFormData({ ...formData, venue: e.target.value }),
              className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
            },
              venueOptions.map(v => React.createElement('option', { key: v, value: v }, v))
            )
          ),

          // Dates Row
          React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' },
                'Start Date ', React.createElement('span', { className: 'text-red-500' }, '*')
              ),
              React.createElement('input', {
                type: 'date',
                value: formData.date,
                min: new Date().toISOString().split('T')[0],
                onChange: (e) => setFormData({ ...formData, date: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'End Date'),
              React.createElement('input', {
                type: 'date',
                value: formData.endDate,
                min: formData.date || new Date().toISOString().split('T')[0],
                onChange: (e) => setFormData({ ...formData, endDate: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              })
            )
          ),

          // Times Row
          React.createElement('div', { className: 'grid grid-cols-2 gap-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' },
                'Start Time ', React.createElement('span', { className: 'text-red-500' }, '*')
              ),
              React.createElement('input', {
                type: 'time',
                value: formData.startTime,
                onChange: (e) => setFormData({ ...formData, startTime: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              })
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' },
                'End Time ', React.createElement('span', { className: 'text-red-500' }, '*')
              ),
              React.createElement('input', {
                type: 'time',
                value: formData.endTime,
                onChange: (e) => setFormData({ ...formData, endTime: e.target.value }),
                className: 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
              })
            )
          )
        ),

        // AI Suggestions Sidebar (1/3 width)
        React.createElement('div', { className: 'lg:col-span-1 p-4 bg-gradient-to-br from-blue-50 to-indigo-50' },
            React.createElement('div', { className: 'flex items-center gap-2 mb-3' },
              React.createElement('svg', { className: 'w-5 h-5 text-blue-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { d: 'M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z' })
              ),
              React.createElement('h4', { className: 'text-sm font-semibold text-blue-900' }, 'AI Suggested Conflict-Free Dates'),
              loadingSuggestions && React.createElement('svg', { className: 'animate-spin h-4 w-4 text-blue-600', fill: 'none', viewBox: '0 0 24 24' },
                React.createElement('circle', { className: 'opacity-25', cx: '12', cy: '12', r: '10', stroke: 'currentColor', strokeWidth: '4' }),
                React.createElement('path', { className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' })
              )
            ),
            suggestedDates.length > 0 ? (
              React.createElement(React.Fragment, null,
                React.createElement('p', { className: 'text-xs text-blue-700 mb-3' }, 'AI-powered suggestions (click to apply)'),
                React.createElement('div', { className: 'space-y-2' },
                  suggestedDates.map((suggestion, idx) => 
                    React.createElement('button', {
                      key: idx,
                      onClick: () => applySuggestedDate(suggestion, idx),
                      className: `w-full px-3 py-2.5 border rounded-lg text-left transition flex flex-col group ${
                        appliedSuggestion === idx 
                          ? 'bg-green-50 border-green-400' 
                          : 'bg-white border-blue-200 hover:bg-blue-50 hover:border-blue-400'
                      }`
                    },
                      React.createElement('div', { className: 'flex items-center justify-between' },
                        React.createElement('span', { className: 'text-sm font-medium text-gray-900' }, suggestion.displayDate),
                        appliedSuggestion === idx ? (
                          React.createElement('svg', { className: 'w-4 h-4 text-green-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                            React.createElement('path', { fillRule: 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z', clipRule: 'evenodd' })
                          )
                        ) : (
                          React.createElement('svg', { className: 'w-4 h-4 text-blue-400 opacity-0 group-hover:opacity-100 transition', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 5l7 7-7 7' })
                          )
                        )
                      ),
                      suggestion.daysFromOriginal !== undefined && React.createElement('div', { className: 'mt-1' },
                        React.createElement('span', { className: 'text-xs text-gray-500' }, 
                          suggestion.daysFromOriginal === 0 ? 'Same day' : 
                          suggestion.daysFromOriginal > 0 ? `${suggestion.daysFromOriginal} days after` : 
                          `${Math.abs(suggestion.daysFromOriginal)} days before`
                        )
                      )
                    )
                  )
                )
              )
            ) : (
              React.createElement('p', { className: 'text-xs text-blue-600' }, 
                loadingSuggestions ? 'Analyzing available dates...' : 'Select a venue above to see suggested dates'
              )
            )
          )
        ),

        // Action Buttons (full width at bottom)
        React.createElement('div', { className: 'flex gap-3 p-4 border-t border-gray-200' },
            React.createElement('button', {
              onClick: () => window.location.hash = '#/admin',
              className: 'flex-1 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition text-sm'
            }, 'Cancel'),
            React.createElement('button', {
              onClick: handleSave,
              disabled: saving,
              className: 'flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm'
            },
              saving ? React.createElement('svg', { className: 'animate-spin h-4 w-4', fill: 'none', viewBox: '0 0 24 24' },
                React.createElement('circle', { className: 'opacity-25', cx: '12', cy: '12', r: '10', stroke: 'currentColor', strokeWidth: '4' }),
                React.createElement('path', { className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' })
              ) : null,
              saving ? 'Saving...' : 'Save & Resubmit for Approval'
            )
          )
        ), // Fixed: Removed extra ')' and ',' here to properly close Main Card div

      // Tips Footer (outside main card, below it)
      React.createElement('div', { className: 'mt-4 px-4 py-3 bg-blue-50 rounded-lg border border-blue-100' },
          React.createElement('div', { className: 'flex items-start gap-3' },
            React.createElement('svg', { className: 'w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', { fillRule: 'evenodd', d: 'M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z', clipRule: 'evenodd' })
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'text-xs font-semibold text-blue-900 mb-1' }, 'Tips for Finding Available Slots'),
              React.createElement('ul', { className: 'text-xs text-blue-800 space-y-0.5' },
                React.createElement('li', null, '• Consider alternative venues with similar capacity'),
                React.createElement('li', null, '• Weekday mornings (8 AM - 12 PM) have more availability'),
                React.createElement('li', null, '• Contact admin if you need urgent assistance')
              )
            )
          )
        )
      )
    );
};

// Export to global scope
window.RescheduleEvent = RescheduleEvent;