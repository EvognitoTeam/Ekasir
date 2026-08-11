import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMenuStore } from '@/store/menu.store';
import { CartItem, Order } from '@/types/menu';
import { formatPrice } from '@/utils/formatters';
import { ArrowLeft, Plus, Minus, Search, X, CheckCircle2, Loader2, CheckSquare, Square, ChevronDown, QrCode, Coffee, Ticket } from 'lucide-react';
import { useParams } from 'next/navigation'; 

interface CashierPOSProps {
  onClose: () => void;
  onSubmitOrder: (
    order: Order,
  ) => void | Promise<void>;
}

export default function CashierPOS({ onClose, onSubmitOrder }: CashierPOSProps) {
  const { items, categories } = useMenuStore();
  const params = useParams(); 
  const slug = (params.mitraSlug as string) || (params.slug as string) || "";
  
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [tables, setTables] = useState<any[]>([]);
  
  // States Add-on
  const [selectedProductForAddon, setSelectedProductForAddon] = useState<any | null>(null);
  const [tempAddons, setTempAddons] = useState<number[]>([]);
  const [tempItemNote, setTempItemNote] = useState('');

  // Checkout states
  const [orderType, setOrderType] = useState<'dine-in'|'takeaway'>('takeaway');
  const [customerName, setCustomerName] = useState('');
  const [tableId, setTableId] = useState(''); 
  const [tableDisplay, setTableDisplay] = useState(''); 
  const [showTableOptions, setShowTableOptions] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'qris'>('cash');
  const [cashAmount, setCashAmount] = useState<string>('');

  // 🟢 States Dropdown Voucher
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState<string>('');

  // Settings harga dibuat sama dengan self-checkout/server.
  const [taxRate, setTaxRate] = useState(0);
  const [serviceRate, setServiceRate] = useState(0);
  const [isTaxIncluded, setIsTaxIncluded] = useState(false);

  // State QRIS Modal
  const [qrisData, setQrisData] = useState<{ qrUrl: string, orderCode: string, optimisticOrder: Order } | null>(null);

  // 🟢 Fetch Meja & Kupon saat POS dibuka
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!slug) return;
      try {
        // Fetch Tables
        const resTables = await fetch(`/api/pos/tables?slug=${slug}`);
        const dataTables = await resTables.json();
        if (dataTables.success) setTables(dataTables.data);

        // Fetch Coupons (Untuk dimasukkan ke Dropdown)
        const resCoupons = await fetch(`/api/coupons?slug=${slug}`);
        const dataCoupons = await resCoupons.json();
        if (dataCoupons.success && Array.isArray(dataCoupons.data)) {
          setAvailableCoupons(dataCoupons.data);
        }

        // Fetch settings pajak/service agar tampilan POS sama dengan server.
        const resSettings = await fetch(`/api/settings?slug=${slug}`);
        const dataSettings = await resSettings.json();

        if (dataSettings.success && dataSettings.data) {
          setTaxRate(
            Number(
              dataSettings.data.taxRate ??
              dataSettings.data.tax_rate ??
              0,
            ) || 0,
          );

          setServiceRate(
            Number(
              dataSettings.data.serviceRate ??
              dataSettings.data.service_rate ??
              0,
            ) || 0,
          );

          setIsTaxIncluded(
            Number(
              dataSettings.data.isTaxIncluded ??
              dataSettings.data.is_tax_included ??
              0,
            ) === 1,
          );
        }
      } catch (e) {
        console.error("Gagal ambil data awal:", e);
      }
    };
    fetchInitialData();
  }, [slug]);

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

  // 🟢 Kalkulasi Diskon Otomatis (Real-time)
  const { discountAmount, discountError } = useMemo(() => {
    if (!selectedCouponCode) return { discountAmount: 0, discountError: '' };
    
    const coupon = availableCoupons.find(c => c.code === selectedCouponCode);
    if (!coupon) return { discountAmount: 0, discountError: 'Kupon tidak valid.' };

    const minOrder = Number(coupon.min_purchase || coupon.min_order || 0);
    if (subtotal < minOrder) {
      return { discountAmount: 0, discountError: `Min. belanja ${formatPrice(minOrder)}` };
    }

    const type = coupon.type || coupon.discount_type;
    const value = Number(coupon.value || coupon.discount_value || coupon.amount);
    
    let calc = 0;
    if (type === 'percent') {
      calc = subtotal * (value / 100);
      const maxDiscount = Number(coupon.max_discount || 0);
      if (maxDiscount > 0 && calc > maxDiscount) {
        calc = maxDiscount;
      }
    } else {
      calc = value;
    }

    return { discountAmount: calc, discountError: '' };
  }, [subtotal, selectedCouponCode, availableCoupons]);

  const pricing = useMemo(() => {
    const normalizedDiscount =
      Math.max(
        0,
        Math.floor(
          Number(discountAmount) || 0,
        ),
      );

    const subtotalAfterDiscount =
      Math.max(
        0,
        Math.floor(subtotal) -
          normalizedDiscount,
      );

    let calculatedTax = 0;
    let calculatedService = 0;
    let grandTotal = 0;

    if (isTaxIncluded) {
      const serviceDecimal =
        Number(serviceRate || 0) / 100;

      const taxDecimal =
        Number(taxRate || 0) / 100;

      const divisor =
        (1 + serviceDecimal) *
        (1 + taxDecimal);

      const trueBase =
        divisor > 0
          ? Math.floor(
              subtotalAfterDiscount /
                divisor,
            )
          : subtotalAfterDiscount;

      calculatedService =
        Math.floor(
          trueBase *
            serviceDecimal,
        );

      calculatedTax =
        subtotalAfterDiscount -
        trueBase -
        calculatedService;

      grandTotal =
        subtotalAfterDiscount;
    } else {
      calculatedService =
        Math.floor(
          subtotalAfterDiscount *
            (
              Number(serviceRate || 0) /
              100
            ),
        );

      calculatedTax =
        Math.floor(
          (
            subtotalAfterDiscount +
            calculatedService
          ) *
            (
              Number(taxRate || 0) /
              100
            ),
        );

      grandTotal =
        subtotalAfterDiscount +
        calculatedService +
        calculatedTax;
    }

    return {
      discount:
        normalizedDiscount,
      subtotalAfterDiscount,
      tax:
        calculatedTax,
      service:
        calculatedService,
      total:
        grandTotal,
    };
  }, [
    subtotal,
    discountAmount,
    taxRate,
    serviceRate,
    isTaxIncluded,
  ]);

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
    if (cart.length === 0) {
      return;
    }

    if (
      orderType === 'dine-in' &&
      !tableId
    ) {
      alert(
        'Masukkan nomor meja atau pager',
      );
      return;
    }

    if (
      paymentMethod === 'cash' &&
      cashAmount &&
      Number(cashAmount) < total
    ) {
      alert(
        'Nominal uang tunai masih kurang.',
      );
      return;
    }

    setIsSubmitting(true);

    const paid =
      paymentMethod === 'cash'
        ? (
            Number(cashAmount) ||
            total
          )
        : total;

    const change =
      paymentMethod === 'cash'
        ? Math.max(
            0,
            paid - total,
          )
        : 0;

    try {
      const selectedCoupon =
        availableCoupons.find(
          (
            coupon,
          ) =>
            String(
              coupon.code ??
              coupon.coupon_code ??
              '',
            ) ===
            selectedCouponCode,
        );

      const cartItems =
        cart.map(
          (
            cartItem,
          ) => {
            const addonDetails =
              getAddonDetails(
                cartItem.menuItemId,
                cartItem.selectedAddOnsDetails ||
                  [],
              );

            const customerNote =
              String(
                cartItem.notes ||
                '',
              ).trim();

            const noteDetails =
              customerNote
                ? [
                    {
                      name:
                        `Note: ${customerNote}`,
                      price:
                        0,
                      customer_note:
                        customerNote,
                      cust_notes:
                        customerNote,
                    },
                  ]
                : [];

            const selectedAddOnsDetails =
              [
                ...addonDetails,
                ...noteDetails,
              ];

            return {
              menuItemId:
                cartItem.menuItemId,

              product_id:
                cartItem.menuItemId,

              quantity:
                cartItem.quantity,

              /*
               * priceAtOrder sudah termasuk add-on, sama seperti
               * validasi self-checkout dan penyimpanan order_items.
               */
              priceAtOrder:
                calculateItemPrice(
                  cartItem.menuItemId,
                  cartItem.selectedAddOnsDetails ||
                    [],
                ),

              selectedAddOnsDetails,

              /*
               * Simpan salinan JSON agar endpoint/history lama yang
               * masih membaca kolom notes tetap dapat memulihkan add-on.
               */
              notes:
                JSON.stringify(
                  selectedAddOnsDetails,
                ),

              customerNote:
                customerNote ||
                null,

              name:
                items.find(
                  (
                    item,
                  ) =>
                    String(item.id) ===
                    String(
                      cartItem.menuItemId,
                    ),
                )?.name ??
                'Produk',
            };
          },
        );

      const orderPayload = {
        total:
          Math.floor(subtotal),

        discount:
          pricing.discount,

        totalAfterDiscount:
          total,

        customer: {
          name:
            customerName ||
            'Tamu Kasir',

          tableNumber:
            orderType ===
              'takeaway'
              ? null
              : tableId,

          manualTableInfo:
            orderType ===
              'takeaway'
              ? 'Takeaway'
              : (
                  tableDisplay ||
                  tableId ||
                  null
                ),

          serviceType:
            orderType ===
              'takeaway'
              ? 'takeaway'
              : 'dine-in',

          method:
            paymentMethod,
        },

        cartItems,

        discountId:
          pricing.discount > 0
            ? (
                selectedCoupon?.id ??
                null
              )
            : null,

        voucher_code:
          pricing.discount > 0
            ? selectedCouponCode
            : null,

        getPayment:
          paid,

        cashChange:
          change,

        idempotencyKey:
          `POS-${slug}-${Date.now()}-${crypto.randomUUID()}`,
      };

      const response =
        await fetch(
          `/api/pos/orders?slug=${slug}`,
          {
            method:
              'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                orderPayload,
              ),
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
          'Gagal membuat pesanan',
        );
      }

      /*
       * Pakai object hasil server. Jangan membangun ulang harga,
       * tax, service, meja, dan pembayaran dari state frontend.
       */
      const serverOrder =
        (
          result.printOrder ??
          result.data
        ) as Order;

      const serverItems =
        Array.isArray(
          (serverOrder as any)?.items,
        )
          ? (
              serverOrder as any
            ).items
          : [];

      const mergedItems =
        cartItems.map(
          (
            localItem,
            index,
          ) => {
            const matchingServerItem =
              serverItems.find(
                (serverItem: any) =>
                  String(
                    serverItem.menuItemId ??
                    serverItem.menu_item_id ??
                    serverItem.product_id ??
                    serverItem.productId ??
                    '',
                  ) ===
                  String(
                    localItem.menuItemId,
                  ),
              ) ??
              serverItems[index] ??
              {};

            return {
              ...localItem,
              ...matchingServerItem,
              menuItemId:
                String(
                  matchingServerItem.menuItemId ??
                  matchingServerItem.menu_item_id ??
                  matchingServerItem.product_id ??
                  localItem.menuItemId,
                ),
              product_id:
                matchingServerItem.product_id ??
                matchingServerItem.productId ??
                localItem.product_id,
              selectedAddOnsDetails:
                localItem.selectedAddOnsDetails,
              notes:
                typeof matchingServerItem.notes ===
                  'string' &&
                matchingServerItem.notes.trim() !==
                  ''
                  ? matchingServerItem.notes
                  : localItem.notes,
            };
          },
        );

      const createdOrder =
        serverOrder
          ? ({
              ...serverOrder,
              items:
                mergedItems,
            } as Order)
          : null;

      if (
        !createdOrder
      ) {
        throw new Error(
          'Server tidak mengembalikan data order untuk dicetak.',
        );
      }

      /*
       * onSubmitOrder di halaman kasir akan menambahkan order
       * sekaligus mencetak struk customer.
       */
      await onSubmitOrder(
        createdOrder,
      );

      if (
        result.paymentMethod ===
          'qris' &&
        result.qrUrl
      ) {
        setQrisData({
          qrUrl:
            result.qrUrl,

          orderCode:
            result.orderCode,

          optimisticOrder:
            createdOrder,
        });

        setIsCartOpen(
          false,
        );
      } else {
        setCart([]);
        setCashAmount('');
        setSelectedCouponCode('');
      }
    } catch (error) {
      console.error(
        '[POS_CHECKOUT_ERROR]',
        error,
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan jaringan.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeQrisModal = () => {
    /*
     * Order sudah dikirim ke onSubmitOrder tepat setelah API sukses,
     * sehingga tidak boleh dikirim ulang saat modal QRIS ditutup.
     */
    setQrisData(null);
    setCart([]);
    setCashAmount('');
    setSelectedCouponCode('');
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
        background: '#f6f3ee', display: 'flex', flexDirection: 'column'
      }}
    >
      <header style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e2dd', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '10px', background: '#f0ede9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={18} color="#1c1c19" />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1c1c19', fontFamily: 'var(--font-display)' }}>Buat Pesanan Baru</h2>
          <p style={{ margin: 0, fontSize: '12px', color: '#9CA3AF' }}>Mode Kasir / POS</p>
        </div>
      </header>

      <div style={{ background: '#fff', padding: '12px 20px', borderBottom: '1px solid #e5e2dd', zIndex: 2, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', background: '#f6f3ee', borderRadius: '10px', padding: '8px 12px', marginBottom: '12px' }}>
          <Search size={16} color="#9CA3AF" />
          <input 
            type="text" 
            placeholder="Cari menu..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', marginLeft: '8px', fontSize: '13px' }}
          />
        </div>
        
        {!search && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setActiveCategory(String(cat.id))}
                style={{ 
                  padding: '6px 14px', borderRadius: '20px', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer',
                  background: String(activeCategory) === String(cat.id) ? '#0E5C37' : '#f0ede9',
                  color: String(activeCategory) === String(cat.id) ? '#fff' : '#5a4b44'
                }}>
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', paddingBottom: '100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {filteredItems.map(item => {
            const countInCart = cart.filter(c => String(c.menuItemId) === String(item.id)).reduce((s, c) => s + c.quantity, 0);
            const imgUrl = item.image && !item.image.includes('http') ? `/${item.image}` : item.image; 

            return (
              <div 
                key={item.id} 
                onClick={() => handleItemClick(item)}
                style={{ 
                  background: '#fff', borderRadius: '12px', padding: '12px', border: '1.5px solid #e5e2dd',
                  display: 'flex', flexDirection: 'column', gap: '8px', cursor: 'pointer', position: 'relative',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}
              >
                <div style={{ width: '100%', height: '100px', borderRadius: '8px', overflow: 'hidden', background: '#f0ede9' }}>
                  {imgUrl ? (
                     <img src={imgUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                     <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Coffee size={24} color="#d6c2bd" />
                     </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#1c1c19', lineHeight: 1.3 }}>{item.name}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#0E5C37', fontWeight: 800 }}>{formatPrice(Number(item.basePrice))}</p>
                </div>
                
                {countInCart > 0 ? (
                  <div style={{ position: 'absolute', top: 8, right: 8, background: '#0E5C37', color: '#fff', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800 }}>
                    {countInCart}
                  </div>
                ) : (
                  <div style={{ position: 'absolute', bottom: 12, right: 12, width: 28, height: 28, borderRadius: '8px', background: '#f0ede9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Plus size={16} color="#0E5C37" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedProductForAddon && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForAddon(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(28,28,25,0.4)', zIndex: 30 }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ 
                position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', 
                borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px 20px', zIndex: 31,
                maxHeight: '85dvh', display: 'flex', flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1c1c19', fontFamily: 'var(--font-display)' }}>{selectedProductForAddon.name}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: '#0E5C37', fontWeight: 700 }}>
                    {formatPrice(calculateItemPrice(String(selectedProductForAddon.id), tempAddons))}
                  </p>
                </div>
                <button onClick={() => setSelectedProductForAddon(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="#9CA3AF" /></button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', margin: '0 -20px', padding: '0 20px', paddingBottom: '20px' }}>
                <p style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#5a4b44' }}>Pilih Tambahan (Opsional)</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {selectedProductForAddon.categorizedAddons?.[0]?.addons
                    ?.filter((a: any) => selectedProductForAddon.addonGroups?.includes(Number(a.id)))
                    .map((addon: any) => {
                      const isSelected = tempAddons.includes(Number(addon.id));
                      return (
                        <div 
                          key={addon.id} 
                          onClick={() => toggleTempAddon(Number(addon.id))}
                          style={{ 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '12px 16px', borderRadius: '12px', border: `1.5px solid ${isSelected ? '#0E5C37' : '#e5e2dd'}`,
                            background: isSelected ? '#ECFDF5' : '#fff', cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {isSelected ? <CheckSquare size={18} color="#0E5C37" /> : <Square size={18} color="#d6c2bd" />}
                            <span style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#0E5C37' : '#1c1c19' }}>
                              {addon.name}
                            </span>
                          </div>
                          {Number(addon.price) > 0 && (
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#5a4b44' }}>
                              +{formatPrice(Number(addon.price))}
                            </span>
                          )}
                        </div>
                      )
                    })}
                </div>

                <div style={{ marginTop: '20px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#5a4b44' }}>Catatan Item Khusus</p>
                  <input 
                    type="text" 
                    placeholder="Misal: Jangan pakai seledri, sedikit pedas" 
                    value={tempItemNote}
                    onChange={(e) => setTempItemNote(e.target.value)}
                    style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e2dd', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ paddingTop: '20px', borderTop: '1px solid #f0ede9', flexShrink: 0 }}>
                <button 
                  onClick={() => {
                    addToCart(String(selectedProductForAddon.id), tempAddons, tempItemNote);
                    setSelectedProductForAddon(null);
                  }} 
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', background: '#0E5C37', color: '#fff', border: 'none', fontSize: '15px', fontWeight: 800, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  Tambahkan ke Keranjang
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cart.length > 0 && !isCartOpen && !selectedProductForAddon && !qrisData && (
          <motion.div 
            initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
            style={{ position: 'absolute', bottom: 20, left: 20, right: 20, zIndex: 10 }}
          >
            <button 
              onClick={() => setIsCartOpen(true)}
              style={{
                width: '100%', padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, #0E5C37, #065F46)',
                border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                boxShadow: '0 12px 32px rgba(14,92,55,0.3)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                  {cart.reduce((s, c) => s + c.quantity, 0)}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>Lanjut Bayar</span>
              </div>
              <span style={{ fontSize: '15px', fontWeight: 800 }}>{formatPrice(total)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCartOpen && !qrisData && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(28,28,25,0.4)', zIndex: 20 }}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ 
                position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff', 
                borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px 20px', zIndex: 21,
                maxHeight: '90dvh', display: 'flex', flexDirection: 'column'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#1c1c19', fontFamily: 'var(--font-display)' }}>Detail Pesanan</h3>
                <button onClick={() => setIsCartOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#9CA3AF" /></button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', margin: '0 -20px', padding: '0 20px' }}>
                {cart.map(cartItem => {
                  const product = items.find(i => String(i.id) === String(cartItem.menuItemId));
                  if (!product) return null;
                  
                  const unitPrice = calculateItemPrice(cartItem.menuItemId, cartItem.selectedAddOnsDetails || []);
                  const addonNames = getAddonNames(cartItem.menuItemId, cartItem.selectedAddOnsDetails || []);

                  return (
                    <div key={cartItem.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f0ede9' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: '#1c1c19' }}>{product.name}</p>
                        
                        {addonNames.length > 0 && (
                          <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#5a4b44' }}>{addonNames.join(', ')}</p>
                        )}
                        {cartItem.notes && (
                          <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#92400E', fontStyle: 'italic' }}>"{cartItem.notes}"</p>
                        )}

                        <p style={{ margin: 0, fontSize: '13px', color: '#0E5C37', fontWeight: 700 }}>{formatPrice(unitPrice * cartItem.quantity)}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#f0ede9', padding: '4px', borderRadius: '10px' }}>
                        <button onClick={() => updateQuantity(cartItem.id, -1)} style={{ width: 28, height: 28, borderRadius: '6px', background: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Minus size={14} /></button>
                        <span style={{ fontSize: '14px', fontWeight: 800, width: '20px', textAlign: 'center' }}>{cartItem.quantity}</span>
                        <button onClick={() => updateQuantity(cartItem.id, 1)} style={{ width: 28, height: 28, borderRadius: '6px', background: '#0E5C37', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Plus size={14} /></button>
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* 🟢 AREA DROPDOWN KUPON / VOUCHER */}
                  <div style={{ padding: '16px', background: '#f6f3ee', borderRadius: '12px', border: '1px dashed #d6c2bd' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                      <Ticket size={16} color="#0E5C37" />
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#1c1c19' }}>Pilih Kupon Promo</p>
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedCouponCode}
                        onChange={(e) => setSelectedCouponCode(e.target.value)}
                        style={{
                          width: '100%', padding: '12px', borderRadius: '8px', border: '1.5px solid #e5e2dd',
                          outline: 'none', fontSize: '13px', background: '#fff', appearance: 'none', cursor: 'pointer',
                          fontWeight: 600, color: '#1c1c19'
                        }}
                      >
                        <option value="">-- Tanpa Kupon --</option>
                        {availableCoupons.map((coupon) => (
                          <option key={coupon.id || coupon.code} value={coupon.code}>
                            {coupon.code} - {coupon.name || (coupon.type === 'percent' ? `Diskon ${coupon.value}%` : `Potongan ${formatPrice(coupon.value)}`)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} color="#9CA3AF" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>

                    {/* Validasi Otomatis (Real-time) */}
                    {selectedCouponCode && discountError && (
                       <p style={{ margin: '8px 0 0', fontSize: '11px', fontWeight: 700, color: '#DC2626' }}>
                         ! {discountError}
                       </p>
                    )}
                    {selectedCouponCode && !discountError && discountAmount > 0 && (
                      <p style={{ margin: '8px 0 0', fontSize: '12px', fontWeight: 700, color: '#0E5C37' }}>
                        ✓ Kupon aktif! Diskon: {formatPrice(discountAmount)}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', background: '#f0ede9', padding: '4px', borderRadius: '12px' }}>
                    {(['takeaway', 'dine-in'] as const).map(type => (
                      <button key={type} onClick={() => setOrderType(type)} style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none', fontSize: '13px', fontWeight: 700,
                        background: orderType === type ? '#fff' : 'transparent', color: orderType === type ? '#0E5C37' : '#9CA3AF',
                        boxShadow: orderType === type ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s', cursor: 'pointer'
                      }}>
                        {type === 'takeaway' ? 'Bungkus / Walk-in' : 'Makan di Tempat'}
                      </button>
                    ))}
                  </div>

                  {orderType === 'dine-in' && (
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="text" 
                        placeholder="Pilih atau ketik No Meja/Pager" 
                        value={tableDisplay} 
                        onChange={e => {
                          setTableDisplay(e.target.value);
                          setTableId(e.target.value); 
                        }} 
                        onFocus={() => setShowTableOptions(true)}
                        onBlur={() => setTimeout(() => setShowTableOptions(false), 200)}
                        style={{ width: '100%', padding: '14px', paddingRight: '40px', borderRadius: '12px', border: '1.5px solid #e5e2dd', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} 
                      />
                      <ChevronDown size={18} color="#9CA3AF" style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>

                    <AnimatePresence>
                      {showTableOptions && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                          style={{ 
                            position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', 
                            border: '1px solid #e5e2dd', borderRadius: '12px', marginTop: '4px', 
                            maxHeight: '180px', overflowY: 'auto', zIndex: 50, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                          }}
                        >
                          {tables.filter(t => t.table_name.toLowerCase().includes(tableDisplay.toLowerCase())).map(t => (
                            <div
                              key={t.id}
                              onClick={() => { 
                                setTableId(String(t.id));       
                                setTableDisplay(t.table_name); 
                                setShowTableOptions(false); 
                              }}
                              style={{ padding: '12px 14px', borderBottom: '1px solid #f0ede9', fontSize: '13px', fontWeight: 600, color: '#5a4b44', cursor: 'pointer' }}
                            >
                              {t.table_name}
                            </div>
                          ))}
                          
                          {tableDisplay && !tables.find(t => t.table_name === tableDisplay) && (
                            <div 
                              onClick={() => setShowTableOptions(false)}
                              style={{ padding: '12px 14px', fontSize: '13px', fontWeight: 700, color: '#0E5C37', cursor: 'pointer', background: '#ECFDF5' }}
                            >
                              Gunakan manual: "{tableDisplay}"
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                  <input type="text" placeholder="Nama Pelanggan (Opsional)" value={customerName} onChange={e => setCustomerName(e.target.value)} 
                    style={{ padding: '14px', borderRadius: '12px', border: '1.5px solid #e5e2dd', fontSize: '14px', outline: 'none', fontFamily: 'inherit' }} />

                  <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#9CA3AF', marginBottom: '8px' }}>Metode Pembayaran</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(['cash', 'qris'] as const).map(method => (
                      <button key={method} onClick={() => setPaymentMethod(method)} style={{
                        flex: 1, padding: '14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer',
                        border: `1.5px solid ${paymentMethod === method ? '#0E5C37' : '#e5e2dd'}`,
                        background: paymentMethod === method ? '#ECFDF5' : '#fff',
                        color: paymentMethod === method ? '#0E5C37' : '#5a4b44',
                      }}>
                        {method === 'cash' ? 'Tunai' : 'QRIS'}
                        {paymentMethod === method && <CheckCircle2 size={16} />}
                      </button>
                    ))}
                  </div>
                  
                  {paymentMethod === 'cash' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ marginTop: '16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 700, color: '#0E5C37', marginBottom: '8px' }}>Masukkan Nominal Uang Tunai</p>
                      <input 
                        type="number"
                        placeholder="Contoh: 50000"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1.5px solid #0E5C37', fontSize: '16px', fontWeight: 700, outline: 'none' }}
                      />
                      
                      {Number(cashAmount) >= total && (
                        <div style={{ marginTop: '12px', padding: '12px', background: '#ECFDF5', borderRadius: '10px', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#065F46' }}>Kembalian:</span>
                          <span style={{ fontSize: '14px', fontWeight: 800, color: '#065F46' }}>
                            {formatPrice(Number(cashAmount) - total)}
                          </span>
                        </div>
                      )}
                      {Number(cashAmount) > 0 && Number(cashAmount) < total && (
                        <p style={{ fontSize: '11px', color: '#DC2626', marginTop: '8px', fontWeight: 700 }}>
                          Uang kurang {formatPrice(total - Number(cashAmount))}
                        </p>
                      )}
                    </motion.div>
                  )}
                </div>
                </div>
              </div>

              <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #f0ede9', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#5a4b44' }}>
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>

                {pricing.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#DC2626' }}>
                    <span>Diskon</span>
                    <span>-{formatPrice(pricing.discount)}</span>
                  </div>
                )}

                {!isTaxIncluded && serviceCharge > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#5a4b44' }}>
                    <span>Service</span>
                    <span>{formatPrice(serviceCharge)}</span>
                  </div>
                )}

                {!isTaxIncluded && tax > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: '#5a4b44' }}>
                    <span>Pajak</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                )}

                {isTaxIncluded && (tax > 0 || serviceCharge > 0) && (
                  <p style={{ margin: '0 0 8px', fontSize: '10px', color: '#9CA3AF', textAlign: 'right' }}>
                    Harga sudah termasuk pajak dan service
                  </p>
                )}

                <button 
                  onClick={handleCheckout} 
                  disabled={isSubmitting}
                  style={{ width: '100%', padding: '16px', borderRadius: '16px', background: isSubmitting ? '#9CA3AF' : '#0E5C37', color: '#fff', border: 'none', fontSize: '15px', fontWeight: 800, cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    {isSubmitting ? 'Menyimpan...' : 'Selesaikan Pembayaran'}
                  </span>
                  <span>{formatPrice(total)}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* QRIS MODAL */}
      <AnimatePresence>
        {qrisData && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setQrisData(null)} 
              style={{ 
                position: 'fixed', inset: 0, background: 'rgba(28,28,25,0.7)', zIndex: 1000, 
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' 
              }}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()} 
                style={{ 
                  background: '#fff', borderRadius: '24px', padding: '24px', 
                  width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', 
                  alignItems: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
                  maxHeight: '90vh', overflowY: 'auto'
                }}
              >
                <div style={{ background: '#ECFDF5', color: '#0E5C37', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
                  <QrCode size={16} /> Scan QRIS Pelanggan
                </div>

                <div style={{ width: '100%', maxWidth: '280px', aspectRatio: '1/1', background: '#f0ede9', borderRadius: '16px', overflow: 'hidden', padding: '12px', border: '2px solid #0E5C37' }}>
                  <img src={qrisData.qrUrl} alt="QRIS Payment" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                <div style={{ textAlign: 'center', marginTop: '20px', width: '100%' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#9CA3AF' }}>Total Tagihan</p>
                  <p style={{ margin: '0 0 20px', fontSize: '22px', fontWeight: 800, color: '#1c1c19' }}>{formatPrice(total)}</p>

                  <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#0E5C37', fontSize: '13px', fontWeight: 700 }}>
                    <Loader2 className="animate-spin" size={16} />
                    Menunggu pembayaran...
                  </div>
                  
                  <p style={{ marginTop: '10px', fontSize: '11px', color: '#9CA3AF' }}>
                    Layar akan otomatis tertutup saat pembayaran terdeteksi.
                  </p>

                  <button 
                    onClick={closeQrisModal} 
                    style={{ width: '100%', padding: '14px', borderRadius: '14px', background: '#1c1c19', color: '#fff', border: 'none', fontSize: '14px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Tutup & Selesai
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}