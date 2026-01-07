
import os

FILE_PATH = '/home/ivy/Documents/School-Event-Management-Commision/rebuild/templates/student.html'

# The new "Compact Professional" feedback form
NEW_CONTENT = r"""                        // Compact Professional University Evaluation System (3-Column)
                        pendingData.pending_events.forEach(event => {
                            const feedbackForm = document.createElement('div');
                            feedbackForm.className = 'bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden mb-6 transition-all hover:shadow-md';
                            feedbackForm.innerHTML = `
                                <!-- Header -->
                                <div class="bg-slate-900 px-6 py-4 flex justify-between items-center text-white border-b border-slate-700">
                                    <div class="flex items-center gap-4">
                                        <div>
                                            <div class="flex items-center gap-2">
                                                <span class="bg-blue-500/20 text-blue-100 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/30">EVALUATION</span>
                                                <h4 class="text-lg font-bold tracking-tight">${event.name}</h4>
                                            </div>
                                            <div class="flex gap-4 text-xs text-slate-400 mt-1">
                                                <span>${new Date(event.start_datetime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                                <span>•</span>
                                                <span>${event.venue}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <span class="text-[10px] uppercase font-semibold text-amber-400 bg-amber-900/30 border border-amber-500/20 px-2 py-1 rounded">Pending Review</span>
                                </div>

                                <form class="feedback-form-${event.id}">
                                    <!-- 3-Column Grid for Metrics -->
                                    <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-white">
                                        <!-- Logistic Column -->
                                        <div class="p-5 space-y-5">
                                            <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Logistics</h5>
                                            
                                            <div>
                                                <div class="flex justify-between items-center mb-1">
                                                    <label class="text-xs font-semibold text-slate-700">Registration</label>
                                                    <span class="text-[10px] text-gray-400 reg-val-${event.id}">-</span>
                                                </div>
                                                <div class="flex gap-1" id="reg-stars-${event.id}">
                                                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="reg-star-${event.id} text-gray-200 hover:text-amber-400 transition-colors" data-rating="${n}"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg></button>`).join('')}
                                                </div>
                                            </div>

                                            <div>
                                                <div class="flex justify-between items-center mb-1">
                                                    <label class="text-xs font-semibold text-slate-700">Venue & Facilities</label>
                                                    <span class="text-[10px] text-gray-400 venue-val-${event.id}">-</span>
                                                </div>
                                                <div class="flex gap-1" id="venue-stars-${event.id}">
                                                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="venue-star-${event.id} text-gray-200 hover:text-amber-400 transition-colors" data-rating="${n}"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg></button>`).join('')}
                                                </div>
                                            </div>

                                            <div>
                                                <div class="flex justify-between items-center mb-1">
                                                    <label class="text-xs font-semibold text-slate-700">Organization</label>
                                                    <span class="text-[10px] text-gray-400 org-val-${event.id}">-</span>
                                                </div>
                                                <div class="flex gap-1" id="org-stars-${event.id}">
                                                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="org-star-${event.id} text-gray-200 hover:text-amber-400 transition-colors" data-rating="${n}"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg></button>`).join('')}
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Content Column -->
                                        <div class="p-5 space-y-5">
                                            <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Impact & Content</h5>
                                            
                                            <div>
                                                <div class="flex justify-between items-center mb-1">
                                                    <label class="text-xs font-semibold text-slate-700">Speaker Quality</label>
                                                    <span class="text-[10px] text-gray-400 speaker-val-${event.id}">-</span>
                                                </div>
                                                <div class="flex gap-1" id="speaker-stars-${event.id}">
                                                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="speaker-star-${event.id} text-gray-200 hover:text-blue-500 transition-colors" data-rating="${n}"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg></button>`).join('')}
                                                </div>
                                            </div>

                                            <div>
                                                <div class="flex justify-between items-center mb-1">
                                                    <label class="text-xs font-semibold text-slate-700">Topic Relevance</label>
                                                    <span class="text-[10px] text-gray-400 content-val-${event.id}">-</span>
                                                </div>
                                                <div class="flex gap-1" id="content-stars-${event.id}">
                                                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="content-star-${event.id} text-gray-200 hover:text-blue-500 transition-colors" data-rating="${n}"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg></button>`).join('')}
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <div class="flex justify-between items-center mb-1">
                                                    <label class="text-xs font-semibold text-slate-700">Overall Activities</label>
                                                    <span class="text-[10px] text-gray-400 activities-val-${event.id}">-</span>
                                                </div>
                                                <div class="flex gap-1" id="activities-stars-${event.id}">
                                                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="activities-star-${event.id} text-gray-200 hover:text-blue-500 transition-colors" data-rating="${n}"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg></button>`).join('')}
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Qualitative Column -->
                                        <div class="p-5 flex flex-col h-full">
                                            <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">Key Takeaway</h5>
                                            <textarea class="takeaways-${event.id} flex-1 w-full p-3 bg-gray-50 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 resize-none mb-3" placeholder="Most valuable learning..."></textarea>
                                            
                                            <div class="flex items-center gap-2 mt-auto">
                                                <input type="checkbox" id="future-${event.id}" class="future-check-${event.id} w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                                                <label for="future-${event.id}" class="text-xs text-gray-600">Interested in future events</label>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Footer: Assessment & Actions (Full Width) -->
                                    <div class="bg-slate-50 border-t border-gray-200 p-5">
                                        <div class="flex flex-col md:flex-row gap-8 items-center">
                                            
                                            <!-- Overall Rating (Large) -->
                                            <div class="flex flex-col items-center flex-shrink-0">
                                                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Overall Satisfaction</div>
                                                <div class="flex gap-1.5 align-middle" id="overall-stars-${event.id}">
                                                    ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="overall-star-${event.id} text-gray-300 hover:text-amber-500 transition-all transform hover:scale-110" data-rating="${n}"><svg class="w-9 h-9 shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6-4.8-6 4.8 2.4-7.2-6-4.8h7.6z"/></svg></button>`).join('')}
                                                </div>
                                                <div class="overall-text-${event.id} text-xs font-bold text-slate-600 mt-1 h-4"></div>
                                            </div>

                                            <!-- NPS (Slider Style) -->
                                            <div class="flex-1 w-full">
                                                <div class="flex justify-between items-center mb-1">
                                                    <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Promoter Score (Likelihood to Recommend)</span>
                                                    <span class="nps-display-${event.id} text-xs font-bold text-blue-600 px-2 py-0.5 bg-blue-50 rounded hidden">0</span>
                                                </div>
                                                <div class="flex gap-px bg-white rounded border border-gray-200 p-0.5 shadow-sm">
                                                    ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button type="button" class="nps-btn-${event.id} flex-1 py-1.5 text-[10px] font-semibold text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-sm transition-colors" data-value="${n}">${n}</button>`).join('')}
                                                </div>
                                                <div class="flex justify-between px-1 mt-1">
                                                    <span class="text-[9px] text-gray-400 uppercase">Not Likely</span>
                                                    <span class="text-[9px] text-gray-400 uppercase">Very Likely</span>
                                                </div>
                                            </div>

                                            <!-- Submit Button -->
                                            <div class="flex-shrink-0 w-full md:w-auto mt-2 md:mt-0">
                                                <button type="submit" disabled class="submit-feedback-btn-${event.id} w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded shadow hover:bg-slate-800 disabled:opacity-50 disabled:shadow-none transition-all flex justify-center items-center gap-2">
                                                    <span>Submit Review</span>
                                                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                                                </button>
                                                <button type="button" class="skip-btn-${event.id} w-full mt-2 text-[10px] text-gray-400 hover:text-gray-600 underline text-center">Skip for now</button>
                                            </div>
                                        </div>
                                        
                                        <!-- Optional Comments Accordion -->
                                        <div class="mt-4 pt-4 border-t border-gray-100">
                                            <textarea class="comments-${event.id} w-full p-3 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-blue-500 resize-none h-16" placeholder="Additional comments (optional)..."></textarea>
                                        </div>
                                    </div>
                                </form>
                            `;
                            pendingContainer.appendChild(feedbackForm);
                        });

                        // Compact Logic
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
                                const valDisplay = document.querySelector(`.${name === 'overall' ? 'none' : selector.split('-')[0] + '-val-' + event.id}`);
                                
                                buttons.forEach((btn, idx) => {
                                    const rating = parseInt(btn.dataset.rating);
                                    
                                    btn.addEventListener('mouseenter', () => renderStars(buttons, rating, name === 'overall'));
                                    btn.addEventListener('mouseleave', () => renderStars(buttons, ratings[name], name === 'overall'));
                                    btn.addEventListener('click', () => {
                                        ratings[name] = rating;
                                        renderStars(buttons, rating, name === 'overall');
                                        if(valDisplay) {
                                            valDisplay.textContent = rating + '/5';
                                            valDisplay.classList.add('text-slate-900', 'font-bold');
                                        }
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
                                    if (isOverall) activeClass = 'text-amber-500';

                                    if (isActive) {
                                        btn.classList.add(activeClass);
                                        btn.classList.remove('text-gray-200', 'text-gray-300');
                                    } else {
                                        btn.classList.remove(activeClass);
                                        btn.classList.add(isOverall ? 'text-gray-300' : 'text-gray-200');
                                    }
                                });

                                if (isOverall && overallText) {
                                    const labels = ['Poor', 'Fair', 'Average', 'Good', 'Excellent'];
                                    overallText.textContent = activeRating > 0 ? labels[activeRating - 1] : '';
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

                            // NPS (Segmented Control style)
                            const npsDisplay = document.querySelector(`.nps-display-${event.id}`);
                            npsBtns.forEach(btn => {
                                btn.addEventListener('click', () => {
                                    ratings.nps = parseInt(btn.dataset.value);
                                    npsBtns.forEach(b => {
                                        b.classList.remove('bg-blue-600', 'text-white', 'font-bold');
                                        b.classList.add('hover:bg-blue-50', 'text-gray-400');
                                    });
                                    btn.classList.remove('hover:bg-blue-50', 'text-gray-400');
                                    btn.classList.add('bg-blue-600', 'text-white', 'font-bold');
                                    
                                    npsDisplay.textContent = ratings.nps;
                                    npsDisplay.classList.remove('hidden');
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
                                submitBtn.innerHTML = '<span class="animate-spin">↻</span>';

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
                                        submitBtn.innerHTML = '✓';
                                        submitBtn.classList.replace('bg-slate-900', 'bg-green-600');
                                        setTimeout(() => loadMyFeedback(), 800);
                                    } else {
                                        throw new Error(data.error || 'Submission failed');
                                    }
                                } catch (err) {
                                    alert(err.message);
                                    submitBtn.disabled = false;
                                    submitBtn.textContent = 'Submit Review';
                                }
                            });
                             // Skip feedback
                            document.querySelector(`.skip-btn-${event.id}`).addEventListener('click', () => {
                                if (confirm('Skip this feedback?')) {
                                    const feedbackForm = document.querySelector(`.feedback-form-${event.id}`).closest('.mb-6');
                                    if (feedbackForm) feedbackForm.remove();
                                    if (document.querySelectorAll('[class*="feedback-form-"]').length === 0) loadMyFeedback();
                                }
                            });
                        });"""

with open(FILE_PATH, 'r') as f:
    lines = f.readlines()

# Verify markers
# Start: Line 721 (index 720) "                        // Professional Feedback Card"
# End: Line 1087 (index 1086) "                        });"
# We want to replace this entire block.

START_INDEX = 720
END_INDEX = 1086

start_line_content = lines[START_INDEX].strip()
end_line_content = lines[END_INDEX].strip()

print(f"Checking line {START_INDEX + 1}: '{start_line_content}'")
print(f"Checking line {END_INDEX + 1}: '{end_line_content}'")

# Simple validation to ensure we are replacing the right block
if "Professional Feedback Card" not in start_line_content:
    print("WARNING: Start line does not match expected marker.")
if "});" not in end_line_content:
     print("WARNING: End line does not match expected marker.")

if not NEW_CONTENT.endswith('\n'):
    NEW_CONTENT += '\n'

new_lines = lines[:START_INDEX] + [NEW_CONTENT] + lines[END_INDEX + 1:]

with open(FILE_PATH, 'w') as f:
    f.writelines(new_lines)

print("SUCCESS: Compact Professional feedback form applied.")
