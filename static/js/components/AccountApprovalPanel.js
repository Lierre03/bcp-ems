// AccountApprovalPanel - Manage pending student registrations
const { useState, useEffect } = React;

window.AccountApprovalPanel = function AccountApprovalPanel() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState('success'); // 'success' or 'error'
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' or 'reject'

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/users/pending');
      const data = await res.json();

      if (data.success) {
        setPendingUsers(data.users);
      } else {
        console.error('Failed to fetch pending users:', data.message);
      }
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiateAction = (user, type) => {
    setSelectedUser(user);
    setActionType(type);
    setShowConfirmModal(true);
  };

  const executeAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      setProcessing(selectedUser.id);
      setShowConfirmModal(false); // Close confirm modal immediately

      const res = await fetch(`/api/users/${selectedUser.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionType })
      });

      const data = await res.json();

      if (data.success) {
        setStatusMessage(actionType === 'approve'
          ? `✅ ${selectedUser.full_name} has been approved! Email notification sent.`
          : `❌ ${selectedUser.full_name} has been rejected.`);
        setStatusType('success');
        setShowStatusModal(true);
        fetchPendingUsers(); // Refresh list
      } else {
        setStatusMessage(`Error: ${data.message}`);
        setStatusType('error');
        setShowStatusModal(true);
      }
    } catch (error) {
      console.error(`Error ${actionType}ing user:`, error);
      setStatusMessage(`Failed to ${actionType} user. Please try again.`);
      setStatusType('error');
      setShowStatusModal(true);
    } finally {
      setProcessing(null);
      setSelectedUser(null);
      setActionType(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-3"></div>
          <p className="text-slate-600">Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          📋 Account Approvals
        </h2>
        <p className="text-slate-600">
          Review and approve student registration requests
        </p>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">
            All Caught Up!
          </h3>
          <p className="text-slate-600">
            No pending account approvals at the moment.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Registration Date
                  </th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">
                          {user.full_name}
                        </div>
                        <div className="text-sm text-slate-500">
                          @{user.username}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {user.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                        {user.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => initiateAction(user, 'approve')}
                          disabled={processing === user.id}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {processing === user.id && actionType === 'approve' ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing...
                            </span>
                          ) : (
                            '✓ Approve'
                          )}
                        </button>
                        <button
                          onClick={() => initiateAction(user, 'reject')}
                          disabled={processing === user.id}
                          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">
                {pendingUsers.length} pending {pendingUsers.length === 1 ? 'request' : 'requests'}
              </span>
              <button
                onClick={fetchPendingUsers}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                🔄 Refresh
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal */}
      {showConfirmModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className={`p-6 border-b ${actionType === 'approve' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
              <h3 className={`text-lg font-bold ${actionType === 'approve' ? 'text-green-800' : 'text-red-800'}`}>
                {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </h3>
              <p className={`text-sm mt-1 ${actionType === 'approve' ? 'text-green-600' : 'text-red-600'}`}>
                {actionType === 'approve'
                  ? `Are you sure you want to approve ${selectedUser.full_name}?`
                  : `Are you sure you want to reject ${selectedUser.full_name}? This cannot be undone.`}
              </p>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600">
                  {selectedUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{selectedUser.full_name}</p>
                  <p className="text-sm text-slate-500">@{selectedUser.username}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 border border-slate-200">
                <p><span className="font-medium">Department:</span> {selectedUser.department}</p>
                <p><span className="font-medium">Email:</span> {selectedUser.email}</p>
                <p><span className="font-medium">Registered:</span> {new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setSelectedUser(null);
                  setActionType(null);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                className={`px-4 py-2 text-white rounded-lg font-medium transition shadow-sm ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
              >
                {actionType === 'approve' ? 'Confirm Approval' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal (Success/Error) */}
      {showStatusModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in text-center">
            <div className="p-8">
              <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-6 ${statusType === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                {statusType === 'success' ? (
                  <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {statusType === 'success' ? 'Success!' : 'Error'}
              </h3>
              <p className="text-gray-600">{statusMessage}</p>
            </div>
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowStatusModal(false)}
                className={`w-full px-4 py-2 text-white rounded-lg font-medium transition shadow-sm ${statusType === 'success' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
