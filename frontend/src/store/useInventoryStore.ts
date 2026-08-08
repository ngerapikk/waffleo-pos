import { create } from 'zustand';
import api from '../lib/api';

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  packageSize: string | null;
  currentStock: string | number;
  lowStockThreshold: string | number | null;
  ingredientGroup: string | null;
  isDerived: boolean;
  active: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string | null;
  qty: string | number;
  notes: string | null;
}

interface InventoryState {
  ingredients: Ingredient[];
  inventoryItems: InventoryItem[];
  isLoading: boolean;
  error: string | null;

  fetchInventory: () => Promise<void>;
  adjustStock: (id: string, qty: number, reason: string) => Promise<void>;
  convertStock: (inputIngredientId: string, inputQty: number, outputIngredientId: string, outputQty: number) => Promise<void>;
  produceStock: (outputIngredientId: string, outputQty: number) => Promise<void>;
  closeShiftUsage: (usedAdonanBesar: number, usedAdonanKecil: number) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  ingredients: [],
  inventoryItems: [],
  isLoading: false,
  error: null,

  fetchInventory: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/inventory');
      set({ 
        ingredients: response.data.ingredients,
        inventoryItems: response.data.inventoryItems,
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch inventory', isLoading: false });
    }
  },

  adjustStock: async (id, qty, reason) => {
    try {
      await api.patch(`/inventory/${id}/adjust`, { qty, reason });
      // Refresh inventory after adjustment
      await get().fetchInventory();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to adjust stock');
    }
  },

  convertStock: async (inputIngredientId, inputQty, outputIngredientId, outputQty) => {
    try {
      await api.post('/inventory/conversions', {
        inputIngredientId,
        inputQty,
        outputIngredientId,
        outputQty
      });
      // Refresh inventory after conversion
      await get().fetchInventory();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to convert stock');
    }
  },

  produceStock: async (outputIngredientId, outputQty) => {
    try {
      await api.post('/inventory/produce', { 
        outputIngredientId, 
        outputQty 
      });
      await get().fetchInventory();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to produce stock');
    }
  },

  closeShiftUsage: async (usedAdonanBesar: number, usedAdonanKecil: number) => {
    try {
      await api.post('/inventory/close-shift-usage', { 
        usedAdonanBesar, 
        usedAdonanKecil 
      });
      await get().fetchInventory();
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message || 'Failed to report shift usage');
    }
  }
}));
