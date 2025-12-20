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

  const renderStars = (category, currentRating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => handleRatingChange(category, star)}
            className={`text-2xl transition ${currentRating >= star ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {currentRating > 0 ? `${currentRating}/5` : 'Not rated'}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-950 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">Event Feedback</h2>
            <p className="text-blue-200 text-sm">Help us improve future events</p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Event Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">{event.name}</h3>
            <p className="text-sm text-blue-800">
              {new Date(event.start_datetime).toLocaleDateString()} • {event.venue}
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Thank you for attending! Your feedback helps us improve future events.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Rating Sections */}
            <div className="space-y-6 mb-6">
              {/* Overall Rating - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Experience <span className="text-red-500">*</span>
                </label>
                {renderStars('overall', ratings.overall)}
              </div>

              {/* Venue Rating - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Venue Quality
                </label>
                {renderStars('venue', ratings.venue)}
              </div>

              {/* Activities Rating - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Activities & Content
                </label>
                {renderStars('activities', ratings.activities)}
              </div>

              {/* Organization Rating - Optional */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization & Management
                </label>
                {renderStars('organization', ratings.organization)}
              </div>
            </div>

            {/* Comments */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Comments (Optional)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share your thoughts about the event..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows="4"
                maxLength="500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {comments.length}/500 characters
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={loading || ratings.overall === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </div>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>

          {/* Footer Info */}
          <div className="mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Privacy:</strong> Your feedback is anonymous to event organizers and helps improve future events.
              You can edit this feedback within 24 hours of submission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
