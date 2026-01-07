// UserManagement - Super Admin only user management
const { useState, useEffect } = React;

window.UserManagement = function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'Participant',
    department: '',
    password: ''
  });

  const roles = ['Super Admin', 'Admin', 'Staff', 'Student Organization Officer', 'Participant'];

  // Helper to handle success
  const handleSuccess = (message) => {
    setSuccessMessage(message);
    setShowSuccessModal(true);
    loadUsers();
  };
  useEffect(() => {
    loadUsers();
  }, []);

  // Auto-clear department when Super Admin or Staff is selected
  useEffect(() => {
    if (formData.role === 'Super Admin' || formData.role === 'Staff') {
      setFormData(prev => ({ ...prev, department: '' }));
    }
  }, [formData.role]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      full_name: '',
      email: '',
      role: 'Participant',
      department: '',
      password: ''
    });
    setShowModal(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      email: user.email || '',
      role: user.role_name,
      department: user.department || '',
      password: ''
    });
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    if (!formData.username || !formData.full_name || !formData.role) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate department for Admin role
    if (formData.role === 'Admin' && !formData.department) {
      alert('Please select a department for Admin users');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('Password is required for new users');
      return;
    }

    setLoading(true);
    try {
      const endpoint = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (data.success) {
        let msg = editingUser ? 'User updated successfully' : 'User created successfully';
        if (data.email_sent) {
          msg += '. Notification email sent.';
        }
        handleSuccess(msg);
        setShowModal(false);
      } else {
        alert(data.message || 'Failed to save user');
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Error saving user');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    if (!confirm(`Are you sure you want to ${currentStatus === 'active' ? 'deactivate' : 'activate'} this user?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/toggle-status`, {
        method: 'POST',
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        handleSuccess(data.message || 'Status updated successfully');
      } else {
        alert(data.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Toggle status failed:', err);
    }
  };

  const handleResetPassword = async (userId) => {
    const newPassword = prompt('Enter new password:');
    if (!newPassword) return;

    try {
      const res = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPassword })
      });
      const data = await res.json();
      if (data.success) {
        handleSuccess('Password reset successfully');
      } else {
        alert(data.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Reset password failed:', err);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE user "${user.username}"? This action cannot be undone.\n\nNote: Users with dependent events cannot be deleted.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await res.json();

      if (data.success) {
        handleSuccess('User deleted successfully');
      } else {
        alert(data.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Error deleting user');
    }
  };


  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRole = filterRole === 'all' || user.role_name === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-3">
      {/* Search, Filter, and Add User */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
          <option value="all">All Roles</option>
          {roles.map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <button
          onClick={handleCreateUser}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold flex items-center gap-2 whitespace-nowrap"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-600 font-semibold text-sm">{user.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{user.full_name}</div>
                      <div className="text-xs text-slate-500">@{user.username}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-slate-600">{user.email || 'N/A'}</td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${user.role_name === 'Super Admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                    user.role_name === 'Admin' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      user.role_name === 'Staff' ? 'bg-green-50 text-green-700 border border-green-200' :
                        'bg-slate-50 text-slate-700 border border-slate-200'
                    }`}>
                    {user.role_name}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  {user.department ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                      {user.department}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${user.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-red-50 text-red-700 border border-red-200'
                    }`}>
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleResetPassword(user.id)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Reset Password"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(user.id, user.status)}
                      className={`p-1.5 rounded-lg transition-colors ${user.status === 'active'
                        ? 'text-orange-600 hover:bg-orange-50'
                        : 'text-green-600 hover:bg-green-50'
                        }`}
                      title={user.status === 'active' ? 'Deactivate' : 'Activate'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {user.status === 'active' ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete User"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            No users found
          </div>
        )}
      </div>

      {/* User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="bg-slate-700 px-6 py-4 rounded-t-lg flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">{editingUser ? 'Edit User' : 'Create New User'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-300 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editingUser}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Department {formData.role === 'Admin' ? '*' : ''}
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  disabled={formData.role === 'Super Admin' || formData.role === 'Staff'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="">{formData.role === 'Super Admin' ? 'All Departments (Unrestricted)' : formData.role === 'Staff' ? 'All Departments (Equipment/Venue Manager)' : 'Select Department'}</option>
                  <optgroup label="Information Technology & Engineering">
                    <option value="BSIT">BS Information Technology (BSIT)</option>
                    <option value="BSCpE">BS Computer Engineering (BSCpE)</option>
                    <option value="BSIS">BS Information Systems (BSIS)</option>
                  </optgroup>
                  <optgroup label="Business & Management">
                    <option value="BSBA">BS Business Administration (BSBA)</option>
                    <option value="BSOA">BS Office Administration (BSOA)</option>
                    <option value="BSHRM">BS Hotel & Restaurant Mgt (BSHRM)</option>
                    <option value="BSTM">BS Tourism Management (BSTM)</option>
                    <option value="BSAct">BS Accounting Technology (BSAct)</option>
                  </optgroup>
                  <optgroup label="Education & Arts">
                    <option value="BEEd">BS Elementary Education (BEEd)</option>
                    <option value="BSEd">BS Secondary Education (BSEd)</option>
                    <option value="BTTE">BS Technical Teacher Educ (BTTE)</option>
                    <option value="BLIS">Bachelor of Library & Info Sci (BLIS)</option>
                    <option value="BSPsych">BS Psychology (BSPsych)</option>
                    <option value="BSCrim">BS Criminology (BSCrim)</option>
                  </optgroup>
                  <option value="General">General/Cross-Department</option>
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {formData.role === 'Super Admin' && 'Super Admin has unrestricted access to all departments'}
                  {formData.role === 'Admin' && 'Admin will only see events from their assigned department'}
                  {formData.role === 'Staff' && 'Staff manages equipment/venues for ALL events (no department restriction)'}
                  {formData.role === 'Student Organization Officer' && 'Student org leaders can create and manage events for their organizations'}
                  {formData.role === 'Participant' && 'Participants can view, register, and attend events'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Password {!editingUser && '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 rounded-b-lg flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-semibold transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold transition disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full transform transition-all scale-100 overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Success!</h3>
              <p className="text-slate-600 mb-8">{successMessage}</p>
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2.5 bg-blue-600 text-base font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                onClick={() => setShowSuccessModal(false)}
              >
                Okay, got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
