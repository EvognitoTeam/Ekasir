"use client";

import { useState, useEffect } from 'react';
import { useCartStore } from '../store/cart.store';
import { useMenuStore } from '../store/menu.store';
import { useOrderStore } from '../store/order.store';
import { useAuthStore } from '../store/auth.store'; 
import { useTableStore } from '../store/table.store'; 
import { Clock, ArrowLeft, Minus, Plus, Trash2, User, Ticket, X, Loader2, CheckCircle2, QrCode, Mail, Phone, MapPin, Banknote } from 'lucide-react';
import { useParams } from 'next/navigation';

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    .format(n)
    .replace(/\s/g, '');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getItemPrice(cartItem: any, product: any) {
  let price = Number(product.basePrice);

  if (cartItem.options && product.meta) {
    const sizeDef = product.meta.sizes?.find((s: any) => s.label === cartItem.options.size);
    if (sizeDef) price = Number(sizeDef.price);
  }

  if (Array.isArray(cartItem.selectedAddOns) && product.categorizedAddons) {
    cartItem.selectedAddOns.forEach((id: any) => {
      product.categorizedAddons.forEach((category: any) => {
        const found = category.addons?.find((a: any) => Number(a.id) === Number(id));
        if (found) price += Number(found.price);
      });
    });
  }
  return price;
}

function getAddOnDetails(cartItem: any, product: any) {
  const details: { name: string; price: number }[] = [];
  
  if (cartItem.options?.size) {
    details.push({ name: `Size: ${cartItem.options.size}`, price: 0 }); 
  }
  
  if (Array.isArray(cartItem.selectedAddOns) && product.categorizedAddons) {
    cartItem.selectedAddOns.forEach((id: any) => {
      product.categorizedAddons.forEach((category: any) => {
        const found = category.addons?.find((a: any) => Number(a.id) === Number(id));
        if (found) {
          details.push({ name: found.name, price: Number(found.price) });
        }
      });
    });
  }
  return details;
}

// ─── Step 1: Order Review ────────────────────────────────────────────────────

function OrderReview({ 
  onBack, onNext, cartItems, menuItems, 
  subtotal, discount, tax, service, total, 
  removeItem, updateQuantity, settings,
  couponState, applyCoupon, removeCoupon, isCheckingCoupon
}: any) {
  const [couponInput, setCouponInput] = useState('');

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA]">
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors active:scale-95">
          <ArrowLeft className="w-5 h-5 text-stone-700" />
        </button>
        <h1 className="text-base font-bold font-sans text-stone-900 flex-1 text-center pr-9">Order Summary</h1>
      </header>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between border border-[#0E5C37] rounded-xl px-4 py-2.5 bg-white">
          <span className="text-xs font-sans text-stone-500 font-medium">Order Type</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-sans font-bold text-stone-800">Dine In</span>
            <div className="w-5 h-5 rounded-full border-2 border-[#0E5C37] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0E5C37]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-40">
        <div className="mt-5 bg-white border-y border-stone-100">
          <div className="px-4 py-3 flex items-center justify-between border-b border-stone-100">
            <span className="text-sm font-bold font-sans text-stone-900">Items ({cartItems.length})</span>
            <button onClick={onBack} className="text-[#0E5C37] text-xs font-bold hover:underline">+ Add More</button>
          </div>

          {cartItems.map((cartItem: any) => {
            const product = menuItems.find((m: any) => m.id === cartItem.menuItemId);
            if (!product) return null;
            const itemPrice = getItemPrice(cartItem, product);
            const addOns = getAddOnDetails(cartItem, product); 

            return (
              <div key={cartItem.id} className="px-4 py-4 border-b border-stone-50 last:border-b-0">
                <div className="flex gap-3">
                  <img src={product.image} alt={product.name} className="w-16 h-16 rounded-xl object-cover border border-stone-100" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-bold text-stone-900 leading-tight">{product.name}</p>
                        
                        {addOns.length > 0 && (
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            {addOns.map((addon, idx) => (
                              <p key={idx} className="text-[11px] text-stone-500 flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-stone-300" />
                                {addon.name} 
                                {addon.price > 0 && (
                                  <span className="text-[#0E5C37] font-medium">(+{formatIDR(addon.price)})</span>
                                )}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      
                      <button onClick={() => removeItem(cartItem.id)} className="text-stone-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-bold text-[#0E5C37]">{formatIDR(itemPrice * cartItem.quantity)}</span>
                      <div className="flex items-center gap-3 bg-stone-100 rounded-full px-3 py-1">
                        <button onClick={() => updateQuantity(cartItem.id, -1)} className="text-stone-600"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-bold w-4 text-center">{cartItem.quantity}</span>
                        <button onClick={() => updateQuantity(cartItem.id, 1)} className="text-stone-600"><Plus className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mx-4 mt-5">
          {couponState.isValid ? (
            <div className="bg-emerald-50 border border-[#0E5C37]/30 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0E5C37] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0E5C37] uppercase">{couponState.code}</p>
                  <p className="text-[10px] text-[#0E5C37]/70">Coupon Applied Successfully</p>
                </div>
              </div>
              <button onClick={removeCoupon} className="text-stone-400 hover:text-red-500 p-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Ticket className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Have a coupon code?" 
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  className="w-full bg-white border border-stone-200 rounded-xl py-3 pl-9 pr-4 text-sm font-bold placeholder:font-normal focus:outline-none focus:border-[#0E5C37] uppercase"
                />
              </div>
              <button 
                onClick={() => applyCoupon(couponInput)}
                disabled={!couponInput || isCheckingCoupon}
                className="bg-stone-900 disabled:bg-stone-300 text-white px-5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center"
              >
                {isCheckingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
              </button>
            </div>
          )}
          {couponState.error && <p className="text-red-500 text-[10px] mt-2 font-medium px-1">{couponState.error}</p>}
        </div>

        <div className="mx-4 mt-4 bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Subtotal</span>
            <span className="font-semibold">{formatIDR(subtotal)}</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between text-sm text-[#0E5C37]">
              <span>Discount ({couponState.code})</span>
              <span className="font-bold">- {formatIDR(discount)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Service Charge ({settings.serviceRate}%)</span>
            <span className="font-semibold">{settings.isTaxIncluded ? 'Included' : formatIDR(service)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Tax ({settings.taxRate}%)</span>
            <span className="font-semibold">{settings.isTaxIncluded ? 'Included' : formatIDR(tax)}</span>
          </div>
          <div className="border-t border-stone-100 pt-3 flex justify-between font-bold">
            <span>Total</span>
            <span className="text-xl text-[#0E5C37]">{formatIDR(total)}</span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t p-4 flex items-center justify-between gap-4 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <div>
          <p className="text-[10px] text-stone-400 uppercase font-bold">Total Payment</p>
          <p className="text-lg font-bold text-stone-900">{formatIDR(total)}</p>
        </div>
        <button onClick={onNext} className="flex-1 bg-[#0E5C37] text-white rounded-xl py-3.5 font-bold">
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Payment ─────────────────────────────────────────────────────────

function PaymentStep({ onBack, onPay, total, isProcessing }: any) {
  const { username, isLoggedIn, email: storeEmail, phone: storePhone } = useAuthStore();
  const { tableCode, tableName } = useTableStore(); 

  const displayTable = tableName || tableCode || 'Walk-in / Takeaway';
  const finalTableId = tableCode || 'Walk-in'; 

  const [method, setMethod] = useState('qris');
  const [orderType, setOrderType] = useState<'online' | 'cashier'>('online');
  
  const [name, setName] = useState(isLoggedIn ? (username || '') : '');
  const [email, setEmail] = useState(isLoggedIn ? (storeEmail || '') : '');
  const [phone, setPhone] = useState(isLoggedIn ? (storePhone || '') : '');

  const PAYMENT_METHODS = [
    { id: 'qris', label: 'QRIS', icon: QrCode, color: 'bg-blue-500' },
    { id: 'cash', label: 'Pay at Cashier', icon: Banknote, color: 'bg-stone-600' }, 
  ];

  const visibleMethods = orderType === 'online' 
    ? PAYMENT_METHODS.filter(m => m.id !== 'cash') 
    : PAYMENT_METHODS.filter(m => m.id === 'cash');

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA]">
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-4">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-stone-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold text-stone-900 flex-1 text-center pr-9">Payment</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 border border-stone-100">
          <p className="text-sm font-bold mb-3">Customer Information</p>
          <div className="space-y-3">
            
            <div className="flex items-center gap-3 border rounded-xl px-3 py-3 bg-stone-50">
              <User className="w-4 h-4 text-stone-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="bg-transparent outline-none text-sm w-full font-medium text-stone-800" 
              />
            </div>

            <div className="flex items-center gap-3 border rounded-xl px-3 py-3 bg-stone-50">
              <Mail className="w-4 h-4 text-stone-400 shrink-0" />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="bg-transparent outline-none text-sm w-full font-medium text-stone-800" 
              />
            </div>

            <div className="flex items-center gap-3 border rounded-xl px-3 py-3 bg-stone-50">
              <Phone className="w-4 h-4 text-stone-400 shrink-0" />
              <input 
                type="tel" 
                placeholder="Phone Number (e.g., 0812...)" 
                value={phone} 
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="bg-transparent outline-none text-sm w-full font-medium text-stone-800" 
              />
            </div>

            <div className="flex items-center gap-3 border border-stone-200 rounded-xl px-3 py-3 bg-stone-100 opacity-80 cursor-not-allowed">
              <MapPin className="w-4 h-4 text-stone-500 shrink-0" />
              <input 
                type="text" 
                readOnly 
                value={displayTable} 
                className="bg-transparent outline-none text-sm w-full font-bold text-stone-600 cursor-not-allowed uppercase" 
              />
              {tableCode && (
                <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
                  Scanned
                </span>
              )}
            </div>

          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-stone-100">
          <p className="text-sm font-bold mb-3">Payment Method</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {['online', 'cashier'].map(t => (
              <button 
                key={t}
                onClick={() => { setOrderType(t as any); setMethod(t === 'online' ? 'qris' : 'cash'); }}
                className={`py-2.5 rounded-xl text-xs font-bold border ${orderType === t ? 'bg-emerald-50 border-[#0E5C37] text-[#0E5C37]' : 'bg-stone-50 border-stone-200'}`}
              >
                {t === 'online' ? 'Online Payment' : 'Pay at Cashier'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {visibleMethods.map(pm => (
              <button
                key={pm.id}
                onClick={() => setMethod(pm.id)}
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border ${method === pm.id ? 'border-[#0E5C37] bg-emerald-50' : 'border-stone-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${pm.color} flex items-center justify-center`}><pm.icon className="w-4 h-4 text-white" /></div>
                  <span className="text-sm font-semibold">{pm.label}</span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${method === pm.id ? 'border-[#0E5C37]' : 'border-stone-300'} flex items-center justify-center`}>
                  {method === pm.id && <div className="w-2 h-2 rounded-full bg-[#0E5C37]" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white border-t p-4 flex items-center justify-between gap-4 z-20 shadow-lg">
        <div>
          <p className="text-[10px] text-stone-400 uppercase font-bold">Total Payment</p>
          <p className="text-lg font-bold text-stone-900">{formatIDR(total)}</p>
        </div>
        <button
          onClick={() => onPay({ name, email, phone, tableNumber: finalTableId, method, orderType })}
          disabled={isProcessing || !name} 
          className="flex-1 bg-[#0E5C37] disabled:opacity-50 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay Now'}
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Tampilan QRIS Langsung ──────────────────────────────────────────

function QrisStep({ onBack, onFinish, qrUrl, total, orderCode, expiryTime }: any) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // 1. Fungsi Cek Status ke API
  const checkPaymentStatus = async (isManual = false) => {
    if (isManual) setIsChecking(true);
    try {
      const res = await fetch(`/api/checkout/status?orderCode=${orderCode}`);
      const data = await res.json();
      
      if (data.success && data.paymentStatus == 2) {
        // JIKA SUDAH BAYAR (Status 2)
        onFinish(); // Jalankan fungsi selesai (Clear cart & pindah ke Tracking)
      } else if (isManual) {
        console.log(data.paymentStatus);
        setStatusMsg("Pembayaran belum terdeteksi. Silakan tunggu sebentar.");
        setTimeout(() => setStatusMsg(""), 3000);
      }
    } catch (error) {
      console.error("Check status error:", error);
    } finally {
      if (isManual) setIsChecking(false);
    }
  };

  // 2. Logic Polling (Cek otomatis tiap 3 detik)
  useEffect(() => {
    if (timeLeft === "EXPIRED") return;

    const pollInterval = setInterval(() => {
      checkPaymentStatus(false);
    }, 3000); // 3 detik

    return () => clearInterval(pollInterval);
  }, [orderCode]);

  // 3. Logic Timer Countdown (Sama seperti sebelumnya)
  useEffect(() => {
    if (!expiryTime) return;
    const targetDate = new Date(expiryTime).getTime();
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;
      if (distance < 0) {
        clearInterval(interval);
        setTimeLeft("EXPIRED");
        return;
      }
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds < 10 ? '0' + seconds : seconds}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA]">
      <header className="bg-[#0E5C37] px-4 py-6 flex items-center gap-4 text-white">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold flex-1 text-center pr-9">Payment QRIS</h1>
      </header>

      <div className="flex-1 flex flex-col items-center p-6 space-y-6 bg-[#0E5C37]">
        <div className="bg-white rounded-3xl p-8 shadow-xl w-full max-w-sm flex flex-col items-center relative overflow-hidden">
          
          {/* Status Check Loader */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
             <span className="text-[8px] font-bold text-stone-400 uppercase tracking-tighter">Auto-checking...</span>
          </div>

          <div className="absolute top-0 right-0 bg-red-500 text-white px-4 py-2 rounded-bl-2xl flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-mono font-bold">{timeLeft}</span>
          </div>

          <div className={`border-4 ${timeLeft === "EXPIRED" ? "border-red-200 grayscale" : "border-[#0E5C37]"} rounded-xl p-2 mb-6 bg-white`}>
            <img src={qrUrl} alt="QR Code" className="w-64 h-72 object-contain" />
          </div>

          <p className="text-sm text-stone-500 font-medium mb-1">Total Pembayaran</p>
          <p className="text-2xl font-black text-[#0E5C37] mb-4">{formatIDR(total)}</p>

          {statusMsg && (
            <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full animate-bounce">
              {statusMsg}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white p-4 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] pb-8">
        <button
          onClick={() => checkPaymentStatus(true)} // Cek Manual
          disabled={timeLeft === "EXPIRED" || isChecking}
          className={`w-full text-white rounded-xl py-4 font-bold flex items-center justify-center gap-3 transition-all ${
            timeLeft === "EXPIRED" ? "bg-stone-300" : "bg-[#0E5C37] active:scale-95"
          }`}
        >
          {isChecking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            timeLeft === "EXPIRED" ? "Kembali ke Menu" : "Saya Sudah Bayar"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main CheckoutView ───────────────────────────────────────────────────────

export default function CheckoutView({ onBack, onSuccess }: Props) {
  const params = useParams();
  const slug = params.mitraSlug as string;

  const { getCartBySlug, removeItem, updateQuantity, clearCart } = useCartStore();
  const cartItems = getCartBySlug(slug); // Ambil cart khusus toko ini

  const { items: menuItems } = useMenuStore();
  const { createOrder } = useOrderStore();
  const { userId, isLoggedIn } = useAuthStore(); 
  
  const [step, setStep] = useState<'review' | 'payment' | 'qris'>('review');
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderPayload, setCurrentOrderPayload] = useState<any>(null);
  
  const [settings, setSettings] = useState({ taxRate: 0, serviceRate: 0, isTaxIncluded: false });
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [coupon, setCoupon] = useState<any>({ isValid: false, code: '', id: null, discountRate: 0, discountPrice: 0, error: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/settings?slug=${slug}`);
        const data = await res.json();
        
        if(data.success) {
          setSettings({
            taxRate: data.data.taxRate || 0,
            serviceRate: data.data.serviceRate || 0,
            isTaxIncluded: data.data.isTaxIncluded === 1
          });
        }
      } catch (error) {
        console.warn("Gagal fetch settings, menggunakan nilai default 0.");
      }
    };
    fetchSettings();
  }, [slug]);

  const handleApplyCoupon = async (code: string) => {
    setIsCheckingCoupon(true);
    try {
      const res = await fetch(`/api/coupons/validate?code=${code}&slug=${slug}`);
      const result = await res.json();
      
      if (result.success) {
        setCoupon({ 
          isValid: true, 
          code: result.data.code,
          id: result.data.id, 
          discountRate: result.data.discountRate, 
          discountPrice: result.data.discountPrice, 
          error: '' 
        });
      } else {
        setCoupon({ isValid: false, code: '', id: null, discountRate: 0, discountPrice: 0, error: result.message });
      }
    } catch (error) {
      setCoupon({ isValid: false, code: '', id: null, discountRate: 0, discountPrice: 0, error: 'Gagal memvalidasi kupon.' });
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon({ isValid: false, code: '', id: null, discountRate: 0, discountPrice: 0, error: '' });
  };

  const baseSubtotal = cartItems.reduce((sum, item) => {
    const product = menuItems.find(m => m.id === item.menuItemId);
    return sum + (product ? getItemPrice(item, product) * item.quantity : 0);
  }, 0);

  let discountAmount = 0;
  
  if (coupon.isValid) {
    const hasRate = coupon.discountRate > 0;
    const hasPriceCap = coupon.discountPrice > 0;

    if (hasRate && hasPriceCap) {
      const calculatedPercentage = baseSubtotal * (coupon.discountRate / 100);
      discountAmount = Math.min(calculatedPercentage, coupon.discountPrice);
    } else if (hasRate && !hasPriceCap) {
      discountAmount = baseSubtotal * (coupon.discountRate / 100);
    } else if (!hasRate && hasPriceCap) {
      discountAmount = coupon.discountPrice;
    }
  }

  discountAmount = Math.min(discountAmount, baseSubtotal);
  const subtotalAfterDiscount = baseSubtotal - discountAmount;

  let tax = 0;
  let service = 0;
  
  if (!settings.isTaxIncluded) {
    service = subtotalAfterDiscount * (settings.serviceRate / 100);
    tax = subtotalAfterDiscount * (settings.taxRate / 100);
  }

  const total = subtotalAfterDiscount + tax + service;

  const handlePay = async (customerData: any) => {
    setIsProcessing(true);

    // 🔴 1. Siapkan data produk untuk Order Items
    const preparedItems = cartItems.map(item => {
      const product = menuItems.find(m => m.id === item.menuItemId);
      const addonDetails = getAddOnDetails(item, product);
      return {
        ...item,
        priceAtOrder: getItemPrice(item, product),
        selectedAddOnsDetails: addonDetails
      };
    });

    // 🔴 2. Susun Payload untuk Tabel Orders & Order Items
    const payload = {
      slug: slug,
      total: baseSubtotal,
      discount: discountAmount,
      totalAfterDiscount: total,
      discountId: coupon.isValid ? coupon.id : null,
      customer: {
        ...customerData,
        userId: isLoggedIn ? userId : null
      },
      cartItems: preparedItems
    };

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        const orderData = {
          id: data.orderId,
          orderCode: data.orderCode,
          expiryTime: data.expiryTime,
          ...payload,
          status: 'pending'
        };

        if (customerData.method === 'qris' && data.qrUrl) {
          setQrisUrl(data.qrUrl);
          setCurrentOrderPayload(orderData); // Simpan data order untuk tracking nanti
          setStep('qris'); 
        } else {
          // Jika Cash
          createOrder(orderData as any);
          clearCart();
          onSuccess();
        }
      } else {
        alert(data.message || "Gagal menghubungi server pembayaran.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFinishQris = () => {
    if (currentOrderPayload) {
      createOrder(currentOrderPayload);
      clearCart();
      onSuccess();
    }
  };

  return step === 'qris' ? (
    <QrisStep 
      onBack={() => setStep('payment')} 
      onFinish={handleFinishQris} 
      qrUrl={qrisUrl} 
      total={total}
      orderId={currentOrderPayload?.id}
      orderCode={currentOrderPayload?.orderCode}
      expiryTime={currentOrderPayload?.expiryTime}
    />
  ) : step === 'payment' ? (
    <PaymentStep onBack={() => setStep('review')} onPay={handlePay} total={total} isProcessing={isProcessing} />
  ) : (
    <OrderReview
      onBack={onBack}
      onNext={() => setStep('payment')}
      cartItems={cartItems}
      menuItems={menuItems}
      subtotal={baseSubtotal}
      discount={discountAmount}
      tax={tax}
      service={service}
      total={total}
      removeItem={removeItem}
      updateQuantity={updateQuantity}
      settings={settings}
      couponState={coupon}
      applyCoupon={handleApplyCoupon}
      removeCoupon={handleRemoveCoupon}
      isCheckingCoupon={isCheckingCoupon}
    />
  );
}