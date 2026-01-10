// AnalyticsDashboard Component - Comprehensive analytics with charts
const { useState, useEffect, useRef } = React;

window.AnalyticsDashboard = function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chart refs
  const statusChartRef = useRef(null);
  const typeChartRef = useRef(null);
  const feedbackChartRef = useRef(null);
  const trendsChartRef = useRef(null);

  // Chart instances
  const statusChartInstance = useRef(null);
  const typeChartInstance = useRef(null);
  const feedbackChartInstance = useRef(null);
  const trendsChartInstance = useRef(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (analytics) {
      renderCharts();
    }

    // Cleanup charts on unmount
    return () => {
      if (statusChartInstance.current) statusChartInstance.current.destroy();
      if (typeChartInstance.current) typeChartInstance.current.destroy();
      if (feedbackChartInstance.current) feedbackChartInstance.current.destroy();
      if (trendsChartInstance.current) trendsChartInstance.current.destroy();
    };
  }, [analytics]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderCharts = () => {
    if (!analytics) return;

    // Destroy existing charts
    if (statusChartInstance.current) statusChartInstance.current.destroy();
    if (typeChartInstance.current) typeChartInstance.current.destroy();
    if (feedbackChartInstance.current) feedbackChartInstance.current.destroy();
    if (trendsChartInstance.current) trendsChartInstance.current.destroy();

    // 1. Status Distribution Pie Chart
    if (statusChartRef.current && analytics.status_distribution.length > 0) {
      const statusData = analytics.status_distribution;
      const statusColors = {
        'Pending': '#fbbf24',
        'Under Review': '#3b82f6',
        'Approved': '#10b981',
        'Ongoing': '#8b5cf6',
        'Completed': '#14b8a6',
        'Draft': '#6b7280',
        'Archived': '#9ca3af'
      };

      statusChartInstance.current = new Chart(statusChartRef.current, {
        type: 'doughnut',
        data: {
          labels: statusData.map(d => d.status),
          datasets: [{
            data: statusData.map(d => d.count),
            backgroundColor: statusData.map(d => statusColors[d.status] || '#6b7280'),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { padding: 15, font: { size: 12 } }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = ((context.parsed / total) * 100).toFixed(1);
                  return `${context.label}: ${context.parsed} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 2. Event Type Distribution Bar Chart
    if (typeChartRef.current && analytics.type_distribution.length > 0) {
      const typeData = analytics.type_distribution;

      typeChartInstance.current = new Chart(typeChartRef.current, {
        type: 'bar',
        data: {
          labels: typeData.map(d => d.event_type),
          datasets: [{
            label: 'Number of Events',
            data: typeData.map(d => d.count),
            backgroundColor: '#6366f1',
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }

    // 3. Feedback Ratings Radar Chart
    if (feedbackChartRef.current && analytics.feedback.total_feedback > 0) {
      feedbackChartInstance.current = new Chart(feedbackChartRef.current, {
        type: 'radar',
        data: {
          labels: ['Overall', 'Venue', 'Activities', 'Organization'],
          datasets: [{
            label: 'Average Rating',
            data: [
              analytics.feedback.avg_overall,
              analytics.feedback.avg_venue,
              analytics.feedback.avg_activities,
              analytics.feedback.avg_organization
            ],
            backgroundColor: 'rgba(99, 102, 241, 0.2)',
            borderColor: '#6366f1',
            borderWidth: 2,
            pointBackgroundColor: '#6366f1',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#6366f1'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              max: 5,
              ticks: { stepSize: 1 }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    // 4. Monthly Trends Line Chart
    if (trendsChartRef.current && analytics.trends.monthly.length > 0) {
      const monthlyData = analytics.trends.monthly;

      trendsChartInstance.current = new Chart(trendsChartRef.current, {
        type: 'line',
        data: {
          labels: monthlyData.map(d => {
            const date = new Date(d.month + '-01');
            return date.toLocaleDateString('en', { month: 'short', year: 'numeric' });
          }),
          datasets: [{
            label: 'Events',
            data: monthlyData.map(d => d.event_count),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { precision: 0 }
            }
          }
        }
      });
    }
  };

  if (loading) {
    return React.createElement('div', { className: 'flex items-center justify-center h-96' },
      React.createElement('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600' })
    );
  }

  if (!analytics) {
    return React.createElement('div', { className: 'text-center text-gray-500 py-12' },
      'No analytics data available'
    );
  }

  return React.createElement('div', { className: 'space-y-6' },
    // Header
    React.createElement('div', { className: 'flex justify-between items-center' },
      React.createElement('div', null,
        React.createElement('h1', { className: 'text-3xl font-bold text-gray-900' }, 'Analytics Dashboard'),
        React.createElement('p', { className: 'text-gray-500 mt-1' }, 'Comprehensive insights and metrics')
      ),
      React.createElement('button', {
        onClick: fetchAnalytics,
        className: 'px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2'
      },
        React.createElement('svg', { className: 'w-4 h-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
          React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' })
        ),
        'Refresh'
      )
    ),

    // Key Metrics Cards
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-4 gap-4' },
      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', null,
            React.createElement('p', { className: 'text-sm font-medium text-slate-600 mb-1' }, 'Total Budget'),
            React.createElement('p', { className: 'text-2xl font-bold text-emerald-600' },
              `₱${(analytics.budget.total / 1000).toFixed(0)}K`
            )
          ),
          React.createElement('div', { className: 'w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-emerald-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
            )
          )
        ),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' },
          `Avg: ₱${analytics.budget.average.toFixed(0)}`
        )
      ),

      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', null,
            React.createElement('p', { className: 'text-sm font-medium text-slate-600 mb-1' }, 'Attendance Rate'),
            React.createElement('p', { className: 'text-2xl font-bold text-blue-600' },
              `${analytics.attendance.attendance_rate}%`
            )
          ),
          React.createElement('div', { className: 'w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-blue-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' })
            )
          )
        ),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' },
          `${analytics.attendance.total_attendees}/${analytics.attendance.total_registrations} registered`
        )
      ),

      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', null,
            React.createElement('p', { className: 'text-sm font-medium text-slate-600 mb-1' }, 'Avg Feedback'),
            React.createElement('p', { className: 'text-2xl font-bold text-amber-600' },
              `${analytics.feedback.avg_overall}/5`
            )
          ),
          React.createElement('div', { className: 'w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-amber-600', fill: 'currentColor', viewBox: '0 0 20 20' },
              React.createElement('path', { d: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' })
            )
          )
        ),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' },
          `${analytics.feedback.total_feedback} responses`
        )
      ),

      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('div', null,
            React.createElement('p', { className: 'text-sm font-medium text-slate-600 mb-1' }, 'Upcoming Events'),
            React.createElement('p', { className: 'text-2xl font-bold text-purple-600' },
              analytics.trends.upcoming_events
            )
          ),
          React.createElement('div', { className: 'w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-purple-600', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
            )
          )
        ),
        React.createElement('p', { className: 'text-xs text-slate-500 mt-2' }, 'Approved & scheduled')
      )
    ),

    // Charts Grid
    React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6' },
      // Events by Status
      React.createElement('div', { className: 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-4' },
          React.createElement('div', { className: 'w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' })
            )
          ),
          React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Events by Status')
        ),
        React.createElement('div', { className: 'bg-white rounded-lg p-4' },
        React.createElement('div', { style: { height: '300px' } },
          React.createElement('canvas', { ref: statusChartRef })
        )
        )
      ),

      // Event Types
      React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
        React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Events by Type'),
        React.createElement('div', { style: { height: '300px' } },
          React.createElement('canvas', { ref: typeChartRef })
        )
        )
      ),

      // Feedback Ratings
      React.createElement('div', { className: 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-4' },
          React.createElement('div', { className: 'w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' })
            )
          ),
          React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Feedback Ratings')
        ),
        React.createElement('div', { className: 'bg-white rounded-lg p-4' },
        analytics.feedback.total_feedback > 0
          ? React.createElement('div', { className: 'h-64' },
            React.createElement('canvas', { ref: feedbackChartRef })
          )
          : React.createElement('div', { className: 'h-64 flex items-center justify-center text-gray-400' },
            'No feedback data yet'
          )
      ),

      // Event Trends
      React.createElement('div', { className: 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3 mb-4' },
          React.createElement('div', { className: 'w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center' },
            React.createElement('svg', { className: 'w-6 h-6 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
              React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z' })
            )
          ),
          React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Event Trends (6 Months)')
        ),
        React.createElement('div', { className: 'bg-white rounded-lg p-4' },
        React.createElement('div', { className: 'h-64' },
          React.createElement('canvas', { ref: trendsChartRef })
        )
      )
    ),

    // Recent Feedback Table
    analytics.feedback.per_event && analytics.feedback.per_event.length > 0 && React.createElement('div', { className: 'bg-white rounded-lg border border-slate-200 p-6' },
      React.createElement('h3', { className: 'text-lg font-semibold text-gray-900 mb-4' }, 'Recent Event Feedback'),
      React.createElement('div', { className: 'overflow-x-auto' },
        React.createElement('table', { className: 'min-w-full' },
          React.createElement('thead', { className: 'bg-gradient-to-r from-blue-600 to-indigo-600' },
            React.createElement('tr', null,
              React.createElement('th', { className: 'text-left py-3 px-4 text-sm font-semibold text-gray-700' }, 'Event'),
              React.createElement('th', { className: 'text-left py-3 px-4 text-sm font-semibold text-gray-700' }, 'Date'),
              React.createElement('th', { className: 'text-center py-3 px-4 text-sm font-semibold text-gray-700' }, 'Rating'),
              React.createElement('th', { className: 'text-right py-3 px-4 text-sm font-semibold text-gray-700' }, 'Responses')
            )
          ),
          React.createElement('tbody', { className: 'divide-y divide-gray-100' },
            analytics.feedback.per_event.map((event, idx) => {
              const ratingColor = event.avg_rating >= 4.5 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                event.avg_rating >= 4.0 ? 'text-blue-600 bg-blue-50 border-blue-200' :
                  event.avg_rating >= 3.0 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                    'text-red-600 bg-red-50 border-red-200';

              const date = new Date(event.start_datetime);
              const formattedDate = date.toLocaleDateString();

              return React.createElement('tr', { key: idx, className: 'hover:bg-blue-50 transition-colors' },
                React.createElement('td', { className: 'py-3 px-4 text-sm font-medium text-gray-900' }, event.name),
                React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-500' }, formattedDate),
                React.createElement('td', { className: 'py-3 px-4 text-center' },
                  React.createElement('span', { className: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${ratingColor}` },
                    event.avg_rating.toFixed(1),
                    React.createElement('svg', { className: 'w-3 h-3 ml-1', fill: 'currentColor', viewBox: '0 0 20 20' },
                      React.createElement('path', { d: 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' })
                    )
                  )
                ),
                React.createElement('td', { className: 'py-3 px-4 text-sm text-gray-700 text-right' }, event.response_count)
              );
            })
          )
        )
      )
    ),

    // Top Venues
    analytics.top_venues.length > 0 && React.createElement('div', { className: 'bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 shadow-sm' },
      React.createElement('div', { className: 'flex items-center gap-3 mb-5' },
        React.createElement('div', { className: 'w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center' },
          React.createElement('svg', { className: 'w-6 h-6 text-white', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
            React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' })
          )
        ),
        React.createElement('h3', { className: 'text-lg font-bold text-gray-900' }, 'Top 5 Venues')
      ),
      React.createElement('div', { className: 'bg-white rounded-lg shadow-sm overflow-hidden' },
      React.createElement('div', { className: 'overflow-x-auto' },
        React.createElement('table', { className: 'min-w-full' },
          React.createElement('thead', { className: 'bg-gradient-to-r from-blue-600 to-indigo-600' },
            React.createElement('tr', null,
              React.createElement('th', { className: 'text-left py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider' }, 'Venue'),
              React.createElement('th', { className: 'text-right py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider' }, 'Usage Count'),
              React.createElement('th', { className: 'text-right py-3 px-4 text-xs font-semibold text-white uppercase tracking-wider' }, 'Popularity')
            )
          ),
          React.createElement('tbody', { className: 'divide-y divide-gray-100' },
            analytics.top_venues.map((venue, idx) => {
              const maxCount = analytics.top_venues[0].usage_count;
              const percentage = (venue.usage_count / maxCount * 100).toFixed(0);
              return React.createElement('tr', { key: idx, className: 'hover:bg-blue-50 transition-colors' },
                React.createElement('td', { className: 'py-3 px-4 text-sm font-medium text-gray-900' }, venue.venue),
                React.createElement('td', { className: 'py-3 px-4 text-right' },
                  React.createElement('span', { className: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' },
                    venue.usage_count
                  )
                ),
                React.createElement('td', { className: 'py-3 px-4 text-right' },
                  React.createElement('div', { className: 'flex items-center justify-end gap-2' },
                    React.createElement('div', { className: 'w-24 bg-gray-200 rounded-full h-2' },
                      React.createElement('div', {
                        className: 'bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full',
                        style: { width: `${percentage}%` }
                      })
                    ),
                    React.createElement('span', { className: 'text-xs text-gray-600 font-medium' }, percentage + '%')
                  )
                )
              );
            })
          )
        )
      )
    )
  );
};
