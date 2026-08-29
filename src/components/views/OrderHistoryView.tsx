"use client";

import {
  useEffect,
  useState,
} from 'react';
import { useParams } from 'next/navigation';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import { useOrderStore } from '../../store/order.store';
import { useAuthStore } from '../../store/auth.store';
import { useMenuStore } from '../../store/menu.store';
import type { Order } from '../../types/menu';
import {
  History,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Coffee,
  ShoppingBag,
  Hash,
  Receipt,
  ChevronDown,
  Loader2,
  Timer,
} from 'lucide-react';

interface Props {
  onBackToMenu: () => void;
  onTrackOrder: () => void;
}

type HistoryStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | string;

type AddOnDetail = {
  id?: number | string;
  name?: string;
  price?: number | string;
  customer_note?: string;
  cust_notes?: string;
};

type HistoryItem = {
  id?: number | string;
  product_id?: number | string;
  menuItemId?: number | string;
  quantity?: number | string;
  price?: number | string;
  name?: string | null;
  menu_name?: string | null;
  selectedAddOnsDetails?: AddOnDetail[];
};

type HistoryOrder = {
  id: number | string;
  order_code?: string | null;

  status: HistoryStatus;

  created_at?: string | Date | null;
  createdAt?: string | Date | null;

  branch_id?: number | null;

  total_price?: number | string | null;
  totalPrice?: number | string | null;

  total_after_discount?: number | string | null;
  totalAfterDiscount?: number | string | null;

  discount?: number | string | null;
  discount_id?: number | string | null;
  discountId?: number | string | null;

  coupon_code?: string | null;
  couponCode?: string | null;

  tax?: number | string | null;
  service?: number | string | null;
  serviceCharge?: number | string | null;

  is_tax_included?: number | boolean | null;
  isTaxIncluded?: number | boolean | null;

  paymentStatus?: string | null;
  payment_status?: string | null;

  paymentMethod?: string | null;
  payment_method?: string | null;

  table_name?: string | null;
  tableName?: string | null;
  table_code?: string | null;
  tableCode?: string | null;
  table_number?: number | string | null;
  tableNumber?: number | string | null;

  manual_table_info?: string | null;
  manualTableInfo?: string | null;

  service_type?: string | null;
  serviceType?: string | null;
  order_type?: string | null;
  orderType?: string | null;

  items?: HistoryItem[];
};

type ApiPayload = {
  success?: boolean;
  message?: string;
  data?: HistoryOrder[];
  user?: {
    id?: number | string;
  };
  userId?: number | string;
  [key: string]: unknown;
};

const ACTIVE_STATUSES = new Set([
  'pending',
  'confirmed',
  'preparing',
  'ready',
]);

const PAST_STATUSES = new Set([
  'completed',
  'cancelled',
]);

const HISTORY_REFRESH_MS = 5000;

const toNumber = (
  value: unknown,
): number => {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const formatDate = (
  dateInput: unknown,
) => {
  if (!dateInput) {
    return 'Tanggal tidak tersedia';
  }

  try {
    const date = new Date(
      dateInput as string | number | Date,
    );

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return 'Format Tanggal Invalid';
    }

    return date.toLocaleDateString(
      'id-ID',
      {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      },
    );
  } catch {
    return 'Invalid Date';
  }
};

const formatIDR = (
  value: number,
) =>
  new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    },
  )
    .format(
      Number.isFinite(value)
        ? value
        : 0,
    )
    .replace(/\s/g, '');

const normalizeOrderText = (
  value: unknown,
): string =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const isTakeawayOrder = (
  order: HistoryOrder,
): boolean => {
  const candidates = [
    order.manual_table_info,
    order.manualTableInfo,
    order.service_type,
    order.serviceType,
    order.order_type,
    order.orderType,
  ].map(
    normalizeOrderText,
  );

  return candidates.some(
    (value) =>
      value === 'takeaway' ||
      value === 'take away' ||
      value === 'take_away' ||
      value === 'bungkus',
  );
};

const getOrderTableName = (
  order: HistoryOrder,
): string => {
  const value =
    order.table_name ||
    order.tableName ||
    order.table_code ||
    order.tableCode ||
    order.table_number ||
    order.tableNumber ||
    '';

  return String(value)
    .trim()
    .replace(
      /^T-/i,
      '',
    );
};

const getFinalTotal = (
  order: HistoryOrder,
): number => {
  const rawFinal =
    order.total_after_discount ??
    order.totalAfterDiscount;

  /**
   * Jangan memakai `> 0` sebagai penentu.
   *
   * Total final Rp0 adalah nilai valid jika transaksi
   * mendapat diskon penuh.
   */
  if (
    rawFinal !== null &&
    rawFinal !== undefined &&
    rawFinal !== ''
  ) {
    return Math.max(
      0,
      toNumber(
        rawFinal,
      ),
    );
  }

  return Math.max(
    0,
    toNumber(
      order.total_price ??
      order.totalPrice,
    ),
  );
};

const getItemQuantity = (
  item: HistoryItem,
): number =>
  Math.max(
    0,
    Math.floor(
      toNumber(
        item.quantity,
      ),
    ),
  );

const getItemUnitPrice = (
  item: HistoryItem,
): number =>
  Math.max(
    0,
    toNumber(
      item.price,
    ),
  );

const getAddonUnitTotal = (
  item: HistoryItem,
): number =>
  (
    Array.isArray(
      item.selectedAddOnsDetails,
    )
      ? item.selectedAddOnsDetails
      : []
  ).reduce(
    (
      sum,
      addon,
    ) =>
      sum +
      Math.max(
        0,
        toNumber(
          addon.price,
        ),
      ),
    0,
  );

const readJsonResponse = async (
  response: Response,
): Promise<ApiPayload> => {
  const raw =
    await response.text();

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(
      raw,
    ) as ApiPayload;
  } catch {
    /**
     * Mencegah error:
     *
     * JSON.parse: unexpected character...
     *
     * jika Next.js / proxy mengembalikan halaman HTML.
     */
    throw new Error(
      response.ok
        ? 'Respons server tidak valid.'
        : `Server mengembalikan HTTP ${response.status}.`,
    );
  }
};

const getStatusInfo = (
  status: HistoryStatus,
) => {
  switch (status) {
    case 'pending':
      return {
        title:
          'Waiting for Confirmation',
        desc:
          'Menunggu persetujuan kasir.',
        color:
          'text-amber-400',
      };

    case 'confirmed':
      return {
        title:
          'Order Confirmed',
        desc:
          'Pesanan sudah diterima dan menunggu dapur.',
        color:
          'text-blue-400',
      };

    case 'preparing':
      return {
        title:
          'In Preparation',
        desc:
          'Dapur sedang menyiapkan pesanan.',
        color:
          'text-emerald-400',
      };

    case 'ready':
      return {
        title:
          'Ready to Serve',
        desc:
          'Pesanan sudah siap dan menunggu diserahkan.',
        color:
          'text-lime-300',
      };

    default:
      return {
        title:
          'Processing',
        desc:
          'Pesanan sedang diproses.',
        color:
          'text-stone-400',
      };
  }
};

const getOrderPaymentStatus = (
  order: HistoryOrder,
): string =>
  normalizeOrderText(
    order.paymentStatus ??
    order.payment_status,
  );

const getDisplayStatusInfo = (
  order: HistoryOrder,
) => {
  const paymentStatus =
    getOrderPaymentStatus(
      order,
    );

  /**
   * payment_status:
   * 1 = pending / waiting payment
   * 2 = paid
   * 3 = failed / cancelled / expired
   * 4 = challenge
   *
   * Untuk customer, pending payment lebih penting
   * ditampilkan daripada lifecycle operasional order.
   */
  if (
    paymentStatus ===
    '1'
  ) {
    return {
      title:
        'Waiting for Payment',
      desc:
        'Menunggu pembayaran diselesaikan atau dikonfirmasi.',
      color:
        'text-amber-400',
      isWaitingPayment:
        true,
    };
  }

  const statusInfo =
    getStatusInfo(
      order.status,
    );

  return {
    ...statusInfo,
    isWaitingPayment:
      false,
  };
};

export default function OrderHistoryView({
  onBackToMenu,
  onTrackOrder,
}: Props) {
  const params =
    useParams<{
      mitraSlug?: string;
    }>();

  const slug =
    params?.mitraSlug ||
    '';

  const {
    userId,
    isLoggedIn,
    role,
  } = useAuthStore();

  const {
    items: menuItems,
  } = useMenuStore();

  const [
    historyData,
    setHistoryData,
  ] =
    useState<
      HistoryOrder[]
    >([]);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    historyError,
    setHistoryError,
  ] =
    useState<
      string | null
    >(null);

  const [
    expandedId,
    setExpandedId,
  ] =
    useState<
      string | null
    >(null);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<
      'active' | 'past'
    >('active');

  useEffect(() => {
    const controller =
      new AbortController();

    let disposed =
      false;

    /**
     * Flag ini sengaja lokal ke setiap instance useEffect.
     *
     * Jangan gunakan ref global komponen untuk guard fetch di sini,
     * karena React Strict Mode development menjalankan:
     *
     * effect -> cleanup -> effect
     *
     * dan effect kedua dapat melihat request milik effect pertama
     * masih dianggap berjalan.
     */
    let isFetching =
      false;

    type ResolvedIdentity = {
      userId: number | null;
      role: string;
    };

    let cachedIdentity:
      ResolvedIdentity | null =
        (
          Number(userId) > 0 &&
          normalizeOrderText(role)
        )
          ? {
              userId:
                Number(userId),
              role:
                normalizeOrderText(
                  role,
                ),
            }
          : null;

    /**
     * Resolve role dari server bila Zustand belum memilikinya.
     *
     * role memang tidak dipersist di localStorage pada auth.store,
     * sehingga setelah browser refresh nilainya dapat kembali null.
     */
    const resolveIdentity =
      async (): Promise<
        ResolvedIdentity | null
      > => {
        if (
          cachedIdentity
        ) {
          return cachedIdentity;
        }

        const authQuery =
          new URLSearchParams();

        if (slug) {
          authQuery.set(
            'slug',
            slug,
          );
        }

        const authResponse =
          await fetch(
            `/api/auth/me${
              authQuery.toString()
                ? `?${authQuery.toString()}`
                : ''
            }`,
            {
              credentials:
                'include',
              cache:
                'no-store',
              signal:
                controller.signal,
            },
          );

        const authResult =
          await readJsonResponse(
            authResponse,
          );

        if (
          !authResponse.ok ||
          !authResult.success
        ) {
          return null;
        }

        const authUser =
          authResult.user as
            | {
                id?:
                  number | string;
                role?:
                  string;
              }
            | undefined;

        const authData =
          authResult.data as
            | {
                user?: {
                  id?:
                    number | string;
                  role?:
                    string;
                };
                id?:
                  number | string;
                role?:
                  string;
              }
            | undefined;

        const rawUserId =
          authUser?.id ??
          authData?.user?.id ??
          authData?.id ??
          authResult.userId ??
          userId ??
          0;

        const rawRole =
          authUser?.role ??
          authData?.user?.role ??
          authData?.role ??
          (
            typeof authResult.role ===
              'string'
              ? authResult.role
              : ''
          ) ??
          role ??
          '';

        const resolvedUserId =
          Number(
            rawUserId,
          );

        const resolvedRole =
          normalizeOrderText(
            rawRole,
          );

        cachedIdentity = {
          userId:
            Number.isInteger(
              resolvedUserId,
            ) &&
            resolvedUserId > 0
              ? resolvedUserId
              : null,

          role:
            resolvedRole,
        };

        return cachedIdentity;
      };

    const fetchHistory =
      async (
        silent = false,
      ) => {
        if (
          isFetching
        ) {
          return;
        }

        isFetching =
          true;

        if (!silent) {
          setIsLoading(
            true,
          );
        }

        try {
          const identity =
            await resolveIdentity();

          if (!identity) {
            if (!disposed) {
              setHistoryData(
                [],
              );

              setHistoryError(
                'Silakan login untuk melihat riwayat pesanan.',
              );
            }

            return;
          }

          const normalizedRole =
            normalizeOrderText(
              identity.role,
            );

          const isPosStaff =
            normalizedRole ===
              'owner' ||
            normalizedRole ===
              'cashier' ||
            normalizedRole ===
              'kitchen';

          const isCustomer =
            normalizedRole ===
            'user';

          const historyQuery =
            new URLSearchParams();

          /**
           * ==================================================
           * OWNER / CASHIER / KITCHEN
           * ==================================================
           *
           * Staff tidak menggunakan userId karena userId mereka
           * adalah ID akun staff, bukan customer_id pada orders.
           *
           * Backend /api/orders/history?slug=...
           * kemudian menentukan:
           *
           * Owner:
           * seluruh order dalam mitra
           *
           * Cashier:
           * hanya branch session
           *
           * Kitchen:
           * hanya branch session
           */
          if (isPosStaff) {
            if (!slug) {
              throw new Error(
                'Slug toko tidak ditemukan untuk akun operasional.',
              );
            }

            historyQuery.set(
              'slug',
              slug,
            );
          }

          /**
           * ==================================================
           * CUSTOMER / USER
           * ==================================================
           *
           * Customer hanya dapat membaca history miliknya sendiri.
           */
          else if (
            isCustomer
          ) {
            if (
              !identity.userId
            ) {
              throw new Error(
                'Identitas customer tidak ditemukan.',
              );
            }

            historyQuery.set(
              'userId',
              String(
                identity.userId,
              ),
            );
          }

          else {
            throw new Error(
              'Role akun ini tidak memiliki akses ke riwayat pesanan.',
            );
          }

          const response =
            await fetch(
              `/api/orders/history?${historyQuery.toString()}`,
              {
                credentials:
                  'include',
                cache:
                  'no-store',
                signal:
                  controller.signal,
              },
            );

          const result =
            await readJsonResponse(
              response,
            );

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ||
              'Gagal mengambil riwayat pesanan.',
            );
          }

          if (!disposed) {
            setHistoryData(
              Array.isArray(
                result.data,
              )
                ? result.data
                : [],
            );

            setHistoryError(
              null,
            );

            /**
             * Aman juga untuk silent refresh.
             * Jika initial request sempat di-abort oleh Strict Mode,
             * request berikutnya tetap dapat menutup loading state.
             */
            setIsLoading(
              false,
            );
          }
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              'AbortError'
          ) {
            return;
          }

          console.error(
            'Gagal sinkronisasi riwayat:',
            error,
          );

          /**
           * Pada polling silent, pertahankan data lama.
           */
          if (
            !disposed &&
            !silent
          ) {
            setHistoryData(
              [],
            );

            setHistoryError(
              error instanceof
                Error
                ? error.message
                : 'Gagal mengambil riwayat pesanan.',
            );
          }
        } finally {
          isFetching =
            false;

          if (
            !disposed &&
            !silent
          ) {
            setIsLoading(
              false,
            );
          }
        }
      };

    void fetchHistory(
      false,
    );

    const intervalId =
      window.setInterval(
        () => {
          void fetchHistory(
            true,
          );
        },
        HISTORY_REFRESH_MS,
      );

    return () => {
      disposed =
        true;

      controller.abort();

      window.clearInterval(
        intervalId,
      );
    };
  }, [
    userId,
    isLoggedIn,
    role,
    slug,
  ]);

  const activeOrders =
    historyData.filter(
      (order) =>
        ACTIVE_STATUSES.has(
          normalizeOrderText(
            order.status,
          ),
        ),
    );

  const pastOrders =
    historyData.filter(
      (order) =>
        PAST_STATUSES.has(
          normalizeOrderText(
            order.status,
          ),
        ),
    );

  /**
   * Cancelled tidak dihitung sebagai spending.
   * Dengan flow backend baru, completed juga sudah harus paid.
   */
  const totalSpent =
    historyData.reduce(
      (
        sum,
        order,
      ) => {
        if (
          normalizeOrderText(
            order.status,
          ) !==
          'completed'
        ) {
          return sum;
        }

        return (
          sum +
          getFinalTotal(
            order,
          )
        );
      },
      0,
    );

  /**
   * "Items Ordered" berarti quantity,
   * bukan jumlah baris order_items.
   *
   * Cancelled tidak ikut dihitung.
   */
  const totalItemsCount =
    historyData.reduce(
      (
        orderSum,
        order,
      ) => {
        if (
          normalizeOrderText(
            order.status,
          ) ===
          'cancelled'
        ) {
          return orderSum;
        }

        return (
          orderSum +
          (
            order.items ??
            []
          ).reduce(
            (
              itemSum,
              item,
            ) =>
              itemSum +
              getItemQuantity(
                item,
              ),
            0,
          )
        );
      },
      0,
    );

  const toggleExpand = (
    id: number | string,
  ) => {
    const normalizedId =
      String(id);

    setExpandedId(
      (previous) =>
        previous ===
        normalizedId
          ? null
          : normalizedId,
    );
  };

  const resolveItemName = (
    item: HistoryItem,
  ) => {
    const directName =
      String(
        item.menu_name ??
        item.name ??
        '',
      ).trim();

    if (directName) {
      return directName;
    }

    const itemId =
      String(
        item.product_id ??
        item.menuItemId ??
        '',
      );

    return (
      menuItems.find(
        (menuItem) =>
          String(
            menuItem.id,
          ) ===
          itemId,
      )?.name ||
      (
        itemId
          ? `Product #${itemId}`
          : 'Product'
      )
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA]">
        <Loader2 className="w-10 h-10 text-[#0E5C37] animate-spin mb-4" />

        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest text-center px-6">
          Membuka Arsip Pengalaman Anda...
        </p>
      </div>
    );
  }

  if (
    historyError &&
    historyData.length ===
      0
  ) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] px-6 py-12">
        <div className="mx-auto flex max-w-md flex-col items-center rounded-[2rem] border border-amber-200 bg-white p-8 text-center shadow-sm">
          <History className="mb-5 h-10 w-10 text-amber-500" />

          <h2 className="mb-2 text-xl font-black text-stone-900">
            Riwayat belum tersedia
          </h2>

          <p className="mb-6 text-sm text-stone-500">
            {historyError}
          </p>

          <button
            type="button"
            onClick={
              onBackToMenu
            }
            className="rounded-full bg-[#0E5C37] px-7 py-3 text-[10px] font-bold uppercase tracking-widest text-white"
          >
            Kembali ke Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-6 bg-[#F7F8FA] min-h-full font-sans">
      <header className="mb-16">
        <motion.div
          initial={{
            opacity: 0,
            x: -20,
          }}
          animate={{
            opacity: 1,
            x: 0,
          }}
          className="flex items-center gap-4 mb-4"
        >
          <div className="w-12 h-[2px] bg-[#0E5C37]" />

          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#0E5C37]">
            The Discovery Ledger
          </span>
        </motion.div>

        <h1 className="text-5xl font-black tracking-tighter leading-none mb-10 text-stone-900">
          Experience Archive.
        </h1>

        <div className="grid grid-cols-2 gap-4">
          {[
            {
              label:
                'Orders Made',
              value:
                historyData
                  .filter(
                    (order) =>
                      normalizeOrderText(
                        order.status,
                      ) !==
                      'cancelled',
                  )
                  .length
                  .toString()
                  .padStart(
                    2,
                    '0',
                  ),
              icon:
                History,
            },
            {
              label:
                'Items Ordered',
              value:
                totalItemsCount
                  .toString()
                  .padStart(
                    2,
                    '0',
                  ),
              icon:
                Coffee,
            },
            {
              label:
                'Active Session',
              value:
                activeOrders
                  .length
                  .toString()
                  .padStart(
                    2,
                    '0',
                  ),
              icon:
                Clock,
            },
            {
              label:
                'Total Spent',
              value:
                `${(
                  totalSpent /
                  1000
                ).toFixed(
                  0,
                )}K`,
              icon:
                Receipt,
            },
          ].map(
            (stat) => (
              <div
                key={
                  stat.label
                }
                className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm flex flex-col gap-4"
              >
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-[#0E5C37]" />
                </div>

                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-stone-400 mb-1">
                    {stat.label}
                  </p>

                  <p className="text-2xl font-black text-stone-900 leading-none">
                    {stat.value}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>
      </header>

      <div className="flex bg-stone-200/50 p-1.5 rounded-2xl mb-10">
        <button
          type="button"
          onClick={() =>
            setActiveTab(
              'active',
            )
          }
          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
            activeTab ===
            'active'
              ? 'bg-white text-[#0E5C37] shadow-sm'
              : 'text-stone-400'
          }`}
        >
          Active Orders (
          {activeOrders.length}
          )
        </button>

        <button
          type="button"
          onClick={() =>
            setActiveTab(
              'past',
            )
          }
          className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
            activeTab ===
            'past'
              ? 'bg-white text-[#0E5C37] shadow-sm'
              : 'text-stone-400'
          }`}
        >
          Past Orders (
          {pastOrders.length}
          )
        </button>
      </div>

      <div className="space-y-10">
        <AnimatePresence mode="wait">
          {activeTab ===
          'active' ? (
            <motion.div
              key="active-tab"
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              className="space-y-6"
            >
              {activeOrders.length >
              0 ? (
                activeOrders.map(
                  (
                    activeOrder,
                  ) => {
                    const statusInfo =
                      getDisplayStatusInfo(
                        activeOrder,
                      );

                    const isTakeaway =
                      isTakeawayOrder(
                        activeOrder,
                      );

                    const tableName =
                      getOrderTableName(
                        activeOrder,
                      );

                    return (
                      <motion.div
                        key={
                          activeOrder.id
                        }
                        className="bg-stone-900 p-8 rounded-[2.5rem] flex flex-col gap-8 shadow-xl shadow-emerald-900/20 relative overflow-hidden text-white"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 opacity-10 -mr-8 -mt-8 rotate-12">
                          <Coffee className="w-full h-full" />
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full relative z-10">
                          <div className="w-16 h-16 bg-[#0E5C37] text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                            {statusInfo.isWaitingPayment ? (
                              <Timer className="w-7 h-7" />
                            ) : activeOrder.status ===
                              'pending' ? (
                              <Timer className="w-7 h-7" />
                            ) : activeOrder.status ===
                              'ready' ? (
                              <CheckCircle2 className="w-7 h-7" />
                            ) : (
                              <Clock className="w-7 h-7" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-2 bg-white/10 px-2 py-0.5 rounded-md w-fit">
                              <Hash className="w-3 h-3 text-emerald-400" />

                              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                                ID:{' '}
                                {activeOrder.order_code ||
                                  String(
                                    activeOrder.id,
                                  ).slice(
                                    -6,
                                  )}
                              </p>
                            </div>

                            <h2 className="text-2xl font-black mb-1">
                              {
                                statusInfo.title
                              }
                            </h2>

                            <p
                              className={`text-[10px] font-bold uppercase tracking-widest ${statusInfo.color}`}
                            >
                              {statusInfo.isWaitingPayment
                                ? 'waiting payment'
                                : activeOrder.status}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {isTakeaway && (
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-red-400/30 bg-red-500/15 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-red-300">
                                  <ShoppingBag className="h-3 w-3" />
                                  Takeaway
                                </span>
                              )}

                              {tableName && (
                                <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-300">
                                  <Coffee className="h-3 w-3" />
                                  {isTakeaway
                                    ? 'Dari'
                                    : 'Meja'}{' '}
                                  {
                                    tableName
                                  }
                                </span>
                              )}
                            </div>

                            <p className="mt-2 text-[11px] text-stone-400 font-medium">
                              {isTakeaway
                                ? tableName
                                  ? `Pesanan takeaway dari ${tableName}.`
                                  : 'Pesanan takeaway.'
                                : `Station ${tableName || 'Walk-in'}.`}{' '}
                              {
                                statusInfo.desc
                              }
                            </p>
                          </div>
                        </div>

                        <div className="w-full space-y-3 relative z-10 border-t border-white/5 pt-4">
                          {activeOrder.items?.map(
                            (
                              item,
                              index,
                            ) => (
                              <div
                                key={
                                  item.id ??
                                  `${activeOrder.id}-${index}`
                                }
                                className="flex flex-col gap-1"
                              >
                                <div className="flex justify-between text-xs">
                                  <span className="font-bold text-emerald-400">
                                    {getItemQuantity(
                                      item,
                                    )}
                                    x{' '}
                                    <span className="text-white">
                                      {resolveItemName(
                                        item,
                                      )}
                                    </span>
                                  </span>
                                </div>

                                {Array.isArray(
                                  item.selectedAddOnsDetails,
                                ) &&
                                  item.selectedAddOnsDetails.length >
                                    0 && (
                                    <div className="flex flex-wrap gap-2 pl-5">
                                      {item.selectedAddOnsDetails.map(
                                        (
                                          addon,
                                          addonIndex,
                                        ) => (
                                          <span
                                            key={
                                              addon.id ??
                                              `${addon.name ?? 'addon'}-${addonIndex}`
                                            }
                                            className="text-[10px] text-stone-500 bg-white/5 px-2 py-0.5 rounded-md"
                                          >
                                            +{' '}
                                            {addon.name ||
                                              'Add-on'}{' '}
                                            {toNumber(
                                              addon.price,
                                            ) >
                                            0
                                              ? `(${formatIDR(
                                                  toNumber(
                                                    addon.price,
                                                  ),
                                                )})`
                                              : ''}
                                          </span>
                                        ),
                                      )}
                                    </div>
                                  )}
                              </div>
                            ),
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            useOrderStore.setState(
                              {
                                currentOrder:
                                  {
                                    ...activeOrder,
                                    orderCode:
                                      activeOrder.order_code,
                                    tableId:
                                      activeOrder.table_number,
                                    items:
                                      activeOrder.items ||
                                      [],
                                  } as unknown as Order,
                              },
                            );

                            onTrackOrder();
                          }}
                          className="w-full bg-[#0E5C37] hover:bg-emerald-500 text-white flex items-center justify-between px-8 py-4 rounded-xl transition-all group relative z-10"
                        >
                          <span className="text-[9px] font-bold uppercase tracking-[0.2em]">
                            Observe
                            Progress
                          </span>

                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </motion.div>
                    );
                  },
                )
              ) : (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-stone-200">
                  <ShoppingBag className="w-10 h-10 text-stone-200 mx-auto mb-4" />

                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                    No Active Sessions
                  </p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="past-tab"
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              className="space-y-4"
            >
              {pastOrders.length >
              0 ? (
                pastOrders.map(
                  (order) => {
                    const isExpanded =
                      expandedId ===
                      String(
                        order.id,
                      );

                    const isCancelled =
                      normalizeOrderText(
                        order.status,
                      ) ===
                      'cancelled';

                    const isTakeaway =
                      isTakeawayOrder(
                        order,
                      );

                    const tableName =
                      getOrderTableName(
                        order,
                      );

                    const totalPrice =
                      Math.max(
                        0,
                        toNumber(
                          order.total_price ??
                          order.totalPrice,
                        ),
                      );

                    const finalPaid =
                      getFinalTotal(
                        order,
                      );

                    const discountValue =
                      Math.max(
                        0,
                        toNumber(
                          order.discount,
                        ),
                      );

                    const serviceValue =
                      Math.max(
                        0,
                        toNumber(
                          order.service ??
                          order.serviceCharge,
                        ),
                      );

                    const taxValue =
                      Math.max(
                        0,
                        toNumber(
                          order.tax,
                        ),
                      );

                    const taxIncluded =
                      order.is_tax_included ===
                        true ||
                      order.isTaxIncluded ===
                        true ||
                      Number(
                        order.is_tax_included ??
                        order.isTaxIncluded ??
                        0,
                      ) ===
                        1;

                    const couponCode =
                      String(
                        order.coupon_code ??
                        order.couponCode ??
                        '',
                      ).trim();

                    const hasDiscount =
                      discountValue >
                        0 ||
                      Boolean(
                        couponCode,
                      );

                    return (
                      <div
                        key={
                          order.id
                        }
                        className={`bg-white rounded-3xl border transition-all ${
                          isExpanded
                            ? isCancelled
                              ? 'border-red-200 shadow-md'
                              : 'border-[#0E5C37]/30 shadow-md'
                            : 'border-stone-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            toggleExpand(
                              order.id,
                            )
                          }
                          className="w-full p-6 flex items-center gap-4 text-left"
                        >
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                              isCancelled
                                ? 'bg-red-50 text-red-500'
                                : isExpanded
                                  ? 'bg-[#0E5C37] text-white'
                                  : 'bg-stone-50 text-stone-300'
                            }`}
                          >
                            {isCancelled ? (
                              <XCircle className="w-5 h-5" />
                            ) : (
                              <CheckCircle2 className="w-5 h-5" />
                            )}
                          </div>

                          <div className="flex-1">
                            <p className="text-[9px] font-bold text-stone-400 uppercase mb-0.5">
                              {formatDate(
                                order.created_at ??
                                order.createdAt,
                              )}
                            </p>

                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-black text-stone-900 uppercase">
                                #
                                {
                                  order.order_code
                                }
                              </h4>

                              <span
                                className={`rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-widest ${
                                  isCancelled
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-emerald-50 text-[#0E5C37]'
                                }`}
                              >
                                {
                                  order.status
                                }
                              </span>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {isTakeaway && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-red-700">
                                  <ShoppingBag className="h-3 w-3" />
                                  Takeaway
                                </span>
                              )}

                              {tableName && (
                                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-amber-700">
                                  <Coffee className="h-3 w-3" />
                                  {isTakeaway
                                    ? 'Dari'
                                    : 'Meja'}{' '}
                                  {
                                    tableName
                                  }
                                </span>
                              )}
                            </div>
                          </div>

                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                              isExpanded
                                ? 'rotate-180 bg-stone-100'
                                : ''
                            }`}
                          >
                            <ChevronDown className="w-4 h-4 text-stone-400" />
                          </div>
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{
                                height: 0,
                                opacity: 0,
                              }}
                              animate={{
                                height:
                                  'auto',
                                opacity: 1,
                              }}
                              exit={{
                                height: 0,
                                opacity: 0,
                              }}
                              className="overflow-hidden"
                            >
                              <div className="px-6 pb-6 pt-2 border-t border-stone-50">
                                <ul className="space-y-4 mb-4">
                                  {order.items?.map(
                                    (
                                      item,
                                      index,
                                    ) => {
                                      const quantity =
                                        getItemQuantity(
                                          item,
                                        );

                                      const unitPrice =
                                        getItemUnitPrice(
                                          item,
                                        );

                                      const addonUnitTotal =
                                        getAddonUnitTotal(
                                          item,
                                        );

                                      /**
                                       * Checkout menyimpan item.price sebagai:
                                       *
                                       * product price + addon price.
                                       *
                                       * Jadi base product price dapat diturunkan
                                       * dengan mengurangi addon unit total.
                                       */
                                      const productUnitPrice =
                                        Math.max(
                                          0,
                                          unitPrice -
                                            addonUnitTotal,
                                        );

                                      return (
                                        <li
                                          key={
                                            item.id ??
                                            `${order.id}-${index}`
                                          }
                                          className="flex flex-col gap-1.5"
                                        >
                                          <div className="flex justify-between items-start text-xs">
                                            <div className="flex gap-2">
                                              <span className="font-bold text-[#0E5C37]">
                                                {
                                                  quantity
                                                }
                                                x
                                              </span>

                                              <span className="text-stone-800 font-bold">
                                                {resolveItemName(
                                                  item,
                                                )}
                                              </span>
                                            </div>

                                            <span className="font-bold text-stone-900">
                                              {formatIDR(
                                                productUnitPrice *
                                                  quantity,
                                              )}
                                            </span>
                                          </div>

                                          {Array.isArray(
                                            item.selectedAddOnsDetails,
                                          ) &&
                                            item.selectedAddOnsDetails.length >
                                              0 && (
                                              <div className="flex flex-col gap-1 pl-6">
                                                {item.selectedAddOnsDetails.map(
                                                  (
                                                    addon,
                                                    addonIndex,
                                                  ) => {
                                                    const addonPrice =
                                                      Math.max(
                                                        0,
                                                        toNumber(
                                                          addon.price,
                                                        ),
                                                      );

                                                    return (
                                                      <p
                                                        key={
                                                          addon.id ??
                                                          `${addon.name ?? 'addon'}-${addonIndex}`
                                                        }
                                                        className="text-[10px] text-stone-400 flex justify-between"
                                                      >
                                                        <span>
                                                          +{' '}
                                                          {addon.name ||
                                                            'Add-on'}
                                                        </span>

                                                        {addonPrice >
                                                          0 && (
                                                          <span>
                                                            {formatIDR(
                                                              addonPrice *
                                                                quantity,
                                                            )}
                                                          </span>
                                                        )}
                                                      </p>
                                                    );
                                                  },
                                                )}
                                              </div>
                                            )}
                                        </li>
                                      );
                                    },
                                  )}
                                </ul>

                                <div className="pt-4 border-t border-dashed space-y-2">
                                  <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-bold uppercase text-stone-400">
                                      Subtotal
                                    </span>

                                    <span className="text-xs font-bold text-stone-700">
                                      {formatIDR(
                                        totalPrice,
                                      )}
                                    </span>
                                  </div>

                                  {hasDiscount && (
                                    <div className="flex justify-between items-center bg-emerald-50 px-3 py-2 rounded-lg">
                                      <div className="flex items-center gap-2">
                                        <Receipt className="w-3 h-3 text-[#0E5C37]" />

                                        <span className="text-[10px] font-bold text-[#0E5C37] uppercase tracking-tight">
                                          {couponCode
                                            ? `Coupon: ${couponCode}`
                                            : 'Discount'}
                                        </span>
                                      </div>

                                      <span className="text-[10px] font-bold text-[#0E5C37]">
                                        -
                                        {formatIDR(
                                          discountValue,
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {serviceValue >
                                    0 && (
                                    <div className="flex justify-between items-center px-1">
                                      <span className="text-[10px] font-bold uppercase text-stone-400">
                                        Service
                                        {taxIncluded
                                          ? ' (Included)'
                                          : ''}
                                      </span>

                                      <span className="text-xs font-bold text-stone-600">
                                        {formatIDR(
                                          serviceValue,
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  {taxValue >
                                    0 && (
                                    <div className="flex justify-between items-center px-1">
                                      <span className="text-[10px] font-bold uppercase text-stone-400">
                                        Tax
                                        {taxIncluded
                                          ? ' (Included)'
                                          : ''}
                                      </span>

                                      <span className="text-xs font-bold text-stone-600">
                                        {formatIDR(
                                          taxValue,
                                        )}
                                      </span>
                                    </div>
                                  )}

                                  <div className="flex justify-between items-center px-1 pt-1">
                                    <span className="text-[10px] font-bold uppercase text-stone-900">
                                      {isCancelled
                                        ? 'Order Total'
                                        : 'Total Paid'}
                                    </span>

                                    <span
                                      className={`text-sm font-black ${
                                        isCancelled
                                          ? 'text-red-500'
                                          : 'text-[#0E5C37]'
                                      }`}
                                    >
                                      {formatIDR(
                                        finalPaid,
                                      )}
                                    </span>
                                  </div>

                                  {isCancelled && (
                                    <p className="pt-2 text-[10px] leading-relaxed text-red-500">
                                      Pesanan ini dibatalkan dan tidak dihitung ke Total Spent.
                                    </p>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  },
                )
              ) : (
                <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-stone-200">
                  <ShoppingBag className="w-10 h-10 text-stone-200 mx-auto mb-4" />

                  <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                    No History Yet
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-20 text-center pb-10">
        <button
          type="button"
          onClick={
            onBackToMenu
          }
          className="px-10 py-4 bg-white border border-stone-200 rounded-full text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:text-[#0E5C37] transition-all active:scale-95 shadow-sm"
        >
          Return to Menu
        </button>
      </div>
    </div>
  );
}
