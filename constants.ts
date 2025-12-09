import { SalesScenario, FinancialState } from './types';

export const DEFAULT_SCENARIOS: SalesScenario[] = [
  { 
    id: 'direct', 
    name: 'Direct Sale', 
    discountPercent: 0, 
    commissionPercent: 0,
    description: 'Direct to consumer (Website)'
  },
  { 
    id: 'card', 
    name: 'Card Sale', 
    discountPercent: 0.035, 
    commissionPercent: 0,
    description: 'Processing fees included'
  },
  { 
    id: 'specifier', 
    name: 'Architect/Specifier', 
    discountPercent: 0.15, 
    commissionPercent: 0,
    description: 'Trade discount'
  },
  { 
    id: 'retail', 
    name: 'Retail Store', 
    discountPercent: 0.50, 
    commissionPercent: 0,
    description: 'Standard wholesale'
  },
  { 
    id: 'distributor', 
    name: 'Distributor', 
    discountPercent: 0.60, 
    commissionPercent: 0,
    description: 'Volume partner'
  },
  { 
    id: 'agent', 
    name: 'Sales Agent', 
    discountPercent: 0.50, 
    commissionPercent: 0.025,
    description: 'Wholesale + Commission'
  },
];

export const INITIAL_STATE: FinancialState = {
  devCosts: [
    { id: '1', name: 'Industrial Design', amount: 5000 },
    { id: '2', name: 'Prototyping', amount: 1200 },
    { id: '3', name: 'Tooling', amount: 3500 },
  ],
  amortizationQty: 1000,
  batchSize: 50,
  wasteCount: 2,
  materials: [
    // Initializing with simplified values implies 0 quantity logic, treated as manual lump sum override initially
    { id: '1', name: 'Aluminum 6061', cost: 250, qtyPerUnit: 0, bufferUnits: 0, unitCost: 0, notes: 'Manual entry' },
    { id: '2', name: 'Packaging', cost: 50, qtyPerUnit: 0, bufferUnits: 0, unitCost: 0, notes: 'Manual entry' },
    { id: '3', name: 'Powder Coating', cost: 150, qtyPerUnit: 0, bufferUnits: 0, unitCost: 0, notes: 'Manual entry' },
  ],
  publicPrice: 85.00,
  fixedMonthlyExpenses: 2500,
  designerRoyaltyPercent: 0.05,
  customScenarios: DEFAULT_SCENARIOS.map(s => ({
    id: s.id,
    discountPercent: s.discountPercent
  }))
};