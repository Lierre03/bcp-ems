// EventTimelineGenerator Component - AI-generated event timeline
window.EventTimelineGenerator = function EventTimelineGenerator({ timelineData }) {
  const [expandedPhase, setExpandedPhase] = React.useState(0);
  if (!timelineData) return null;
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 border-b border-purple-700">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Event Timeline
        </h3>
      </div>
      <div className="p-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="space-y-2">
          {timelineData.timeline.map((phase, idx) => (
            <div key={idx} className="border border-slate-200 rounded overflow-hidden">
              <button onClick={() => setExpandedPhase(expandedPhase === idx ? -1 : idx)} className="w-full px-3 py-2 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-600">{idx + 1}</span>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-700 text-sm">{phase.phase}</p>
                    <p className="text-xs text-slate-600">{phase.startTime} - {phase.endTime}</p>
                  </div>
                </div>
                <svg className={`w-4 h-4 text-slate-600 transition ${expandedPhase === idx ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
              </button>
              {expandedPhase === idx && (
                <div className="p-3 bg-white border-t border-slate-200">
                  <p className="text-xs text-slate-700 mb-2">{phase.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-purple-50 rounded p-2">
                      <p className="text-slate-600">Duration</p>
                      <p className="font-bold text-purple-700">
                        {typeof phase.duration === 'number' ? `${phase.duration} min` : phase.duration}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded p-2">
                      <p className="text-slate-600">Time</p>
                      <p className="font-bold text-purple-700">{phase.startTime}-{phase.endTime}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
