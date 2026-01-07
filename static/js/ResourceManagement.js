// ResourceManagement - Combined view for Venues, Equipment, and Conflicts
window.ResourceManagement = function ResourceManagement({ userRole }) {
  const [activeTab, setActiveTab] = React.useState('calendar');
  const VenueCalendar = window.VenueCalendar;
  const EquipmentInventory = window.EquipmentInventory;

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Tab Navigation */}
        <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex flex-wrap">
          <button 
            onClick={() => setActiveTab('calendar')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition ${activeTab === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Venue Calendar
          </button>
          <button 
            onClick={() => setActiveTab('equipment')}
            className={`px-2 md:px-4 py-1.5 md:py-2 rounded-md text-xs md:text-sm font-medium transition ${activeTab === 'equipment' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Equipment Inventory
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div>
        {activeTab === 'calendar' && (
          <VenueCalendar userRole={userRole} />
        )}

        {activeTab === 'equipment' && (
          <EquipmentInventory />
        )}
      </div>
    </div>
  );
}
