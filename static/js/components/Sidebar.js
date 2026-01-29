window.Sidebar = function Sidebar({ user, menuItems, activeView, onViewChange, onLogout, isOpen, onClose, isCollapsed, onToggleCollapse }) {
  // Mobile overlay
  const Overlay = isOpen ? (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
      onClick={onClose}
    ></div>
  ) : null;

  return (
    <>
      {Overlay}
      <div className={`
        fixed inset-y-0 left-0 z-50 bg-gradient-to-b from-blue-950 to-blue-900 text-white flex flex-col h-full transition-all duration-300 ease-in-out relative
        md:flex
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-16' : 'md:w-64'}
        w-64
      `}>
        
        <div className={`
            border-b border-blue-800 flex flex-col items-center justify-center transition-all duration-300 relative
            ${isCollapsed ? 'py-4 w-full' : 'p-6'}
        `}>
           {/* Collapse Toggle Button */}
           <button 
                onClick={onToggleCollapse}
                className={`
                    hidden md:flex items-center justify-center p-1.5 rounded-md text-blue-300 hover:text-white hover:bg-blue-800 transition-colors z-10
                    ${isCollapsed ? 'mb-3' : 'absolute top-3 right-3'}
                `}
                title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="9" y1="3" x2="9" y2="21" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
           </button>

           {isCollapsed && (
             <div className="w-8 h-px bg-blue-700/50 mb-3"></div>
           )}

          <div className={`flex flex-col items-center text-center w-full overflow-hidden ${isCollapsed ? '' : 'mt-2'}`}>
            <div className={`${isCollapsed ? 'w-10 h-10 text-lg mb-2' : 'w-16 h-16 text-2xl mb-3'} bg-white rounded-full flex items-center justify-center font-bold text-blue-900 transition-all duration-300 flex-shrink-0`}>
              {user && user.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            
            <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
                <p className="font-bold text-white text-sm whitespace-nowrap">{user && user.full_name ? user.full_name : 'User'}</p>
                <p className="text-blue-300 text-xs mt-1 whitespace-nowrap">{user && user.role_name ? user.role_name : 'Role'}</p>
            </div>
          </div>
          {/* Mobile Close Button - Only visible on mobile */}
          <button onClick={onClose} className="md:hidden text-blue-300 hover:text-white absolute top-4 right-4 h-6 w-6">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-2 overflow-y-auto sidebar-scroll overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          {menuItems.map((group, groupIndex) => (
            <div key={groupIndex}>
              {group.title && (
                <div className={`px-6 mb-2 text-xs font-semibold text-blue-400 uppercase tracking-wider transition-opacity duration-300 whitespace-nowrap ${isCollapsed ? 'hidden' : 'block'}`}>
                  {group.title}
                </div>
              )}
              {isCollapsed && group.title && <div className="h-px bg-blue-800/50 mx-4 my-2"></div>}
              
              <div className="space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onViewChange(item.id);
                      if (window.innerWidth < 768 && onClose) onClose(); // Close on selection on mobile
                    }}
                    title={isCollapsed ? item.label : ''}
                    className={`
                        w-full flex items-center transition-all duration-200 group relative
                        ${isCollapsed ? 'justify-center px-0 py-3' : 'px-6 py-2.5'}
                        ${activeView === item.id ? 'bg-blue-800 text-white' : 'text-blue-300 hover:bg-blue-900/50 hover:text-white'}
                        ${activeView === item.id && !isCollapsed ? 'border-r-4 border-blue-400' : ''}
                    `}
                  >
                    <div className={`${isCollapsed ? '' : 'mr-3'} flex-shrink-0 flex items-center justify-center`}>
                        {item.icon}
                    </div>
                    
                    {!isCollapsed && (
                        <span className="text-sm font-medium flex-1 text-left whitespace-nowrap opacity-100 transition-opacity duration-200">
                            {item.label}
                        </span>
                    )}

                    {/* Badges */}
                    {item.badge > 0 && (
                      !isCollapsed ? (
                          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2 shadow-sm animate-pulse">
                            {item.badge}
                          </span>
                      ) : (
                          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-blue-900 animate-pulse"></span>
                      )
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button
            onClick={onLogout}
            title={isCollapsed ? "Logout" : ""}
            className={`
                w-full flex items-center transition-all duration-200 rounded-lg group
                ${isCollapsed ? 'justify-center py-3 px-0' : 'px-6 py-3'}
                text-blue-100 hover:bg-blue-800 hover:text-white
            `}
          >
            <svg className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'} text-blue-300 group-hover:text-white`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">Logout</span>}
          </button>
          
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}>
              <p className="text-blue-300 text-xs mt-4 text-center whitespace-nowrap">© 2025 School Event Management</p>
          </div>
        </div>
      </div>
    </>
  );
};
