// EquipmentInventory Component - Updated to match design
window.EquipmentInventory = function EquipmentInventory() {
    const [equipment, setEquipment] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [showModal, setShowModal] = React.useState(false);
    const [newEquipment, setNewEquipment] = React.useState({
        name: '',
        category: '',
        customCategory: '',
        total_quantity: 0
    });
    const [categories, setCategories] = React.useState([]);

    React.useEffect(() => {
        fetchEquipment();
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/venues/equipment/categories');
            const data = await response.json();
            if (data.success) {
                setCategories(data.categories);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        }
    };

    const fetchEquipment = async () => {
        try {
            const response = await fetch('/api/venues/equipment');
            const data = await response.json();
            if (data.success) {
                // Backend now provides calculated in_use, available, and used_by fields
                setEquipment(data.equipment);
            } else {
                setError('Failed to load equipment');
            }
        } catch (err) {
            setError('Error connecting to server');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();

        // Determine the category to send
        const categoryToSend = newEquipment.category === 'Other' ? newEquipment.customCategory : newEquipment.category;

        // Validate custom category if "Other" is selected
        if (newEquipment.category === 'Other' && !newEquipment.customCategory.trim()) {
            alert("Please specify a custom category.");
            return;
        }

        try {
            const response = await fetch('/api/venues/equipment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...newEquipment,
                    category: categoryToSend
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setShowModal(false);
                setNewEquipment({ name: '', category: '', customCategory: '', total_quantity: 0 });
                // Refresh list
                fetchEquipment();
            } else {
                alert("Error adding equipment: " + data.error);
            }
        } catch (err) {
            console.error("Error submitting form:", err);
            alert("Failed to connect to server");
        }
    };

    // Calculate Summary Stats
    const stats = React.useMemo(() => {
        const totalItems = equipment.length;
        const totalUnits = equipment.reduce((acc, item) => acc + item.total_quantity, 0);
        const inUse = equipment.reduce((acc, item) => acc + item.in_use, 0);
        const available = totalUnits - inUse;
        return { totalItems, totalUnits, inUse, available };
    }, [equipment]);

    // Group by category
    const groupedEquipment = React.useMemo(() => {
        return equipment.filter(item => 
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            item.category.toLowerCase().includes(searchTerm.toLowerCase())
        ).reduce((acc, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item);
            return acc;
        }, {});
    }, [equipment, searchTerm]);

    if (loading) return <div className="p-12 text-center text-slate-500">Loading inventory...</div>;
    if (error) return <div className="p-12 text-center text-red-500">{error}</div>;

    return (
        <div className="space-y-2 md:space-y-4 font-sans text-slate-800">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h2 className="text-sm md:text-base font-semibold text-slate-800">Equipment Inventory</h2>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-blue-900 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition shadow-sm"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Add Equipment
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                {/* Total Items */}
                <div className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full -mr-3 -mt-3"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-slate-800">{stats.totalItems}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Total Items</p>
                    <p className="text-xs text-slate-400">Equipment types</p>
                </div>

                {/* Total Units */}
                <div className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-slate-50 rounded-bl-full -mr-3 -mt-3"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-slate-800">{stats.totalUnits}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Total Units</p>
                    <p className="text-xs text-slate-400">In inventory</p>
                </div>

                {/* Available */}
                <div className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-green-50 rounded-bl-full -mr-3 -mt-3"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-green-600">{stats.available}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Available</p>
                    <p className="text-xs text-slate-400">Ready for use</p>
                </div>

                {/* In Use */}
                <div className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-orange-50 rounded-bl-full -mr-3 -mt-3"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-orange-500">{stats.inUse}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">In Use</p>
                    <p className="text-xs text-slate-400">Currently deployed</p>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-1.5 md:p-2 rounded-lg border border-slate-200 shadow-sm flex gap-1.5 md:gap-2">
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input 
                        type="text" 
                        className="block w-full pl-10 pr-3 py-2 border-none rounded-md leading-5 bg-transparent placeholder-slate-400 focus:outline-none focus:ring-0 sm:text-sm" 
                        placeholder="Search equipment..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-px bg-slate-200 my-1"></div>
                <button className="px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-md transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                </button>
                <div className="w-32"></div> {/* Spacer for the empty filter box in design */}
            </div>

            {/* Inventory Lists */}
            <div className="space-y-3">
                {Object.entries(groupedEquipment).map(([category, items]) => {
                    // Calculate category stats
                    const catTotal = items.reduce((acc, i) => acc + i.total_quantity, 0);
                    const catAvailable = items.reduce((acc, i) => acc + i.available, 0);
                    const catInUse = items.reduce((acc, i) => acc + i.in_use, 0);

                    // Determine icon based on category
                    let Icon = (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    );
                    if (category.includes('AV') || category.includes('Audio')) {
                        Icon = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>;
                    } else if (category.includes('Furniture')) {
                        Icon = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>; // Box icon for furniture
                    } else if (category.includes('IT') || category.includes('Computer')) {
                        Icon = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
                    }

                    return (
                        <div key={category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Category Header */}
                            <div className="bg-slate-50 px-3 md:px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 md:gap-3">
                                    <div className={`p-1.5 md:p-2 rounded-lg ${category.includes('AV') ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                        {Icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-sm md:text-base">{category}</h3>
                                        <p className="text-xs text-slate-500">{items.length} items</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-xs">
                                    <div className="px-2 py-1 bg-white rounded border border-slate-200 shadow-sm">
                                        <span className="text-slate-500 mr-1">Total:</span>
                                        <span className="font-bold text-slate-800">{catTotal}</span>
                                    </div>
                                    <div className="px-2 py-1 bg-green-50 rounded border border-green-100 shadow-sm">
                                        <span className="text-green-600 mr-1">Avail:</span>
                                        <span className="font-bold text-green-700">{catAvailable}</span>
                                    </div>
                                    <div className="px-2 py-1 bg-orange-50 rounded border border-orange-100 shadow-sm">
                                        <span className="text-orange-600 mr-1">In Use:</span>
                                        <span className="font-bold text-orange-700">{catInUse}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Items - Mobile: Cards, Desktop: Table */}
                            <div className="md:hidden divide-y divide-slate-100">
                                {items.map((item, idx) => (
                                    <div key={idx} className="p-3 hover:bg-slate-50 transition">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-medium text-slate-800 text-sm">{item.name}</h4>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.available > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${item.available > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                {item.available > 0 ? 'In Stock' : 'Out'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div>
                                                <span className="text-slate-500">Total</span>
                                                <p className="font-semibold text-slate-700">{item.total_quantity}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">Available</span>
                                                <p className="font-semibold text-green-600">{item.available}</p>
                                            </div>
                                            <div>
                                                <span className="text-slate-500">In Use</span>
                                                <p className="font-semibold text-orange-600">{item.in_use}</p>
                                            </div>
                                        </div>
                                        {item.used_by !== '—' && (
                                            <div className="mt-2 text-xs text-slate-500">
                                                <span className="text-slate-600">Used by: </span>{item.used_by}
                                                {item.in_use > 1 && <span className="text-slate-400"> +{item.in_use - 1}</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-white text-slate-500 border-b border-slate-100">
                                        <tr>
                                            <th className="px-3 py-2 font-medium">Equipment</th>
                                            <th className="px-3 py-2 font-medium text-center">Total</th>
                                            <th className="px-3 py-2 font-medium text-center">Available</th>
                                            <th className="px-3 py-2 font-medium text-center">In Use</th>
                                            <th className="px-3 py-2 font-medium">Status</th>
                                            <th className="px-3 py-2 font-medium">Used By</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                <td className="px-3 py-2 font-medium text-slate-800">{item.name}</td>
                                                <td className="px-3 py-2 text-center text-slate-600">{item.total_quantity}</td>
                                                <td className="px-3 py-2 text-center text-slate-600">{item.available}</td>
                                                <td className="px-3 py-2 text-center text-slate-600">{item.in_use}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${item.available > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${item.available > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                        {item.available > 0 ? 'In Stock' : 'Out of Stock'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-slate-500 text-xs">
                                                    {item.used_by !== '—' ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span>{item.used_by}</span>
                                                            {item.in_use > 1 && <span className="text-slate-400">+ {item.in_use - 1} others</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Add Equipment Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                        {/* Modal Header - Navy Blue */}
                        <div className="bg-blue-900 px-6 py-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Add New Equipment</h3>
                                    <p className="text-blue-200 text-xs">Add equipment to your inventory</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-blue-200 hover:text-white transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            <div className="border-l-4 border-blue-900 pl-3 mb-6">
                                <h4 className="text-sm font-semibold text-slate-800">Basic Information</h4>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Equipment Name <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                    placeholder="e.g., Projector, Sound System..."
                                    value={newEquipment.name}
                                    onChange={(e) => setNewEquipment({...newEquipment, name: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Category <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                        value={newEquipment.category}
                                        onChange={(e) => setNewEquipment({...newEquipment, category: e.target.value})}
                                    >
                                        <option value="">Select...</option>
                                        {categories.map(category => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                        <option value="Other">Other (Specify)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Total Units <span className="text-red-500">*</span></label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                        value={newEquipment.total_quantity}
                                        onChange={(e) => setNewEquipment({...newEquipment, total_quantity: parseInt(e.target.value) || 0})}
                                    />
                                </div>
                            </div>

                            {newEquipment.category === 'Other' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Custom Category <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                        placeholder="e.g., Lab Equipment, Kitchen Supplies..."
                                        value={newEquipment.customCategory}
                                        onChange={(e) => setNewEquipment({...newEquipment, customCategory: e.target.value})}
                                    />
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
                                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    All units will be marked as available when first added. You can assign them to events later from the Events Manager.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                    Add Equipment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
