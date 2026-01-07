// SmartBudgetBreakdown Component - Reusable budget management with Chart.js
const { useState, useEffect, useRef } = React;

window.SmartBudgetBreakdown = function SmartBudgetBreakdown({ budgetData, onUpdate, onBudgetUpdate }) {
  const [totalBudget, setTotalBudget] = useState(budgetData?.totalBudget || 0);
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
    const categories = budgetData.categories || [];
    const isEmpty = categories.length === 0;
    const hasZeroTotal = budgetData.totalBudget === 0 || budgetData.totalBudget === null;
    const chartLabels = isEmpty ? ['Empty'] : categories;
    const chartData = isEmpty ? [100] : (hasZeroTotal ? categories.map(() => 1) : (budgetData.percentages || []));
    const chartColors = isEmpty ? ['#d1d5db'] : colors.slice(0, categories.length);

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
              label: function (context) {
                if (isEmpty) return '';
                const label = context.label || '';
                const value = budgetData.breakdown[label]?.amount || 0;
                const percentage = budgetData.breakdown[label]?.percentage || 0;
                return `${label}: ₱${value.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '75%',
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [budgetData, budgetData?.categories, budgetData?.percentages, budgetData?.totalBudget]);

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
    const updatedBreakdown = { ...budgetData.breakdown };

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

  const updateCategory = (index, field, value) => {
    const category = budgetData.categories[index];
    const updatedBreakdown = { ...budgetData.breakdown };

    if (field === 'name') {
      // Rename category
      const oldName = category;
      const newName = value; // Keep the value as-is, no trim (allow empty for placeholder)

      if (oldName === newName) return; // No change
      if (budgetData.categories.includes(newName) && newName !== oldName) {
        alert('Category already exists!');
        return;
      }

      // Update category name in breakdown
      updatedBreakdown[newName] = updatedBreakdown[oldName];
      delete updatedBreakdown[oldName];

      const updatedCategories = [...budgetData.categories];
      updatedCategories[index] = newName;

      const updatedData = {
        ...budgetData,
        categories: updatedCategories,
        breakdown: updatedBreakdown
      };

      onUpdate(updatedData);
      if (onBudgetUpdate) onBudgetUpdate(updatedData);
    } else if (field === 'amount') {
      // Allow empty string, otherwise parse as integer
      const amount = value === '' ? 0 : (parseInt(value) || 0);
      updatedBreakdown[category].amount = amount;

      // Recalculate total and percentages
      const newTotalBudget = Object.values(updatedBreakdown).reduce((sum, item) => sum + (item.amount || 0), 0);
      Object.keys(updatedBreakdown).forEach(cat => {
        updatedBreakdown[cat].percentage = newTotalBudget > 0 ? Math.round((updatedBreakdown[cat].amount / newTotalBudget) * 100) : 0;
      });

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
    }
  };

  const addCategory = () => {
    // Find a unique empty key by checking existing keys
    let newCategoryName = '';
    let suffix = '';
    while (budgetData.categories.includes(newCategoryName)) {
      suffix = suffix === '' ? '1' : (parseInt(suffix) + 1).toString();
      newCategoryName = suffix;
    }

    const updatedCategories = [...budgetData.categories, newCategoryName];
    const updatedBreakdown = {
      ...budgetData.breakdown,
      [newCategoryName]: { amount: 0, percentage: 0 }
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
  };

  const removeCategory = (category) => {
    if (budgetData.categories.length <= 1) {
      alert('Cannot remove the last category!');
      return;
    }

    const updatedCategories = budgetData.categories.filter(cat => cat !== category);
    const updatedBreakdown = { ...budgetData.breakdown };
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
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Simple header matching Event Timeline */}
      <div className="bg-slate-100 px-4 py-3 border-b border-slate-200">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Budget Breakdown
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600">Total:</span>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-700 font-semibold text-xs">₱</span>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => handleTotalBudgetChange(e.target.value)}
                className="pl-5 pr-2 w-24 text-right text-sm font-semibold text-emerald-700 border border-slate-300 rounded px-2 py-1 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none bg-white"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 bg-gradient-to-b from-slate-50 to-white">

        {/* Main Content: Split Grid */}
        <div className="flex-1 grid grid-cols-[35%_65%] gap-4 min-h-0 overflow-hidden">

          {/* Left: Chart (Centered & constrained) */}
          <div className="relative flex items-center justify-center h-full max-h-[160px]">
            <>
              <canvas ref={chartRef}></canvas>
              {/* Center Text */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-xs text-gray-300 font-bold">{(budgetData.categories || []).length === 0 ? '0%' : '100%'}</span>
              </div>
            </>
          </div>

          {/* Right: Scrollable Inputs List (Compact Rows) */}
          <div className="overflow-y-auto pr-2 h-full">
            <div className="flex flex-col gap-2">
              {/* Existing categories */}
              {(budgetData.categories || []).map((cat, idx) => {
                const item = budgetData.breakdown[cat] || { amount: 0 };
                const percent = budgetData.percentages[idx] || 0;
                const color = colors[idx % colors.length];

                return (
                  <div key={idx} className="group flex items-center justify-between py-1.5 border-b border-gray-50 hover:bg-gray-50 transition-colors rounded px-1">

                    {/* Label Part - Editable */}
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }}></div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <input
                          type="text"
                          value={cat}
                          onChange={(e) => updateCategory(idx, 'name', e.target.value)}
                          placeholder="Enter category name (e.g., Food, Venue)"
                          className="text-xs font-semibold text-slate-700 truncate bg-transparent border-0 outline-none px-0 py-0 w-full placeholder:text-slate-400 placeholder:font-normal"
                        />
                        <span className="text-[10px] text-slate-400">{percent}%</span>
                      </div>
                    </div>

                    {/* Input Part with Delete Button */}
                    <div className="flex items-center gap-1">
                      <div className="relative w-24 flex-shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₱</span>
                        <input
                          type="number"
                          value={item.amount || ''}
                          onChange={(e) => updateCategory(idx, 'amount', e.target.value)}
                          placeholder="0"
                          className="w-full pl-5 pr-2 py-1 bg-gray-50 border border-transparent hover:border-gray-200 focus:border-blue-400 focus:bg-white rounded text-xs font-medium text-right outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>
                      <button
                        onClick={() => removeCategory(cat)}
                        disabled={(budgetData.categories || []).length <= 1}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Add Category Button */}
            <div className="mt-3">
              <button
                onClick={addCategory}
                className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 border border-gray-300 hover:border-gray-400 rounded-lg text-gray-700 hover:text-gray-900 font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Category
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
