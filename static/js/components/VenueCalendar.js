// VenueCalendar Component - Reusable calendar view for venues
window.VenueCalendar = function VenueCalendar({ userRole }) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedVenue, setSelectedVenue] = React.useState('');
  const [venues, setVenues] = React.useState([]);
  const [events, setEvents] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedDateEvents, setSelectedDateEvents] = React.useState(null); // For modal

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
    const dayEvents = getEventsForDay(day);
    if (dayEvents.length > 0) {
      setSelectedDateEvents({ date: `${currentDate.toLocaleString('default', { month: 'long' })} ${day}`, events: dayEvents });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header / Controls */}
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-800">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded shadow-sm transition text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded shadow-sm transition text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={selectedVenue} 
            onChange={(e) => setSelectedVenue(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
          >
            <option value="">All Venues</option>
            {venues.map(v => (
              <option key={v.id} value={v.id}>{v.name} ({v.type})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6">
        {loading ? (
          <div className="flex justify-center items-center h-64 text-slate-400">Loading calendar...</div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
            {/* Weekday Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="bg-slate-50 p-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                {d}
              </div>
            ))}

            {/* Empty Cells */}
            {emptyDays.map(i => (
              <div key={`empty-${i}`} className="bg-white h-32"></div>
            ))}

            {/* Days */}
            {daysArray.map(day => {
              const dayEvents = getEventsForDay(day);
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              
              return (
                <div 
                  key={day} 
                  onClick={() => handleDateClick(day)}
                  className={`bg-white h-32 p-2 transition hover:bg-slate-50 cursor-pointer relative group ${isToday ? 'bg-blue-50/30' : ''}`}
                >
                  <span className={`text-sm font-medium ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-700'}`}>
                    {day}
                  </span>
                  
                  <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
                    {dayEvents.slice(0, 3).map(event => (
                      <div key={event.id} className={`text-[10px] px-1.5 py-0.5 rounded border truncate ${event.colorClass}`}>
                        {new Date(event.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-slate-500 font-medium pl-1">
                        + {dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      {selectedDateEvents && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center">
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
                      {new Date(event.start).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {new Date(event.end).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
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
