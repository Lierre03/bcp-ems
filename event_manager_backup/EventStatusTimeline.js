// EventStatusTimeline Component - Reusable status history display
const { useState, useEffect } = React;

window.EventStatusTimeline = function EventStatusTimeline({ eventId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (eventId) loadHistory();
  }, [eventId]);
  
  const loadHistory = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/history`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setHistory(data.history || []);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return React.createElement('div', { className: 'text-sm text-gray-500' }, 'Loading history...');
  if (!history.length) return React.createElement('div', { className: 'text-sm text-gray-500' }, 'No history yet');
  
  return React.createElement('div', { className: 'space-y-2' },
    history.map((h, i) =>
      React.createElement('div', { key: h.id || i, className: 'flex items-start gap-3 text-sm' },
        React.createElement('div', { className: 'w-2 h-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0' }),
        React.createElement('div', null,
          React.createElement('div', { className: 'flex gap-2 items-center' },
            React.createElement(window.StatusBadge, { status: h.old_status || 'New' }),
            React.createElement('span', { className: 'text-gray-400' }, '→'),
            React.createElement(window.StatusBadge, { status: h.new_status })
          ),
          React.createElement('div', { className: 'text-gray-500 text-xs mt-1' },
            `${h.changed_by_name} • ${new Date(h.changed_at).toLocaleString()}`
          ),
          h.reason && React.createElement('div', { className: 'text-gray-600 text-xs italic mt-1' }, `"${h.reason}"`)
        )
      )
    )
  );
}
