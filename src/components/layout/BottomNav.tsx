import { BookOpen, Coffee, HelpCircle, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  activeView: string;
  onViewChange: (view: 'menu' | 'roasts' | 'history' | 'help' | 'profile') => void;
}

export default function BottomNav({ activeView, onViewChange }: Props) {
  const navItems = [
    { id: 'menu', label: 'Menu', icon: BookOpen },
    { id: 'roasts', label: 'Signature', icon: Coffee },
    { id: 'help', label: 'Help', icon: HelpCircle },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="absolute bottom-0 left-0 right-0 h-[80px] bg-white/90 backdrop-blur-2xl border-t border-stone-100 z-50 pb-safe">
      <div className="h-full flex justify-between items-center px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id as any)}
              className="relative flex flex-col items-center justify-center w-full h-full gap-1 group"
            >
              <div className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300 ${
                isActive ? '' : 'group-hover:bg-stone-50'
              }`}>
                <Icon className={`w-5 h-5 transition-colors duration-300 relative z-10 ${
                  isActive ? 'text-[var(--color-on-primary)]' : 'text-stone-400 group-hover:text-stone-600'
                }`} />
                {isActive && (
                  <motion.div 
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 bg-[var(--color-primary)] rounded-2xl shadow-lg"
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  />
                )}
              </div>
              <span className={`text-[9px] font-label uppercase tracking-widest transition-all duration-300 ${
                isActive ? 'text-[var(--color-primary)] font-bold' : 'text-stone-400 font-semibold'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
