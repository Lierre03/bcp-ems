// Low-Rated Events Alert - Enhanced Design
window.LowRatedEventsAlert = function LowRatedEventsAlert({ data }) {
    if (!data || data.length === 0) return null;

    return React.createElement('div', { className: 'bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-300 p-6 shadow-lg' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-5' },
            React.createElement('div', { className: 'w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center animate-pulse' },
                React.createElement('svg', { className: 'w-7 h-7 text-white', fill: 'currentColor', viewBox: '0 0 20 20' },
                    React.createElement('path', { fillRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z', clipRule: 'evenodd' })
                )
            ),
            React.createElement('div', null,
                React.createElement('h3', { className: 'text-lg font-bold text-red-900' }, '⚠️ Low-Rated Events'),
                React.createElement('p', { className: 'text-xs text-red-700' }, 'Events requiring immediate attention (< 3.5 stars)')
            )
        ),
        React.createElement('div', { className: 'space-y-3' },
            data.map((event, idx) => {
                const date = new Date(event.start_datetime);
                const rating = event.avg_rating;
                const ratingColor = rating < 2.5 ? 'bg-red-600' : rating < 3 ? 'bg-orange-500' : 'bg-amber-500';

                return React.createElement('div', { key: idx, className: 'bg-white rounded-xl p-4 border-l-4 border-red-500 shadow-md hover:shadow-lg transition-shadow' },
                    React.createElement('div', { className: 'flex justify-between items-start gap-4' },
                        React.createElement('div', { className: 'flex-1' },
                            React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
                                React.createElement('span', { className: 'text-2xl' }, '📌'),
                                React.createElement('p', { className: 'font-bold text-gray-900 text-base' }, event.name)
                            ),
                            React.createElement('div', { className: 'flex items-center gap-3 text-xs text-gray-600' },
                                React.createElement('span', { className: 'inline-flex items-center gap-1' },
                                    React.createElement('svg', { className: 'w-3.5 h-3.5', fill: 'currentColor', viewBox: '0 0 20 20' },
                                        React.createElement('path', { fillRule: 'evenodd', d: 'M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z', clipRule: 'evenodd' })
                                    ),
                                    date.toLocaleDateString()
                                ),
                                React.createElement('span', { className: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' },
                                    event.event_type
                                )
                            )
                        ),
                        React.createElement('div', { className: 'text-right flex flex-col items-end gap-2' },
                            React.createElement('div', { className: `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold text-white ${ratingColor}` },
                                React.createElement('svg', { className: 'w-4 h-4', fill: 'currentColor', viewBox: '0 0 20 20' },
                                    React.createElement('path', { d: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' })
                                ),
                                React.createElement('span', null, rating.toFixed(1))
                            ),
                            React.createElement('span', { className: 'text-xs text-gray-500 font-medium' },
                                event.response_count + ' responses'
                            )
                        )
                    )
                );
            })
        )
    );
};
