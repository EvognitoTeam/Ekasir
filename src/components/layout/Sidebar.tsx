"use client"; // Wajib pakai ini karena kita pakai useParams dan Zustand

import { useParams } from 'next/navigation'; // 🔴 1. Import useParams
import { useCartStore } from '../../store/cart.store';
import { 
  BookOpen, Coffee, HelpCircle, User, MoveRight, ShoppingBag, Circle, Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  onViewChange: (view: 'menu' | 'roasts' | 'history' | 'help' | 'profile') => void;
  activeView: string;
  onOpenCart: () => void;
  mitraName?: string; 
}

export default function Sidebar({ onViewChange, activeView, onOpenCart, mitraName = "Kedai" }: Props) {
  // 🔴 2. Ambil slug dari URL otomatis
  const params = useParams();
  const slug = params?.slug as string;

  // 🔴 3. Panggil data keranjang secara dinamis berdasarkan slug
  // Reaktif: Bakal otomatis re-render setiap kali keranjang di toko INI berubah
  const cartItems = useCartStore((state) => state.cartsBySlug[slug] || []); 
  
  // Hitung total item
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const navItems = [
    { id: 'menu', label: 'The Menu Ledger', icon: BookOpen },
    { id: 'roasts', label: 'Artisan Portfolio', icon: Coffee },
    { id: 'help', label: 'Concierge Desk', icon: HelpCircle },
    { id: 'profile', label: 'User Profile', icon: User },
  ];

  return (
    <aside className="hidden lg:flex w-[320px] h-screen flex-col bg-white border-r border-stone-100 sticky top-0 overflow-hidden group">
      <div className="absolute inset-x-0 bottom-0 h-64 bg-stone-50 opacity-50" />
      
      <header className="p-10 pt-16 relative z-10">
        <div className="flex items-center gap-3 mb-10">
           <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shadow-xl">
              <Globe className="w-4 h-4" />
           </div>
           <span className="text-[10px] font-label uppercase tracking-[0.4em] opacity-30 italic">Vol. IV Edition</span>
        </div>
        
        <h1 className="text-4xl font-display leading-[0.85] tracking-tighter mb-4 pr-12 text-[#0E5C37]">
          {mitraName}.
        </h1>
        <div className="flex items-center gap-4">
           <span className="w-8 h-px bg-stone-100" />
           <p className="text-[9px] font-label opacity-40 uppercase tracking-widest leading-none">The Artisan Journal</p>
        </div>
      </header>

      <nav className="flex-1 px-6 py-12 relative z-10">
        <div className="space-y-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id as any)}
                className={`w-full flex items-center justify-between group transition-all relative py-3 ${
                  isActive ? 'opacity-100' : 'opacity-30 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-6">
                   <div className={`transition-all duration-500 ${
                     isActive ? 'translate-x-0' : '-translate-x-2'
                   }`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#0E5C37]' : ''}`} />
                   </div>
                   <span className={`text-[11px] font-label uppercase tracking-widest font-bold transition-colors ${
                     isActive ? 'text-[#0E5C37]' : ''
                   }`}>
                     {item.label}
                   </span>
                </div>
                
                {isActive ? (
                  <motion.div 
                    layoutId="active-indicator"
                    className="w-1.5 h-1.5 bg-[#0E5C37] rounded-full shadow-[0_0_10px_rgba(14,92,55,0.3)]"
                  />
                ) : (
                  <MoveRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-4 group-hover:translate-x-0 duration-500" />
                )}
                
                {isActive && (
                  <div className="absolute -left-10 right-[-24px] bottom-0 h-px bg-stone-50" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <footer className="p-10 relative z-10 bg-white/80 backdrop-blur-md border-t border-stone-100">
        <div className="flex items-center justify-between mb-10">
           <div className="flex flex-col">
              <span className="text-[7px] font-label opacity-40 uppercase tracking-[0.3em] mb-1">Status Protocol</span>
              <div className="flex items-center gap-3">
                 <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
                 <span className="text-[10px] font-label uppercase tracking-widest">Live Link Active</span>
              </div>
           </div>
           <div className="text-right">
              <span className="text-[7px] font-label opacity-40 uppercase tracking-[0.3em] mb-1">Station</span>
              <p className="text-xl font-display leading-none">T-12</p>
           </div>
        </div>

        <button 
          onClick={onOpenCart}
          className="w-full bg-black text-white px-8 py-5 rounded-full flex items-center justify-between group overflow-hidden relative active:scale-95 transition-all"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-4 relative z-10">
             <ShoppingBag className="w-4 h-4 opacity-40 group-hover:opacity-100 transition-opacity" />
             <span className="text-[10px] font-label font-bold uppercase tracking-widest">Inventory</span>
          </div>
          <div className="flex items-center gap-2 relative z-10">
             <span className="w-4 h-px bg-white/20 group-hover:w-8 transition-all duration-700" />
             <span className="text-[10px] font-label font-bold text-emerald-400">{cartCount}</span>
          </div>
        </button>
      </footer>
    </aside>
  );
}