// Attendance by Event Type - Standalone Component
window.AttendanceByTypeChart = function AttendanceByTypeChart({ data }) {
    if (!data || data.length === 0) return null;

    return React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Attendance by Event Type'),
        React.createElement('div', { className: 'space-y-3' },
            data.map((type, idx) => {
                const rate = type.attendance_rate || 0;
                const colorClass = rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-blue-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500';
                return React.createElement('div', { key: idx },
                    React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                        React.createElement('span', { className: 'text-sm font-medium text-gray-900' }, type.event_type),
                        React.createElement('span', { className: 'text-sm font-semibold text-gray-700' }, rate + '%')
                    ),
                    React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-2.5' },
                        React.createElement('div', { className: colorClass + ' h-2.5 rounded-full', style: { width: rate + '%' } })
                    ),
                    React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                        (type.total_attended || 0) + '/' + (type.total_expected || 0) + ' attendees • ' + type.event_count + ' events'
                    )
                );
            })
        )
    );
};
