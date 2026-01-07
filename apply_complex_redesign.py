
import os

FILE_PATH = '/home/ivy/Documents/School-Event-Management-Commision/rebuild/templates/student.html'

# The new comprehensive feedback form
NEW_CONTENT = r"""                        // Professional University Evaluation System
                        pendingData.pending_events.forEach(event => {
                            const feedbackForm = document.createElement('div');
                            feedbackForm.className = 'bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mb-8 transition-all hover:shadow-md';
                            feedbackForm.innerHTML = `
                                <div class="bg-gradient-to-r from-slate-900 to-slate-800 px-8 py-6 text-white flex justify-between items-start">
                                    <div>
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="bg-blue-500/20 text-blue-100 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-500/30">Official Evaluation</span>
                                            <span class="text-slate-400 text-xs tracking-wide">ID: EV-${event.id}</span>
                                        </div>
                                        <h4 class="text-xl font-bold text-white tracking-tight">${event.name}</h4>
                                        <div class="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-sm text-slate-300">
                                            <span class="flex items-center gap-2">
                                                <svg class="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                ${new Date(event.start_datetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                            </span>
                                            <span class="flex items-center gap-2">
                                                <svg class="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                ${event.venue}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="text-right hidden sm:block">
                                        <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-1">Status</p>
                                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium border border-amber-500/20">
                                            <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                                            Pending Review
                                        </span>
                                    </div>
                                </div>

                                <form class="feedback-form-${event.id} p-8 space-y-10">
                                    <div class="bg-blue-50/50 rounded-lg p-5 border-l-4 border-blue-600">
                                        <p class="text-sm text-slate-700 leading-relaxed max-w-3xl">
                                            This evaluation helps the university improve future events. Please evaluate specifically on the 
                                            <strong>educational value</strong>, <strong>logistical execution</strong>, and <strong>overall impact</strong>.
                                            Your responses are anonymous and aggregated.
                                        </p>
                                    </div>

                                    <!-- SECTION 1: LOGISTICS & OPERATIONS -->
                                    <div class="space-y-6">
                                        <div class="flex items-center gap-3 pb-2 border-b border-gray-100">
                                            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">1</span>
                                            <h5 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Logistics & Experience</h5>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                            <!-- Registration -->
                                            <div>
                                                <label class="block text-sm font-semibold text-gray-700 mb-2">Registration Process</label>
                                                <div class="flex gap-1" id="reg-stars-${event.id}" data-value="0">
                                                    ${[1, 2, 3, 4, 5].map(n => `
                                                        <button type="button" class="reg-star-${event.id} p-1 text-gray-300 hover:text-amber-400 focus:outline-none transition-colors" data-rating="${n}">
                                                            <svg class="w-8 h-8 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                        </button>
                                                    `).join('')}
                                                </div>
                                                <p class="text-xs text-gray-400 mt-1">Ease of sign-up and check-in efficiency.</p>
                                            </div>

                                            <!-- Venue -->
                                            <div>
                                                <label class="block text-sm font-semibold text-gray-700 mb-2">Venue & Facilities</label>
                                                <div class="flex gap-1" id="venue-stars-${event.id}" data-value="0">
                                                    ${[1, 2, 3, 4, 5].map(n => `
                                                        <button type="button" class="venue-star-${event.id} p-1 text-gray-300 hover:text-amber-400 focus:outline-none transition-colors" data-rating="${n}">
                                                            <svg class="w-8 h-8 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                        </button>
                                                    `).join('')}
                                                </div>
                                                <p class="text-xs text-gray-400 mt-1">Comfort, sound quality, and suitability.</p>
                                            </div>

                                            <!-- Organization -->
                                            <div>
                                                <label class="block text-sm font-semibold text-gray-700 mb-2">Organization & Mgmt</label>
                                                <div class="flex gap-1" id="org-stars-${event.id}" data-value="0">
                                                    ${[1, 2, 3, 4, 5].map(n => `
                                                        <button type="button" class="org-star-${event.id} p-1 text-gray-300 hover:text-amber-400 focus:outline-none transition-colors" data-rating="${n}">
                                                            <svg class="w-8 h-8 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                        </button>
                                                    `).join('')}
                                                </div>
                                                <p class="text-xs text-gray-400 mt-1">Punctuality and staff support.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- SECTION 2: EDUCATIONAL IMPACT -->
                                    <div class="space-y-6">
                                        <div class="flex items-center gap-3 pb-2 border-b border-gray-100">
                                            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">2</span>
                                            <h5 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Content & Impact</h5>
                                        </div>

                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                            <!-- Speaker -->
                                            <div>
                                                <label class="block text-sm font-semibold text-gray-700 mb-2">Speaker Effectiveness</label>
                                                <div class="flex gap-1" id="speaker-stars-${event.id}" data-value="0">
                                                    ${[1, 2, 3, 4, 5].map(n => `
                                                        <button type="button" class="speaker-star-${event.id} p-1 text-gray-300 hover:text-blue-500 focus:outline-none transition-colors" data-rating="${n}">
                                                            <svg class="w-8 h-8 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                        </button>
                                                    `).join('')}
                                                </div>
                                                <p class="text-xs text-gray-400 mt-1">Clarity, knowledge, and engagement.</p>
                                            </div>

                                            <!-- Content Relevance -->
                                            <div>
                                                <label class="block text-sm font-semibold text-gray-700 mb-2">Topic Relevance</label>
                                                <div class="flex gap-1" id="content-stars-${event.id}" data-value="0">
                                                    ${[1, 2, 3, 4, 5].map(n => `
                                                        <button type="button" class="content-star-${event.id} p-1 text-gray-300 hover:text-blue-500 focus:outline-none transition-colors" data-rating="${n}">
                                                            <svg class="w-8 h-8 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                        </button>
                                                    `).join('')}
                                                </div>
                                                <p class="text-xs text-gray-400 mt-1">Relevance to studies or career.</p>
                                            </div>
                                            
                                            <!-- Overall Activities -->
                                            <div>
                                                <label class="block text-sm font-semibold text-gray-700 mb-2">Overall Activities</label>
                                                <div class="flex gap-1" id="activities-stars-${event.id}" data-value="0">
                                                    ${[1, 2, 3, 4, 5].map(n => `
                                                        <button type="button" class="activities-star-${event.id} p-1 text-gray-300 hover:text-blue-500 focus:outline-none transition-colors" data-rating="${n}">
                                                            <svg class="w-8 h-8 pointer-events-none" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                        </button>
                                                    `).join('')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- SECTION 3: KEY TAKEAWAYS & NPS -->
                                    <div class="space-y-6">
                                        <div class="flex items-center gap-3 pb-2 border-b border-gray-100">
                                            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">3</span>
                                            <h5 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Outcomes & Evaluation</h5>
                                        </div>

                                        <!-- Key Takeaways -->
                                        <div>
                                            <label class="block text-sm font-semibold text-gray-700 mb-2">Key Learning / Takeaway</label>
                                            <textarea class="takeaways-${event.id} w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm mb-1" rows="2" placeholder="What was the most valuable thing you learned?"></textarea>
                                        </div>

                                        <!-- Overall Satisfaction -->
                                        <div>
                                            <label class="block text-base font-bold text-gray-900 mb-3">Overall Satisfaction <span class="text-red-500">*</span></label>
                                            <div class="flex gap-2 justify-center sm:justify-start" id="overall-stars-${event.id}" data-value="0">
                                                ${[1, 2, 3, 4, 5].map(n => `
                                                    <button type="button" class="overall-star-${event.id} p-1 text-gray-200 hover:text-yellow-400 focus:outline-none transition-transform active:scale-95" data-rating="${n}">
                                                        <svg class="w-12 h-12 pointer-events-none shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                                    </button>
                                                `).join('')}
                                            </div>
                                            <p class="text-center sm:text-left text-sm text-gray-500 mt-2 font-medium overall-text-${event.id}">Select your overall rating</p>
                                        </div>

                                        <!-- NPS -->
                                        <div class="bg-gray-50 rounded-lg p-6">
                                            <label class="block text-center text-sm font-bold text-gray-800 mb-4">How likely are you to recommend this event series to a peer?</label>
                                            <div class="flex justify-between max-w-xl mx-auto mb-2">
                                                <span class="text-xs font-bold text-gray-400">Not Likely</span>
                                                <span class="text-xs font-bold text-gray-400">Very Likely</span>
                                            </div>
                                            <div class="flex justify-between gap-1 max-w-xl mx-auto">
                                                ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `
                                                    <button type="button" class="nps-btn-${event.id} flex-1 aspect-square flex items-center justify-center rounded border border-gray-200 bg-white hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all text-sm font-medium text-gray-600" data-value="${n}">${n}</button>
                                                `).join('')}
                                            </div>
                                            <input type="hidden" class="nps-input-${event.id}" value="">
                                        </div>

                                        <!-- General Comments -->
                                        <div>
                                            <label class="block text-sm font-semibold text-gray-700 mb-2">Additional Comments</label>
                                            <textarea class="comments-${event.id} w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 transition-all text-sm" rows="3" placeholder="Any other feedback on logistics, food, etc.?" maxlength="500"></textarea>
                                        </div>
                                    </div>

                                    <!-- Submit Actions -->
                                    <div class="flex flex-col-reverse sm:flex-row justify-between items-center pt-6 border-t border-gray-100 gap-4">
                                        <div class="flex items-center gap-2">
                                            <input type="checkbox" id="future-${event.id}" class="future-check-${event.id} w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                            <label for="future-${event.id}" class="text-sm text-gray-600">Interested in future events like this</label>
                                        </div>
                                        <div class="flex gap-3 w-full sm:w-auto">
                                            <button type="button" class="skip-btn-${event.id} flex-1 sm:flex-none px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
                                                Evaluate Later
                                            </button>
                                            <button type="submit" disabled class="submit-feedback-btn-${event.id} flex-1 sm:flex-none px-8 py-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                                Submit Evaluation
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            `;
                            pendingContainer.appendChild(feedbackForm);
                        });

                        // Logic Implementation
                        pendingData.pending_events.forEach(event => {
                            const form = document.querySelector(`.feedback-form-${event.id}`);
                            
                            // State
                            let ratings = {
                                overall: 0,
                                venue: 0,
                                activities: 0,
                                org: 0,
                                speaker: 0,
                                content: 0,
                                reg: 0,
                                nps: null
                            };

                            // Elements
                            const submitBtn = document.querySelector(`.submit-feedback-btn-${event.id}`);
                            const npsBtns = document.querySelectorAll(`.nps-btn-${event.id}`);
                            const overallText = document.querySelector(`.overall-text-${event.id}`);

                            // Helper: Star Logic
                            const setupStars = (name, selector) => {
                                const buttons = document.querySelectorAll(`.${selector}-${event.id}`);
                                const container = document.getElementById(`${selector}s-${event.id}`); // Note the 's' added in HTML ID
                                
                                buttons.forEach((btn, idx) => {
                                    const rating = parseInt(btn.dataset.rating);
                                    
                                    btn.addEventListener('mouseenter', () => renderStars(buttons, rating, name === 'overall'));
                                    btn.addEventListener('mouseleave', () => renderStars(buttons, ratings[name], name === 'overall'));
                                    btn.addEventListener('click', () => {
                                        ratings[name] = rating;
                                        renderStars(buttons, rating, name === 'overall');
                                        if(container) container.dataset.value = rating;
                                        checkValidity();
                                    });
                                });
                            };

                            const renderStars = (buttons, activeRating, isOverall) => {
                                buttons.forEach((btn, idx) => {
                                    const rating = idx + 1;
                                    const isActive = rating <= activeRating;
                                    
                                    // Colors based on context
                                    let activeClass = 'text-amber-400';
                                    if (!isOverall && (btn.classList.contains('speaker-star') || btn.classList.contains('content-star'))) {
                                        activeClass = 'text-blue-500';
                                    }

                                    if (isActive) {
                                        btn.classList.add(activeClass.split('-')[0] + '-' + activeClass.split('-')[1]);
                                        btn.classList.remove('text-gray-200', 'text-gray-300');
                                        if(isOverall) btn.querySelector('svg').classList.add('scale-110');
                                    } else {
                                        btn.classList.remove('text-amber-400', 'text-blue-500');
                                        btn.classList.add(isOverall ? 'text-gray-200' : 'text-gray-300');
                                        if(isOverall) btn.querySelector('svg').classList.remove('scale-110');
                                    }
                                });

                                if (isOverall && overallText) {
                                    const labels = ['Poor', 'Fair', 'Average', 'Good', 'Excellent'];
                                    if (activeRating > 0) {
                                        overallText.textContent = labels[activeRating - 1];
                                        overallText.className = 'text-center sm:text-left text-sm font-bold text-slate-800 mt-2 transition-all';
                                    } else {
                                        overallText.textContent = 'Select your overall rating';
                                        overallText.className = 'text-center sm:text-left text-sm text-gray-500 mt-2 font-medium';
                                    }
                                }
                            };

                            // Setup all star groups
                            setupStars('overall', 'overall-star');
                            setupStars('venue', 'venue-star');
                            setupStars('activities', 'activities-star');
                            setupStars('org', 'org-star');
                            setupStars('speaker', 'speaker-star');
                            setupStars('content', 'content-star');
                            setupStars('reg', 'reg-star');

                            // NPS Logic
                            npsBtns.forEach(btn => {
                                btn.addEventListener('click', () => {
                                    ratings.nps = parseInt(btn.dataset.value);
                                    npsBtns.forEach(b => {
                                        b.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
                                        b.classList.add('bg-white', 'text-gray-600', 'border-gray-200');
                                    });
                                    btn.classList.remove('bg-white', 'text-gray-600', 'border-gray-200');
                                    btn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
                                });
                            });

                            // Validity Check
                            const checkValidity = () => {
                                if (ratings.overall > 0) {
                                    submitBtn.disabled = false;
                                }
                            };

                            // Submit Handler
                            form.addEventListener('submit', async (e) => {
                                e.preventDefault();
                                
                                if (ratings.overall === 0) {
                                    alert('Overall satisfaction rating is required.');
                                    return;
                                }

                                submitBtn.disabled = true;
                                submitBtn.innerHTML = '<span class="animate-spin">↻</span> Submitting...';

                                const payload = {
                                    overall_rating: ratings.overall,
                                    venue_rating: ratings.venue || null,
                                    activities_rating: ratings.activities || null,
                                    organization_rating: ratings.org || null,
                                    registration_process: ratings.reg || null,
                                    speaker_effectiveness: ratings.speaker || null,
                                    content_relevance: ratings.content || null,
                                    net_promoter_score: ratings.nps,
                                    key_takeaways: document.querySelector(`.takeaways-${event.id}`).value,
                                    comments: document.querySelector(`.comments-${event.id}`).value,
                                    future_interest: document.querySelector(`.future-check-${event.id}`).checked
                                };

                                try {
                                    const res = await fetch(`/api/feedback/submit/${event.id}`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(payload)
                                    });
                                    
                                    const data = await res.json();
                                    
                                    if (res.ok) {
                                        submitBtn.innerHTML = '✓ Submitted';
                                        submitBtn.classList.replace('bg-slate-900', 'bg-green-600');
                                        setTimeout(() => loadMyFeedback(), 800);
                                    } else {
                                        throw new Error(data.error || 'Submission failed');
                                    }
                                } catch (err) {
                                    alert(err.message);
                                    submitBtn.disabled = false;
                                    submitBtn.textContent = 'Submit Evaluation';
                                }
                            });
                             // Skip feedback
                            document.querySelector(`.skip-btn-${event.id}`).addEventListener('click', () => {
                                if (confirm('Are you sure you want to skip this feedback? You can return to it later.')) {
                                    const feedbackForm = document.querySelector(`.feedback-form-${event.id}`).closest('.mb-8');
                                    if (feedbackForm) feedbackForm.remove();
                                    if (document.querySelectorAll('[class*="feedback-form-"]').length === 0) loadMyFeedback();
                                }
                            });
                        });"""

with open(FILE_PATH, 'r') as f:
    lines = f.readlines()

# Verify markers
START_INDEX = 721 # Line 722
END_INDEX = 990 # Line 991

print(f"Checking line {START_INDEX + 1}: '{lines[START_INDEX].strip()}'")
print(f"Checking line {END_INDEX + 1}: '{lines[END_INDEX].strip()}'")

# We replace lines[START_INDEX : END_INDEX + 1] with NEW_CONTENT
# NEW_CONTENT should end with a newline
if not NEW_CONTENT.endswith('\n'):
    NEW_CONTENT += '\n'

new_lines = lines[:START_INDEX] + [NEW_CONTENT] + lines[END_INDEX + 1:]

with open(FILE_PATH, 'w') as f:
    f.writelines(new_lines)

print("SUCCESS: Comprehensive feedback form applied.")
