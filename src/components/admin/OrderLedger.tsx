import { useOrderStore } from '../../store/order.store';
import { useMenuStore } from '../../store/menu.store';
import { formatPrice } from '../../utils/formatters';
import { Download, Table as TableIcon, Calendar, Hash, Tag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrderLedger() {
  const { orderHistory } = useOrderStore();
  const { items: menuItems } = useMenuStore();

  const exportToTSV = () => {
    if (orderHistory.length === 0) return;

    // Build headers
    const headers = ['Order ID', 'Table', 'Timestamp', 'Items', 'Subtotal', 'Tax', 'Service', 'Total'];
    
    // Build rows
    const rows = orderHistory.map(order => {
      const itemBreakdown = order.items.map(item => {
        const product = menuItems.find(m => m.id === item.menuItemId);
        return `${product?.name || 'Unknown'} (x${item.quantity})`;
      }).join('; ');

      return [
        order.id,
        `T-${order.tableId}`,
        new Date(order.createdAt).toLocaleString(),
        itemBreakdown,
        order.subtotal,
        order.tax,
        order.serviceCharge,
        order.totalPrice
      ];
    });

    const tsvContent = [
      headers.join('\t'),
      ...rows.map(r => r.join('\t'))
    ].join('\n');

    // Create Blob (Add BOM for UTF-8 Excel support)
    const blob = new Blob(['\uFEFF', tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `editorial_bistro_ledger_${new Date().toISOString().split('T')[0]}.tsv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-8 pb-40">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-50 flex items-center justify-center text-[var(--color-primary)]">
               <TableIcon className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[9px] font-label uppercase tracking-widest text-stone-400">Ledger Archive</p>
               <h4 className="text-sm font-sans font-bold text-stone-900 uppercase tracking-widest">{orderHistory.length} Total Records</h4>
            </div>
         </div>
         
         <button 
           onClick={exportToTSV}
           disabled={orderHistory.length === 0}
           className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-2xl flex items-center gap-2 font-label text-[10px] uppercase tracking-widest shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all disabled:opacity-30"
         >
            <Download className="w-4 h-4" />
            Export TSV
         </button>
      </div>

      {/* Ledger Table (Mobile-First Card Style) */}
      <div className="space-y-4">
         {orderHistory.length === 0 ? (
           <div className="py-20 text-center border-2 border-dashed border-stone-100 rounded-[2rem]">
              <p className="text-stone-300 font-display italic">The ledger is currently empty.</p>
           </div>
         ) : (
           orderHistory.map((order, index) => (
             <motion.div 
               key={order.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: index * 0.05 }}
               className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm space-y-6"
             >
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                      <div className="flex items-center gap-2">
                         <Hash className="w-3 h-3 text-[var(--color-primary)]" />
                         <span className="text-xs font-sans font-bold text-stone-900">{order.id}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-40">
                         <Calendar className="w-3 h-3" />
                         <span className="text-[10px] font-label uppercase tracking-widest">{new Date(order.createdAt).toLocaleTimeString()}</span>
                      </div>
                   </div>
                   <div className="px-4 py-1.5 bg-stone-50 border border-stone-100 rounded-full text-[10px] font-label text-[var(--color-primary)] uppercase tracking-widest font-bold">
                      Table {order.tableId}
                   </div>
                </div>

                <div className="space-y-3">
                   {order.items.slice(0, 3).map((item, i) => {
                     const product = menuItems.find(m => m.id === item.menuItemId);
                     return (
                       <div key={i} className="flex justify-between items-center text-xs font-sans">
                          <span className="text-stone-600 italic">
                             {product?.name || 'Unknown Fragment'}
                             {item.quantity > 1 && <span className="not-italic font-bold ml-1 text-stone-400">x{item.quantity}</span>}
                          </span>
                       </div>
                     );
                   })}
                   {order.items.length > 3 && (
                     <p className="text-[10px] font-label uppercase tracking-widest text-stone-300">+{order.items.length - 3} more line items</p>
                   )}
                </div>

                <div className="pt-6 border-t border-stone-50 flex items-end justify-between">
                   <div className="flex items-center gap-2">
                      <Tag className="w-3 h-3 opacity-20" />
                      <span className="text-[10px] font-label uppercase tracking-[0.2em] opacity-30">Settlement</span>
                   </div>
                   <span className="text-2xl font-display text-[var(--color-primary)] font-bold">{formatPrice(order.totalPrice)}</span>
                </div>
             </motion.div>
           ))
         )}
      </div>
    </div>
  );
}
