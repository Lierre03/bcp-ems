// SmartBudgetBreakdown Component - Reusable budget management with Chart.js
const { useState, useEffect, useRef } = React;

window.SmartBudgetBreakdown = function SmartBudgetBreakdown({ budgetData, onUpdate, onBudgetUpdate }) {
  const [totalBudget, setTotalBudget] = useState(budgetData?.totalBudget || 0);
  const [newCategoryName, setNewCategoryName] = useState('');
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Define colors outside useEffect so we can use them in the list view too
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

  useEffect(() => {
    setTotalBudget(budgetData?.totalBudget || 0);
  }, [budgetData]);

  useEffect(() => {
    if (!budgetData || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const ctx = chartRef.current.getContext('2d');
    
    // Use gray for empty state, actual colors for data
    const isEmpty = budgetData.categories.length === 0;
    const chartLabels = isEmpty ? ['Empty'] : budgetData.categories;
    const chartData = isEmpty ? [100] : budgetData.percentages;
    const chartColors = isEmpty ? ['#d1d5db'] : colors.slice(0, budgetData.categories.length);
    
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: chartLabels,
        datasets: [{
          data: chartData,
          backgroundColor: chartColors,
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        if (isEmpty) return '';
                        const label = context.label || '';
                        const value = context.raw || 0;
                        const total = context.chart._metasets[context.datasetIndex].total;
                        const percentage = Math.round((value / total) * 100) + '%';
                        return `${label}: ${percentage}`;
                    }
                }
            }
        },
        cutout: '75%',
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
    // Update percentages array to match the breakdown
    const newPercentages = budgetData.categories.map(cat => updatedBreakdown[cat].percentage);
    const updatedData = {
      ...budgetData,
      totalBudget: total,
      breakdown: updatedBreakdown,
      percentages: newPercentages
    };
    onUpdate(updatedData);
    if (onBudgetUpdate) onBudgetUpdate(updatedData);
  };

  const handleAmountChange = (category, newAmount) => {
    const amount = parseInt(newAmount) || 0;
    const updatedBreakdown = {...budgetData.breakdown};

    // Update the amount for this category
    updatedBreakdown[category] = {
      ...updatedBreakdown[category],
      amount: amount
    };

    // Calculate new total budget as sum of all amounts
    const newTotalBudget = Object.values(updatedBreakdown).reduce((sum, item) => sum + (item.amount || 0), 0);

    // Recalculate percentages for all categories based on new total
    Object.keys(updatedBreakdown).forEach(cat => {
      updatedBreakdown[cat].percentage = newTotalBudget > 0 ? Math.round((updatedBreakdown[cat].amount / newTotalBudget) * 100) : 0;
    });

    // Update percentages array
    const newPercentages = budgetData.categories.map(cat => updatedBreakdown[cat].percentage);

    const updatedData = {
      ...budgetData,
      totalBudget: newTotalBudget,
      breakdown: updatedBreakdown,
      percentages: newPercentages
    };

    setTotalBudget(newTotalBudget);
    onUpdate(updatedData);
    if (onBudgetUpdate) onBudgetUpdate(updatedData);
  };

  const addCategory = () => {
    if (!newCategoryName.trim()) return;
    
    // Check if category already exists
    if (budgetData.categories.includes(newCategoryName.trim())) {
      alert('Category already exists!');
      return;
    }

    const updatedCategories = [...budgetData.categories, newCategoryName.trim()];
    const updatedBreakdown = {
      ...budgetData.breakdown,
      [newCategoryName.trim()]: { amount: 0, percentage: 0 }
    };
    const updatedPercentages = [...budgetData.percentages, 0];

    const updatedData = {
      ...budgetData,
      categories: updatedCategories,
      breakdown: updatedBreakdown,
      percentages: updatedPercentages
    };

    onUpdate(updatedData);
    if (onBudgetUpdate) onBudgetUpdate(updatedData);
    setNewCategoryName('');
  };

  const removeCategory = (category) => {
    if (budgetData.categories.length <= 1) {
      alert('Cannot remove the last category!');
      return;
    }

    const updatedCategories = budgetData.categories.filter(cat => cat !== category);
    const updatedBreakdown = {...budgetData.breakdown};
    delete updatedBreakdown[category];

    // Recalculate total and percentages
    const newTotalBudget = Object.values(updatedBreakdown).reduce((sum, item) => sum + (item.amount || 0), 0);
    
    Object.keys(updatedBreakdown).forEach(cat => {
      updatedBreakdown[cat].percentage = newTotalBudget > 0 ? Math.round((updatedBreakdown[cat].amount / newTotalBudget) * 100) : 0;
    });

    const updatedPercentages = updatedCategories.map(cat => updatedBreakdown[cat].percentage);

    const updatedData = {
      ...budgetData,
      totalBudget: newTotalBudget,
      categories: updatedCategories,
      breakdown: updatedBreakdown,
      percentages: updatedPercentages
    };

    setTotalBudget(newTotalBudget);
    onUpdate(updatedData);
    if (onBudgetUpdate) onBudgetUpdate(updatedData);
  };

  if (!budgetData) return null;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Add Category Input */}
      <div className="flex-shrink-0 mb-3">
        <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Budget Management</span>
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
      </div>

      {/* Main Content: Split Grid */}
      <div className="flex-1 grid grid-cols-[35%_65%] gap-4 min-h-0 overflow-hidden">
        
        {/* Left: Chart (Centered & constrained) */}
        <div className="relative flex items-center justify-center h-full max-h-[160px]">
           <>
             <canvas ref={chartRef}></canvas>
             {/* Center Text */}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
               <span className="text-xs text-gray-300 font-bold">{budgetData.categories.length === 0 ? '0%' : '100%'}</span>
             </div>
           </>
        </div>

        {/* Right: Scrollable Inputs List (Compact Rows) */}
        <div className="overflow-y-auto pr-2 h-full">
            {budgetData.categories.length === 0 ? (
              <div className="flex flex-col gap-2">
                {/* Template row showing input format */}
                <div className="flex items-center justify-between py-1.5 border-b border-gray-50 hover:bg-gray-50 transition-colors rounded px-1">
                    {/* Label Part - Category name input */}
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-300"></div>
                        <input 
                          type="text" 
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              addCategory();
                            }
                          }}
                          placeholder="Category name"
                          className="flex-1 px-2 py-0 text-xs border-0 bg-transparent outline-none placeholder-gray-400"
                        />
                        <span className="text-[10px] text-slate-400 ml-1">0%</span>
                    </div>

                    {/* Amount Input */}
                    <div className="flex items-center gap-1">
                      <div className="relative w-24 flex-shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₱</span>
                        <input 
                          type="number" 
                          placeholder="0"
                          className="w-full pl-5 pr-2 py-1 bg-gray-50 border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white rounded text-xs font-medium text-right outline-none transition-all"
                        />
                      </div>
                    </div>
                </div>

                {/* Add button */}
                <button
                  onClick={addCategory}
                  className="w-full px-3 py-1 text-xs font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </button>
              </div>
            ) : (
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

                          {/* Input Part with Delete Button */}
                          <div className="flex items-center gap-1">
                            <div className="relative w-24 flex-shrink-0">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₱</span>
                              <input 
                                type="number" 
                                value={item.amount} 
                                onChange={(e) => handleAmountChange(cat, e.target.value)}
                                className="w-full pl-5 pr-2 py-1 bg-gray-50 border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white rounded text-xs font-medium text-right outline-none transition-all"
                              />
                            </div>
                            <button
                              onClick={() => removeCategory(cat)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all"
                              title="Remove category"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                      </div>
                    );
                })}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
