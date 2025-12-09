import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { AlertTriangle, TrendingUp, AlertOctagon } from 'lucide-react';

interface Props {
  batchSize: number;
  wasteCount: number;
  totalBatchMaterialCost: number;
  amortizationPerUnit: number;
  publicPrice: number;
  onWasteChange: (val: number) => void;
}

export const ProductionEfficiencyCard: React.FC<Props> = ({
  batchSize,
  wasteCount,
  totalBatchMaterialCost,
  amortizationPerUnit,
  publicPrice,
  onWasteChange,
}) => {
  // 1. State Logic
  const yieldRate = batchSize > 0 ? (batchSize - wasteCount) / batchSize : 0;
  const effectiveUnits = batchSize - wasteCount;
  const currentUnitMatCost = effectiveUnits > 0 ? totalBatchMaterialCost / effectiveUnits : 0;
  const currentTotalUnitCost = currentUnitMatCost + amortizationPerUnit;
  
  // Prevent divide by zero / infinite cost visual
  const maxWaste = Math.max(0, batchSize - 1);
  const costIncreaseFactor = yieldRate > 0 ? (1 / yieldRate) : 0;

  // 2. Panic State
  const isUnprofitable = currentTotalUnitCost > publicPrice;

  // 3. Comparison Visualization Data
  const chartData = useMemo(() => {
    const data = [];
    // Generate points from 0 waste up to batchSize - 1
    for (let i = 0; i < batchSize; i++) {
      const eff = batchSize - i;
      const matCost = totalBatchMaterialCost / eff;
      const total = matCost + amortizationPerUnit;
      
      data.push({
        waste: i,
        cost: parseFloat(total.toFixed(2)),
        price: publicPrice
      });
    }
    return data;
  }, [batchSize, totalBatchMaterialCost, amortizationPerUnit, publicPrice]);

  // Determine styles based on yield/profitability
  const cardBg = isUnprofitable ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200';
  const sliderColor = isUnprofitable 
    ? 'accent-red-600' 
    : yieldRate < 0.8 
      ? 'accent-orange-500' 
      : 'accent-emerald-500';

  return (
    <div className={`rounded-xl border shadow-sm p-6 transition-colors duration-300 ${cardBg}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-600" />
          Production Efficiency
        </h3>
        {isUnprofitable && (
          <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full animate-pulse">
            <AlertOctagon className="w-3 h-3" />
            NEGATIVE MARGIN
          </span>
        )}
      </div>

      {/* The Visual Feedback: Cost Spike */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
          <div className="text-xs text-slate-500 uppercase font-semibold">Yield Rate</div>
          <div className={`text-2xl font-bold ${yieldRate < 0.7 ? 'text-red-600' : 'text-slate-700'}`}>
            {(yieldRate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {effectiveUnits} usable units
          </div>
        </div>
        
        <div className={`p-3 rounded-lg border ${isUnprofitable ? 'bg-red-100 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
          <div className="text-xs text-slate-500 uppercase font-semibold">Cost Multiplier</div>
          <div className="text-2xl font-bold text-slate-700">
            {costIncreaseFactor.toFixed(2)}x
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Due to waste
          </div>
        </div>
      </div>

      {/* The Waste Slider */}
      <div className="mb-8">
        <div className="flex justify-between text-sm font-medium text-slate-600 mb-2">
          <span>Waste (Merma)</span>
          <span className={wasteCount > 0 ? 'text-red-500' : ''}>{wasteCount} units</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxWaste}
          step={1}
          value={wasteCount}
          onChange={(e) => onWasteChange(parseInt(e.target.value))}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-200 ${sliderColor}`}
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0 (Perfect)</span>
          <span>{maxWaste} (Critical)</span>
        </div>
      </div>

      {/* The Panic State Warning */}
      {isUnprofitable && (
        <div className="flex items-start gap-3 p-4 bg-red-100 rounded-lg mb-6 border border-red-200">
          <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
          <div>
            <h4 className="font-bold text-red-800 text-sm">Critical Warning</h4>
            <p className="text-xs text-red-700 mt-1">
              Production cost (${currentTotalUnitCost.toFixed(2)}) exceeds sale price (${publicPrice.toFixed(2)}). 
              You are paying to sell this product. Reduce waste or increase prices.
            </p>
          </div>
        </div>
      )}

      {/* The Comparison Visualization: Cost vs Waste */}
      <div className="h-48 w-full mt-2">
        <p className="text-xs text-slate-500 font-semibold mb-2 text-center">Unit Cost vs. Waste Impact</p>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="waste" 
              hide={true} 
            />
            <YAxis 
              hide={false} 
              domain={['auto', 'auto']} 
              tick={{fontSize: 10, fill: '#94a3b8'}}
              tickFormatter={(val) => `$${val}`}
              width={35}
            />
            <Tooltip 
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Unit Cost']}
              labelFormatter={(label) => `Waste: ${label} units`}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <ReferenceLine y={publicPrice} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'PVP', fontSize: 10, fill: '#ef4444' }} />
            <Area 
              type="monotone" 
              dataKey="cost" 
              stroke="#6366f1" 
              fillOpacity={1} 
              fill="url(#colorCost)" 
              strokeWidth={2}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};