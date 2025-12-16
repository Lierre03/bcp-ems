window.Sidebar = function Sidebar({ user, menuItems, activeView, onViewChange, onLogout }) {
  return (
    <div className="w-64 bg-gradient-to-b from-blue-950 to-blue-900 text-white flex flex-col h-full">
      <div className="p-6 border-b border-blue-800">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-2xl font-bold text-blue-900 mb-3">
            {user && user.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>
          <p className="font-bold text-white text-sm">{user && user.full_name ? user.full_name : 'User'}</p>
          <p className="text-blue-300 text-xs mt-1">{user && user.role_name ? user.role_name : 'Role'}</p>
        </div>
      </div>

      <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
        <div className="mb-2 px-6 text-xs font-semibold text-blue-400 uppercase tracking-wider">
          Main Menu
        </div>

        {menuItems.map((item) => (
          <button 
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center px-6 py-3 transition-all duration-200 group ${activeView === item.id ? 'bg-blue-800 text-white border-r-4 border-blue-400' : 'text-blue-300 hover:bg-blue-900/50 hover:text-white'}`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-blue-800">
        <button 
            onClick={onLogout} 
            className="w-full flex items-center px-6 py-3 text-blue-100 hover:bg-blue-800 hover:text-white transition-all duration-200 rounded-lg group"
        >
            <svg className="w-5 h-5 mr-3 text-blue-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm font-medium">Logout</span>
        </button>
        <p className="text-blue-300 text-xs mt-4 text-center">© 2025 School Event Management</p>
      </div>
    </div>
  );
};
