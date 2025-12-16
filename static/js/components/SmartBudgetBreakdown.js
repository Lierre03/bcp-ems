// SmartBudgetBreakdown Component - Reusable budget management with Chart.js
window.SmartBudgetBreakdown = function SmartBudgetBreakdown({ budgetData, onUpdate, onBudgetUpdate }) {
  const [editMode, setEditMode] = React.useState(false);
  const [editValues, setEditValues] = React.useState({});
  const [totalBudget, setTotalBudget] = React.useState(budgetData?.totalBudget || 0);
  const [validationWarning, setValidationWarning] = React.useState('');
  const chartRef = React.useRef(null);
  const chartInstance = React.useRef(null);

  React.useEffect(() => {
    setTotalBudget(budgetData?.totalBudget || 0);
  }, [budgetData]);

  React.useEffect(() => {
    if (!budgetData || !chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();
    const ctx = chartRef.current.getContext('2d');
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: budgetData.categories,
        datasets: [{
          data: budgetData.percentages,
          backgroundColor: colors.slice(0, budgetData.categories.length),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } } }
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

  const startEdit = () => {
    const vals = {};
    Object.keys(budgetData.breakdown).forEach(cat => {
      vals[cat] = budgetData.breakdown[cat].amount;
    });
    setEditValues(vals);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditValues({});
    setValidationWarning('');
  };

  const saveEdit = () => {
    const total = Object.values(editValues).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
    if (Math.abs(total - totalBudget) > 1) {
      setValidationWarning(`Total (${total}) doesn't match budget (${totalBudget})`);
      return;
    }
    const updatedBreakdown = {...budgetData.breakdown};
    Object.keys(editValues).forEach(cat => {
      const amount = parseInt(editValues[cat]) || 0;
      updatedBreakdown[cat] = {
        ...updatedBreakdown[cat],
        amount: amount,
        percentage: Math.round((amount / totalBudget) * 100)
      };
    });
    const updatedData = {...budgetData, breakdown: updatedBreakdown};
    onUpdate(updatedData);
    if (onBudgetUpdate) onBudgetUpdate(updatedData);
    setEditMode(false);
    setEditValues({});
    setValidationWarning('');
  };

  if (!budgetData) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 border-b border-emerald-700">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Budget Breakdown
        </h3>
      </div>
      <div className="p-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="mb-3 pb-3 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-600 font-medium">Total Budget</span>
            <input 
              type="number" 
              value={totalBudget} 
              onChange={(e) => handleTotalBudgetChange(e.target.value)}
              className="text-lg font-bold text-emerald-600 bg-transparent border-b border-emerald-300 focus:border-emerald-500 outline-none w-28 text-right"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <canvas ref={chartRef} className="max-w-full"></canvas>
          </div>
          <div className="space-y-2">
            {budgetData.categories.map((cat, idx) => (
              <div key={cat} className="bg-white border border-slate-200 rounded p-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-semibold text-slate-700">{cat}</span>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{budgetData.percentages[idx]}%</span>
                </div>
                <input 
                  type="number" 
                  value={budgetData.breakdown[cat]?.amount || 0} 
                  onChange={(e) => handleAmountChange(cat, e.target.value)}
                  className="w-full px-2 py-1 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
