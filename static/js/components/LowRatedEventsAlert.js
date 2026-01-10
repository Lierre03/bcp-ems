// Low-Rated Events Alert - Standalone Component
window.LowRatedEventsAlert = function LowRatedEventsAlert({ data }) {
    if (!data || data.length === 0) return null;

    return React.createElement('div', { className: 'bg-red-50 rounded-lg border border-red-200 p-6' },
        React.createElement('div', { className: 'flex items-center gap-2 mb-4' },
            React.createElement('svg', { className: 'w-5 h-5 text-red-600', fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z', clipRule: 'evenodd' })
            ),
            React.createElement('h3', { className: 'text-lg font-semibold text-red-900' }, 'Low-Rated Events (Need Attention)')
        ),
        React.createElement('div', { className: 'space-y-2' },
            data.map((event, idx) => {
                const date = new Date(event.start_datetime);
                return React.createElement('div', { key: idx, className: 'bg-white rounded-lg p-3 border border-red-200' },
                    React.createElement('div', { className: 'flex justify-between items-start' },
                        React.createElement('div', null,
                            React.createElement('p', { className: 'font-medium text-gray-900 text-sm' }, event.name),
                            React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                                event.event_type + ' • ' + date.toLocaleDateString()
                            )
                        ),
                        React.createElement('div', { className: 'text-right' },
                            React.createElement('span', { className: 'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800' },
                                event.avg_rating.toFixed(1) + ' ⭐'
                            ),
                            React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, event.response_count + ' responses')
                        )
                    )
                );
            })
        )
    );
};
