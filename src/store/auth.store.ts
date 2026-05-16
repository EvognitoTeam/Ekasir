import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isLoggedIn: boolean;
  userId: number | null;
  username: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  loginError: string | null;
  isLoading: boolean;
  login: (email: string, password: string, slug: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      userId: null,
      username: '',
      email: null,
      phone: null,
      role: null,
      loginError: null,
      isLoading: false,

      login: async (email, password, slug) => {
        set({ isLoading: true, loginError: null });
        
        try {
          const response = await fetch(`/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, slug }),
          });
          
          const data = await response.json();
          
          if (response.ok && data.success) {
            set({
              isLoggedIn: true,
              userId: data.user.id,
              username: data.user.name,
              email: data.user.email,
              phone: data.user.phone,
              role: data.user.role, // Disimpan di memori (RAM), tapi tidak di Local Storage
              loginError: null,
              isLoading: false,
            });
            return true;
          } else {
            set({ loginError: data.message || 'Email atau password salah.', isLoading: false });
            return false;
          }
        } catch (error) {
          console.error("Login failed:", error);
          set({ loginError: 'Terjadi kesalahan jaringan. Coba lagi.', isLoading: false });
          return false;
        }
      },
      
      logout: () => set({ 
        isLoggedIn: false, 
        userId: null, 
        username: '', 
        email: null, 
        phone: null, 
        role: null, 
        loginError: null 
      }),
      
      clearError: () => set({ loginError: null }),
    }),
    {
      name: 'auth-storage',
      
      // 🔴 FILTER DATA YANG DISIMPAN KE LOCAL STORAGE
      partialize: (state) => ({ 
        isLoggedIn: state.isLoggedIn,
        userId: state.userId,
        username: state.username,
        email: state.email,
        phone: state.phone,
        // ROLE DIHAPUS DARI SINI: Sehingga saat di-refresh, role tidak bisa dimanipulasi
      }),
    }
  )
);