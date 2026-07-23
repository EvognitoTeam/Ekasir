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
        const previousOrders = orders;

        setOrders((currentOrders) =>
          currentOrders.map((order) =>
            String(order.id) === orderId
              ? {
                  ...order,
                  status: newStatus,
                }
              : order,
          ),
        );

        try {
          const response = await fetch(
            '/api/pos/kitchen/orders',
            {
              method: 'PUT',

              headers: {
                Accept: 'application/json',
                'Content-Type':
                  'application/json',
              },

              credentials: 'include',

              body: JSON.stringify({
                orderId,
                status: newStatus,
                slug,
              }),
            },
          );

          const result =
            (await response.json()) as {
              success?: boolean;
              message?: string;
            };

          if (
            !response.ok ||
            !result.success
          ) {
            throw new Error(
              result.message ??
                'Gagal memperbarui status pesanan.',
            );
          }
        } catch (error) {
          console.error(
            'Gagal memperbarui status kitchen:',
            error,
          );

          /*
           * Rollback optimistic update.
           */
          setOrders(previousOrders);

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

  /*
   * Loading awal saat memeriksa cookie session.
   */
  if (
    loading &&
    !isAuthenticated
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6">
        <div className="flex flex-col items-center">
          <Loader2 className="mb-4 h-10 w-10 animate-spin text-amber-500" />

          <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
            Memeriksa sesi dapur...
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
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-6">
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.95,
          }}
          animate={{
            opacity: 1,
            scale: 1,
          }}
          className="flex w-full max-w-sm flex-col items-center rounded-3xl bg-white p-8 shadow-2xl"
        >
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600">
            <QrCode className="h-8 w-8 text-white" />
          </div>

          <h2 className="text-xl font-black text-stone-800">
            Login Dapur
          </h2>

          <p className="mb-2 text-xs text-stone-500">
            Arahkan token karyawan
          </p>

          {isVerifying ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />

              <p className="text-xs font-bold text-stone-500">
                Memverifikasi token...
              </p>
            </div>
          ) : isScanning ? (
            <div className="relative mt-6 h-64 w-64 overflow-hidden rounded-2xl border-4 border-amber-500 bg-black">
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

              <button
                type="button"
                onClick={() =>
                  setIsScanning(false)
                }
                className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-red-500/80 px-4 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur"
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
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-stone-900 py-4 text-sm font-bold text-white transition hover:bg-stone-800"
              >
                <Camera className="h-5 w-5" />

                Buka Kamera Scan QR
              </button>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-stone-400">
                Scanner QR fisik juga dapat digunakan langsung pada
                halaman ini.
              </p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full justify-center bg-[#f0ede9] font-sans">
      <div className="relative flex h-screen w-full max-w-7xl flex-col overflow-hidden bg-[#f6f3ee] shadow-2xl">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{
                opacity: 0,
                y: -50,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -20,
              }}
              className="absolute left-1/2 top-20 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold tracking-wide text-white shadow-xl"
            >
              <BellRing className="h-5 w-5 animate-bounce" />

              {notification}
            </motion.div>
          )}
        </AnimatePresence>

        <header className="z-30 flex shrink-0 items-center justify-between border-b border-stone-200 bg-white px-6 py-4 shadow-sm">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-orange-500/20">
              <ChefHat className="h-6 w-6 text-white" />
            </div>

            <div className="min-w-0">
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">
                Kitchen Display System
              </p>

              <h1 className="truncate text-xl font-black leading-none text-stone-800">
                Stasiun Dapur • {activeStaffName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void fetchOrders();
              }}
              disabled={isRefetching}
              aria-label="Muat ulang pesanan"
              title="Muat ulang pesanan"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-500 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${
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
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeft className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        <div className="flex shrink-0 gap-3 border-b border-stone-200 bg-white px-6 py-3">
          <button
            type="button"
            onClick={() =>
              setActiveTab('active')
            }
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all md:flex-none ${
              activeTab === 'active'
                ? 'bg-amber-500 text-white shadow-md'
                : 'border border-stone-200 bg-stone-50 text-stone-400 hover:bg-stone-100'
            }`}
          >
            <Flame className="h-4 w-4" />

            Pesanan Aktif
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab('history')
            }
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-widest transition-all md:flex-none ${
              activeTab === 'history'
                ? 'bg-stone-800 text-white shadow-md'
                : 'border border-stone-200 bg-stone-50 text-stone-400 hover:bg-stone-100'
            }`}
          >
            <History className="h-4 w-4" />

            Riwayat
          </button>
        </div>

        <main className="custom-scrollbar flex-1 overflow-y-auto p-6">
          {loading &&
          orders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center opacity-70">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-amber-500" />

              <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
                Memuat tiket dapur...
              </p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center opacity-60">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border-2 border-dashed border-stone-300 bg-white">
                {activeTab === 'active' ? (
                  <ChefHat className="h-10 w-10 text-stone-300" />
                ) : (
                  <History className="h-10 w-10 text-stone-300" />
                )}
              </div>

              <h2 className="mb-2 text-lg font-black text-stone-800">
                {activeTab === 'active'
                  ? 'Dapur Sedang Kosong'
                  : 'Belum Ada Riwayat'}
              </h2>

              <p className="text-sm text-stone-500">
                {activeTab === 'active'
                  ? 'Waktunya bernapas sejenak!'
                  : 'Pesanan selesai akan muncul di sini.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {filteredOrders.map(
                  (order) => (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{
                        opacity: 0,
                        scale: 0.9,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.9,
                      }}
                      transition={{
                        duration: 0.3,
                      }}
                    >
                      <KitchenTicket
                        order={order}
                        onUpdateStatus={
                          executeUpdate
                        }
                      />
                    </motion.div>
                  ),
                )}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}