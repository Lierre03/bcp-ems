// SmartBudgetBreakdown Component - Reusable budget management with Chart.js
const { useState, useEffect, useRef } = React;

window.SmartBudgetBreakdown = function SmartBudgetBreakdown({ budgetData, onUpdate, onBudgetUpdate }) {
  const [totalBudget, setTotalBudget] = useState(budgetData?.totalBudget || 0);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Define colors outside useEffect so we can use them in the list view too
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    setTotalBudget(budgetData?.totalBudget || 0);
  }, [budgetData]);

  useEffect(() => {
    if (!budgetData || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const ctx = chartRef.current.getContext('2d');
    
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: budgetData.categories,
        datasets: [{
          data: budgetData.percentages,
          backgroundColor: colors.slice(0, budgetData.categories.length),
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // Allow chart to fit the container
        plugins: { 
            // HIDE the default legend to save massive vertical space
            // We will use the input list on the right as the legend
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.chart._metasets[context.datasetIndex].total;
                        const percentage = Math.round((value / total) * 100) + '%';
                        return `${label}: ${percentage}`;
                    }
                }
            }
        },
        cutout: '75%', // Thinner ring looks more modern
      }
    });
  }, [budgetData]);

  const handleTotalBudgetChange = (newTotal) => {
    const total = parseInt(newTotal) || budgetData.totalBudget;
    setTotalBudget(total);
    const updatedBreakdown = {};
    Object.keys(budgetData.breakdown).forEach(cat => {
      updatedBreakdown[cat] = {
        ...budgetData.breakdown[cat],
        amount: Math.round((total * budgetData.breakdown[cat].percentage) / 100)
      };
    });
    const updatedData = {...budgetData, totalBudget: total, breakdown: updatedBreakdown};
    onUpdate(updatedData);
    if (onBudgetUpdate) onBudgetUpdate(updatedData);
  };

  const handleAmountChange = (category, newAmount) => {
    const amount = parseInt(newAmount) || 0;
    const updatedBreakdown = {...budgetData.breakdown};
    const newPercentage = Math.round((amount / totalBudget) * 100);
    updatedBreakdown[category] = {
      ...updatedBreakdown[category],
      amount: amount,
      percentage: newPercentage
    };
    const updatedData = {...budgetData, breakdown: updatedBreakdown};
    onUpdate(updatedData);
    if (onBudgetUpdate) onBudgetUpdate(updatedData);
  };

  if (!budgetData) return null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header Row: Label + Total Budget Edit (Compact) */}
      <div className="flex justify-between items-end border-b border-gray-100 pb-2 mb-2 flex-shrink-0">
         <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Allocation Breakdown</span>
         <div className="flex flex-col items-end">
             <span className="text-[10px] text-gray-400 font-bold uppercase">Total Budget</span>
             <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-sm">₱</span>
                <input 
                  type="number" 
                  value={totalBudget} 
                  onChange={(e) => handleTotalBudgetChange(e.target.value)}
                  className="pl-4 w-24 text-right text-sm font-bold text-emerald-600 border-b border-emerald-200 focus:border-emerald-500 outline-none bg-transparent p-0"
                />
             </div>
         </div>
      </div>

      {/* Main Content: Split Grid */}
      <div className="flex-1 grid grid-cols-[35%_65%] gap-4 min-h-0 overflow-hidden">
        
        {/* Left: Chart (Centered & constrained) */}
        <div className="relative flex items-center justify-center h-full max-h-[160px]">
           <canvas ref={chartRef}></canvas>
           {/* Center Text (Optional decorative) */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <span className="text-xs text-gray-300 font-bold">100%</span>
           </div>
        </div>

        {/* Right: Scrollable Inputs List (Compact Rows) */}
        <div className="overflow-y-auto pr-2 h-full">
            <div className="flex flex-col">
              {budgetData.categories.map((cat, idx) => {
                  const item = budgetData.breakdown[cat] || { amount: 0 };
                  const percent = budgetData.percentages[idx] || 0;
                  const color = colors[idx % colors.length];

                  return (
                    <div key={cat} className="group flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors rounded px-1">
                        
                        {/* Label Part */}
                        <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-slate-700 truncate" title={cat}>{cat}</span>
                                <span className="text-[10px] text-slate-400">{percent}%</span>
                            </div>
                        </div>

                        {/* Input Part */}
                        <div className="relative w-24 flex-shrink-0">
                           <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₱</span>
                           <input 
                             type="number" 
                             value={item.amount} 
                             onChange={(e) => handleAmountChange(cat, e.target.value)}
                             className="w-full pl-5 pr-2 py-1 bg-gray-50 border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white rounded text-xs font-medium text-right outline-none transition-all"
                           />
                        </div>
                    </div>
                  );
              })}
            </div>
        </div>
      </div>
    </div>
  );
}