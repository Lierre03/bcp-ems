// AdminDashboard - Main dashboard component (Reusable)
const { useState, useEffect } = React;

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

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-64 bg-gradient-to-b from-blue-950 to-blue-900 text-white flex flex-col">
        <div className="p-6 border-b border-blue-800">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-blue-900 mb-3">
              {user && user.username ? user.username.charAt(0).toUpperCase() : 'A'}
            </div>
            <p className="font-bold text-white text-sm">{user && user.full_name ? user.full_name : 'Admin'}</p>
            <p className="text-blue-300 text-xs mt-1">{user && user.role_name ? user.role_name : 'Administrator'}</p>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          <button 
            onClick={() => setActiveView('events')}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition ${activeView === 'events' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
          >
            <span className="mr-3 font-bold">📋</span>
            <span className="text-sm font-medium">Events Manager</span>
          </button>
          
          <button 
            onClick={() => setActiveView('resources')}
            className={`w-full flex items-center px-4 py-3 rounded-lg transition ${activeView === 'resources' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-800'}`}
          >
            <span className="mr-3 font-bold">🏢</span>
            <span className="text-sm font-medium">Resources</span>
          </button>
        </nav>

        <div className="p-6 border-t border-blue-800">
          <button onClick={handleLogout} className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-semibold">
            Logout
          </button>
          <p className="text-blue-300 text-xs mt-4 text-center">© 2025 School Event Management</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-4 shadow-sm">
          <p className="text-blue-600 text-sm font-medium mb-1">Admin Dashboard</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeView === 'events' ? 'Events Manager' : 'Resource Management'}
          </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          {activeView === 'events' && <AdminEventsManager />}
          {activeView === 'resources' && <ResourceManagement userRole={user ? user.role_name : 'Admin'} />}
        </main>
      </div>
    </div>
  );
}
