import { useEffect, useState } from 'react';
import { Order, AddOnGroup, AddOnChoice } from '@/types/menu';
import { useMenuStore } from '@/store/menu.store';
import { ChefHat, Sparkles, ShoppingBag, Coffee, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  order: Order;
  onUpdateStatus: (id: string, status: Order['status']) => void;
}

export default function KitchenTicket({ order, onUpdateStatus }: Props) {
  const { items: menuItems } = useMenuStore();
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (order.status === 'ready' || order.status === 'completed' || order.status === 'cancelled') return;

    const orderTime = new Date(order.createdAt || order.created_at || Date.now()).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const diffInSeconds = Math.floor((now - orderTime) / 1000);
      setElapsedTime(diffInSeconds > 0 ? diffInSeconds : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [order.status, order.createdAt, order.created_at]);

  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  const timeText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  let urgencyClass = 'border-stone-200 bg-white';
  let headerClass = 'bg-stone-50 border-b border-stone-200';
  let timerClass = 'text-stone-500 bg-stone-200/50';

  if (minutes >= 15) {
    urgencyClass = 'border-red-200 bg-red-50/10 shadow-lg shadow-red-500/10 ring-2 ring-red-500/20';
    headerClass = 'bg-red-50 border-b border-red-100';
    timerClass = 'text-red-700 bg-red-200 animate-pulse font-black';
  } else if (minutes >= 10) {
    urgencyClass = 'border-amber-200 bg-amber-50/30';
    headerClass = 'bg-amber-50 border-b border-amber-100';
    timerClass = 'text-amber-700 bg-amber-200 font-bold';
  }

  if (order.status === 'ready' || order.status === 'completed') {
    urgencyClass = 'border-stone-200 bg-stone-50 opacity-60';
    headerClass = 'bg-stone-100 border-b border-stone-200';
  }

  const parsedItems = Array.isArray(order.items) ? order.items : [];

  return (
    <div className={`rounded-[1.5rem] border overflow-hidden flex flex-col transition-all duration-300 ${urgencyClass}`}>
      
      <div className={`px-4 py-3 flex items-center justify-between ${headerClass}`}>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-md bg-stone-900 text-white font-mono font-bold text-sm tracking-widest shadow-sm">
            #{order.id}
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-stone-700">
            {order.orderType === 'takeaway' ? (
              <><ShoppingBag className="w-4 h-4 text-stone-400" /> BUNGKUS</>
            ) : (
              <><Coffee className="w-4 h-4 text-amber-600" /> MEJA <strong className="text-amber-600 text-sm ml-1">{order.tableId?.replace('T-', '')}</strong></>
            )}
          </div>
        </div>

        {order.status !== 'ready' && order.status !== 'completed' && order.status !== 'cancelled' && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono tracking-widest ${timerClass}`}>
            {minutes >= 15 ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {timeText}
          </div>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-4">
        {parsedItems.map((cartItem: any, idx: number) => {
          // Sesuaikan key pencarian menu (productId atau menuItemId)
          const product = menuItems.find(m => Number(m.id) === Number(cartItem.menuItemId || cartItem.product_id));
          const itemName = product?.name || cartItem.name || cartItem.menuItemName || 'Item Menu';

          // 🔴 FIX: Ambil addons dari 'selectedAddOnsDetails' (sesuai format JSON lu)
          const addons: string[] = [];
          if (Array.isArray(cartItem.selectedAddOnsDetails)) {
            cartItem.selectedAddOnsDetails.forEach((a: any) => addons.push(a.name));
          } else if (cartItem.selectedAddOns) {
             // Fallback kalau formatnya beda
             cartItem.selectedAddOns.forEach((sel: any) => {
                sel.choiceIds?.forEach((cid: string) => addons.push(cid));
             });
          }

          return (
            <div key={idx} className="flex gap-4 items-start relative pb-4 border-b border-stone-100 last:border-0 last:pb-0">
              <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-black text-stone-700 shrink-0">
                {cartItem.quantity || 1}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-sm font-black text-stone-800 leading-tight mb-1">{itemName}</div>
                {addons.length > 0 && (
                  <div className="text-xs font-bold text-amber-600 leading-snug mb-1">
                    + {addons.join(' · ')}
                  </div>
                )}
                {cartItem.notes && (
                  <div className="text-[11px] font-medium text-stone-500 italic bg-stone-50 p-2 rounded-md border border-stone-100 mt-1">
                    &quot;{cartItem.notes}&quot;
                  </div>
                )}
                {cartItem.admin_notes && (
                  <div className="text-[11px] font-medium text-stone-500 italic bg-stone-50 p-2 rounded-md border border-stone-100 mt-1">
                    &quot;{cartItem.admin_notes}&quot;
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {order.adminNotes && (
          <div className="mt-2 p-3 bg-red-50/50 border border-red-100 rounded-xl text-xs text-red-800">
            <strong className="font-bold uppercase tracking-widest text-[10px] block mb-1">Catatan Kasir:</strong> 
            {order.adminNotes}
          </div>
        )}
      </div>

      <div className="p-4 pt-0">
        {(order.status === 'pending' || order.status === 'confirmed') && (
          <button 
            className="w-full py-3.5 rounded-xl bg-amber-500 text-white text-xs font-bold uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95"
            onClick={() => onUpdateStatus(String(order.id), 'preparing')}
          >
            <ChefHat className="w-4 h-4" /> Mulai Meracik
          </button>
        )}
        
        {order.status === 'preparing' && (
          <button 
            className="w-full py-3.5 rounded-xl bg-[#0E5C37] text-white text-xs font-bold uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 active:scale-95"
            onClick={() => onUpdateStatus(String(order.id), 'ready')}
          >
            <Sparkles className="w-4 h-4" /> Pesanan Siap
          </button>
        )}

        {(order.status === 'ready' || order.status === 'completed') && (
          <button className="w-full py-3.5 rounded-xl bg-stone-200 text-stone-400 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
            <CheckCircle2 className="w-4 h-4" /> Selesai
          </button>
        )}
      </div>
    </div>
  );
}