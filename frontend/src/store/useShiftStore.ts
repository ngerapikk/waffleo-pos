import { create } from 'zustand';
import api from '../lib/api';

export interface Shift {
  id: string;
  outletId: string;
  openedById: string;
  openedAt: string;
  status: 'OPEN' | 'CLOSED';
  openingCash: string | number;
}

interface ShiftState {
  currentShift: Shift | null;
  isLoading: boolean;
  error: string | null;

  fetchCurrentShift: () => Promise<void>;
  openShift: (openingCash: number) => Promise<void>;
  closeShift: (usedAdonanBesar: number, usedAdonanKecil: number, closingCashActual: number) => Promise<void>;
}

export const useShiftStore = create<ShiftState>((set) => ({
  currentShift: null,
  isLoading: false,
  error: null,

  fetchCurrentShift: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/shifts/current');
      set({ 
        currentShift: response.data.shift || null,
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch current shift', isLoading: false });
    }
  },

  openShift: async (openingCash: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/shifts/open', { openingCash });
      set({ currentShift: response.data.shift, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.response?.data?.error || err.message || 'Failed to open shift');
    }
  },

  closeShift: async (usedAdonanBesar: number, usedAdonanKecil: number, closingCashActual: number) => {
    set({ isLoading: true, error: null });
    try {
      await api.post('/shifts/close', { 
        usedAdonanBesar, 
        usedAdonanKecil,
        closingCashActual
      });
      set({ currentShift: null, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.response?.data?.error || err.message || 'Failed to close shift');
    }
  }
}));
