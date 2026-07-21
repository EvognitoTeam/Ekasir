/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore } from '@/store/cart.store';
import { useMenuStore } from '@/store/menu.store';
import { useOrderStore } from '@/store/order.store';
import { useAuthStore } from '@/store/auth.store'; 
import { useTableStore } from '@/store/table.store'; 
import { ImageIcon, Clock, ArrowLeft, ShoppingBag, Minus, Plus, Trash2, User, Ticket, X, Loader2, CheckCircle2, QrCode, Mail, Phone, MapPin, Banknote } from 'lucide-react';
import { useParams } from 'next/navigation';
import { applyFallbackImage, normalizeImageSrc } from '@/utils/image';

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
  const [feesExpanded, setFeesExpanded] = useState(false);
  const relatedMenuItems = menuItems
    .filter((item: any) => item.isAvailable && !cartItems.some((cart: any) => cart.menuItemId === item.id))
    .slice(0, 5);

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface)]">
      <header className="sticky top-0 z-30 flex items-center justify-center border-b border-stone-100 bg-white/95 px-6 py-4 backdrop-blur-sm">
        <button onClick={onBack} aria-label="Kembali" className="absolute left-6 flex h-9 w-9 items-center justify-center rounded-full border border-stone-100 bg-stone-50 transition active:scale-95">
          <ArrowLeft className="h-4 w-4 text-stone-500" />
        </button>
        <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-primary)]">Pesanan Anda</h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {relatedMenuItems.length > 0 && (
          <section className="border-b border-stone-100 bg-white py-4">
            <div className="mb-3 flex items-center justify-between px-6">
              <div>
                <p className="text-[9px] font-label uppercase tracking-[0.28em] text-stone-400">Tambahan pilihan</p>
                <h2 className="font-display text-base font-bold text-stone-900">Mungkin Anda suka</h2>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto px-6 pb-1 no-scrollbar">
              {relatedMenuItems.map((product: any) => (
                <button key={product.id} type="button" onClick={onBack} className="flex w-48 flex-shrink-0 items-center gap-3 rounded-2xl border border-stone-100 bg-white p-2 text-left shadow-sm transition hover:shadow-md">
                  <img src={normalizeImageSrc(product.image)} onError={applyFallbackImage} alt={product.name} className="h-14 w-14 rounded-xl object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-xs font-bold text-stone-900">{product.name}</span>
                    <span className="mt-1 block text-[10px] font-semibold text-[var(--color-primary)]">{formatIDR(Number(product.basePrice))}</span>
                  </span>
                  <Plus className="h-4 w-4 text-stone-400" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white px-6 pb-2 pt-6">
          <div className="mb-2 flex items-center justify-between border-b border-stone-200 pb-3">
            <span className="text-[10px] font-label uppercase tracking-[0.2em] text-stone-600">Daftar pesanan ({cartItems.length})</span>
            <button onClick={onBack} className="text-[10px] font-label font-bold uppercase tracking-widest text-[var(--color-primary)] underline underline-offset-4">+ Tambah menu</button>
          </div>

          <div className="divide-y divide-stone-100">
            {cartItems.map((cartItem: any) => {
              const product = menuItems.find((item: any) => item.id === cartItem.menuItemId);
              if (!product) return null;
              const unitPrice = getItemPrice(cartItem, product);
              const addOns = getAddOnDetails(cartItem, product);
              return (
                <motion.article key={cartItem.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 py-5">
                  <img src={normalizeImageSrc(product.image)} onError={applyFallbackImage} alt={product.name} className="h-16 w-16 flex-shrink-0 rounded-2xl border border-stone-100 object-cover shadow-sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-bold leading-tight text-stone-900">{product.name}</h3>
                        {addOns.length > 0 && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-500">{addOns.map((addon) => addon.name).join(' · ')}</p>}
                      </div>
                      <button onClick={() => removeItem(cartItem.id)} aria-label={`Hapus ${product.name}`} className="p-1 text-stone-300 transition hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-[var(--color-primary)]">{formatIDR(unitPrice * cartItem.quantity)}</span>
                      <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-stone-50 p-1">
                        <button onClick={() => updateQuantity(cartItem.id, -1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm"><Minus className="h-3 w-3" /></button>
                        <span className="w-4 text-center text-xs font-bold">{cartItem.quantity}</span>
                        <button onClick={() => updateQuantity(cartItem.id, 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="mx-6 mt-5">
          {couponState.isValid ? (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3"><CheckCircle2 className="h-5 w-5 text-emerald-600" /><div><p className="text-[10px] font-label font-bold uppercase tracking-widest text-emerald-700">{couponState.code}</p><p className="text-xs text-emerald-700/70">Kupon berhasil digunakan</p></div></div>
              <button onClick={removeCoupon} className="p-2 text-stone-400 hover:text-red-500"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="flex gap-2 rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
              <div className="relative flex-1"><Ticket className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" /><input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Kode promo" className="w-full rounded-xl bg-stone-50 py-3 pl-10 pr-3 text-xs font-bold uppercase outline-none" /></div>
              <button onClick={() => applyCoupon(couponInput)} disabled={!couponInput || isCheckingCoupon} className="rounded-xl bg-stone-900 px-5 text-[10px] font-label font-bold uppercase tracking-widest text-white disabled:opacity-40">{isCheckingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pakai'}</button>
            </div>
          )}
          {couponState.error && <p className="mt-2 px-1 text-[10px] font-medium text-red-500">{couponState.error}</p>}
        </section>

        <section className="mx-6 mb-32 mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/10"><ShoppingBag className="h-4 w-4 text-[var(--color-primary)]" /></div><div><p className="text-[9px] font-label uppercase tracking-[0.25em] text-stone-400">Ringkasan</p><h3 className="font-display text-base font-bold">Rincian pembayaran</h3></div></div>
          <div className="space-y-3 px-5 py-4 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span className="font-semibold">{formatIDR(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-emerald-600"><span>Diskon</span><span className="font-bold">- {formatIDR(discount)}</span></div>}
            <button type="button" onClick={() => setFeesExpanded((v) => !v)} className="flex w-full items-center justify-between text-left"><span className="text-stone-500">Pajak & layanan</span><span className="text-xs font-bold text-[var(--color-primary)]">{feesExpanded ? 'Sembunyikan' : 'Lihat rincian'}</span></button>
            <AnimatePresence initial={false}>{feesExpanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden rounded-xl bg-stone-50 p-3 text-xs"><div className="flex justify-between"><span>Service ({settings.serviceRate}%)</span><span>{settings.isTaxIncluded ? 'Termasuk' : formatIDR(service)}</span></div><div className="flex justify-between"><span>Pajak ({settings.taxRate}%)</span><span>{settings.isTaxIncluded ? 'Termasuk' : formatIDR(tax)}</span></div></motion.div>}</AnimatePresence>
            <div className="flex items-end justify-between border-t border-dashed border-stone-200 pt-4"><span className="font-display text-lg font-bold">Total</span><span className="font-display text-2xl font-bold text-[var(--color-primary)]">{formatIDR(total)}</span></div>
          </div>
        </section>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-stone-100 bg-white/95 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <button onClick={onNext} className="flex w-full items-center justify-between rounded-2xl bg-[var(--color-primary)] px-5 py-4 text-white shadow-lg shadow-black/10 transition active:scale-[0.99]"><span><span className="block text-left text-[9px] font-label uppercase tracking-[0.25em] text-white/65">Lanjut pembayaran</span><span className="font-display text-lg font-bold">{formatIDR(total)}</span></span><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><ArrowLeft className="h-5 w-5 rotate-180" /></span></button>
      </div>
    </div>
  );
}

// ─── Step 2: Payment ─────────────────────────────────────────────────────────

function PaymentStep({ onBack, onPay, total, isProcessing, slug }: any) {
  const { tableCode, tableName } = useTableStore(); 

  const displayTable = tableName || tableCode || 'Walk-in / Takeaway';
  const finalTableId = tableCode || 'Walk-in'; 

  const [method, setMethod] = useState('qris');
  const [orderType, setOrderType] = useState<'online' | 'cashier'>('online');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // 🔴 MENGAMBIL DATA USER DARI API
  useEffect(() => {
    const fetchUserData = async () => {
      if (!slug) return;
      try {
        const response = await fetch(`/api/auth/me?slug=${slug}`);
        const data = await response.json();
        
        // Autocomplete form jika data user ditemukan
        if (data.success && data.user) {
          if (data.user.name) setName(data.user.name);
          if (data.user.email) setEmail(data.user.email);
          if (data.user.phone) setPhone(data.user.phone);
        }
      } catch (error) {
        console.warn("Gagal mengambil session user:", error);
      }
    };
    
    fetchUserData();
  }, [slug]);

  const PAYMENT_METHODS = [
    { id: 'qris', label: 'QRIS', icon: QrCode, color: 'bg-blue-500' },
    { id: 'cash', label: 'Pay at Cashier', icon: Banknote, color: 'bg-stone-600' }, 
  ];

  const visibleMethods = orderType === 'online' 
    ? PAYMENT_METHODS.filter(m => m.id !== 'cash') 
    : PAYMENT_METHODS.filter(m => m.id === 'cash');

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface)]">
      <header className="sticky top-0 z-30 border-b border-stone-100 bg-white px-6 pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-stone-100 bg-stone-50 active:scale-95"><ArrowLeft className="h-5 w-5 text-stone-500" /></button>
          <div><p className="text-[9px] font-label uppercase tracking-[0.4em] text-[var(--color-primary)]/70">Langkah 2 dari 2</p><h1 className="font-display text-2xl font-bold tracking-tight">Detail <span className="text-[var(--color-primary)]">Pembayaran</span></h1></div>
        </div>
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto px-6 pb-36 pt-8 no-scrollbar">
        <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[10px] font-label font-bold uppercase tracking-[0.28em] text-stone-500">Informasi pelanggan</p>
          <div className="space-y-3">
            
            <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 focus-within:border-[var(--color-primary)]">
              <User className="w-4 h-4 text-stone-400 shrink-0" />
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="bg-transparent outline-none text-sm w-full font-medium text-stone-800" 
              />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 focus-within:border-[var(--color-primary)]">
              <Mail className="w-4 h-4 text-stone-400 shrink-0" />
              <input 
                type="email" 
                placeholder="Email Address" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="bg-transparent outline-none text-sm w-full font-medium text-stone-800" 
              />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 focus-within:border-[var(--color-primary)]">
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

        <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[10px] font-label font-bold uppercase tracking-[0.28em] text-stone-500">Metode pembayaran</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {['online', 'cashier'].map(t => (
              <button 
                key={t}
                onClick={() => { setOrderType(t as any); setMethod(t === 'online' ? 'qris' : 'cash'); }}
                className={`py-2.5 rounded-xl text-xs font-bold border ${orderType === t ? 'bg-emerald-50 border-[var(--color-primary)] text-[var(--color-primary)]' : 'bg-stone-50 border-stone-200'}`}
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
                className={`w-full flex items-center justify-between p-3.5 rounded-xl border ${method === pm.id ? 'border-[var(--color-primary)] bg-emerald-50' : 'border-stone-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${pm.color} flex items-center justify-center`}><pm.icon className="w-4 h-4 text-white" /></div>
                  <span className="text-sm font-semibold">{pm.label}</span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${method === pm.id ? 'border-[var(--color-primary)]' : 'border-stone-300'} flex items-center justify-center`}>
                  {method === pm.id && <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-stone-100 bg-white/95 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div className="mb-3 flex items-end justify-between"><div><p className="text-[9px] font-label font-bold uppercase tracking-[0.25em] text-stone-400">Total pembayaran</p><p className="font-display text-xl font-bold text-stone-900">{formatIDR(total)}</p></div><p className="text-[10px] text-stone-400">Aman & terenkripsi</p></div>
        <button
          onClick={() => onPay({ name, email, phone, tableNumber: finalTableId, method, orderType })}
          disabled={isProcessing || !name} 
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-4 font-bold text-white shadow-lg shadow-black/10 disabled:opacity-50"
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

  const checkPaymentStatus = async (isManual = false) => {
    if (isManual) setIsChecking(true);
    try {
      const res = await fetch(`/api/checkout/status?orderCode=${orderCode}`);
      const data = await res.json();
      
      if (data.success && data.paymentStatus == 2) {
        onFinish(); 
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

  useEffect(() => {
    if (timeLeft === "EXPIRED") return;

    const pollInterval = setInterval(() => {
      checkPaymentStatus(false);
    }, 3000); 

    return () => clearInterval(pollInterval);
  }, [orderCode]);

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
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      <header className="bg-[var(--color-primary)] px-4 py-6 flex items-center gap-4 text-white">
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/20">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold flex-1 text-center pr-9">Payment QRIS</h1>
      </header>

      <div className="flex-1 flex flex-col items-center p-6 space-y-6 bg-[var(--color-primary)]">
        <div className="bg-white rounded-3xl p-8 shadow-xl w-full max-w-sm flex flex-col items-center relative overflow-hidden">
          
          <div className="absolute top-4 left-4 flex items-center gap-2">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
             <span className="text-[8px] font-bold text-stone-400 uppercase tracking-tighter">Auto-checking...</span>
          </div>

          <div className="absolute top-0 right-0 bg-red-500 text-white px-4 py-2 rounded-bl-2xl flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-mono font-bold">{timeLeft}</span>
          </div>

          <div className={`border-4 ${timeLeft === "EXPIRED" ? "border-red-200 grayscale" : "border-[var(--color-primary)]"} rounded-xl p-2 mb-6 bg-white`}>
            <img src={qrUrl} alt="QR Code" className="w-64 h-72 object-contain" />
          </div>

          <p className="text-sm text-stone-500 font-medium mb-1">Total Pembayaran</p>
          <p className="text-2xl font-black text-[var(--color-primary)] mb-4">{formatIDR(total)}</p>

          {statusMsg && (
            <p className="text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full animate-bounce">
              {statusMsg}
            </p>
          )}
        </div>
      </div>

      <div className="bg-white p-4 z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.03)] pb-8">
        <button
          onClick={() => checkPaymentStatus(true)} 
          disabled={timeLeft === "EXPIRED" || isChecking}
          className={`w-full text-white rounded-xl py-4 font-bold flex items-center justify-center gap-3 transition-all ${
            timeLeft === "EXPIRED" ? "bg-stone-300" : "bg-[var(--color-primary)] active:scale-95"
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
  const routeSegments = Array.isArray(params.branchSlug) ? params.branchSlug : [];
  const reservedViews = new Set(['menu', 'checkout', 'tracking', 'history', 'help', 'profile', 'coupons', 'roasts']);
  const branchSlug = routeSegments[0] && !reservedViews.has(routeSegments[0]) ? routeSegments[0] : null;

  const { getCartBySlug, removeItem, updateQuantity, clearCart } = useCartStore();
  const cartItems = getCartBySlug(slug); 

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
      const couponParams = new URLSearchParams({ code, slug });
      if (branchSlug) couponParams.set('branch_slug', branchSlug);
      const res = await fetch(`/api/coupons/validate?${couponParams.toString()}`);
      const result = await res.json();
      
      if (result.success) {
        if (result.data.isMemberOnly && !isLoggedIn) {
          setCoupon({ 
            isValid: false, 
            code: '', 
            id: null, 
            discountRate: 0, 
            discountPrice: 0, 
            error: 'Kupon ini hanya khusus Member. Silakan login terlebih dahulu.' 
          });
          return; 
        }

        setCoupon({ 
          isValid: true, 
          code: result.data.code,
          id: result.data.id, 
          discountRate: result.data.discountRate, 
          discountPrice: result.data.discountPrice, 
          error: '' 
        });
      } else {
        setCoupon({ 
          isValid: false, 
          code: '', 
          id: null, 
          discountRate: 0, 
          discountPrice: 0, 
          error: result.message 
        });
      }
    } catch (error) {
      setCoupon({ 
        isValid: false, 
        code: '', 
        id: null, 
        discountRate: 0, 
        discountPrice: 0, 
        error: 'Gagal memvalidasi kupon.' 
      });
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCoupon({ isValid: false, code: '', id: null, discountRate: 0, discountPrice: 0, error: '' });
  };

  const baseSubtotal = Math.floor(cartItems.reduce((sum, item) => {
    const product = menuItems.find(m => m.id === item.menuItemId);
    return sum + (product ? getItemPrice(item, product) * item.quantity : 0);
  }, 0));

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

  discountAmount = Math.floor(Math.min(discountAmount, baseSubtotal));
  const subtotalAfterDiscount = baseSubtotal - discountAmount;

  let tax = 0;
  let service = 0;
  
  if (!settings.isTaxIncluded) {
    service = Math.floor(subtotalAfterDiscount * (settings.serviceRate / 100));
    const amountForTax = subtotalAfterDiscount + service;
    tax = Math.floor(amountForTax * (settings.taxRate / 100));
  }

  const total = Math.floor(subtotalAfterDiscount + tax + service);

  const handlePay = async (customerData: any) => {
    setIsProcessing(true);

    const preparedItems = cartItems.map(item => {
      const product = menuItems.find(m => m.id === item.menuItemId);
      const addonDetails = getAddOnDetails(item, product);
      return {
        ...item,
        priceAtOrder: getItemPrice(item, product),
        selectedAddOnsDetails: addonDetails
      };
    });

    const payload = {
      slug: slug,
      total: baseSubtotal,
      discount: discountAmount,
      tax: tax,                
      service: service,        
      totalAfterDiscount: total,
      discountId: coupon.isValid ? coupon.id : null,
      customer: {
        ...customerData,
        userId: isLoggedIn ? userId : null,
        method: customerData.method
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
          setCurrentOrderPayload(orderData); 
          setStep('qris'); 
        } else {
          createOrder(orderData as any);
          clearCart(slug);
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
      clearCart(slug);
      onSuccess();
    }
  };

  if (step === 'review' && cartItems.length === 0 && !currentOrderPayload) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-[var(--color-surface)] px-6 py-12 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-stone-100">
          <ShoppingBag className="h-9 w-9 text-stone-400" strokeWidth={1.5} />
        </div>
        <p className="mb-2 text-[9px] font-label font-bold uppercase tracking-[0.28em] text-[var(--color-primary)]">
          Keranjang kosong
        </p>
        <h1 className="font-display text-2xl font-bold text-stone-900">Belum ada pesanan</h1>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-stone-500">
          Pilih menu favorit Anda terlebih dahulu sebelum melanjutkan ke pembayaran.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="mt-7 rounded-2xl bg-[var(--color-primary)] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-black/10 active:scale-[0.97]"
        >
          Jelajahi Menu
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-view-container h-full bg-[var(--color-surface)]">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'review' ? (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
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
          </motion.div>
        ) : step === 'payment' ? (
          <motion.div
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <PaymentStep
              onBack={() => setStep('review')}
              onPay={handlePay}
              total={total}
              isProcessing={isProcessing}
              slug={slug}
            />
          </motion.div>
        ) : (
          <motion.div
            key="qris"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <QrisStep
              onBack={() => setStep('payment')}
              onFinish={handleFinishQris}
              qrUrl={qrisUrl}
              total={total}
              orderId={currentOrderPayload?.id}
              orderCode={currentOrderPayload?.orderCode}
              expiryTime={currentOrderPayload?.expiryTime}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}