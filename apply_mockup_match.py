
import os

FILE_PATH = '/home/ivy/Documents/School-Event-Management-Commision/rebuild/templates/student.html'

# The Pixel-Perfect Mockup Match
# Changes:
# - Header: Dark Slate/Blue with specific hierarchy.
# - Grid: 3 Columns corresponding to Mockup (Logistics, Content, Facilities).
# - Item Row: Label left, Stars left-aligned under or beside.
# - Footer: Gray background (#f1f5f9) with specific layout for Overall & NPS.

NEW_CONTENT = r"""                        // Mockup-Matched Professional Evaluation
                        pendingData.pending_events.forEach(event => {
                            const feedbackForm = document.createElement('div');
                            feedbackForm.className = 'bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden mb-8 font-sans';
                            feedbackForm.innerHTML = `
                                <!-- Header -->
                                <div class="bg-slate-800 px-6 py-4 flex justify-between items-center text-white border-b border-slate-700">
                                    <div>
                                        <div class="flex items-center gap-3">
                                            <span class="text-xs font-bold text-blue-200 border border-blue-400/30 px-1.5 py-0.5 rounded uppercase tracking-wider">Event Feedback</span>
                                            <h4 class="text-lg font-semibold tracking-tight text-white">${event.name}</h4>
                                        </div>
                                        <div class="flex gap-3 text-xs text-slate-400 mt-1 pl-[108px]">
                                            <span class="border-r border-slate-600 pr-3">Date: ${new Date(event.start_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                            <span>Location: ${event.venue}</span>
                                        </div>
                                    </div>
                                </div>

                                <form class="feedback-form-${event.id}">
                                    <!-- 3-Column Grid -->
                                    <div class="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200 bg-white">
                                        
                                        <!-- COL 1: LOGISTICS -->
                                        <div class="p-5">
                                            <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">LOGISTICS</h5>
                                            
                                            <div class="space-y-6">
                                                <!-- Registration -->
                                                <div>
                                                    <div class="flex justify-between mb-1">
                                                        <label class="text-sm font-medium text-slate-700">Registration Process</label>
                                                        <span class="text-xs font-bold text-slate-400 reg-val-${event.id}"></span>
                                                    </div>
                                                    <div class="flex gap-1" id="reg-stars-${event.id}">
                                                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="reg-star-${event.id} text-slate-300 hover:text-slate-500 transition-colors" data-rating="${n}"><svg class="w-6 h-6 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></button>`).join('')}
                                                    </div>
                                                </div>

                                                <!-- Organization (Timeliness) -->
                                                <div>
                                                    <div class="flex justify-between mb-1">
                                                        <label class="text-sm font-medium text-slate-700">Timeliness & Organization</label>
                                                        <span class="text-xs font-bold text-slate-400 org-val-${event.id}"></span>
                                                    </div>
                                                    <div class="flex gap-1" id="org-stars-${event.id}">
                                                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="org-star-${event.id} text-slate-300 hover:text-slate-500 transition-colors" data-rating="${n}"><svg class="w-6 h-6 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></button>`).join('')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- COL 2: CONTENT -->
                                        <div class="p-5">
                                            <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">CONTENT</h5>
                                            
                                            <div class="space-y-6">
                                                <!-- Speaker -->
                                                <div>
                                                    <div class="flex justify-between mb-1">
                                                        <label class="text-sm font-medium text-slate-700">Keynote Speakers</label>
                                                        <span class="text-xs font-bold text-slate-400 speaker-val-${event.id}"></span>
                                                    </div>
                                                    <div class="flex gap-1" id="speaker-stars-${event.id}">
                                                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="speaker-star-${event.id} text-slate-300 hover:text-slate-500 transition-colors" data-rating="${n}"><svg class="w-6 h-6 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></button>`).join('')}
                                                    </div>
                                                </div>

                                                <!-- Content Relevance -->
                                                <div>
                                                    <div class="flex justify-between mb-1">
                                                        <label class="text-sm font-medium text-slate-700">Relevance of Topics</label>
                                                        <span class="text-xs font-bold text-slate-400 content-val-${event.id}"></span>
                                                    </div>
                                                    <div class="flex gap-1" id="content-stars-${event.id}">
                                                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="content-star-${event.id} text-slate-300 hover:text-slate-500 transition-colors" data-rating="${n}"><svg class="w-6 h-6 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></button>`).join('')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- COL 3: FACILITIES -->
                                        <div class="p-5">
                                            <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-2">FACILITIES</h5>
                                            
                                            <div class="space-y-6">
                                                <!-- Venue -->
                                                <div>
                                                    <div class="flex justify-between mb-1">
                                                        <label class="text-sm font-medium text-slate-700">Venue Comfort</label>
                                                        <span class="text-xs font-bold text-slate-400 venue-val-${event.id}"></span>
                                                    </div>
                                                    <div class="flex gap-1" id="venue-stars-${event.id}">
                                                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="venue-star-${event.id} text-slate-300 hover:text-slate-500 transition-colors" data-rating="${n}"><svg class="w-6 h-6 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></button>`).join('')}
                                                    </div>
                                                </div>

                                                <!-- Activities / Amenities -->
                                                <div>
                                                    <div class="flex justify-between mb-1">
                                                        <label class="text-sm font-medium text-slate-700">Overall Activities</label>
                                                        <span class="text-xs font-bold text-slate-400 activities-val-${event.id}"></span>
                                                    </div>
                                                    <div class="flex gap-1" id="activities-stars-${event.id}">
                                                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="activities-star-${event.id} text-slate-300 hover:text-slate-500 transition-colors" data-rating="${n}"><svg class="w-6 h-6 drop-shadow-sm" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></button>`).join('')}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Footer: OVERALL SATISFACTION & NPS -->
                                    <div class="bg-gray-200/80 border-t border-gray-300 p-6">
                                        <div class="flex items-center gap-2 mb-4">
                                            <h5 class="text-xs font-bold text-slate-800 uppercase tracking-widest">OVERALL SATISFACTION & NPS</h5>
                                        </div>
                                        
                                        <div class="flex flex-col md:flex-row gap-10">
                                            
                                            <!-- Overall Rating -->
                                            <div class="flex items-center gap-4">
                                                <div>
                                                    <div class="text-xs font-bold text-slate-500 mb-1">OVERALL RATING</div>
                                                    <div class="flex gap-1" id="overall-stars-${event.id}">
                                                        ${[1, 2, 3, 4, 5].map(n => `<button type="button" class="overall-star-${event.id} text-slate-400 hover:text-slate-600 transition-transform active:scale-95" data-rating="${n}"><svg class="w-10 h-10 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></button>`).join('')}
                                                    </div>
                                                </div>
                                                <div class="text-4xl font-bold text-slate-700 overall-display-${event.id}">0.0</div>
                                            </div>

                                            <!-- NPS Separator -->
                                            <div class="hidden md:block w-px bg-gray-300 h-16 self-center"></div>

                                            <!-- NPS -->
                                            <div class="flex-1">
                                                <div class="flex justify-between items-center mb-2">
                                                    <div>
                                                        <div class="text-xs font-bold text-slate-800">NPS</div>
                                                        <div class="text-[10px] text-slate-500">How likely are you to recommend this event?</div>
                                                    </div>
                                                    <div class="text-xs font-bold text-blue-700 nps-display-${event.id} bg-blue-100 px-2 py-0.5 rounded hidden">NPS: -</div>
                                                </div>
                                                
                                                <!-- Custom Slider Track -->
                                                <div class="relative h-2 bg-slate-300 rounded-full mt-2 mb-6 cursor-pointer group nps-track-${event.id}">
                                                    <div class="absolute top-0 left-0 h-full bg-blue-600 rounded-full transition-all duration-300 nps-bar-${event.id}" style="width: 0%"></div>
                                                    <div class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-full shadow-md transition-all duration-300 nps-knob-${event.id}" style="left: 0%"></div>

                                                    <!-- Click Targets -->
                                                    <div class="absolute inset-x-0 -top-2 -bottom-2 flex justify-between z-10">
                                                        ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<div class="flex-1 cursor-pointer " data-nps="${n}"></div>`).join('')}
                                                    </div>
                                                </div>
                                                
                                                <div class="flex justify-between text-[9px] font-bold text-slate-400 uppercase -mt-4">
                                                    <span>Not Likely</span>
                                                    <span>Very Likely</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Comments / Submit -->
                                        <div class="mt-6 flex flex-col gap-3">
                                            <textarea class="comments-${event.id} w-full p-3 bg-white border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 shadow-inner" rows="2" placeholder="Additional Feedback (Optional)"></textarea>
                                            
                                            <!-- Hidden Logic Fields -->
                                            <textarea class="hidden takeaways-${event.id}"></textarea>
                                            <input type="checkbox" class="hidden future-check-${event.id}">

                                            <div class="flex justify-end gap-3 pt-2">
                                                 <button type="button" class="skip-btn-${event.id} px-4 py-2 text-xs font-bold text-slate-500 uppercase hover:bg-gray-300 rounded transition-colors">Cancel</button>
                                                 <button type="submit" disabled class="submit-feedback-btn-${event.id} px-6 py-2 bg-slate-700 text-white text-xs font-bold uppercase rounded hover:bg-slate-800 shadow-md transition-all disabled:opacity-50 disabled:shadow-none">Submit Feedback</button>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            `;
                            pendingContainer.appendChild(feedbackForm);
                        });

                        // Logic
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

                            const submitBtn = document.querySelector(`.submit-feedback-btn-${event.id}`);
                            const overallDisplay = document.querySelector(`.overall-display-${event.id}`);

                            const checkValidity = () => {
                                if (ratings.overall > 0) submitBtn.disabled = false;
                            };

                            // Star Logic
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
                                            valDisplay.textContent = rating + '.0/5 - 90%';
                                        }
                                        if (name === 'overall' && overallDisplay) {
                                            overallDisplay.textContent = rating + '.0';
                                        }
                                        checkValidity();
                                    });
                                });
                            };

                            const renderStars = (buttons, activeRating, isOverall) => {
                                buttons.forEach((btn, idx) => {
                                    const rating = idx + 1;
                                    const isActive = rating <= activeRating;
                                    if (isActive) {
                                        btn.classList.add('text-slate-500'); 
                                        btn.classList.remove('text-slate-300', 'text-slate-400');
                                    } else {
                                        btn.classList.remove('text-slate-500');
                                        btn.classList.add(isOverall ? 'text-slate-400' : 'text-slate-300');
                                    }
                                });
                            };

                            // NPS Slider Logic
                            const npsTrack = document.querySelector(`.nps-track-${event.id}`);
                            const npsBar = document.querySelector(`.nps-bar-${event.id}`);
                            const npsKnob = document.querySelector(`.nps-knob-${event.id}`);
                            const npsDisplay = document.querySelector(`.nps-display-${event.id}`);
                            
                            // Hit targets
                            form.querySelectorAll('[data-nps]').forEach(target => {
                                target.addEventListener('click', () => {
                                    const val = parseInt(target.dataset.nps);
                                    ratings.nps = val;
                                    const percent = val * 10;
                                    npsBar.style.width = percent + '%';
                                    npsKnob.style.left = percent + '%';
                                    
                                    npsDisplay.textContent = `NPS: ${val}`;
                                    npsDisplay.classList.remove('hidden');
                                });
                            });

                            // Setup 
                            setupStars('overall', 'overall-star');
                            setupStars('venue', 'venue-star');
                            setupStars('activities', 'activities-star');
                            setupStars('org', 'org-star');
                            setupStars('speaker', 'speaker-star');
                            setupStars('content', 'content-star');
                            setupStars('reg', 'reg-star');

                            // Submit
                            form.addEventListener('submit', async (e) => {
                                e.preventDefault();
                                
                                if (ratings.overall === 0) {
                                    alert('Overall Rating Required');
                                    return;
                                }

                                submitBtn.disabled = true;
                                submitBtn.innerText = 'Submitting...';

                                const payload = {
                                    overall_rating: ratings.overall,
                                    venue_rating: ratings.venue || null,
                                    activities_rating: ratings.activities || null,
                                    organization_rating: ratings.org || null,
                                    registration_process: ratings.reg || null,
                                    speaker_effectiveness: ratings.speaker || null,
                                    content_relevance: ratings.content || null,
                                    net_promoter_score: ratings.nps,
                                    key_takeaways: 'Generated via Mockup UI',
                                    comments: document.querySelector(`.comments-${event.id}`).value,
                                    future_interest: false
                                };

                                try {
                                    const res = await fetch(`/api/feedback/submit/${event.id}`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(payload)
                                    });
                                    if (res.ok) {
                                        submitBtn.innerText = 'Submitted';
                                        setTimeout(() => loadMyFeedback(), 500);
                                    } else {
                                        submitBtn.disabled = false;
                                        alert('Failed');
                                    }
                                } catch (e) {
                                    console.error(e);
                                    submitBtn.disabled = false;
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

START_INDEX = 720
END_INDEX = 1109 # Adjusted for previous length

start_line_content = lines[START_INDEX].strip()

# Flexible finder for end index
found_end = False
for i in range(START_INDEX, len(lines)):
    if "});" in lines[i] and i > 1000: # Approximate area
        END_INDEX = i
        found_end = True
        break

print(f"Replacing from line {START_INDEX+1} to {END_INDEX+1}")

if not NEW_CONTENT.endswith('\n'):
    NEW_CONTENT += '\n'

new_lines = lines[:START_INDEX] + [NEW_CONTENT] + lines[END_INDEX + 1:]

with open(FILE_PATH, 'w') as f:
    f.writelines(new_lines)

print("SUCCESS: Mockup Matched.")
