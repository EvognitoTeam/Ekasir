import { useState, useEffect } from 'react';
import { Order } from '@/types/menu';
import { useMenuStore } from '@/store/menu.store';
import { formatPrice } from '@/utils/formatters';
import { 
  Printer, Banknote, Sparkles, Clock, User, ShoppingBag,
  Check, AlertCircle, CheckCircle2, Coffee, ChefHat, Edit3, XCircle,
  Trash2, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import Swal from 'sweetalert2';

interface Props {
  order: Order;
  onUpdateStatus: (id: string, status: Order['status'] | 'cancelled', paymentStatus?: Order['paymentStatus']) => void;
  onUpdateNote?: (id: string, note: string) => void;
  role?: 'cashier' | 'kitchen';
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

  /*
   * Fallback case-insensitive agar tetap terbaca ketika API
   * mengubah kapitalisasi nama properti.
   */
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

export default function OrderCard({ order, onUpdateStatus, onUpdateNote, role = 'cashier' }: Props) {
  const { items: menuItems } = useMenuStore();
  const [elapsed, setElapsed] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState(order.adminNotes || '');

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

  /*
   * Jenis layanan dan meja asal wajib dibaca secara independen.
   *
   * table_number/tableId tidak menentukan apakah pesanan dine-in
   * atau Takeaway. Pesanan Takeaway dari meja tetap mempunyai
   * table_number.
   */
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

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pw = window.open('', '_blank', 'width=300,height=500');
    if (!pw) return;
    
    const itemsHtml = (order.items || []).map(item => {
      const p = menuItems.find(m => String(m.id) === String(item.menuItemId));
      return `<div class="row"><span>${item.quantity || 1}x ${p?.name || 'Item'}</span></div>`;
    }).join('');

    const orderIdToPrint = order.order_code || order.id;

    const tableInfo = isTakeaway
      ? hasTable
        ? `TAKEAWAY - DARI: ${tableName}`
        : 'TAKEAWAY'
      : hasTable
        ? `MEJA: ${tableName}`
        : 'WALK-IN';

    const paymentStatusPrint = order.paymentStatus === '2' || order.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM BAYAR';

    pw.document.write(`<html><head><style>
      body{font-family:monospace;font-size:12px;margin:0;padding:16px;color:#000}
      .center{text-align:center}.bold{font-weight:bold}
      .border-b{border-bottom:1px dashed #000;margin-bottom:8px;padding-bottom:8px}
      .row{display:flex;justify-content:space-between;margin-bottom:4px}
    </style></head><body>
      <div class="center bold border-b">
        <h2 style="margin:0 0 4px 0">EKASIR</h2>
        <p style="margin:8px 0 0 0;font-size:14px">${tableInfo}</p>
        ${isTakeaway ? '<p style="margin:6px 0 0 0;padding:5px;border:2px solid #000;font-size:13px">BUNGKUS PESANAN</p>' : ''}
        <p style="margin:4px 0 0 0">Pesanan: #${orderIdToPrint}</p>
        ${order.customerName || order.name ? `<p style="margin:4px 0 0 0;font-weight:normal">Pelanggan: ${order.customerName || order.name}</p>` : ''}
        <p style="margin:4px 0 0 0;font-weight:normal;font-size:10px">${order.paymentMethod?.toUpperCase() || 'TUNAI'} - ${paymentStatusPrint}</p>
        ${order.adminNotes ? `<p style="margin:4px 0 0 0;font-weight:normal;font-size:10px;font-style:italic">Catatan Kasir: ${order.adminNotes}</p>` : ''}
      </div>
      <div class="border-b">${itemsHtml}</div>
      <div class="row bold"><span>TOTAL</span><span>Rp ${Number(order.totalPrice || order.total_price || 0).toLocaleString('id-ID')}</span></div>
      <p class="center" style="margin-top:24px">Terima Kasih!</p>
      <script>window.onload=()=>{window.print();window.close()}<\/script>
    </body></html>`);
    pw.document.close();
  };

  useEffect(() => {
    if (
      process.env.NODE_ENV !==
        'production' &&
      !manualTableInfo &&
      !serviceType
    ) {
      console.warn(
        '[ORDER_CARD_SERVICE_TYPE_MISSING]',
        {
          orderId:
            order.id,
          status:
            order.status,
          table_number:
            (order as any)
              ?.table_number,
          table_name:
            (order as any)
              ?.table_name,
          message:
            'API daftar order belum mengirim manual_table_info/service_type.',
        },
      );
    }
  }, [
    manualTableInfo,
    serviceType,
    order.id,
    order.status,
  ]);

  const paymentStatusUi = order.paymentStatus === '2' || order.paymentStatus === 'paid' ? 'LUNAS' : 'BLM BAYAR';
  const paymentMethodUi = order.paymentMethod || 'TUNAI';
  const displayId = order.order_code ? order.order_code.substring(0, 8) : order.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: `1.5px solid ${isUrgent ? '#FCA5A5' : cfg.border}`,
        boxShadow: isUrgent
          ? '0 0 0 3px rgba(252,165,165,0.25), 0 4px 24px rgba(28,28,25,0.07)'
          : '0 2px 16px rgba(28,28,25,0.06)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: order.status === 'cancelled' ? 0.7 : 1, 
      }}
    >
      <div style={{ height: '4px', background: isUrgent ? '#EF4444' : cfg.dot, borderRadius: '16px 16px 0 0' }} />

      <div style={{ padding: '12px 16px 10px', background: cfg.bg, borderBottom: `1px solid ${cfg.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {isTakeaway ? (
              <>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#DC2626',
                  color: '#fff',
                  border: '1px solid #B91C1C',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: 900,
                  fontFamily: 'var(--font-label)',
                  letterSpacing: '0.08em',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.2)',
                }}>
                  <ShoppingBag size={11} /> TAKEAWAY
                </span>

                {hasTable && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#FFFBEB',
                    color: '#92400E',
                    border: '1px solid #FCD34D',
                    padding: '3px 9px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 800,
                    fontFamily: 'var(--font-label)',
                    letterSpacing: '0.05em',
                  }}>
                    <Coffee size={10} />
                    DARI
                    <strong style={{ color: '#B45309', marginLeft: 1 }}>
                      {tableName}
                    </strong>
                  </span>
                )}
              </>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: '#f0ede9', color: '#1c1c19', border: '1px solid #d6c2bd',
                padding: '3px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-label)', letterSpacing: '0.06em'
              }}>
                <Coffee size={10} /> MEJA
                <strong style={{ color: '#0E5C37', marginLeft: 2 }}>
                  {hasTable ? tableName : 'WALK-IN'}
                </strong>
              </span>
            )}

            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
              padding: '3px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, fontFamily: 'var(--font-label)', letterSpacing: '0.04em'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
              {cfg.label}
            </span>
          </div>

          {order.status !== 'cancelled' && order.status !== 'completed' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              fontSize: '10px', fontWeight: 700, fontFamily: 'monospace',
              color: isUrgent ? '#DC2626' : '#9CA3AF',
              background: isUrgent ? '#FEF2F2' : 'transparent',
              padding: isUrgent ? '2px 7px' : '2px 0',
              borderRadius: '6px',
            }}>
              {isUrgent ? <AlertCircle size={11} /> : <Clock size={11} />}
              {elapsed}
            </div>
          )}
        </div>

        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#1c1c19', letterSpacing: '0.03em' }}>
            #{displayId}
          </span>
          {(order.customerName || order.name) && (
            <>
              <span style={{ color: '#d6c2bd', fontSize: '10px' }}>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', fontWeight: 600, color: '#5a4b44' }}>
                <User size={10} style={{ color: '#0E5C37' }} />
                {order.customerName || order.name}
              </span>
            </>
          )}
        </div>
      </div>

      {isTakeaway && (
        <div style={{
          background: '#FEF2F2',
          borderBottom: '1px solid #FCA5A5',
          padding: '9px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px',
          color: '#B91C1C',
        }}>
          <ShoppingBag size={14} />
          <span style={{
            fontSize: '10px',
            fontWeight: 900,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}>
            Bungkus pesanan atas nama: {order.customerName}
          </span>
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#ffffff', flex: 1 }}>
        {(order.items || []).map((cartItem, idx) => {
          const searchId = cartItem.menuItemId || String(cartItem.product_id);
          const product = menuItems.find(m => String(m.id) === searchId);
          if (!product) return null;

          const addons: string[] = [];
          let extractedCustNotes = '';
          
          let rawAddOnsDetails = cartItem.selectedAddOnsDetails;
          if (typeof rawAddOnsDetails === 'string') {
            try {
              rawAddOnsDetails = JSON.parse(rawAddOnsDetails);
            } catch (e) {
              console.error("Gagal memproses JSON addons:", e);
              rawAddOnsDetails = [];
            }
          }
          
          if (rawAddOnsDetails && Array.isArray(rawAddOnsDetails)) {
            rawAddOnsDetails.forEach((addonItem: any) => {
                if (addonItem && typeof addonItem === 'object') {
                  // 🟢 AMBIL CUST_NOTES: Jika ada di dalam baris objek JSON
                  if (addonItem.cust_notes) {
                      extractedCustNotes = addonItem.cust_notes;
                  }

                  const addonId = addonItem.id;
                  const fallbackName = addonItem.name;

                  let foundName = null;
                  if (addonId) {
                    product.categorizedAddons?.forEach((cat: any) => {
                        const found = cat.addons?.find((a: any) => Number(a.id) === Number(addonId));
                        if (found) foundName = found.name;
                    });
                  }

                  if (foundName) {
                      addons.push(foundName);
                  } else if (fallbackName) {
                      addons.push(fallbackName);
                  } else if (addonId) {
                      addons.push(`Ekstra #${addonId}`); 
                  }
              }
            });
          }

          return (
            <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{
                minWidth: '24px', height: '24px', borderRadius: '7px',
                background: '#f0ede9', border: '1px solid #e5e2dd',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 800, color: '#0E5C37', fontFamily: 'monospace'
              }}>
                {cartItem.quantity || 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#1c1c19', lineHeight: 1.3, margin: 0 }}>
                  {product.name}
                </p>
                {addons.length > 0 && (
                  <p style={{ fontSize: '11px', color: '#5a4b44', margin: '2px 0 0', lineHeight: 1.4 }}>
                    {addons.join(' · ')}
                  </p>
                )}
                {/* 🟢 RENDER BARU: Catatan Kustom Pelanggan dari dalam JSON */}
                {extractedCustNotes && (
                  <p style={{
                    fontSize: '11px', color: '#0369a1', background: '#f0f9ff',
                    border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '5px',
                    marginTop: '4px', fontStyle: 'italic', display: 'inline-block'
                  }}>
                    <i className="fas fa-comment-dots mr-1 text-[10px]"></i> &quot;{extractedCustNotes}&quot;
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {role === 'cashier' && order.status !== 'cancelled' && (
        <div style={{ padding: '0 16px 12px', background: '#ffffff' }}>
          {isEditingNote ? (
            <div style={{ display: 'flex', gap: '6px' }}>
              <input 
                type="text" 
                value={noteInput} 
                onChange={e => setNoteInput(e.target.value)}
                placeholder="Catatan kasir (misal: Split cash/Qris)"
                autoFocus
                style={{ 
                  flex: 1, padding: '8px 12px', borderRadius: '8px', 
                  border: '1.5px solid #0E5C37', fontSize: '12px', outline: 'none',
                  color: '#1c1c19'
                }}
                onKeyDown={e => { if (e.key === 'Enter') { onUpdateNote?.(String(order.id), noteInput); setIsEditingNote(false); } }}
              />
              <button 
                onClick={() => { onUpdateNote?.(String(order.id), noteInput); setIsEditingNote(false); }}
                style={{ 
                  padding: '8px 12px', borderRadius: '8px', background: '#0E5C37', 
                  color: '#fff', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' 
                }}>
                Simpan
              </button>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditingNote(true)}
              style={{ 
                padding: '8px 12px', borderRadius: '8px', background: order.admin_notes ? '#FFFBEB' : '#f6f3ee', 
                border: `1px dashed ${order.admin_notes ? '#FDE68A' : '#d6c2bd'}`,
                display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                color: order.admin_notes ? '#92400E' : '#9CA3AF', fontSize: '11px', transition: 'all 0.2s'
              }}>
              <Edit3 size={12} />
              <span style={{ flex: 1, fontStyle: order.admin_notes ? 'normal' : 'italic', fontWeight: order.admin_notes ? 600 : 400 }}>
                {order.admin_notes || '+ Tambah catatan kasir'}
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ borderTop: '1px solid #f0ede9', background: '#fafaf9' }}>
        <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0ede9' }}>
          <div>
            <p style={{ fontSize: '9px', color: '#9CA3AF', fontFamily: 'var(--font-label)', letterSpacing: '0.08em', margin: 0 }}>TOTAL BAYAR</p>
            <p style={{ fontSize: '15px', fontWeight: 800, color: '#0E5C37', margin: 0, letterSpacing: '-0.01em', textDecoration: order.status === 'cancelled' ? 'line-through' : 'none' }}>
              {formatPrice(Number(order.totalAfterDiscount || order.total_after_discount || 0))}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#5a4b44', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {paymentMethodUi}
            </span>
            <span style={{
              fontSize: '9px', fontWeight: 800, padding: '2px 7px', borderRadius: '5px', letterSpacing: '0.05em',
              background: paymentStatusUi === 'LUNAS' ? '#ECFDF5' : '#FEF2F2',
              color: paymentStatusUi === 'LUNAS' ? '#065F46' : '#991B1B',
              border: `1px solid ${paymentStatusUi === 'LUNAS' ? '#6EE7B7' : '#FCA5A5'}`
            }}>
              {paymentStatusUi}
            </span>
          </div>
        </div>

        <div style={{ padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handlePrint}
            title="Cetak Struk"
            style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: '#fff', border: '1.5px solid #e5e2dd',
              color: '#5a4b44', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
            }}
            onMouseOver={e => (e.currentTarget.style.background = '#f6f3ee')}
            onMouseOut={e => (e.currentTarget.style.background = '#fff')}
          >
            <Printer size={15} />
          </button>

          {role === 'cashier' && order.status == 'pending' && (
            <button
              onClick={() => {
                Swal.fire({
                  title: 'Batalkan Pesanan?',
                  text: `Pesanan #${displayId} akan dibatalkan permanen.`,
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonColor: '#DC2626',
                  cancelButtonColor: '#9CA3AF',
                  confirmButtonText: 'Ya, Batalkan!',
                  cancelButtonText: 'Kembali',
                  reverseButtons: true, 
                  customClass: {
                    popup: 'rounded-2xl',
                  }
                }).then((result) => {
                  if (result.isConfirmed) {
                    onUpdateStatus(String(order.id), 'cancelled' as any);
                    Swal.fire({
                      title: 'Dibatalkan!',
                      text: `Pesanan #${displayId} telah dibatalkan.`,
                      icon: 'success',
                      timer: 1500,
                      showConfirmButton: false
                    });
                  }
                });
              }}
              title="Batalkan Pesanan"
              style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: '#fff', border: '1.5px solid #FCA5A5',
                color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s',
              }}
              onMouseOver={e => (e.currentTarget.style.background = '#FEF2F2')}
              onMouseOut={e => (e.currentTarget.style.background = '#fff')}
            >
              <Trash2 size={15} />
            </button>
          )}

          <div style={{ flex: 1 }}>
            {role === 'owner' ? (
              <div style={{
                textAlign: 'center', padding: '10px', borderRadius: '10px',
                background: '#f6f3ee', border: '1px solid #e5e2dd',
                fontSize: '11px', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', fontFamily: 'var(--font-label)'
              }}>
                MODE PANTAU
              </div>
            ) : (
              <>
                {order.status === 'pending' && (
                  paymentMethodUi === 'cash' && paymentStatusUi !== 'LUNAS' ? (
                    <button
                      onClick={() => onUpdateStatus(String(order.id), 'confirmed', '2')} 
                      style={{
                        width: '100%', padding: '11px 16px', borderRadius: '10px',
                        // 🔴 LOGIKA DISABLE: Ubah background jika disabled
                        background: 'linear-gradient(135deg, #D97706, #B45309)',
                        color: '#fff', fontSize: '12px', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        border: 'none', cursor: 'pointer', letterSpacing: '0.02em',
                        boxShadow: '0 4px 14px rgba(180,83,9,0.3)',
                      }}
                    >
                      <Banknote size={15} /> Terima Tunai
                    </button>
                  ) : (
                    // 🔴 TOMBOL QRIS / CASH LUNAS (Cek apakah sudah bayar)
                    <button
                      onClick={() => onUpdateStatus(String(order.id), 'confirmed')}
                      // 🔴 Tambahkan disabled jika QRIS dan belum LUNAS
                      disabled={order.paymentMethod === 'qris' && paymentStatusUi !== 'LUNAS'}
                      style={{
                        width: '100%', padding: '11px 16px', borderRadius: '10px',
                        // 🔴 Style disabled
                        background: (order.paymentMethod === 'qris' && paymentStatusUi !== 'LUNAS') 
                            ? '#e5e2dd' 
                            : 'linear-gradient(135deg, #0E5C37, #065F46)',
                        color: (order.paymentMethod === 'qris' && paymentStatusUi !== 'LUNAS') 
                            ? '#9CA3AF' 
                            : '#fff',
                        fontSize: '12px', fontWeight: 800,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        border: 'none', cursor: (order.paymentMethod === 'qris' && paymentStatusUi !== 'LUNAS') ? 'not-allowed' : 'pointer', 
                        letterSpacing: '0.02em',
                        boxShadow: (order.paymentMethod === 'qris' && paymentStatusUi !== 'LUNAS') ? 'none' : '0 4px 14px rgba(14,92,55,0.3)',
                      }}
                    >
                      {order.paymentMethod === 'qris' && paymentStatusUi !== 'LUNAS' ? (
                        <> <Loader2 size={15} className="animate-spin" /> Menunggu Pembayaran...</>
                      ) : (
                        <> <CheckCircle2 size={15} /> Terima Pesanan </>
                      )}
                    </button>
                  )
                )}

                {order.status === 'confirmed' && (
                  <button disabled
                    style={{
                      width: '100%', padding: '11px 16px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #7C3AED, #6D28D9)',
                      color: '#fff', fontSize: '12px', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      border: 'none', cursor: 'not-allowed',
                      boxShadow: '0 4px 14px rgba(124,58,237,0.3)',
                    }}
                  >
                    <ChefHat size={15} /> (Hanya Kitchen yang bisa menggunakan tombol ini!!)
                  </button>
                )}

                {order.status === 'preparing' && (
                  <button
                    disabled
                    onClick={() => onUpdateStatus(String(order.id), 'ready')}
                    style={{
                      width: '100%', padding: '11px 16px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                      color: '#fff', fontSize: '12px', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      border: 'none', cursor: 'not-allowed',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                    }}
                  >
                    <Sparkles size={15} /> (Hanya Kitchen yang bisa menggunakan tombol ini!!)
                  </button>
                )}

                {order.status === 'ready' && (
                  <button
                    onClick={() => onUpdateStatus(String(order.id), 'completed')}
                    style={{
                      width: '100%', padding: '11px 16px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #1c1c19, #3a3a35)',
                      color: '#fff', fontSize: '12px', fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      border: 'none', cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(28,28,25,0.25)',
                    }}
                  >
                    <Check size={15} />
                    {isTakeaway ? 'Sudah Diambil' : 'Sudah Disajikan'}
                  </button>
                )}

                {order.status === 'completed' && (
                  <div style={{
                    width: '100%', padding: '11px 16px', borderRadius: '10px',
                    background: '#f0ede9', border: '1px solid #d6c2bd',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontSize: '12px', fontWeight: 700, color: '#9CA3AF',
                  }}>
                    <CheckCircle2 size={15} style={{ color: '#10B981' }} /> Selesai
                  </div>
                )}
                
                {order.status === 'cancelled' && (
                  <div style={{
                    width: '100%', padding: '11px 16px', borderRadius: '10px',
                    background: '#FEF2F2', border: '1px solid #FCA5A5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    fontSize: '12px', fontWeight: 700, color: '#991B1B',
                  }}>
                    <XCircle size={15} /> Pesanan Dibatalkan
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}