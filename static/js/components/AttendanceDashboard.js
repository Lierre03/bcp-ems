
// Attendance Card Component
const AttendanceCard = ({ event, onClick }) => {
    // Determine color based on percentage
    const getProgressColor = (pct) => {
        if (pct >= 80) return 'bg-emerald-500';
        if (pct >= 50) return 'bg-blue-500';
        return 'bg-yellow-500';
    };

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:shadow-md hover:border-blue-300 transition group"
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 truncate group-hover:text-blue-600 transition">{event.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center mt-1">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {event.date} • {event.time}
                    </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-semibold 
                    ${event.status === 'Ongoing' ? 'bg-purple-100 text-purple-700' :
                        event.status === 'Completed' ? 'bg-teal-100 text-teal-700' :
                            event.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {event.status}
                </span>
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500">Attendance</span>
                    <span className="font-semibold text-slate-700">{event.total_present} / {event.total_registered}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${getProgressColor(event.percentage)}`}
                        style={{ width: `${Math.min(event.percentage, 100)}%` }}
                    ></div>
                </div>
                <div className="mt-2 text-right">
                    <span className="text-xs font-bold text-slate-400">{event.percentage}%</span>
                </div>
            </div>
        </div>
    );
};

// AttendanceDashboard Component
window.AttendanceDashboard = function AttendanceDashboard() {
    const [events, setEvents] = React.useState([]);
    const [selectedEventId, setSelectedEventId] = React.useState(null);
    const [attendees, setAttendees] = React.useState([]);
    const [stats, setStats] = React.useState({ total: 0, present: 0, present_formatted: 0, absent: 0 });
    const [eventInfo, setEventInfo] = React.useState(null);
    const [loadingData, setLoadingData] = React.useState(false);
    const [loadingStats, setLoadingStats] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState('All'); // All, Present, Absent
    const [viewMode, setViewMode] = React.useState('dashboard'); // 'dashboard', 'detail'

    // Fetch Dashboard Stats
    React.useEffect(() => {
        const fetchDashboardStats = async () => {
            setLoadingStats(true);
            try {
                const res = await fetch('/api/attendance/dashboard-stats');
                if (res.ok) {
                    const data = await res.json();
                    if (data.events) {
                        setEvents(data.events);
                    }
                }
            } catch (err) {
                console.error('Failed to load dashboard stats', err);
            } finally {
                setLoadingStats(false);
            }
        };
        fetchDashboardStats();

        // Check for global navigation state
        if (window.selectedAttendanceEventId) {
            handleEventSelect(window.selectedAttendanceEventId);
            window.selectedAttendanceEventId = null;
        }
    }, []);

    // Fetch detail data when event selected
    React.useEffect(() => {
        if (!selectedEventId) return;

        const fetchAttendance = async () => {
            setLoadingData(true);
            try {
                const res = await fetch(`/api/attendance/event/${selectedEventId}/detailed-list`);
                const data = await res.json();
                if (data.success) {
                    setAttendees(data.attendees);
                    setStats(data.stats);
                    setEventInfo(data.event);
                } else {
                    console.error('Failed to load attendance data');
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoadingData(false);
            }
        };
        fetchAttendance();
    }, [selectedEventId]);

    const handleEventSelect = (id) => {
        setSelectedEventId(id);
        setViewMode('detail');
    };

    const handleBackToDashboard = () => {
        setViewMode('dashboard');
        setSelectedEventId(null);
        setSearchTerm('');
        setFilterStatus('All');
    };

    // Filtering logic for Detailed View
    const filteredList = React.useMemo(() => {
        return attendees.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.username.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                filterStatus === 'All' ? true :
                    filterStatus === 'Present' ? p.status === 'Present' :
                        p.status === 'Absent';

            return matchesSearch && matchesStatus;
        });
    }, [attendees, searchTerm, filterStatus]);

    if (viewMode === 'dashboard') {
        return (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Attendance Monitoring</h2>
                        <p className="text-slate-500 text-sm">Select an event to view detailed attendance</p>
                    </div>
                </div>

                {loadingStats ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.length > 0 ? (
                            events.map(event => (
                                <AttendanceCard
                                    key={event.id}
                                    event={event}
                                    onClick={() => handleEventSelect(event.id)}
                                />
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 text-slate-500 bg-white rounded-lg border border-slate-200 border-dashed">
                                <p>No active events found.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Detail View
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Bar */}
            <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center justify-between">
                <button
                    onClick={handleBackToDashboard}
                    className="flex items-center text-slate-600 hover:text-blue-600 font-medium transition"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    Back to Dashboard
                </button>
                <div className="text-right">
                    <h2 className="text-lg font-bold text-slate-900">{eventInfo ? eventInfo.name : 'Loading...'}</h2>
                    <p className="text-xs text-slate-500">{eventInfo ? eventInfo.date : ''}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header Controls & Stats */}
                <div className="p-6 border-b border-gray-100 bg-slate-50/50">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">Total Registered</p>
                                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                            </div>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">Present</p>
                                <p className="text-2xl font-bold text-emerald-900">{stats.present}</p>
                            </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 p-4 rounded-lg flex items-center gap-4">
                            <div className="p-3 bg-slate-200 rounded-full text-slate-500">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Absent</p>
                                <p className="text-2xl font-bold text-slate-700">{stats.absent}</p>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Search student name, section, or ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition shadow-sm"
                            />
                            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilterStatus('All')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterStatus === 'All' ? 'bg-slate-800 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >All</button>
                            <button
                                onClick={() => setFilterStatus('Present')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterStatus === 'Present' ? 'bg-emerald-600 text-white shadow' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                            >Present</button>
                            <button
                                onClick={() => setFilterStatus('Absent')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterStatus === 'Absent' ? 'bg-slate-400 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >Absent</button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loadingData ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredList.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Section / Course</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredList.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs mr-3">
                                                    {p.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{p.name}</div>
                                                    <div className="text-xs text-gray-500">@{p.username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700">{p.section}</span>
                                                <span className="text-xs text-slate-500">{p.course}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {p.status === 'Present' ? (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                                                    Present
                                                </span>
                                            ) : (
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 text-slate-800">
                                                    Absent
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {p.check_in_time ? (
                                                <span className="font-medium">{p.check_in_time}</span>
                                            ) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <p>No attendees found matching your search.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
