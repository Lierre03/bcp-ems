const { useState, useEffect } = React;

window.InventoryView = function InventoryView() {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [tagModalOpen, setTagModalOpen] = useState(false);
    const [eventName, setEventName] = useState('');
    const [tagging, setTagging] = useState(false);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const response = await fetch('/api/inventory', { credentials: 'include' });
            const data = await response.json();
            if (data.success) {
                setInventory(data.data);
            }
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTagAsset = async (e) => {
        e.preventDefault();
        if (!selectedAsset || !eventName) return;

        setTagging(true);
        try {
            const response = await fetch('/api/inventory/tag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    asset_id: selectedAsset.asset_id,
                    event_name: eventName
                }),
                credentials: 'include'
            });

            const res = await response.json();

            if (response.ok) {
                alert('Asset tagged successfully!');
                setTagModalOpen(false);
                setEventName('');
                fetchInventory(); // Refresh list to show 'In-Use'
            } else {
                alert('Error: ' + res.message);
            }
        } catch (error) {
            console.error('Tag error:', error);
            alert('Failed to tag asset');
        } finally {
            setTagging(false);
        }
    };

    const filteredInventory = inventory.filter(item =>
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.property_tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Inventory...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-gray-800">Live Asset Inventory</h2>
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">Synced with Property Custodian</span>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search assets..."
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                            <th className="p-4 border-b">Asset Tag</th>
                            <th className="p-4 border-b">Item Name</th>
                            <th className="p-4 border-b">Category</th>
                            <th className="p-4 border-b">Status</th>
                            <th className="p-4 border-b">Current Location / User</th>
                            <th className="p-4 border-b text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredInventory.map(item => (
                            <tr key={item.asset_id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-mono text-xs text-blue-600 font-medium">{item.property_tag}</td>
                                <td className="p-4 font-medium text-gray-900">{item.item_name}</td>
                                <td className="p-4 text-gray-500 text-sm">{item.category}</td>
                                <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.status === 'In-Storage' || item.status === 'Available' ? 'bg-green-100 text-green-800' :
                                            item.status === 'In-Use' ? 'bg-orange-100 text-orange-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-gray-600">
                                    {item.current_user_name ? (
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                {item.current_user_name.charAt(0)}
                                            </span>
                                            <span>{item.current_user_name}</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Unassigned</span>
                                    )}
                                    {item.last_remarks && (
                                        <div className="text-xs text-gray-400 mt-1 truncate max-w-[200px]" title={item.last_remarks}>
                                            {item.last_remarks}
                                        </div>
                                    )}
                                </td>
                                <td className="p-4 text-right">
                                    {item.status === 'In-Storage' && item.type === 'asset' && (
                                        <button
                                            onClick={() => { setSelectedAsset(item); setTagModalOpen(true); }}
                                            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline"
                                        >
                                            Reserve / Tag
                                        </button>
                                    )}
                                    {item.type === 'consumable' && (
                                        <span className="text-xs text-gray-400 italic cursor-help" title="Bulk items cannot be individually tagged">
                                            Bulk Item
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {filteredInventory.length === 0 && (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500">No assets found matching your search.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Tag Modal */}
            {tagModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Tag Asset for Event</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            You are about to mark <strong>{selectedAsset?.item_name} ({selectedAsset?.property_tag})</strong> as In-Use.
                            This will prevent other events from booking it.
                        </p>

                        <form onSubmit={handleTagAsset}>
                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Event Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    placeholder="e.g. Science Fair 2025"
                                    value={eventName}
                                    onChange={e => setEventName(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTagModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={tagging}
                                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                                >
                                    {tagging && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                                    Confirm Tagging
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
