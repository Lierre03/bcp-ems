// StudentEventCalendar Component - Calendar view for approved events (student access)
window.StudentEventCalendar = function StudentEventCalendar() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDateEvents, setSelectedDateEvents] = React.useState(null); // For mobile modal
  const [selectedDate, setSelectedDate] = React.useState(new Date()); // For side panel

  // Fetch approved events function
  const fetchEvents = async (year, month) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events/approved?month=${year}-${month}`);
      const data = await response.json();

      if (data.success) {
        // Transform events to calendar format
        const calendarEvents = data.events.map(event => ({
          id: event.id,
          title: event.name,
          start: event.start_datetime,
          end: event.end_datetime,
          venue: event.venue,
          description: event.description,
          event_type: event.event_type,
          status: event.status, // Now available from API
          colorClass: event.status === 'Completed'
            ? 'bg-slate-200 text-slate-500 border-slate-300 opacity-75'
            : event.status === 'Ongoing'
              ? 'bg-green-100 text-green-800 border-green-500 ring-1 ring-green-400'
              : getEventTypeColor(event.event_type),
          expected_attendees: event.expected_attendees,
          max_attendees: event.max_attendees
        }));
        setEvents(calendarEvents);
      }
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch approved events on mount and date change
  React.useEffect(() => {
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    fetchEvents(year, month);
  }, [currentDate]);

  // Get color class based on event type
  const getEventTypeColor = (eventType) => {
    const colors = {
      'Academic': 'bg-blue-100 text-blue-800 border-blue-200',
      'Sports': 'bg-red-100 text-red-800 border-red-200',
      'Cultural': 'bg-orange-100 text-orange-800 border-orange-200',
      'Workshop': 'bg-purple-100 text-purple-800 border-purple-200',
      'Other': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[eventType] || colors['Other'];
  };

  // Calendar Logic
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const { days, firstDay } = getDaysInMonth(currentDate);
  const daysArray = [...Array(days).keys()].map(i => i + 1);
  const emptyDays = [...Array(firstDay).keys()];

  const changeMonth = (offset) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const getEventsForDay = (day) => {
    return events.filter(e => {
      const eventDate = new Date(e.start);
      return eventDate.getDate() === day;
    });
  };

  const handleDateClick = (day) => {
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dayEvents = getEventsForDay(day);

    // Update side panel date
    setSelectedDate(clickedDate);

    // Only show modal on mobile if there are events
    if (dayEvents.length > 0 && window.innerWidth < 768) {
      setSelectedDateEvents({ date: `${currentDate.toLocaleString('default', { month: 'long' })} ${day}`, events: dayEvents });
    }
  };

  const handleEventRegistration = async (eventId) => {
    try {
      const response = await fetch(`/api/registration/register/${eventId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Refresh the calendar to show updated registration status
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        fetchEvents(year, month);

        // Show success message
        alert(data.message || 'Successfully registered for event!');

        // Close modal if open
        setSelectedDateEvents(null);
      } else {
        alert(data.error || 'Failed to register for event');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('Failed to register for event. Please try again.');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-4 h-full">
      {/* Calendar Section */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden">
        {/* Header / Controls */}
        <div className="p-3 bg-blue-950 border-b border-blue-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div className="flex items-center gap-2 md:gap-4">
            <h2 className="text-sm md:text-base font-bold text-white">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex bg-blue-900 rounded-lg p-1">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-blue-800 rounded shadow-sm transition text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-blue-800 rounded shadow-sm transition text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-white text-xs">
              <span className="bg-blue-800 px-2 py-1 rounded-full">
                {events.filter(e => e.status !== 'Completed').length} Upcoming
              </span>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-3 text-[10px] text-blue-200">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Ongoing
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> Done
              </div>
            </div>
          </div>
        </div>

        {/* Calendar - Grid on Desktop, List on Mobile */}
        <div className="p-2 md:p-3">
          {loading ? (
            <div className="flex justify-center items-center h-32 md:h-64 text-blue-600">
              <div className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading events...
              </div>
            </div>
          ) : (
            <>
              {/* Mobile: List View */}
              <div className="md:hidden space-y-1 max-h-96 overflow-y-auto">
                {events.slice(0, 20).map(event => (
                  <div key={event.id} className={`p-2 rounded-lg border text-xs ${event.colorClass}`}>
                    <div className="font-semibold truncate">{event.title}</div>
                    <div className="text-slate-600 text-xs mt-0.5">
                      {new Date(event.start).toLocaleDateString()} {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-slate-600 text-xs">
                      📍 {event.venue}
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-center text-slate-400 py-4 text-xs">No approved events this month</div>
                )}
              </div>

              {/* Desktop: Calendar Grid */}
              <div className="hidden md:grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
                {/* Weekday Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="bg-slate-50 p-1 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {d}
                  </div>
                ))}

                {/* Empty Cells */}
                {emptyDays.map(i => (
                  <div key={`empty-${i}`} className="bg-white h-20"></div>
                ))}

                {/* Days */}
                {daysArray.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                  return (
                    <div
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`bg-white h-20 p-1 transition hover:bg-slate-50 cursor-pointer relative group ${isToday ? 'bg-blue-50/30' : ''}`}
                    >
                      <span className={`text-xs font-medium ${isToday ? 'bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full' : 'text-slate-700'}`}>
                        {day}
                      </span>

                      <div className="mt-0.5 space-y-0.5 overflow-y-auto max-h-[60px]">
                        {dayEvents.slice(0, 2).map(event => (
                          <div key={event.id} className={`text-[9px] px-1 py-0.5 rounded border truncate ${event.colorClass}`}>
                            {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-slate-500 font-medium pl-1">
                            +{dayEvents.length - 2}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Side Panel - Selected Date Events (Desktop Only) */}
      <div className="hidden md:flex md:w-80 flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-blue-950 px-4 py-3 border-b border-blue-900">
          <h3 className="font-bold text-white text-sm">
            {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              ? "Today's Events"
              : selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {(() => {
            const dateEvents = events.filter(e => {
              const eventDate = new Date(e.start);
              return eventDate.getDate() === selectedDate.getDate() &&
                eventDate.getMonth() === selectedDate.getMonth() &&
                eventDate.getFullYear() === selectedDate.getFullYear();
            });
            return dateEvents.length > 0 ? dateEvents.map(event => (
              <div key={event.id} className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition bg-slate-50">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-semibold text-slate-800 text-sm truncate flex-1">{event.title}</div>
                  <span className={`text-[10px] px-2 py-1 rounded-full font-semibold border ${event.colorClass} ml-2 whitespace-nowrap`}>
                    {event.event_type}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600 mb-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.venue}
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {event.expected_attendees ? `${event.expected_attendees} expected` : 'TBD attendees'}
                  </div>
                </div>

                {event.description && (
                  <p className="text-xs text-slate-600 mb-3 line-clamp-2">
                    {event.description}
                  </p>
                )}

                {event.status === 'Completed' ? (
                  <button
                    disabled
                    className="w-full bg-slate-100 text-slate-400 px-3 py-2 rounded-lg text-xs cursor-not-allowed font-medium border border-slate-200"
                  >
                    Event Ended
                  </button>
                ) : event.status === 'Ongoing' ? (
                  <button
                    disabled
                    className="w-full bg-green-50 text-green-600 px-3 py-2 rounded-lg text-xs cursor-not-allowed font-medium border border-green-200"
                  >
                    Event Ongoing
                  </button>
                ) : new Date(event.start) < new Date() ? (
                  <button
                    disabled
                    className="w-full bg-slate-100 text-slate-400 px-3 py-2 rounded-lg text-xs cursor-not-allowed font-medium border border-slate-200"
                  >
                    Event Ended
                  </button>
                ) : (
                  <button
                    onClick={() => handleEventRegistration(event.id)}
                    className="w-full bg-blue-600 text-white px-3 py-2 rounded-lg text-xs hover:bg-blue-700 transition"
                  >
                    Register for Event
                  </button>
                )}
              </div>
            )) : (
              <div className="text-center text-slate-400 text-xs py-4">No events on this day</div>
            );
          })()}
        </div>
      </div>

      {/* Modal for Mobile - Keep existing modal */}
      {selectedDateEvents && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-blue-950 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">{selectedDateEvents.date}</h3>
              <button onClick={() => setSelectedDateEvents(null)} className="text-slate-400 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {selectedDateEvents.events.map(event => (
                <div key={event.id} className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 transition bg-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-800">{event.title}</h4>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold border ${event.colorClass}`}>
                      {event.event_type}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.venue}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {event.expected_attendees ? `${event.expected_attendees} expected` : 'TBD attendees'}
                    </div>
                  </div>
                  {event.status === 'Completed' ? (
                    <button
                      disabled
                      className="mt-3 w-full bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-sm cursor-not-allowed font-medium border border-slate-200"
                    >
                      Event Ended
                    </button>
                  ) : event.status === 'Ongoing' ? (
                    <button
                      disabled
                      className="mt-3 w-full bg-green-50 text-green-600 px-4 py-2 rounded-lg text-sm cursor-not-allowed font-medium border border-green-200"
                    >
                      Event Ongoing
                    </button>
                  ) : new Date(event.start) < new Date() ? (
                    <button
                      disabled
                      className="mt-3 w-full bg-slate-100 text-slate-400 px-4 py-2 rounded-lg text-sm cursor-not-allowed font-medium border border-slate-200"
                    >
                      Event Ended
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEventRegistration(event.id)}
                      className="mt-3 w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition"
                    >
                      Register for Event
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
