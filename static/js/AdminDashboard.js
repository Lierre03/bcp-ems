// AdminDashboard - Main dashboard component (Reusable)
const { useState, useEffect } = React;
const Sidebar = window.Sidebar;
const NotificationBell = window.NotificationBell;
const EquipmentApprovalReview = window.EquipmentApprovalReview;
const AccountApprovalPanel = window.AccountApprovalPanel;
const DepartmentFeedback = window.DepartmentFeedback;
const ResourceManagement = window.ResourceManagement;
const RescheduleEvent = window.RescheduleEvent;
const AdminEventsManager = window.AdminEventsManager || (() => <div className="p-4 text-red-500">Error: Events Manager module could not be loaded.</div>);
const AnalyticsDashboard = window.AnalyticsDashboard || (() => <div className="p-4 text-red-500">Error: Analytics module could not be loaded.</div>);
const AITrainingDashboard = window.AITrainingDashboard || (() => <div className="p-4 text-red-500">Error: AI Training module could not be loaded.</div>);
const UserManagement = window.UserManagement || (() => <div className="p-4 text-red-500">Error: User Management module could not be loaded.</div>);
const AttendanceDashboard = window.AttendanceDashboard || (() => <div className="p-4 text-red-500">Error: Attendance module could not be loaded.</div>);
const StaffScannerView = window.StaffScannerView || (() => <div className="p-4 text-red-500">Error: Staff Scanner module could not be loaded.</div>);
const EquipmentApprovals = window.EquipmentApprovals || (() => <div className="p-4 text-red-500">Error: Equipment Approvals module could not be loaded.</div>);
const VenueApprovals = window.VenueApprovals || (() => <div className="p-4 text-red-500">Error: Venue Approvals module could not be loaded.</div>);
const RejectionResolutionPage = window.RejectionResolutionPage || (() => <div className="p-4 text-red-500">Error: Resolution Page module could not be loaded.</div>);
const ResourceFulfillment = window.ResourceFulfillment || (() => <div className="p-4 text-red-500">Error: Fulfillment module could not be loaded.</div>);
const ResourceFulfillmentV2 = window.ResourceFulfillmentV2 || (() => <div className="p-4 text-red-500">Error: Fulfillment V2 module could not be loaded.</div>);
const InventoryCalendar = window.InventoryCalendar || (() => <div className="p-4 text-red-500">Error: Inventory Calendar module could not be loaded.</div>);

/* AlertModal Component */
const AlertModal = ({ isOpen, onClose, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-full mx-4 animate-fade-in sm:w-[500px]">
                <h3 className="text-lg font-bold mb-2 text-gray-800">{title}</h3>
                <p className="text-gray-600 mb-6 whitespace-pre-line">{message}</p>
                <div className="flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
                    >
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ConfirmModal Component */
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
            <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-full mx-4 animate-fade-in sm:w-[500px]">
                <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                </div>
                <p className="text-gray-600 mb-8 whitespace-pre-line text-base leading-relaxed ml-[52px]">{message}</p>
                <div className="flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium focus:ring-2 focus:ring-offset-2 focus:ring-gray-200"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => { onConfirm(); onClose(); }}
                        className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium focus:ring-2 focus:ring-offset-2 focus:ring-blue-600"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

window.AdminDashboard = function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
     return localStorage.getItem('sidebarCollapsed') === 'true';
  });

  // URL Mapping Configuration
  const VIEW_TO_PATH = {
    'events': 'events-manager',
    'approvals': 'account-approvals',
    'analytics': 'analytics-dashboard',
    'feedback': 'event-feedback',
    'ai-training': 'ai-training',
    'calendar': 'event-calendar',
    'resources': 'resource-management',
    'inventory': 'resource-fulfillment',
    'inventory-v2': 'resource-fulfillment-v2',
    'inventory-calendar': 'logistics-calendar',
    'equipment-review': 'equipment-review',
    'attendance': 'attendance-monitoring',
    'users': 'user-management',
    'staff-scanner': 'attendance-scanner',
    'staff-approvals': 'resource-approvals',
    'venue-approvals': 'venue-approvals'
  };

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', isSidebarCollapsed);
  }, [isSidebarCollapsed]);
  
  // Load last active view from URL or localStorage, default to 'events'
  const [activeView, setActiveView] = useState(() => {
    // 1. Try to parse from URL first
    const path = window.location.pathname;
    const segments = path.split('/').filter(Boolean); // e.g. ['superadmin', 'events-manager']
    
    if (segments.length > 1) {
       const slug = segments[segments.length - 1]; // check last segment
       const foundView = Object.keys(VIEW_TO_PATH).find(key => VIEW_TO_PATH[key] === slug);
       if (foundView) return foundView;
    }

    // 2. Fallback to localStorage
    return localStorage.getItem('adminActiveView') || 'events';
  });
  const [eventIdToOpen, setEventIdToOpen] = useState(null);
  const [equipmentReviewEventId, setEquipmentReviewEventId] = useState(null);
  const [rescheduleEventId, setRescheduleEventId] = useState(null);
  const [rejectionEventId, setRejectionEventId] = useState(null);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  // Sync URL when activeView changes
  useEffect(() => {
    if (!user) return; // Wait for user info to determine base path

    const basePath = user.role_name === 'Super Admin' ? '/superadmin' : '/admin';
    const slug = VIEW_TO_PATH[activeView];
    
    if (slug) {
        const newPath = `${basePath}/${slug}`;
        // Verify we aren't already there to avoid duplicate history entries
        if (window.location.pathname !== newPath) {
            window.history.pushState({ view: activeView }, '', newPath + window.location.hash);
        }
    }
    
    localStorage.setItem('adminActiveView', activeView);
  }, [activeView, user]);

  // Handle Browser Back/Forward
  useEffect(() => {
    const handlePopState = (event) => {
        if (event.state && event.state.view) {
            setActiveView(event.state.view);
        } else {
            // Fallback: parse URL again
            const path = window.location.pathname;
            const segments = path.split('/').filter(Boolean);
            if (segments.length > 1) {
                const slug = segments[segments.length - 1];
                const foundView = Object.keys(VIEW_TO_PATH).find(key => VIEW_TO_PATH[key] === slug);
                if (foundView) setActiveView(foundView);
            } else {
               setActiveView('events');
            }
        }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []); // Run once on mount

  // Alert and Confirm State
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '' });
  const [confirmState, setConfirmState] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const showAlert = (message, title = 'Notification') => {
      setAlertState({ isOpen: true, title, message });
  };

  const showConfirm = (message, onConfirm, title = 'Confirmation') => {
      setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  const closeAlert = () => {
      setAlertState(prev => ({ ...prev, isOpen: false }));
  };

  // Handle hash-based routing
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/reschedule/')) {
        const eventId = hash.split('/')[2];
        setRescheduleEventId(eventId);
        setActiveView('reschedule');
      } else if (hash.startsWith('#/resolve-rejection/')) {
        const eventId = hash.split('/')[2];
        setRejectionEventId(eventId);
        setActiveView('resolve-rejection');
      } else if (hash === '#/admin') {
        setActiveView('events');
        setRescheduleEventId(null);
        setRejectionEventId(null);
      }
    };

    handleHashChange(); // Initial check
    window.addEventListener('hashchange', handleHashChange);

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      const userData = JSON.parse(userJson);
      setUser(userData);

      if (userData.role_name === 'Super Admin') {
        document.title = 'Super Admin Dashboard';
        // Update URL to /superadmin if currently at /admin
        if (window.location.pathname === '/admin') {
          window.history.replaceState(null, 'Super Admin Dashboard', '/superadmin' + window.location.hash);
        }
      } else {
        document.title = 'Admin Dashboard';
      }
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

    window.showAlert = showAlert;
    window.showConfirm = showConfirm;

    return () => {
      delete window.openEventForReview;
      delete window.openEquipmentReview;
    };
  }, []); // Only run on mount

  // Polling for pending approvals - Runs when user/role changes
  useEffect(() => {
    // Function to fetch pending approvals count
    const fetchPendingApprovals = async () => {
      if (!user) return; // Don't fetch if no user
      if (user.role_name !== 'Super Admin' && user.role_name !== 'Admin') return;

      try {
        const response = await fetch('/api/users/pending', { credentials: 'include' });

        if (response.status === 401) {
          console.log('Session expired, redirecting to login');
          localStorage.removeItem('user');
          window.location.href = '/';
          return;
        }

        const data = await response.json();
        if (data.success) {
          setPendingApprovalCount(data.users.length);
        }
      } catch (error) {
        console.error('Error fetching pending approvals:', error);
      }
    };

    fetchPendingApprovals();
    // Poll every 60 seconds
    const pollInterval = setInterval(fetchPendingApprovals, 60000);

    return () => clearInterval(pollInterval);
  }, [user]); // Re-run if user/role changes

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
  const isStaff = user && user.role_name === 'Staff';

  // Redirect if on unauthorized view
  useEffect(() => {
    if (!user) return;

    if (activeView === 'users' && !isSuperAdmin) {
      setActiveView('events');
    }
    if (activeView === 'ai-training' && !isSuperAdmin) {
      setActiveView('events');
    }
    if ((activeView === 'staff-scanner' || activeView === 'staff-approvals' || activeView === 'venue-approvals') && !isSuperAdmin && !isStaff) {
      setActiveView('events');
    }
  }, [user, activeView, isSuperAdmin, isStaff]);

  // Don't render sidebar/header for reschedule view
  if (activeView === 'reschedule') {
    return React.createElement(RescheduleEvent, null);
  }

  if (activeView === 'resolve-rejection') {
    return React.createElement(RejectionResolutionPage, {
      eventId: rejectionEventId,
      onBack: () => {
        window.location.hash = '#/admin';
        setActiveView('events');
      },
      onResolveComplete: () => {
        window.location.hash = '#/admin';
        setActiveView('events');
        // Optionally trigger a refresh of events
      }
    });
  }

const iconClass = "w-5 h-5";

  const menuItems = [
    {
      title: "Event Management",
      items: [
        {
          id: 'events',
          label: 'Events Manager',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        {
          id: 'calendar',
          label: 'Event Calendar',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 4h-1V3a1 1 0 00-2 0v1H8V3a1 1 0 00-2 0v1H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V9h14v11zM9 11h2v2H9v-2zm4 0h2v2h-2v-2zm-4 4h2v2H9v-2zm4 0h2v2h-2v-2z" /></svg>
        }
      ]
    },
    {
      title: "Attendance & Feedback",
      items: [
        {
          id: 'attendance',
          label: 'Attendance',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        },
        {
          id: 'feedback',
          label: 'Event Feedback',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
        }
      ]
    },
    {
      title: "Analysis & Intelligence",
      items: [
        {
          id: 'analytics',
          label: 'Analytics Dashboard',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        },
        ...(isSuperAdmin ? [{
          id: 'ai-training',
          label: 'AI Training',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        }] : [])
      ]
    },
    {
      title: "Administration",
      items: [
        ...(isAdmin ? [{
          id: 'approvals',
          label: 'Account Approvals',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
          badge: pendingApprovalCount
        }] : []),
        {
          id: 'resources',
          label: 'Resource Management',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
        },
        {
          id: 'inventory',
          label: 'Resource Fulfillment',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        },
        {
          id: 'inventory-v2',
          label: 'Resource Fulfillment V2',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
        },
        {
          id: 'inventory-calendar',
          label: 'Logistics Calendar',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        },
        ...(isSuperAdmin ? [{
          id: 'users',
          label: 'User Management',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        }] : [])
      ]
    },
    ...(isSuperAdmin || isStaff ? [{
      title: "Staff Operations",
      items: [
        {
          id: 'staff-scanner',
          label: 'QR Attendance Scanner',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 21h4.01M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 15h4.01M12 21h4.01M8 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M8 12h4.01M8 15h4.01M8 21h4.01" /></svg>
        }, {
          id: 'staff-approvals',
          label: 'Resource Approvals',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>        }, {
          id: 'venue-approvals',
          label: 'Venue Approvals',
          icon: <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>        }
      ]
    }] : [])
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
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
                <p className="text-blue-600 text-xs font-medium mb-0.5">
                  {user?.role_name === 'Super Admin' ? 'Super Admin Dashboard' : 'Admin Dashboard'}
                </p>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                  {activeView === 'events' ? 'Events Manager' :
                    activeView === 'approvals' ? 'Account Approvals' :
                      activeView === 'analytics' ? 'Analytics Dashboard' :
                        activeView === 'feedback' ? 'Event Feedback' :
                          activeView === 'ai-training' ? 'AI Training Center' :
                            activeView === 'calendar' ? 'Event Calendar' :
                              activeView === 'resources' ? 'Resource Management' :
                                activeView === 'inventory' ? 'Resource Fulfillment' :
                                  activeView === 'inventory-v2' ? 'Resource Fulfillment V2' :
                                  activeView === 'inventory-calendar' ? 'Logistics Calendar' :
                                    activeView === 'equipment-review' ? 'Equipment Approval Review' :
                                      activeView === 'staff-scanner' ? 'QR Attendance Scanner' :
                                        activeView === 'staff-approvals' ? 'Resource Approvals' : 
                                          activeView === 'venue-approvals' ? 'Venue Approvals' : 'User Management'}
                </h1>
                <p className="text-gray-500 text-xs mt-1">
                  {activeView === 'events' ? 'Create, manage, and track all school events' :
                    activeView === 'approvals' ? 'Review and approve student registration requests' :
                      activeView === 'analytics' ? 'Visualize event metrics, attendance, and performance data' :
                        activeView === 'feedback' ? 'View feedback and ratings for your department events' :
                          activeView === 'ai-training' ? 'Train and optimize your event planning AI' :
                            activeView === 'resources' ? 'Manage venues, equipment, and view schedules' :
                              activeView === 'inventory' ? 'Fulfill event resource requests from property inventory' :
                                activeView === 'inventory-v2' ? 'Manage inventory allocation and equipment reservations' :
                                activeView === 'inventory-calendar' ? 'Track upcoming asset reservations and issue items' :
                                  activeView === 'equipment-review' ? 'Review and respond to equipment approval adjustments' :
                                    activeView === 'calendar' ? 'View scheduled events across all venues' :
                                      activeView === 'attendance' ? 'Monitor student attendance and check-ins' :
                                        activeView === 'staff-scanner' ? 'Scan participant QR codes for event attendance' :
                                          activeView === 'staff-approvals' ? 'Approve or reject equipment requests' :
                                            activeView === 'venue-approvals' ? 'Approve or reject venue booking requests' :
                                            'Manage system users and permissions'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="hidden md:block text-right">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{user.full_name || user.username}</p>
                  <p className="text-xs text-gray-500">{user.role_name || 'Admin'}</p>
                </div>
              )}
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className={`flex-1 p-4 ${activeView === 'calendar' ? 'overflow-hidden flex flex-col min-h-0' : 'overflow-y-auto'}`}>
          {activeView === 'events' && <AdminEventsManager eventIdToOpen={eventIdToOpen} />}
          {activeView === 'approvals' && <AccountApprovalPanel />}
          {activeView === 'analytics' && <AnalyticsDashboard />}
          {activeView === 'feedback' && <DepartmentFeedback />}
          {activeView === 'ai-training' && <AITrainingDashboard />}
          {activeView === 'calendar' && <window.VenueCalendar userRole={user ? user.role_name : 'Admin'} />}
          {activeView === 'resources' && <ResourceManagement userRole={user ? user.role_name : 'Admin'} />}
          {activeView === 'inventory' && <ResourceFulfillment />}
          {activeView === 'inventory-v2' && <ResourceFulfillmentV2 />}
          {activeView === 'inventory-calendar' && <InventoryCalendar />}
          {activeView === 'equipment-review' && <EquipmentApprovalReview eventId={equipmentReviewEventId} onClose={() => setActiveView('events')} />}
          {activeView === 'attendance' && <AttendanceDashboard />}
          {activeView === 'users' && <UserManagement />}
          {activeView === 'staff-scanner' && <StaffScannerView />}
          {activeView === 'staff-approvals' && <EquipmentApprovals />}
          {activeView === 'venue-approvals' && <VenueApprovals />}
          
          {/* Global Modals */}
          <AlertModal 
              isOpen={alertState.isOpen} 
              title={alertState.title} 
              message={alertState.message} 
              onClose={closeAlert} 
          />
          <ConfirmModal
              isOpen={confirmState.isOpen}
              title={confirmState.title}
              message={confirmState.message}
              onConfirm={confirmState.onConfirm}
              onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
          />
        </main>
      </div >
    </div >
  );
}
