// AITrainingManager - AI Training and Management Component (REBUILT)
const { useState, useEffect, useCallback } = React;

window.AITrainingManager = function AITrainingManager() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [trainingData, setTrainingData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTraining, setIsTraining] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summaryRes, dataRes] = await Promise.all([
        fetch('/api/ml/training-summary', { credentials: 'include' }),
        fetch('/api/ml/training-data', { credentials: 'include' })
      ]);

      if (summaryRes.ok) {
        const result = await summaryRes.json();
        setSummary(result.summary);
      }

      if (dataRes.ok) {
        const result = await dataRes.json();
        setTrainingData(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch AI training data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrainModel = async () => {
    if (!confirm('Are you sure you want to start a new training session? This may take a few moments.')) {
      return;
    }
    setIsTraining(true);
    try {
      const response = await fetch('/api/ml/train-budget-model', { 
        method: 'POST',
        credentials: 'include' 
      });
      const result = await response.json();
      if (response.ok) {
        alert(`Training successful! New model version: ${result.version} with accuracy: ${(result.r2_score * 100).toFixed(2)}%`);
        fetchData(); // Refresh all data
      } else {
        throw new Error(result.error || 'Unknown training error');
      }
    } catch (error) {
      alert(`Training failed: ${error.message}`);
    } finally {
      setIsTraining(false);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'manage_data', label: 'Manage Data' },
    { id: 'history', label: 'Training History' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">AI Training Manager</h2>
          <p className="text-sm text-gray-500">Monitor, manage, and improve your AI models.</p>
        </div>
        <button
          onClick={handleTrainModel}
          disabled={isTraining || isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isTraining ? (
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 011.087.857l.002.002.001.002.002.001.003.002.005.003.001.001a1 1 0 001.965-.372L8 2.503l5.002 2.144a1 1 0 00.965-.372l.001-.001.005-.003.003-.002.002-.001.001-.002.002-.002.087-.857A.999.999 0 0114.75 8.05l2.858-1.224a1 1 0 000-1.84l-7-3zM5 10v6a2 2 0 002 2h6a2 2 0 002-2v-6a2 2 0 00-2-2H7a2 2 0 00-2 2z" /></svg>
          )}
          {isTraining ? 'Training in Progress...' : 'Train Budget Model'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {summary ? (
          <>
            <StatCard title="Total Records" value={summary.total_records} />
            <StatCard title="Validated Records" value={summary.validated_records} />
            <StatCard title="Active Model" value={summary.active_model_version} />
            <StatCard title="Model Accuracy" value={summary.model_accuracy} />
          </>
        ) : (
          Array.from({ length: 4 }).map((_, i) => <StatCard key={i} title="Loading..." value="-" isLoading />)
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && <DashboardView summary={summary} isLoading={isLoading} />}
          {activeTab === 'manage_data' && <ManageDataView trainingData={trainingData} isLoading={isLoading} onAddData={() => setShowAddModal(true)} />}
          {activeTab === 'history' && <TrainingHistoryView />}
        </div>
      </div>

      {showAddModal && <AddDataModal onClose={() => setShowAddModal(false)} onDataAdded={fetchData} />}
    </div>
  );
}

// --- Sub-components for clarity ---

const StatCard = ({ title, value, isLoading }) => (
  <div className={`bg-white border border-gray-200 rounded-lg p-4 ${isLoading ? 'animate-pulse' : ''}`}>
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className={`text-2xl font-bold text-gray-800 mt-1 ${isLoading ? 'bg-gray-200 rounded w-3/4' : ''}`}>
      {isLoading ? '\u00A0' : value}
    </p>
  </div>
);

const DashboardView = ({ summary, isLoading }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900">AI Model Dashboard</h3>
    <p className="text-sm text-gray-600">An overview of your AI's current performance and status.</p>
    {/* Add charts or more detailed stats here in the future */}
  </div>
);

const ManageDataView = ({ trainingData, isLoading, onAddData }) => (
  <div>
    <div className="flex justify-between items-center mb-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Manage Training Data</h3>
        <p className="text-sm text-gray-600">Review, add, or validate the data used to train your models.</p>
      </div>
      <button onClick={onAddData} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-sm">
        + Add New Data
      </button>
    </div>
    <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Event Name</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Type</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Attendees</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Duration (Hrs)</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Budget</th>
            <th className="px-4 py-2 text-left font-semibold text-gray-600">Validated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="animate-pulse">
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-1/4"></div></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-1/4"></div></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-1/2"></div></td>
                <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-3/4"></div></td>
              </tr>
            ))
          ) : (
            trainingData.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-3 font-medium text-gray-800">{item.event_name}</td>
                <td className="px-4 py-3 text-gray-600">{item.event_type}</td>
                <td className="px-4 py-3 text-gray-600">{item.expected_attendees}</td>
                <td className="px-4 py-3 text-gray-600">{item.duration_hours}</td>
                <td className="px-4 py-3 text-gray-600">${item.total_budget.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.is_validated ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {item.is_validated ? 'Validated' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const TrainingHistoryView = () => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900">Training History</h3>
    <p className="text-sm text-gray-600">A log of all past model training sessions.</p>
    {/* History table will be implemented here */}
    <div className="mt-4 text-center text-gray-500 border-2 border-dashed border-gray-300 rounded-lg p-12">
      Training history will be displayed here in a future update.
    </div>
  </div>
);

const AddDataModal = ({ onClose, onDataAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'Academic',
    date: '',
    endDate: '',
    startTime: '09:00',
    endTime: '17:00',
    venue: 'Auditorium',
    organizer: '',
    description: '',
    attendees: '',
    budget: '',
    equipment: [],
    activities: [],
    catering: [],
    additionalResources: [],
    is_validated: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleMultiSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ml/training-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Submission failed');
      alert('Successfully added new training data!');
      onDataAdded();
      onClose();
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col flex-grow">
          <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <h3 className="text-lg font-semibold text-gray-900">Add New Training Data</h3>
          </div>
          
          <div className="p-6 space-y-4 overflow-y-auto flex-grow">
            {/* --- Core Details --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField name="name" label="Event Name" value={formData.name} onChange={handleInputChange} required />
              <SelectField name="type" label="Event Type" value={formData.type} onChange={handleInputChange} options={['Academic', 'Sports', 'Cultural', 'Workshop', 'Other']} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <InputField name="date" label="Start Date" type="date" value={formData.date} onChange={handleInputChange} required />
              <InputField name="endDate" label="End Date" type="date" value={formData.endDate} onChange={handleInputChange} required />
              <InputField name="startTime" label="Start Time" type="time" value={formData.startTime} onChange={handleInputChange} required />
              <InputField name="endTime" label="End Time" type="time" value={formData.endTime} onChange={handleInputChange} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField name="venue" label="Venue" value={formData.venue} onChange={handleInputChange} />
                <InputField name="organizer" label="Organizer" value={formData.organizer} onChange={handleInputChange} />
            </div>
            <InputField name="description" label="Description" type="textarea" value={formData.description} onChange={handleInputChange} />
            
            {/* --- Logistics --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField name="attendees" label="Expected Attendees" type="number" value={formData.attendees} onChange={handleInputChange} required />
              <InputField name="budget" label="Total Actual Budget" type="number" value={formData.budget} onChange={handleInputChange} required />
            </div>

            {/* --- Equipment with Quantities --- */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Used</label>
              {formData.equipment.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Equipment name"
                    value={item.name}
                    onChange={(e) => {
                      const newEquipment = [...formData.equipment];
                      newEquipment[index].name = e.target.value;
                      handleMultiSelectChange('equipment', newEquipment);
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => {
                      const newEquipment = [...formData.equipment];
                      newEquipment[index].quantity = parseInt(e.target.value) || 1;
                      handleMultiSelectChange('equipment', newEquipment);
                    }}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newEquipment = formData.equipment.filter((_, i) => i !== index);
                      handleMultiSelectChange('equipment', newEquipment);
                    }}
                    className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const newEquipment = [...formData.equipment, { name: '', quantity: 1 }];
                  handleMultiSelectChange('equipment', newEquipment);
                }}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
              >
                + Add Equipment
              </button>
            </div>
            <InputField name="activities" label="Activities" type="textarea" value={formData.activities.join(', ')} onChange={(e) => handleMultiSelectChange('activities', e.target.value.split(',').map(s => s.trim()))} />
            <InputField name="catering" label="Catering" type="textarea" value={formData.catering.join(', ')} onChange={(e) => handleMultiSelectChange('catering', e.target.value.split(',').map(s => s.trim()))} />
            <InputField name="additionalResources" label="Additional Resources" type="textarea" value={formData.additionalResources.join(', ')} onChange={(e) => handleMultiSelectChange('additionalResources', e.target.value.split(',').map(s => s.trim()))} />

            <div className="flex items-center pt-2">
              <input type="checkbox" id="is_validated" name="is_validated" checked={formData.is_validated} onChange={handleInputChange} className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
              <label htmlFor="is_validated" className="ml-2 block text-sm text-gray-900">Mark as validated (Ready for training)</label>
            </div>
          </div>

          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {isSubmitting ? 'Submitting...' : 'Submit Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const InputField = ({ name, label, ...props }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
    <input id={name} name={name} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
  </div>
);

const SelectField = ({ name, label, options, ...props }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">{label}</label>
    <select id={name} name={name} {...props} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);
