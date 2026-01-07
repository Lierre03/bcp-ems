// AttendanceModal Component - detailed list for Dept heads
window.AttendanceModal = function AttendanceModal({ eventId, onClose }) {
    const [attendees, setAttendees] = React.useState([]);
    const [stats, setStats] = React.useState({ total: 0, present: 0, absent: 0 });
    const [eventInfo, setEventInfo] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [filterStatus, setFilterStatus] = React.useState('All'); // All, Present, Absent

    React.useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const res = await fetch(`/api/attendance/event/${eventId}/detailed-list`);
                const data = await res.json();
                if (data.success) {
                    setAttendees(data.attendees);
                    setStats(data.stats);
                    setEventInfo(data.event);
                } else {
                    alert('Failed to load attendance data');
                    onClose();
                }
            } catch (err) {
                console.error(err);
                alert('Error loading data');
            } finally {
                setLoading(false);
            }
        };
        fetchAttendance();
    }, [eventId]);

    // Filtering logic
    const filteredList = React.useMemo(() => {
        return attendees.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.username.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus =
                filterStatus === 'All' ? true :
                    filterStatus === 'Present' ? p.status === 'Present' :
                        p.status === 'Absent'; // Absent

            return matchesSearch && matchesStatus;
        });
    }, [attendees, searchTerm, filterStatus]);

    if (!eventId) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Attendance Monitoring</h2>
                        {eventInfo && (
                            <p className="text-sm text-slate-500 mt-1">
                                {eventInfo.name} • <span className="font-medium text-slate-700">{eventInfo.date}</span>
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Stats & Controls */}
                <div className="p-6 pb-0 space-y-4">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                    {/* Controls */}
                    <div className="flex flex-col md:flex-row gap-4 pt-2">
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
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredList.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Section / Course</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Check-in Time</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredList.map((p, idx) => (
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
