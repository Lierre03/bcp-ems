// Attendance by Event Type - Enhanced Design
window.AttendanceByTypeChart = function AttendanceByTypeChart({ data }) {
    if (!data || data.length === 0) return null;

    return React.createElement('div', { className: 'bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-6 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-5' },
            React.createElement('div', { className: 'w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center' },
                React.createElement('svg', { className: 'w-6 h-6 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' })
                )
            ),
            React.createElement('div', null,
                React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Attendance by Event Type'),
                React.createElement('p', { className: 'text-xs text-gray-600' }, 'Turnout rates across different event categories')
            )
        ),
        React.createElement('div', { className: 'space-y-4' },
            data.map((type, idx) => {
                const rate = type.attendance_rate || 0;
                const colorClass = rate >= 80 ? 'from-emerald-500 to-green-600' : rate >= 60 ? 'from-blue-500 to-indigo-600' : rate >= 40 ? 'from-amber-500 to-orange-600' : 'from-red-500 to-pink-600';
                const bgColorClass = rate >= 80 ? 'bg-emerald-50' : rate >= 60 ? 'bg-blue-50' : rate >= 40 ? 'bg-amber-50' : 'bg-red-50';
                const textColorClass = rate >= 80 ? 'text-emerald-700' : rate >= 60 ? 'text-blue-700' : rate >= 40 ? 'text-amber-700' : 'text-red-700';
                const icon = rate >= 80 ? '🎯' : rate >= 60 ? '👍' : rate >= 40 ? '⚡' : '⚠️';

                return React.createElement('div', { key: idx, className: `${bgColorClass} rounded-lg p-4 transition-all hover:shadow-md` },
                    React.createElement('div', { className: 'flex items-center justify-between mb-2' },
                        React.createElement('div', { className: 'flex items-center gap-2' },
                            React.createElement('span', { className: 'text-xl' }, icon),
                            React.createElement('span', { className: 'text-sm font-bold text-gray-900' }, type.event_type)
                        ),
                        React.createElement('span', { className: `text-lg font-bold ${textColorClass}` }, rate + '%')
                    ),
                    React.createElement('div', { className: 'relative w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner' },
                        React.createElement('div', {
                            className: `bg-gradient-to-r ${colorClass} h-3 rounded-full transition-all duration-500 shadow-sm`,
                            style: { width: rate + '%' }
                        })
                    ),
                    React.createElement('div', { className: 'flex items-center justify-between mt-2 text-xs text-gray-600' },
                        React.createElement('span', { className: 'font-medium' },
                            (type.total_attended || 0).toLocaleString() + ' / ' + (type.total_expected || 0).toLocaleString() + ' attendees'
                        ),
                        React.createElement('span', { className: 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-gray-700 font-medium' },
                            React.createElement('svg', { className: 'w-3 h-3', fill: 'currentColor', viewBox: '0 0 20 20' },
                                React.createElement('path', { fillRule: 'evenodd', d: 'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z', clipRule: 'evenodd' })
                            ),
                            type.event_count + ' events'
                        )
                    )
                );
            })
        )
    );
};
