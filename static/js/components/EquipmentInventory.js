// EquipmentInventory Component - Professional with Edit, Archive, Quantity Adjustment
window.EquipmentInventory = function EquipmentInventory() {
    const [equipment, setEquipment] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [showAddModal, setShowAddModal] = React.useState(false);
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [selectedEquipment, setSelectedEquipment] = React.useState(null);
    const [openDropdown, setOpenDropdown] = React.useState(null);
    const [userRole, setUserRole] = React.useState('');

    // Edit modal state
    const [editForm, setEditForm] = React.useState({
        name: '',
        category: '',
        addQuantity: 0,
        reduceQuantity: 0,
        reduceReason: ''
    });

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
        // Get user role from session
        fetch('/api/auth/session')
            .then(res => res.json())
            .then(data => {
                if (data.authenticated && data.user) {
                    setUserRole(data.user.role_name);
                }
            })
            .catch(err => console.error('Error fetching user:', err));
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
        const categoryToSend = newEquipment.category === 'Other' ? newEquipment.customCategory : newEquipment.category;

        if (newEquipment.category === 'Other' && !newEquipment.customCategory.trim()) {
            alert("Please specify a custom category.");
            return;
        }

        try {
            const response = await fetch('/api/venues/equipment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...newEquipment, category: categoryToSend })
            });

            const data = await response.json();
            if (data.success) {
                setShowAddModal(false);
                setNewEquipment({ name: '', category: '', customCategory: '', total_quantity: 0 });
                fetchEquipment();
                alert('Equipment added successfully!');
            } else {
                alert("Error: " + data.error);
            }
        } catch (err) {
            console.error("Error:", err);
            alert("Failed to connect to server");
        }
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();

        try {
            // Update name/category if Super Admin
            if (userRole === 'Super Admin' && (editForm.name || editForm.category)) {
                const response = await fetch(`/api/venues/equipment/${selectedEquipment.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: editForm.name,
                        category: editForm.category
                    })
                });
                const data = await response.json();
                if (!data.success) {
                    alert("Error updating equipment: " + data.error);
                    return;
                }
            }

            // Handle quantity adjustments
            if (editForm.addQuantity > 0) {
                const response = await fetch(`/api/venues/equipment/${selectedEquipment.id}/adjust-quantity`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        change_type: 'ADD',
                        quantity: editForm.addQuantity,
                        reason: 'New stock purchased'
                    })
                });
                const data = await response.json();
                if (!data.success) {
                    alert("Error adding quantity: " + data.error);
                    return;
                }
            }

            if (editForm.reduceQuantity > 0) {
                if (!editForm.reduceReason) {
                    alert("Please provide a reason for reducing quantity");
                    return;
                }
                const response = await fetch(`/api/venues/equipment/${selectedEquipment.id}/adjust-quantity`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        change_type: 'REDUCE',
                        quantity: editForm.reduceQuantity,
                        reason: editForm.reduceReason
                    })
                });
                const data = await response.json();
                if (!data.success) {
                    alert("Error reducing quantity: " + data.error);
                    return;
                }
            }

            setShowEditModal(false);
            setSelectedEquipment(null);
            fetchEquipment();
            alert('Equipment updated successfully!');
        } catch (err) {
            console.error("Error:", err);
            alert("Failed to update equipment");
        }
    };

    const handleArchive = async (item) => {
        if (!confirm(`Archive ${item.name}? This will hide it from the active inventory.`)) return;

        try {
            const response = await fetch(`/api/venues/equipment/${item.id}/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Archived by user' })
            });
            const data = await response.json();
            if (data.success) {
                fetchEquipment();
                alert(data.message);
            } else {
                alert("Error: " + data.error);
            }
        } catch (err) {
            console.error("Error:", err);
            alert("Failed to archive equipment");
        }
    };

    const openEditModal = (item) => {
        setSelectedEquipment(item);
        setEditForm({
            name: item.name,
            category: item.category,
            addQuantity: 0,
            reduceQuantity: 0,
            reduceReason: ''
        });
        setShowEditModal(true);
        setOpenDropdown(null);
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
                    onClick={() => setShowAddModal(true)}
                    className="bg-blue-900 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition shadow-sm"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                    Add Equipment
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                <div className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-50 rounded-bl-full -mr-3 -mt-3"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-slate-800">{stats.totalItems}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Total Items</p>
                </div>

                <div className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-slate-50 rounded-bl-full -mr-3 -mt-3"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-white">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-slate-800">{stats.totalUnits}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Total Units</p>
                </div>

                <div className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-green-50 rounded-bl-full -mr-3 -mt-3"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-green-600">{stats.available}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">Available</p>
                </div>

                <div className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-12 h-12 bg-orange-50 rounded-bl-full -mr-3 -mt-3"></div>
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-lg md:text-xl font-bold text-orange-500">{stats.inUse}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-500 mt-2">In Use</p>
                </div>
            </div>

            {/* Search */}
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
            </div>

            {/* Equipment Lists */}
            <div className="space-y-4">
                {Object.entries(groupedEquipment).map(([category, items]) => {
                    const catTotal = items.reduce((acc, i) => acc + i.total_quantity, 0);
                    const catAvailable = items.reduce((acc, i) => acc + i.available, 0);
                    const catInUse = items.reduce((acc, i) => acc + i.in_use, 0);

                    let Icon = <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>;

                    return (
                        <div key={category} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            {/* Category Header */}
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-100 text-purple-600">{Icon}</div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg">{category}</h3>
                                        <p className="text-sm text-slate-500">{items.length} items</p>
                                    </div>
                                </div>
                                <div className="flex gap-3 text-sm">
                                    <div className="px-3 py-1 bg-white rounded border border-slate-200 shadow-sm">
                                        <span className="text-slate-500 mr-2">Total:</span>
                                        <span className="font-bold text-slate-800">{catTotal}</span>
                                    </div>
                                    <div className="px-3 py-1 bg-green-50 rounded border border-green-100 shadow-sm">
                                        <span className="text-green-600 mr-2">Avail:</span>
                                        <span className="font-bold text-green-700">{catAvailable}</span>
                                    </div>
                                    <div className="px-3 py-1 bg-orange-50 rounded border border-orange-100 shadow-sm">
                                        <span className="text-orange-600 mr-2">In Use:</span>
                                        <span className="font-bold text-orange-700">{catInUse}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-base">
                                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold w-[30%]">Equipment</th>
                                            <th className="px-6 py-4 font-semibold text-center w-[8%]">Total</th>
                                            <th className="px-6 py-4 font-semibold text-center w-[8%]">Available</th>
                                            <th className="px-6 py-4 font-semibold text-center w-[8%]">In Use</th>
                                            <th className="px-6 py-4 font-semibold w-[12%]">Status</th>
                                            <th className="px-6 py-4 font-semibold w-[20%]">Used By</th>
                                            <th className="px-6 py-4 font-semibold w-[14%]">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-5 font-medium text-slate-900">{item.name}</td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className="inline-block bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-sm">
                                                        {item.total_quantity}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`font-bold ${item.available > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                                                        {item.available}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`font-bold ${item.in_use > 0 ? 'text-orange-500' : 'text-slate-300'}`}>
                                                        {item.in_use}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${item.available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        <span className={`w-2.5 h-2.5 rounded-full ${item.available > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                        {item.available > 0 ? 'In Stock' : 'Out of Stock'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    {item.used_by !== '—' ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.used_by.split(',').map((eventName, eIdx) => (
                                                                <span
                                                                    key={eIdx}
                                                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap max-w-[220px] truncate"
                                                                    title={eventName.trim()}
                                                                >
                                                                    {eventName.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 font-light">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 relative">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => openEditModal(item)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-sm"
                                                            title="Edit"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleArchive(item)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-xs font-medium transition shadow-sm"
                                                            title="Archive"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                                            Archive
                                                        </button>
                                                    </div>
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
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
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
                            <button onClick={() => setShowAddModal(false)} className="text-blue-200 hover:text-white transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Equipment Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                    placeholder="e.g., Projector, Sound System..."
                                    value={newEquipment.name}
                                    onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Category <span className="text-red-500">*</span></label>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                        value={newEquipment.category}
                                        onChange={(e) => setNewEquipment({ ...newEquipment, category: e.target.value })}
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
                                        onChange={(e) => setNewEquipment({ ...newEquipment, total_quantity: parseInt(e.target.value) || 0 })}
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
                                        placeholder="e.g., Lab Equipment..."
                                        value={newEquipment.customCategory}
                                        onChange={(e) => setNewEquipment({ ...newEquipment, customCategory: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
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

            {/* Edit Equipment Modal */}
            {showEditModal && selectedEquipment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up max-h-[90vh] overflow-y-auto">
                        <div className="bg-blue-900 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/10 p-2 rounded-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Edit Equipment</h3>
                                    <p className="text-blue-200 text-xs">{selectedEquipment.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="text-blue-200 hover:text-white transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-6">
                            {/* Current Stats */}
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">Current Total:</span>
                                        <p className="font-bold text-slate-800 text-lg">{selectedEquipment.total_quantity}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Available:</span>
                                        <p className="font-bold text-green-600 text-lg">{selectedEquipment.available}</p>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">In Use:</span>
                                        <p className="font-bold text-orange-600 text-lg">{selectedEquipment.in_use}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Name & Category (Super Admin Only) */}
                            {userRole === 'Super Admin' && (
                                <div className="space-y-4">
                                    <div className="border-l-4 border-blue-900 pl-3">
                                        <h4 className="text-sm font-semibold text-slate-800">Equipment Details (Super Admin Only)</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Equipment Name</label>
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 focus:border-blue-900 text-sm"
                                                value={editForm.category}
                                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                            >
                                                {categories.map(category => (
                                                    <option key={category} value={category}>{category}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Add Quantity */}
                            <div className="space-y-4">
                                <div className="border-l-4 border-green-600 pl-3">
                                    <h4 className="text-sm font-semibold text-slate-800">Add Quantity</h4>
                                    <p className="text-xs text-slate-500">Increase stock (e.g., new purchases)</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantity to Add</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-green-600 text-sm"
                                        placeholder="0"
                                        value={editForm.addQuantity || ''}
                                        onChange={(e) => setEditForm({ ...editForm, addQuantity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                {editForm.addQuantity > 0 && (
                                    <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                                        <p className="text-xs text-green-700">
                                            New total will be: <span className="font-bold">{selectedEquipment.total_quantity + editForm.addQuantity}</span> units
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Reduce Quantity */}
                            <div className="space-y-4">
                                <div className="border-l-4 border-red-600 pl-3">
                                    <h4 className="text-sm font-semibold text-slate-800">Reduce Quantity</h4>
                                    <p className="text-xs text-slate-500">Decrease stock (requires reason)</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantity to Reduce</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={selectedEquipment.total_quantity}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 text-sm"
                                        placeholder="0"
                                        value={editForm.reduceQuantity || ''}
                                        onChange={(e) => setEditForm({ ...editForm, reduceQuantity: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                {editForm.reduceQuantity > 0 && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-1">Reason <span className="text-red-500">*</span></label>
                                            <select
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 text-sm"
                                                value={editForm.reduceReason}
                                                onChange={(e) => setEditForm({ ...editForm, reduceReason: e.target.value })}
                                            >
                                                <option value="">Select reason...</option>
                                                <option value="Broken">Broken</option>
                                                <option value="Lost">Lost</option>
                                                <option value="Damaged">Damaged</option>
                                                <option value="Donated">Donated</option>
                                                <option value="Disposed">Disposed</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        {editForm.reduceReason === 'Other' && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-1">Specify Reason</label>
                                                <textarea
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-red-600 text-sm"
                                                    rows="2"
                                                    placeholder="Please specify..."
                                                    value={editForm.reduceReason === 'Other' ? editForm.reduceReason : ''}
                                                    onChange={(e) => setEditForm({ ...editForm, reduceReason: e.target.value })}
                                                ></textarea>
                                            </div>
                                        )}
                                        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                                            <p className="text-xs text-red-700">
                                                New total will be: <span className="font-bold">{selectedEquipment.total_quantity - editForm.reduceQuantity}</span> units
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition flex items-center justify-center gap-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
