
import os

FILE_PATH = '/home/ivy/Documents/School-Event-Management-Commision/rebuild/templates/student.html'

NEW_CONTENT = r"""                        // Professional Feedback Card
                        pendingData.pending_events.forEach(event => {
                            const feedbackForm = document.createElement('div');
                            feedbackForm.className = 'bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-6 transition-all hover:shadow-md';
                            feedbackForm.innerHTML = `
                                <div class="bg-slate-50 border-b border-gray-100 px-6 py-4 flex justify-between items-start">
                                    <div class="flex gap-4">
                                        <div class="bg-blue-100 text-blue-600 rounded-lg p-3 h-12 w-12 flex items-center justify-center shrink-0">
                                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h4 class="text-lg font-bold text-gray-900">${event.name}</h4>
                                            <div class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                                                <span class="flex items-center gap-1">
                                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                    ${new Date(event.start_datetime).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </span>
                                                <span class="flex items-center gap-1">
                                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                    ${event.venue}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span class="bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                                        Action Required
                                    </span>
                                </div>

                                <form class="feedback-form-${event.id} p-6 sm:p-8 space-y-8">
                                    <div class="bg-blue-50/50 rounded-lg p-4 border border-blue-100/50">
                                        <p class="text-sm text-blue-800 leading-relaxed">
                                            Your feedback is instrumental in maintaining the quality of our university events. Please provide an honest assessment of your experience. <span class="font-semibold">All responses are anonymous.</span>
                                        </p>
                                    </div>

                                    <div class="space-y-4">
                                        <div class="flex justify-between items-end">
                                            <label class="block text-base font-bold text-gray-900">
                                                Overall Satisfaction <span class="text-red-500">*</span>
                                            </label>
                                            <span class="text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-500 rating-text-${event.id} min-w-[100px] text-center transition-colors">Select Rating</span>
                                        </div>
                                        
                                        <div class="flex items-center justify-between sm:justify-start sm:gap-8" id="overall-stars-${event.id}">
                                            ${[1, 2, 3, 4, 5].map(star => `
                                                <button type="button" class="group star-btn-${event.id} focus:outline-none transition-transform active:scale-95" data-rating="${star}">
                                                    <svg class="w-10 h-10 sm:w-12 sm:h-12 text-gray-200 transition-colors duration-200 group-hover:text-yellow-400 star-svg" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                </button>
                                            `).join('')}
                                        </div>
                                        <p class="text-xs text-gray-500">How would you evaluate the event as a whole?</p>
                                    </div>

                                    <hr class="border-gray-100" />

                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                        <div class="space-y-3">
                                            <div class="flex justify-between items-baseline">
                                                <label class="text-sm font-bold text-gray-800">Venue & Facilities</label>
                                                <span class="text-xs font-medium text-gray-500 venue-text-${event.id}"></span>
                                            </div>
                                            <div class="flex gap-2">
                                                ${[1, 2, 3, 4, 5].map(star => `
                                                    <button type="button" class="venue-star-btn-${event.id} focus:outline-none transition group" data-rating="${star}">
                                                        <svg class="w-8 h-8 text-gray-200 group-hover:text-yellow-400 transition-colors star-svg" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    </button>
                                                `).join('')}
                                            </div>
                                            <p class="text-xs text-gray-500 leading-snug">Rate the comfort, accessibility, and suitability of the location.</p>
                                        </div>

                                        <div class="space-y-3">
                                            <div class="flex justify-between items-baseline">
                                                <label class="text-sm font-bold text-gray-800">Content & Activities</label>
                                                <span class="text-xs font-medium text-gray-500 activities-text-${event.id}"></span>
                                            </div>
                                            <div class="flex gap-2">
                                                ${[1, 2, 3, 4, 5].map(star => `
                                                    <button type="button" class="activities-star-btn-${event.id} focus:outline-none transition group" data-rating="${star}">
                                                        <svg class="w-8 h-8 text-gray-200 group-hover:text-yellow-400 transition-colors star-svg" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    </button>
                                                `).join('')}
                                            </div>
                                            <p class="text-xs text-gray-500 leading-snug">Rate the relevance, engagement, and quality of sessions.</p>
                                        </div>

                                        <div class="md:col-span-2 space-y-3">
                                            <div class="flex justify-between items-baseline">
                                                <label class="text-sm font-bold text-gray-800">Organization & Logistics</label>
                                                <span class="text-xs font-medium text-gray-500 organization-text-${event.id}"></span>
                                            </div>
                                            <div class="flex gap-2">
                                                ${[1, 2, 3, 4, 5].map(star => `
                                                    <button type="button" class="organization-star-btn-${event.id} focus:outline-none transition group" data-rating="${star}">
                                                        <svg class="w-8 h-8 text-gray-200 group-hover:text-yellow-400 transition-colors star-svg" fill="currentColor" viewBox="0 0 24 24">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    </button>
                                                `).join('')}
                                            </div>
                                            <p class="text-xs text-gray-500 leading-snug">Rate punctuality, communication, and staff support.</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-bold text-gray-900 mb-3">Qualitative Feedback</label>
                                        <div class="relative">
                                            <textarea 
                                                class="comments-${event.id} w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all resize-y min-h-[120px] text-sm text-gray-800 placeholder-gray-400" 
                                                rows="4" 
                                                placeholder="Please share specific highlights or suggestions for improvement..." 
                                                maxlength="500"></textarea>
                                            <div class="absolute bottom-2 right-2">
                                                <span class="text-xs text-gray-400 char-count-${event.id}">0/500</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button type="button" class="skip-btn-${event.id} px-6 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
                                            Evaluate Later
                                        </button>
                                        <button type="submit" disabled class="submit-feedback-btn-${event.id} px-8 py-2.5 bg-blue-900 text-white text-sm font-semibold rounded-lg hover:bg-blue-800 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                            <span>Submit Evaluation</span>
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </button>
                                    </div>
                                </form>
                            `;
                            pendingContainer.appendChild(feedbackForm);
                        });

                        // Add event listeners for feedback forms
                        pendingData.pending_events.forEach(event => {
                            const form = document.querySelector(`.feedback-form-${event.id}`);
                            const starBtns = document.querySelectorAll(`.star-btn-${event.id}`);
                            const venueStarBtns = document.querySelectorAll(`.venue-star-btn-${event.id}`);
                            const activitiesStarBtns = document.querySelectorAll(`.activities-star-btn-${event.id}`);
                            const organizationStarBtns = document.querySelectorAll(`.organization-star-btn-${event.id}`);
                            const ratingText = document.querySelector(`.rating-text-${event.id}`);
                            
                            const venueText = document.querySelector(`.venue-text-${event.id}`);
                            const activitiesText = document.querySelector(`.activities-text-${event.id}`);
                            const organizationText = document.querySelector(`.organization-text-${event.id}`);

                            const commentsTextarea = document.querySelector(`.comments-${event.id}`);
                            const charCount = document.querySelector(`.char-count-${event.id}`);
                            const submitBtn = document.querySelector(`.submit-feedback-btn-${event.id}`);
                            const skipBtn = document.querySelector(`.skip-btn-${event.id}`);

                            let overallRating = 0;
                            let venueRating = 0;
                            let activitiesRating = 0;
                            let organizationRating = 0;

                            const getRatingLabel = (rating) => {
                                switch (parseInt(rating)) {
                                    case 1: return 'Poor';
                                    case 2: return 'Below Average';
                                    case 3: return 'Average';
                                    case 4: return 'Good';
                                    case 5: return 'Excellent';
                                    default: return '';
                                }
                            };

                            const updateStarVisuals = (buttons, rating, textElement, isOverall = false) => {
                                buttons.forEach((b, i) => {
                                    const svg = b.querySelector('.star-svg');
                                    const isSelected = i < rating;
                                    
                                    if (isSelected) {
                                        svg.classList.add('text-yellow-400');
                                        svg.classList.remove('text-gray-200');
                                        if (isOverall) svg.classList.add('scale-110'); // Slight pop for overall
                                    } else {
                                        svg.classList.add('text-gray-200');
                                        svg.classList.remove('text-yellow-400');
                                        if (isOverall) svg.classList.remove('scale-110');
                                    }
                                });
                                
                                if (textElement) {
                                    const label = getRatingLabel(rating);
                                    if (isOverall) {
                                        textElement.textContent = label || 'Select Rating';
                                        if (rating > 0) {
                                            textElement.className = 'text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 tracking-wide transition-all';
                                        } else {
                                            textElement.className = 'text-xs font-medium px-2 py-1 rounded bg-gray-100 text-gray-500 rating-text-' + event.id + ' min-w-[100px] text-center transition-colors';
                                        }
                                    } else {
                                        textElement.textContent = label;
                                    }
                                }
                            };

                            // Overall rating stars
                            starBtns.forEach((btn, index) => {
                                btn.addEventListener('mouseenter', () => updateStarVisuals(starBtns, index + 1, ratingText, true));
                                btn.addEventListener('mouseleave', () => updateStarVisuals(starBtns, overallRating, ratingText, true));
                                btn.addEventListener('click', () => {
                                    overallRating = index + 1;
                                    updateStarVisuals(starBtns, overallRating, ratingText, true);
                                    submitBtn.disabled = false;
                                });
                            });
                            
                            // Initialize
                            updateStarVisuals(starBtns, 0, ratingText, true);

                            // Helper for other categories
                            const setupCategoryStars = (buttons, setRating, textEl) => {
                                buttons.forEach((btn, index) => {
                                    btn.addEventListener('mouseenter', () => updateStarVisuals(buttons, index + 1, textEl));
                                    btn.addEventListener('mouseleave', () => updateStarVisuals(buttons, setRating(), textEl));
                                    btn.addEventListener('click', () => {
                                        setRating(index + 1);
                                        updateStarVisuals(buttons, index + 1, textEl);
                                    });
                                });
                            };

                            setupCategoryStars(venueStarBtns, (val) => { if(val !== undefined) venueRating = val; return venueRating; }, venueText);
                            setupCategoryStars(activitiesStarBtns, (val) => { if(val !== undefined) activitiesRating = val; return activitiesRating; }, activitiesText);
                            setupCategoryStars(organizationStarBtns, (val) => { if(val !== undefined) organizationRating = val; return organizationRating; }, organizationText);

                            // Comments character counter
                            commentsTextarea.addEventListener('input', (e) => {
                                charCount.textContent = `${e.target.value.length}/500`;
                                if (e.target.value.length > 450) {
                                    charCount.classList.add('text-orange-500');
                                } else {
                                    charCount.classList.remove('text-orange-500');
                                }
                            });
                            
                            // Auto resize textarea
                            commentsTextarea.addEventListener('input', function() {
                                this.style.height = 'auto';
                                this.style.height = (this.scrollHeight) + 'px';
                            });

                            // Submit feedback
                            const feedbackFormElement = document.querySelector(`.feedback-form-${event.id}`);
                            if (feedbackFormElement) {
                                feedbackFormElement.addEventListener('submit', async (e) => {
                                    e.preventDefault();

                                    if (overallRating === 0) {
                                        alert('Please provide an overall rating');
                                        return;
                                    }

                                    submitBtn.disabled = true;
                                    const originalBtnText = submitBtn.innerHTML;
                                    submitBtn.innerHTML = `<span>Submitting...</span>`;

                                    try {
                                        const feedbackData = {
                                            overall_rating: overallRating,
                                            venue_rating: venueRating || null,
                                            activities_rating: activitiesRating || null,
                                            organization_rating: organizationRating || null,
                                            comments: commentsTextarea.value.trim() || null
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
                                            // Show success state
                                            submitBtn.innerHTML = `<span class="flex items-center gap-1">✓ Submitted</span>`;
                                            submitBtn.classList.remove('bg-blue-900', 'hover:bg-blue-800');
                                            submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                                            setTimeout(() => {
                                                alert('Thank you for your feedback!');
                                                loadMyFeedback(); // Reload the feedback tab
                                            }, 500);
                                        } else {
                                            alert(data.error || 'Failed to submit feedback');
                                            submitBtn.disabled = false;
                                            submitBtn.innerHTML = originalBtnText;
                                        }
                                    } catch (error) {
                                        console.error('Feedback submission error:', error);
                                        alert('Failed to submit feedback. Please try again.');
                                        submitBtn.disabled = false;
                                        submitBtn.innerHTML = originalBtnText;
                                    }
                                });
                            }

                            // Skip feedback
                            skipBtn.addEventListener('click', () => {
                                if (confirm('Are you sure you want to skip this feedback? You can return to it later.')) {
                                    const feedbackForm = document.querySelector(`.feedback-form-${event.id}`).closest('.mb-6');
                                    if (feedbackForm) {
                                        feedbackForm.remove();
                                    }
                                    // If no more forms, show message?
                                    // Check if any forms left
                                    const pendingForms = document.querySelectorAll('[class*="feedback-form-"]');
                                    if (pendingForms.length === 0) {
                                        loadMyFeedback(); // Reload to show empty state
                                    }
                                }
                            });
                        });"""

with open(FILE_PATH, 'r') as f:
    lines = f.readlines()

# Verify markers
START_INDEX = 720 # Line 721
END_INDEX = 989 # Line 990

print(f"Checking line {START_INDEX + 1}: '{lines[START_INDEX].strip()}'")
print(f"Checking line {END_INDEX + 1}: '{lines[END_INDEX].strip()}'")

if "pendingData.pending_events.forEach(event => {" not in lines[START_INDEX]:
    print("ERROR: Start marker not found!")
    exit(1)

if "});" not in lines[END_INDEX]:
    print("WARNING: End marker might be loose. Checking context.")
    # It's okay if whitespace differs, but let's be careful.
    pass

# We replace lines[START_INDEX : END_INDEX + 1] with NEW_CONTENT
# NEW_CONTENT should end with a newline
if not NEW_CONTENT.endswith('\n'):
    NEW_CONTENT += '\n'

new_lines = lines[:START_INDEX] + [NEW_CONTENT] + lines[END_INDEX + 1:]

with open(FILE_PATH, 'w') as f:
    f.writelines(new_lines)

print("SUCCESS: File updated.")
