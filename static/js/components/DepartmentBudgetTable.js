// Department Budget Comparison - Standalone Component
window.DepartmentBudgetTable = function DepartmentBudgetTable({ data }) {
    if (!data || data.length === 0) return null;

    return React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
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
                    data.map((dept, idx) =>
                        React.createElement('tr', { key: idx, className: 'border-b border-gray-100 hover:bg-gray-50' },
                            React.createElement('td', { className: 'py-3 px-4 text-sm font-medium text-gray-900' }, dept.department),
                            React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700 text-right' }, dept.event_count),
                            React.createElement('td', { className: 'py-3 px-4 text-sm text-emerald-600 text-right font-medium' },
                                '₱' + (dept.total_budget || 0).toLocaleString()
                            ),
                            React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700 text-right' },
                                '₱' + Math.round(dept.avg_budget || 0).toLocaleString()
                            )
                        )
                    )
                )
            )
        )
    );
};
