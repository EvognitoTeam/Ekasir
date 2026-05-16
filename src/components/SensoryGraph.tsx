import { motion } from 'framer-motion';
import { SensoryProfile } from '../types/menu';

interface Props {
  profile: SensoryProfile[];
}

export default function SensoryGraph({ profile }: Props) {
  return (
    <div className="space-y-6">
      {profile.map((item, idx) => (
        <div key={item.name} className="space-y-2">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-label font-bold uppercase tracking-widest opacity-40">{item.name}</span>
            <span className="text-xs font-serif italic text-[var(--color-primary)]">Intensity {item.value}%</span>
          </div>
          <div className="h-[2px] w-full bg-[var(--color-outline-variant)]/10 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              whileInView={{ width: `${item.value}%` }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 + idx * 0.1, duration: 1, ease: [0.33, 1, 0.68, 1] }}
              className="h-full bg-gradient-to-r from-[var(--color-primary)]/40 to-[var(--color-primary)]"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
