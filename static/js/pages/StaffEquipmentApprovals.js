
const EquipmentApprovals = () => {
  const [activeTab, setActiveTab] = useState('All');
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    total: 0,
    upcoming: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/venues/requests');
      const data = await response.json();
      if (data.success) {
        setRequests(data.requests);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (eventId, action) => {
    try {
      const response = await fetch(`/api/venues/requests/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      });
      
      if (response.ok) {
        fetchRequests();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getCategoryIcon = (category) => {
    const iconProps = { className: "w-5 h-5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' };
    switch (category?.toLowerCase()) {
      case 'av':
      case 'audio & visual': 
        return React.createElement('svg', iconProps, 
          React.createElement('path', {strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3'})
        );
      case 'it': 
        return React.createElement('svg', iconProps,
          React.createElement('path', {strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z'})
        );
      case 'furniture': 
        return React.createElement('svg', iconProps,
          React.createElement('path', {strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M20.354 15.354A9 9 0 015.646 5.646 9.001 9.001 0 0020.354 15.354z'})
        );
      default: 
        return React.createElement('svg', iconProps,
          React.createElement('path', {strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'})
        );
    }
  };

  const getClockIcon = () => {
    return React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
    );
  };

  const getCheckCircleIcon = () => {
    return React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' })
    );
  };

  const getBoxIcon = () => {
    return React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' })
    );
  };

  const getCalendarIcon = () => {
    return React.createElement('svg', { className: "w-6 h-6 text-white", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
    );
  };

  const filteredRequests = requests.filter(req => {
    if (activeTab === 'All') return true;
    return req.status === activeTab;
  });

  if (loading) return React.createElement('div', { className: "p-8 text-center" }, "Loading...");

  return (
    React.createElement('div', { className: "p-6 max-w-7xl mx-auto" },
      React.createElement('div', { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" },
        React.createElement(StatCard, {
          icon: getClockIcon(),
          bg: "bg-orange-500",
          label: "Pending Approval",
          value: stats.pending,
          sub: "Awaiting review"
        }),
        React.createElement(StatCard, {
          icon: getCheckCircleIcon(),
          bg: "bg-emerald-500",
          label: "Approved",
          value: stats.approved,
          sub: "This week"
        }),
        React.createElement(StatCard, {
          icon: getBoxIcon(),
          bg: "bg-indigo-500",
          label: "Total Requests",
          value: stats.total,
          sub: "All time"
        }),
        React.createElement(StatCard, {
          icon: getCalendarIcon(),
          bg: "bg-purple-500",
          label: "Upcoming Events",
          value: stats.upcoming,
          sub: "Next 7 days"
        })
      ),

      React.createElement('div', { className: "bg-white rounded-lg border border-slate-200 p-1 mb-6 inline-flex" },
        ['All', 'Pending', 'Approved', 'Rejected'].map(tab =>
          React.createElement('button', {
            key: tab,
            onClick: () => setActiveTab(tab),
            className: `px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab 
                ? 'bg-indigo-600 text-white' 
                : 'text-slate-600 hover:bg-slate-50'
            }`
          },
            tab,
            React.createElement('span', {
              className: `ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'
              }`
            }, tab === 'All' ? requests.length : requests.filter(r => r.status === tab).length)
          )
        )
      ),

      React.createElement('div', { className: "space-y-4" },
        filteredRequests.map(request =>
          React.createElement('div', { key: request.id, className: "bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden" },
            // Header
            React.createElement('div', { className: "p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4" },
              React.createElement('div', { className: "flex items-start gap-3" },
                React.createElement('div', null,
                  React.createElement('div', { className: "flex items-center gap-2" },
                    React.createElement('h3', { className: "font-semibold text-slate-900" }, request.name),
                    React.createElement(StatusBadge, { status: request.status })
                  ),
                  React.createElement('div', { className: "flex items-center gap-4 mt-1 text-sm text-slate-500" },
                    React.createElement('span', { className: "flex items-center gap-1" },
                      React.createElement('svg', { className: "w-4 h-4", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
                      ),
                      new Date(request.date).toLocaleDateString()
                    ),
                    React.createElement('span', { className: "flex items-center gap-1" },
                      React.createElement('div', { className: "w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600" },
                        request.requestor.charAt(0)
                      ),
                      request.requestor
                    ),
                    React.createElement('span', { className: "text-slate-400" }, 'Requested ' + request.requested_at)
                  )
                )
              ),
              request.status === 'Pending' && React.createElement('div', { className: "flex items-center gap-2" },
                React.createElement('button', {
                  onClick: () => handleAction(request.id, 'Rejected'),
                  className: "px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-slate-200 rounded-lg hover:bg-red-50 flex items-center gap-1"
                },
                  React.createElement('svg', { className: "w-4 h-4", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
                  ),
                  ' Reject'
                ),
                React.createElement('button', {
                  onClick: () => handleAction(request.id, 'Approved'),
                  className: "px-3 py-1.5 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 flex items-center gap-1"
                },
                  React.createElement('svg', { className: "w-4 h-4", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
                  ),
                  ' Approve'
                )
              )
            ),

            // Equipment List
            React.createElement('div', { className: "p-4 bg-slate-50/50 space-y-3" },
              React.createElement('p', { className: "text-sm font-medium text-slate-700 mb-2" }, "Requested Equipment:"),
              request.items.map(item =>
                React.createElement('div', { key: item.id, className: `flex items-center justify-between p-3 rounded-lg border ${
                  item.available < item.requested 
                    ? 'bg-red-50 border-red-100' 
                    : 'bg-white border-slate-200'
                }` },
                  React.createElement('div', { className: "flex items-center gap-3" },
                    React.createElement('div', { className: `p-2 rounded-lg ${
                      item.available < item.requested ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
                    }` },
                      getCategoryIcon(item.category)
                    ),
                    React.createElement('div', null,
                      React.createElement('p', { className: `font-medium ${
                        item.available < item.requested ? 'text-red-900' : 'text-slate-900'
                      }` }, item.name),
                      React.createElement('p', { className: `text-xs ${
                        item.available < item.requested ? 'text-red-700' : 'text-slate-500'
                      }` }, item.category)
                    )
                  ),
                  React.createElement('div', { className: "flex items-center gap-6 text-sm" },
                    React.createElement('span', { className: "text-slate-600" },
                      "Requested: ",
                      React.createElement('span', { className: "font-semibold text-slate-900" }, item.requested)
                    ),
                    React.createElement('span', { className: `${
                      item.available < item.requested ? 'text-red-600 font-bold' : 'text-emerald-600 font-medium'
                    }` },
                      "Available: " + item.available
                    ),
                    item.available < item.requested && React.createElement('span', { className: "flex items-center gap-1 text-red-600 text-xs font-medium bg-red-100 px-2 py-1 rounded" },
                      React.createElement('svg', { className: "w-3 h-3", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
                      ),
                      ' Insufficient stock'
                    )
                  )
                )
              )
            ),

            // Footer Note
            request.items.some(i => i.available < i.requested) && React.createElement('div', { className: "px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-start gap-2" },
              React.createElement('svg', { className: "w-4 h-4 text-blue-500 mt-0.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
              ),
              React.createElement('p', { className: "text-sm text-blue-700" },
                "Note: Insufficient equipment available for requested dates"
              )
            )
          )
        )
      )
    )
  );
};

const StatCard = ({ icon, bg, label, value, sub }) => 
  React.createElement('div', { className: "bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4" },
    React.createElement('div', { className: `p-3 rounded-lg ${bg} shadow-sm` },
      icon
    ),
    React.createElement('div', null,
      React.createElement('p', { className: "text-sm font-medium text-slate-500" }, label),
      React.createElement('h3', { className: "text-2xl font-bold text-slate-900" }, value),
      React.createElement('p', { className: "text-xs text-slate-400 mt-1" }, sub)
    )
  );

const StatusBadge = ({ status }) => {
  const styles = {
    Pending: 'bg-orange-100 text-orange-700 border-orange-200',
    Approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Rejected: 'bg-red-100 text-red-700 border-red-200'
  };
  
  const getIcon = (status) => {
    if (status === 'Pending') {
      return React.createElement('svg', { className: "w-3 h-3", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
      );
    } else if (status === 'Approved') {
      return React.createElement('svg', { className: "w-3 h-3", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
      );
    } else {
      return React.createElement('svg', { className: "w-3 h-3", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
      );
    }
  };

  return React.createElement('span', { className: `px-2 py-0.5 rounded text-xs font-medium border flex items-center gap-1 ${styles[status] || styles.Pending}` },
    getIcon(status),
    ' ' + status
  );
};

window.EquipmentApprovals = EquipmentApprovals;
