// Test file for new analytics sections - will be appended to main file after validation

// Department Budget Comparison
analytics.department_budget && analytics.department_budget.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
    React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Department Budget Comparison'),
    React.createElement('div', { className: 'overflow-x-auto' },
        React.createElement('table', { className: 'min-w-full' },
            React.createElement('thead', null,
                React.createElement('tr', { className: 'border-b border-gray-200' },
                    React.createElement('th', { className: 'text-left py-3 px-4 text-sm font-semibold text-gray-700' }, 'Department'),
                    React.createElement('th', { className: 'text-right py-3 px-4 text-sm font-semibold text-gray-700' }, 'Events'),
                    React.createElement('th', { className: 'text-right py-3 px-4 text-sm font-semibold text-gray-700' }, 'Total Budget'),
                    React.createElement('th', { className: 'text-right py-3 px-4 text-sm font-semibold text-gray-700' }, 'Avg/Event')
                )
            ),
            React.createElement('tbody', null,
                analytics.department_budget.map((dept, idx) =>
                    React.createElement('tr', { key: idx, className: 'border-b border-gray-100 hover:bg-gray-50' },
                        React.createElement('td', { className: 'py-3 px-4 text-sm font-medium text-gray-900' }, dept.department),
                        React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700 text-right' }, dept.event_count),
                        React.createElement('td', { className: 'py-3 px-4 text-sm text-emerald-600 text-right font-medium' },
                            `₱${(dept.total_budget || 0).toLocaleString()}`
                        ),
                        React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700 text-right' },
                            `₱${Math.round(dept.avg_budget || 0).toLocaleString()}`
                        )
                    )
                )
            )
        )
    )
),

    // Low-Rated Events Alert
    analytics.low_rated_events && analytics.low_rated_events.length > 0 && React.createElement('div', { className: 'bg-red-50 rounded-lg border border-red-200 p-6' },
        React.createElement('div', { className: 'flex items-center gap-2 mb-4' },
            React.createElement('svg', { className: 'w-5 h-5 text-red-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z', clipRule: 'evenodd' })
            ),
            React.createElement('h3', { className: 'text-lg font-semibold text-red-900' }, '⚠️ Low-Rated Events (Need Attention)')
        ),
        React.createElement('div', { className: 'space-y-2' },
            analytics.low_rated_events.map((event, idx) => {
                const date = new Date(event.start_datetime);
                return React.createElement('div', { key: idx, className: 'bg-white rounded-lg p-3 border border-red-200' },
                    React.createElement('div', { className: 'flex justify-between items-start' },
                        React.createElement('div', null,
                            React.createElement('p', { className: 'font-medium text-gray-900 text-sm' }, event.name),
                            React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                                `${event.event_type} • ${date.toLocaleDateString()}`
                            )
                        ),
                        React.createElement('div', { className: 'text-right' },
                            React.createElement('span', { className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800' },
                                `${event.avg_rating.toFixed(1)} ⭐`
                            ),
                            React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, `${event.response_count} responses`)
                        )
                    )
                );
            })
        )
    ),

    // Attendance by Event Type
    analytics.attendance_by_type && analytics.attendance_by_type.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Attendance by Event Type'),
        React.createElement('div', { className: 'space-y-3' },
            analytics.attendance_by_type.map((type, idx) => {
                const rate = type.attendance_rate || 0;
                const colorClass = rate >= 80 ? 'bg-emerald-500' : rate >= 60 ? 'bg-blue-500' : rate >= 40 ? 'bg-amber-500' : 'bg-red-500';
                return React.createElement('div', { key: idx },
                    React.createElement('div', { className: 'flex justify-between items-center mb-1' },
                        React.createElement('span', { className: 'text-sm font-medium text-gray-900' }, type.event_type),
                        React.createElement('span', { className: 'text-sm font-semibold text-gray-700' }, `${rate}%`)
                    ),
                    React.createElement('div', { className: 'w-full bg-gray-200 rounded-full h-2.5' },
                        React.createElement('div', { className: `${colorClass} h-2.5 rounded-full`, style: { width: `${rate}%` } })
                    ),
                    React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                        `${type.total_attended || 0}/${type.total_expected || 0} attendees • ${type.event_count} events`
                    )
                );
            })
        )
    )
