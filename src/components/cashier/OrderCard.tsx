import { useState, useEffect } from 'react';
import { Order } from '@/types/menu';
import { useMenuStore } from '@/store/menu.store';
import { formatPrice } from '@/utils/formatters';
import {
  Printer,
  Banknote,
  Sparkles,
  Clock,
  User,
  ShoppingBag,
  Check,
  AlertCircle,
  CheckCircle2,
  Coffee,
  ChefHat,
  Edit3,
  XCircle,
  Trash2,
  Loader2,
  Receipt,
  UtensilsCrossed,
  QrCode,
  PackageCheck,
  CircleDollarSign,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

interface Props {
  order: Order;
  onUpdateStatus: (id: string, status: Order['status'] | 'cancelled', paymentStatus?: Order['paymentStatus']) => void;
  onUpdateNote?: (id: string, note: string) => void;
  role?: 'cashier' | 'owner' | 'kitchen';
  onPrintOrder?: (
    order: Order,
    target: 'kitchen' | 'customer',
  ) => Promise<void> | void;
}

const normalizeOrderValue = (
  value: unknown,
): string => {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  return String(value)
    .trim()
    .toLowerCase();
};

const readOrderField = (
  order: Order,
  fieldNames: string[],
): unknown => {
  const rawOrder =
    order as unknown as Record<
      string,
      unknown
    >;

  for (const fieldName of fieldNames) {
    const directValue =
      rawOrder[fieldName];

    if (
      directValue !== null &&
      directValue !== undefined &&
      String(directValue).trim() !==
        ''
    ) {
      return directValue;
    }
  }

  const normalizedNames =
    new Set(
      fieldNames.map((name) =>
        name
          .replace(/_/g, '')
          .toLowerCase(),
      ),
    );

  for (
    const [key, value] of
    Object.entries(rawOrder)
  ) {
    const normalizedKey =
      key
        .replace(/_/g, '')
        .toLowerCase();

    if (
      normalizedNames.has(
        normalizedKey,
      ) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }

  return null;
};

const STATUS_CONFIG = {
  pending:   { label: 'Pesanan Baru',     color: '#B45309', bg: '#FEF3C7', border: '#FCD34D', dot: '#F59E0B' },
  confirmed: { label: 'Diterima',         color: '#1D4ED8', bg: '#EFF6FF', border: '#93C5FD', dot: '#3B82F6' },
  preparing: { label: 'Sedang Diracik',   color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', dot: '#8B5CF6' },
  ready:     { label: 'Siap Disajikan',   color: '#065F46', bg: '#ECFDF5', border: '#6EE7B7', dot: '#10B981' },
  completed: { label: 'Selesai',          color: '#5a4b44', bg: '#f6f3ee', border: '#d6c2bd', dot: '#9CA3AF' },
  cancelled: { label: 'Dibatalkan',       color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5', dot: '#EF4444' },
};

export default function OrderCard({
  order,
  onUpdateStatus,
  onUpdateNote,
  role = 'cashier',
  onPrintOrder,
}: Props) {
  const { items: menuItems } = useMenuStore();
  const [elapsed, setElapsed] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState(order.adminNotes || '');
  const [showPrintPopup, setShowPrintPopup] = useState(false);
  const [printingTarget, setPrintingTarget] =
    useState<'kitchen' | 'customer' | null>(null);

  useEffect(() => {
    const calc = () => {
      const orderDate = order.createdAt || Date.now();
      const diff = Math.floor((Date.now() - new Date(orderDate).getTime()) / 60000);
      if (diff < 1) setElapsed('Baru saja');
      else if (diff < 60) setElapsed(`${diff} mnt`);
      else setElapsed(`${Math.floor(diff / 60)}j ${diff % 60}m`);
      setIsUrgent(diff >= 15 && order.status === 'pending');
    };
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [order.createdAt, order.status]);

  const baseCfg =
    STATUS_CONFIG[
      order.status as keyof typeof STATUS_CONFIG
    ] ||
    STATUS_CONFIG.completed;

  const manualTableInfo =
    readOrderField(
      order,
      [
        'manualTableInfo',
        'manual_table_info',
        'manualInfo',
        'manual_info',
      ],
    );

  const serviceType =
    readOrderField(
      order,
      [
        'serviceType',
        'service_type',
        'orderType',
        'order_type',
        'fulfillmentType',
        'fulfillment_type',
      ],
    );

  const takeawayCandidates = [
    manualTableInfo,
    serviceType,
  ].map(normalizeOrderValue);

  const isTakeaway =
    takeawayCandidates.some(
      (value) =>
        value === 'takeaway' ||
        value === 'take away' ||
        value === 'bungkus',
    );

  const rawTableName =
    readOrderField(
      order,
      [
        'tableName',
        'table_name',
        'tableCode',
        'table_code',
        'tableId',
        'table_id',
        'tableNumber',
        'table_number',
      ],
    );

  const tableName =
    rawTableName !== null &&
    rawTableName !== undefined
      ? String(rawTableName)
          .trim()
          .replace(/^T-/i, '')
      : '';

  const normalizedTableName =
    normalizeOrderValue(
      tableName,
    );

  const hasTable =
    Boolean(tableName) &&
    normalizedTableName !==
      'null' &&
    normalizedTableName !==
      'undefined' &&
    normalizedTableName !==
      'walk-in' &&
    normalizedTableName !==
      'walk in';

  const cfg =
    order.status === 'ready' &&
    isTakeaway
      ? {
          ...baseCfg,
          label:
            'Siap Diambil',
        }
      : baseCfg;

  const handleOpenPrintPopup = (
    event:
      React.MouseEvent,
  ) => {
    event.stopPropagation();
    setShowPrintPopup(
      true
    );
  };

  const handlePrintTarget =
    async (
      target:
        'kitchen' |
        'customer',
    ) => {
      if (
        printingTarget
      ) {
        return;
      }

      setPrintingTarget(
        target
      );

      try {
        if (
          onPrintOrder
        ) {
          await onPrintOrder(
            order,
            target
          );
        } else {
          throw new Error(
            'Handler cetak belum dipasang pada halaman kasir.'
          );
        }

        setShowPrintPopup(
          false
        );
      } catch (
        error
      ) {
        console.error(
          'Gagal mencetak pesanan:',
          error
        );

        await Swal.fire({
          icon:
            'error',
          title:
            'Cetak gagal',
          text:
            error instanceof Error
              ? error.message
              : 'Printer tidak dapat mencetak pesanan.',
          confirmButtonColor:
            '#0E5C37',
        });
      } finally {
        setPrintingTarget(
          null
        );
      }
    };

  // LOGIKA STATUS PEMBAYARAN
  const rawPaymentStatus = String(
    readOrderField(order, ['paymentStatus', 'payment_status']) ?? '1',
  ).trim().toLowerCase();

  const paymentMethod = String(
    readOrderField(order, ['paymentMethod', 'payment_method']) ?? 'cash',
  ).trim().toLowerCase();

  let paymentStatusUi = 'BLM BAYAR';

  if (rawPaymentStatus === '2' || rawPaymentStatus === 'paid') {
    paymentStatusUi = 'LUNAS';
  } else if (rawPaymentStatus === '3' || rawPaymentStatus === 'expired') {
    paymentStatusUi = 'EXPIRED';
  } else if (rawPaymentStatus === '4' || rawPaymentStatus === 'failed') {
    paymentStatusUi = 'GAGAL';
  }

  // QRIS expired pada order pending dibatalkan otomatis, mengikuti logic lama.
  useEffect(() => {
    if (
      order.status === 'pending' &&
      paymentMethod === 'qris' &&
      paymentStatusUi === 'EXPIRED'
    ) {
      onUpdateStatus(String(order.id), 'cancelled');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status, paymentMethod, paymentStatusUi, order.id]);

  const paymentMethodUi = paymentMethod === 'qris' ? 'QRIS' : 'TUNAI';

  const displayId = order.order_code
    ? String(order.order_code).substring(0, 12)
    : String(order.id);

  const totalAmount = Number(
    readOrderField(order, [
      'totalAfterDiscount',
      'total_after_discount',
      'totalPrice',
      'total_price',
    ]) ?? 0,
  );

  const currentAdminNote = String(
    readOrderField(order, ['adminNotes', 'admin_notes']) ?? '',
  );

  const tone =
    order.status === 'pending'
      ? {
          strip: 'bg-amber-400',
          badge: 'bg-amber-50 text-amber-700 ring-amber-100',
        }
      : order.status === 'confirmed'
        ? {
            strip: 'bg-blue-500',
            badge: 'bg-blue-50 text-blue-700 ring-blue-100',
          }
        : order.status === 'preparing'
          ? {
              strip: 'bg-violet-500',
              badge: 'bg-violet-50 text-violet-700 ring-violet-100',
            }
          : order.status === 'ready'
            ? {
                strip: 'bg-emerald-500',
                badge: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
              }
            : order.status === 'cancelled'
              ? {
                  strip: 'bg-red-500',
                  badge: 'bg-red-50 text-red-700 ring-red-100',
                }
              : {
                  strip: 'bg-stone-400',
                  badge: 'bg-stone-100 text-stone-600 ring-stone-200',
                };

  const paymentTone =
    paymentStatusUi === 'LUNAS'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
      : paymentStatusUi === 'EXPIRED' || paymentStatusUi === 'GAGAL'
        ? 'bg-stone-100 text-stone-500 ring-stone-200'
        : 'bg-red-50 text-red-700 ring-red-100';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: order.status === 'cancelled' ? 0.58 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.985 }}
      transition={{ duration: 0.16 }}
      className={`relative overflow-hidden rounded-[18px] border bg-[#fffefa] shadow-[0_2px_10px_rgba(0,0,0,.04)] ${
        isUrgent
          ? 'border-red-300 ring-2 ring-red-100'
          : 'border-black/[0.09]'
      }`}
    >
      {/* PRINT MODAL */}
      {showPrintPopup && (
        <div
          onClick={(event) => {
            event.stopPropagation();
            setShowPrintPopup(false);
          }}
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-5"
        >
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
          >
            <header className="flex items-center justify-between gap-4 bg-[#11110f] p-5 text-white">
              <div>
                <p className="font-mono text-[8px] font-black uppercase tracking-[.14em] text-white/35">
                  Order #{displayId}
                </p>
                <h3 className="mt-1 text-xl font-black tracking-[-.04em]">
                  Print ticket
                </h3>
              </div>

              <button
                type="button"
                disabled={printingTarget !== null}
                onClick={() => setShowPrintPopup(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/60"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </header>

            <div className="grid gap-2 p-4">
              <button
                type="button"
                disabled={printingTarget !== null}
                onClick={() => void handlePrintTarget('kitchen')}
                className="flex min-h-[88px] items-center gap-4 rounded-[16px] border border-black/[0.08] bg-[#f5f5f1] p-4 text-left disabled:opacity-40"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                  {printingTarget === 'kitchen' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <UtensilsCrossed className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <p className="text-xs font-black">Kitchen Ticket</p>
                  <p className="mt-1 text-[8px] leading-4 text-black/35">
                    Tanpa harga. Fokus pada item, add-on, catatan, meja, dan tipe layanan.
                  </p>
                </div>
              </button>

              <button
                type="button"
                disabled={printingTarget !== null}
                onClick={() => void handlePrintTarget('customer')}
                className="flex min-h-[88px] items-center gap-4 rounded-[16px] border border-black/[0.08] bg-white p-4 text-left disabled:opacity-40"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ecece7] text-black">
                  {printingTarget === 'customer' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Receipt className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <p className="text-xs font-black">Customer Receipt</p>
                  <p className="mt-1 text-[8px] leading-4 text-black/35">
                    Struk lengkap dengan total dan informasi pembayaran.
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* TICKET HEADER */}
      <header className="bg-[#11110f] px-4 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[7px] font-black uppercase tracking-[.16em] text-white/30">
              Order ticket
            </p>
            <h2 className="mt-1 truncate font-mono text-2xl font-black tracking-[-.04em]">
              #{displayId}
            </h2>
          </div>

          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span
                className={`rounded-full px-2.5 py-1 text-[7px] font-black uppercase tracking-[.08em] ${tone.badge}`}
              >
                {cfg.label}
              </span>
            </div>

            {order.status !== 'cancelled' && order.status !== 'completed' && (
              <div
                className={`mt-2 inline-flex items-center gap-1.5 font-mono text-[8px] font-black ${
                  isUrgent ? 'text-red-300' : 'text-white/35'
                }`}
              >
                {isUrgent ? (
                  <AlertCircle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {elapsed}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
          {isTakeaway ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[.08em] text-red-700">
              <ShoppingBag className="h-3 w-3" />
              Takeaway
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[.08em] text-black">
              <Coffee className="h-3 w-3" />
              {hasTable ? `Meja ${tableName}` : 'Walk-in'}
            </span>
          )}

          {(order.customerName || order.name) && (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-[8px] font-bold text-white/45">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{order.customerName || order.name}</span>
            </span>
          )}
        </div>
      </header>

      {/* tear line */}
      <div className="relative h-3 bg-[#fffefa]">
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-black/15" />
        <div className="absolute -left-2 top-0 h-4 w-4 rounded-full bg-[#efefeb]" />
        <div className="absolute -right-2 top-0 h-4 w-4 rounded-full bg-[#efefeb]" />
      </div>

      {/* ITEMS */}
      <div className="px-4 pb-3">
        {(order.items || []).map((cartItem: any, index) => {
          const searchId = String(
            cartItem.menuItemId ??
              cartItem.menu_item_id ??
              cartItem.product_id ??
              cartItem.productId ??
              '',
          );

          const product = menuItems.find((menu) => String(menu.id) === searchId);

          const productName =
            product?.name ||
            cartItem.name ||
            cartItem.product_name ||
            `Item ${searchId || index + 1}`;

          const addons: string[] = [];
          let extractedCustomerNote = '';

          let rawAddOnsDetails =
            cartItem.selectedAddOnsDetails ??
            cartItem.selected_add_ons_details ??
            cartItem.notes;

          if (typeof rawAddOnsDetails === 'string') {
            try {
              rawAddOnsDetails = JSON.parse(rawAddOnsDetails);
            } catch {
              rawAddOnsDetails = [];
            }
          }

          if (Array.isArray(rawAddOnsDetails)) {
            rawAddOnsDetails.forEach((addonItem: any) => {
              if (!addonItem || typeof addonItem !== 'object') return;

              if (addonItem.cust_notes || addonItem.customer_note) {
                extractedCustomerNote = String(
                  addonItem.cust_notes || addonItem.customer_note,
                );
              }

              const addonId = addonItem.id;
              const fallbackName = addonItem.name;
              let foundName = '';

              if (addonId && product) {
                product.categorizedAddons?.forEach((category: any) => {
                  const found = category.addons?.find(
                    (addon: any) => Number(addon.id) === Number(addonId),
                  );

                  if (found) foundName = String(found.name);
                });
              }

              if (foundName) {
                addons.push(foundName);
              } else if (
                fallbackName &&
                !String(fallbackName).startsWith('Note:')
              ) {
                addons.push(String(fallbackName));
              }
            });
          }

          const quantity = Number(cartItem.quantity || 1);

          return (
            <div
              key={`${searchId}-${index}`}
              className={`${index > 0 ? 'border-t border-dashed border-black/10' : ''} py-3`}
            >
              <div className="flex items-start gap-3">
                <span className="min-w-7 font-mono text-[10px] font-black text-black">
                  {quantity}×
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black leading-4">{productName}</p>

                  {addons.length > 0 && (
                    <p className="mt-1 text-[8px] leading-4 text-black/40">
                      + {addons.join(' · ')}
                    </p>
                  )}

                  {extractedCustomerNote && (
                    <p className="mt-1.5 rounded-lg bg-blue-50 px-2 py-1.5 text-[8px] font-bold italic leading-4 text-blue-700">
                      “{extractedCustomerNote}”
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {(!order.items || order.items.length === 0) && (
          <div className="py-5 text-center text-[8px] font-bold uppercase tracking-[.08em] text-black/25">
            Detail item tidak tersedia
          </div>
        )}
      </div>

      {/* TAKEAWAY INFO */}
      {isTakeaway && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2.5 text-[8px] font-black uppercase tracking-[.08em] text-red-700">
          <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
          Ambil atas nama {order.customerName || order.name || 'Customer'}
        </div>
      )}

      {/* CASHIER NOTE */}
      {role === 'cashier' && order.status !== 'cancelled' && (
        <div className="border-t border-dashed border-black/12 px-4 py-3">
          {isEditingNote ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={noteInput}
                onChange={(event) => setNoteInput(event.target.value)}
                placeholder="Catatan internal..."
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onUpdateNote?.(String(order.id), noteInput);
                    setIsEditingNote(false);
                  }
                }}
                className="h-9 min-w-0 flex-1 rounded-xl border border-black/[0.12] bg-white px-3 text-[9px] font-semibold outline-none focus:border-black"
              />
              <button
                type="button"
                onClick={() => {
                  onUpdateNote?.(String(order.id), noteInput);
                  setIsEditingNote(false);
                }}
                className="h-9 rounded-xl bg-black px-3 text-[8px] font-black uppercase tracking-[.08em] text-white"
              >
                Simpan
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setNoteInput(currentAdminNote);
                setIsEditingNote(true);
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[8px] font-bold ${
                currentAdminNote
                  ? 'bg-amber-50 text-amber-800'
                  : 'bg-[#f2f2ee] text-black/30'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {currentAdminNote || 'Tambah catatan kasir'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* PAYMENT */}
      <div className="border-t border-dashed border-black/15 bg-[#f6f6f2] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[.08em] text-black/50 ring-1 ring-black/[0.06]">
              {paymentMethod === 'qris' ? (
                <QrCode className="h-3 w-3" />
              ) : (
                <Banknote className="h-3 w-3" />
              )}
              {paymentMethodUi}
            </span>

            <span
              className={`rounded-lg px-2.5 py-1.5 text-[7px] font-black uppercase tracking-[.08em] ring-1 ${paymentTone}`}
            >
              {paymentStatusUi === 'EXPIRED'
                ? 'Kedaluwarsa'
                : paymentStatusUi === 'BLM BAYAR'
                  ? 'Belum bayar'
                  : paymentStatusUi}
            </span>
          </div>

          <div className="text-right">
            <p className="text-[7px] font-black uppercase tracking-[.1em] text-black/25">
              Total
            </p>
            <p
              className={`mt-0.5 font-mono text-sm font-black ${
                order.status === 'cancelled' ? 'line-through text-black/30' : ''
              }`}
            >
              {formatPrice(totalAmount)}
            </p>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <footer className="flex items-center gap-2 border-t border-black/[0.07] bg-white p-3">
        <button
          type="button"
          onClick={handleOpenPrintPopup}
          title="Cetak"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white text-black/40 hover:bg-[#f2f2ee] hover:text-black"
        >
          <Printer className="h-4 w-4" />
        </button>

        {role === 'cashier' && order.status === 'pending' && (
          <button
            type="button"
            onClick={() => {
              void Swal.fire({
                title: 'Batalkan pesanan?',
                text: `Pesanan #${displayId} akan dibatalkan.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#111111',
                cancelButtonColor: '#e7e5e4',
                confirmButtonText: 'Batalkan Pesanan',
                cancelButtonText: 'Kembali',
                reverseButtons: true,
                customClass: {
                  popup: 'rounded-2xl',
                },
              }).then((result) => {
                if (result.isConfirmed) {
                  onUpdateStatus(String(order.id), 'cancelled' as any);
                }
              });
            }}
            title="Batalkan pesanan"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}

        <div className="min-w-0 flex-1">
          {role === 'owner' ? (
            <div className="flex h-11 items-center justify-center rounded-xl bg-[#ecece7] text-[8px] font-black uppercase tracking-[.1em] text-black/35">
              Mode Pantau
            </div>
          ) : (
            <>
              {order.status === 'pending' &&
                (paymentMethod === 'cash' && paymentStatusUi !== 'LUNAS' ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStatus(String(order.id), 'confirmed', '2')
                    }
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#11110f] px-4 text-[8px] font-black uppercase tracking-[.08em] text-white"
                  >
                    <Banknote className="h-4 w-4" />
                    Terima Tunai
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(String(order.id), 'confirmed')}
                    disabled={paymentMethod === 'qris' && paymentStatusUi !== 'LUNAS'}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#11110f] px-4 text-[8px] font-black uppercase tracking-[.08em] text-white disabled:cursor-not-allowed disabled:bg-[#e5e5df] disabled:text-black/30"
                  >
                    {paymentMethod === 'qris' && paymentStatusUi === 'EXPIRED' ? (
                      <>
                        <XCircle className="h-4 w-4" />
                        QRIS Expired
                      </>
                    ) : paymentMethod === 'qris' && paymentStatusUi !== 'LUNAS' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menunggu QRIS
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Terima Pesanan
                      </>
                    )}
                  </button>
                ))}

              {order.status === 'confirmed' && (
                <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 text-[8px] font-black uppercase tracking-[.08em] text-violet-700">
                  <ChefHat className="h-4 w-4" />
                  Menunggu Kitchen
                </div>
              )}

              {order.status === 'preparing' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(String(order.id), 'ready')}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[8px] font-black uppercase tracking-[.08em] text-white"
                >
                  <Sparkles className="h-4 w-4" />
                  Tandai Ready
                </button>
              )}

              {order.status === 'ready' && (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(String(order.id), 'completed')}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-[8px] font-black uppercase tracking-[.08em] text-white"
                >
                  <PackageCheck className="h-4 w-4" />
                  {isTakeaway ? 'Sudah Diambil' : 'Sudah Disajikan'}
                </button>
              )}

              {order.status === 'completed' && (
                <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-4 text-[8px] font-black uppercase tracking-[.08em] text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Selesai
                </div>
              )}

              {order.status === 'cancelled' && (
                <div className="flex h-11 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 text-[8px] font-black uppercase tracking-[.08em] text-red-700">
                  <XCircle className="h-4 w-4" />
                  Dibatalkan
                </div>
              )}
            </>
          )}
        </div>
      </footer>
    </motion.article>
  );
}
