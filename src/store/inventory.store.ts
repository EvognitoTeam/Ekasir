import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RawMaterial {
  id: string;
  name: string;
  category: 'Coffee Beans' | 'Dairy & Alternatives' | 'Syrups & Flavors' | 'Packaging' | 'Other';
  unit: string; // e.g., 'gr', 'ml', 'pcs'
  stock: number;
  lowStockThreshold: number;
  lastRestockDate?: string;
  costPerUnit?: number; // estimated cost per unit
}

export interface ExpenseRecord {
  id: string;
  timestamp: string;
  type: 'Restock' | 'Operational' | 'Equipment' | 'Other';
  description: string;
  amount: number;
  actor: string; // who recorded the expense
  relatedMaterialId?: string; // if it was a restock
  quantityAdded?: number; // if it was a restock
}

interface InventoryState {
  materials: RawMaterial[];
  expenses: ExpenseRecord[];
  
  // Actions
  initializeDefaultMaterials: () => void;
  updateMaterialStock: (id: string, newStock: number, actor: string, note?: string) => void;
  recordExpense: (expense: Omit<ExpenseRecord, 'id' | 'timestamp'>) => void;
  addRestockPurchase: (materialId: string, quantity: number, totalCost: number, actor: string, supplier?: string) => void;
  deleteExpense: (id: string) => void;
  clearAllData: () => void;
}

const DEFAULT_MATERIALS: RawMaterial[] = [
  { id: 'rm-1', name: 'House Blend Beans', category: 'Coffee Beans', unit: 'gr', stock: 5000, lowStockThreshold: 1000 },
  { id: 'rm-2', name: 'Single Origin Beans', category: 'Coffee Beans', unit: 'gr', stock: 2000, lowStockThreshold: 500 },
  { id: 'rm-3', name: 'Fresh Milk (Whole)', category: 'Dairy & Alternatives', unit: 'ml', stock: 10000, lowStockThreshold: 2000 },
  { id: 'rm-4', name: 'Oat Milk', category: 'Dairy & Alternatives', unit: 'ml', stock: 5000, lowStockThreshold: 1000 },
  { id: 'rm-5', name: 'Almond Milk', category: 'Dairy & Alternatives', unit: 'ml', stock: 3000, lowStockThreshold: 1000 },
  { id: 'rm-6', name: 'Vanilla Syrup', category: 'Syrups & Flavors', unit: 'ml', stock: 2000, lowStockThreshold: 500 },
  { id: 'rm-7', name: 'Caramel Syrup', category: 'Syrups & Flavors', unit: 'ml', stock: 2000, lowStockThreshold: 500 },
  { id: 'rm-8', name: 'Paper Cup Hot (8oz)', category: 'Packaging', unit: 'pcs', stock: 500, lowStockThreshold: 100 },
  { id: 'rm-9', name: 'Plastic Cup Iced (16oz)', category: 'Packaging', unit: 'pcs', stock: 500, lowStockThreshold: 100 },
];

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      materials: [],
      expenses: [],

      initializeDefaultMaterials: () => {
        const { materials } = get();
        if (materials.length === 0) {
          set({ materials: DEFAULT_MATERIALS });
        }
      },

      updateMaterialStock: (id, newStock, _actor, _note) => {
        set((state) => ({
          materials: state.materials.map(m => 
            m.id === id ? { ...m, stock: newStock } : m
          )
        }));
        // Note: For simplicity, we are not keeping a granular material usage log like before,
        // since expenses are the primary financial focus now.
      },

      recordExpense: (expenseData) => {
        const newExpense: ExpenseRecord = {
          ...expenseData,
          id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          expenses: [newExpense, ...state.expenses]
        }));
      },

      addRestockPurchase: (materialId, quantity, totalCost, actor, supplier) => {
        const state = get();
        const material = state.materials.find(m => m.id === materialId);
        
        if (material) {
          // 1. Update stock
          const newStock = material.stock + quantity;
          // Calculate new moving average cost per unit (simplified)
          const costPerUnit = totalCost / quantity;

          set((s) => ({
            materials: s.materials.map(m => 
              m.id === materialId 
                ? { ...m, stock: newStock, lastRestockDate: new Date().toISOString(), costPerUnit } 
                : m
            )
          }));

          // 2. Record Expense
          const desc = `Restock ${quantity}${material.unit} of ${material.name}${supplier ? ` from ${supplier}` : ''}`;
          get().recordExpense({
            type: 'Restock',
            description: desc,
            amount: totalCost,
            actor,
            relatedMaterialId: materialId,
            quantityAdded: quantity
          });
        }
      },

      deleteExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter(e => e.id !== id)
        }));
      },

      clearAllData: () => {
        set({ materials: DEFAULT_MATERIALS, expenses: [] });
      }
    }),
    {
      name: 'cafe-inventory-storage',
      version: 1,
    }
  )
);
