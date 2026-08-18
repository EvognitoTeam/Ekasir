"use client";

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore } from '@/store/cart.store';
import { useMenuStore } from '@/store/menu.store';
import { useOrderStore } from '@/store/order.store';
import { useAuthStore } from '@/store/auth.store';
import { useTableStore } from '@/store/table.store';
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Minus,
  Percent,
  Phone,
  Plus,
  QrCode,
  ShoppingBag,
  Tag,
  Ticket,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { applyFallbackImage, normalizeImageSrc } from '@/utils/image';
import { Toast } from '@/utils/toast'; // 🟢 Import Toast

interface Props {
  onBack: () => void;
  onSuccess: () => void;
}

type PaymentMethod = 'qris' | 'cash';
type OrderType = 'online' | 'cashier';
type ServiceType = 'dine_in' | 'takeaway';

type SettingsState = {
  taxRate: number;
  serviceRate: number;
  isTaxIncluded: boolean;
};

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s/g, '');

function getItemPrice(cartItem: any, product: any): number {
  if (!product) return 0;
  let price = Number(product.basePrice || 0);

  if (cartItem.options && product.meta) {
    const sizeDef = product.meta.sizes?.find((size: any) => size.label === cartItem.options.size);
    if (sizeDef) price = Number(sizeDef.price || 0);
  }

  if (Array.isArray(cartItem.selectedAddOns) && Array.isArray(product.categorizedAddons)) {
    cartItem.selectedAddOns.forEach((id: any) => {
      product.categorizedAddons.forEach((category: any) => {
        const found = category.addons?.find((addon: any) => Number(addon.id) === Number(id));
        if (found) price += Number(found.price || 0);
      });
    });
  }
  return price;
}

function getAddOnDetails(cartItem: any, product: any): Array<{ name: string; price: number }> {
  const details: Array<{ name: string; price: number }> = [];
  if (!product) return details;

  if (cartItem.options?.size) {
    details.push({ name: `Size: ${cartItem.options.size}`, price: 0 });
  }

  if (Array.isArray(cartItem.selectedAddOns) && Array.isArray(product.categorizedAddons)) {
    cartItem.selectedAddOns.forEach((id: any) => {
      product.categorizedAddons.forEach((category: any) => {
        const found = category.addons?.find((addon: any) => Number(addon.id) === Number(id));
        if (found) details.push({ name: found.name, price: Number(found.price || 0) });
      });
    });
  }
  return details;
}

// 🟢 Fungsi Pemicu Getaran (Vibrate)
const triggerVibration = (pattern: number | number[]) => {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

function OrderReview({
  onBack,
  onNext,
  cartItems,
  menuItems,
  subtotal,
  discount,
  tax,
  service,
  total,
  removeItem,
  updateQuantity,
  settings,
  appliedCoupon,
  couponError,
  applyCoupon,
  removeCoupon,
  isCheckingCoupon,
  availablePromos,
}: any) {
  const [couponInput, setCouponInput] = useState('');
  const [feesExpanded, setFeesExpanded] = useState(false);
  const [isCouponSheetOpen, setIsCouponSheetOpen] = useState(false);

  const handleApplyFromSheet = async (code: string) => {
    await applyCoupon(code);
    setIsCouponSheetOpen(false);
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface)]">
      <header className="sticky top-0 z-30 flex items-center justify-center border-b border-stone-100 bg-white/95 px-6 py-4 backdrop-blur-sm">
        <button
          type="button"
          onClick={onBack}
          aria-label="Kembali"
          className="absolute left-6 flex h-9 w-9 items-center justify-center rounded-full border border-stone-100 bg-stone-50 transition active:scale-95"
        >
          <ArrowLeft className="h-4 w-4 text-stone-500" />
        </button>
        <h1 className="font-display text-xl font-bold tracking-tight text-[var(--color-primary)]">
          Pesanan Anda
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <section className="bg-white px-6 pb-2 pt-6">
          <div className="mb-2 flex items-center justify-between border-b border-stone-200 pb-3">
            <span className="text-[10px] font-label uppercase tracking-[0.2em] text-stone-600">
              Daftar pesanan ({cartItems.length})
            </span>
            <button
              type="button"
              onClick={onBack}
              className="text-[10px] font-label font-bold uppercase tracking-widest text-[var(--color-primary)] underline underline-offset-4"
            >
              + Tambah menu
            </button>
          </div>

          <div className="divide-y divide-stone-100">
            {cartItems.map((cartItem: any) => {
              const product = menuItems.find((item: any) => item.id === cartItem.menuItemId);
              if (!product) return null;

              const unitPrice = getItemPrice(cartItem, product);
              const addOns = getAddOnDetails(cartItem, product);

              return (
                <motion.article key={cartItem.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="flex gap-4 py-5">
                  <img
                    src={normalizeImageSrc(product.image)}
                    onError={applyFallbackImage}
                    alt={product.name}
                    className="h-16 w-16 flex-shrink-0 rounded-2xl border border-stone-100 object-cover shadow-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-base font-bold leading-tight text-stone-900">{product.name}</h3>
                        {addOns.length > 0 && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-500">{addOns.map((addon) => addon.name).join(' · ')}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={(event) => { event.preventDefault(); event.stopPropagation(); removeItem(cartItem.id); }}
                        className="p-1 text-stone-300 transition hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-[var(--color-primary)]">{formatIDR(unitPrice * cartItem.quantity)}</span>
                      <div className="flex items-center gap-3 rounded-full border border-stone-200 bg-stone-50 p-1">
                        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); updateQuantity(cartItem.id, -1); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-stone-500 shadow-sm"><Minus className="h-3 w-3" /></button>
                        <span className="w-4 text-center text-xs font-bold">{cartItem.quantity}</span>
                        <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); updateQuantity(cartItem.id, 1); }} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)] text-white"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="mx-6 mt-5">
          {appliedCoupon ? (
            <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-[10px] font-label font-bold uppercase tracking-widest text-emerald-700">
                    {appliedCoupon.code || appliedCoupon.coupon_code} {appliedCoupon.is_auto_apply ? '(Auto)' : ''}
                  </p>
                  <p className="text-xs text-emerald-700/70">Kupon berhasil digunakan</p>
                </div>
              </div>
              <button type="button" onClick={removeCoupon} className="p-2 text-stone-400 hover:text-red-500"><X className="h-4 w-4" /></button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCouponSheetOpen(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition-all active:scale-[0.98] hover:border-[var(--color-primary)]"
            >
              <div className="flex items-center gap-3">
                <div className="bg-emerald-50 text-[var(--color-primary)] p-2.5 rounded-xl">
                  <Ticket className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-bold text-stone-800 block">Punya kode promo?</span>
                  <span className="text-[10px] text-stone-500">Pilih kupon untuk makin hemat!</span>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-stone-400" />
            </button>
          )}

          {/* 🟢 TAMPILAN ERROR YANG DIPERBESAR DAN DIANIMASIKAN */}
          <AnimatePresence>
            {couponError && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 shadow-sm">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100">
                    <X className="h-3 w-3 text-red-600" />
                  </div>
                  <p className="text-xs font-bold text-red-600 leading-relaxed">{couponError}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section className="mx-6 mb-32 mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-stone-100 px-5 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-primary)]/10">
              <ShoppingBag className="h-4 w-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-[9px] font-label uppercase tracking-[0.25em] text-stone-400">Ringkasan</p>
              <h3 className="font-display text-base font-bold">Rincian pembayaran</h3>
            </div>
          </div>
          <div className="space-y-3 px-5 py-4 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span className="font-semibold">{formatIDR(subtotal)}</span></div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1">Diskon {appliedCoupon?.is_auto_apply ? '(Auto)' : ''}</span>
                <span className="font-bold">- {formatIDR(discount)}</span>
              </div>
            )}
            <button type="button" onClick={() => setFeesExpanded((value) => !value)} className="flex w-full items-center justify-between text-left">
              <span className="text-stone-500">Pajak & layanan</span>
              <span className="text-xs font-bold text-[var(--color-primary)]">{feesExpanded ? 'Sembunyikan' : 'Lihat rincian'}</span>
            </button>
            <AnimatePresence initial={false}>
              {feesExpanded && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden rounded-xl bg-stone-50 p-3 text-xs">
                  <div className="flex justify-between"><span>Service ({settings.serviceRate}%)</span><span>{settings.isTaxIncluded ? 'Termasuk' : formatIDR(service)}</span></div>
                  <div className="flex justify-between"><span>Pajak ({settings.taxRate}%)</span><span>{settings.isTaxIncluded ? 'Termasuk' : formatIDR(tax)}</span></div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-end justify-between border-t border-dashed border-stone-200 pt-4">
              <span className="font-display text-lg font-bold">Total</span>
              <span className="font-display text-2xl font-bold text-[var(--color-primary)]">{formatIDR(total)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-stone-100 bg-white/95 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onNext}
          disabled={cartItems.length === 0}
          className="flex w-full items-center justify-between rounded-2xl bg-[var(--color-primary)] px-5 py-4 text-white shadow-lg shadow-black/10 transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span>
            <span className="block text-left text-[9px] font-label uppercase tracking-[0.25em] text-white/65">Lanjut pembayaran</span>
            <span className="font-display text-lg font-bold">{formatIDR(total)}</span>
          </span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><ArrowLeft className="h-5 w-5 rotate-180" /></span>
        </button>
      </div>

      <AnimatePresence>
        {isCouponSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCouponSheetOpen(false)}
              className="fixed inset-0 z-40 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[32px] bg-white shadow-2xl max-w-[480px] mx-auto"
            >
              <div className="flex items-center justify-between border-b border-stone-100 p-6 shrink-0">
                <h3 className="font-display text-xl font-bold text-stone-900">Pilih Promo</h3>
                <button onClick={() => setIsCouponSheetOpen(false)} className="rounded-full bg-stone-100 p-2 text-stone-500 hover:bg-stone-200 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 border-b border-stone-100 bg-stone-50 shrink-0">
                <div className="flex gap-2 relative">
                  <div className="relative flex-1">
                    <Ticket className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Masukkan kode promo"
                      className="w-full rounded-xl border border-stone-200 bg-white py-3.5 pl-11 pr-3 text-sm font-bold uppercase outline-none focus:border-[var(--color-primary)] focus:ring-4 focus:ring-[var(--color-primary)]/10 transition"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleApplyFromSheet(couponInput)}
                    disabled={!couponInput || isCheckingCoupon}
                    className="rounded-xl bg-stone-900 px-6 font-bold text-white disabled:opacity-40 transition active:scale-95"
                  >
                    {isCheckingCoupon ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Pakai'}
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                <p className="text-[10px] font-label font-bold uppercase tracking-widest text-stone-500 mb-2">
                  Kupon Spesial Untukmu
                </p>

                {availablePromos && availablePromos.length > 0 ? (
                  availablePromos.map((promo: any) => {
                    const isPercentage = promo.discount_rate !== null && Number(promo.discount_rate) > 0;
                    const discountLabel = isPercentage ? `${promo.discount_rate}% OFF` : `Potongan ${formatIDR(Number(promo.discount_price))}`;
                    const code = promo.coupon_code || promo.code;
                    const title = promo.title || 'Promo Spesial';
                    const minPurchase = Number(promo.min_purchase || 0);

                    return (
                      <div key={promo.id} className="relative overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition-all hover:border-[var(--color-primary)] hover:shadow-md group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full translate-x-12 -translate-y-12 transition-transform group-hover:scale-110 pointer-events-none" />
                        <div className="p-5 relative">
                          <div className="flex gap-4 items-start">
                            <div className="w-14 h-14 bg-gradient-to-br from-[var(--color-primary)] to-emerald-900 rounded-2xl flex flex-col items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-900/20">
                              {isPercentage ? <Percent className="w-6 h-6" /> : <Tag className="w-6 h-6" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-display text-xl font-black text-stone-900 leading-none mb-1.5 truncate">{discountLabel}</h4>
                              <p className="text-xs text-stone-500 line-clamp-1">{title}</p>
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {minPurchase > 0 && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                    Min. {formatIDR(minPurchase)}
                                  </span>
                                )}
                                {(promo.is_auto_apply || promo.is_auto_apply === 1) && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                    Auto Apply
                                  </span>
                                )}
                                {(promo.is_member_only || promo.is_member_only === 1) && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
                                    Member
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-dashed border-stone-200 bg-stone-50 p-4 flex items-center justify-between relative">
                          <div className="absolute top-0 left-0 w-4 h-4 bg-white border-b border-r border-stone-200 rounded-br-full -translate-y-1/2 -translate-x-px pointer-events-none" />
                          <div className="absolute top-0 right-0 w-4 h-4 bg-white border-b border-l border-stone-200 rounded-bl-full -translate-y-1/2 translate-x-px pointer-events-none" />
                          <div>
                            <p className="text-[9px] font-label font-bold uppercase tracking-widest text-stone-400">Kode Kupon</p>
                            <p className="font-mono text-sm font-black text-stone-800 mt-0.5">{code}</p>
                          </div>
                          <button onClick={() => handleApplyFromSheet(code)} className="bg-[var(--color-primary)] text-white text-xs font-bold px-6 py-3 rounded-xl shadow-md shadow-emerald-900/20 active:scale-95 transition-all hover:brightness-110">
                            Gunakan
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4"><Ticket className="w-8 h-8 text-stone-300" /></div>
                    <p className="text-sm font-bold text-stone-600">Belum ada promo</p>
                    <p className="text-xs text-stone-400 mt-1">Nantikan penawaran menarik dari kami.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentStep({ onBack, onPay, total, isProcessing, slug }: any) {
  const { tableCode, tableName } = useTableStore();
  const displayTable = tableName || tableCode || 'Meja tidak dipilih';

  const [method, setMethod] = useState<PaymentMethod>('qris');
  const [orderType, setOrderType] = useState<OrderType>('online');
  const [serviceType, setServiceType] = useState<ServiceType>(tableCode ? 'dine_in' : 'takeaway');

  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      if (!slug) return;
      try {
        const response = await fetch(`/api/auth/me?slug=${encodeURIComponent(slug)}`, { method: 'GET', credentials: 'include', cache: 'no-store', headers: { Accept: 'application/json' } });
        const data = await response.json();
        if (response.ok && data.success && data.user) {
          const resolvedUserId = Number(data.user.id ?? data.user.userId ?? data.user.user_id ?? 0);
          setSessionUserId(Number.isInteger(resolvedUserId) && resolvedUserId > 0 ? resolvedUserId : null);
          if (data.user.name) setName(data.user.name);
          if (data.user.email) setEmail(data.user.email);
          if (data.user.phone) setPhone(data.user.phone);
        } else {
          setSessionUserId(null);
        }
      } catch (error) {
        setSessionUserId(null);
      }
    };
    void fetchUserData();
  }, [slug]);

  const paymentMethods = [
    { id: 'qris' as const, label: 'QRIS', icon: QrCode, color: 'bg-blue-500' },
    { id: 'cash' as const, label: 'Pay at Cashier', icon: Banknote, color: 'bg-stone-600' },
  ];

  const visibleMethods = orderType === 'online' ? paymentMethods.filter((payment) => payment.id === 'qris') : paymentMethods.filter((payment) => payment.id === 'cash');

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface)]">
      <header className="sticky top-0 z-30 border-b border-stone-100 bg-white px-6 pb-6 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <div className="flex items-center gap-4">
          <button type="button" onClick={onBack} className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-stone-100 bg-stone-50 active:scale-95"><ArrowLeft className="h-5 w-5 text-stone-500" /></button>
          <div>
            <p className="text-[9px] font-label uppercase tracking-[0.4em] text-[var(--color-primary)]/70">Langkah 2 dari 2</p>
            <h1 className="font-display text-2xl font-bold tracking-tight">Detail <span className="text-[var(--color-primary)]">Pembayaran</span></h1>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-8 overflow-y-auto px-6 pb-36 pt-8 no-scrollbar">
        <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[10px] font-label font-bold uppercase tracking-[0.28em] text-stone-500">Informasi pelanggan</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 focus-within:border-[var(--color-primary)]"><User className="h-4 w-4 shrink-0 text-stone-400" /><input type="text" placeholder="Full Name" value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-transparent text-sm font-medium text-stone-800 outline-none" required /></div>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 focus-within:border-[var(--color-primary)]"><Mail className="h-4 w-4 shrink-0 text-stone-400" /><input type="email" placeholder="Email Address" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full bg-transparent text-sm font-medium text-stone-800 outline-none" required /></div>
            <div className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-stone-50 px-4 py-3.5 focus-within:border-[var(--color-primary)]"><Phone className="h-4 w-4 shrink-0 text-stone-400" /><input type="tel" placeholder="Phone Number (e.g., 0812...)" value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))} className="w-full bg-transparent text-sm font-medium text-stone-800 outline-none" required /></div>

            <div className="space-y-3">
              <div className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${serviceType === 'dine_in' ? 'border-[var(--color-primary)] bg-emerald-50' : 'border-stone-200 bg-stone-100 opacity-70'}`}>
                <MapPin className="h-4 w-4 shrink-0 text-stone-500" />
                <input type="text" readOnly value={displayTable} className="w-full cursor-not-allowed bg-transparent text-sm font-bold uppercase text-stone-600 outline-none" />
                {tableCode && <span className="rounded-md bg-emerald-100 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-emerald-600">Scanned</span>}
              </div>
              <div>
                <p className="mb-2 text-[10px] font-label font-bold uppercase tracking-[0.2em] text-stone-500">Jenis pesanan</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setServiceType('dine_in')} disabled={!tableCode} className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${serviceType === 'dine_in' ? 'border-[var(--color-primary)] bg-emerald-50 text-[var(--color-primary)]' : 'border-stone-200 bg-white text-stone-500'} disabled:cursor-not-allowed disabled:opacity-40`}>Makan di Tempat</button>
                  <button type="button" onClick={() => setServiceType('takeaway')} className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${serviceType === 'takeaway' ? 'border-[var(--color-primary)] bg-emerald-50 text-[var(--color-primary)]' : 'border-stone-200 bg-white text-stone-500'}`}>Takeaway</button>
                </div>
                {!tableCode && <p className="mt-2 text-[10px] text-stone-400">Meja tidak tersedia, pesanan otomatis menggunakan Takeaway.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-100 bg-white p-5 shadow-sm">
          <p className="mb-4 text-[10px] font-label font-bold uppercase tracking-[0.28em] text-stone-500">Metode pembayaran</p>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {(['online', 'cashier'] as const).map((type) => (
              <button key={type} type="button" onClick={() => { setOrderType(type); setMethod(type === 'online' ? 'qris' : 'cash'); }} className={`rounded-xl border py-2.5 text-xs font-bold ${orderType === type ? 'border-[var(--color-primary)] bg-emerald-50 text-[var(--color-primary)]' : 'border-stone-200 bg-stone-50'}`}>
                {type === 'online' ? 'Online Payment' : 'Pay at Cashier'}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {visibleMethods.map((payment) => (
              <button key={payment.id} type="button" onClick={() => setMethod(payment.id)} className={`flex w-full items-center justify-between rounded-xl border p-3.5 ${method === payment.id ? 'border-[var(--color-primary)] bg-emerald-50' : 'border-stone-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${payment.color}`}><payment.icon className="h-4 w-4 text-white" /></div>
                  <span className="text-sm font-semibold">{payment.label}</span>
                </div>
                <div className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${method === payment.id ? 'border-[var(--color-primary)]' : 'border-stone-300'}`}>
                  {method === payment.id && <div className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 border-t border-stone-100 bg-white/95 px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-16px_30px_rgba(0,0,0,0.06)] backdrop-blur-xl">
        <div className="mb-3 flex items-end justify-between">
          <div><p className="text-[9px] font-label font-bold uppercase tracking-[0.25em] text-stone-400">Total pembayaran</p><p className="font-display text-xl font-bold text-stone-900">{formatIDR(total)}</p></div>
          <p className="text-[10px] text-stone-400">Aman & terenkripsi</p>
        </div>
        <button type="button" onClick={() => onPay({ userId: sessionUserId, name, email, phone, tableNumber: tableCode || null, serviceType, manualTableInfo: serviceType === 'takeaway' ? 'Takeaway' : null, method, orderType })} disabled={isProcessing || !name} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--color-primary)] py-4 font-bold text-white shadow-lg shadow-black/10 disabled:opacity-50">
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay Now'}
        </button>
      </div>
    </div>
  );
}

function QrisStep({ onBack, onFinish, qrUrl, qrString, total, orderCode, expiryTime }: any) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Logika penentuan sumber QR Code
  // 1. Prioritas utama: qrUrl dari Midtrans
  // 2. Fallback: Generate QR dari qrString menggunakan layanan publik (misal: api.qrserver.com)
  const finalQrSrc = qrUrl 
    ? qrUrl 
    : qrString 
      ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrString)}` 
      : null;

  const checkPaymentStatus = async (isManual = false) => {
    if (isExpired) return;
    if (isManual) setIsChecking(true);
    
    try {
      const response = await fetch(`/api/checkout/status?orderCode=${orderCode}`);
      const data = await response.json();
      
      const pStatus = data.paymentStatus;
      const status = data.status;
      const isPaid = 
        (data.success && (pStatus == 2 || pStatus === '2' || status === 'settlement' || status === 'capture')) ||
        data.payment_status == '2';

      if (isPaid) {
        onFinish();
      } else if (isManual) {
        setStatusMsg('Pembayaran belum terdeteksi. Silakan tunggu sebentar.');
        window.setTimeout(() => setStatusMsg(''), 3000);
      }
    } catch (error) {
      console.error('Check status error:', error);
    } finally {
      if (isManual) setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!orderCode || isExpired) return;
    
    const pollInterval = window.setInterval(() => {
      void checkPaymentStatus(false);
    }, 3000);

    return () => window.clearInterval(pollInterval);
  }, [orderCode, isExpired]);

  useEffect(() => {
    if (!expiryTime) return;
    const targetDate = new Date(expiryTime).getTime();

    const interval = window.setInterval(() => {
      const currentTime = Date.now();
      const distance = targetDate - currentTime;

      if (distance < 0) {
        window.clearInterval(interval);
        setTimeLeft('EXPIRED');
        setIsExpired(true);
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}:${seconds < 10 ? `0${seconds}` : seconds}`);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiryTime]);

  const handleMainButtonClick = () => {
    if (isExpired) {
      onBack();
    } else {
      void checkPaymentStatus(true);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--color-surface)]">
      <header className="flex items-center gap-4 bg-[var(--color-primary)] px-4 py-6 text-white">
        <button type="button" onClick={onBack} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/20">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 pr-9 text-center text-base font-bold">Payment QRIS</h1>
      </header>

      <div className="flex flex-1 flex-col items-center space-y-6 bg-[var(--color-primary)] p-6">
        <div className="relative flex w-full max-w-sm flex-col items-center overflow-hidden rounded-3xl bg-white p-8 shadow-xl">
          <div className="absolute left-4 top-4 flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isExpired ? 'bg-red-500' : 'animate-ping bg-emerald-500'}`} />
            <span className="text-[8px] font-bold uppercase tracking-tighter text-stone-400">
              {isExpired ? 'Expired' : 'Auto-checking...'}
            </span>
          </div>

          <div className="absolute right-0 top-0 flex items-center gap-2 rounded-bl-2xl bg-red-500 px-4 py-2 text-white">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-mono text-xs font-bold">{timeLeft || '0:00'}</span>
          </div>

          {/* Kondisi Tampilan QR / Error */}
          <div className={`mb-6 rounded-xl border-4 bg-white p-2 flex items-center justify-center h-72 w-64 ${isExpired ? 'border-red-200 grayscale' : 'border-[var(--color-primary)]'}`}>
            {finalQrSrc ? (
              <img src={finalQrSrc} alt="QR Code" className="h-full w-full object-contain" />
            ) : (
              <div className="text-center p-4">
                <p className="text-xs font-bold text-red-500">Gagal memuat QR Code.</p>
                <p className="text-[10px] text-stone-400 mt-1">Data QRIS tidak tersedia dari server.</p>
              </div>
            )}
          </div>

          <p className="mb-1 text-sm font-medium text-stone-500">Total Pembayaran</p>
          <p className="mb-4 text-2xl font-black text-[var(--color-primary)]">{formatIDR(total)}</p>

          {statusMsg && (
            <p className="animate-bounce rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-600">
              {statusMsg}
            </p>
          )}
        </div>
      </div>

      <div className="z-20 bg-white p-4 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
        <button
          type="button"
          onClick={handleMainButtonClick}
          disabled={isChecking}
          className={`flex w-full items-center justify-center gap-3 rounded-xl py-4 font-bold text-white transition-all ${
            isExpired ? 'bg-stone-400 hover:bg-stone-500' : 'bg-[var(--color-primary)] active:scale-95'
          }`}
        >
          {isChecking ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isExpired ? (
            'Waktu Habis - Kembali'
          ) : (
            'Saya Sudah Bayar'
          )}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutView({ onBack, onSuccess }: Props) {
  const params = useParams();
  const slug = params.mitraSlug as string;

  const routeSegments = Array.isArray(params.branchSlug) ? params.branchSlug : [];
  const reservedViews = new Set(['menu', 'checkout', 'tracking', 'history', 'help', 'profile', 'coupons', 'roasts']);
  const branchSlug = routeSegments[0] && !reservedViews.has(routeSegments[0]) ? routeSegments[0] : null;

  const { getCartBySlug, removeItem, updateQuantity, clearCart, calculateTotal, getAppliedCoupon, applyCouponManual, removeCoupon } = useCartStore();

  const cartItems = getCartBySlug(slug);
  const appliedCoupon = getAppliedCoupon(slug);

  const { items: menuItems } = useMenuStore();
  const { createOrder } = useOrderStore();
  const { userId, isLoggedIn } = useAuthStore();

  const [step, setStep] = useState<'review' | 'payment' | 'qris'>('review');
  const [qrisUrl, setQrisUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrderPayload, setCurrentOrderPayload] = useState<any>(null);

  const [settings, setSettings] = useState<SettingsState>({ taxRate: 0, serviceRate: 0, isTaxIncluded: false });
  const [availablePromos, setAvailablePromos] = useState<any[]>([]);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resSettings = await fetch(`/api/settings?slug=${slug}`);
        const dataSettings = await resSettings.json();
        if (dataSettings.success) {
          setSettings({
            taxRate: dataSettings.data.taxRate || 0,
            serviceRate: dataSettings.data.serviceRate || 0,
            isTaxIncluded: dataSettings.data.isTaxIncluded === 1,
          });
        }

        const resPromos = await fetch(`/api/coupons?slug=${slug}${branchSlug ? `&branch_slug=${branchSlug}` : ''}`);
        const dataPromos = await resPromos.json();
        if (dataPromos.success) {
          setAvailablePromos(dataPromos.data.filter((c: any) => c.max_use === 0 || c.already_used < c.max_use));
        }
      } catch {
        console.warn('Gagal fetch data di checkout.');
      }
    };
    if (slug) void fetchData();
  }, [slug, branchSlug]);

  // 🟢 LOGIKA PENERAPAN KUPON YANG DIPERBARUI DENGAN TOAST & VIBRATE
  const handleApplyCoupon = async (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) { 
      setCouponError('Kode kupon wajib diisi.');
      triggerVibration([200, 100, 200]); 
      Toast.fire({ icon: 'warning', title: 'Kode kupon wajib diisi.' });
      return; 
    }

    setIsCheckingCoupon(true);
    try {
      const authResponse = await fetch(`/api/auth/me?slug=${encodeURIComponent(slug)}`, { method: 'GET', credentials: 'include', cache: 'no-store' });
      const authResult = await authResponse.json().catch(() => null);
      const authenticatedUserId = authResponse.ok && authResult?.success && authResult?.user?.id ? Number(authResult.user.id) : null;

      const couponParams = new URLSearchParams({ code: normalizedCode, slug });
      if (branchSlug) couponParams.set('branch_slug', branchSlug);
      if (authenticatedUserId) couponParams.set('user_id', String(authenticatedUserId));

      const response = await fetch(`/api/coupons/validate?${couponParams.toString()}`, { method: 'GET', credentials: 'include', cache: 'no-store' });
      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMessage = result.message || 'Kupon tidak dapat digunakan.';
        setCouponError(errorMessage);
        triggerVibration([200, 100, 200]); // Getar 2 kali cepat (Error)
        Toast.fire({ icon: 'error', title: errorMessage });
        return;
      }

      const validCoupon = {
        id: result.data.id,
        code: result.data.code || result.data.coupon_code || normalizedCode,
        type: result.data.discountRate > 0 ? 'percentage' : 'fixed',
        value: result.data.discountRate > 0 ? result.data.discountRate : result.data.discountPrice,
        min_purchase: result.data.min_purchase || 0,
        max_discount: result.data.max_discount || 0,
        is_auto_apply: result.data.is_auto_apply || false,
        applicable_items: result.data.applicable_items || []
      };

      applyCouponManual(slug, validCoupon as any);
      setCouponError('');
      triggerVibration(100); // Getar pendek 1 kali (Berhasil)
      Toast.fire({ icon: 'success', title: 'Promo berhasil digunakan!' });
    } catch (error) {
      const errorMessage = 'Gagal memvalidasi kupon.';
      setCouponError(errorMessage);
      triggerVibration([200, 100, 200]);
      Toast.fire({ icon: 'error', title: errorMessage });
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => { removeCoupon(slug); setCouponError(''); };
  const handleRemoveItem = (itemId: string) => { removeItem(slug, itemId); };
  const handleUpdateQuantity = (itemId: string, change: number) => { updateQuantity(slug, itemId, change); };

  const { subtotal, discountAmount, total: subtotalAfterDiscount } = calculateTotal(slug, menuItems);
  let tax = 0; let service = 0;
  if (!settings.isTaxIncluded) {
    service = Math.floor(subtotalAfterDiscount * (settings.serviceRate / 100));
    tax = Math.floor((subtotalAfterDiscount + service) * (settings.taxRate / 100));
  }
  const finalTotal = Math.floor(subtotalAfterDiscount + tax + service);

  const handlePay = async (customerData: any) => {
    setIsProcessing(true);
    const preparedItems = cartItems.map((item) => {
      const product = menuItems.find((menu) => menu.id === item.menuItemId);
      return { ...item, priceAtOrder: getItemPrice(item, product), selectedAddOnsDetails: getAddOnDetails(item, product) };
    });

    const payload = {
      slug, branchSlug, total: subtotal, discount: discountAmount, tax, service, totalAfterDiscount: finalTotal, discountId: appliedCoupon ? appliedCoupon.id : null,
      serviceType: customerData.serviceType ?? 'dine_in', manualTableInfo: customerData.manualTableInfo ?? null,
      customer: { ...customerData, userId: Number(customerData.userId) > 0 ? Number(customerData.userId) : isLoggedIn && Number(userId) > 0 ? Number(userId) : null, tableNumber: customerData.tableNumber ?? null, serviceType: customerData.serviceType ?? 'dine_in', manualTableInfo: customerData.manualTableInfo ?? null, method: customerData.method },
      cartItems: preparedItems,
    };

    try {
      const response = await fetch('/api/checkout', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(payload) });
      const data = await response.json();

      if (data.success) {
        const orderData = { id: data.orderId, orderCode: data.orderCode, expiryTime: data.expiryTime, ...payload, status: 'pending' };
        if (customerData.method === 'qris' && data.qrUrl) {
          setQrisUrl(data.qrUrl); setCurrentOrderPayload(orderData); setStep('qris');
        } else {
          createOrder(orderData as any); clearCart(slug); onSuccess();
        }
      } else { window.alert(data.message || 'Gagal server.'); }
    } catch { window.alert('Error jaringan.'); } finally { setIsProcessing(false); }
  };

  const handleFinishQris = () => { if (!currentOrderPayload) return; createOrder(currentOrderPayload); clearCart(slug); onSuccess(); };

  if (step === 'review' && cartItems.length === 0 && !currentOrderPayload) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-[var(--color-surface)] px-6 py-12 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-stone-100"><ShoppingBag className="h-9 w-9 text-stone-400" /></div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.28em] text-[var(--color-primary)]">Keranjang kosong</p>
        <h1 className="font-display text-2xl font-bold text-stone-900">Belum ada pesanan</h1>
        <button type="button" onClick={onBack} className="mt-7 rounded-2xl bg-[var(--color-primary)] px-6 py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.97]">Jelajahi Menu</button>
      </div>
    );
  }

  return (
    <div className="checkout-view-container h-full bg-[var(--color-surface)]">
      <AnimatePresence mode="wait" initial={false}>
        {step === 'review' ? (
          <motion.div key="review" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="h-full">
            <OrderReview
              onBack={onBack} onNext={() => setStep('payment')} cartItems={cartItems} menuItems={menuItems} subtotal={subtotal} discount={discountAmount} tax={tax} service={service} total={finalTotal}
              removeItem={handleRemoveItem} updateQuantity={handleUpdateQuantity} settings={settings} appliedCoupon={appliedCoupon} couponError={couponError} applyCoupon={handleApplyCoupon} removeCoupon={handleRemoveCoupon} isCheckingCoupon={isCheckingCoupon} availablePromos={availablePromos}
            />
          </motion.div>
        ) : step === 'payment' ? (
          <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="h-full">
            <PaymentStep onBack={() => setStep('review')} onPay={handlePay} total={finalTotal} isProcessing={isProcessing} slug={slug} />
          </motion.div>
        ) : (
          <motion.div key="qris" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.2 }} className="h-full">
            <QrisStep onBack={() => setStep('payment')} onFinish={handleFinishQris} qrUrl={qrisUrl} qrString={currentOrderPayload?.qrString} total={finalTotal} orderCode={currentOrderPayload?.orderCode} expiryTime={currentOrderPayload?.expiryTime} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}