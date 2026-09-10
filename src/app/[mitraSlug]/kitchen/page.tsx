'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  useParams,
  useRouter,
} from 'next/navigation';

import {
  ArrowLeft,
  BellRing,
  Camera,
  ChefHat,
  CircleDot,
  Clock3,
  Flame,
  History,
  Loader2,
  QrCode,
  RefreshCw,
} from 'lucide-react';

import {
  AnimatePresence,
  motion,
} from 'framer-motion';

import {
  Scanner,
} from '@yudiel/react-qr-scanner';

import { Toast } from '@/utils/toast';
import KitchenTicket from '@/components/kitchen/KitchenTicket';
import type { Order } from '@/types/menu';

type VerifyTokenResponse = {
  success: boolean;
  message?: string;

  data?: {
    role?: string;
    name?: string;
  };
};

type AuthMeResponse = {
  success: boolean;
  message?: string;

  user?: {
    id?: number;
    name?: string;
    email?: string;
    role?: string;
  };
};

type KitchenOrdersResponse = {
  success: boolean;
  message?: string;
  data?: Order[];
};

type StoredKitchenSession = {
  name: string;
  token: string;
  authenticatedAt: string;
};

function parseStoredKitchenSession(
  raw: string | null,
): StoredKitchenSession | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      raw,
    ) as Partial<StoredKitchenSession>;

    if (
      typeof parsed.name !== 'string' ||
      typeof parsed.token !== 'string' ||
      typeof parsed.authenticatedAt !== 'string' ||
      !parsed.token.trim()
    ) {
      return null;
    }

    return {
      name: parsed.name,
      token: parsed.token,
      authenticatedAt: parsed.authenticatedAt,
    };
  } catch {
    return null;
  }
}

function getOrderTimestamp(
  order: Order,
): number {
  const raw =
    order.createdAt ??
    order.created_at ??
    0;

  const timestamp =
    new Date(raw).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : 0;
}

function formatDuration(
  milliseconds: number,
): string {
  if (
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  ) {
    return '00:00';
  }

  const totalMinutes =
    Math.floor(
      milliseconds / 60000,
    );

  const hours =
    Math.floor(
      totalMinutes / 60,
    );

  const minutes =
    totalMinutes % 60;

  if (hours > 0) {
    return `${String(hours).padStart(
      2,
      '0',
    )}:${String(minutes).padStart(
      2,
      '0',
    )}`;
  }

  const seconds =
    Math.floor(
      (milliseconds % 60000) /
        1000,
    );

  return `${String(minutes).padStart(
    2,
    '0',
  )}:${String(seconds).padStart(
    2,
    '0',
  )}`;
}

export default function KitchenDisplay() {
  const params = useParams();
  const router = useRouter();

  const slug =
    (params.mitraSlug as string | undefined) ??
    (params.slug as string | undefined) ??
    '';

  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  const physicalScannerBuffer =
    useRef('');

  const scannerTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const notificationTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const [isAuthenticated, setIsAuthenticated] =
    useState(false);

  const [isScanning, setIsScanning] =
    useState(false);

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [isLoggingOut, setIsLoggingOut] =
    useState(false);

  const [activeStaffName, setActiveStaffName] =
    useState('');

  const [activeTab, setActiveTab] = useState<
    'active' | 'history'
  >('active');

  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [isRefetching, setIsRefetching] =
    useState(false);

  const [notification, setNotification] =
    useState<string | null>(null);

  const [now, setNow] =
    useState(() => new Date());

  /*
   * Jam operasional pada header KDS.
   */
  useEffect(() => {
    const interval =
      window.setInterval(() => {
        setNow(new Date());
      }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /*
   * Audio notification
   */
  useEffect(() => {
    audioRef.current =
      new Audio('/notification.mp3');

    audioRef.current.preload = 'auto';

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  /*
   * Bersihkan timeout saat component dilepas.
   */
  useEffect(() => {
    return () => {
      if (scannerTimeoutRef.current) {
        clearTimeout(
          scannerTimeoutRef.current,
        );
      }

      if (notificationTimeoutRef.current) {
        clearTimeout(
          notificationTimeoutRef.current,
        );
      }
    };
  }, []);

  /*
   * Pulihkan sesi kitchen setelah refresh.
   * Token tetap diverifikasi kembali ke server.
   */
  useEffect(() => {
    if (!slug) {
      return;
    }

    let cancelled = false;

    async function restoreKitchenSession(): Promise<void> {
      setLoading(true);

      const storageKey =
        `evo_kitchen_session_${slug}`;

      const storedSession =
        parseStoredKitchenSession(
          localStorage.getItem(storageKey),
        );

      if (!storedSession) {
        if (!cancelled) {
          setIsAuthenticated(false);
          setActiveStaffName('');
          setOrders([]);
          setLoading(false);
        }

        return;
      }

      try {
        const response = await fetch(
          '/api/pos/verify-token',
          {
            method: 'POST',

            headers: {
              Accept: 'application/json',
              'Content-Type':
                'application/json',
            },

            credentials: 'include',
            cache: 'no-store',

            body: JSON.stringify({
              token: storedSession.token,
              slug,
              requiredRole: 'kitchen',
            }),
          },
        );

        const result =
          (await response.json()) as VerifyTokenResponse;

        if (cancelled) {
          return;
        }

        const role = String(
          result.data?.role ?? '',
        ).toLowerCase();

        if (
          response.ok &&
          result.success &&
          role === 'kitchen'
        ) {
          const staffName =
            result.data?.name ??
            storedSession.name ??
            'Kitchen';

          setActiveStaffName(staffName);
          setIsAuthenticated(true);

          localStorage.setItem(
            storageKey,
            JSON.stringify({
              name: staffName,
              token: storedSession.token,
              authenticatedAt:
                storedSession.authenticatedAt,
            }),
          );

          return;
        }

        localStorage.removeItem(storageKey);
        setIsAuthenticated(false);
        setActiveStaffName('');
        setOrders([]);
      } catch (error) {
        console.error(
          'Gagal memulihkan sesi kitchen:',
          error,
        );

        if (!cancelled) {
          setIsAuthenticated(false);
          setActiveStaffName('');
          setOrders([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void restoreKitchenSession();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  /*
   * Verifikasi token dari QR scanner.
   */
  const handleTokenScan = useCallback(
    async (token: string): Promise<void> => {
      const normalizedToken = token.trim();

      if (
        !normalizedToken ||
        isVerifying
      ) {
        return;
      }

      setIsVerifying(true);
      setIsScanning(false);

      try {
        const response = await fetch(
          '/api/pos/verify-token',
          {
            method: 'POST',

            headers: {
              Accept: 'application/json',
              'Content-Type':
                'application/json',
            },

            credentials: 'include',

            body: JSON.stringify({
              token: normalizedToken,
              slug,
            }),
          },
        );

        const result =
          (await response.json()) as VerifyTokenResponse;

        const role = String(
          result.data?.role ?? '',
        ).toLowerCase();

        if (
          response.ok &&
          result.success &&
          role === 'kitchen'
        ) {
          const staffName =
            result.data?.name ??
            'Kitchen';

          setActiveStaffName(staffName);
          setIsAuthenticated(true);

          /*
           * Local storage hanya menjadi metadata lokal.
           * Sumber autentikasi utama tetap cookie dari backend.
           */
          localStorage.setItem(
            `evo_kitchen_session_${slug}`,
            JSON.stringify({
              name: staffName,
              token: normalizedToken,
              authenticatedAt:
                new Date().toISOString(),
            }),
          );

          Toast.fire({
            icon: 'success',
            title: `Selamat datang, ${staffName}!`,
          });

          return;
        }

        Toast.fire({
          icon: 'error',
          title:
            result.message ??
            'Anda tidak memiliki akses ke dapur.',
        });
      } catch (error) {
        console.error(
          'Gagal memverifikasi token kitchen:',
          error,
        );

        Toast.fire({
          icon: 'error',
          title:
            'Gagal terhubung ke server.',
        });
      } finally {
        setIsVerifying(false);
      }
    },
    [
      isVerifying,
      slug,
    ],
  );

  /*
   * Logout kitchen.
   *
   * Tidak lagi memakai parentLogout karena page component
   * Next.js tidak menerima callback tersebut dari parent.
   */
  const handleLogout =
    useCallback(async (): Promise<void> => {
      if (isLoggingOut) {
        return;
      }

      setIsLoggingOut(true);

      try {
        localStorage.removeItem(
          `evo_kitchen_session_${slug}`,
        );

        const response = await fetch(
          '/api/auth/logout',
          {
            method: 'POST',

            headers: {
              Accept: 'application/json',
              'Content-Type':
                'application/json',
            },

            credentials: 'include',

            body: JSON.stringify({
              slug,
            }),
          },
        );

        if (!response.ok) {
          console.warn(
            'Endpoint logout mengembalikan status:',
            response.status,
          );
        }
      } catch (error) {
        /*
         * Tetap bersihkan state lokal meskipun API logout gagal.
         */
        console.error(
          'Gagal memanggil API logout:',
          error,
        );
      } finally {
        setIsAuthenticated(false);
        setActiveStaffName('');
        setOrders([]);
        setNotification(null);
        setIsScanning(false);
        setIsVerifying(false);
        setIsLoggingOut(false);

        /*
         * Tetap di halaman kitchen. Setelah state auth dihapus,
         * tampilan otomatis kembali ke scanner QR.
         */
        router.refresh();
      }
    }, [
      isLoggingOut,
      router,
      slug,
    ]);

  /*
   * Dukungan scanner QR fisik.
   */
  useEffect(() => {
    if (
      isAuthenticated ||
      isScanning ||
      isVerifying
    ) {
      return;
    }

    function resetScannerBuffer(): void {
      physicalScannerBuffer.current = '';

      if (scannerTimeoutRef.current) {
        clearTimeout(
          scannerTimeoutRef.current,
        );

        scannerTimeoutRef.current = null;
      }
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ): void {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement &&
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'Enter') {
        const token =
          physicalScannerBuffer.current.trim();

        resetScannerBuffer();

        if (token.length > 10) {
          void handleTokenScan(token);
        }

        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      physicalScannerBuffer.current +=
        event.key;

      if (scannerTimeoutRef.current) {
        clearTimeout(
          scannerTimeoutRef.current,
        );
      }

      /*
       * Scanner fisik biasanya mengetik sangat cepat.
       * Buffer dihapus jika tidak ada input lanjutan.
       */
      scannerTimeoutRef.current =
        setTimeout(() => {
          physicalScannerBuffer.current = '';
          scannerTimeoutRef.current = null;
        }, 1000);
    }

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );

      resetScannerBuffer();
    };
  }, [
    handleTokenScan,
    isAuthenticated,
    isScanning,
    isVerifying,
  ]);

  /*
   * Menampilkan notifikasi order baru.
   */
  const showOrderNotification =
    useCallback((message: string): void => {
      setNotification(message);

      if (notificationTimeoutRef.current) {
        clearTimeout(
          notificationTimeoutRef.current,
        );
      }

      notificationTimeoutRef.current =
        setTimeout(() => {
          setNotification(null);
          notificationTimeoutRef.current = null;
        }, 5000);

      audioRef.current
        ?.play()
        .catch((error) => {
          console.warn(
            'Pemutaran audio diblokir browser:',
            error,
          );
        });
    }, []);

  /*
   * Mengambil pesanan dapur.
   */
  const fetchOrders =
    useCallback(
      async (
        silent = false,
      ): Promise<void> => {
        if (
          !isAuthenticated ||
          !slug
        ) {
          return;
        }

        if (!silent) {
          setIsRefetching(true);
        }

        try {
          const response = await fetch(
            `/api/pos/kitchen/orders?slug=${encodeURIComponent(
              slug,
            )}`,
            {
              method: 'GET',

              headers: {
                Accept: 'application/json',
              },

              credentials: 'include',

              cache: 'no-store',
            },
          );

          const result =
            (await response.json()) as KitchenOrdersResponse;

          if (
            response.status === 401 ||
            response.status === 403
          ) {
            setIsAuthenticated(false);
            setActiveStaffName('');
            setOrders([]);

            localStorage.removeItem(
              `evo_kitchen_session_${slug}`,
            );

            setNotification(null);
            setIsScanning(false);
            setActiveTab('active');

            Toast.fire({
              icon: 'warning',
              title:
                'Sesi dapur berakhir. Silakan scan QR kembali.',
            });

            return;
          }

          if (
            !response.ok ||
            !result.success ||
            !Array.isArray(result.data)
          ) {
            throw new Error(
              result.message ??
                'Gagal mengambil pesanan dapur.',
            );
          }

          setOrders((previousOrders) => {
            const previousConfirmed =
              previousOrders.filter(
                (order) =>
                  order.status ===
                  'confirmed',
              ).length;

            const currentConfirmed =
              result.data!.filter(
                (order) =>
                  order.status ===
                  'confirmed',
              ).length;

            /*
             * Jangan bunyikan notifikasi pada initial fetch.
             */
            if (
              previousOrders.length > 0 &&
              currentConfirmed >
                previousConfirmed
            ) {
              showOrderNotification(
                'Pesanan baru masuk ke dapur!',
              );
            }

            return result.data!;
          });
        } catch (error) {
          console.error(
            'Gagal memuat pesanan dapur:',
            error,
          );

          if (!silent) {
            Toast.fire({
              icon: 'error',
              title:
                error instanceof Error
                  ? error.message
                  : 'Gagal mengambil pesanan dapur.',
            });
          }
        } finally {
          setLoading(false);
          setIsRefetching(false);
        }
      },
      [
        isAuthenticated,
        router,
        showOrderNotification,
        slug,
      ],
    );

  /*
   * Polling pesanan setiap tiga detik.
   */
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void fetchOrders();

    const interval =
      window.setInterval(() => {
        void fetchOrders(true);
      }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [
    fetchOrders,
    isAuthenticated,
  ]);

  /*
   * Memperbarui status order dengan optimistic update.
   */
  const executeUpdate =
    useCallback(
      async (
        orderId: string,
        newStatus: Order['status'],
      ): Promise<void> => {
        /*
         * Kitchen hanya boleh confirmed -> preparing.
         * Ready adalah aksi Cashier/front-of-house.
         *
         * Guard ini menjaga UI lama/KitchenTicket lama agar tidak
         * mengirim PUT ready walaupun tombolnya masih sempat terlihat.
         */
        if (
          newStatus !== 'preparing'
        ) {
          Toast.fire({
            icon: 'info',
            title:
              'Status Ready dilakukan dari Kasir.',
          });

          return;
        }

        const previousOrder =
          orders.find(
            (order) =>
              String(order.id) ===
              String(orderId),
          );

        if (!previousOrder) {
          Toast.fire({
            icon: 'error',
            title:
              'Pesanan tidak ditemukan.',
          });

          return;
        }

        /*
         * Optimistic update hanya untuk tiket yang dipilih.
         * Jika request gagal, rollback juga hanya tiket tersebut.
         */
        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            String(order.id) ===
            String(orderId)
              ? {
                  ...order,
                  status: newStatus,
                }
              : order,
          ),
        );

        try {
          console.log(
            '[KITCHEN_PUT_REQUEST]',
            {
              orderId,
              status:
                newStatus,
              slug,
            },
          );

          const response = await fetch(
            '/api/pos/kitchen/orders',
            {
              method: 'PUT',

              headers: {
                Accept:
                  'application/json',
                'Content-Type':
                  'application/json',
              },

              credentials:
                'include',

              cache:
                'no-store',

              body: JSON.stringify({
                orderId:
                  Number(orderId),
                status:
                  newStatus,
                slug,
              }),
            },
          );

          const result =
            (await response
              .json()
              .catch(() => null)) as {
                success?: boolean;
                message?: string;
                data?: {
                  orderId?: number;
                  previousStatus?: string;
                  status?: string;
                };
              } | null;

          console.log(
            '[KITCHEN_PUT_RESPONSE]',
            {
              httpStatus:
                response.status,
              ok:
                response.ok,
              result,
            },
          );

          if (
            !response.ok ||
            !result?.success
          ) {
            throw new Error(
              result?.message ??
                'Gagal memperbarui status pesanan.',
            );
          }

          /*
           * Ambil state authoritative dari DB.
           * Ini penting karena route juga mengisi preparingAt / readyAt
           * dan memicu IoT gateway setelah update berhasil.
           */
          await fetchOrders(true);
        } catch (error) {
          console.error(
            '[KITCHEN_PUT_ERROR]',
            error,
          );

          setOrders((currentOrders) =>
            currentOrders.map((order) =>
              String(order.id) ===
              String(orderId)
                ? previousOrder
                : order,
            ),
          );

          Toast.fire({
            icon: 'error',
            title:
              error instanceof Error
                ? error.message
                : 'Gagal memperbarui status pesanan.',
          });

          void fetchOrders(true);
        }
      },
      [
        fetchOrders,
        orders,
        slug,
      ],
    );

  const filteredOrders =
    useMemo(() => {
      return orders
        .filter((order) => {
          if (
            activeTab === 'active'
          ) {
            return (
              order.status ===
                'confirmed' ||
              order.status ===
                'preparing'
            );
          }

          return (
            order.status === 'ready' ||
            order.status ===
              'completed' ||
            order.status ===
              'cancelled'
          );
        })
        .sort((first, second) => {
          const firstDate =
            new Date(
              first.createdAt ??
                first.created_at ??
                0,
            ).getTime();

          const secondDate =
            new Date(
              second.createdAt ??
                second.created_at ??
                0,
            ).getTime();

          return activeTab ===
            'history'
            ? secondDate - firstDate
            : firstDate - secondDate;
        });
    }, [
      activeTab,
      orders,
    ]);

  const waitingOrders =
    useMemo(
      () =>
        orders
          .filter(
            (order) =>
              order.status ===
              'confirmed',
          )
          .sort(
            (first, second) =>
              getOrderTimestamp(first) -
              getOrderTimestamp(second),
          ),
      [orders],
    );

  const preparingOrders =
    useMemo(
      () =>
        orders
          .filter(
            (order) =>
              order.status ===
              'preparing',
          )
          .sort(
            (first, second) =>
              getOrderTimestamp(first) -
              getOrderTimestamp(second),
          ),
      [orders],
    );

  const activeOrderCount =
    waitingOrders.length +
    preparingOrders.length;

  const oldestActiveTimestamp =
    useMemo(() => {
      const timestamps = [
        ...waitingOrders,
        ...preparingOrders,
      ]
        .map(getOrderTimestamp)
        .filter(
          (timestamp) =>
            timestamp > 0,
        );

      return timestamps.length > 0
        ? Math.min(...timestamps)
        : 0;
    }, [
      preparingOrders,
      waitingOrders,
    ]);

  const oldestActiveDuration =
    oldestActiveTimestamp > 0
      ? formatDuration(
          now.getTime() -
            oldestActiveTimestamp,
        )
      : '--:--';

  const clockLabel =
    now.toLocaleTimeString(
      'id-ID',
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      },
    );

  const dateLabel =
    now.toLocaleDateString(
      'id-ID',
      {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      },
    );

  /*
   * Loading awal saat memeriksa cookie session.
   */
  if (
    loading &&
    !isAuthenticated
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] p-6 text-white">
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/5">
            <ChefHat className="h-9 w-9 text-white" />
          </div>

          <Loader2 className="mb-5 h-8 w-8 animate-spin text-white/70" />

          <p className="text-sm font-semibold text-white/55">
            Menyiapkan Kitchen Display
          </p>

          <p className="mt-2 text-xs text-white/30">
            Memeriksa sesi dan koneksi dapur...
          </p>
        </div>
      </div>
    );
  }

  /*
   * Halaman scanner login kitchen.
   */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0b0b] p-4 font-sans sm:p-6 lg:p-10">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[0.9fr_1.1fr]">
          <section className="flex flex-col justify-between bg-black p-7 text-white sm:p-10 lg:p-12">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-black">
                  <ChefHat className="h-6 w-6" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                    KALOO POS
                  </p>

                  <h1 className="mt-1 text-xl font-black">
                    Kitchen Display
                  </h1>
                </div>
              </div>

              <div className="mt-12 max-w-md">
                <p className="text-sm font-semibold text-white/45">
                  Stasiun operasional dapur
                </p>

                <h2 className="mt-4 text-4xl font-black leading-[1.05] tracking-[-0.04em] sm:text-5xl">
                  Fokus ke pesanan.
                  <br />
                  Bukan ke dashboard.
                </h2>

                <p className="mt-6 max-w-sm text-base leading-7 text-white/45">
                  Scan token staf Kitchen untuk membuka antrean pesanan secara realtime.
                </p>
              </div>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
                  Scanner fisik
                </p>
                <p className="mt-2 text-sm font-semibold text-white/80">
                  Langsung scan token
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/35">
                  Kamera
                </p>
                <p className="mt-2 text-sm font-semibold text-white/80">
                  Bisa digunakan dari browser
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center bg-[#f5f5f3] p-5 sm:p-8 lg:p-12">
            <motion.div
              initial={{
                opacity: 0,
                y: 16,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="w-full max-w-md rounded-[28px] border border-black/10 bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/35">
                    Akses Kitchen
                  </p>

                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-black">
                    Scan token staf
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-black/45">
                    Gunakan QR staf dengan role Kitchen untuk memulai shift.
                  </p>
                </div>

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-black text-white">
                  <QrCode className="h-6 w-6" />
                </div>
              </div>

              {isVerifying ? (
                <div className="mt-8 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-black/10 bg-[#f7f7f5]">
                  <Loader2 className="h-9 w-9 animate-spin text-black" />

                  <p className="mt-5 text-base font-bold text-black">
                    Memverifikasi akses
                  </p>

                  <p className="mt-2 text-sm text-black/40">
                    Tunggu sebentar...
                  </p>
                </div>
              ) : isScanning ? (
                <div className="relative mt-8 aspect-square w-full overflow-hidden rounded-3xl border-4 border-black bg-black">
                  <Scanner
                    onScan={(result) => {
                      const rawValue =
                        result?.[0]?.rawValue;

                      if (rawValue) {
                        void handleTokenScan(
                          rawValue,
                        );
                      }
                    }}
                    onError={(error) => {
                      console.error(
                        'QR scanner error:',
                        error,
                      );
                    }}
                    components={{
                      finder: false,
                    }}
                  />

                  <div className="pointer-events-none absolute inset-0 border-[36px] border-black/30">
                    <div className="h-full w-full rounded-2xl border-2 border-white/80" />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setIsScanning(false)
                    }
                    className="absolute bottom-5 left-1/2 z-20 min-h-11 -translate-x-1/2 rounded-full bg-white px-5 text-sm font-bold text-black shadow-xl transition hover:bg-stone-100"
                  >
                    Tutup Kamera
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setIsScanning(true)
                    }
                    className="mt-8 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-black px-5 text-base font-bold text-white transition hover:bg-black/85"
                  >
                    <Camera className="h-5 w-5" />

                    Buka Kamera & Scan QR
                  </button>

                  <div className="mt-4 rounded-2xl border border-black/10 bg-[#f7f7f5] p-4">
                    <p className="text-sm font-semibold leading-6 text-black/55">
                      Menggunakan scanner QR fisik? Tidak perlu menekan tombol apa pun — langsung scan token pada halaman ini.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </section>
        </div>
      </div>
    );
  }

  const renderTicket = (
    order: Order,
  ) => (
    <motion.div
      key={order.id}
      layout
      initial={{
        opacity: 0,
        y: 12,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        scale: 0.97,
      }}
      transition={{
        duration: 0.2,
      }}
      className="min-w-0"
    >
      <KitchenTicket
        order={order}
        onUpdateStatus={
          executeUpdate
        }
      />
    </motion.div>
  );

  return (
    <div className="h-screen w-full overflow-hidden bg-[#ecece8] font-sans text-black">
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{
                opacity: 0,
                y: -24,
                scale: 0.98,
              }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                y: -16,
              }}
              className="absolute left-1/2 top-5 z-[60] flex min-h-14 -translate-x-1/2 items-center gap-3 rounded-2xl bg-white px-5 text-sm font-black text-black shadow-2xl ring-1 ring-black/10 sm:px-6 sm:text-base"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black text-white">
                <BellRing className="h-5 w-5 animate-bounce" />
              </span>

              {notification}
            </motion.div>
          )}
        </AnimatePresence>

        <header className="z-30 shrink-0 bg-[#0b0b0b] text-white">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-black">
                <ChefHat className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">
                    KALOO Kitchen
                  </p>

                  <span className="hidden items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-300 sm:inline-flex">
                    <CircleDot className="h-3 w-3 fill-current" />
                    LIVE
                  </span>
                </div>

                <h1 className="mt-1 truncate text-lg font-black tracking-[-0.02em] sm:text-xl">
                  {activeStaffName}
                </h1>
              </div>
            </div>

            <div className="hidden items-center gap-8 lg:flex">
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/30">
                  {dateLabel}
                </p>

                <p className="mt-0.5 font-mono text-2xl font-black tracking-[-0.03em]">
                  {clockLabel}
                </p>
              </div>

              <div className="h-10 w-px bg-white/10" />

              <div className="min-w-28">
                <p className="text-xs font-semibold text-white/35">
                  Antrean aktif
                </p>

                <p className="mt-0.5 text-2xl font-black">
                  {activeOrderCount}
                </p>
              </div>

              <div className="min-w-28">
                <p className="text-xs font-semibold text-white/35">
                  Terlama
                </p>

                <p className="mt-0.5 font-mono text-2xl font-black">
                  {oldestActiveDuration}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void fetchOrders();
                }}
                disabled={isRefetching}
                aria-label="Muat ulang pesanan"
                title="Muat ulang pesanan"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <RefreshCw
                  className={`h-5 w-5 ${
                    isRefetching
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                disabled={isLoggingOut}
                aria-label="Logout dapur"
                title="Logout dapur"
                className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-3 text-sm font-bold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowLeft className="h-5 w-5" />
                )}

                <span className="hidden sm:inline">
                  Keluar
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5 border-t border-white/10 px-4 py-2.5 sm:hidden">
            <div>
              <p className="text-xs text-white/35">
                Jam
              </p>
              <p className="font-mono text-base font-black">
                {clockLabel}
              </p>
            </div>

            <div>
              <p className="text-xs text-white/35">
                Aktif
              </p>
              <p className="text-base font-black">
                {activeOrderCount}
              </p>
            </div>

            <div>
              <p className="text-xs text-white/35">
                Terlama
              </p>
              <p className="font-mono text-base font-black">
                {oldestActiveDuration}
              </p>
            </div>
          </div>
        </header>

        <section className="z-20 shrink-0 border-b border-black/10 bg-white">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f1f1ee] p-1.5 sm:inline-grid sm:w-auto">
              <button
                type="button"
                onClick={() =>
                  setActiveTab('active')
                }
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${
                  activeTab === 'active'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-black/45 hover:text-black'
                }`}
              >
                <Flame className="h-4 w-4" />
                Pesanan Aktif
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-black ${
                    activeTab === 'active'
                      ? 'bg-white/15 text-white'
                      : 'bg-black/5 text-black/45'
                  }`}
                >
                  {activeOrderCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveTab('history')
                }
                className={`flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${
                  activeTab === 'history'
                    ? 'bg-black text-white shadow-sm'
                    : 'text-black/45 hover:text-black'
                }`}
              >
                <History className="h-4 w-4" />
                Riwayat
              </button>
            </div>

            {activeTab === 'active' && (
              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                <div className="flex min-h-11 items-center gap-3 rounded-xl border border-black/10 bg-[#fafaf8] px-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-black/55">
                      Menunggu
                    </span>
                    <strong className="text-lg font-black text-black">
                      {waitingOrders.length}
                    </strong>
                  </div>
                </div>

                <div className="flex min-h-11 items-center gap-3 rounded-xl border border-black/10 bg-[#fafaf8] px-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-black" />
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-black/55">
                      Diproses
                    </span>
                    <strong className="text-lg font-black text-black">
                      {preparingOrders.length}
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <main className="custom-scrollbar flex-1 overflow-y-auto">
          {loading &&
          orders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>

              <h2 className="mt-6 text-xl font-black">
                Memuat antrean dapur
              </h2>

              <p className="mt-2 text-sm text-black/40">
                Sinkronisasi pesanan sedang berjalan...
              </p>
            </div>
          ) : activeTab ===
            'active' ? (
            activeOrderCount === 0 ? (
              <div className="flex h-full min-h-[420px] items-center justify-center p-6">
                <div className="w-full max-w-xl rounded-[32px] border border-black/10 bg-white p-8 text-center shadow-sm sm:p-10">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-black text-white">
                    <ChefHat className="h-9 w-9" />
                  </div>

                  <h2 className="mt-7 text-3xl font-black tracking-[-0.04em]">
                    Antrean kosong
                  </h2>

                  <p className="mx-auto mt-3 max-w-sm text-base leading-7 text-black/45">
                    Belum ada pesanan yang perlu diproses. Pesanan baru akan muncul otomatis di sini.
                  </p>

                  <div className="mt-7 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                    <CircleDot className="h-4 w-4 fill-current" />
                    Sinkronisasi aktif
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid min-h-full grid-cols-1 gap-px bg-black/10 xl:grid-cols-2">
                <section className="min-w-0 bg-[#f4f1eb]">
                  <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-black/10 bg-[#f4f1eb]/95 px-4 backdrop-blur sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-amber-500" />

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                          Queue 01
                        </p>

                        <h2 className="text-lg font-black">
                          Baru / Menunggu
                        </h2>
                      </div>
                    </div>

                    <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-amber-500 px-3 text-sm font-black text-black">
                      {waitingOrders.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 items-start gap-4 p-4 sm:p-6 2xl:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                      {waitingOrders.length > 0 ? (
                        waitingOrders.map(
                          renderTicket,
                        )
                      ) : (
                        <motion.div
                          initial={{
                            opacity: 0,
                          }}
                          animate={{
                            opacity: 1,
                          }}
                          className="flex min-h-48 items-center justify-center rounded-[24px] border-2 border-dashed border-black/10 bg-white/45 p-6 text-center"
                        >
                          <div>
                            <BellRing className="mx-auto h-7 w-7 text-black/20" />
                            <p className="mt-4 text-base font-black text-black/55">
                              Tidak ada pesanan baru
                            </p>
                            <p className="mt-1 text-sm text-black/30">
                              Queue menunggu sedang kosong.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>

                <section className="min-w-0 bg-[#efefec]">
                  <div className="sticky top-0 z-10 flex min-h-16 items-center justify-between border-b border-black/10 bg-[#efefec]/95 px-4 backdrop-blur sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full bg-black" />

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                          Queue 02
                        </p>

                        <h2 className="text-lg font-black">
                          Sedang Diproses
                        </h2>
                      </div>
                    </div>

                    <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-black px-3 text-sm font-black text-white">
                      {preparingOrders.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 items-start gap-4 p-4 sm:p-6 2xl:grid-cols-2">
                    <AnimatePresence mode="popLayout">
                      {preparingOrders.length > 0 ? (
                        preparingOrders.map(
                          renderTicket,
                        )
                      ) : (
                        <motion.div
                          initial={{
                            opacity: 0,
                          }}
                          animate={{
                            opacity: 1,
                          }}
                          className="flex min-h-48 items-center justify-center rounded-[24px] border-2 border-dashed border-black/10 bg-white/45 p-6 text-center"
                        >
                          <div>
                            <Clock3 className="mx-auto h-7 w-7 text-black/20" />
                            <p className="mt-4 text-base font-black text-black/55">
                              Belum ada yang diproses
                            </p>
                            <p className="mt-1 text-sm text-black/30">
                              Mulai pesanan dari queue sebelah kiri.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </section>
              </div>
            )
          ) : filteredOrders.length ===
            0 ? (
            <div className="flex h-full min-h-[420px] items-center justify-center p-6">
              <div className="w-full max-w-xl rounded-[32px] border border-black/10 bg-white p-8 text-center shadow-sm sm:p-10">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-[#f1f1ee] text-black/35">
                  <History className="h-9 w-9" />
                </div>

                <h2 className="mt-7 text-3xl font-black tracking-[-0.04em]">
                  Riwayat masih kosong
                </h2>

                <p className="mt-3 text-base text-black/45">
                  Pesanan Ready, Completed, atau Cancelled akan tampil di sini.
                </p>
              </div>
            </div>
          ) : (
            <section className="p-4 sm:p-6 lg:p-8">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/35">
                    Riwayat Kitchen
                  </p>

                  <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
                    Pesanan sebelumnya
                  </h2>
                </div>

                <p className="text-sm font-bold text-black/40">
                  {filteredOrders.length} pesanan
                </p>
              </div>

              <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map(
                    renderTicket,
                  )}
                </AnimatePresence>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
