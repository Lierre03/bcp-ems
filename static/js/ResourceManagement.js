// ResourceManagement - Combined view for Venues, Equipment, and Conflicts
window.ResourceManagement = function ResourceManagement({ userRole }) {
  const [activeTab, setActiveTab] = React.useState('calendar');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Resource Management</h1>
          <p className="text-slate-500 mt-1">Manage venues, equipment, and view schedules</p>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex">
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Venue Calendar
          </button>
          <button 
            onClick={() => setActiveTab('equipment')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'equipment' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Equipment Inventory
          </button>
          {['Super Admin', 'Admin', 'Staff'].includes(userRole) && (
            <button 
              onClick={() => setActiveTab('conflicts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${activeTab === 'conflicts' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Conflict Resolution
            </button>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        {activeTab === 'calendar' && (
          <VenueCalendar userRole={userRole} />
        )}

        {activeTab === 'equipment' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Equipment Inventory</h3>
            <p className="text-slate-500 mt-2">This module is under development.</p>
          </div>
        )}

        {activeTab === 'conflicts' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Conflict Resolution</h3>
            <p className="text-slate-500 mt-2">This module is under development.</p>
          </div>
        )}
      </div>
    </div>
  );
}
