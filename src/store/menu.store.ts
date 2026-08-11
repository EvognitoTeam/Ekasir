import { create } from 'zustand';
import { MenuItem, Category } from '../types/menu';

interface MenuState {
  items: MenuItem[];
  categories: Category[];
  setMenu: (items: MenuItem[], categories: Category[]) => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  getItemById: (id: string) => MenuItem | undefined;
  getCategoryById: (id: string) => Category | undefined;
  fetchMenuItems: (slug: string) => Promise<void>;
}

export const useMenuStore = create<MenuState>((set, get) => ({
  items: [],
  categories: [],
  isLoading: true,
  setMenu: (items, categories) => set({ items, categories, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  getItemById: (id) => get().items.find((i: MenuItem) => i.id === id),
  getCategoryById: (id) => get().categories.find((c: Category) => c.id === id),
  fetchMenuItems: async (slug: string) => {
    set({ isLoading: true });
    try {
      const res = await fetch(`/api/products?slug=${slug}`);
      const data = await res.json();
      if (data.success) {
        set({ items: data.data.items, categories: data.data.categories, isLoading: false });
      }
    } catch (err) {
      console.error(err);
      set({ isLoading: false });
    }
  },
}));
