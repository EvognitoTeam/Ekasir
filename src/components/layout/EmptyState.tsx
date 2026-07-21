import { motion } from 'framer-motion';
import { LucideIcon, Coffee } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon: Icon = Coffee, title, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center bg-[var(--color-surface-container-low)] rounded-[3rem] border border-white/40">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl"
      >
        <Icon className="w-10 h-10 text-[var(--color-primary)] opacity-40" />
      </motion.div>
      
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-2xl font-display text-[var(--color-on-surface)] mb-4">{title}</h3>
        <p className="text-sm text-[var(--color-on-surface-variant)] opacity-60 font-body max-w-xs mx-auto mb-10 leading-relaxed font-light">
          {message}
        </p>
        
        {action && (
          <button 
            onClick={action.onClick}
            className="btn-primary px-8 py-3 text-xs uppercase tracking-widest font-label"
          >
            {action.label}
          </button>
        )}
      </motion.div>
    </div>
  );
}
