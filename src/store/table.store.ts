import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TableState {
  tableCode: string | null;
  tableName: string | null;
  setTable: (code: string, name: string) => void;
  clearTable: () => void;
}

export const useTableStore = create<TableState>()(
  persist(
    (set) => ({
      tableCode: null,
      tableName: null,
      setTable: (code, name) => set({ tableCode: code, tableName: name }),
      clearTable: () => set({ tableCode: null, tableName: null }),
    }),
    {
      name: 'ekasir-table-session', // Nama key di LocalStorage
    }
  )
);