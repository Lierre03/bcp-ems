
import os
import re

FILE_PATH = '/home/ivy/Documents/School-Event-Management-Commision/rebuild/templates/student.html'

def update_ui(file_path):
    with open(file_path, 'r') as f:
        content = f.read()

    # 1. UPDATE STARS TO BLUE
    # Find the renderStars function and change the active class
    # Current: btn.classList.add('text-slate-500'); 
    # Target: btn.classList.add('text-blue-600');
    
    star_pattern = r"(btn\.classList\.add\(')text-slate-500('\);)"
    if re.search(star_pattern, content):
        content = re.sub(star_pattern, r"\1text-blue-600\2", content)
        print("Updated stars to BLUE.")
    else:
        print("WARNING: Could not find star active class definition.")

    # 2. REPLACE NPS SECTION WITH NATIVE RANGE INPUT
    # We will look for the <!-- NPS --> section or the nps-track container and replace it.
    
    # Old HTML Block to find (approximate)
    old_nps_start = '<!-- NPS Separator -->'
    # We will replace from "<!-- NPS Separator -->" down to the end of that flex container
    # Actually, let's target the inner HTML of the NPS column.
    
    # Let's replace the Logic for NPS as well.
    
    # HTML REPLACEMENT
    # The current footer has:
    # <div class="flex flex-col md:flex-row gap-10"> ... <!-- NPS Separator --> ... <!-- NPS --> ... </div>
    
    # We'll regex the whole NPS div wrapper.
    # It starts after <!-- NPS Separator -->
    
    nps_html_pattern = r'(<!-- NPS -->\s+<div class="flex-1">)(.*?)(</div>\s+</div>)'
    
    new_nps_html = r"""<!-- NPS -->
                                            <div class="flex-1">
                                                <div class="flex justify-between items-end mb-4">
                                                    <div>
                                                        <div class="text-sm font-bold text-slate-800">NPS</div>
                                                        <div class="text-xs text-slate-500 mt-0.5">How likely are you to recommend this event?</div>
                                                    </div>
                                                    <div class="nps-value-display-${event.id} bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full hidden">
                                                        NPS: <span class="val"></span>
                                                    </div>
                                                </div>
                                                
                                                <div class="relative w-full h-8 flex items-center">
                                                    <!-- Native Range Input -->
                                                    <input type="range" min="0" max="10" step="1" value="5" class="nps-range-${event.id} w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                                    
                                                    <!-- Custom Track Fill (Dynamic via JS) -->
                                                    <!-- Note: Native input styling for progress is tricky cross-browser, but a simple JS update to background-size works well for WebKit/Firefox standard 'filled' look if we use a gradient -->
                                                </div>

                                                <div class="flex justify-between text-[10px] font-bold text-slate-400 uppercase mt-1">
                                                    <span>Not Likely (0)</span>
                                                    <span>Very Likely (10)</span>
                                                </div>
                                            </div>
                                        </div>"""
    
    # Actually, regexing dotall across strict HTML is risky. 
    # Let's use string replacement for the unique marker we added: `<!-- Custom Slider Track -->`
    
    # Locate the NPS container by markers
    start_marker = '<!-- NPS -->'
    end_marker = '<!-- Comments / Submit -->'
    
    start_idx = content.find(start_marker)
    end_idx = content.find(end_marker)
    
    if start_idx != -1 and end_idx != -1:
        # We need to preserve the closing div of the flex row which is just before "<!-- Comments / Submit -->"
        # The previous structure:
        # <div class="flex ... gap-10">
        #    ... Overall ...
        #    <!-- NPS Separator --> ...
        #    <!-- NPS --> <div class="flex-1"> ... </div>
        # </div>
        # <!-- Comments ... -->
        
        # So we want to replace from <!-- NPS --> up to the closing </div> of that flex-1 div.
        # But wait, identifying the closing div is hard without parsing.
        
        # Simpler approach:
        # Just replace the specific inner block of the slider.
        
        slider_block_start = '<!-- Custom Slider Track -->'
        slider_block_end = '<div class="flex justify-between text-[9px]' 
        
        # We can construct the new Slider HTML + Labels
        new_slider_html = r"""<style>
                                                    /* Dynamic Slider Styling */
                                                    .nps-range-${event.id} {
                                                        -webkit-appearance: none;
                                                        background: transparent;
                                                    }
                                                    .nps-range-${event.id}::-webkit-slider-thumb {
                                                        -webkit-appearance: none;
                                                        height: 20px;
                                                        width: 20px;
                                                        border-radius: 50%;
                                                        background: #ffffff;
                                                        border: 2px solid #2563eb;
                                                        cursor: pointer;
                                                        margin-top: -8px; /* Center thumb */
                                                        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                                                    }
                                                    .nps-range-${event.id}::-webkit-slider-runnable-track {
                                                        width: 100%;
                                                        height: 6px;
                                                        cursor: pointer;
                                                        background: #e2e8f0;
                                                        border-radius: 999px;
                                                    }
                                                </style>
                                                
                                                <div class="relative mt-4 mb-6">
                                                    <input type="range" min="0" max="10" value="0" class="nps-range-${event.id} w-full focus:outline-none" 
                                                        style="background-image: linear-gradient(#2563eb, #2563eb); background-size: 0% 100%; background-repeat: no-repeat;">
                                                </div>"""

        # Replace the header part too to add the value display
        # Header: <div class="flex justify-between items-center mb-2"> ... NPS ... NPS: - ... </div>
        header_old = r'<div class="flex justify-between items-center mb-2">\s+<div>\s+<div class="text-xs font-bold text-slate-800">NPS</div>\s+<div class="text-\[10px\] text-slate-500">How likely are you to recommend this event\?</div>\s+</div>\s+<div class="text-xs font-bold text-blue-700 nps-display-\${event.id} bg-blue-100 px-2 py-0.5 rounded hidden">NPS: -</div>\s+</div>'
        
        header_new = r"""<div class="flex justify-between items-end mb-2">
                                                    <div>
                                                        <div class="text-xs font-bold text-slate-800 uppercase tracking-wider">Net Promoter Score</div>
                                                        <div class="text-[10px] text-slate-500 mt-1">How likely are you to recommend us?</div>
                                                    </div>
                                                    <div class="nps-display-${event.id} bg-blue-50 text-blue-600 text-xs font-bold px-2 py-1 rounded border border-blue-100 hidden">
                                                        NPS: <span class="val"></span>
                                                    </div>
                                                </div>"""
        
        # Apply Regex replacements
        content = re.sub(header_old, header_new, content, flags=re.DOTALL)
        
        # Replace the Custom Slider Track block
        # Find explicit start and end of that block in current file
        # Start: <!-- Custom Slider Track -->
        # End: <!-- Click Targets --> ... </div> </div> (approx)
        
        # Actually, let's look for the specific lines to minimize risk.
        # Lines 860-870 area.
        
        # To avoid Regex complexity on nested divs, we can search/replace the unique strings.
        
        # Target: <div class="relative h-2 bg-slate-300 ... nps-track-${event.id}"> ... </div>
        
        # We'll use a specific unique string to start the replacement
        start_needle = '<div class="relative h-2 bg-slate-300 independent' # Oh wait, class list might vary
        start_needle = '<!-- Custom Slider Track -->'
        
        # And finding the end is tricky.
        # But we know the next sibling is: <div class="flex justify-between text-[9px] ... -mt-4">'
        
        pattern_slider = r'(<!-- Custom Slider Track -->.*?)(<div class="flex justify-between text-\[9px\])'
        
        replacement_slider = new_slider_html + r'\n                                                \2'
        
        content = re.sub(pattern_slider, replacement_slider, content, flags=re.DOTALL)
        
        # Remove the "-mt-4" from labels if we use user-friendly slider
        content = content.replace('uppercase -mt-4', 'uppercase mt-1')
        
    
    # 3. UPDATE JS LOGIC FOR NPS
    # We need to update the event listeners.
    # Old: form.querySelectorAll('[data-nps]').forEach ...
    # New: input event on .nps-range-${event.id}
    
    # Logic Block Replacement
    # Find: // NPS Slider Logic ... (up to) // Setup
    
    js_pattern = r'(// NPS Slider Logic)(.*?)(// Setup)'
    
    new_js_logic = r"""// NPS Slider Logic
                            const npsInput = document.querySelector(`.nps-range-${event.id}`);
                            const npsDisplay = document.querySelector(`.nps-display-${event.id}`);
                            const npsValSpan = npsDisplay ? npsDisplay.querySelector('.val') : null;

                            const updateNPS = () => {
                                const val = parseInt(npsInput.value);
                                ratings.nps = val;
                                
                                // Update Track Fill (visually fill background)
                                const percentage = (val / 10) * 100;
                                npsInput.style.backgroundSize = `${percentage}% 100%`;
                                
                                // Update Display
                                if(npsDisplay) npsDisplay.classList.remove('hidden');
                                if(npsValSpan) npsValSpan.textContent = val;
                            };

                            npsInput.addEventListener('input', updateNPS);
                            // Initialize (but don't set rating yet, or maybe do if user moves it? Range default is usually 5 or 0. Let's start at 0 but require interaction?)
                            // Actually, standard HTML range defaults to mid (5). We should probably set it to 0 or -1?
                            // Let's set initial UI to 0 but require change? 
                            // Or just listen to 'input'.
                            
                            """
    
    content = re.sub(js_pattern, new_js_logic + r'\3', content, flags=re.DOTALL)


    with open(file_path, 'w') as f:
        f.write(content)
    print("Updated NPS Logic to native slider.")

if __name__ == "__main__":
    update_ui(FILE_PATH)
