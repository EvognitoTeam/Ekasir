import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Order } from '../types/menu';

interface OrderState {
  currentOrder: Order | null;
  orderHistory: Order[];
  createOrder: (order: Order) => void;
  updateStatus: (status: Order['status']) => void;
  clearCurrentOrder: () => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      currentOrder: null,
      orderHistory: [],
      createOrder: (order: Order) => set((state: OrderState) => ({ 
        currentOrder: order, 
        orderHistory: [order, ...state.orderHistory] 
      })),
      updateStatus: (status: Order['status']) => set((state: OrderState) => ({
        currentOrder: state.currentOrder ? { ...state.currentOrder, status } : null,
        orderHistory: state.orderHistory.map(o => 
          o.id === state.currentOrder?.id ? { ...o, status } : o
        ),
      })),
      clearCurrentOrder: () => set({ currentOrder: null }),
    }),
    { name: 'cafe-order-storage' }
  )
);
