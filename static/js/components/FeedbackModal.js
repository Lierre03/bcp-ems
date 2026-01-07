// Feedback Modal Component - Automatically shown for completed events
window.FeedbackModal = function FeedbackModal({ event, onSubmit, onClose }) {
  const [ratings, setRatings] = React.useState({
    overall: 0,
    venue: 0,
    activities: 0,
    organization: 0
  });
  const [comments, setComments] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [hoveredRating, setHoveredRating] = React.useState({ category: null, value: 0 });

  const handleRatingChange = (category, value) => {
    setRatings(prev => ({ ...prev, [category]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (ratings.overall === 0) {
      alert('Please provide an overall rating');
      return;
    }

    setLoading(true);

    try {
      const feedbackData = {
        overall_rating: ratings.overall,
        venue_rating: ratings.venue || null,
        activities_rating: ratings.activities || null,
        organization_rating: ratings.organization || null,
        comments: comments.trim() || null
      };

      const response = await fetch(`/api/feedback/submit/${event.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(feedbackData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Thank you for your feedback!');
        onSubmit(event.id);
      } else {
        alert(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Feedback submission error:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRatingLabel = (rating) => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select a rating';
    }
  };

  const renderStars = (category, currentRating, helperText) => {
    const displayRating = (hoveredRating.category === category && hoveredRating.value > 0)
      ? hoveredRating.value
      : currentRating;

    return (
      <div className="flex flex-col gap-1">
        <p className="text-xs text-gray-500 italic mb-1">{helperText}</p>
        <div className="flex items-center gap-3">
          <div className="flex gap-1" onMouseLeave={() => setHoveredRating({ category: null, value: 0 })}>
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingChange(category, star)}
                onMouseEnter={() => setHoveredRating({ category, value: star })}
                className={`text-3xl transition-transform hover:scale-110 focus:outline-none ${(hoveredRating.category === category ? star <= hoveredRating.value : star <= currentRating)
                    ? 'text-yellow-400'
                    : 'text-gray-200'
                  }`}
              >
                ★
              </button>
            ))}
          </div>
          <span className={`text-sm font-medium px-2 py-1 rounded ${displayRating > 0 ? 'bg-blue-50 text-blue-700' : 'text-gray-400'
            }`}>
            {getRatingLabel(displayRating)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 px-6 py-5 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white">Share Your Experience</h2>
            <p className="text-blue-200 text-sm mt-1">Your feedback directly improves upcoming events</p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white text-2xl leading-none opacity-70 hover:opacity-100 transition"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Event Info Card */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 border border-slate-100 rounded-lg mb-8">
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">{event.name}</h3>
              <p className="text-slate-600 text-sm mt-0.5">
                {new Date(event.start_datetime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-slate-500 text-sm">{event.venue}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Overall Rating - Required */}
            <div className="pb-6 border-b border-gray-100">
              <label className="block text-base font-semibold text-gray-800 mb-2">
                Overall Experience <span className="text-red-500">*</span>
              </label>
              {renderStars('overall', ratings.overall, "Taking everything into account, how would you rate this event?")}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              {/* Venue Rating */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Venue Quality
                </label>
                {renderStars('venue', ratings.venue, "Was the location comfortable, accessible, and well-equipped?")}
              </div>

              {/* Activities Rating */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Activities & Content
                </label>
                {renderStars('activities', ratings.activities, "Were the sessions engaging, relevant, and well-executed?")}
              </div>

              {/* Organization Rating */}
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Organization & Management
                </label>
                {renderStars('organization', ratings.organization, "Was the event on time, well-communicated, and supported by helpful staff?")}
              </div>
            </div>

            {/* Comments */}
            <div className="pt-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Additional Comments
              </label>
              <p className="text-xs text-gray-500 mb-2">Please share any specific suggestions or highlights.</p>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="e.g., The keynote speaker was inspiring, but the sound system could be improved..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-y min-h-[100px]"
                rows="3"
                maxLength="500"
              />
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${comments.length > 450 ? 'text-orange-500 font-medium' : 'text-gray-400'}`}>
                  {comments.length}/500
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
              >
                Maybe Later
              </button>
              <button
                type="submit"
                disabled={loading || ratings.overall === 0}
                className="px-8 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Sending...</span>
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
