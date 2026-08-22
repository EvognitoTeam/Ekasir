import { motion } from 'framer-motion';
import { BookOpen, History, LifeBuoy, User, ClipboardList } from 'lucide-react';

interface Props {
  activeView: string;
  // 🔴 1. Tambahkan 'tracking' ke dalam tipe union ini
  onViewChange: (view: 'menu' | 'history' | 'help' | 'profile' | 'tracking') => void;
  hasActiveOrder?: boolean;
}

// 🔴 2. Panggil (destructure) hasActiveOrder di parameter fungsi ini
export default function BottomNav({ activeView, onViewChange, hasActiveOrder }: Props) {
  
  // 🔴 3. Pindahkan NAV_ITEMS ke DALAM komponen agar bisa membaca nilai hasActiveOrder
  const NAV_ITEMS = [
    { id: 'menu' as const, label: 'Menu', icon: BookOpen },
    {
      id: 'tracking' as const,
      label: 'Pesanan aktif',
      icon: ClipboardList,
      visible: hasActiveOrder, // Sekarang ini tidak akan error!
    },
    { id: 'history' as const, label: 'Pesanan', icon: History },
    { id: 'help' as const, label: 'Bantuan', icon: LifeBuoy },
    { id: 'profile' as const, label: 'Profil', icon: User },
  ];

  return (
    <nav className="absolute inset-x-0 bottom-0 z-[80] h-[calc(80px+env(safe-area-inset-bottom))] border-t border-stone-100 bg-white/92 pb-safe backdrop-blur-2xl md:hidden">
      <div className="flex h-20 items-center justify-between px-3">
        {/* 🔴 4. Tambahkan filter sebelum .map agar yang visible-nya false tidak dirender */}
        {NAV_ITEMS.filter((item) => item.visible !== false).map((item) => {
          const Icon = item.icon;
          const active = activeView === item.id;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onViewChange(item.id)}
              aria-label={`Buka ${item.label}`}
              className="group relative flex h-full w-full flex-col items-center justify-center gap-1"
            >
              <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl">
                {active && (
                  <motion.div
                    layoutId="customer-bottom-nav"
                    className="absolute inset-0 rounded-2xl bg-[var(--color-primary)] shadow-lg"
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  />
                )}
                <Icon
                  className={`relative z-10 h-5 w-5 transition-colors ${
                    active ? 'text-white' : 'text-stone-400 group-hover:text-stone-600'
                  }`}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>
              <span
                className={`text-[9px] font-label uppercase tracking-widest ${
                  active ? 'text-[var(--color-primary)]' : 'text-stone-400'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}