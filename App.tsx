import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  Trash2, 
  Plus, 
  DollarSign, 
  Package, 
  TrendingDown, 
  TrendingUp,
  Target,
  Menu,
  RotateCcw,
  Eraser,
  Edit3,
  Table
} from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

import { INITIAL_STATE, DEFAULT_SCENARIOS } from './constants';
import { FinancialState, CostItem, MaterialItem, ScenarioResult } from './types';
import { ProductionEfficiencyCard } from './components/ProductionEfficiencyCard';
import { MaterialManagerModal } from './components/MaterialManagerModal';

const App: React.FC = () => {
  const [state, setState] = useState<FinancialState>(INITIAL_STATE);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar toggle
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  // --- LOGIC KERNEL START ---

  // Module A Calculations
  const totalDevCost = useMemo(() => 
    state.devCosts.reduce((acc, item) => acc + item.amount, 0), 
  [state.devCosts]);

  const amortPerUnit = useMemo(() => 
    state.amortizationQty > 0 ? totalDevCost / state.amortizationQty : 0, 
  [totalDevCost, state.amortizationQty]);

  // Module B Calculations
  const totalBatchMaterialCost = useMemo(() => 
    state.materials.reduce((acc, item) => acc + item.cost, 0), 
  [state.materials]);

  const effectiveUnits = Math.max(0, state.batchSize - state.wasteCount);
  
  const materialCostPerUnit = effectiveUnits > 0 
    ? totalBatchMaterialCost / effectiveUnits 
    : 0;

  const COGS = materialCostPerUnit + amortPerUnit;

  // Module C Calculations (Scenarios)
  const scenarios: ScenarioResult[] = useMemo(() => {
    return DEFAULT_SCENARIOS.map(defaultScenario => {
      // Find override from state
      const override = state.customScenarios?.find(s => s.id === defaultScenario.id);
      const currentDiscount = override ? override.discountPercent : defaultScenario.discountPercent;

      const netRevenue = state.publicPrice * (1 - currentDiscount);
      const royaltyAmount = netRevenue * state.designerRoyaltyPercent;
      const commissionAmount = netRevenue * defaultScenario.commissionPercent;
      
      const grossMargin = netRevenue - COGS - royaltyAmount - commissionAmount;
      const profit = grossMargin; // Per unit
      
      // BEP: Fixed / Margin per unit
      const breakEvenUnits = grossMargin > 0 
        ? Math.ceil(state.fixedMonthlyExpenses / grossMargin) 
        : Infinity;

      return {
        ...defaultScenario,
        discountPercent: currentDiscount,
        netRevenue,
        grossMargin,
        profit,
        breakEvenUnits,
        isProfitable: profit > 0,
        roi: COGS > 0 ? (profit / COGS) * 100 : 0
      };
    });
  }, [state.publicPrice, state.designerRoyaltyPercent, state.fixedMonthlyExpenses, COGS, state.customScenarios]);

  // Get Direct Sale ROI for display
  const directRoi = useMemo(() => scenarios.find(s => s.id === 'direct')?.roi || 0, [scenarios]);

  // --- LOGIC KERNEL END ---

  // Helpers for inputs
  const updateState = <K extends keyof FinancialState>(key: K, value: FinancialState[K]) => {
    setState(prev => ({ ...prev, [key]: value }));
  };

  const handleDevCostChange = (id: string, field: keyof CostItem, value: string | number) => {
    const newCosts = state.devCosts.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    updateState('devCosts', newCosts);
  };

  const addDevCost = () => {
    const newId = (state.devCosts.length + 1).toString() + Date.now();
    updateState('devCosts', [...state.devCosts, { id: newId, name: 'New Expense', amount: 0 }]);
  };

  const removeDevCost = (id: string) => {
    updateState('devCosts', state.devCosts.filter(i => i.id !== id));
  };

  // Helper to re-calc material costs if batch size changes
  const recalculateMaterials = (currentMaterials: MaterialItem[], newBatchSize: number): MaterialItem[] => {
     return currentMaterials.map(m => {
        // Only recalculate if detailed params exist (qtyPerUnit > 0 or at least defined)
        // We check if qtyPerUnit is a number to be safe
        if (typeof m.qtyPerUnit === 'number' && typeof m.unitCost === 'number') {
            const qty = m.qtyPerUnit;
            const buffer = m.bufferUnits || 0;
            const uCost = m.unitCost;
            
            // If user has set detailed params, we trust them to drive the cost
            // If all are 0, it might be a legacy/manual item, but 0 * 0 is 0, so it's fine.
            // HOWEVER, we want to support manual override. 
            // If qtyPerUnit is 0 AND unitCost is 0, we assume it's manual entry and leave .cost alone?
            // Let's assume: If unitCost > 0 or qtyPerUnit > 0, it's a calculated row.
            if (uCost > 0 || qty > 0) {
                 return {
                     ...m,
                     cost: ((qty * newBatchSize) + buffer) * uCost
                 };
            }
        }
        return m;
     });
  };

  const updateBatchSize = (newSize: number) => {
     const updatedMaterials = recalculateMaterials(state.materials, newSize);
     setState(prev => ({
         ...prev,
         batchSize: newSize,
         materials: updatedMaterials
     }));
  };

  // Legacy manual update (kept for compatibility or quick edits if not using modal)
  const handleMaterialChange = (id: string, field: keyof MaterialItem, value: string | number) => {
    const newMats = state.materials.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    updateState('materials', newMats);
  };

  const addMaterial = () => {
    // When adding manually from sidebar, we just add a row. 
    // It defaults to 0s for detailed fields, so it acts as manual entry.
    const newId = (state.materials.length + 1).toString() + Date.now();
    updateState('materials', [...state.materials, { 
        id: newId, 
        name: 'New Material', 
        cost: 0,
        qtyPerUnit: 0, 
        bufferUnits: 0, 
        unitCost: 0, 
        notes: ''
    }]);
  };

  const removeMaterial = (id: string) => {
    updateState('materials', state.materials.filter(i => i.id !== id));
  };

  const handleScenarioDiscountChange = (id: string, value: string) => {
    const floatVal = parseFloat(value);
    const newPercent = isNaN(floatVal) ? 0 : floatVal / 100;
    
    // Ensure customScenarios exists (safe check)
    const currentScenarios = state.customScenarios || DEFAULT_SCENARIOS.map(s => ({ id: s.id, discountPercent: s.discountPercent }));
    
    const newScenarios = currentScenarios.map(s => 
      s.id === id ? { ...s, discountPercent: newPercent } : s
    );
    
    updateState('customScenarios', newScenarios);
  };

  const handleClearAll = () => {
    setState({
      devCosts: [],
      amortizationQty: 0,
      batchSize: 0,
      wasteCount: 0,
      materials: [],
      publicPrice: 0,
      fixedMonthlyExpenses: 0,
      designerRoyaltyPercent: 0,
      customScenarios: DEFAULT_SCENARIOS.map(s => ({ id: s.id, discountPercent: 0 }))
    });
  };

  const handleResetDefaults = () => {
    setState(INITIAL_STATE);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* Modals */}
      <MaterialManagerModal 
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        materials={state.materials}
        batchSize={state.batchSize}
        onSave={(updatedMaterials) => updateState('materials', updatedMaterials)}
      />

      {/* Mobile Header */}
      <div className="md:hidden bg-indigo-900 text-white p-4 flex justify-between items-center shadow-lg z-20 sticky top-0">
        <div className="font-bold text-lg flex items-center gap-2">
          <Calculator className="w-5 h-5" /> DesignFin
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 rounded hover:bg-indigo-800">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 w-80 bg-white border-r border-slate-200 shadow-xl transform transition-transform duration-300 ease-in-out z-10 overflow-y-auto
        md:relative md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <h1 className="text-xl font-bold text-indigo-900 mb-6 hidden md:flex items-center gap-2">
            <Calculator className="w-6 h-6" /> DesignFin
          </h1>

          {/* Section 1: Development */}
          <section className="mb-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-1">Development (Sunk Costs)</h2>
            <div className="space-y-3">
              {state.devCosts.map((cost) => (
                <div key={cost.id} className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    value={cost.name} 
                    onChange={e => handleDevCostChange(cost.id, 'name', e.target.value)}
                    className="flex-1 text-sm border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1.5 text-xs text-slate-400">$</span>
                    <input 
                      type="number" 
                      value={cost.amount} 
                      onChange={e => handleDevCostChange(cost.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full text-sm border-slate-200 rounded pl-5 py-1 text-right focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50"
                    />
                  </div>
                  <button onClick={() => removeDevCost(cost.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={addDevCost} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
                <Plus className="w-3 h-3" /> Add Development Item
              </button>
              
              <div className="mt-4 bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <label className="text-xs font-semibold text-indigo-900 block mb-1">Amortization Quantity</label>
                <input 
                  type="number" 
                  value={state.amortizationQty}
                  onChange={e => updateState('amortizationQty', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border-indigo-200 rounded px-2 py-1 text-right focus:ring-1 focus:ring-indigo-500 outline-none"
                />
                <div className="text-[10px] text-indigo-500 text-right mt-1">
                  Amortization: {formatCurrency(amortPerUnit)} / unit
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Production */}
          <section className="mb-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-1">Production Run</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Batch Size</label>
                <input 
                  type="number" 
                  value={state.batchSize}
                  onChange={e => updateBatchSize(parseInt(e.target.value) || 0)}
                  className="w-full text-sm border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50"
                />
              </div>
              <div className="opacity-50">
                <label className="text-xs font-medium text-slate-600 block mb-1">Waste (Set in Chart)</label>
                <div className="w-full text-sm border-slate-200 rounded px-2 py-1 bg-slate-100 text-slate-500">
                  {state.wasteCount}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-slate-600">Raw Materials (Batch Total)</label>
                <button 
                    onClick={() => setIsMaterialModalOpen(true)}
                    className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold transition-colors"
                >
                    <Table className="w-3 h-3" /> Detailed Input
                </button>
              </div>
              
              {state.materials.map((mat) => (
                <div key={mat.id} className="flex gap-2 items-center group">
                  <input 
                    type="text" 
                    value={mat.name} 
                    onChange={e => handleMaterialChange(mat.id, 'name', e.target.value)}
                    className="flex-1 text-sm border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50"
                  />
                  <div className="relative w-24">
                    <span className="absolute left-2 top-1.5 text-xs text-slate-400">$</span>
                    <input 
                      type="number" 
                      value={mat.cost} 
                      // If it's a calculated row, we might want to disable manual edit or just warn?
                      // For now, we allow overwrite, but next modal save will revert it.
                      readOnly={(mat.qtyPerUnit > 0 || mat.unitCost > 0)}
                      title={(mat.qtyPerUnit > 0 || mat.unitCost > 0) ? "Calculated from details. Click 'Detailed Input' to edit." : "Manual Entry"}
                      onChange={e => handleMaterialChange(mat.id, 'cost', parseFloat(e.target.value) || 0)}
                      className={`w-full text-sm border-slate-200 rounded pl-5 py-1 text-right focus:ring-1 focus:ring-indigo-500 outline-none ${(mat.qtyPerUnit > 0 || mat.unitCost > 0) ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
                    />
                  </div>
                  <button onClick={() => removeMaterial(mat.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button onClick={addMaterial} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium">
                <Plus className="w-3 h-3" /> Add Manual Cost
              </button>
            </div>
          </section>

          {/* Section 3: Financials */}
          <section className="mb-8">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b pb-1">Financial Parameters</h2>
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Target Public Price (PVP)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-slate-400">$</span>
                    <input 
                      type="number" 
                      value={state.publicPrice}
                      onChange={e => updateState('publicPrice', parseFloat(e.target.value) || 0)}
                      className="w-full border-slate-200 rounded px-3 pl-6 py-2 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800"
                    />
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Fixed Monthly Ops</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-xs text-slate-400">$</span>
                      <input 
                        type="number" 
                        value={state.fixedMonthlyExpenses}
                        onChange={e => updateState('fixedMonthlyExpenses', parseFloat(e.target.value) || 0)}
                        className="w-full text-sm border-slate-200 rounded pl-5 py-1 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50"
                      />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">Royalty %</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        step="0.01"
                        value={state.designerRoyaltyPercent * 100}
                        onChange={e => updateState('designerRoyaltyPercent', (parseFloat(e.target.value) || 0) / 100)}
                        className="w-full text-sm border-slate-200 rounded px-2 py-1 pr-6 text-right focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50"
                      />
                      <span className="absolute right-2 top-1.5 text-xs text-slate-400">%</span>
                    </div>
                 </div>
               </div>
            </div>
          </section>

          {/* Data Actions */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex gap-3">
             <button
               type="button"
               onClick={handleClearAll}
               className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
             >
               <Eraser className="w-4 h-4" /> Clear Data
             </button>
             <button
               type="button"
               onClick={handleResetDefaults}
               className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
             >
               <RotateCcw className="w-4 h-4" /> Reset
             </button>
          </div>
        </div>
      </aside>

      {/* MAIN DASHBOARD */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* TOP CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="text-slate-500 text-xs uppercase font-bold tracking-wide">Development Invest.</div>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-bold text-slate-800">{formatCurrency(totalDevCost)}</span>
                <Package className="text-slate-200 w-8 h-8" />
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Amortized over {state.amortizationQty} units
              </div>
            </div>

            <div className={`bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between relative overflow-hidden
              ${COGS > state.publicPrice ? 'border-red-300 ring-4 ring-red-50' : 'border-slate-200'}
            `}>
              <div className="text-slate-500 text-xs uppercase font-bold tracking-wide flex items-center gap-2">
                True Unit Cost (COGS)
                {COGS > state.publicPrice && <span className="text-red-600 text-[10px] bg-red-100 px-1 rounded font-extrabold animate-pulse">LOSS</span>}
              </div>
              <div className="flex items-end justify-between mt-2">
                <span className={`text-3xl font-bold ${COGS > state.publicPrice ? 'text-red-600' : 'text-slate-800'}`}>
                  {formatCurrency(COGS)}
                </span>
                <DollarSign className={`${COGS > state.publicPrice ? 'text-red-200' : 'text-slate-200'} w-8 h-8`} />
              </div>
              <div className="mt-2 text-xs text-slate-400 flex justify-between">
                <span>Mat: {formatCurrency(materialCostPerUnit)}</span>
                <span>Amort: {formatCurrency(amortPerUnit)}</span>
              </div>
              {/* Progress Bar for Cost vs Price */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
                 <div 
                  className={`h-full ${COGS > state.publicPrice ? 'bg-red-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min((COGS / state.publicPrice) * 100, 100)}%` }} 
                 />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="text-slate-500 text-xs uppercase font-bold tracking-wide">Break-Even (Retail)</div>
              <div className="flex items-end justify-between mt-2">
                <span className="text-3xl font-bold text-slate-800">
                  {scenarios.find(s => s.id === 'retail')?.breakEvenUnits === Infinity 
                    ? '∞' 
                    : scenarios.find(s => s.id === 'retail')?.breakEvenUnits}
                </span>
                <Target className="text-slate-200 w-8 h-8" />
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Units/Month to survive
              </div>
            </div>

            {/* ROI Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="text-slate-500 text-xs uppercase font-bold tracking-wide">ROI (Direct Sale)</div>
              <div className="flex items-end justify-between mt-2">
                <span className={`text-3xl font-bold ${directRoi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {directRoi.toFixed(1)}%
                </span>
                <TrendingUp className="text-slate-200 w-8 h-8" />
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Return on production investment
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: THE DRAMA CARD (WASTE) */}
            <div className="lg:col-span-1">
              <ProductionEfficiencyCard 
                batchSize={state.batchSize}
                wasteCount={state.wasteCount}
                totalBatchMaterialCost={totalBatchMaterialCost}
                amortizationPerUnit={amortPerUnit}
                publicPrice={state.publicPrice}
                onWasteChange={(val) => updateState('wasteCount', val)}
              />
            </div>

            {/* RIGHT: SCENARIO ANALYSIS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Chart */}
              <div className={`bg-white p-6 rounded-xl border border-slate-200 shadow-sm ${COGS > state.publicPrice ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-indigo-600" />
                  Profitability by Channel
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scenarios} layout="vertical" margin={{ left: 40, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        tick={{fontSize: 11, fill: '#64748b'}} 
                        width={100} 
                        interval={0}
                      />
                      <RechartsTooltip 
                        formatter={(val: number) => formatCurrency(val)}
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <ReferenceLine x={0} stroke="#cbd5e1" />
                      <Bar dataKey="profit" radius={[0, 4, 4, 0]} barSize={20}>
                        {scenarios.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.profit > 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* The Survival Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Financial Survival Matrix</h3>
                  <span className="text-xs text-slate-400">Monthly Fixed: {formatCurrency(state.fixedMonthlyExpenses)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs">
                      <tr>
                        <th className="px-6 py-3">Channel</th>
                        <th className="px-6 py-3 text-right">Discount</th>
                        <th className="px-6 py-3 text-right">Net Rev</th>
                        <th className="px-6 py-3 text-right">Profit/Unit</th>
                        <th className="px-6 py-3 text-right bg-indigo-50 text-indigo-700">BEP (Units)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {scenarios.map((scenario) => (
                        <tr 
                          key={scenario.id} 
                          className={`
                            hover:bg-slate-50 transition-colors
                            ${!scenario.isProfitable ? 'bg-red-50 text-red-700' : ''}
                          `}
                        >
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-1.5 h-8 rounded-full shrink-0 ${scenario.isProfitable ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <div className="flex flex-col">
                                <span className="font-medium">{scenario.name}</span>
                                <span className={`text-[10px] font-normal ${!scenario.isProfitable ? 'text-red-500' : 'text-slate-400'}`}>
                                  {scenario.description}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right font-mono text-slate-500">
                             <div className="flex items-center justify-end group">
                                <div className="relative">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={Number((scenario.discountPercent * 100).toFixed(2))}
                                    onChange={(e) => handleScenarioDiscountChange(scenario.id, e.target.value)}
                                    className="w-16 text-right bg-transparent border-b border-transparent group-hover:border-slate-300 focus:border-indigo-600 focus:ring-0 px-0 py-0 text-sm font-mono text-slate-600 outline-none transition-colors"
                                  />
                                  <Edit3 className="w-3 h-3 text-slate-300 absolute -left-4 top-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                </div>
                                <span className="ml-1">%</span>
                             </div>
                            {scenario.commissionPercent > 0 && <span className="text-[10px] block mt-1">+ {(scenario.commissionPercent * 100).toFixed(1)}% comm</span>}
                          </td>
                          <td className="px-6 py-3 text-right font-medium">{formatCurrency(scenario.netRevenue)}</td>
                          <td className={`px-6 py-3 text-right font-bold ${scenario.profit > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatCurrency(scenario.profit)}
                          </td>
                          <td className={`px-6 py-3 text-right font-mono font-bold ${scenario.isProfitable ? 'bg-indigo-50 text-indigo-700' : 'bg-red-100 text-red-700'}`}>
                            {scenario.breakEvenUnits === Infinity ? 'FAIL' : scenario.breakEvenUnits}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;