// DepartmentFeedback Component - View for Department Heads to see event feedback
const { useState, useEffect, useMemo } = React;

// Simple Stat Card Component for the Scorecard
const FeedbackStatCard = ({ title, value, subtext, color, icon }) => (
    <div className="bg-white rounded-lg border border-slate-200 p-6 flex items-center justify-between shadow-sm">
        <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${color}`}>{value}</span>
                <span className="text-xs text-slate-400">/ 5.0</span>
            </div>
            {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color.replace('text-', 'bg-').replace('600', '100')}`}>
            {icon}
        </div>
    </div>
);

// Detail Modal Component
const FeedbackDetailModal = ({ feedback, onClose }) => {
    if (!feedback) return null;

    const categories = [
        {
            title: "LOGISTICS",
            items: [
                { label: "Registration", value: feedback.registration_process, labelCode: "Reg" },
                { label: "Organization", value: feedback.organization_rating, labelCode: "Org" }
            ]
        },
        {
            title: "CONTENT",
            items: [
                { label: "Speakers", value: feedback.speaker_effectiveness, labelCode: "Spk" },
                { label: "Topics", value: feedback.content_relevance, labelCode: "Top" }
            ]
        },
        {
            title: "FACILITIES",
            items: [
                { label: "Venue", value: feedback.venue_rating, labelCode: "Ven" },
                { label: "Activities", value: feedback.activities_rating, labelCode: "Act" }
            ]
        }
    ];

    const getScoreColor = (score) => {
        if (!score) return 'text-slate-400 bg-slate-50 border-slate-100';
        if (score >= 4.5) return 'text-emerald-700 bg-emerald-50 border-emerald-100';
        if (score >= 4.0) return 'text-blue-700 bg-blue-50 border-blue-100';
        if (score >= 3.0) return 'text-amber-700 bg-amber-50 border-amber-100';
        return 'text-red-700 bg-red-50 border-red-100';
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-900 p-6 flex justify-between items-start shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">{feedback.event_name}</h3>
                        <p className="text-blue-200 text-sm">Ended: {feedback.end_datetime ? new Date(feedback.end_datetime).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* Overall Score */}
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg border border-slate-100">
                        <div className="flex-1">
                            <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Overall Rating (Avg)</h4>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-slate-800">{feedback.overall_rating}</span>
                                <span className="text-slate-400">/ 5.0</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{feedback.response_count} responses</p>
                        </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="grid grid-cols-3 gap-4">
                        {categories.map((cat, idx) => (
                            <div key={idx} className="space-y-3">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">{cat.title}</h4>
                                <div className="space-y-2">
                                    {cat.items.map((item, i) => (
                                        <div key={i} className={`flex flex-col p-2 rounded border ${getScoreColor(item.value)}`}>
                                            <span className="text-[10px] uppercase font-bold opacity-70 mb-0.5">{item.label}</span>
                                            <span className="text-lg font-bold">{item.value || '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Comments List */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Comments</h4>
                        {feedback.comments && feedback.comments.length > 0 ? (
                            <div className="space-y-3">
                                {feedback.comments.map((comment, idx) => (
                                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                                        <div className="flex justify-between items-center mb-2">
                                            <div>
                                                {comment.rating && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded font-medium">Rated: {comment.rating}/5</span>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-400">{comment.date}</span>
                                        </div>
                                        <p className="text-slate-600 italic text-sm">"{comment.text}"</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 italic text-sm">No written comments provided.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

window.DepartmentFeedback = function DepartmentFeedback() {
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterEvent, setFilterEvent] = useState('All');
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchFeedback();
    }, []);

    const fetchFeedback = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/feedback/department', {
                credentials: 'include'
            });
            const data = await response.json();
            if (data.success) {
                setFeedback(data.feedback);
            } else {
                console.error('Failed to load feedback:', data.error);
            }
        } catch (error) {
            console.error('Error fetching feedback:', error);
        } finally {
            setLoading(false);
        }
    };

    // Extract unique events for filter
    const uniqueEvents = [...new Set(feedback.map(f => f.event_name))];

    // Filter feedback
    const filteredFeedback = useMemo(() => {
        return feedback.filter(f => {
            const matchesEvent = filterEvent === 'All' || f.event_name === filterEvent;
            // Search matches event name or any comment text
            const matchesSearch = f.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (f.comments || []).some(c => c.text.toLowerCase().includes(searchTerm.toLowerCase()));
            return matchesEvent && matchesSearch;
        });
    }, [feedback, filterEvent, searchTerm]);

    // Aggregate Metrics (Now simpler as data is pre-aggregated per event)
    const metrics = useMemo(() => {
        if (filteredFeedback.length === 0) return null;

        // Start with totals (weighted by response count)
        let totalResponses = 0;
        let sumOverall = 0;
        let sumVenue = 0;
        let sumActivity = 0;
        let sumOrg = 0;

        filteredFeedback.forEach(f => {
            const count = f.response_count || 0;
            totalResponses += count;
            sumOverall += (f.overall_rating || 0) * count;
            sumVenue += (f.venue_rating || 0) * count;
            sumActivity += (f.activities_rating || 0) * count;
            sumOrg += (f.organization_rating || 0) * count;
        });

        if (totalResponses === 0) return null;

        return {
            overall: (sumOverall / totalResponses).toFixed(1),
            venue: (sumVenue / totalResponses).toFixed(1),
            activities: (sumActivity / totalResponses).toFixed(1),
            organization: (sumOrg / totalResponses).toFixed(1),
            count: totalResponses
        };
    }, [filteredFeedback]);

    const getRatingColor = (rating) => {
        if (rating >= 4.5) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (rating >= 4.0) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (rating >= 3.0) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div></div>

                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <select
                        value={filterEvent}
                        onChange={(e) => setFilterEvent(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                        <option value="All">All Events</option>
                        {uniqueEvents.map((event, idx) => (
                            <option key={idx} value={event}>{event}</option>
                        ))}
                    </select>

                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search events or comments..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none w-full md:w-64"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Scorecard Section */}
            {metrics && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FeedbackStatCard
                        title="Overall Rating"
                        value={metrics.overall}
                        subtext={`Based on ${metrics.count} responses`}
                        color="text-emerald-600"
                        icon={<svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>}
                    />
                    <FeedbackStatCard
                        title="Venue Quality"
                        value={metrics.venue}
                        color="text-blue-600"
                        icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
                    />
                    <FeedbackStatCard
                        title="Activities"
                        value={metrics.activities}
                        color="text-purple-600"
                        icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                    />
                    <FeedbackStatCard
                        title="Organization"
                        value={metrics.organization}
                        color="text-amber-600"
                        icon={<svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
                    />
                </div>
            )}

            {/* Drilldown Table Section */}
            <div className="bg-white rounded-lg border border-slate-200">
                {filteredFeedback.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Event Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Responses</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg Rating</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredFeedback.map((item, idx) => (
                                    <tr key={idx}
                                        onClick={() => setSelectedFeedback(item)}
                                        className="hover:bg-blue-50 transition cursor-pointer group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.event_name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.response_count}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRatingColor(item.overall_rating)}`}>
                                                {item.overall_rating}/5
                                                <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <span className="text-indigo-600 font-medium text-xs group-hover:underline">View Comments &rarr;</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <p className="mt-2 text-lg font-medium">No feedback matching your filters</p>
                        <p className="text-sm">Try adjusting the event filter or search term.</p>
                    </div>
                )}
            </div>
            {/* Modal */}
            {
                selectedFeedback && (
                    <FeedbackDetailModal
                        feedback={selectedFeedback}
                        onClose={() => setSelectedFeedback(null)}
                    />
                )
            }
        </div >
    );
};

window.DepartmentFeedback = DepartmentFeedback;
