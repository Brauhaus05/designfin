import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Calculator, HelpCircle } from 'lucide-react';
import { MaterialItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  materials: MaterialItem[];
  batchSize: number;
  onSave: (updatedMaterials: MaterialItem[]) => void;
}

export const MaterialManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  materials,
  batchSize,
  onSave,
}) => {
  const [localMaterials, setLocalMaterials] = useState<MaterialItem[]>([]);

  // Sync local state when modal opens
  useEffect(() => {
    if (isOpen) {
      setLocalMaterials(JSON.parse(JSON.stringify(materials)));
    }
  }, [isOpen, materials]);

  const updateRow = (id: string, field: keyof MaterialItem, value: string | number) => {
    setLocalMaterials((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const updatedItem = { ...item, [field]: value };
        
        // Auto-calculate Total Cost whenever inputs change
        // Formula: ((Qty * BatchSize) + Buffer) * UnitCost
        if (
            field === 'qtyPerUnit' || 
            field === 'bufferUnits' || 
            field === 'unitCost'
        ) {
            const qty = field === 'qtyPerUnit' ? Number(value) : item.qtyPerUnit;
            const buff = field === 'bufferUnits' ? Number(value) : item.bufferUnits;
            const uCost = field === 'unitCost' ? Number(value) : item.unitCost;
            
            updatedItem.cost = ((qty * batchSize) + buff) * uCost;
        }

        return updatedItem;
      })
    );
  };

  const addRow = () => {
    const newId = Date.now().toString();
    setLocalMaterials([
      ...localMaterials,
      {
        id: newId,
        name: '',
        qtyPerUnit: 0,
        bufferUnits: 0,
        unitCost: 0,
        cost: 0,
        notes: '',
      },
    ]);
  };

  const removeRow = (id: string) => {
    setLocalMaterials(localMaterials.filter((m) => m.id !== id));
  };

  const handleSave = () => {
    onSave(localMaterials);
    onClose();
  };

  const totalBatchCost = localMaterials.reduce((sum, m) => sum + m.cost, 0);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-indigo-900 text-white px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-indigo-300" />
            <div>
              <h2 className="text-xl font-bold">Detailed Material Calculator</h2>
              <p className="text-xs text-indigo-200 opacity-80">
                Calculating for Batch Size: <strong className="text-white">{batchSize} units</strong>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-indigo-300 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 w-64">Material Name</th>
                  <th className="px-4 py-3 w-32 text-right">
                    <div className="flex items-center justify-end gap-1">
                      Qty/Product
                      <span title="Amount of material used for 1 single product" className="cursor-help"><HelpCircle className="w-3 h-3"/></span>
                    </div>
                  </th>
                  <th className="px-4 py-3 w-24 text-right">
                    <div className="flex items-center justify-end gap-1">
                      Buffer
                      <span title="Extra units added to the total batch for waste/safety" className="cursor-help"><HelpCircle className="w-3 h-3"/></span>
                    </div>
                  </th>
                  <th className="px-4 py-3 w-32 text-right">Unit Cost ($)</th>
                  <th className="px-4 py-3 w-32 text-right bg-indigo-50 text-indigo-800">Total Cost</th>
                  <th className="px-4 py-3 w-20 text-right text-slate-400">%</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localMaterials.length === 0 && (
                   <tr>
                       <td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">
                           No materials added. Click "Add Material" to start.
                       </td>
                   </tr>
                )}
                {localMaterials.map((item) => (
                  <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateRow(item.id, 'name', e.target.value)}
                        placeholder="e.g. Aluminum Tube"
                        className="w-full border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 font-medium"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.qtyPerUnit}
                        onChange={(e) => updateRow(item.id, 'qtyPerUnit', parseFloat(e.target.value) || 0)}
                        className="w-full text-right border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-slate-600"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.bufferUnits}
                        onChange={(e) => updateRow(item.id, 'bufferUnits', parseFloat(e.target.value) || 0)}
                        className="w-full text-right border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-slate-600"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitCost}
                        onChange={(e) => updateRow(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="w-full text-right border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-mono text-slate-600"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-indigo-700 bg-indigo-50/50">
                      {formatCurrency(item.cost)}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-400">
                      {totalBatchCost > 0 ? Math.round((item.cost / totalBatchCost) * 100) : 0}%
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => updateRow(item.id, 'notes', e.target.value)}
                        placeholder="specs..."
                        className="w-full border-transparent bg-transparent rounded px-2 py-1.5 focus:bg-white focus:border-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none text-xs text-slate-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => removeRow(item.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button
            onClick={addRow}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded hover:bg-indigo-50 w-fit"
          >
            <Plus className="w-4 h-4" /> Add Material Row
          </button>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="text-slate-500 text-sm">
            Total Batch Cost: <span className="text-slate-900 font-bold text-lg ml-2">{formatCurrency(totalBatchCost)}</span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm font-bold"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};