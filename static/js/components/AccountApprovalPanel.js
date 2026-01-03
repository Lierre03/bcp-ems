// AccountApprovalPanel - Manage pending student registrations
const { useState, useEffect } = React;

window.AccountApprovalPanel = function AccountApprovalPanel() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

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

  const handleApprove = async (userId, userName) => {
    if (!confirm(`Approve registration for ${userName}?`)) return;
    
    try {
      setProcessing(userId);
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ ${userName} approved! Email notification sent.`);
        fetchPendingUsers(); // Refresh list
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error approving user:', error);
      alert('❌ Failed to approve user');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (userId, userName) => {
    if (!confirm(`Reject registration for ${userName}? This cannot be undone.`)) return;
    
    try {
      setProcessing(userId);
      const res = await fetch(`/api/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert(`❌ ${userName} rejected.`);
        fetchPendingUsers(); // Refresh list
      } else {
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('❌ Failed to reject user');
    } finally {
      setProcessing(null);
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
                          onClick={() => handleApprove(user.id, user.full_name)}
                          disabled={processing === user.id}
                          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {processing === user.id ? (
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
                          onClick={() => handleReject(user.id, user.full_name)}
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
    </div>
  );
};
