// ResourceRequirementsChecklist Component - AI-generated resource checklist
window.ResourceRequirementsChecklist = function ResourceRequirementsChecklist({ resourceData, formData, onEquipmentUpdate }) {
  const [expandedCategories, setExpandedCategories] = React.useState({});
  const [selectedItems, setSelectedItems] = React.useState({});

  React.useEffect(() => {
    if (resourceData?.checklist) {
      const syncedItems = {};
      Object.entries(resourceData.checklist).forEach(([category, items]) => {
        items.forEach(item => {
          const itemKey = `${category}-${item.name}`;
          syncedItems[itemKey] = formData?.equipment?.includes(item.name) || false;
        });
      });
      setSelectedItems(syncedItems);
    }
  }, [resourceData, formData?.equipment]);
  
  const handleItemToggle = (category, itemName) => {
    const itemKey = `${category}-${itemName}`;
    const newSelectedItems = {
      ...selectedItems,
      [itemKey]: !selectedItems[itemKey]
    };
    setSelectedItems(newSelectedItems);
    
    const selectedEquipment = Object.entries(newSelectedItems)
      .filter(([_, isSelected]) => isSelected)
      .map(([key, _]) => key.split('-').slice(1).join('-'));
    
    if (onEquipmentUpdate) {
      onEquipmentUpdate(selectedEquipment);
    }
  };

  if (!resourceData) return null;
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 border-b border-blue-700">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          Resource Requirements
        </h3>
      </div>
      <div className="p-4 bg-gradient-to-b from-slate-50 to-white space-y-2">
        {Object.keys(resourceData.checklist || {}).map((category, idx) => (
          <div key={idx} className="border border-slate-200 rounded overflow-hidden">
            <button onClick={() => setExpandedCategories({...expandedCategories, [category]: !expandedCategories[category]})} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-sm">{category}</span>
              <svg className={`w-4 h-4 text-slate-600 transition ${expandedCategories[category] ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
            {expandedCategories[category] && (
              <div className="p-3 space-y-2 bg-white">
                {(resourceData.checklist[category] || []).map((item, itemIdx) => (
                  <label key={itemIdx} className="flex items-center p-1 hover:bg-slate-50 rounded cursor-pointer transition">
                    <input type="checkbox" checked={selectedItems[`${category}-${item.name}`] || false} onChange={() => handleItemToggle(category, item.name)} className="w-3 h-3 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                    <span className="ml-2 text-xs text-slate-700 flex-1">{item.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${item.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {item.status === 'available' ? '✓' : '⚠'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
