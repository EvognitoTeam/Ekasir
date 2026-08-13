'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore } from '@/store/menu.store';
import { CartItem, Order } from '@/types/menu';
import { formatPrice } from '@/utils/formatters';
import { ArrowLeft, Plus, Minus, Search, X, CheckCircle2, Loader2, CheckSquare, Square, ChevronDown, QrCode, Coffee, Ticket, ShoppingCart, ShoppingBag, Trash2, UserCircle, Coins } from 'lucide-react';
import { useParams } from 'next/navigation'; 
import { Toast } from "@/utils/toast";

interface CashierPOSProps {
  onClose: () => void;
  onSubmitOrder: (order: Order) => void | Promise<void>;
}

export default function CashierPOS({ onClose, onSubmitOrder }: CashierPOSProps) {
  const { items, categories } = useMenuStore();
  const params = useParams(); 
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";
  const branchSlug = (params.branchSlug as string) || undefined;
  
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [tables, setTables] = useState<any[]>([]);
  
  // States Add-on Modal
  const [selectedProductForAddon, setSelectedProductForAddon] = useState<any | null>(null);
  const [tempAddons, setTempAddons] = useState<number[]>([]);
  const [tempItemNote, setTempItemNote] = useState('');

  // Checkout states
  const [orderType, setOrderType] = useState<'dine-in'|'takeaway'>('dine-in');
  const [customerName, setCustomerName] = useState('');
  const [customerIdentity, setCustomerIdentity] = useState(''); 
  const [tableId, setTableId] = useState(''); 
  const [tableDisplay, setTableDisplay] = useState(''); 
  const [showTableOptions, setShowTableOptions] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'qris'>('cash');
  const [cashAmount, setCashAmount] = useState<string>('');

  // State Member & Points
  const [isVerifyingMember, setIsVerifyingMember] = useState(false);
  const [verifiedMember, setVerifiedMember] = useState<any | null>(null);
  const [usePoints, setUsePoints] = useState<boolean>(false);

  // Dropdown Voucher
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string>('');

  // Settings
  const [taxRate, setTaxRate] = useState(0);
  const [serviceRate, setServiceRate] = useState(0);
  const [isTaxIncluded, setIsTaxIncluded] = useState(false);

  // State QRIS Modal
  const [qrisData, setQrisData] = useState<{ qrUrl: string, orderCode: string, optimisticOrder: Order } | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!slug) return;
      try {
        const resTables = await fetch(`/api/pos/tables?slug=${slug}`);
        const dataTables = await resTables.json();
        if (dataTables.success) setTables(dataTables.data);

        const resCoupons = await fetch(`/api/coupons?slug=${slug}`);
        const dataCoupons = await resCoupons.json();
        if (dataCoupons.success && Array.isArray(dataCoupons.data)) {
          setAvailableCoupons(dataCoupons.data);
        }

        const resSettings = await fetch(`/api/settings?slug=${slug}`);
        const dataSettings = await resSettings.json();

        if (dataSettings.success && dataSettings.data) {
          setTaxRate(Number(dataSettings.data.taxRate ?? dataSettings.data.tax_rate ?? 0) || 0);
          setServiceRate(Number(dataSettings.data.serviceRate ?? dataSettings.data.service_rate ?? 0) || 0);
          setIsTaxIncluded(Number(dataSettings.data.isTaxIncluded ?? dataSettings.data.is_tax_included ?? 0) === 1);
        }
      } catch (e) {
        console.error("Gagal ambil data awal:", e);
      }
    };
    fetchInitialData();
  }, [slug]);

  const handleVerifyMember = async () => {
    if (!customerIdentity.trim()) return;
    
    setIsVerifyingMember(true);
    try {
      const response = await fetch('/api/kiosk/member/identify', {
        method: 'POST',
        cache: 'no-store',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, branchSlug, identifier: customerIdentity.trim() }),
      });

      const result = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message || 'Data member tidak ditemukan.');
      }

      setVerifiedMember(result.data);
      setUsePoints(false);
      
      if (result.data.name) {
        setCustomerName(result.data.name); 
      }

      Toast.fire({ icon: 'success', title: `Member Terverifikasi: ${result.data.name}`, topLayer: true });
    } catch (error) {
      setVerifiedMember(null);
      setUsePoints(false);
      setSelectedCouponCode(''); 
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Gagal mengecek member', topLayer: true });
    } finally {
      setIsVerifyingMember(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (search) return item.name.toLowerCase().includes(search.toLowerCase());
      return item.categoryId === activeCategory || String(item.categoryId) === String(activeCategory);
    });
  }, [items, activeCategory, search]);

  const getAddonDetails = (menuItemId: string, addonIds: number[]) => {
    const product = items.find(i => String(i.id) === String(menuItemId));
    if (!product || !addonIds || addonIds.length === 0) return [];
    
    const details: { name: string; price: number }[] = [];
    addonIds.forEach(id => {
      product.categorizedAddons?.forEach((cat: any) => {
        const found = cat.addons?.find((a: any) => Number(a.id) === Number(id));
        if (found) details.push({ name: found.name, price: Number(found.price || 0) });
      });
    });
    return details;
  };

  const calculateItemPrice = (menuItemId: string, addonIds: number[]) => {
    const product = items.find(i => String(i.id) === String(menuItemId));
    let total = Number(product?.basePrice || 0);
    
    if (addonIds && addonIds.length > 0) {
      addonIds.forEach(id => {
        product?.categorizedAddons?.forEach((cat: any) => {
          const found = cat.addons?.find((a: any) => Number(a.id) === Number(id));
          if (found) total += Number(found.price || 0);
        });
      });
    }
    return total;
  };

  const getAddonNames = (menuItemId: string, addonIds: number[]) => {
    const product = items.find(i => String(i.id) === String(menuItemId));
    if (!product || !addonIds || !addonIds.length) return [];
    
    const names: string[] = [];
    addonIds.forEach(id => {
      product.categorizedAddons?.forEach((cat: any) => {
        const found = cat.addons?.find((a: any) => Number(a.id) === Number(id));
        if (found) names.push(found.name);
      });
    });
    return names;
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, cartItem) => {
      const itemPrice = calculateItemPrice(cartItem.menuItemId, cartItem.selectedAddOnsDetails || []);
      return sum + (itemPrice * cartItem.quantity);
    }, 0);
  }, [cart, items]);

  const visibleCoupons = useMemo(() => {
    return availableCoupons.filter(coupon => {
      const isMemberOnly = coupon.is_member_only || coupon.isMemberOnly;
      if (isMemberOnly && !verifiedMember) return false;
      return true;
    });
  }, [availableCoupons, verifiedMember]);

  const { couponDiscountAmount, discountError } = useMemo(() => {
    if (!selectedCouponCode) return { couponDiscountAmount: 0, discountError: '' };
    
    const coupon = visibleCoupons.find(c => c.code === selectedCouponCode);
    if (!coupon) return { couponDiscountAmount: 0, discountError: 'Kupon tidak valid atau khusus member.' };

    const minOrder = Number(coupon.min_purchase || coupon.min_order || 0);
    if (subtotal < minOrder) {
      return { couponDiscountAmount: 0, discountError: `Min. belanja ${formatPrice(minOrder)}` };
    }

    const type = coupon.type || coupon.discount_type;
    const value = Number(coupon.value || coupon.discount_value || coupon.amount);
    
    let calc = 0;
    if (type === 'percent') {
      calc = subtotal * (value / 100);
      const maxDiscount = Number(coupon.max_discount || 0);
      if (maxDiscount > 0 && calc > maxDiscount) calc = maxDiscount;
    } else {
      calc = value;
    }
    return { couponDiscountAmount: calc, discountError: '' };
  }, [subtotal, selectedCouponCode, visibleCoupons]);

  const pointDiscountAmount = useMemo(() => {
    if (!usePoints || !verifiedMember || !verifiedMember.points) return 0;
    
    const maxDiscountable = Math.max(0, subtotal - couponDiscountAmount);
    return Math.min(Number(verifiedMember.points), maxDiscountable);
  }, [usePoints, verifiedMember, subtotal, couponDiscountAmount]);

  const pricing = useMemo(() => {
    const normalizedCoupon = Math.max(0, Math.floor(Number(couponDiscountAmount) || 0));
    const normalizedPoint = Math.max(0, Math.floor(Number(pointDiscountAmount) || 0));
    const totalDiscount = normalizedCoupon + normalizedPoint; 
    
    const subtotalAfterDiscount = Math.max(0, Math.floor(subtotal) - totalDiscount);

    let calculatedTax = 0;
    let calculatedService = 0;
    let grandTotal = 0;

    if (isTaxIncluded) {
      const serviceDecimal = Number(serviceRate || 0) / 100;
      const taxDecimal = Number(taxRate || 0) / 100;
      const divisor = (1 + serviceDecimal) * (1 + taxDecimal);
      const trueBase = divisor > 0 ? Math.floor(subtotalAfterDiscount / divisor) : subtotalAfterDiscount;

      calculatedService = Math.floor(trueBase * serviceDecimal);
      calculatedTax = subtotalAfterDiscount - trueBase - calculatedService;
      grandTotal = subtotalAfterDiscount;
    } else {
      calculatedService = Math.floor(subtotalAfterDiscount * (Number(serviceRate || 0) / 100));
      calculatedTax = Math.floor((subtotalAfterDiscount + calculatedService) * (Number(taxRate || 0) / 100));
      grandTotal = subtotalAfterDiscount + calculatedService + calculatedTax;
    }

    return {
      couponDiscount: normalizedCoupon,
      pointDiscount: normalizedPoint,
      totalDiscount: totalDiscount,
      subtotalAfterDiscount,
      tax: calculatedTax,
      service: calculatedService,
      total: grandTotal,
    };
  }, [subtotal, couponDiscountAmount, pointDiscountAmount, taxRate, serviceRate, isTaxIncluded]);

  const tax = pricing.tax;
  const serviceCharge = pricing.service;
  const total = pricing.total;

  const addToCart = (productId: string, selectedAddons: number[] = [], notes: string = "") => {
    setCart(prev => {
      const existing = prev.find(c => 
        String(c.menuItemId) === String(productId) && 
        JSON.stringify(c.selectedAddOnsDetails || []) === JSON.stringify(selectedAddons) &&
        (c.notes || "") === notes
      );
      if (existing) return prev.map(c => c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { id: crypto.randomUUID(), menuItemId: productId, quantity: 1, selectedAddOns: [], selectedAddOnsDetails: selectedAddons, notes }];
    });
  };

  const handleItemClick = (item: any) => {
    const hasAddons = item.addonGroups && item.addonGroups.length > 0;
    if (hasAddons) {
      setSelectedProductForAddon(item);
      setTempAddons([]);
      setTempItemNote('');
    } else {
      addToCart(String(item.id));
    }
  };

  const toggleTempAddon = (addonId: number) => {
    setTempAddons(prev => prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.id === cartItemId) return { ...c, quantity: Math.max(0, c.quantity + delta) };
      return c;
    }).filter(c => c.quantity > 0));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (orderType === 'dine-in' && !tableId) {
      Toast.fire({ icon: 'warning', title: 'Pilih Meja', text: 'Masukkan nomor meja atau pager', topLayer: true });
      return;
    }
    if (paymentMethod === 'cash' && cashAmount && Number(cashAmount) < total) {
      Toast.fire({ icon: 'error', title: 'Uang Kurang', text: 'Nominal uang tunai kurang dari total tagihan', topLayer: true });
      return;
    }

    setIsSubmitting(true);
    const paid = paymentMethod === 'cash' ? (Number(cashAmount) || total) : total;
    const change = paymentMethod === 'cash' ? Math.max(0, paid - total) : 0;

    try {
      const selectedCoupon = visibleCoupons.find((coupon) => String(coupon.code ?? coupon.coupon_code ?? '') === selectedCouponCode);
      const cartItems = cart.map((cartItem) => {
        const addonDetails = getAddonDetails(cartItem.menuItemId, cartItem.selectedAddOnsDetails || []);
        const customerNote = String(cartItem.notes || '').trim();
        const noteDetails = customerNote ? [{ name: `Note: ${customerNote}`, price: 0, customer_note: customerNote, cust_notes: customerNote }] : [];
        const selectedAddOnsDetails = [...addonDetails, ...noteDetails];

        return {
          menuItemId: cartItem.menuItemId,
          product_id: cartItem.menuItemId,
          quantity: cartItem.quantity,
          priceAtOrder: calculateItemPrice(cartItem.menuItemId, cartItem.selectedAddOnsDetails || []),
          selectedAddOnsDetails,
          notes: JSON.stringify(selectedAddOnsDetails),
          customerNote: customerNote || null,
          name: items.find((item) => String(item.id) === String(cartItem.menuItemId))?.name ?? 'Produk',
        };
      });

      const orderPayload = {
        total: Math.floor(subtotal),
        discount: pricing.totalDiscount, 
        couponDiscount: pricing.couponDiscount,
        pointDiscount: pricing.pointDiscount,
        pointsRedeemed: pricing.pointDiscount, 
        totalAfterDiscount: total,
        customer: {
          name: customerName || 'Tamu Kasir',
          tableNumber: orderType === 'takeaway' ? null : tableId,
          manualTableInfo: orderType === 'takeaway' ? 'Takeaway' : (tableDisplay || tableId || null),
          serviceType: orderType === 'takeaway' ? 'takeaway' : 'dine-in',
          method: paymentMethod,
          
          userId: verifiedMember?.id || verifiedMember?.userId || null,
          memberId: customerIdentity || null,
          phone: customerIdentity && !customerIdentity.includes('@') ? customerIdentity : null,
          email: customerIdentity && customerIdentity.includes('@') ? customerIdentity : null,
        },
        cartItems,
        discountId: pricing.couponDiscount > 0 ? (selectedCoupon?.id ?? null) : null,
        voucher_code: pricing.couponDiscount > 0 ? selectedCouponCode : null,
        getPayment: paid,
        cashChange: change,
        idempotencyKey: `POS-${slug}-${Date.now()}-${crypto.randomUUID()}`,
      };

      const response = await fetch(`/api/pos/orders?slug=${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Gagal membuat pesanan');
      }

      const serverOrder = (result.printOrder ?? result.data) as Order;
      const serverItems = Array.isArray((serverOrder as any)?.items) ? (serverOrder as any).items : [];
      const mergedItems = cartItems.map((localItem, index) => {
        const matchingServerItem = serverItems.find((serverItem: any) => String(serverItem.menuItemId ?? serverItem.menu_item_id ?? serverItem.product_id ?? serverItem.productId ?? '') === String(localItem.menuItemId)) ?? serverItems[index] ?? {};
        return {
          ...localItem,
          ...matchingServerItem,
          menuItemId: String(matchingServerItem.menuItemId ?? matchingServerItem.menu_item_id ?? matchingServerItem.product_id ?? localItem.menuItemId),
          product_id: matchingServerItem.product_id ?? matchingServerItem.productId ?? localItem.product_id,
          selectedAddOnsDetails: localItem.selectedAddOnsDetails,
          notes: typeof matchingServerItem.notes === 'string' && matchingServerItem.notes.trim() !== '' ? matchingServerItem.notes : localItem.notes,
        };
      });

      const createdOrder = serverOrder ? ({ ...serverOrder, items: mergedItems } as Order) : null;
      if (!createdOrder) throw new Error('Server tidak mengembalikan data order untuk dicetak.');

      await onSubmitOrder(createdOrder);

      if (result.paymentMethod === 'qris' && result.qrUrl) {
        setQrisData({
          qrUrl: result.qrUrl,
          orderCode: result.orderCode,
          optimisticOrder: createdOrder,
        });
      } else {
        setCart([]);
        setCashAmount('');
        setSelectedCouponCode('');
        setCustomerName('');
        setCustomerIdentity(''); 
        setVerifiedMember(null);
        setUsePoints(false);
      }
    } catch (error) {
      console.error('[POS_CHECKOUT_ERROR]', error);
      Toast.fire({ icon: 'error', title: error instanceof Error ? error.message : 'Terjadi kesalahan jaringan.', topLayer: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeQrisModal = () => {
    setQrisData(null);
    setCart([]);
    setCashAmount('');
    setSelectedCouponCode('');
    setCustomerName('');
    setCustomerIdentity('');
    setVerifiedMember(null);
    setUsePoints(false);
    onClose(); 
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 15 }}
      className="fixed inset-0 z-[60] flex w-full h-full bg-stone-100 overflow-hidden text-stone-800"
    >
      {/* KIRI: AREA MENU & KATEGORI */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50">
        <header className="bg-white border-b border-stone-200 px-6 py-3.5 shadow-sm z-10 flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 transition flex items-center gap-2 pr-4 font-bold text-sm">
              <ArrowLeft className="w-5 h-5" /> Kembali
            </button>
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Cari nama menu..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition-all text-sm font-medium text-stone-800"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {!search && (
            <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {categories.map(cat => (
                <button 
                  key={cat.id} 
                  onClick={() => setActiveCategory(String(cat.id))}
                  className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    String(activeCategory) === String(cat.id) 
                      ? 'bg-emerald-700 border-emerald-700 text-white shadow-md shadow-emerald-900/20' 
                      : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300 hover:bg-stone-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {filteredItems.map(item => {
              const countInCart = cart.filter(c => String(c.menuItemId) === String(item.id)).reduce((s, c) => s + c.quantity, 0);
              const imgUrl = item.image && !item.image.includes('http') ? `/${item.image}` : item.image; 

              return (
                <div 
                  key={item.id} 
                  onClick={() => handleItemClick(item)}
                  className="bg-white rounded-xl p-2.5 border border-stone-200 shadow-sm hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group relative flex flex-col h-full"
                >
                  <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-stone-100 mb-2 relative">
                    {imgUrl ? (
                      <img src={imgUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Coffee className="w-8 h-8 text-stone-300" />
                      </div>
                    )}
                    {countInCart > 0 && (
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-lg">
                        {countInCart}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 justify-between">
                    <p className="text-xs font-bold text-stone-800 leading-tight mb-1.5 line-clamp-2">{item.name}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <p className="text-emerald-700 text-sm font-black">{formatPrice(Number(item.basePrice))}</p>
                      <button className="w-7 h-7 rounded-lg bg-stone-100 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredItems.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-stone-400">
              <ShoppingBag className="w-16 h-16 mb-4 text-stone-300" />
              <p className="font-bold">Tidak ada menu yang ditemukan</p>
            </div>
          )}
        </div>
      </div>

      {/* KANAN: AREA KERANJANG & CHECKOUT (Lebar 480px, Split Bottom Layout) */}
      <div className="w-[480px] bg-white border-l border-stone-200 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.03)] z-20">
        
        {/* Header Keranjang */}
        <header className="px-5 py-4 border-b border-stone-100 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black font-display text-stone-800 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-700" /> Keranjang Belanja
            </h2>
            <span className="bg-stone-100 text-stone-600 px-2.5 py-1 rounded-md text-xs font-bold">
              {cart.reduce((s, c) => s + c.quantity, 0)} Item
            </span>
          </div>

          <div className="flex gap-2 p-1 bg-stone-100 rounded-lg">
            {(['dine-in', 'takeaway'] as const).map(type => (
              <button 
                key={type} 
                onClick={() => setOrderType(type)} 
                className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                  orderType === type 
                    ? 'bg-white text-emerald-700 shadow-sm' 
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {type === 'takeaway' ? 'Bungkus' : 'Dine In'}
              </button>
            ))}
          </div>
        </header>

        {/* List Item Keranjang */}
        <div className="flex-1 overflow-y-auto p-4 bg-stone-50/50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400">
              <ShoppingCart className="w-10 h-10 mb-2 text-stone-300" />
              <p className="font-bold text-sm">Keranjang Kosong</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {cart.map(cartItem => {
                const product = items.find(i => String(i.id) === String(cartItem.menuItemId));
                if (!product) return null;
                const unitPrice = calculateItemPrice(cartItem.menuItemId, cartItem.selectedAddOnsDetails || []);
                const addonNames = getAddonNames(cartItem.menuItemId, cartItem.selectedAddOnsDetails || []);

                return (
                  <div key={cartItem.id} className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className="font-bold text-sm text-stone-800 leading-tight">{product.name}</p>
                        {addonNames.length > 0 && <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">{addonNames.join(', ')}</p>}
                        {cartItem.notes && <p className="text-[10px] text-amber-700 font-medium italic mt-0.5 bg-amber-50 px-1.5 py-0.5 rounded inline-block line-clamp-1">Catatan: {cartItem.notes}</p>}
                      </div>
                      <p className="font-black text-emerald-700 text-sm whitespace-nowrap">{formatPrice(unitPrice * cartItem.quantity)}</p>
                    </div>
                    
                    <div className="flex items-center justify-between border-t border-stone-100 pt-2 mt-0.5">
                      <button onClick={() => { setCart(prev => prev.filter(c => c.id !== cartItem.id)) }} className="text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2 bg-stone-100 p-0.5 rounded-lg">
                        <button onClick={() => updateQuantity(cartItem.id, -1)} className="w-7 h-7 rounded-md bg-white text-stone-700 flex items-center justify-center shadow-sm hover:bg-stone-50 transition"><Minus className="w-3 h-3" /></button>
                        <span className="w-5 text-center font-black text-xs text-stone-800">{cartItem.quantity}</span>
                        <button onClick={() => updateQuantity(cartItem.id, 1)} className="w-7 h-7 rounded-md bg-emerald-700 text-white flex items-center justify-center shadow-sm hover:bg-emerald-800 transition"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🟢 AREA CHECKOUT DENGAN SPLIT LAYOUT KIRI-KANAN */}
        <div className="bg-white border-t border-stone-200 p-4 shadow-[0_-10px_24px_rgba(0,0,0,0.02)] z-10 flex gap-4 items-stretch">
          
          {/* KIRI: Input Form (Pelanggan, Meja, Member, Kupon) */}
          <div className="flex-1 flex flex-col gap-2.5">
            
            {/* Baris 1: Pelanggan & Meja */}
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Nama Pelanggan" 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)} 
                className="flex-1 px-3 py-2 rounded-lg border border-stone-200 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/10 transition"
              />
              {orderType === 'dine-in' && (
                <div className="relative w-24">
                  <input 
                    type="text" 
                    placeholder="No Meja" 
                    value={tableDisplay} 
                    onChange={e => { setTableDisplay(e.target.value); setTableId(e.target.value); }} 
                    onFocus={() => setShowTableOptions(true)}
                    onBlur={() => setTimeout(() => setShowTableOptions(false), 200)}
                    className="w-full px-3 py-2 pr-6 rounded-lg border border-stone-200 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/10 transition"
                  />
                  <ChevronDown className="w-3 h-3 text-stone-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <AnimatePresence>
                    {showTableOptions && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute bottom-[calc(100%+8px)] right-0 w-40 bg-white border border-stone-200 rounded-lg max-h-40 overflow-y-auto shadow-xl z-50">
                        {tables.filter(t => t.table_name.toLowerCase().includes(tableDisplay.toLowerCase())).map(t => (
                          <div key={t.id} onMouseDown={() => { setTableId(String(t.id)); setTableDisplay(t.table_name); setShowTableOptions(false); }} className="px-3 py-2 border-b border-stone-100 text-xs font-medium hover:bg-stone-50 cursor-pointer text-stone-700">
                            {t.table_name}
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Baris 2: Data Member */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <UserCircle className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="ID Member / No. HP" 
                  value={customerIdentity} 
                  onChange={e => {
                    setCustomerIdentity(e.target.value);
                    if (verifiedMember) {
                      setVerifiedMember(null);
                      setUsePoints(false);
                      setSelectedCouponCode('');
                    }
                  }} 
                  onKeyDown={e => e.key === 'Enter' && handleVerifyMember()}
                  className="w-full pl-8 pr-7 py-2 rounded-lg border border-stone-200 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/10 transition"
                />
                {verifiedMember && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
              <button 
                onClick={handleVerifyMember}
                disabled={isVerifyingMember || !customerIdentity}
                className="px-3 py-2 bg-stone-100 border border-stone-200 text-stone-700 font-bold rounded-lg text-[11px] hover:bg-stone-200 transition disabled:opacity-50 min-w-[50px] flex items-center justify-center"
              >
                {isVerifyingMember ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Cek'}
              </button>
            </div>

            {/* Poin Member (Jika Valid) */}
            {verifiedMember && (
              <div className="px-2.5 py-1.5 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  <p className="text-[10px] font-bold text-emerald-900 leading-none">
                    {verifiedMember.name} <span className="font-medium opacity-70">({formatPrice(verifiedMember.points).replace('Rp', '').trim()})</span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                   <label className={`relative inline-flex items-center ${Number(verifiedMember.points) > 0 ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'} scale-75 origin-right`}>
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={usePoints} 
                      disabled={Number(verifiedMember.points) <= 0}
                      onChange={(e) => setUsePoints(e.target.checked)} 
                    />
                    <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Baris 3: Kupon & Tipe Pembayaran */}
            <div className="flex gap-2">
              <select
                value={selectedCouponCode}
                onChange={(e) => setSelectedCouponCode(e.target.value)}
                className="flex-1 px-2 py-2 rounded-lg border border-stone-200 text-xs outline-none bg-stone-50 font-bold text-stone-700 cursor-pointer focus:border-emerald-600"
              >
                <option value="">Promo</option>
                {visibleCoupons.map((coupon) => (
                  <option key={coupon.id || coupon.coupon_code} value={coupon.coupon_code}>
                    {coupon.coupon_code} {coupon.is_member_only || coupon.isMemberOnly ? '(Member Only)' : ''}
                  </option>
                ))}
              </select>
              <div className="flex w-24 p-0.5 bg-stone-100 rounded-lg">
                {(['cash', 'qris'] as const).map(method => (
                  <button key={method} onClick={() => setPaymentMethod(method)} className={`flex-1 rounded-md text-[10px] font-bold flex items-center justify-center transition-all ${paymentMethod === method ? 'bg-emerald-700 text-white shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
                    {method === 'cash' ? 'Tunai' : 'QRIS'}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert Kupon Error */}
            {selectedCouponCode && discountError && (
              <p className="text-[10px] font-bold text-red-500 -mt-1 leading-tight">! {discountError}</p>
            )}

            {/* Baris 4: Input Tunai (Cash) */}
            {paymentMethod === 'cash' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="flex gap-2">
                 <input 
                    type="text" 
                    inputMode="numeric"
                    placeholder="Jml. Uang (Cth: 50000)" 
                    value={cashAmount} 
                    onChange={e => setCashAmount(e.target.value.replace(/\D/g, ""))} 
                    className="flex-1 px-3 py-2 rounded-lg border border-emerald-600 text-xs font-black text-emerald-900 outline-none bg-emerald-50 placeholder:font-medium"
                  />
                  <button onClick={() => setCashAmount(String(total))} className="px-3 bg-stone-800 text-white rounded-lg text-[10px] font-bold hover:bg-stone-900 transition whitespace-nowrap">Uang Pas</button>
              </motion.div>
            )}
          </div>

          {/* KANAN: Ringkasan Total & Tombol Proses */}
          <div className="w-[180px] flex flex-col gap-2.5">
            <div className="bg-stone-50 px-3 py-2.5 rounded-xl border border-stone-200 flex-1 flex flex-col justify-center">
              <div className="flex justify-between text-[10px] text-stone-500 font-medium mb-1">
                <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
              </div>
              {pricing.couponDiscount > 0 && (
                <div className="flex justify-between text-[10px] text-red-500 font-bold mb-1">
                  <span>Kupon</span><span>-{formatPrice(pricing.couponDiscount)}</span>
                </div>
              )}
              {pricing.pointDiscount > 0 && (
                <div className="flex justify-between text-[10px] text-emerald-600 font-bold mb-1">
                  <span>Poin</span><span>-{formatPrice(pricing.pointDiscount)}</span>
                </div>
              )}
              {(!isTaxIncluded && tax > 0) && (
                <div className="flex justify-between text-[10px] text-stone-500 font-medium mb-1">
                  <span>Pajak+Layanan</span><span>{formatPrice(tax + serviceCharge)}</span>
                </div>
              )}
              <div className="border-t border-dashed border-stone-300 my-1.5"></div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-stone-800 leading-none">TOTAL BAYAR</span>
                <span className="text-xl font-black font-display text-emerald-700 tracking-tight leading-none mt-1">{formatPrice(total)}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout} 
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-900/20"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} 
              {isSubmitting ? 'Memproses...' : 'Proses'}
            </button>
          </div>

        </div>
      </div>

      {/* POPUP: ADDONS MODAL */}
      <AnimatePresence>
        {selectedProductForAddon && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedProductForAddon(null)} className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-stone-100 flex items-start justify-between bg-stone-50">
                <div>
                  <h3 className="text-lg font-black text-stone-800 font-display leading-tight">{selectedProductForAddon.name}</h3>
                  <p className="text-emerald-700 text-sm font-black mt-1">{formatPrice(calculateItemPrice(String(selectedProductForAddon.id), tempAddons))}</p>
                </div>
                <button onClick={() => setSelectedProductForAddon(null)} className="p-2 bg-white rounded-full border border-stone-200 text-stone-400 hover:text-stone-600 hover:bg-stone-50"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                <p className="text-sm font-black text-stone-800 mb-3">Tambahan Opsional</p>
                <div className="space-y-2">
                  {selectedProductForAddon.categorizedAddons?.[0]?.addons?.filter((a: any) => selectedProductForAddon.addonGroups?.includes(Number(a.id))).map((addon: any) => {
                    const isSelected = tempAddons.includes(Number(addon.id));
                    return (
                      <div key={addon.id} onClick={() => toggleTempAddon(Number(addon.id))} className={`flex justify-between items-center p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-emerald-600 bg-emerald-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}>
                        <div className="flex items-center gap-3">
                          {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-600" /> : <Square className="w-4 h-4 text-stone-300" />}
                          <span className={`text-sm font-bold ${isSelected ? 'text-emerald-800' : 'text-stone-700'}`}>{addon.name}</span>
                        </div>
                        {Number(addon.price) > 0 && <span className="text-xs font-black text-stone-500">+{formatPrice(Number(addon.price))}</span>}
                      </div>
                    )
                  })}
                </div>
                <div className="mt-5">
                  <p className="text-sm font-black text-stone-800 mb-2">Catatan Khusus Menu</p>
                  <input type="text" placeholder="Misal: Jangan pakai seledri, sedikit pedas" value={tempItemNote} onChange={(e) => setTempItemNote(e.target.value)} className="w-full p-3 rounded-xl border border-stone-200 bg-stone-50 text-sm outline-none focus:border-emerald-600 focus:bg-white transition" />
                </div>
              </div>
              <div className="p-5 border-t border-stone-100 bg-white">
                <button onClick={() => { addToCart(String(selectedProductForAddon.id), tempAddons, tempItemNote); setSelectedProductForAddon(null); }} className="w-full py-3 rounded-xl bg-stone-900 text-white font-black text-base hover:bg-black transition shadow-lg">Masukkan ke Keranjang</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP: QRIS PAYMENT */}
      <AnimatePresence>
        {qrisData && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQrisData(null)} className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-sm flex flex-col items-center shadow-2xl relative z-10 text-center">
              <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-6">
                <QrCode className="w-4 h-4" /> Scan QRIS
              </div>
              <div className="w-64 h-64 bg-stone-50 rounded-2xl border-4 border-emerald-700 p-4 mb-6 shadow-inner">
                <img src={qrisData.qrUrl} alt="QRIS Payment" className="w-full h-full object-contain" />
              </div>
              <p className="text-sm font-bold text-stone-500 mb-1">Total Tagihan</p>
              <p className="text-3xl font-black font-display text-stone-900 mb-6">{formatPrice(total)}</p>
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl text-sm font-bold mb-6">
                <Loader2 className="w-4 h-4 animate-spin" /> Menunggu Pembayaran...
              </div>
              <button onClick={closeQrisModal} className="w-full py-4 rounded-xl bg-stone-900 text-white font-bold hover:bg-black transition">Tutup (Selesai Manual)</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}