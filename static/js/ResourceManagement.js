// ResourceManagement - Combined view for Venues, Equipment, and Conflicts
window.ResourceManagement = function ResourceManagement({ userRole }) {
  const EquipmentInventory = window.EquipmentInventory;

  return (
    <div className="space-y-2 md:space-y-3">
      {/* Content Area */}
      <div>
        <EquipmentInventory />
      </div>
    </div>
  );
}
