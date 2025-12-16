// StatusBadge Component - Reusable status display with color coding
window.StatusBadge = function StatusBadge({ status }) {
  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'Under Review': 'bg-blue-100 text-blue-700 border-blue-300',
    'Approved': 'bg-green-100 text-green-700 border-green-300',
    'Ongoing': 'bg-purple-100 text-purple-700 border-purple-300',
    'Completed': 'bg-teal-100 text-teal-700 border-teal-300',
    'Archived': 'bg-slate-100 text-slate-700 border-slate-300'
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
