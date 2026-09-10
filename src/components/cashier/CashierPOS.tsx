'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore } from '@/store/menu.store';
import { CartItem, Order } from '@/types/menu';
import { formatPrice } from '@/utils/formatters';
import {
  ArrowLeft,
  Plus,
  Minus,
  Search,
  X,
  CheckCircle2,
  Loader2,
  CheckSquare,
  Square,
  ChevronDown,
  QrCode,
  Coffee,
  ShoppingCart,
  ShoppingBag,
  Trash2,
  UserCircle,
  Coins,
  UtensilsCrossed,
  Package,
  Banknote,
  CreditCard,
  Tag,
  LayoutGrid,
  ReceiptText,
  Hash,
} from 'lucide-react';
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
  
  const [activeCategory, setActiveCategory] = useState<string>(String(categories[0]?.id ?? ''),);
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
    if (!activeCategory && categories.length > 0) {
      setActiveCategory(String(categories[0].id));
    }
  }, [activeCategory, categories]);

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

  const getCouponCode = (coupon: any) =>
    String(
      coupon?.coupon_code ??
      coupon?.couponCode ??
      coupon?.code ??
      ''
    )
      .trim()
      .toUpperCase();

  const visibleCoupons = useMemo(() => {
    return availableCoupons.filter((coupon) => {
      const isMemberOnly = Boolean(
        coupon?.is_member_only ??
        coupon?.isMemberOnly ??
        false
      );

      if (isMemberOnly && !verifiedMember) {
        return false;
      }

      return Boolean(getCouponCode(coupon));
    });
  }, [availableCoupons, verifiedMember]);

  const { couponDiscountAmount, discountError } = useMemo(() => {
    if (!selectedCouponCode) {
      return {
        couponDiscountAmount: 0,
        discountError: '',
      };
    }

    const normalizedSelectedCode =
      String(selectedCouponCode)
        .trim()
        .toUpperCase();

    const coupon = visibleCoupons.find(
      (item) =>
        getCouponCode(item) ===
        normalizedSelectedCode,
    );

    if (!coupon) {
      return {
        couponDiscountAmount: 0,
        discountError:
          'Promo tidak tersedia untuk member / outlet ini.',
      };
    }

    const isMemberOnly = Boolean(
      coupon?.is_member_only ??
      coupon?.isMemberOnly ??
      false
    );

    if (isMemberOnly && !verifiedMember) {
      return {
        couponDiscountAmount: 0,
        discountError:
          'Promo ini khusus member. Verifikasi member terlebih dahulu.',
      };
    }

    const minOrder = Number(
      coupon?.min_purchase ??
      coupon?.min_order ??
      coupon?.minimum_purchase ??
      0
    );

    if (
      Number.isFinite(minOrder) &&
      minOrder > 0 &&
      subtotal < minOrder
    ) {
      return {
        couponDiscountAmount: 0,
        discountError: `Min. belanja ${formatPrice(minOrder)}`,
      };
    }

    const discountRate = Number(
      coupon?.discount_rate ??
      coupon?.discountRate ??
      0
    );

    const discountPrice = Number(
      coupon?.discount_price ??
      coupon?.discountPrice ??
      0
    );

    const legacyType = String(
      coupon?.type ??
      coupon?.discount_type ??
      ''
    ).toLowerCase();

    const legacyValue = Number(
      coupon?.value ??
      coupon?.discount_value ??
      coupon?.amount ??
      0
    );

    const legacyMaxDiscount = Number(
      coupon?.max_discount ??
      coupon?.maxDiscount ??
      0
    );

    let calculatedDiscount = 0;

    if (
      Number.isFinite(discountRate) &&
      discountRate > 0
    ) {
      calculatedDiscount =
        subtotal *
        (discountRate / 100);

      if (
        Number.isFinite(discountPrice) &&
        discountPrice > 0
      ) {
        calculatedDiscount = Math.min(
          calculatedDiscount,
          discountPrice,
        );
      }
    } else if (
      legacyType === 'percent' ||
      legacyType === 'percentage'
    ) {
      calculatedDiscount =
        subtotal *
        (legacyValue / 100);

      if (
        Number.isFinite(legacyMaxDiscount) &&
        legacyMaxDiscount > 0
      ) {
        calculatedDiscount = Math.min(
          calculatedDiscount,
          legacyMaxDiscount,
        );
      }
    } else {
      const fixedDiscount =
        discountPrice > 0
          ? discountPrice
          : legacyValue;

      calculatedDiscount =
        Number.isFinite(fixedDiscount)
          ? fixedDiscount
          : 0;
    }

    calculatedDiscount = Math.min(
      subtotal,
      Math.max(
        0,
        calculatedDiscount,
      ),
    );

    if (calculatedDiscount <= 0) {
      return {
        couponDiscountAmount: 0,
        discountError:
          'Nilai promo tidak valid atau belum dikonfigurasi.',
      };
    }

    return {
      couponDiscountAmount:
        calculatedDiscount,
      discountError: '',
    };
  }, [
    subtotal,
    selectedCouponCode,
    visibleCoupons,
    verifiedMember,
  ]);

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
      const selectedCoupon = visibleCoupons.find(
        (coupon) =>
          getCouponCode(coupon) ===
          String(selectedCouponCode)
            .trim()
            .toUpperCase(),
      );
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

      // 🟢 Ambil data QRIS dengan aman dari respons API
      const extractedQrUrl = result.qrUrl || result.data?.qrUrl || result.printOrder?.qrUrl || (serverOrder as any)?.qr_url;
      const resolvedPaymentMethod = result.paymentMethod || result.data?.paymentMethod || result.printOrder?.paymentMethod || paymentMethod;

      // 🟢 Jika QRIS, tampilkan modal QRIS dahulu dan JANGAN panggil onSubmitOrder / tutup POS sekarang
      if (resolvedPaymentMethod === 'qris' && extractedQrUrl) {
        setQrisData({
          qrUrl: extractedQrUrl,
          orderCode: result.orderCode || result.data?.orderCode || 'ORDER',
          optimisticOrder: createdOrder,
        });
      } else {
        // Kalau Tunai (Cash), langsung selesaikan pesanan dan tutup POS
        await onSubmitOrder(createdOrder);
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

  // 🟢 Dipanggil saat kasir menutup popup QRIS (Selesai/Batal)
  const closeQrisModal = async () => {
    if (qrisData?.optimisticOrder) {
      await onSubmitOrder(qrisData.optimisticOrder);
    }
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

  const cartQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const selectedTable = tables.find((table) => String(table.id) === String(tableId));
  const cashReceived = Number(cashAmount || 0);
  const cashChange =
    paymentMethod === 'cash' && cashReceived > 0
      ? Math.max(0, cashReceived - total)
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full min-h-0 w-full overflow-hidden bg-[#efefeb] text-[#11110f]"
    >
      {/* ======================================================
          DESKTOP CATEGORY RAIL
          ====================================================== */}
      <aside className="hidden w-[112px] shrink-0 flex-col border-r border-black/[0.07] bg-[#11110f] text-white lg:flex">
        <div className="flex h-[78px] items-center justify-center border-b border-white/10">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black">
            <LayoutGrid className="h-5 w-5" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-1.5">
            {categories.map((category) => {
              const active = String(activeCategory) === String(category.id);

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setActiveCategory(String(category.id));
                  }}
                  className={`flex min-h-[70px] w-full flex-col items-center justify-center rounded-2xl px-2 text-center transition ${
                    active
                      ? 'bg-white text-black'
                      : 'text-white/45 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Coffee className="h-4 w-4" />
                  <span className="mt-2 line-clamp-2 text-[7px] font-black uppercase leading-3 tracking-[.08em]">
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="m-2 flex min-h-[58px] flex-col items-center justify-center rounded-2xl border border-white/10 text-white/45 transition hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="mt-1.5 text-[7px] font-black uppercase tracking-[.08em]">
            Queue
          </span>
        </button>
      </aside>

      {/* ======================================================
          PRODUCT CATALOG
          ====================================================== */}
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-black/[0.07] bg-[#f8f8f5] px-4 py-4 sm:px-5 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-black/[0.08] bg-white text-black/45 lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="hidden shrink-0 xl:block">
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-black/25">
                Point of sale
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-[-.055em]">
                New transaction
              </h1>
            </div>

            <div className="relative ml-auto w-full max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/25" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari produk..."
                className="h-12 w-full rounded-2xl border border-black/[0.08] bg-white pl-11 pr-10 text-xs font-bold outline-none transition placeholder:text-black/25 focus:border-black/25"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-[#efefeb] text-black/35 hover:text-black"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* mobile/tablet categories */}
          {!search && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((category) => {
                const active = String(activeCategory) === String(category.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setActiveCategory(String(category.id))}
                    className={`h-9 shrink-0 rounded-xl px-3 text-[8px] font-black uppercase tracking-[.07em] ${
                      active
                        ? 'bg-black text-white'
                        : 'border border-black/[0.07] bg-white text-black/40'
                    }`}
                  >
                    {category.name}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.16em] text-black/25">
                {search ? 'Search result' : 'Menu'}
              </p>
              <p className="mt-1 text-xs font-black">
                {filteredItems.length} produk
              </p>
            </div>

            {cartQuantity > 0 && (
              <div className="rounded-xl bg-black px-3 py-2 text-right text-white lg:hidden">
                <p className="text-[7px] font-black uppercase tracking-[.1em] text-white/40">
                  Cart
                </p>
                <p className="mt-0.5 text-xs font-black">{cartQuantity} item</p>
              </div>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-dashed border-black/15 bg-white">
                <Search className="h-7 w-7 text-black/15" />
              </div>
              <p className="mt-4 text-sm font-black">Produk tidak ditemukan</p>
              <p className="mt-1 text-[10px] text-black/30">
                Coba kata pencarian atau kategori lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredItems.map((item) => {
                const countInCart = cart
                  .filter((cartItem) => String(cartItem.menuItemId) === String(item.id))
                  .reduce((sum, cartItem) => sum + cartItem.quantity, 0);

                const imageUrl =
                  item.image && !String(item.image).includes('http')
                    ? `/${String(item.image).replace(/^\/+/, '')}`
                    : item.image;

                const rawAvailable =
                  (item as any).isAvailable ??
                  (item as any).is_available ??
                  ((item as any).status !== undefined
                    ? Number((item as any).status) === 1
                    : true);

                const available = Boolean(rawAvailable);

                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!available}
                    onClick={() => handleItemClick(item)}
                    className="group relative overflow-hidden rounded-[18px] border border-black/[0.07] bg-white text-left shadow-[0_1px_2px_rgba(0,0,0,.03)] transition hover:-translate-y-0.5 hover:border-black/20 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#e8e8e2]">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={String(imageUrl)}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Coffee className="h-8 w-8 text-black/15" />
                        </div>
                      )}

                      {countInCart > 0 && (
                        <span className="absolute right-2 top-2 flex h-7 min-w-7 items-center justify-center rounded-xl bg-black px-2 font-mono text-[9px] font-black text-white">
                          {countInCart}
                        </span>
                      )}

                      {!available && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[1px]">
                          <span className="rounded-lg bg-white px-3 py-1.5 text-[8px] font-black uppercase tracking-[.12em] text-red-600">
                            Habis
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <p className="line-clamp-2 min-h-8 text-[11px] font-black leading-4">
                        {item.name}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-black tracking-[-.02em]">
                          {formatPrice(Number(item.basePrice || 0))}
                        </p>

                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-black/[0.07] bg-[#f3f3ef] transition group-hover:bg-black group-hover:text-white">
                          <Plus className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ======================================================
          RECEIPT / CURRENT SALE
          ====================================================== */}
      <aside className="hidden h-full w-[420px] shrink-0 flex-col border-l border-black/[0.08] bg-white xl:flex 2xl:w-[450px]">
        <header className="shrink-0 border-b border-black/[0.07] bg-[#11110f] px-5 py-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/35">
                Current sale
              </p>
              <div className="mt-1 flex items-center gap-2">
                <ReceiptText className="h-4 w-4" />
                <h2 className="text-lg font-black tracking-[-.035em]">Draft Order</h2>
              </div>
            </div>

            <span className="rounded-xl bg-white/10 px-3 py-2 font-mono text-[9px] font-black text-white/65">
              {cartQuantity} ITEM
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 rounded-xl bg-white/10 p-1">
            <button
              type="button"
              onClick={() => setOrderType('dine-in')}
              className={`flex h-10 items-center justify-center gap-2 rounded-lg text-[8px] font-black uppercase tracking-[.08em] transition ${
                orderType === 'dine-in'
                  ? 'bg-white text-black'
                  : 'text-white/45'
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Dine in
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderType('takeaway');
                setTableId('');
                setTableDisplay('');
              }}
              className={`flex h-10 items-center justify-center gap-2 rounded-lg text-[8px] font-black uppercase tracking-[.08em] transition ${
                orderType === 'takeaway'
                  ? 'bg-white text-black'
                  : 'text-white/45'
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              Takeaway
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#fbfbf8]">
          {/* cart */}
          <div className="border-b border-dashed border-black/15 px-5 py-4">
            {cart.length === 0 ? (
              <div className="flex min-h-[170px] flex-col items-center justify-center text-center">
                <ShoppingCart className="h-7 w-7 text-black/15" />
                <p className="mt-3 text-xs font-black">Keranjang kosong</p>
                <p className="mt-1 text-[9px] leading-4 text-black/30">
                  Pilih produk dari katalog untuk memulai transaksi.
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {cart.map((cartItem, index) => {
                  const product = items.find(
                    (item) => String(item.id) === String(cartItem.menuItemId),
                  );

                  if (!product) return null;

                  const unitPrice = calculateItemPrice(
                    cartItem.menuItemId,
                    cartItem.selectedAddOnsDetails || [],
                  );

                  const addonNames = getAddonNames(
                    cartItem.menuItemId,
                    cartItem.selectedAddOnsDetails || [],
                  );

                  return (
                    <div
                      key={cartItem.id}
                      className={`py-3 ${index > 0 ? 'border-t border-dashed border-black/10' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-lg bg-black px-1.5 font-mono text-[8px] font-black text-white">
                          {cartItem.quantity}×
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[10px] font-black leading-4">
                              {product.name}
                            </p>
                            <p className="shrink-0 font-mono text-[9px] font-black">
                              {formatPrice(unitPrice * cartItem.quantity)}
                            </p>
                          </div>

                          {addonNames.length > 0 && (
                            <p className="mt-1 text-[8px] leading-4 text-black/35">
                              + {addonNames.join(' · ')}
                            </p>
                          )}

                          {cartItem.notes && (
                            <p className="mt-1 text-[8px] font-bold italic text-amber-700">
                              Note: {cartItem.notes}
                            </p>
                          )}

                          <div className="mt-2.5 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                setCart((current) =>
                                  current.filter((item) => item.id !== cartItem.id),
                                )
                              }
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>

                            <div className="flex items-center gap-1 rounded-lg bg-[#ecece7] p-1">
                              <button
                                type="button"
                                onClick={() => updateQuantity(cartItem.id, -1)}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-white"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center font-mono text-[9px] font-black">
                                {cartItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(cartItem.id, 1)}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-white"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* customer and table */}
          <div className="space-y-3 border-b border-dashed border-black/15 px-5 py-4">
            <div className="grid grid-cols-2 gap-2">
              <label className={orderType === 'takeaway' ? 'col-span-2' : ''}>
                <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[.12em] text-black/25">
                  Customer
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Nama pelanggan"
                  className="h-10 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-[9px] font-bold outline-none focus:border-black/25"
                />
              </label>

              {orderType === 'dine-in' && (
                <label className="relative">
                  <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[.12em] text-black/25">
                    Table
                  </span>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/20" />
                    <input
                      type="text"
                      value={tableDisplay}
                      onChange={(event) => {
                        setTableDisplay(event.target.value);
                        setTableId(event.target.value);
                      }}
                      onFocus={() => setShowTableOptions(true)}
                      onBlur={() => window.setTimeout(() => setShowTableOptions(false), 180)}
                      placeholder="Meja"
                      className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-8 pr-7 text-[9px] font-bold outline-none focus:border-black/25"
                    />
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-black/20" />
                  </div>

                  <AnimatePresence>
                    {showTableOptions && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute bottom-[calc(100%+6px)] right-0 z-50 max-h-52 w-full min-w-[220px] overflow-y-auto rounded-xl border border-black/[0.08] bg-white p-1.5 shadow-2xl"
                      >
                        {tables
                          .filter((table) =>
                            String(table.table_name || '')
                              .toLowerCase()
                              .includes(tableDisplay.toLowerCase()),
                          )
                          .map((table) => (
                            <button
                              key={table.id}
                              type="button"
                              onMouseDown={() => {
                                setTableId(String(table.id));
                                setTableDisplay(String(table.table_name));
                                setShowTableOptions(false);
                              }}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[9px] font-bold hover:bg-[#f2f2ee]"
                            >
                              <span>{table.table_name}</span>
                              <span className="text-[7px] uppercase tracking-[.08em] text-black/25">
                                {Number(table.status ?? 1) === 1 ? 'Available' : 'In use'}
                              </span>
                            </button>
                          ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </label>
              )}
            </div>

            <div>
              <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[.12em] text-black/25">
                Member
              </span>
              <div className="flex gap-2">
                <div className="relative min-w-0 flex-1">
                  <UserCircle className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/20" />
                  <input
                    type="text"
                    value={customerIdentity}
                    onChange={(event) => {
                      setCustomerIdentity(event.target.value);
                      if (verifiedMember) {
                        setVerifiedMember(null);
                        setUsePoints(false);
                        setSelectedCouponCode('');
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleVerifyMember();
                    }}
                    placeholder="No. HP / email"
                    className="h-10 w-full rounded-xl border border-black/[0.08] bg-white pl-9 pr-8 text-[9px] font-bold outline-none focus:border-black/25"
                  />
                  {verifiedMember && (
                    <CheckCircle2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-emerald-600" />
                  )}
                </div>

                <button
                  type="button"
                  disabled={isVerifyingMember || !customerIdentity.trim()}
                  onClick={() => void handleVerifyMember()}
                  className="h-10 rounded-xl bg-[#ecece7] px-3 text-[8px] font-black uppercase tracking-[.08em] disabled:opacity-35"
                >
                  {isVerifyingMember ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Cek'
                  )}
                </button>
              </div>
            </div>

            {verifiedMember && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <Coins className="h-4 w-4 shrink-0 text-emerald-700" />
                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-black text-emerald-900">
                      {verifiedMember.name}
                    </p>
                    <p className="text-[7px] font-bold text-emerald-700/60">
                      {formatPrice(Number(verifiedMember.points || 0)).replace('Rp', '').trim()} poin
                    </p>
                  </div>
                </div>

                <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[7px] font-black uppercase tracking-[.07em] text-emerald-800">
                  Pakai
                  <input
                    type="checkbox"
                    checked={usePoints}
                    disabled={Number(verifiedMember.points || 0) <= 0}
                    onChange={(event) => setUsePoints(event.target.checked)}
                    className="h-4 w-4 accent-black"
                  />
                </label>
              </div>
            )}

            <label>
              <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[.12em] text-black/25">
                Promo
              </span>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/20" />
                <select
                  value={selectedCouponCode}
                  onChange={(event) => setSelectedCouponCode(event.target.value)}
                  className="h-10 w-full appearance-none rounded-xl border border-black/[0.08] bg-white pl-9 pr-8 text-[9px] font-bold outline-none"
                >
                  <option value="">Tanpa promo</option>
                  {visibleCoupons.map((coupon) => {
                    const code = getCouponCode(coupon);

                    const memberOnly = Boolean(
                      coupon?.is_member_only ??
                      coupon?.isMemberOnly ??
                      false,
                    );

                    const rate = Number(
                      coupon?.discount_rate ??
                      coupon?.discountRate ??
                      0,
                    );

                    const fixed = Number(
                      coupon?.discount_price ??
                      coupon?.discountPrice ??
                      coupon?.discount_value ??
                      coupon?.value ??
                      0,
                    );

                    const discountLabel =
                      rate > 0
                        ? `${rate}%`
                        : fixed > 0
                          ? formatPrice(fixed)
                          : '';

                    return (
                      <option
                        key={coupon.id || code}
                        value={code}
                      >
                        {code}
                        {discountLabel
                          ? ` · ${discountLabel}`
                          : ''}
                        {memberOnly
                          ? ' · Member'
                          : ''}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-black/20" />
              </div>
            </label>

            {selectedCouponCode && discountError && (
              <p className="rounded-lg bg-red-50 px-2.5 py-2 text-[8px] font-bold text-red-600">
                {discountError}
              </p>
            )}

            {selectedCouponCode &&
              !discountError &&
              pricing.couponDiscount > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                  <div>
                    <p className="text-[7px] font-black uppercase tracking-[.1em] text-emerald-700/60">
                      Promo aktif
                    </p>
                    <p className="mt-0.5 text-[9px] font-black text-emerald-900">
                      {selectedCouponCode}
                    </p>
                  </div>

                  <p className="font-mono text-[9px] font-black text-emerald-700">
                    - {formatPrice(pricing.couponDiscount)}
                  </p>
                </div>
              )}
          </div>

          {/* payment */}
          <div className="space-y-3 px-5 py-4">
            <div>
              <span className="mb-1.5 block text-[7px] font-black uppercase tracking-[.12em] text-black/25">
                Payment
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[8px] font-black uppercase tracking-[.08em] ${
                    paymentMethod === 'cash'
                      ? 'border-black bg-black text-white'
                      : 'border-black/[0.08] bg-white text-black/40'
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('qris')}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-[8px] font-black uppercase tracking-[.08em] ${
                    paymentMethod === 'qris'
                      ? 'border-black bg-black text-white'
                      : 'border-black/[0.08] bg-white text-black/40'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" />
                  QRIS
                </button>
              </div>
            </div>

            {paymentMethod === 'cash' && (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={cashAmount}
                  onChange={(event) => setCashAmount(event.target.value.replace(/\D/g, ''))}
                  placeholder="Uang diterima"
                  className="h-10 rounded-xl border border-black/[0.08] bg-white px-3 text-[9px] font-black outline-none"
                />
                <button
                  type="button"
                  onClick={() => setCashAmount(String(total))}
                  className="h-10 rounded-xl bg-[#ecece7] px-3 text-[8px] font-black uppercase tracking-[.07em]"
                >
                  Uang pas
                </button>
              </div>
            )}

            {paymentMethod === 'cash' && cashReceived > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-[#ecece7] px-3 py-2">
                <span className="text-[7px] font-black uppercase tracking-[.08em] text-black/30">
                  Kembalian
                </span>
                <span className={`font-mono text-[9px] font-black ${cashReceived < total ? 'text-red-600' : ''}`}>
                  {cashReceived < total ? 'Uang kurang' : formatPrice(cashChange)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* fixed receipt totals */}
        <footer className="shrink-0 border-t border-black/[0.08] bg-white">
          <div className="space-y-1.5 px-5 py-4">
            <ReceiptLine label="Subtotal" value={formatPrice(subtotal)} />

            {pricing.couponDiscount > 0 && (
              <ReceiptLine
                label="Promo"
                value={`- ${formatPrice(pricing.couponDiscount)}`}
                accent
              />
            )}

            {pricing.pointDiscount > 0 && (
              <ReceiptLine
                label="Points"
                value={`- ${formatPrice(pricing.pointDiscount)}`}
                accent
              />
            )}

            {serviceCharge > 0 && (
              <ReceiptLine
                label={`Service ${serviceRate}%`}
                value={formatPrice(serviceCharge)}
              />
            )}

            {tax > 0 && (
              <ReceiptLine
                label={`Tax ${taxRate}%`}
                value={formatPrice(tax)}
              />
            )}

            <div className="mt-3 flex items-end justify-between border-t border-dashed border-black/20 pt-3">
              <div>
                <p className="text-[7px] font-black uppercase tracking-[.15em] text-black/30">
                  Total
                </p>
                <p className="mt-1 text-[8px] font-semibold text-black/30">
                  {isTaxIncluded ? 'Tax included' : 'Tax excluded'}
                </p>
              </div>
              <p className="text-3xl font-black tracking-[-.065em]">
                {formatPrice(total)}
              </p>
            </div>
          </div>

          <div className="p-4 pt-0">
            <button
              type="button"
              onClick={() => void handleCheckout()}
              disabled={isSubmitting || cart.length === 0}
              className="flex h-14 w-full items-center justify-between rounded-[16px] bg-[#11110f] px-5 text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.1em]">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : paymentMethod === 'qris' ? (
                  <CreditCard className="h-4 w-4" />
                ) : (
                  <Banknote className="h-4 w-4" />
                )}
                {isSubmitting
                  ? 'Processing'
                  : paymentMethod === 'qris'
                    ? 'Generate QRIS'
                    : 'Charge'}
              </span>
              <span className="font-mono text-sm font-black">{formatPrice(total)}</span>
            </button>

            {orderType === 'dine-in' && selectedTable && (
              <p className="mt-2 text-center text-[7px] font-bold uppercase tracking-[.08em] text-black/25">
                Linked to {selectedTable.table_name}
              </p>
            )}
          </div>
        </footer>
      </aside>

      {/* ======================================================
          MOBILE/TABLET CURRENT SALE
          ====================================================== */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-white p-3 xl:hidden">
        <button
          type="button"
          onClick={() => {
            const panel = document.getElementById('mobile-pos-checkout');
            panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="flex h-13 min-h-[52px] w-full items-center justify-between rounded-[15px] bg-black px-4 text-white"
        >
          <span className="text-[8px] font-black uppercase tracking-[.1em]">
            {cartQuantity} item · Checkout
          </span>
          <span className="font-mono text-xs font-black">{formatPrice(total)}</span>
        </button>
      </div>

      <section
        id="mobile-pos-checkout"
        className="absolute inset-x-0 top-full hidden min-h-full bg-white xl:hidden"
      />

      {/* ======================================================
          ADD-ON MODAL
          ====================================================== */}
      <AnimatePresence>
        {selectedProductForAddon && (
          <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
            <motion.button
              type="button"
              aria-label="Tutup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForAddon(null)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.98 }}
              className="relative z-10 flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
            >
              <header className="flex items-start justify-between gap-4 border-b border-black/[0.06] bg-[#11110f] p-5 text-white">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[.14em] text-white/30">
                    Customize item
                  </p>
                  <h3 className="mt-1 text-xl font-black tracking-[-.04em]">
                    {selectedProductForAddon.name}
                  </h3>
                  <p className="mt-1 font-mono text-xs font-black text-white/50">
                    {formatPrice(
                      calculateItemPrice(
                        String(selectedProductForAddon.id),
                        tempAddons,
                      ),
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProductForAddon(null)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/60"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <p className="text-[8px] font-black uppercase tracking-[.12em] text-black/30">
                  Add-on
                </p>

                <div className="mt-3 space-y-2">
                  {selectedProductForAddon.categorizedAddons?.[0]?.addons
                    ?.filter((addon: any) =>
                      selectedProductForAddon.addonGroups?.includes(Number(addon.id)),
                    )
                    .map((addon: any) => {
                      const selected = tempAddons.includes(Number(addon.id));

                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => toggleTempAddon(Number(addon.id))}
                          className={`flex w-full items-center justify-between gap-4 rounded-[15px] border p-3.5 text-left transition ${
                            selected
                              ? 'border-black bg-black text-white'
                              : 'border-black/[0.07] bg-white text-black'
                          }`}
                        >
                          <span className="flex min-w-0 items-center gap-3">
                            {selected ? (
                              <CheckSquare className="h-4 w-4 shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 shrink-0 text-black/20" />
                            )}
                            <span className="truncate text-[10px] font-black">
                              {addon.name}
                            </span>
                          </span>

                          {Number(addon.price) > 0 && (
                            <span className={`shrink-0 font-mono text-[9px] font-black ${selected ? 'text-white/55' : 'text-black/35'}`}>
                              +{formatPrice(Number(addon.price))}
                            </span>
                          )}
                        </button>
                      );
                    })}
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-[8px] font-black uppercase tracking-[.12em] text-black/30">
                    Catatan item
                  </span>
                  <input
                    type="text"
                    value={tempItemNote}
                    onChange={(event) => setTempItemNote(event.target.value)}
                    placeholder="Contoh: tanpa es, sedikit pedas..."
                    className="h-12 w-full rounded-xl border border-black/[0.08] bg-[#f4f4f0] px-4 text-xs font-semibold outline-none focus:border-black/25 focus:bg-white"
                  />
                </label>
              </div>

              <footer className="border-t border-black/[0.06] p-5">
                <button
                  type="button"
                  onClick={() => {
                    addToCart(
                      String(selectedProductForAddon.id),
                      tempAddons,
                      tempItemNote,
                    );
                    setSelectedProductForAddon(null);
                  }}
                  className="flex min-h-[52px] w-full items-center justify-between rounded-[15px] bg-black px-5 text-white"
                >
                  <span className="text-[8px] font-black uppercase tracking-[.1em]">
                    Add to order
                  </span>
                  <span className="font-mono text-xs font-black">
                    {formatPrice(
                      calculateItemPrice(
                        String(selectedProductForAddon.id),
                        tempAddons,
                      ),
                    )}
                  </span>
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================
          QRIS MODAL
          ====================================================== */}
      <AnimatePresence>
        {qrisData && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4">
            <motion.button
              type="button"
              aria-label="Tutup"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => void closeQrisModal()}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 28, scale: 0.98 }}
              className="relative z-10 w-full max-w-sm overflow-hidden rounded-t-[30px] bg-white shadow-2xl sm:rounded-[30px]"
            >
              <header className="bg-[#11110f] p-5 text-center text-white">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black">
                  <QrCode className="h-5 w-5" />
                </span>
                <p className="mt-4 text-[8px] font-black uppercase tracking-[.16em] text-white/35">
                  QRIS Payment
                </p>
                <h3 className="mt-1 text-xl font-black tracking-[-.04em]">
                  Scan untuk membayar
                </h3>
                <p className="mt-1 font-mono text-[8px] font-black text-white/35">
                  #{qrisData.orderCode}
                </p>
              </header>

              <div className="p-6 text-center">
                <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-[24px] border border-black/[0.08] bg-white p-4 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrisData.qrUrl}
                    alt="QRIS Payment"
                    className="h-full w-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <p className="mt-5 text-[7px] font-black uppercase tracking-[.14em] text-black/25">
                  Total pembayaran
                </p>
                <p className="mt-1 text-3xl font-black tracking-[-.06em]">
                  {formatPrice(total)}
                </p>

                <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-[8px] font-black uppercase tracking-[.08em] text-amber-700">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Menunggu pembayaran
                </div>
              </div>

              <footer className="border-t border-black/[0.06] p-5">
                <button
                  type="button"
                  onClick={() => void closeQrisModal()}
                  className="h-12 w-full rounded-xl bg-black text-[8px] font-black uppercase tracking-[.1em] text-white"
                >
                  Tutup & kembali ke antrean
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ReceiptLine({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 font-mono text-[8px]">
      <span className="font-bold text-black/35">{label}</span>
      <span className={`font-black ${accent ? 'text-emerald-700' : 'text-black/65'}`}>
        {value}
      </span>
    </div>
  );
}
