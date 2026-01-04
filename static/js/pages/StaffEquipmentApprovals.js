
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
  const [expandedEquipment, setExpandedEquipment] = useState({});

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

  const handleAction = async (eventId, type, action) => {
    try {
      console.log(`Updating ${type} for event ${eventId} to status: ${action}`);
      const response = await fetch(`/api/venues/requests/${eventId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action, type: type })
      });
      
      const data = await response.json();
      console.log('Server response:', data);
      
      if (response.ok && data.success) {
        alert(data.message || `${type} ${action.toLowerCase()} successfully!`);
        fetchRequests();
      } else {
        console.error('Server error:', data);
        alert(data.error || `Failed to ${action.toLowerCase()} ${type} request`);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Network error occurred. Please try again.');
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
    // Show in Pending if either venue or equipment is pending
    if (activeTab === 'Pending') {
      return req.venue_approval_status === 'Pending' || req.equipment_approval_status === 'Pending';
    }
    // Show in Approved if both are approved
    if (activeTab === 'Approved') {
      return req.venue_approval_status === 'Approved' && req.equipment_approval_status === 'Approved';
    }
    // Show in Rejected if either is rejected
    if (activeTab === 'Rejected') {
      return req.venue_approval_status === 'Rejected' || req.equipment_approval_status === 'Rejected';
    }
    return true;
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
        ['All', 'Pending', 'Approved', 'Rejected'].map(tab => {
          let count = 0;
          if (tab === 'All') {
            count = requests.length;
          } else if (tab === 'Pending') {
            count = requests.filter(r => r.venue_approval_status === 'Pending' || r.equipment_approval_status === 'Pending').length;
          } else if (tab === 'Approved') {
            count = requests.filter(r => r.venue_approval_status === 'Approved' && r.equipment_approval_status === 'Approved').length;
          } else if (tab === 'Rejected') {
            count = requests.filter(r => r.venue_approval_status === 'Rejected' || r.equipment_approval_status === 'Rejected').length;
          }
          
          return React.createElement('button', {
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
            }, count)
          );
        })
      ),

      React.createElement('div', { className: "space-y-4" },
        filteredRequests.map(request =>
          React.createElement('div', { 
            key: request.id, 
            className: "bg-white rounded-lg border-2 border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md"
          },
            // Conflict Warning Banner (only if conflict exists)
            request.has_conflict && React.createElement('div', { className: "bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2" },
              React.createElement('svg', { className: "w-5 h-5 text-amber-600 flex-shrink-0", fill: 'currentColor', viewBox: '0 0 20 20' },
                React.createElement('path', { fillRule: 'evenodd', d: 'M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z', clipRule: 'evenodd' })
              ),
              React.createElement('div', { className: "flex-1" },
                React.createElement('span', { className: "text-amber-900 font-medium text-sm" }, 
                  `Venue conflict with "${request.conflict_with}"`
                ),
                React.createElement('span', { className: "text-amber-700 text-xs block mt-0.5" }, 
                  'FCFS Policy: Approve the earliest submission first'
                )
              )
            ),
            
            // Event Header - Clean & Professional
            React.createElement('div', { className: "p-5" },
              React.createElement('div', { className: "flex items-start justify-between mb-3" },
                React.createElement('h3', { className: "font-semibold text-slate-900 text-lg leading-tight pr-4" }, request.name),
                request.has_conflict && React.createElement('span', { 
                  className: "px-2.5 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-md flex-shrink-0 border border-amber-200" 
                }, 'CONFLICT')
              ),
              React.createElement('div', { className: "flex items-center gap-5 text-sm text-slate-600" },
                React.createElement('span', { className: "flex items-center gap-1.5" },
                  React.createElement('svg', { className: "w-4 h-4 text-slate-400", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' })
                  ),
                  React.createElement('span', { className: "font-medium" },
                    new Date(request.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  )
                ),
                React.createElement('span', { className: "flex items-center gap-1.5" },
                  React.createElement('svg', { className: "w-4 h-4 text-slate-400", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' })
                  ),
                  request.requestor
                ),
                React.createElement('span', { 
                  className: `flex items-center gap-1.5 ${request.has_conflict ? 'text-amber-700 font-semibold' : ''}`,
                  title: request.created_at ? new Date(request.created_at).toLocaleString() : ''
                }, 
                  React.createElement('svg', { className: `w-4 h-4 ${request.has_conflict ? 'text-amber-600' : 'text-slate-400'}`, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
                  ),
                  request.requested_at
                )
              )
            ),

            // Venue Approval Section - Minimal Design
            request.venue && React.createElement('div', { className: "border-t border-slate-200" },
              React.createElement('div', { className: "px-5 py-4 flex items-center justify-between" },
                React.createElement('div', { className: "flex items-center gap-3" },
                  React.createElement('div', { className: "w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center" },
                    React.createElement('svg', { className: "w-5 h-5 text-slate-600", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' })
                    )
                  ),
                  React.createElement('div', null,
                    React.createElement('p', { className: "font-medium text-slate-900 text-sm" }, request.venue),
                    React.createElement('p', { className: "text-xs text-slate-500 mt-0.5" }, "Venue Request")
                  )
                ),
                React.createElement('div', { className: "flex items-center gap-3" },
                  React.createElement(ApprovalStatusBadge, { status: request.venue_approval_status }),
                  request.venue_approval_status === 'Pending' && React.createElement('div', { className: "flex items-center gap-2" },
                    React.createElement('button', {
                      onClick: () => handleAction(request.id, 'venue', 'Rejected'),
                      className: "px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    }, 'Reject'),
                    React.createElement('button', {
                      onClick: () => handleAction(request.id, 'venue', 'Approved'),
                      className: "px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    }, 'Approve')
                  )
                )
              )
            ),

            // Equipment Approval Section - Minimal Design
            React.createElement('div', { className: "border-t border-slate-200" },
              React.createElement('div', { 
                className: "px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors",
                onClick: () => setExpandedEquipment(prev => ({ ...prev, [request.id]: !prev[request.id] }))
              },
                React.createElement('div', { className: "flex items-center gap-3 flex-1" },
                  React.createElement('div', { className: "w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center" },
                    React.createElement('svg', { className: "w-5 h-5 text-slate-600", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
                      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' })
                    )
                  ),
                  React.createElement('div', { className: "flex-1" },
                    React.createElement('p', { className: "font-medium text-slate-900 text-sm" }, `Equipment (${request.items.length} items)`),
                    React.createElement('p', { className: "text-xs text-slate-500 mt-0.5" }, 
                      expandedEquipment[request.id] ? "Click to hide details" : "Click to view details"
                    )
                  ),
                  React.createElement('svg', { 
                    className: `w-5 h-5 text-slate-400 transition-transform ${expandedEquipment[request.id] ? 'rotate-180' : ''}`,
                    fill: 'none', 
                    stroke: 'currentColor', 
                    viewBox: '0 0 24 24' 
                  },
                    React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 9l-7 7-7-7' })
                  )
                ),
                React.createElement('div', { className: "flex items-center gap-3 ml-3", onClick: (e) => e.stopPropagation() },
                  React.createElement(ApprovalStatusBadge, { status: request.equipment_approval_status }),
                  request.equipment_approval_status === 'Pending' && React.createElement('div', { className: "flex items-center gap-2" },
                    React.createElement('button', {
                      onClick: () => handleAction(request.id, 'equipment', 'Rejected'),
                      className: "px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                    }, 'Reject'),
                    React.createElement('button', {
                      onClick: () => handleAction(request.id, 'equipment', 'Approved'),
                      className: "px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    }, 'Approve')
                  )
                )
              ),

              // Equipment List (Collapsible) - Clean Design
              expandedEquipment[request.id] && React.createElement('div', { className: "px-5 pb-4 pt-2 bg-slate-50/50 border-t border-slate-100 space-y-2" },
                request.items.map((item, index) =>
                  React.createElement('div', { 
                    key: `${request.id}-${item.name}-${index}`, 
                    className: `flex items-center justify-between p-3 rounded-md ${
                      item.available < item.requested 
                        ? 'bg-red-50 border border-red-200' 
                        : 'bg-white border border-slate-200'
                    }`
                  },
                    React.createElement('div', { className: "flex items-center gap-3 flex-1" },
                      React.createElement('div', null,
                        React.createElement('p', { className: `font-medium text-sm ${
                          item.available < item.requested ? 'text-red-900' : 'text-slate-900'
                        }` }, item.name),
                        React.createElement('p', { className: `text-xs mt-0.5 ${
                          item.available < item.requested ? 'text-red-600' : 'text-slate-500'
                        }` }, item.category)
                      )
                    ),
                    React.createElement('div', { className: "flex items-center gap-6 text-sm" },
                      React.createElement('div', { className: "text-right" },
                        React.createElement('p', { className: "text-xs text-slate-500" }, 'Requested'),
                        React.createElement('p', { className: `font-semibold ${
                          item.available < item.requested ? 'text-red-700' : 'text-slate-900'
                        }` }, item.requested)
                      ),
                      React.createElement('div', { className: "text-right" },
                        React.createElement('p', { className: "text-xs text-slate-500" }, 'Available'),
                        React.createElement('p', { className: `font-semibold ${
                          item.available < item.requested ? 'text-red-700' : 'text-emerald-600'
                        }` }, item.available)
                      )
                    )
                  )
                )
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

const ApprovalStatusBadge = ({ status }) => {
  const styles = {
    Pending: 'bg-slate-100 text-slate-700 border-slate-300',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    Rejected: 'bg-slate-100 text-slate-600 border-slate-300'
  };
  
  const getIcon = (status) => {
    if (status === 'Pending') {
      return React.createElement('svg', { className: "w-3.5 h-3.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' })
      );
    } else if (status === 'Approved') {
      return React.createElement('svg', { className: "w-3.5 h-3.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M5 13l4 4L19 7' })
      );
    } else {
      return React.createElement('svg', { className: "w-3.5 h-3.5", fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M6 18L18 6M6 6l12 12' })
      );
    }
  };

  return React.createElement('span', { className: `px-3 py-1.5 rounded-md text-xs font-medium border inline-flex items-center gap-1.5 ${styles[status] || styles.Pending}` },
    getIcon(status),
    status
  );
};

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
