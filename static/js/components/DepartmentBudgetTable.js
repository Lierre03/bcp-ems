// Department Budget Comparison - Enhanced Design
window.DepartmentBudgetTable = function DepartmentBudgetTable({ data }) {
    if (!data || data.length === 0) return null;

    return React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-5' },
            React.createElement('div', { className: 'w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center' },
                React.createElement('svg', { className: 'w-6 h-6 text-slate-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
                )
            ),
            React.createElement('div', null,
                React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Department Budget Comparison'),
                React.createElement('p', { className: 'text-xs text-gray-500' }, 'Total spending across departments')
            )
        ),
        React.createElement('div', { className: 'bg-white rounded-lg shadow-sm overflow-hidden' },
            React.createElement('table', { className: 'min-w-full' },
                React.createElement('thead', { className: 'bg-gradient-to-r from-blue-600 to-indigo-600' },
                    React.createElement('tr', null,
                        React.createElement('th', { className: 'text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider' }, 'Department'),
                        React.createElement('th', { className: 'text-right py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider' }, 'Events'),
                        React.createElement('th', { className: 'text-right py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider' }, 'Total Budget'),
                        React.createElement('th', { className: 'text-right py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider' }, 'Avg/Event')
                    )
                ),
                React.createElement('tbody', { className: 'divide-y divide-gray-100' },
                    data.map((dept, idx) => {
                        const isTop = idx === 0;
                        return React.createElement('tr', { key: idx, className: 'hover:bg-blue-50 transition-colors' },
                            React.createElement('td', { className: 'py-3 px-4' },
                                React.createElement('div', { className: 'flex items-center gap-2' },
                                    isTop && React.createElement('span', { className: 'text-yellow-500' }, '🏆'),
                                    React.createElement('span', { className: 'text-sm font-semibold text-gray-900' }, dept.department)
                                )
                            ),
                            React.createElement('td', { className: 'py-3 px-4 text-right' },
                                React.createElement('span', { className: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' },
                                    dept.event_count
                                )
                            ),
                            React.createElement('td', { className: 'py-3 px-4 text-right text-sm font-bold text-emerald-600' },
                                '₱' + (dept.total_budget || 0).toLocaleString()
                            ),
                            React.createElement('td', { className: 'py-3 px-4 text-right text-sm text-gray-700' },
                                '₱' + Math.round(dept.avg_budget || 0).toLocaleString()
                            )
                        );
                    })
                )
            )
        )
    );
};
