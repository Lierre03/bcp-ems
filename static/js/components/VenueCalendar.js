// VenueCalendar Component - Reusable calendar view for venues
window.VenueCalendar = function VenueCalendar({ userRole }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedVenue, setSelectedVenue] = React.useState('');
  const [venues, setVenues] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDateEvents, setSelectedDateEvents] = React.useState(null); // For mobile modal
  const [selectedDate, setSelectedDate] = React.useState(new Date()); // For side panel

  // Fetch venues on mount
  React.useEffect(() => {
    fetch('/api/venues/')
      .then(res => res.json())
      .then(data => {
        if (data.success) setVenues(data.venues);
      })
      .catch(err => console.error('Failed to load venues', err));
  }, []);

  // Fetch events when date or venue changes
  React.useEffect(() => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');

    let url = `/api/venues/calendar?month=${year}-${month}`;
    if (selectedVenue) url += `&venue_id=${selectedVenue}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) setEvents(data.events);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load calendar', err);
        setLoading(false);
      });
  }, [currentDate, selectedVenue]);

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

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-4 h-full">
      {/* Calendar Section */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden flex flex-col">
        {/* Header / Controls */}
        <div className="p-2 md:p-3 bg-blue-950 border-b border-blue-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
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

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="px-3 py-2 bg-blue-900 border border-blue-800 text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none w-full sm:w-64"
            >
              <option value="">All Venues</option>
              {venues.map(v => (
                <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar - Grid on Desktop, List on Mobile */}
        <div className="flex-1 p-2 md:p-3 min-h-0 flex flex-col overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-full text-slate-400">Loading calendar...</div>
          ) : (
            <>
              {/* Mobile: List View */}
              <div className="md:hidden space-y-1 h-full overflow-y-auto">
                {events.slice(0, 20).map(event => (
                  <div key={event.id} className={`p-2 rounded-lg border text-xs ${event.colorClass}`}>
                    <div className="font-semibold truncate">{event.title}</div>
                    <div className="text-slate-600 text-xs mt-0.5">
                      {new Date(event.start).toLocaleDateString()} {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                {events.length === 0 && (
                  <div className="text-center text-slate-400 py-4 text-xs">No events scheduled</div>
                )}
              </div>

              {/* Desktop: Calendar Grid */}
              <div
                className="hidden md:grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden flex-1"
                style={{ gridTemplateRows: `auto repeat(${Math.ceil((firstDay + days) / 7)}, 1fr)` }}
              >
                {/* Weekday Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-center">
                    {d}
                  </div>
                ))}

                {/* Empty Cells */}
                {emptyDays.map(i => (
                  <div key={`empty-${i}`} className="bg-white min-h-0"></div>
                ))}

                {/* Days */}
                {daysArray.map(day => {
                  const dayEvents = getEventsForDay(day);
                  const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                  return (
                    <div
                      key={day}
                      onClick={() => handleDateClick(day)}
                      className={`bg-white min-h-0 p-1 transition hover:bg-slate-50 cursor-pointer relative group flex flex-col overflow-hidden ${isToday ? 'bg-blue-50/30' : ''}`}
                    >
                      <span className={`text-xs font-medium shrink-0 ${isToday ? 'bg-blue-600 text-white w-5 h-5 flex items-center justify-center rounded-full' : 'text-slate-700'}`}>
                        {day}
                      </span>

                      <div className="mt-1 space-y-0.5 overflow-y-auto custom-scrollbar flex-1">
                        {dayEvents.map(event => (
                          <div key={event.id} className={`text-[10px] px-1.5 py-1 rounded border truncate ${event.colorClass} mb-0.5`}>
                            <span className="font-semibold">{new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> {event.title}
                          </div>
                        ))}
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
      <div className="hidden md:flex md:w-64 flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
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
              <div 
                key={event.id} 
                onClick={() => window.openEventForReview && window.openEventForReview(event.id)}
                className="p-3 rounded-lg border border-slate-200 hover:border-blue-300 transition bg-slate-50 cursor-pointer hover:shadow-md"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-slate-800 text-xs truncate flex-1">{event.title}</div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${event.colorClass} ml-2 whitespace-nowrap`}>
                    {event.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-xs text-slate-600">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {event.venue}
                  </div>
                </div>
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
                      {event.status}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      {event.venue}
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {event.organizer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
