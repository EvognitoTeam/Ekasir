'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  useParams,
  usePathname,
  useRouter,
} from 'next/navigation';
import {
  AlertCircle,
  CheckCircle,
  ChevronRight,
  CookingPot,
  FileText,
  History,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Shield,
  Store,
  Ticket,
  User,
  X,
  Coins,
  TrendingUp,
  Sparkles,
} from 'lucide-react';

import { PRIVACY_CONTENT, TERMS_CONTENT } from '@/constants/legal';
import { useOrderStore } from '@/store/order.store';

type ProfileViewProps = {
  onViewHistory?: () => void;
  onViewCoupons?: () => void;
};

type SessionUser = {
  id?: string | number;
  name: string;
  role: string;
  email?: string;
  memberId?: string;
  member_id?: string;
  points: number;

  tier: string;
  totalOrders: number;
  totalSpent: number;
  nextTier: string | null;
  nextTierMinimum: number | null;
  remainingToNextTier: number;
  tierProgress: number;
  lifetimePointsEarned: number;
  lifetimePointsRedeemed: number;
  lifetimeSpending: number;
  pointValue: number;
  pointsRupiahValue: number;
  loyaltyEnabled: boolean;
};

type MenuItem = {
  id: string;
  label: string;
  description?: string;
  icon: typeof User;
  action: () => void;
  danger?: boolean;
};

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s/g, '');

export default function ProfileView({
  onViewHistory,
  onViewCoupons,
}: ProfileViewProps) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { orderHistory } = useOrderStore();

  const mitraSlug = String(
    params.mitraSlug ?? '',
  );

  /*
   * Pada route customer berbasis catch-all, params.branchSlug
   * dapat berisi nama halaman, misalnya "profile".
   * Karena itu branchSlug ditentukan dari posisi segmen pathname.
   */
  const pathSegments = pathname
    .split('/')
    .filter(Boolean);

  const profileSegmentIndex =
    pathSegments.lastIndexOf(
      'profile',
    );

  const branchSlug =
    profileSegmentIndex >= 2
      ? pathSegments[
          profileSegmentIndex - 1
        ]
      : undefined;

  const basePath = branchSlug
    ? `/${mitraSlug}/${branchSlug}`
    : `/${mitraSlug}`;

  const [inputEmail, setInputEmail] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      if (!mitraSlug) {
        setIsLoading(false);
        return;
      }

      try {
        const query = new URLSearchParams({
          slug: mitraSlug,
        });

        if (branchSlug) {
          query.set('branch_slug', branchSlug);
        }

        const response = await fetch(
          `/api/auth/me?${query.toString()}`,
          {
            credentials: 'include',
            cache: 'no-store',
            headers: {
              Accept: 'application/json',
            },
          },
        );
        const data = await response.json();

        if (!mounted) return;

        if (response.ok && data.success && data.user) {
          setIsLoggedIn(true);

          setUserData({
            id: data.user.id,
            name: data.user.name,
            role: data.user.role,
            email: data.user.email,

            memberId:
              data.user.memberId ??
              data.user.member_id ??
              data.user.customer_code ??
              data.user.code ??
              (data.user.id
                ? `MEMBER-${data.user.id}`
                : undefined),

            points: Number(
              data.user.points ??
                data.user.point ??
                data.user.loyalty_points ??
                data.user.total_points ??
                0,
            ),

            tier:
              data.user.tier ??
              data.user.member_tier ??
              'Bronze',

            totalOrders: Number(
              data.user.totalOrders ??
                data.user.total_orders ??
                0,
            ),

            totalSpent: Number(
              data.user.totalSpent ??
                data.user.total_spent ??
                0,
            ),

            nextTier:
              data.user.nextTier ??
              data.user.next_tier ??
              null,

            nextTierMinimum:
              data.user.nextTierMinimum ??
              data.user.next_tier_minimum ??
              null,

            remainingToNextTier: Number(
              data.user.remainingToNextTier ??
                data.user.remaining_to_next_tier ??
                0,
            ),

            tierProgress: Number(
              data.user.tierProgress ??
                data.user.tier_progress ??
                0,
            ),

            lifetimePointsEarned: Number(
              data.user.lifetimePointsEarned ??
                data.user.lifetime_points_earned ??
                0,
            ),

            lifetimePointsRedeemed: Number(
              data.user.lifetimePointsRedeemed ??
                data.user.lifetime_points_redeemed ??
                0,
            ),

            lifetimeSpending: Number(
              data.user.lifetimeSpending ??
                data.user.lifetime_spending ??
                data.user.totalSpent ??
                data.user.total_spent ??
                0,
            ),

            pointValue: Number(
              data.user.pointValue ??
                data.user.point_value ??
                0,
            ),

            pointsRupiahValue: Number(
              data.user.pointsRupiahValue ??
                data.user.points_rupiah_value ??
                0,
            ),

            loyaltyEnabled: Boolean(
              data.user.loyaltyEnabled ??
                data.user.loyalty_enabled ??
                false,
            ),
          });
        } else {
          setIsLoggedIn(false);
          setUserData(null);
        }
      } catch {
        if (mounted) {
          setIsLoggedIn(false);
          setUserData(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [mitraSlug, branchSlug]);

  const userRole = userData?.role?.toLowerCase() || 'user';

  const totalSpent = useMemo(
    () =>
      orderHistory.reduce((total, order) => {
        const item = order as typeof order & {
          totalAfterDiscount?: number;
        };

        return total + Number(item.totalAfterDiscount ?? order.totalPrice ?? 0);
      }, 0),
    [orderHistory],
  );

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setShowSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inputEmail.trim(),
          password: inputPassword,
          slug: mitraSlug,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login gagal. Periksa kembali akun Anda.');
      }

      setShowSuccess(true);
      setInputPassword('');

      window.setTimeout(() => {
        router.refresh();
        window.location.reload();
      }, 700);
    } catch (error) {
      setLoginError(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat login.',
      );
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.replace(`${basePath}/profile`);
      router.refresh();
      window.location.reload();
    }
  };

  const openHistory = () => {
    if (onViewHistory) {
      onViewHistory();
      return;
    }

    router.push(`${basePath}/history`);
  };

  const openCoupons = () => {
    if (onViewCoupons) {
      onViewCoupons();
      return;
    }

    router.push(`${basePath}/coupons`);
  };

  const accountMenus = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [];

    if (userRole === 'owner') {
      items.push({
        id: 'dashboard',
        label: 'Dashboard Pemilik',
        description: 'Kelola operasional dan laporan bisnis',
        icon: LayoutDashboard,
        action: () => router.push(`/${mitraSlug}/admin/dashboard`),
      });
    }

    if (userRole === 'cashier') {
      items.push({
        id: 'cashier',
        label: 'Buka POS Kasir',
        description: 'Masuk ke area transaksi kasir',
        icon: Store,
        action: () => router.push(`/${mitraSlug}/cashier`),
      });
    }

    if (userRole === 'kitchen') {
      items.push({
        id: 'kitchen',
        label: 'Buka Kitchen Display',
        description: 'Lihat antrean dan proses pesanan',
        icon: CookingPot,
        action: () => router.push(`/${mitraSlug}/kitchen`),
      });
    }

    if (isLoggedIn) {
      items.push(
        {
          id: 'history',
          label: 'Riwayat Pesanan',
          description: 'Lihat transaksi dan status pesanan sebelumnya',
          icon: History,
          action: openHistory,
        },
        {
          id: 'coupons',
          label: 'Kupon & Voucher',
          description: 'Lihat promo yang tersedia untuk akun Anda',
          icon: Ticket,
          action: openCoupons,
        },
      );
    }

    return items;
  }, [isLoggedIn, mitraSlug, router, userRole]);

  const generalMenus: MenuItem[] = [
    {
      id: 'privacy',
      label: 'Kebijakan Privasi',
      description: 'Cara EKASIR mengelola dan melindungi data',
      icon: Shield,
      action: () => setShowPrivacyModal(true),
    },
    {
      id: 'terms',
      label: 'Syarat & Ketentuan',
      description: 'Ketentuan penggunaan layanan EKASIR',
      icon: FileText,
      action: () => setShowTermModal(true),
    },
  ];

  const roleLabel =
    userRole === 'owner'
      ? 'Store Owner'
      : userRole === 'cashier'
        ? 'Cashier Staff'
        : userRole === 'kitchen'
          ? 'Kitchen Staff'
          : 'Verified Customer';

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[var(--color-surface)]">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--color-primary)]" />
        <p className="font-label text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">
          Memuat profil
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[var(--color-surface)] pb-10 pt-8 mb-28">
      <LegalModal
        open={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        title="Kebijakan Privasi"
        eyebrow="EKASIR Platform"
        icon={Shield}
        content={PRIVACY_CONTENT}
        buttonLabel="Saya Mengerti"
      />

      <MemberQrModal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        memberId={userData?.memberId}
        fallbackValue={`${mitraSlug}:${userData?.email || userData?.name || 'member'}`}
        points={userData?.points ?? 0}
      />

      <LegalModal
        open={showTermModal}
        onClose={() => setShowTermModal(false)}
        title="Syarat & Ketentuan"
        eyebrow="EKASIR Platform"
        icon={FileText}
        content={
          TERMS_CONTENT ||
          'Syarat dan ketentuan layanan belum tersedia.'
        }
        buttonLabel="Saya Setuju"
      />

      <header className="mb-10 px-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 flex items-center gap-4"
        >
          <div className="h-[2px] w-8 rounded-full bg-[var(--color-primary)]" />
          <span className="font-label text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--color-primary)]">
            Profil & Pengaturan
          </span>
        </motion.div>

        <h1 className="font-display text-5xl leading-none tracking-tighter text-stone-900">
          Profil.
        </h1>
      </header>

      <div className="flex flex-col gap-8 px-6">
        <AnimatePresence mode="wait">
          {isLoggedIn ? (
            <motion.section
              key="logged-in"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="relative overflow-hidden rounded-[2rem] border border-stone-800 bg-stone-900 p-8 text-white shadow-xl shadow-stone-900/10"
            >
              <div className="pointer-events-none absolute -mr-20 -mt-20 right-0 top-0 h-64 w-64 rounded-full bg-[var(--color-primary)] opacity-20 blur-3xl mix-blend-overlay" />

              <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-lg backdrop-blur-md">
                      <User className="h-7 w-7 text-white" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="mb-1 truncate font-label text-[10px] font-bold uppercase tracking-widest text-stone-400">
                        {roleLabel}
                      </p>
                      <h2 className="truncate font-display text-2xl text-white">
                        {userData?.name || 'Pengguna EKASIR'}
                      </h2>
                      {userData?.email && (
                        <p className="mt-0.5 truncate text-[11px] text-stone-300">
                          {userData.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Keluar dari akun"
                    title="Keluar"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-stone-300 transition-all hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 active:scale-95"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-6">
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center backdrop-blur-sm sm:p-4">
                    <p className="font-display text-xl text-white sm:text-2xl">
                      {userData?.totalOrders ?? 0}
                    </p>
                    <p className="mt-1 font-label text-[8px] font-bold uppercase tracking-widest text-stone-400 sm:text-[9px]">
                      Pesanan
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center backdrop-blur-sm sm:p-4">
                    <p className="truncate font-display text-sm text-white sm:text-lg">
                      {formatIDR(userData?.totalSpent ?? 0)}
                    </p>
                    <p className="mt-1 font-label text-[8px] font-bold uppercase tracking-widest text-stone-400 sm:text-[9px]">
                      Total Belanja
                    </p>
                  </div>

                  {/* <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-center backdrop-blur-sm sm:p-4">
                    <p className="font-display text-xl font-bold text-amber-300 sm:text-2xl">
                      {(userData?.points ?? 0).toLocaleString('id-ID')}
                    </p>
                    <p className="mt-1 font-label text-[8px] font-bold uppercase tracking-widest text-amber-200/70 sm:text-[9px]">
                      Poin Aktifs
                    </p>
                  </div> */}
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06]">
                  <div className="border-b border-white/10 px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-label text-[9px] font-bold uppercase tracking-widest text-stone-400">
                          Membership
                        </p>
                        <h3 className="mt-1 flex items-center gap-2 font-display text-lg font-bold text-white">
                          <Sparkles className="h-4 w-4 text-amber-300" />
                          {userData?.tier || 'Member'} Tier
                        </h3>
                        <p className="mt-1 text-xs text-stone-300">
                          Kartu member digital
                        </p>
                      </div>

                      <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-right">
                        <p className="font-label text-[8px] font-bold uppercase tracking-widest text-amber-200/70">
                          Saldo Poin
                        </p>
                        <p className="mt-1 font-display text-2xl font-bold text-amber-300">
                          {(userData?.points ?? 0).toLocaleString('id-ID')}
                        </p>
                        {Number(userData?.pointsRupiahValue ?? 0) > 0 && (
                          <p className="mt-0.5 text-[9px] font-medium text-amber-100/60">
                            ≈ {formatIDR(userData?.pointsRupiahValue ?? 0)}
                          </p>
                        )}
                      </div>
                    </div>

                    {userData?.nextTier && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-semibold text-stone-300">
                            Menuju {userData.nextTier}
                          </p>
                          <p className="text-[10px] font-bold text-amber-300">
                            {Math.min(100, Math.max(0, userData.tierProgress || 0)).toFixed(0)}%
                          </p>
                        </div>

                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-amber-300 transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, userData.tierProgress || 0),
                              )}%`,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-[10px] text-stone-400">
                          {userData.remainingToNextTier > 0
                            ? `Kurang ${formatIDR(userData.remainingToNextTier)} lagi untuk naik tier.`
                            : 'Syarat tier berikutnya sudah tercapai.'}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 p-4">
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      aria-label="Perbesar QR member"
                      className="group shrink-0 rounded-xl bg-white p-2 shadow-sm transition-transform hover:scale-[1.03] active:scale-95"
                    >
                      <QRCodeSVG
                        value={
                          userData?.memberId ||
                          `${mitraSlug}:${userData?.email || userData?.name || 'member'}`
                        }
                        size={72}
                        level="H"
                        includeMargin={false}
                      />
                      <span className="sr-only">Klik untuk memperbesar QR</span>
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="font-label text-[9px] font-bold uppercase tracking-widest text-stone-400">
                        Member ID
                      </p>
                      <p className="mt-1 truncate font-mono text-sm font-semibold tracking-wider text-white">
                        {userData?.memberId || userData?.member_id || 'Belum tersedia'}
                      </p>
                      <p className="mt-2 text-[10px] leading-relaxed text-stone-400">
                        Tunjukkan QR ini kepada kasir untuk identifikasi member dan pencatatan poin.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/10 p-4">
                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-emerald-300" />
                        <p className="font-label text-[8px] font-bold uppercase tracking-widest text-stone-400">
                          Lifetime Earned
                        </p>
                      </div>
                      <p className="mt-2 font-display text-lg font-bold text-white">
                        {(userData?.lifetimePointsEarned ?? 0).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-amber-300" />
                        <p className="font-label text-[8px] font-bold uppercase tracking-widest text-stone-400">
                          Poin Digunakan
                        </p>
                      </div>
                      <p className="mt-2 font-display text-lg font-bold text-white">
                        {(userData?.lifetimePointsRedeemed ?? 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.section
              key="guest"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="overflow-hidden rounded-[2rem] border border-stone-100 bg-white shadow-xl shadow-stone-200/50"
            >
              <div className="border-b border-stone-100 px-8 py-5">
                <p className="font-label text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
                  Masuk Akun
                </p>
              </div>

              <form className="flex flex-col gap-5 p-8" onSubmit={handleLogin}>
                <div>
                  <h2 className="font-display text-2xl font-medium text-stone-900">
                    Selamat datang kembali.
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-stone-500">
                    Masuk untuk membuka riwayat pesanan, kupon, dan akses staf sesuai akun Anda.
                  </p>
                </div>

                <AnimatePresence mode="popLayout">
                  {showSuccess && (
                    <StatusMessage type="success">
                      Login berhasil. Menyiapkan profil Anda...
                    </StatusMessage>
                  )}

                  {loginError && (
                    <StatusMessage type="error">
                      {loginError}
                    </StatusMessage>
                  )}
                </AnimatePresence>

                <Field
                  label="Alamat Email"
                  icon={Mail}
                  type="email"
                  value={inputEmail}
                  onChange={setInputEmail}
                  placeholder="nama@email.com"
                  autoComplete="email"
                />

                <Field
                  label="Kata Sandi"
                  icon={KeyRound}
                  type="password"
                  value={inputPassword}
                  onChange={setInputPassword}
                  placeholder="Masukkan kata sandi"
                  autoComplete="current-password"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] py-3.5 font-label text-xs font-bold uppercase tracking-widest text-white transition-all hover:brightness-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-stone-300"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Masuk'
                  )}
                </button>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {accountMenus.length > 0 && (
          <MenuGroup title="Akun" items={accountMenus} />
        )}

        <MenuGroup title="Informasi" items={generalMenus} />
      </div>
    </div>
  );
}

function MenuGroup({
  title,
  items,
}: {
  title: string;
  items: MenuItem[];
}) {
  return (
    <motion.section layout>
      <p className="mb-3 px-1 font-label text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">
        {title}
      </p>

      <div className="overflow-hidden rounded-[1.75rem] border border-stone-100 bg-white shadow-sm">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={item.action}
            className={`group flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-stone-50 ${
              index < items.length - 1 ? 'border-b border-stone-100' : ''
            }`}
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-stone-400 transition-all group-hover:bg-[var(--color-primary)]/10 group-hover:text-[var(--color-primary)]">
                <item.icon className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-800">
                  {item.label}
                </p>
                {item.description && (
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-stone-400">
                    {item.description}
                  </p>
                )}
              </div>
            </div>

            <ChevronRight className="h-4 w-4 shrink-0 text-stone-300 transition-colors group-hover:text-[var(--color-primary)]" />
          </button>
        ))}
      </div>
    </motion.section>
  );
}

function Field({
  label,
  icon: Icon,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  icon: typeof User;
  type: 'email' | 'password';
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-label text-[9px] font-bold uppercase tracking-widest text-stone-400">
        {label}
      </span>

      <span className="relative block">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="w-full rounded-xl border border-stone-200/60 bg-stone-100/50 py-3 pl-11 pr-4 text-base text-stone-800 outline-none transition-all placeholder:text-stone-400 focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
        />
      </span>
    </label>
  );
}

function StatusMessage({
  type,
  children,
}: {
  type: 'success' | 'error';
  children: React.ReactNode;
}) {
  const success = type === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-xs font-bold ${
        success
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {success ? (
        <CheckCircle className="h-4 w-4 shrink-0" />
      ) : (
        <AlertCircle className="h-4 w-4 shrink-0" />
      )}
      {children}
    </motion.div>
  );
}

function LegalModal({
  open,
  onClose,
  title,
  eyebrow,
  icon: Icon,
  content,
  buttonLabel,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow: string;
  icon: typeof User;
  content: string;
  buttonLabel: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50/50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-stone-900">
                    {title}
                  </h3>
                  <p className="font-label text-[9px] font-bold uppercase tracking-widest text-stone-400">
                    {eyebrow}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label={`Tutup ${title}`}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-colors hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="no-scrollbar overflow-y-auto whitespace-pre-wrap p-6 text-sm leading-relaxed text-stone-600">
              {content}
            </div>

            <div className="border-t border-stone-100 bg-white p-5">
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[var(--color-primary)] py-3.5 font-label text-xs font-bold uppercase tracking-widest text-white transition-all hover:brightness-95 active:scale-[0.98]"
              >
                {buttonLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MemberQrModal({
  open,
  onClose,
  memberId,
  member_id,
  fallbackValue,
  points,
}: {
  open: boolean;
  onClose: () => void;
  memberId?: string;
  member_id?: string;
  fallbackValue: string;
  points: number;
}) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/75 p-5 backdrop-blur-md"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-white p-6 text-center shadow-2xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup QR member"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-800"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="font-label text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--color-primary)]">
              Kartu Member Digital
            </p>
            <h3 className="mt-2 font-display text-2xl font-bold text-stone-900">
              Pindai QR Member
            </h3>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-stone-500">
              Tunjukkan kode ini kepada kasir untuk identifikasi member dan pencatatan poin.
            </p>

            <div className="mx-auto mt-6 w-fit rounded-[1.75rem] border border-stone-100 bg-white p-5 shadow-xl shadow-stone-200/60">
              <QRCodeSVG
                value={memberId || fallbackValue}
                size={240}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-left">
              <div className="rounded-2xl bg-stone-100 p-4">
                <p className="font-label text-[9px] font-bold uppercase tracking-widest text-stone-400">
                  Member ID
                </p>
                <p className="mt-1 truncate font-mono text-sm font-bold text-stone-800">
                  {memberId || member_id || 'Belum tersedia'}
                </p>
              </div>
              <div className="rounded-2xl bg-stone-900 p-4 text-white">
                <p className="font-label text-[9px] font-bold uppercase tracking-widest text-stone-400">
                  Poin Aktif
                </p>
                <p className="mt-1 font-display text-xl font-bold">{points}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-[var(--color-primary)] py-3.5 font-label text-xs font-bold uppercase tracking-widest text-white transition-all hover:brightness-95 active:scale-[0.98]"
            >
              Tutup
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}