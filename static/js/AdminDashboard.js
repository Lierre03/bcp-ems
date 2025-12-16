// AdminDashboard - Main dashboard component (Reusable)
const { useState, useEffect } = React;
const Sidebar = window.Sidebar;

window.AdminDashboard = function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('events'); // 'events' or 'resources'

  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      setUser(JSON.parse(userJson));
    }
  }, []);

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

  const menuItems = [
    {
      id: 'events',
      label: 'Events Manager',
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    },
    {
      id: 'resources',
      label: 'Resource Management',
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
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
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <p className="text-blue-600 text-xs font-medium mb-0.5">Admin Dashboard</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeView === 'events' ? 'Events Manager' : 'Resource Management'}
          </h1>
          <p className="text-gray-500 text-xs mt-1">
            {activeView === 'events' ? 'Create, manage, and track all school events' : 'Manage venues, equipment, and view schedules'}
          </p>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          {activeView === 'events' && <AdminEventsManager />}
          {activeView === 'resources' && <ResourceManagement userRole={user ? user.role_name : 'Admin'} />}
        </main>
      </div>
    </div>
  );
}
