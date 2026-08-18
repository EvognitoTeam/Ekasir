import { useEffect, useState } from 'react';
import { Order } from '@/types/menu';
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

  const manualTableInfo =
    (order as any)?.manualTableInfo ||
    (order as any)?.manual_table_info ||
    '';

  const normalizedOrderType =
    String(
      (order as any)?.orderType ||
        (order as any)?.order_type ||
        manualTableInfo ||
        '',
    )
      .trim()
      .toLowerCase();

  const isTakeaway =
    normalizedOrderType === 'takeaway' ||
    String(manualTableInfo)
      .trim()
      .toLowerCase() === 'takeaway';

  const rawTableName =
    (order as any)?.tableName ||
    (order as any)?.table_name ||
    (order as any)?.tableId ||
    (order as any)?.table_id ||
    (order as any)?.tableNumber ||
    (order as any)?.table_number ||
    '';

  const tableName =
    typeof rawTableName === 'string'
      ? rawTableName.replace(/^T-/, '')
      : rawTableName
        ? String(rawTableName)
        : '';

  const hasTable =
    Boolean(tableName) &&
    tableName !== 'null' &&
    tableName !== 'undefined' &&
    tableName.toLowerCase() !== 'walk-in';

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

  // 🔴 LOGIKA PARSING ANTI-GAGAL UNTUK ARRAY ITEMS
  let parsedItems: any[] = [];
  try {
    if (typeof order.items === 'string') {
      parsedItems = JSON.parse(order.items);
    } else if (Array.isArray(order.items)) {
      parsedItems = order.items;
    }
  } catch (error) {
    console.error("Gagal memproses detail pesanan:", error);
    parsedItems = [];
  }

  return (
    <div className={`rounded-[1.5rem] border overflow-hidden flex flex-col transition-all duration-300 ${urgencyClass}`}>
      
      <div className={`px-4 py-3 flex items-center justify-between ${headerClass}`}>
        <div className="flex items-center gap-3">
          <div className="px-2.5 py-1 rounded-md bg-stone-900 text-white font-mono font-bold text-sm tracking-widest shadow-sm">
            #{order.id}
          </div>
          <div className="flex flex-col gap-1">
            {isTakeaway ? (
              <>
                <div className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-black uppercase tracking-widest text-red-700">
                  <ShoppingBag className="h-4 w-4 shrink-0" />
                  TAKEAWAY
                </div>

                {hasTable && (
                  <div className="flex items-center gap-1.5 pl-1 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                    <Coffee className="h-3.5 w-3.5 text-amber-600" />
                    DARI MEJA
                    <strong className="ml-0.5 text-xs text-amber-700">
                      {tableName}
                    </strong>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-stone-700">
                <Coffee className="h-4 w-4 text-amber-600" />
                MEJA
                <strong className="ml-1 text-sm text-amber-600">
                  {hasTable ? tableName : 'WALK-IN'}
                </strong>
              </div>
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

      {isTakeaway && (
        <div className="border-b border-red-200 bg-red-600 px-4 py-3 text-white">
          <div className="flex items-center justify-center gap-2 text-sm font-black uppercase tracking-[0.18em]">
            <ShoppingBag className="h-5 w-5" />
            Takeaway
          </div>

          {hasTable && (
            <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-widest text-red-100">
              Pesanan berasal dari meja {tableName}
            </p>
          )}
        </div>
      )}

      {/* BODY TIKET */}
      <div className="p-4 flex-1 flex flex-col gap-4">
        {parsedItems.map((cartItem: any, idx: number) => {
          const product = menuItems.find(m => Number(m.id) === Number(cartItem.menuItemId || cartItem.product_id));
          const itemName = product?.name || cartItem.name || cartItem.menuItemName || 'Item Menu';

          const addOnsList: string[] = [];

          // Ambil langsung dari array selectedAddOnsDetails sesuai struktur response API
          const details = cartItem.selectedAddOnsDetails;
          
          if (Array.isArray(details) && details.length > 0) {
            details.forEach((addon: any) => {
              if (addon && typeof addon === 'object') {
                const addonName = addon.name || addon.title;
                if (addonName) {
                  addOnsList.push(addonName);
                }
              } else if (typeof addon === 'string') {
                addOnsList.push(addon);
              }
            });
          }

          return (
            <div key={idx} className="flex gap-4 items-start relative pb-4 border-b border-stone-100 last:border-0 last:pb-0">
              <div className="w-8 h-8 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-black text-stone-700 shrink-0">
                {cartItem.quantity || 1}
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-sm font-black text-stone-800 leading-tight mb-1">{itemName}</div>
                
                {/* Render Add-ons / Varian (Contoh: + Small, + Pedas) */}
                {addOnsList.length > 0 && (
                  <div className="text-xs font-bold text-amber-600 leading-snug mb-1">
                    + {addOnsList.join(' · ')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* {isTakeaway && (
        <div className="mx-4 mb-3 flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 bg-red-50 px-3 py-2.5 text-center">
          <ShoppingBag className="h-4 w-4 shrink-0 text-red-600" />
          <span className="text-[10px] font-black uppercase tracking-widest text-red-700">
            Jangan disajikan di meja — bungkus pesanan
          </span>
        </div>
      )} */}

      {/* 🔴 FOOTER: ADMIN NOTES SEJAJAR DENGAN TOMBOL STATUS */}
      <div className="p-4 pt-0 flex gap-3 items-stretch">
        
        {/* Catatan Admin / Kasir (Sebelah Kiri) */}
        {order.admin_notes && (
          <div className="flex-1 p-2.5 bg-red-50/80 border border-red-100 rounded-xl flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-red-500 mb-0.5">Catatan Kasir:</span>
            <span className="text-[11px] font-medium text-red-800 leading-snug line-clamp-2" title={order.adminNotes}>
              {order.admin_notes}
            </span>
          </div>
        )}

        {/* Tombol Status (Sebelah Kanan) */}
        <div className={order.admin_notes ? "flex-1" : "w-full"}>
          {(order.status === 'pending' || order.status === 'confirmed') && (
            <button 
              className="w-full h-full min-h-[48px] rounded-xl bg-amber-500 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 active:scale-95 px-2"
              onClick={() => onUpdateStatus(String(order.id), 'preparing')}
            >
              <ChefHat className="w-4 h-4 shrink-0" /> 
              {order.admin_notes ? 'Meracik' : 'Mulai Meracik'}
            </button>
          )}
          
          {order.status === 'preparing' && (
            <button 
              className="w-full h-full min-h-[48px] rounded-xl bg-[#0E5C37] text-white text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-800 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20 active:scale-95 px-2"
              onClick={() => onUpdateStatus(String(order.id), 'ready')}
            >
              <Sparkles className="w-4 h-4 shrink-0" /> 
              {order.admin_notes ? 'Siap' : 'Pesanan Siap'}
            </button>
          )}

          {(order.status === 'ready' || order.status === 'completed') && (
            <button className="w-full h-full min-h-[48px] rounded-xl bg-stone-200 text-stone-400 text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-not-allowed px-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Selesai
            </button>
          )}
        </div>

      </div>
    </div>
  );
}