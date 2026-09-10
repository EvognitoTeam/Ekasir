'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useParams } from 'next/navigation';
import Swal from 'sweetalert2';

import { useMenuStore } from '@/store/menu.store';
import type { Order } from '@/types/menu';
import { Toast } from '@/utils/toast';
import { formatPrice } from '@/utils/formatters';
import { PrinterManager } from '@/lib/printer/PrinterManager';
import type { PrinterDevice } from '@/lib/printer/types';
import { printOrder } from '@/lib/printer/orderPrint';

import {
  DEFAULT_PRINTER_SETTINGS,
  PRINTER_TEST_RECEIPT,
  type CashierPrinterSettings,
  type CashierRole,
  type CashierSessionSnapshot,
} from '../types';

type OrderCounts = {
  pending: number;
  kitchen: number;
  ready: number;
  history: number;
};

type CashierContextValue = {
  slug: string;
  isBooting: boolean;
  isAuthenticated: boolean;
  isVerifying: boolean;
  role: CashierRole;
  staffName: string;
  branchId: number | null;
  storeName: string;

  orders: Order[];
  orderCounts: OrderCounts;
  todayOrderCount: number;
  todayRevenue: number;
  notification: string | null;

  tables: any[];
  isLoadingTables: boolean;

  cashPaymentOrder: Order | null;
  receivedAmount: string;
  setReceivedAmount: (value: string) => void;
  closeCashPayment: () => void;
  confirmCashPayment: () => Promise<void>;

  showPrinterModal: boolean;
  setShowPrinterModal: (value: boolean) => void;
  printers: PrinterDevice[];
  savedPrinters: PrinterDevice[];
  selectedPrinter: PrinterDevice | null;
  printerSettings: CashierPrinterSettings;
  isScanningPrinter: boolean;
  scanningTransport: 'usb' | 'bluetooth' | null;
  isSavingPrinterSettings: boolean;
  isTestingPrinter: boolean;
  testPrintProgress: {
    phase: 'idle' | 'printing' | 'waiting';
    current: number;
    total: number;
    delayMs: number;
  };

  verifyStaffToken: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchOrders: () => Promise<void>;
  refreshMenu: () => Promise<void>;
  fetchTables: () => Promise<any[]>;
  updateOrderStatus: (
    orderId: string,
    status: Order['status'],
    paymentStatus?: Order['paymentStatus'],
  ) => Promise<void>;
  updateOrderNote: (orderId: string, note: string) => Promise<void>;
  handlePrintOrder: (order: Order, target: 'kitchen' | 'customer') => Promise<void>;
  handlePOSSubmit: (order: Order) => Promise<void>;

  updatePrinterSetting: <K extends keyof CashierPrinterSettings>(
    key: K,
    value: CashierPrinterSettings[K],
  ) => void;
  scanPrinter: (transport?: 'usb' | 'bluetooth') => Promise<void>;
  selectPrinter: (printer: PrinterDevice) => Promise<void>;
  saveSelectedPrinter: () => Promise<void>;
  removeSavedPrinter: (printer: PrinterDevice) => void;
  connectPrinter: () => Promise<void>;
  testPrint: () => Promise<void>;
  savePrinterSettings: () => Promise<void>;
  uploadPrinterLogo: (file: File) => Promise<void>;
};

const CashierContext = createContext<CashierContextValue | null>(null);

function toBranchId(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function orderPaymentMethod(order: Order): string {
  return String(
    (order as any).paymentMethod ??
      (order as any).payment_method ??
      '',
  )
    .trim()
    .toLowerCase();
}

function orderPaymentStatus(order: Order): string {
  return String(
    (order as any).paymentStatus ??
      (order as any).payment_status ??
      '1',
  );
}

function orderTotal(order: Order): number {
  return Number(
    (order as any).totalAfterDiscount ??
      (order as any).total_after_discount ??
      (order as any).totalPrice ??
      (order as any).total_price ??
      0,
  ) || 0;
}

function clampInteger(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(
    max,
    Math.max(
      min,
      Math.round(parsed),
    ),
  );
}

function normalizeCopies(value: unknown): number {
  return clampInteger(
    value,
    1,
    5,
    1,
  );
}

function normalizeCopyDelayMs(value: unknown): number {
  return clampInteger(
    value,
    0,
    15000,
    3000,
  );
}


/**
 * printOrder() / PrinterManager.testPrint() pada implementation lama
 * bisa saja resolve setelah bytes selesai dikirim ke transport,
 * bukan setelah mekanik printer benar-benar berhenti.
 *
 * Kalau PrinterManager implementation menyediakan idle/status ACK,
 * helper ini otomatis menggunakannya. Kalau tidak tersedia, titik
 * selesai yang dapat dipastikan dari frontend adalah setelah seluruh
 * command receipt (termasuk feed/cut) selesai di-await.
 */
/**
 * Menjalankan copies secara serial:
 *
 * copy #1
 * -> await seluruh print job
 * -> await printer idle/ACK jika didukung
 * -> BARU mulai copyDelayMs
 * -> copy #2
 *
 * Jadi delay tidak mulai ketika print pertama baru "dikirim".
 */
async function runSequentialCopies({
  copies,
  copyDelayMs,
  printer,
  slug,
  printSingleCopy,
  onCopyStart,
  onWaiting,
}: {
  copies: number;
  copyDelayMs: number;
  printer: PrinterDevice;
  slug: string;
  printSingleCopy: (copyNumber: number) => Promise<void>;
  onCopyStart?: (copyNumber: number, total: number) => void;
  onWaiting?: (
    completedCopy: number,
    total: number,
    delayMs: number,
  ) => void;
}): Promise<void> {
  for (
    let copyIndex = 0;
    copyIndex < copies;
    copyIndex += 1
  ) {
    const copyNumber =
      copyIndex + 1;

    onCopyStart?.(
      copyNumber,
      copies,
    );

    console.info(
      '[PRINTER_COPY_START]',
      {
        copyNumber,
        total:
          copies,
        at:
          new Date().toISOString(),
      },
    );

    /**
     * printSingleCopy() baru resolve setelah PrinterManager.printBytes()
     * menyelesaikan transport + conservative physical settle.
     */
    await printSingleCopy(
      copyNumber,
    );

    const hasNextCopy =
      copyNumber <
      copies;

    if (
      !hasNextCopy
    ) {
      continue;
    }

    onWaiting?.(
      copyNumber,
      copies,
      copyDelayMs,
    );

    /**
     * Penting:
     * delay tidak lagi dimiliki helper JS biasa.
     *
     * PrinterManager meng-anchor timer ke physicalCompletedAt milik
     * job sebelumnya. Jadi COPY # berikutnya tidak dapat masuk sebelum:
     *
     * previous physical complete + copyDelayMs
     */
    await PrinterManager.waitAfterPhysicalPrint(
      printer,
      slug,
      copyDelayMs,
    );
  }
}

function createPrinterTestOrder(): Order {
  const sample =
    PRINTER_TEST_RECEIPT;

  return {
    id:
      -999001 as any,

    order_code:
      sample.orderCode,

    orderCode:
      sample.orderCode,

    status:
      'completed',

    customerName:
      sample.customerName,

    name:
      sample.customerName,

    tableName:
      sample.tableName,

    table_name:
      sample.tableName,

    tableNumber:
      sample.tableName,

    table_number:
      sample.tableName,

    orderType:
      'dine-in',

    order_type:
      'dine-in',

    serviceType:
      'dine_in',

    service_type:
      'dine_in',

    paymentMethod:
      sample.paymentMethod,

    payment_method:
      sample.paymentMethod,

    paymentStatus:
      '2',

    payment_status:
      '2',

    totalPrice:
      sample.subtotal,

    total_price:
      sample.subtotal,

    discount:
      sample.discount,

    service:
      sample.service,

    tax:
      sample.tax,

    totalAfterDiscount:
      sample.total,

    total_after_discount:
      sample.total,

    getPayment:
      sample.cashReceived,

    get_payment:
      sample.cashReceived,

    cashChange:
      sample.change,

    cash_change:
      sample.change,

    createdAt:
      new Date(),

    created_at:
      new Date(),

    items: [
      {
        id:
          -999001,

        menuItemId:
          sample.item.productId,

        product_id:
          sample.item.productId,

        quantity:
          sample.item.quantity,

        price:
          sample.item.basePrice,

        cust_notes:
          sample.item.note,

        selectedAddOnsDetails: [
          {
            id:
              sample.item.addonId,

            name:
              sample.item.addonName,

            price:
              sample.item.addonPrice,

            cust_notes:
              sample.item.note,
          },
        ],
      } as any,
    ],
  } as any;
}

function createPrinterTestMenuItems(): any[] {
  const sample =
    PRINTER_TEST_RECEIPT;

  return [
    {
      id:
        sample.item.productId,

      name:
        sample.item.name,

      basePrice:
        sample.item.basePrice,

      price:
        sample.item.basePrice,

      categorizedAddons: [
        {
          addons: [
            {
              id:
                sample.item.addonId,

              name:
                sample.item.addonName,

              price:
                sample.item.addonPrice,
            },
          ],
        },
      ],
    },
  ];
}

export function CashierProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const slug = String(
    (params as any)?.mitraSlug ??
      (params as any)?.slug ??
      '',
  );

  const { setMenu } = useMenuStore();

  const [isBooting, setIsBooting] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [role, setRole] = useState<CashierRole>(null);
  const [staffName, setStaffName] = useState('');
  const [branchId, setBranchId] = useState<number | null>(null);
  const [storeName, setStoreName] = useState('Kasir');

  const [orders, setOrders] = useState<Order[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [tables, setTables] = useState<any[]>([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);

  const [cashPaymentOrder, setCashPaymentOrder] = useState<Order | null>(null);
  const [receivedAmount, setReceivedAmount] = useState('');

  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [savedPrinters, setSavedPrinters] = useState<PrinterDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<PrinterDevice | null>(null);
  const [printerSettings, setPrinterSettings] = useState<CashierPrinterSettings>(
    DEFAULT_PRINTER_SETTINGS,
  );
  const [isScanningPrinter, setIsScanningPrinter] = useState(false);
  const [scanningTransport, setScanningTransport] = useState<'usb' | 'bluetooth' | null>(null);
  const [isSavingPrinterSettings, setIsSavingPrinterSettings] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [testPrintProgress, setTestPrintProgress] = useState<{
    phase: 'idle' | 'printing' | 'waiting';
    current: number;
    total: number;
    delayMs: number;
  }>({
    phase: 'idle',
    current: 0,
    total: 0,
    delayMs: 0,
  });

  const sessionKey = useMemo(
    () => (slug ? `evo_cashier_session_${slug}` : ''),
    [slug],
  );

  const printerSettingsKey = useMemo(
    () => (slug ? `evo_printer_settings_${slug}` : ''),
    [slug],
  );

  const resetSession = useCallback(() => {
    if (sessionKey) localStorage.removeItem(sessionKey);
    setIsAuthenticated(false);
    setRole(null);
    setStaffName('');
    setBranchId(null);
    setOrders([]);
  }, [sessionKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    audioRef.current = new Audio('/notification.mp3');

    const unlock = () => {
      if (!audioRef.current) return;
      audioRef.current
        .play()
        .then(() => {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
        })
        .catch(() => {});

      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);

    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
  }, []);

  useEffect(() => {
    if (!slug) return;

    let reconnectController: ReturnType<typeof PrinterManager.startAutoReconnect> | null = null;

    try {
      if (printerSettingsKey) {
        const storedSettings = localStorage.getItem(printerSettingsKey);
        if (storedSettings) {
          const parsedSettings =
            JSON.parse(storedSettings) as Partial<CashierPrinterSettings>;

          setPrinterSettings({
            ...DEFAULT_PRINTER_SETTINGS,
            ...parsedSettings,
            copies:
              normalizeCopies(
                parsedSettings.copies,
              ),
            copyDelayMs:
              normalizeCopyDelayMs(
                parsedSettings.copyDelayMs,
              ),
          });
        }
      }

      const storedPrinters = PrinterManager.getPrinters(slug);
      const activePrinter = PrinterManager.getPrinter(slug);
      setSavedPrinters(storedPrinters);
      setPrinters(storedPrinters);
      setSelectedPrinter(activePrinter);
      reconnectController = PrinterManager.startAutoReconnect(slug, 15000);
    } catch (error) {
      console.error('[CASHIER_PRINTER_RESTORE_ERROR]', error);
    }

    return () => reconnectController?.stop();
  }, [printerSettingsKey, slug]);

  useEffect(() => {
    if (!slug) return;

    let disposed = false;

    const bootstrap = async () => {
      setIsBooting(true);

      try {
        const settingsResponse = await fetch(
          `/api/settings?slug=${encodeURIComponent(slug)}`,
          { cache: 'no-store', credentials: 'include' },
        );
        const settingsResult = await settingsResponse.json().catch(() => null);

        if (!disposed && settingsResult?.success) {
          setStoreName(String(settingsResult.data?.cafeName || 'Kasir'));
          const logo =
            settingsResult.data?.banner ||
            settingsResult.data?.logo ||
            settingsResult.data?.logoUrl;

          if (logo) {
            setPrinterSettings((current) => ({
              ...current,
              logoUrl: String(logo),
              showLogo: true,
            }));
          }
        }

        if (!sessionKey) return;

        const stored = localStorage.getItem(sessionKey);
        if (!stored) return;

        const parsed = JSON.parse(stored) as Partial<CashierSessionSnapshot>;
        if (!parsed.token) {
          localStorage.removeItem(sessionKey);
          return;
        }

        const response = await fetch('/api/pos/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: parsed.token, slug }),
        });
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          localStorage.removeItem(sessionKey);
          return;
        }

        const nextRole = String(result.data?.role || '').toLowerCase();
        if (nextRole !== 'cashier' && nextRole !== 'owner') {
          localStorage.removeItem(sessionKey);
          return;
        }

        if (disposed) return;

        const nextBranchId = toBranchId(result.data?.branchId);
        setStaffName(String(result.data?.name || parsed.name || ''));
        setRole(nextRole as 'cashier' | 'owner');
        setBranchId(nextBranchId);
        setIsAuthenticated(true);

        localStorage.setItem(
          sessionKey,
          JSON.stringify({
            token: parsed.token,
            name: String(result.data?.name || parsed.name || ''),
            role: nextRole,
            branchId: nextBranchId,
          } satisfies CashierSessionSnapshot),
        );
      } catch (error) {
        console.error('[CASHIER_BOOTSTRAP_ERROR]', error);
        if (sessionKey) localStorage.removeItem(sessionKey);
      } finally {
        if (!disposed) setIsBooting(false);
      }
    };

    void bootstrap();

    return () => {
      disposed = true;
    };
  }, [sessionKey, slug]);

  const verifyStaffToken = useCallback(
    async (token: string): Promise<boolean> => {
      const cleanToken = String(token || '').trim();
      if (!cleanToken || !slug || isVerifying) return false;

      setIsVerifying(true);

      try {
        const response = await fetch('/api/pos/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: cleanToken, slug }),
        });
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          Toast.fire({
            icon: 'error',
            title: result?.message || 'QR staff tidak valid',
            topLayer: true,
          });
          return false;
        }

        const nextRole = String(result.data?.role || '').toLowerCase();
        if (nextRole !== 'cashier' && nextRole !== 'owner') {
          Toast.fire({
            icon: 'error',
            title: 'Akses ditolak. Staff ini tidak memiliki akses kasir.',
            topLayer: true,
          });
          return false;
        }

        const nextBranchId = toBranchId(result.data?.branchId);
        const nextName = String(result.data?.name || 'Kasir');

        setRole(nextRole as 'cashier' | 'owner');
        setStaffName(nextName);
        setBranchId(nextBranchId);
        setIsAuthenticated(true);

        if (sessionKey) {
          localStorage.setItem(
            sessionKey,
            JSON.stringify({
              token: cleanToken,
              name: nextName,
              role: nextRole,
              branchId: nextBranchId,
            } satisfies CashierSessionSnapshot),
          );
        }

        Toast.fire({
          icon: 'success',
          title: `Selamat bekerja, ${nextName}!`,
          topLayer: true,
        });

        return true;
      } catch (error) {
        console.error('[CASHIER_VERIFY_ERROR]', error);
        Toast.fire({ icon: 'error', title: 'Gagal menghubungi server', topLayer: true });
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [isVerifying, sessionKey, slug],
  );

  const logout = useCallback(async () => {
    try {
      const raw = sessionKey ? localStorage.getItem(sessionKey) : null;
      const parsed = raw ? JSON.parse(raw) : null;

      if (parsed?.token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: parsed.token }),
        });
      }
    } catch (error) {
      console.error('[CASHIER_LOGOUT_ERROR]', error);
    } finally {
      resetSession();
    }
  }, [resetSession, sessionKey]);

  const refreshMenu = useCallback(async () => {
    if (!slug || !isAuthenticated) return;

    try {
      const query = new URLSearchParams({ slug });
      if (branchId) query.set('branch_id', String(branchId));

      const response = await fetch(`/api/menu?${query.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) return;

      const rawItems = Array.isArray(result.items) ? result.items : [];
      const categories = Array.isArray(result.categories) ? result.categories : [];
      const allAddons = Array.isArray(result.addons) ? result.addons : [];

      const enriched = rawItems.map((item: any) => ({
        ...item,
        categorizedAddons: [{ addons: allAddons }],
      }));

      setMenu(enriched, categories);
    } catch (error) {
      console.error('[CASHIER_MENU_FETCH_ERROR]', error);
    }
  }, [branchId, isAuthenticated, setMenu, slug]);

  useEffect(() => {
    void refreshMenu();
  }, [refreshMenu]);

  const fetchOrders = useCallback(async () => {
    if (!slug || !isAuthenticated) return;

    try {
      const response = await fetch(
        `/api/orders/history?slug=${encodeURIComponent(slug)}`,
        { cache: 'no-store', credentials: 'include' },
      );
      const result = await response.json().catch(() => null);

      if (response.status === 401 || response.status === 403) {
        resetSession();
        Toast.fire({
          icon: 'error',
          title: result?.message || 'Sesi kasir berakhir',
          topLayer: true,
        });
        return;
      }

      if (!response.ok || !result?.success || !Array.isArray(result.data)) return;

      setOrders((previous) => {
        if (previous.length > 0 && result.data.length > previous.length) {
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }

          setNotification('Pesanan baru masuk!');
          window.setTimeout(() => setNotification(null), 5000);
          Toast.fire({ icon: 'info', title: 'Ada pesanan baru!', topLayer: true });
        }

        return result.data;
      });
    } catch (error) {
      console.error('[CASHIER_ORDERS_FETCH_ERROR]', error);
    }
  }, [isAuthenticated, resetSession, slug]);

  useEffect(() => {
    if (!isAuthenticated) return;

    void fetchOrders();
    const timer = window.setInterval(fetchOrders, 5000);
    return () => window.clearInterval(timer);
  }, [fetchOrders, isAuthenticated]);

  const fetchTables = useCallback(async (): Promise<any[]> => {
    if (!slug || !isAuthenticated) return [];

    setIsLoadingTables(true);

    try {
      const query = new URLSearchParams({ slug });
      if (branchId) query.set('branch_id', String(branchId));

      const response = await fetch(`/api/pos/tables?${query.toString()}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Gagal mengambil daftar meja');
      }

      const next = Array.isArray(result.data) ? result.data : [];
      setTables(next);
      return next;
    } catch (error) {
      console.error('[CASHIER_TABLES_FETCH_ERROR]', error);
      Toast.fire({
        icon: 'error',
        title: error instanceof Error ? error.message : 'Gagal memuat daftar meja',
        topLayer: true,
      });
      return [];
    } finally {
      setIsLoadingTables(false);
    }
  }, [branchId, isAuthenticated, slug]);

  const executeUpdate = useCallback(
    async (
      orderId: string,
      newStatus: Order['status'],
      newPaymentStatus?: Order['paymentStatus'],
      extraData?: Record<string, unknown>,
    ): Promise<boolean> => {
      const previousOrder = orders.find((order) => String(order.id) === String(orderId));
      if (!previousOrder) return false;

      setOrders((current) =>
        current.map((order) =>
          String(order.id) === String(orderId)
            ? {
                ...order,
                status: newStatus,
                paymentStatus: newPaymentStatus ?? (order as any).paymentStatus,
                ...(extraData ?? {}),
              }
            : order,
        ),
      );

      try {
        const response = await fetch(
          `/api/orders/history?slug=${encodeURIComponent(slug)}`,
          {
            method: 'PUT',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: Number(orderId),
              status: newStatus,
              ...(newPaymentStatus !== undefined
                ? { paymentStatus: newPaymentStatus }
                : {}),
              ...(extraData ?? {}),
            }),
          },
        );
        const result = await response.json().catch(() => null);

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || `PUT gagal (${response.status})`);
        }

        await fetchOrders();
        return true;
      } catch (error) {
        console.error('[CASHIER_ORDER_UPDATE_ERROR]', error);
        setOrders((current) =>
          current.map((order) =>
            String(order.id) === String(orderId) ? previousOrder : order,
          ),
        );
        Toast.fire({
          icon: 'error',
          title: error instanceof Error ? error.message : 'Gagal memperbarui pesanan',
          topLayer: true,
        });
        return false;
      }
    },
    [fetchOrders, orders, slug],
  );

  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      newStatus: Order['status'],
      newPaymentStatus?: Order['paymentStatus'],
    ) => {
      const current = orders.find((order) => String(order.id) === String(orderId));
      if (!current) return;

      if (
        newStatus === 'confirmed' &&
        orderPaymentMethod(current) === 'cash' &&
        !(current as any).getPayment
      ) {
        setCashPaymentOrder(current);
        setReceivedAmount('');
        return;
      }

      if (newStatus === 'ready') {
        const rawTableId =
          (current as any).table_number ??
          (current as any).tableNumber ??
          (current as any).table_id ??
          (current as any).tableId;
        const tableId = Number(rawTableId ?? 0);
        const freshTables = await fetchTables();
        const table = freshTables.find((item) => Number(item.id) === tableId);
        const tableName = String(
          table?.table_name || table?.tableName || `Meja ${tableId || '-'}`,
        );
        const deviceOnline = Boolean(table?.iot_online);

        let soundPager = false;

        if (tableId > 0 && deviceOnline) {
          const result = await Swal.fire({
            icon: 'question',
            title: 'Tandai Siap Disajikan?',
            html: `<b>${tableName}</b><br><span style="font-size:13px;color:#78716c">Pilih apakah pager meja juga dibunyikan.</span>`,
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonColor: '#111111',
            denyButtonColor: '#57534E',
            cancelButtonColor: '#A8A29E',
            confirmButtonText: 'Ready + Bunyikan Pager',
            denyButtonText: 'Ready Tanpa Bunyi',
            cancelButtonText: 'Batal',
          });

          if (result.isDismissed) return;
          soundPager = result.isConfirmed;
        } else {
          const result = await Swal.fire({
            icon: 'info',
            title: 'Tandai Siap Disajikan?',
            text:
              tableId > 0
                ? `${tableName} tidak memiliki device IoT online. Order akan Ready tanpa pager.`
                : 'Order tidak terhubung ke meja fisik. Order akan Ready tanpa pager.',
            showCancelButton: true,
            confirmButtonColor: '#111111',
            cancelButtonColor: '#A8A29E',
            confirmButtonText: 'Ya, Tandai Ready',
            cancelButtonText: 'Batal',
          });

          if (!result.isConfirmed) return;
        }

        await executeUpdate(orderId, newStatus, newPaymentStatus, { soundPager });
        return;
      }

      await executeUpdate(orderId, newStatus, newPaymentStatus);
    },
    [executeUpdate, fetchTables, orders],
  );

  const closeCashPayment = useCallback(() => {
    setCashPaymentOrder(null);
    setReceivedAmount('');
  }, []);

  const confirmCashPayment = useCallback(async () => {
    if (!cashPaymentOrder) return;

    const total = orderTotal(cashPaymentOrder);
    const received = Number(receivedAmount.replace(/\D/g, ''));

    if (!Number.isFinite(received) || received < total) {
      Toast.fire({ icon: 'error', title: 'Nominal uang kurang!', topLayer: true });
      return;
    }

    const change = received - total;
    const success = await executeUpdate(
      String(cashPaymentOrder.id),
      'confirmed',
      '2' as Order['paymentStatus'],
      { getPayment: received, cashChange: change },
    );

    if (!success) return;

    Toast.fire({
      icon: 'success',
      title: `Lunas! Kembalian: ${formatPrice(change)}`,
      topLayer: true,
    });
    closeCashPayment();
  }, [cashPaymentOrder, closeCashPayment, executeUpdate, receivedAmount]);

  const updateOrderNote = useCallback(
    async (orderId: string, note: string) => {
      setOrders((current) =>
        current.map((order) =>
          String(order.id) === String(orderId)
            ? { ...order, adminNotes: note }
            : order,
        ),
      );

      try {
        await fetch(`/api/orders/history?slug=${encodeURIComponent(slug)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ orderId, adminNotes: note }),
        });
      } catch (error) {
        console.error('[CASHIER_ORDER_NOTE_ERROR]', error);
      }
    },
    [slug],
  );

  const handlePrintOrder = useCallback(
    async (
      order: Order,
      target: 'kitchen' | 'customer',
    ) => {
      const printer =
        PrinterManager.getPrinter(
          slug,
        );

      if (!printer) {
        throw new Error(
          'Printer aktif belum dipilih. Buka Printer terlebih dahulu.',
        );
      }

      const copies =
        normalizeCopies(
          printerSettings.copies,
        );

      const copyDelayMs =
        normalizeCopyDelayMs(
          printerSettings.copyDelayMs,
        );

      /**
       * Multi-copy dikontrol di CashierProvider.
       *
       * settings.copies sengaja dipaksa 1 saat masuk ke printOrder()
       * agar tidak terjadi double-copy kalau implementation printOrder
       * suatu saat juga membaca field copies.
       */
      const singleCopySettings:
        CashierPrinterSettings = {
          ...printerSettings,
          copies:
            1,
          copyDelayMs,
        };

      await runSequentialCopies({
        copies,
        copyDelayMs,
        printer,
        slug,

        printSingleCopy:
          async (
            copyNumber,
          ) => {
            try {
              /**
               * Physical print #1 = ORIGINAL, tanpa label COPY.
               * Physical print #2 = COPY #1.
               * Physical print #3 = COPY #2.
               * dan seterusnya.
               *
               * Kita prepend ke headerText supaya tidak perlu mengubah
               * engine orderPrint.ts yang sudah berjalan.
               */
              const copyLabel =
                copyNumber > 1
                  ? `COPY #${copyNumber - 1}`
                  : '';

              const settingsForThisCopy = {
                ...singleCopySettings,
                copyLabel,
              };

              await printOrder({
                order,
                target,
                printer,
                slug,
                storeName,
                cashierName:
                  staffName,
                menuItems:
                  useMenuStore.getState()
                    .items as any,
                settings:
                  settingsForThisCopy as any,
              });
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : 'Printer gagal mencetak.';

              throw new Error(
                `Gagal mencetak salinan ${copyNumber}/${copies}: ${message}`,
              );
            }
          },
      });

      Toast.fire({
        icon:
          'success',
        title:
          copies > 1
            ? target ===
                'kitchen'
              ? `${copies} salinan tiket dapur berhasil dicetak`
              : `${copies} salinan struk customer berhasil dicetak`
            : target ===
                'kitchen'
              ? 'Tiket dapur berhasil dicetak'
              : 'Struk customer berhasil dicetak',
        topLayer:
          true,
      });
    },
    [
      printerSettings,
      slug,
      staffName,
      storeName,
    ],
  );

  const handlePOSSubmit = useCallback(
    async (newOrder: Order) => {
      setOrders((previous) => {
        const exists = previous.some(
          (order) =>
            String(order.id) === String(newOrder.id) ||
            (Boolean((order as any).order_code) &&
              String((order as any).order_code) === String((newOrder as any).order_code)),
        );

        return exists
          ? previous.map((order) =>
              String(order.id) === String(newOrder.id) ||
              (Boolean((order as any).order_code) &&
                String((order as any).order_code) === String((newOrder as any).order_code))
                ? { ...order, ...newOrder }
                : order,
            )
          : [newOrder, ...previous];
      });

      try {
        if (printerSettings.autoPrint) {
          await handlePrintOrder(newOrder, 'customer');
        } else {
          Toast.fire({ icon: 'success', title: 'Pesanan berhasil dibuat', topLayer: true });
        }
      } catch (error) {
        console.error('[CASHIER_AUTO_PRINT_ERROR]', error);
        Toast.fire({
          icon: 'warning',
          title:
            error instanceof Error
              ? `Pesanan dibuat, tapi cetak gagal: ${error.message}`
              : 'Pesanan dibuat, tapi struk gagal dicetak',
          topLayer: true,
        });
      }
    },
    [handlePrintOrder, printerSettings.autoPrint],
  );

  const updatePrinterSetting = useCallback(
    <K extends keyof CashierPrinterSettings>(key: K, value: CashierPrinterSettings[K]) => {
      setPrinterSettings((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const scanPrinter = useCallback(async (transport?: 'usb' | 'bluetooth') => {
    setIsScanningPrinter(true);
    setScanningTransport(transport || null);

    try {
      const devices = transport
        ? await PrinterManager.scanByType(transport)
        : await PrinterManager.scan();

      setPrinters((current) => {
        const merged = [...current, ...devices];
        return Array.from(
          new Map(merged.map((printer) => [`${printer.type}:${printer.id}`, printer])).values(),
        );
      });

      if (devices.length === 0) {
        Toast.fire({
          icon: 'info',
          title:
            transport === 'usb'
              ? 'Printer USB belum ditemukan'
              : transport === 'bluetooth'
                ? 'Printer Bluetooth belum ditemukan'
                : 'Printer belum ditemukan',
          topLayer: true,
        });
      }
    } catch (error) {
      Toast.fire({
        icon: 'error',
        title: error instanceof Error ? error.message : 'Gagal mendeteksi printer',
        topLayer: true,
      });
    } finally {
      setIsScanningPrinter(false);
      setScanningTransport(null);
    }
  }, []);

  const selectPrinter = useCallback(
    async (printer: PrinterDevice) => {
      setSelectedPrinter(printer);
      await PrinterManager.setActivePrinter(printer, slug);
    },
    [slug],
  );

  const saveSelectedPrinter = useCallback(async () => {
    if (!selectedPrinter) {
      Toast.fire({ icon: 'error', title: 'Pilih printer terlebih dahulu', topLayer: true });
      return;
    }

    await PrinterManager.savePrinter(selectedPrinter, slug);
    await PrinterManager.setActivePrinter(selectedPrinter, slug);
    setSavedPrinters(PrinterManager.getPrinters(slug));
    Toast.fire({ icon: 'success', title: `${selectedPrinter.name} disimpan`, topLayer: true });
  }, [selectedPrinter, slug]);

  const removeSavedPrinter = useCallback(
    (printer: PrinterDevice) => {
      PrinterManager.removePrinter(printer, slug);
      const remaining = PrinterManager.getPrinters(slug);
      setSavedPrinters(remaining);
      setPrinters((current) =>
        current.filter((item) => !(item.id === printer.id && item.type === printer.type)),
      );

      if (selectedPrinter?.id === printer.id && selectedPrinter.type === printer.type) {
        setSelectedPrinter(PrinterManager.getPrinter(slug));
      }
    },
    [selectedPrinter, slug],
  );

  const connectPrinter = useCallback(async () => {
    if (!selectedPrinter) {
      Toast.fire({ icon: 'error', title: 'Pilih printer terlebih dahulu', topLayer: true });
      return;
    }

    try {
      await PrinterManager.savePrinter(selectedPrinter, slug);
      await PrinterManager.setActivePrinter(selectedPrinter, slug);
      setSavedPrinters(PrinterManager.getPrinters(slug));
      await PrinterManager.connect(selectedPrinter, slug);
      Toast.fire({ icon: 'success', title: `Terhubung ke ${selectedPrinter.name}`, topLayer: true });
    } catch (error) {
      Toast.fire({
        icon: 'error',
        title: error instanceof Error ? error.message : 'Gagal menghubungkan printer',
        topLayer: true,
      });
    }
  }, [selectedPrinter, slug]);

  const testPrint = useCallback(
    async () => {
      if (
        !selectedPrinter ||
        isTestingPrinter
      ) {
        if (
          !selectedPrinter
        ) {
          Toast.fire({
            icon:
              'error',
            title:
              'Pilih printer terlebih dahulu',
            topLayer:
              true,
          });
        }

        return;
      }

      const copies =
        normalizeCopies(
          printerSettings.copies,
        );

      const copyDelayMs =
        normalizeCopyDelayMs(
          printerSettings.copyDelayMs,
        );

      /**
       * Test print menggunakan data yang SAMA dengan live preview.
       * Tidak lagi memakai PrinterManager.testPrint() generic.
       */
      const testOrder =
        createPrinterTestOrder();

      const testMenuItems = [
        ...createPrinterTestMenuItems(),
        ...(
          useMenuStore.getState()
            .items as any[]
        ),
      ];

      const singleCopySettings:
        CashierPrinterSettings = {
          ...printerSettings,
          copies:
            1,
          copyDelayMs,
        };

      setIsTestingPrinter(
        true,
      );

      setTestPrintProgress({
        phase:
          'printing',
        current:
          1,
        total:
          copies,
        delayMs:
          copyDelayMs,
      });

      try {
        await PrinterManager.savePrinter(
          selectedPrinter,
          slug,
        );

        await PrinterManager.setActivePrinter(
          selectedPrinter,
          slug,
        );

        setSavedPrinters(
          PrinterManager.getPrinters(
            slug,
          ),
        );

        await runSequentialCopies({
          copies,
          copyDelayMs,
          printer:
            selectedPrinter,
          slug,

          onCopyStart: (
            current,
            total,
          ) => {
            setTestPrintProgress({
              phase:
                'printing',
              current,
              total,
              delayMs:
                copyDelayMs,
            });
          },

          onWaiting: (
            completedCopy,
            total,
            delayMs,
          ) => {
            setTestPrintProgress({
              phase:
                'waiting',
              current:
                completedCopy,
              total,
              delayMs,
            });
          },

          printSingleCopy:
            async (
              copyNumber,
            ) => {
              try {
                const copyLabel =
                  copyNumber > 1
                    ? `COPY #${copyNumber - 1}`
                    : '';

                const settingsForThisCopy = {
                  ...singleCopySettings,
                  copyLabel,
                };

                await printOrder({
                  order:
                    testOrder,
                  target:
                    'customer',
                  printer:
                    selectedPrinter,
                  slug,
                  storeName,
                  cashierName:
                    staffName,
                  menuItems:
                    testMenuItems,
                  settings:
                    settingsForThisCopy as any,
                });
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : 'Printer belum terhubung';

                throw new Error(
                  `Test print salinan ${copyNumber}/${copies} gagal: ${message}`,
                );
              }
            },
        });

        Toast.fire({
          icon:
            'success',
          title:
            copies > 1
              ? `Test receipt ${copies} salinan selesai`
              : 'Test receipt selesai',
          topLayer:
            true,
        });
      } catch (error) {
        Toast.fire({
          icon:
            'error',
          title:
            error instanceof Error
              ? error.message
              : 'Printer belum terhubung',
          topLayer:
            true,
        });
      } finally {
        setIsTestingPrinter(
          false,
        );

        setTestPrintProgress({
          phase:
            'idle',
          current:
            0,
          total:
            0,
          delayMs:
            0,
        });
      }
    },
    [
      isTestingPrinter,
      printerSettings,
      selectedPrinter,
      slug,
      staffName,
      storeName,
    ],
  );

  const savePrinterSettings = useCallback(async () => {
    if (!slug || !printerSettingsKey) return;
    setIsSavingPrinterSettings(true);

    try {
      const normalizedSettings: CashierPrinterSettings = {
        ...printerSettings,
        copies:
          normalizeCopies(
            printerSettings.copies,
          ),
        copyDelayMs:
          normalizeCopyDelayMs(
            printerSettings.copyDelayMs,
          ),
      };

      setPrinterSettings(
        normalizedSettings,
      );

      localStorage.setItem(
        printerSettingsKey,
        JSON.stringify(
          normalizedSettings,
        ),
      );

      if (selectedPrinter) {
        await PrinterManager.savePrinter(selectedPrinter, slug);
        await PrinterManager.setActivePrinter(selectedPrinter, slug);
        setSavedPrinters(PrinterManager.getPrinters(slug));
      }
      Toast.fire({ icon: 'success', title: 'Pengaturan printer disimpan', topLayer: true });
    } catch (error) {
      Toast.fire({ icon: 'error', title: 'Pengaturan printer gagal disimpan', topLayer: true });
    } finally {
      setIsSavingPrinterSettings(false);
    }
  }, [printerSettings, printerSettingsKey, selectedPrinter, slug]);

  const uploadPrinterLogo = useCallback(
    async (file: File) => {
      if (!slug) return;

      const allowed = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowed.includes(file.type)) {
        Toast.fire({ icon: 'error', title: 'Logo hanya boleh PNG, JPG, JPEG, atau WEBP', topLayer: true });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        Toast.fire({ icon: 'error', title: 'Ukuran logo maksimal 2 MB', topLayer: true });
        return;
      }

      const formData = new FormData();
      formData.append('slug', slug);
      formData.append('logo', file);

      const response = await fetch('/api/pos/printer-logo', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Logo gagal diunggah');
      }

      const logoUrl = String(result.data?.logoUrl || result.data?.banner || '');
      setPrinterSettings((current) => ({ ...current, logoUrl, showLogo: true }));
      Toast.fire({ icon: 'success', title: 'Logo printer berhasil disimpan', topLayer: true });
    },
    [slug],
  );

  const orderCounts = useMemo<OrderCounts>(
    () => ({
      pending: orders.filter((order) => order.status === 'pending').length,
      kitchen: orders.filter(
        (order) => order.status === 'confirmed' || order.status === 'preparing',
      ).length,
      ready: orders.filter((order) => order.status === 'ready').length,
      history: orders.filter(
        (order) => order.status === 'completed' || order.status === 'cancelled',
      ).length,
    }),
    [orders],
  );

  const todayOrders = useMemo(() => {
    const today = new Date().toDateString();
    return orders.filter((order) => {
      const raw = (order as any).createdAt || (order as any).created_at || 0;
      return new Date(raw).toDateString() === today;
    });
  }, [orders]);

  const todayRevenue = useMemo(
    () => todayOrders.reduce((total, order) => total + orderTotal(order), 0),
    [todayOrders],
  );

  const value = useMemo<CashierContextValue>(
    () => ({
      slug,
      isBooting,
      isAuthenticated,
      isVerifying,
      role,
      staffName,
      branchId,
      storeName,
      orders,
      orderCounts,
      todayOrderCount: todayOrders.length,
      todayRevenue,
      notification,
      tables,
      isLoadingTables,
      cashPaymentOrder,
      receivedAmount,
      setReceivedAmount,
      closeCashPayment,
      confirmCashPayment,
      showPrinterModal,
      setShowPrinterModal,
      printers,
      savedPrinters,
      selectedPrinter,
      printerSettings,
      isScanningPrinter,
      scanningTransport,
      isSavingPrinterSettings,
      isTestingPrinter,
      testPrintProgress,
      verifyStaffToken,
      logout,
      fetchOrders,
      refreshMenu,
      fetchTables,
      updateOrderStatus,
      updateOrderNote,
      handlePrintOrder,
      handlePOSSubmit,
      updatePrinterSetting,
      scanPrinter,
      selectPrinter,
      saveSelectedPrinter,
      removeSavedPrinter,
      connectPrinter,
      testPrint,
      savePrinterSettings,
      uploadPrinterLogo,
    }),
    [
      branchId,
      cashPaymentOrder,
      closeCashPayment,
      confirmCashPayment,
      connectPrinter,
      fetchOrders,
      fetchTables,
      handlePOSSubmit,
      handlePrintOrder,
      isAuthenticated,
      isBooting,
      isLoadingTables,
      isSavingPrinterSettings,
      isTestingPrinter,
      testPrintProgress,
      isScanningPrinter,
      isVerifying,
      logout,
      notification,
      orderCounts,
      orders,
      printerSettings,
      printers,
      receivedAmount,
      refreshMenu,
      removeSavedPrinter,
      role,
      savePrinterSettings,
      saveSelectedPrinter,
      savedPrinters,
      scanPrinter,
      scanningTransport,
      selectPrinter,
      selectedPrinter,
      showPrinterModal,
      slug,
      staffName,
      storeName,
      tables,
      testPrint,
      todayOrders.length,
      todayRevenue,
      updateOrderNote,
      updateOrderStatus,
      updatePrinterSetting,
      uploadPrinterLogo,
      verifyStaffToken,
    ],
  );

  return <CashierContext.Provider value={value}>{children}</CashierContext.Provider>;
}

export function useCashier() {
  const context = useContext(CashierContext);
  if (!context) {
    throw new Error('useCashier harus digunakan di dalam CashierProvider.');
  }
  return context;
}

export { orderPaymentMethod, orderPaymentStatus, orderTotal };
