import { useState } from 'react';
import { useMenuStore } from '../../store/menu.store';
import { Search, Save, Power, Edit3 } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';
import { motion } from 'framer-motion';

export default function MenuEditor() {
  const { items, categories, setMenu } = useMenuStore();
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleAvailability = (id: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, isAvailable: !item.isAvailable } : item
    );
    setMenu(newItems, categories);
  };

  const startEditing = (id: string, price: number) => {
    setEditingId(id);
    setTempPrice(price.toString());
  };

  const savePrice = (id: string) => {
    const priceNum = parseInt(tempPrice);
    if (isNaN(priceNum)) return;

    const newItems = items.map(item => 
      item.id === id ? { ...item, basePrice: priceNum } : item
    );
    setMenu(newItems, categories);
    setEditingId(null);
  };

  return (
    <div className="p-6 space-y-6 pb-40">
      {/* Search Header */}
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300 group-focus-within:text-[var(--color-primary)] transition-colors">
          <Search className="w-5 h-5" />
        </div>
        <input 
          type="text" 
          placeholder="Registry search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-stone-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-sans focus:outline-none focus:border-[var(--color-primary)] transition-all shadow-sm"
        />
      </div>

      {/* Editor List */}
      <div className="space-y-4">
        {filteredItems.map((item, index) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`bg-white p-5 rounded-[2rem] border border-stone-100 shadow-sm transition-all ${!item.isAvailable ? 'opacity-80' : ''}`}
          >
             <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border border-stone-50">
                   <img src={item.image} alt={item.name} className={`w-full h-full object-cover transition-all ${!item.isAvailable ? 'grayscale' : ''}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                   <div className="flex justify-between items-start">
                      <div>
                         <h4 className="text-lg font-display leading-tight">{item.name}</h4>
                         <p className="text-[9px] font-label uppercase tracking-widest text-stone-400 mt-1">{item.categoryId}</p>
                      </div>
                      <button 
                        onClick={() => toggleAvailability(item.id)}
                        className={`px-4 py-1.5 rounded-full flex items-center gap-2 transition-all active:scale-95 ${
                          item.isAvailable 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-stone-50 text-stone-400 border border-stone-100'
                        }`}
                      >
                         <Power className="w-3.5 h-3.5" />
                         <span className="text-[10px] font-label uppercase tracking-widest leading-none pt-0.5">
                            {item.isAvailable ? 'Active' : 'Depleted'}
                         </span>
                      </button>
                   </div>

                   <div className="flex items-center justify-between mt-4 border-t border-stone-50 pt-4">
                      {editingId === item.id ? (
                        <div className="flex items-center gap-2">
                           <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">Rp</span>
                              <input 
                                autoFocus
                                type="number"
                                value={tempPrice}
                                onChange={(e) => setTempPrice(e.target.value)}
                                className="w-24 bg-stone-50 border border-stone-100 rounded-lg py-1.5 pl-8 pr-2 text-xs font-sans focus:outline-none focus:border-[var(--color-primary)]"
                              />
                           </div>
                           <button onClick={() => savePrice(item.id)} className="p-2 bg-[var(--color-primary)] text-white rounded-lg active:scale-95 shadow-lg shadow-[var(--color-primary)]/20">
                              <Save className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                           <span className="text-sm font-sans font-bold text-stone-800">{formatPrice(item.basePrice)}</span>
                           <button onClick={() => startEditing(item.id, item.basePrice)} className="p-1.5 text-stone-300 hover:text-[var(--color-primary)] transition-colors">
                              <Edit3 className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      )}
                      
                      <div className="text-[9px] font-label uppercase tracking-widest text-[#0E5C37]/40">Authoritative Record</div>
                   </div>
                </div>
             </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
