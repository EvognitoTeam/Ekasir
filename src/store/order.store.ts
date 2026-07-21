import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order } from '../types/menu';

interface OrderState {
  currentOrder: Order | null;
  orderHistory: any[];
  loading: boolean;
  fetchOrderHistory: (slug: string) => Promise<void>;
  createOrder: (order: Order) => void;
  updateStatus: (status: Order['status']) => void;
  clearCurrentOrder: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      currentOrder: null,
      orderHistory: [],
      loading: false,
      fetchOrderHistory: async (slug: string) => {
        set({ loading: true });
        try {
          const res = await fetch(`/api/orders/history?slug=${slug}`, { cache: 'no-store' });
          const result = await res.json();
          set({ orderHistory: result.success ? (result.data ?? []) : [] });
        } catch (err) {
          set({ orderHistory: [] });
        } finally {
          set({ loading: false });
        }
      },
      createOrder: (order) => set((state) => ({ currentOrder: order, orderHistory: [order, ...state.orderHistory] })),
      updateStatus: (status) => set((state) => ({
        currentOrder: state.currentOrder ? { ...state.currentOrder, status } : null,
        orderHistory: state.orderHistory.map((o) => o.id === state.currentOrder?.id ? { ...o, status } : o),
      })),
      clearCurrentOrder: () => set({ currentOrder: null }),
    }),
    { name: 'cafe-order-storage', partialize: (state) => ({ currentOrder: state.currentOrder }) }
  )
);