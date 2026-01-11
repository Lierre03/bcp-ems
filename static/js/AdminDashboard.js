// AdminDashboard - Main dashboard component (Reusable)
const { useState, useEffect } = React;
const Sidebar = window.Sidebar;
const NotificationBell = window.NotificationBell;
const EquipmentApprovalReview = window.EquipmentApprovalReview;
const AccountApprovalPanel = window.AccountApprovalPanel;
const DepartmentFeedback = window.DepartmentFeedback;
const ResourceManagement = window.ResourceManagement;
const RescheduleEvent = window.RescheduleEvent;
const AdminEventsManager = window.AdminEventsManager;
const AnalyticsDashboard = window.AnalyticsDashboard;
const AITrainingDashboard = window.AITrainingDashboard;
const UserManagement = window.UserManagement;
const AttendanceDashboard = window.AttendanceDashboard;
const StaffScannerView = window.StaffScannerView;
const EquipmentApprovals = window.EquipmentApprovals;

window.AdminDashboard = function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Load last active view from localStorage, default to 'events'
  const [activeView, setActiveView] = useState(() => {
    return localStorage.getItem('adminActiveView') || 'events';
  });
  const [eventIdToOpen, setEventIdToOpen] = useState(null);
  const [equipmentReviewEventId, setEquipmentReviewEventId] = useState(null);
  const [rescheduleEventId, setRescheduleEventId] = useState(null);

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/reschedule/')) {
        const eventId = hash.split('/')[2];
        setRescheduleEventId(eventId);
        setActiveView('reschedule');
      } else if (hash === '#/admin') {
        setActiveView('events');
        setRescheduleEventId(null);
      }
    };

    handleHashChange(); // Initial check
    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      setUser(JSON.parse(userJson));
    }

    // Set up global function for opening events from notifications
    window.openEventForReview = (eventId) => {
      setActiveView('events');
      setEventIdToOpen(eventId);
    };

    // Set up global function for opening equipment review
    window.openEquipmentReview = (eventId) => {
      setActiveView('equipment-review');
      setEquipmentReviewEventId(eventId);
    };

    // Set up global function for opening attendance dashboard (replaces modal)
    window.openEventAttendance = (eventId) => {
      // Store eventId in a global temp var that AttendanceDashboard will pick up on mount
      window.selectedAttendanceEventId = eventId;
      setActiveView('attendance');
    };

    return () => {
      delete window.openEventForReview;
      delete window.openEquipmentReview;
    };
  }, []);

  // Save active view to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('adminActiveView', activeView);
  }, [activeView]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      localStorage.removeItem('user');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isSuperAdmin = user && user.role_name === 'Super Admin';
  const isAdmin = user && (user.role_name === 'Admin' || user.role_name === 'Super Admin');

  // Don't render sidebar/header for reschedule view
  if (activeView === 'reschedule') {
    return React.createElement(RescheduleEvent, null);
  }

  const menuItems = [
    {
      title: "Event Management",
      items: [
        {
          id: 'events',
          label: 'Events Manager',
          icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        }
      ]
    },
    {
      title: "Attendance & Feedback",
      items: [
        {
          id: 'attendance',
          label: 'Attendance',
          icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        },
        {
          id: 'feedback',
          label: 'Event Feedback',
          icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
        }
      ]
    },
    {
      title: "Analysis & Intelligence",
      items: [
        {
          id: 'analytics',
          label: 'Analytics Dashboard',
          icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        },
        ...(isSuperAdmin ? [{
          id: 'ai-training',
          label: 'AI Training',
          icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        }] : [])
      ]
    },
    {
      title: "Administration",
      items: [
        ...(isAdmin ? [{
          id: 'approvals',
          label: 'Account Approvals',
          icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        }] : []),
        {
          id: 'resources',
          label: 'Resource Management',
          icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        },
        ...(isSuperAdmin ? [{
          id: 'users',
          label: 'User Management',
          icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        }] : [])
      ]
    }
  ]
},
{
  title: "Staff Operations",
  items: [
    ...(isSuperAdmin ? [{
      id: 'staff-scanner',
      label: 'QR Attendance Scanner',
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 21h4.01M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 21h4.01M8 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M8 12h4.01M8 15h4.01M8 21h4.01" /></svg>
    }, {
      id: 'staff-approvals',
      label: 'Resource Approvals',
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    }] : [])
  ]
}
  ];

return (
  <div className="flex h-screen bg-gray-50">
    <Sidebar
      user={user}
      menuItems={menuItems}
      activeView={activeView}
      onViewChange={setActiveView}
      onLogout={handleLogout}
      isOpen={isSidebarOpen}
      onClose={() => setIsSidebarOpen(false)}
    />

    <div className="flex-1 flex flex-col overflow-hidden w-full relative">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 shadow-sm relative flex-shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex-1 flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <p className="text-blue-600 text-xs font-medium mb-0.5">Admin Dashboard</p>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {activeView === 'events' ? 'Events Manager' :
                  activeView === 'approvals' ? 'Account Approvals' :
                    activeView === 'analytics' ? 'Analytics Dashboard' :
                      activeView === 'feedback' ? 'Event Feedback' :
                        activeView === 'ai-training' ? 'AI Training Center' :
                          activeView === 'resources' ? 'Resource Management' :
                            activeView === 'resources' ? 'Resource Management' :
                              activeView === 'equipment-review' ? 'Equipment Approval Review' :
                                activeView === 'staff-scanner' ? 'QR Attendance Scanner' :
                                  activeView === 'staff-approvals' ? 'Resource Approvals' : 'User Management'}
              </h1>
              <p className="text-gray-500 text-xs mt-1">
                {activeView === 'events' ? 'Create, manage, and track all school events' :
                  activeView === 'approvals' ? 'Review and approve student registration requests' :
                    activeView === 'analytics' ? 'Visualize event metrics, attendance, and performance data' :
                      activeView === 'feedback' ? 'View feedback and ratings for your department events' :
                        activeView === 'ai-training' ? 'Train and optimize your event planning AI' :
                          activeView === 'resources' ? 'Manage venues, equipment, and view schedules' :
                            activeView === 'equipment-review' ? 'Review and respond to equipment approval adjustments' :
                              activeView === 'attendance' ? 'Monitor student attendance and check-ins' :
                                activeView === 'attendance' ? 'Monitor student attendance and check-ins' :
                                  activeView === 'staff-scanner' ? 'Scan participant QR codes for event attendance' :
                                    activeView === 'staff-approvals' ? 'Approve or reject equipment and venue requests' :
                                      'Manage system users and permissions'}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4">
        {activeView === 'events' && <AdminEventsManager eventIdToOpen={eventIdToOpen} />}
        {activeView === 'approvals' && <AccountApprovalPanel />}
        {activeView === 'analytics' && <AnalyticsDashboard />}
        {activeView === 'feedback' && <DepartmentFeedback />}
        {activeView === 'ai-training' && <AITrainingDashboard />}
        {activeView === 'resources' && <ResourceManagement userRole={user ? user.role_name : 'Admin'} />}
        {activeView === 'equipment-review' && <EquipmentApprovalReview eventId={equipmentReviewEventId} onClose={() => setActiveView('events')} />}
        {activeView === 'attendance' && <AttendanceDashboard />}
        {activeView === 'attendance' && <AttendanceDashboard />}
        {activeView === 'users' && <UserManagement />}
        {activeView === 'staff-scanner' && <StaffScannerView />}
        {activeView === 'staff-approvals' && <EquipmentApprovals />}
      </main>
    </div>
  </div>
);
}
