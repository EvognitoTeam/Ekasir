import { motion } from 'framer-motion';
import { MenuItem } from '../../types/menu';

interface HeroSectionProps {
  featuredItem: MenuItem;
  onExplore: (item: MenuItem) => void;
}

export default function HeroSection({ featuredItem, onExplore }: HeroSectionProps) {
  return (
    <section className="container pt-28">
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
        className="relative rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden aspect-[4/5] md:aspect-[21/9] md:max-h-[500px] shadow-2xl group"
      >
        <img 
          src={featuredItem.image} 
          alt={featuredItem.name} 
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-on-surface)]/90 via-[var(--color-on-surface)]/30 to-transparent" />
        
        <div className="absolute inset-0 p-8 md:p-20 flex flex-col justify-end text-white">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col items-start relative z-10"
          >
            <div className="overflow-hidden mb-8">
              <motion.span 
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                transition={{ delay: 0.6 }}
                className="inline-block px-5 py-2 bg-[var(--color-tertiary)] text-[9px] font-label rounded-full shadow-lg"
              >
                Seasonal Special
              </motion.span>
            </div>
            
            <h2 className="text-5xl md:text-[5.5rem] font-headline italic mb-6 leading-[1.1] max-w-[95%] md:max-w-[800px] drop-shadow-xl tracking-tight">
              The Morning <br /> 
              <span className="md:ml-24">Ritual: Reimagined.</span>
            </h2>
            
            <div className="flex flex-col md:flex-row items-start md:items-end gap-10 md:gap-24 w-full">
              <p className="text-sm md:text-xl opacity-90 max-w-[90%] md:max-w-[450px] font-body font-light leading-relaxed italic">
                Experience the symphony of flavors in our {featuredItem.name}, curated by our head sommelier for the discerning palate.
              </p>
              
              <div className="flex flex-col gap-4">
                <span className="text-3xl md:text-4xl font-serif text-white/90">IDR {(featuredItem.basePrice / 1000).toFixed(0)}k</span>
                <button 
                  onClick={() => onExplore(featuredItem)}
                  className="btn-primary px-12 py-5 text-sm active:scale-95 group"
                >
                  Explore Selection
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
