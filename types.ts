export interface CostItem {
  id: string;
  name: string;
  amount: number;
}

export interface MaterialItem {
  id: string;
  name: string;
  cost: number; // The Calculated Total Batch Cost (Source of Truth for Financial Kernel)
  
  // Detailed Calculation Fields
  qtyPerUnit: number; // How much material per 1 product unit
  bufferUnits: number; // Extra material added to the batch (waste/safety)
  unitCost: number; // Cost per 1 unit of material
  notes: string;
}

export interface SalesScenario {
  id: string;
  name: string;
  discountPercent: number; // 0 to 1
  commissionPercent: number; // 0 to 1
  description: string;
}

export interface ScenarioResult extends SalesScenario {
  netRevenue: number;
  grossMargin: number;
  profit: number;
  breakEvenUnits: number;
  isProfitable: boolean;
  roi: number;
}

export interface ScenarioConfig {
  id: string;
  discountPercent: number;
}

export interface FinancialState {
  // Module A: Development
  devCosts: CostItem[];
  amortizationQty: number;

  // Module B: Production
  batchSize: number;
  wasteCount: number;
  materials: MaterialItem[];

  // Module C: Commercialization
  publicPrice: number;
  fixedMonthlyExpenses: number;
  designerRoyaltyPercent: number;

  // Customization
  customScenarios: ScenarioConfig[];
}