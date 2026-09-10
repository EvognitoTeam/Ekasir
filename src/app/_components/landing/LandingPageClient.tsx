'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BellRing,
  CalendarDays,
  Check,
  ChefHat,
  CircleDollarSign,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  MonitorSmartphone,
  QrCode,
  Receipt,
  ShieldCheck,
  Sparkles,
  Store,
  Table2,
  Users,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa6';
import { KALOO_BRAND } from '@/config/brand';
import { isAddonEnabled } from '@/config/addons';
import { useLanguageStore, type Locale } from '@/store/language.store';
import { APP_VERSION } from "@/lib/appVersion";

type PlatformFeeResult = {
  transactionValue: number;
  rate: number;
  totalFee: number;
  netValue: number;
};

type FeeExampleProps = {
  transactionValue: number;
};

const PLATFORM_FEE_RATE = 0.014;

type TextFn = (
  id: string,
  en: string,
) => string;

type DemoPlan =
  | 'general'
  | 'attendance'
  | 'pager'
  | 'core';

function buildFeatures(
  text: TextFn,
) {
  return [
    {
      icon: Receipt,
      eyebrow: text('Point of Sale', 'Point of Sale'),
      title: text(
        'Kasir yang cepat, bukan ramai.',
        'A faster cashier, without the clutter.',
      ),
      desc: text(
        'Transaksi, diskon, pajak, metode pembayaran, printer, dan histori order dalam satu alur yang ringkas.',
        'Transactions, discounts, taxes, payment methods, printers, and order history in one streamlined flow.',
      ),
    },
    {
      icon: QrCode,
      eyebrow: text('Pemesanan Digital', 'Digital Ordering'),
      title: text(
        'QR menu langsung dari meja.',
        'QR ordering, right from the table.',
      ),
      desc: text(
        'Pelanggan dapat melihat menu, memesan, dan mengikuti status pesanan tanpa aplikasi tambahan.',
        'Customers can browse the menu, place orders, and follow order status without installing another app.',
      ),
    },
    {
      icon: ChefHat,
      eyebrow: text('Layar Dapur', 'Kitchen Display'),
      title: text(
        'Dapur melihat apa yang harus dikerjakan.',
        'The kitchen sees exactly what needs to be done.',
      ),
      desc: text(
        'Order masuk real-time ke kitchen flow dengan status yang jelas dari confirmed sampai ready.',
        'Orders enter the kitchen flow in real time with clear statuses from confirmed through ready.',
      ),
    },
    {
      icon: Table2,
      eyebrow: text('Operasional Meja', 'Table Operation'),
      title: text(
        'Meja, reservasi, dan order saling terhubung.',
        'Tables, reservations, and orders stay connected.',
      ),
      desc: text(
        'Status meja berubah mengikuti aktivitas outlet sehingga kasir dan tim operasional melihat keadaan yang sama.',
        'Table status follows outlet activity so cashiers and operations teams always see the same state.',
      ),
    },
    {
      icon: BarChart3,
      eyebrow: text('Analitik', 'Analytics'),
      title: text(
        'Angka penting tanpa spreadsheet tambahan.',
        'The numbers that matter, without another spreadsheet.',
      ),
      desc: text(
        'Pantau penjualan, transaksi, menu terlaris, pelanggan, dan performa outlet dari satu dashboard.',
        'Monitor sales, transactions, best-selling items, customers, and outlet performance from one dashboard.',
      ),
    },
    {
      icon: Users,
      eyebrow: text('Pelanggan & Loyalti', 'Customer & Loyalty'),
      title: text(
        'Kenali pelanggan yang kembali.',
        'Know the customers who keep coming back.',
      ),
      desc: text(
        'Riwayat transaksi dan loyalty point terhubung langsung dengan operasional KALOO POS.',
        'Transaction history and loyalty points connect directly with KALOO POS operations.',
      ),
    },
  ];
}

function buildWorkflow(
  text: TextFn,
) {
  return [
    {
      no: '01',
      title: text('Customer memesan', 'Customer orders'),
      desc: text(
        'Dari QR menu di meja atau langsung melalui kasir.',
        'From the QR menu at the table or directly through the cashier.',
      ),
      icon: QrCode,
    },
    {
      no: '02',
      title: text('Dapur menerima pesanan', 'Kitchen receives it'),
      desc: text(
        'Pesanan masuk ke kitchen display tanpa harus dipindahkan manual.',
        'Orders appear on the kitchen display without being transferred manually.',
      ),
      icon: ChefHat,
    },
    {
      no: '03',
      title: text('Kasir tetap memegang kendali', 'Cashier stays in control'),
      desc: text(
        'Pembayaran, meja, order, reservasi, dan printer tetap berada dalam satu layar operasional.',
        'Payments, tables, orders, reservations, and printers remain in one operational screen.',
      ),
      icon: MonitorSmartphone,
    },
    {
      no: '04',
      title: text('Owner melihat bisnis secara utuh', 'Owner sees the business'),
      desc: text(
        'Data outlet dan operasional tersinkron untuk monitoring dan pengambilan keputusan.',
        'Outlet and operational data stay synchronized for monitoring and decision-making.',
      ),
      icon: BarChart3,
    },
  ];
}

const payments = ['QRIS', 'GoPay', 'OVO', 'DANA', 'ShopeePay', 'Cash'];

function buildFreePlanFeatures(
  text: TextFn,
) {
  return [
    text('POS modern', 'Modern POS'),
    text('Menu digital QR', 'QR digital menu'),
    text('Pemesanan langsung dari meja', 'Direct table ordering'),
    text('Kitchen order', 'Kitchen orders'),
    text('Notifikasi pesanan real-time', 'Real-time order notifications'),
    text('Diskon dan pajak', 'Discounts and taxes'),
    text('Laporan penjualan real-time', 'Real-time sales reports'),
    text('Manajemen pelanggan', 'Customer management'),
    text('Loyalty point', 'Loyalty points'),
    text('Analitik bisnis', 'Business analytics'),
    text('Dukungan printer Bluetooth', 'Bluetooth printer support'),
    text('Monitoring outlet', 'Outlet monitoring'),
  ];
}

const whatsappNumber = '6285176773826';
const emailAddress = 'support@kaloopos.com';

const formatIDR = (
  value: number,
  locale: Locale,
) =>
  new Intl.NumberFormat(
    locale === 'id' ? 'id-ID' : 'en-US',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    },
  )
    .format(value)
    .replace(/\s/g, '');

function calculatePlatformFee(transactionValue: number): PlatformFeeResult {
  if (!Number.isFinite(transactionValue) || transactionValue < 0) {
    throw new Error('Transaction value must be a positive number.');
  }

  const totalFee = transactionValue * PLATFORM_FEE_RATE;

  return {
    transactionValue,
    rate: PLATFORM_FEE_RATE,
    totalFee,
    netValue: transactionValue - totalFee,
  };
}

function useLandingText() {
  const locale = useLanguageStore(
    (state) => state.locale,
  );

  const text: TextFn = (
    id,
    en,
  ) => (locale === 'id' ? id : en);

  return {
    locale,
    text,
  };
}

export default function LandingPageClient() {
  const {
    locale,
    text,
  } = useLandingText();

  const showAttendance = isAddonEnabled('attendance');
  const showPager = isAddonEnabled('pager');
  const showAddons = showAttendance || showPager;

  const features = buildFeatures(text);
  const workflow = buildWorkflow(text);
  const freePlanFeatures = buildFreePlanFeatures(text);

  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DemoPlan>('general');

  const selectedPlanLabel =
    selectedPlan === 'attendance'
      ? 'KALOO Attendance'
      : selectedPlan === 'pager'
        ? 'KALOO Smart Pager'
        : selectedPlan === 'core'
          ? text(
              'KALOO POS Gratis dengan Fee Platform Flat 1,4%',
              'Free KALOO POS with Flat 1.4% Platform Fee',
            )
          : text(
              'Konsultasi Umum',
              'General Consultation',
            );

  const openDemoModal = (
    plan: DemoPlan = 'general',
  ) => {
    setSelectedPlan(plan);
    setIsDemoModalOpen(true);
  };

  const closeDemoModal = () =>
    setIsDemoModalOpen(false);

  const whatsappUrl = useMemo(() => {
    const message =
      locale === 'id'
        ? `Halo tim KALOO POS,\n\nSaya tertarik untuk menjadwalkan demo KALOO POS.\n\nProduk yang diminati: ${selectedPlanLabel}\n\nMohon informasikan jadwal demo, mekanisme fee platform flat 1,4% untuk seluruh transaksi, dan detail layanan KALOO POS.\n\nTerima kasih.`
        : `Hello KALOO POS team,\n\nI am interested in scheduling a KALOO POS demo.\n\nProduct of interest: ${selectedPlanLabel}\n\nPlease share the available demo schedule, details of the flat 1.4% platform fee for all transactions, and information about KALOO POS services.\n\nThank you.`;

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  }, [
    locale,
    selectedPlanLabel,
  ]);

  const emailUrl = useMemo(() => {
    const subject =
      locale === 'id'
        ? `Permintaan Demo KALOO POS - ${selectedPlanLabel}`
        : `KALOO POS Demo Request - ${selectedPlanLabel}`;

    const body =
      locale === 'id'
        ? `Halo tim KALOO POS,\n\nSaya tertarik untuk menjadwalkan demo KALOO POS.\n\nProduk yang diminati: ${selectedPlanLabel}\n\nMohon informasikan jadwal demo, mekanisme fee platform flat 1,4% untuk seluruh transaksi, dan detail layanan KALOO POS.\n\nTerima kasih.`
        : `Hello KALOO POS team,\n\nI am interested in scheduling a KALOO POS demo.\n\nProduct of interest: ${selectedPlanLabel}\n\nPlease share the available demo schedule, details of the flat 1.4% platform fee for all transactions, and information about KALOO POS services.\n\nThank you.`;

    return `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [
    locale,
    selectedPlanLabel,
  ]);

  return (
    <div className="kaloo-v2 k-page min-h-screen bg-[#f7f7f4] text-[#111111] selection:bg-black selection:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.32] [background-image:linear-gradient(to_right,rgba(17,17,17,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(17,17,17,0.035)_1px,transparent_1px)] [background-size:40px_40px]" />

      <nav className="sticky top-0 z-50 border-b border-black/10 bg-[#f7f7f4]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3" aria-label="KALOO POS">
            <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-black/10 bg-white">
              <Image
                src={KALOO_BRAND.logo}
                alt={`${KALOO_BRAND.name} Logo`}
                fill
                priority
                unoptimized
                sizes="48px"
                className="object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="leading-none">
              <div className="text-[17px] font-extrabold tracking-[0.18em]">{KALOO_BRAND.name}</div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.32em] text-black/45">
                {KALOO_BRAND.descriptor}
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-semibold text-black/65 lg:flex">
            <a href="#platform" className="transition-colors hover:text-black">{text('Platform', 'Platform')}</a>
            <a href="#workflow" className="transition-colors hover:text-black">{text('Cara Kerja', 'How It Works')}</a>
            {showAddons && (
              <a href="#addons" className="transition-colors hover:text-black">
                Add-ons
              </a>
            )}
            <a href="#harga" className="transition-colors hover:text-black">{text('Harga', 'Pricing')}</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />

            <Link
              href="/login"
              className="hidden rounded-full px-4 py-2.5 text-sm font-bold text-black/70 transition-colors hover:text-black sm:block"
            >
              {text('Masuk', 'Sign In')}
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 sm:px-5"
            >
              {text('Daftar Mitra', 'Register Partner')} <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <section className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-14 px-5 py-16 sm:px-6 md:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
          <div>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-black/70">
              <Sparkles size={13} /> {text('Dibangun untuk hospitality modern', 'Built for modern hospitality')}
            </div>

            <h1 className="max-w-4xl [font-family:var(--font-body)] text-[clamp(3.3rem,7vw,6.8rem)] font-semibold leading-[0.93] tracking-[-0.055em]">
              {text('Satu sistem untuk seluruh ritme restoran.', 'One system for the entire rhythm of your restaurant.')}
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-black/58 md:text-xl">
              {text('KALOO menyatukan kasir, QR ordering, kitchen, meja, reservasi, pelanggan, laporan, dan perangkat smart table dalam satu platform operasional.', 'KALOO brings cashier, QR ordering, kitchen, tables, reservations, customers, reporting, and smart-table devices together in one operating platform.')}
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => openDemoModal()}
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-black px-7 text-sm font-extrabold text-white transition-all hover:-translate-y-0.5 hover:bg-[#252525]"
              >
                {text('Jadwalkan Demo', 'Schedule a Demo')} <ArrowRight size={17} />
              </button>
              <a
                href="#platform"
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-full border border-black/15 bg-white px-7 text-sm font-extrabold transition-colors hover:border-black/30"
              >
                {text('Lihat Platform', 'Explore Platform')}
              </a>
            </div>

            <div className="mt-12 grid max-w-2xl grid-cols-3 border-y border-black/10 py-6">
              {[
                ['24/7', text('Monitoring cloud', 'Cloud monitoring')],
                ['Real-time', text('Sinkronisasi order', 'Order sync')],
                ['1 platform', text('Operasional outlet', 'Outlet operation')],
              ].map(([value, label], index) => (
                <div key={label} className={index > 0 ? 'border-l border-black/10 pl-5 sm:pl-8' : ''}>
                  <p className="text-lg font-extrabold sm:text-2xl">{value}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.15em] text-black/40 sm:text-xs">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <HeroProductMockup />
        </section>

        <section className="border-y border-black/10 bg-white/70">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-black/10 px-0 md:grid-cols-4">
            {[
              [text('POS', 'POS'), Receipt],
              [text('Dapur', 'Kitchen'), ChefHat],
              [text('Pemesanan QR', 'QR Ordering'), QrCode],
              [text('Smart Table', 'Smart Table'), Table2],
            ].map(([label, Icon]) => {
              const IconComponent = Icon as React.ElementType;
              return (
                <div key={String(label)} className="flex items-center justify-center gap-3 bg-[#f7f7f4] px-5 py-6 text-sm font-extrabold">
                  <IconComponent size={18} strokeWidth={1.8} />
                  {String(label)}
                </div>
              );
            })}
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
          <SectionHeading
            kicker="KALOO PLATFORM"
            title={text('Lebih sedikit aplikasi. Lebih banyak kontrol.', 'Fewer apps. More control.')}
            body={text('Setiap bagian KALOO dirancang untuk berbagi data yang sama, sehingga cashier, kitchen, owner, dan customer tidak bekerja di sistem yang terpisah.', 'Every part of KALOO shares the same data, so cashier, kitchen, owner, and customer flows do not operate in disconnected systems.')}
          />

          <div className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="group min-h-[300px] rounded-[28px] border border-black/10 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-black/25 md:p-8"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-black/10 bg-[#f7f7f4]">
                      <Icon size={21} strokeWidth={1.8} />
                    </div>
                    <span className="text-xs font-bold tracking-[0.2em] text-black/25">0{index + 1}</span>
                  </div>
                  <p className="mt-10 text-[10px] font-extrabold uppercase tracking-[0.22em] text-black/38">
                    {feature.eyebrow}
                  </p>
                  <h3 className="mt-3 [font-family:var(--font-body)] text-2xl font-semibold leading-tight tracking-[-0.03em]">
                    {feature.title}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-black/50">{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="workflow" className="border-y border-black/10 bg-[#111111] text-white">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-white/40">{text('SATU ALUR', 'ONE FLOW')}</p>
                <h2 className="mt-5 max-w-xl [font-family:var(--font-body)] text-4xl font-semibold leading-[1.04] tracking-[-0.04em] md:text-6xl">
                  {text('Dari meja sampai laporan, tetap dalam satu alur.', 'From the table to reporting, it stays in one flow.')}
                </h2>
                <p className="mt-6 max-w-lg text-base leading-8 text-white/55">
                  {text('Tidak perlu memindahkan order dari satu aplikasi ke aplikasi lain. Status bergerak bersama operasional outlet.', 'There is no need to move orders from one application to another. Status moves together with outlet operations.')}
                </p>
              </div>

              <div className="divide-y divide-white/12 border-y border-white/12">
                {workflow.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.no} className="grid gap-5 py-7 sm:grid-cols-[70px_52px_1fr] sm:items-center">
                      <span className="text-xs font-bold tracking-[0.2em] text-white/30">{item.no}</span>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15">
                        <Icon size={20} strokeWidth={1.7} />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold">{item.title}</h3>
                        <p className="mt-1 text-sm leading-6 text-white/48">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {showAddons && (
          <section id="addons" className="mx-auto max-w-7xl px-5 pt-24 sm:px-6 lg:px-8 lg:pt-32">
            <SectionHeading
              kicker="KALOO ADD-ONS"
              title={text('Tambahkan kemampuan saat operasional Anda membutuhkannya.', 'Add capabilities when your operation needs them.')}
              body={text('Core KALOO POS tetap sederhana. Attendance, Smart Pager, dan add-on lainnya dapat diaktifkan terpisah tanpa membuat sistem utama menjadi penuh fitur yang tidak digunakan.', 'The KALOO POS core stays simple. Attendance, Smart Pager, and other add-ons can be enabled separately without filling the main system with features you do not use.')}
            />

            <div className="mt-10 flex flex-wrap gap-2">
              {showAttendance && (
                <a
                  href="#attendance"
                  className="rounded-full border border-black/12 bg-white px-5 py-3 text-sm font-extrabold transition-colors hover:bg-black hover:text-white"
                >
                  KALOO Attendance
                </a>
              )}
              {showPager && (
                <a
                  href="#pager"
                  className="rounded-full border border-black/12 bg-white px-5 py-3 text-sm font-extrabold transition-colors hover:bg-black hover:text-white"
                >
                  KALOO Smart Pager
                </a>
              )}
            </div>
          </section>
        )}

        {showAttendance && (
          <section id="attendance" className="mx-auto max-w-7xl px-5 pt-10 sm:px-6 lg:px-8 lg:pt-12">
            <div className="grid overflow-hidden rounded-[36px] border border-black/10 bg-[#111111] text-white lg:grid-cols-[1.08fr_0.92fr]">
              <div className="p-8 md:p-12 lg:p-16">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60">
                  <Users size={13} /> {text('KALOO Add-on Tenaga Kerja', 'KALOO Workforce Add-on')}
                </div>

                <h2 className="mt-7 [font-family:var(--font-body)] text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl">
                  {text('Absensi dan operasional karyawan dalam satu sistem.', 'Attendance and workforce operations in one system.')}
                </h2>
                <p className="mt-6 max-w-xl text-base leading-8 text-white/55">
                  {text('KALOO Attendance membantu outlet mengelola check-in, check-out, shift, keterlambatan, riwayat kehadiran, dan laporan karyawan langsung dari ekosistem KALOO.', 'KALOO Attendance helps outlets manage check-in, check-out, shifts, lateness, attendance history, and employee reports directly within the KALOO ecosystem.')}
                </p>

                <div className="mt-9 grid gap-3 sm:grid-cols-2">
                  {[
                    [Clock3, text('Check-in & check-out', 'Check-in & check-out')],
                    [CalendarDays, text('Manajemen shift', 'Shift management')],
                    [Users, text('Manajemen karyawan', 'Employee management')],
                    [BarChart3, text('Laporan absensi', 'Attendance reports')],
                  ].map(([Icon, label]) => {
                    const IconComponent = Icon as React.ElementType;
                    return (
                      <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-sm font-bold text-white/80">
                        <IconComponent size={18} strokeWidth={1.8} /> {String(label)}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-9 flex flex-wrap items-end justify-between gap-5 border-t border-white/12 pt-7">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/35">{text('Add-on opsional', 'Optional add-on')}</p>
                    <p className="mt-2 text-2xl font-extrabold">KALOO Attendance</p>
                    <p className="mt-1 text-sm font-semibold text-white/40">{text('Aktifkan sesuai kebutuhan outlet', 'Enable it based on outlet needs')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDemoModal('attendance')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-extrabold transition-colors hover:bg-white hover:text-black"
                  >
                    {text('Konsultasi Attendance', 'Discuss Attendance')} <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-center border-t border-white/10 bg-[#1b1b1b] p-10 lg:border-l lg:border-t-0 lg:p-14">
                <AttendanceMockup />
              </div>
            </div>
          </section>
        )}

        {showPager && (
          <section id="pager" className="mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
            <div className="grid overflow-hidden rounded-[36px] border border-black/10 bg-white lg:grid-cols-[0.92fr_1.08fr]">
              <div className="flex items-center justify-center border-b border-black/10 bg-[#ecece8] p-10 lg:border-b-0 lg:border-r lg:p-14">
                <PagerMockup />
              </div>

              <div className="p-8 md:p-12 lg:p-16">
                <div className="inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-black/55">
                  <Wifi size={13} /> {text('KALOO Add-on IoT', 'KALOO IoT Add-on')}
                </div>
                <h2 className="mt-7 [font-family:var(--font-body)] text-4xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-6xl">
                  {text('Meja fisik ikut masuk ke dalam sistem.', 'Physical tables become part of the system.')}
                </h2>
                <p className="mt-6 max-w-xl text-base leading-8 text-black/52">
                  {text('KALOO Smart Pager menampilkan status meja, reservasi, order, dan notifikasi ready secara real-time langsung dari KALOO POS.', 'KALOO Smart Pager displays table status, reservations, orders, and ready notifications in real time directly from KALOO POS.')}
                </p>

                <div className="mt-9 grid gap-3 sm:grid-cols-2">
                  {[
                    [BellRing, text('Notifikasi order siap', 'Order-ready alert')],
                    [Clock3, text('Status reservasi', 'Reservation status')],
                    [Table2, text('Status meja real-time', 'Real-time table state')],
                    [ShieldCheck, text('Identitas perangkat aman', 'Secure device identity')],
                  ].map(([Icon, label]) => {
                    const IconComponent = Icon as React.ElementType;
                    return (
                      <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[#f7f7f4] p-4 text-sm font-bold">
                        <IconComponent size={18} strokeWidth={1.8} /> {String(label)}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-9 flex flex-wrap items-end justify-between gap-5 border-t border-black/10 pt-7">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-black/35">{text('Sewa add-on', 'Add-on rental')}</p>
                    <p className="mt-2 text-2xl font-extrabold">{text('Mulai Rp25.000', 'From Rp25,000')} <span className="text-sm font-semibold text-black/40">{text('/ pager / bulan', '/ pager / month')}</span></p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDemoModal('pager')}
                    className="inline-flex items-center gap-2 rounded-full border border-black/15 px-5 py-3 text-sm font-extrabold transition-colors hover:bg-black hover:text-white"
                  >
                    {text('Konsultasi Pager', 'Discuss Pager')} <ArrowUpRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="border-y border-black/10 bg-white/70">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-black/35">{text('SIAP PEMBAYARAN', 'PAYMENT READY')}</p>
                <h2 className="mt-4 [font-family:var(--font-body)] text-4xl font-semibold tracking-[-0.04em] md:text-5xl">
                  {text('Tunai atau cashless, tetap satu transaksi.', 'Cash or cashless, it remains one transaction.')}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {payments.map((payment) => (
                  <span key={payment} className="rounded-full border border-black/12 bg-[#f7f7f4] px-5 py-3 text-sm font-extrabold">
                    {payment}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="harga" className="mx-auto max-w-7xl px-5 py-24 sm:px-6 lg:px-8 lg:py-32">
          <SectionHeading
            kicker={text('HARGA', 'PRICING')}
            title={text('Software utamanya gratis. Biaya mengikuti transaksi.', 'The core software is free. Fees follow transactions.')}
            body={text('KALOO POS tidak membebankan biaya langganan software bulanan untuk fitur utama. Platform fee flat 1,4% berlaku pada transaksi berhasil yang diproses atau dicatat melalui KALOO POS.', 'KALOO POS does not charge a monthly software subscription for core features. A flat 1.4% platform fee applies to successful transactions processed or recorded through KALOO POS.')}
          />

          <div className="mt-16 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col rounded-[32px] bg-black p-8 text-white md:p-10">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full border border-white/15 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/60">
                  {text('Platform Inti', 'Core Platform')}
                </span>
                <CircleDollarSign size={23} strokeWidth={1.6} className="text-white/50" />
              </div>

              <h3 className="mt-10 [font-family:var(--font-body)] text-4xl font-semibold tracking-[-0.04em]">KALOO POS</h3>
              <div className="mt-5 flex items-end gap-3">
                <span className="text-6xl font-semibold tracking-[-0.05em]">{text('Gratis', 'Free')}</span>
                <span className="pb-2 text-sm text-white/45">{text('software / bulan', 'software / month')}</span>
              </div>

              <div className="mt-9 grid gap-3 sm:grid-cols-2">
                {freePlanFeatures.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5 text-sm text-white/68">
                    <Check className="mt-0.5 shrink-0" size={15} strokeWidth={2.5} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => openDemoModal('core')}
                className="mt-10 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-extrabold text-black transition-transform hover:-translate-y-0.5"
              >
                {text('Jadwalkan Demo', 'Schedule a Demo')} <ArrowRight size={16} />
              </button>
            </div>

            <div className="rounded-[32px] border border-black/10 bg-white p-8 md:p-10">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-black/35">{text('Fee platform flat', 'Flat platform fee')}</p>
              <div className="mt-5 flex flex-col gap-5 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="max-w-md [font-family:var(--font-body)] text-3xl font-semibold leading-tight tracking-[-0.04em] md:text-4xl">
                    {text('Satu tarif untuk seluruh transaksi.', 'One rate for every transaction.')}
                  </h3>
                  <p className="mt-4 max-w-lg text-sm leading-7 text-black/50">
                    {text('Berlaku sama untuk transaksi tunai, QRIS, e-wallet, transfer, dan metode lain yang tercatat melalui KALOO POS.', 'The same rate applies to cash, QRIS, e-wallet, bank transfer, and other payment methods recorded through KALOO POS.')}
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="text-7xl font-semibold tracking-[-0.07em]">{locale === 'id' ? '1,4%' : '1.4%'}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">{text('per transaksi berhasil', 'per successful transaction')}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <FeeExample transactionValue={100_000} />
                <FeeExample transactionValue={1_000_000} />
                <FeeExample transactionValue={10_000_000} />
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#f3f3ef] p-5">
                <ShieldCheck size={19} className="mt-0.5 shrink-0" />
                <p className="text-sm leading-6 text-black/55">
                  {text('Fee platform dihitung dari nilai transaksi berhasil yang tercatat melalui KALOO POS. Biaya MDR, settlement, atau biaya penyedia pembayaran sudah termasuk di dalamnya.', 'The platform fee is calculated from successful transaction value recorded through KALOO POS. MDR, settlement, or payment provider fees are included.')}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-6 lg:px-8 lg:pb-32">
          <div className="overflow-hidden rounded-[36px] bg-[#deded7] p-8 md:p-12 lg:p-14">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-black/38">{text('BANGUN OPERASIONALNYA', "LET'S BUILD THE OPERATION")}</p>
                <h2 className="mt-5 max-w-3xl [font-family:var(--font-body)] text-4xl font-semibold leading-[1.02] tracking-[-0.045em] md:text-6xl">
                  {text('KALOO bukan sekadar kasir. Ini lapisan operasional bisnis F&B Anda.', 'KALOO is more than a cashier. It is the operating layer for your F&B business.')}
                </h2>
                <p className="mt-6 max-w-2xl text-base leading-8 text-black/55">
                  {text('Konsultasikan kebutuhan outlet, QR ordering, kitchen, attendance karyawan, smart pager, printer, dan integrasi operasional bersama tim KALOO POS.', 'Discuss your outlet, QR ordering, kitchen, employee attendance, smart pager, printer, and operational integration needs with the KALOO POS team.')}
                </p>
              </div>

              <div className="lg:text-right">
                <button
                  type="button"
                  onClick={() => openDemoModal()}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-black px-7 text-sm font-extrabold text-white transition-transform hover:-translate-y-0.5 sm:w-auto"
                >
                  {text('Bicara dengan Tim KALOO', 'Talk to the KALOO Team')} <ArrowUpRight size={16} />
                </button>
              </div>
            </div>

            <div className="mt-12 grid gap-3 border-t border-black/10 pt-8 sm:grid-cols-2 lg:grid-cols-4">
              <ContactItem icon={MessageCircle} label="WhatsApp" value="+62 851-7677-3826" />
              <ContactItem icon={Mail} label="Email" value={emailAddress} />
              <ContactItem icon={FaInstagram} label="Instagram" value="@evognitoteam" />
              <ContactItem icon={MapPin} label={text('Lokasi', 'Location')} value="Semarang, Indonesia" />
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-black/10 bg-[#f7f7f4]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-white">
              <Image src={KALOO_BRAND.logo} alt={KALOO_BRAND.name} unoptimized fill sizes="56px" className="object-contain p-1.5" />
            </div>
            <div>
              <p className="text-lg font-extrabold tracking-[0.18em]">{KALOO_BRAND.name}</p>
              <p className="mt-1 text-xs text-black/42">{text('Sistem Operasional Restoran', 'Restaurant Operating System')}</p>
              <p className="mt-1 text-[10px] text-black/30">{text('Versi Aplikasi', 'App Version')}: v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-black/48">
            <Link href="/privacy-policy" className="hover:text-black">Privacy Policy</Link>
            <Link href="/term-conditions" className="hover:text-black">Terms</Link>
            <Link href="https://blog.kaloopos.com/" className="hover:text-black">Blog</Link>
          </div>
        </div>
      </footer>

      {isDemoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
          onClick={closeDemoModal}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-lg rounded-[30px] border border-black/10 bg-[#f7f7f4] p-7 shadow-2xl md:p-9"
          >
            <div className="absolute right-16 top-5">
              <LanguageToggle />
            </div>

            <button
              type="button"
              onClick={closeDemoModal}
              aria-label={text('Tutup', 'Close')}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white transition-colors hover:bg-black hover:text-white"
            >
              <X size={18} />
            </button>

            <div className="mb-7 flex items-center gap-4">
              <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-black/10 bg-white">
                <Image src={KALOO_BRAND.logo} alt={KALOO_BRAND.name} unoptimized fill sizes="56px" className="object-contain p-1.5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-black/35">KALOO POS</p>
                <p className="mt-1 font-extrabold">{text('Jadwalkan percakapan', 'Schedule a conversation')}</p>
              </div>
            </div>

            <h2 id="demo-modal-title" className="pr-10 [font-family:var(--font-body)] text-3xl font-semibold leading-tight tracking-[-0.035em]">
              {text('Ceritakan kebutuhan operasional Anda.', 'Tell us about your operational needs.')}
            </h2>
            <p className="mt-4 text-sm leading-7 text-black/52">
              {text('Pilih WhatsApp atau email. Tim KALOO akan membantu menjadwalkan demo dan menjelaskan implementasi yang paling sesuai.', 'Choose WhatsApp or email. The KALOO team will help schedule a demo and explain the implementation that best fits your operation.')}
            </p>

            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/35">{text('Produk yang diminati', 'Product of interest')}</p>
              <p className="mt-1.5 font-extrabold">{selectedPlanLabel}</p>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeDemoModal}
                className="flex min-h-13 items-center justify-center gap-3 rounded-full bg-black px-5 font-extrabold text-white transition-transform hover:-translate-y-0.5"
              >
                <FaWhatsapp size={19} /> WhatsApp
              </a>
              <a
                href={emailUrl}
                onClick={closeDemoModal}
                className="flex min-h-13 items-center justify-center gap-3 rounded-full border border-black/15 bg-white px-5 font-extrabold transition-colors hover:border-black/35"
              >
                <Mail size={18} /> Email
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  kicker,
  title,
  body,
}: {
  kicker: string;
  title: string;
  body: string;
}) {
  return (
    <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-black/35">{kicker}</p>
        <h2 className="mt-5 max-w-3xl [font-family:var(--font-body)] text-4xl font-semibold leading-[1.03] tracking-[-0.045em] md:text-6xl">
          {title}
        </h2>
      </div>
      <p className="max-w-xl text-base leading-8 text-black/50 lg:justify-self-end">{body}</p>
    </div>
  );
}

function HeroProductMockup() {
  const { text } = useLandingText();

  return (
    <div className="relative mx-auto w-full max-w-[620px]">
      <div className="absolute -left-8 top-20 hidden h-36 w-36 rounded-full border border-black/10 lg:block" />
      <div className="absolute -right-4 bottom-16 hidden h-20 w-20 rounded-full bg-black lg:block" />

      <div className="relative rotate-[1.2deg] overflow-hidden rounded-[32px] border border-black/12 bg-white shadow-[0_35px_90px_rgba(0,0,0,0.10)]">
        <div className="flex h-14 items-center justify-between border-b border-black/10 px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-black" />
            <span className="text-xs font-extrabold tracking-[0.16em]">{text('KALOO / KASIR', 'KALOO / CASHIER')}</span>
          </div>
          <div className="rounded-full border border-black/10 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-black/45">{text('Outlet Utama', 'Main Outlet')}</div>
        </div>

        <div className="grid min-h-[470px] grid-cols-[76px_1fr] sm:grid-cols-[92px_1fr]">
          <aside className="border-r border-black/10 bg-[#f4f4f0] p-3">
            <div className="space-y-3">
              {[Store, Receipt, Table2, BarChart3, Users].map((Icon, index) => (
                <div
                  key={index}
                  className={`flex aspect-square items-center justify-center rounded-2xl ${index === 1 ? 'bg-black text-white' : 'text-black/40'}`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                </div>
              ))}
            </div>
          </aside>

          <div className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-black/35">{text('Hari ini', 'Today')}</p>
                <p className="mt-1 text-2xl font-extrabold">{text('Papan Pesanan', 'Order Board')}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white">
                <Zap size={17} />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2.5">
              {[
                ['12', text('Baru', 'New')],
                ['08', text('Dapur', 'Kitchen')],
                ['05', text('Siap', 'Ready')],
              ].map(([value, label], index) => (
                <div key={label} className={`rounded-2xl p-4 ${index === 2 ? 'bg-black text-white' : 'bg-[#f2f2ee]'}`}>
                  <p className="text-xl font-extrabold sm:text-2xl">{value}</p>
                  <p className={`mt-1 text-[9px] font-bold uppercase tracking-[0.12em] ${index === 2 ? 'text-white/55' : 'text-black/38'}`}>{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2.5">
              {[
                ['A07', text('Meja 08', 'Table 08'), text('Disiapkan', 'Preparing'), 'Rp128.000'],
                ['A08', text('Meja 02', 'Table 02'), text('Menunggu pembayaran', 'Waiting payment'), 'Rp86.000'],
                ['A09', text('Bungkus', 'Takeaway'), text('Dikonfirmasi', 'Confirmed'), 'Rp54.000'],
              ].map(([code, table, status, total], index) => (
                <div key={code} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-2xl border border-black/8 p-3.5">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-xs font-extrabold ${index === 0 ? 'bg-black text-white' : 'bg-[#f1f1ed]'}`}>
                    {code}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{table}</p>
                    <p className="mt-0.5 truncate text-[10px] font-semibold text-black/38">{status}</p>
                  </div>
                  <p className="text-xs font-extrabold">{total}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-2xl bg-[#e8e8e3] p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/35">{text('Penjualan', 'Sales')}</p>
                <p className="mt-1.5 text-lg font-extrabold">Rp4.8M</p>
              </div>
              <div className="rounded-2xl border border-black/10 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/35">{text('Meja', 'Tables')}</p>
                <p className="mt-1.5 text-lg font-extrabold">18 / 24</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttendanceMockup() {
  const { text } = useLandingText();

  const rows: Array<[string, string, string, boolean]> = [
    ['Raka', '08:02', text('Tepat waktu', 'On time'), false],
    ['Nadia', '08:11', text('Tepat waktu', 'On time'), false],
    ['Dimas', '08:27', text('Terlambat', 'Late'), true],
  ];

  return (
    <div className="w-full max-w-[420px]">
      <div className="rounded-[30px] border border-white/10 bg-[#f7f7f4] p-5 text-black shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-black/10 pb-5">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[0.22em] text-black/35">KALOO Attendance</p>
            <p className="mt-1 text-xl font-extrabold">{text('Tim hari ini', "Today's team")}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
            <Users size={18} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {[
            ['12', text('Terjadwal', 'Scheduled')],
            ['10', text('Hadir', 'Present')],
            ['1', text('Terlambat', 'Late')],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl border border-black/10 bg-white p-3">
              <p className="text-xl font-extrabold">{value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-black/35">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
          {rows.map(([name, time, status, isLate], index) => (
            <div
              key={name}
              className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-black/10' : ''}`}
            >
              <div>
                <p className="text-sm font-extrabold">{name}</p>
                <p className="mt-0.5 text-[10px] text-black/35">{text('Staf outlet', 'Outlet staff')}</p>
              </div>
              <p className="text-xs font-bold text-black/55">{time}</p>
              <span className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold ${isLate ? 'bg-black text-white' : 'bg-[#efefe9] text-black/60'}`}>
                {status}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-black px-4 py-3 text-white">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">{text('Shift saat ini', 'Current shift')}</p>
            <p className="mt-1 text-sm font-extrabold">{text('Pagi', 'Morning')} · 08:00–16:00</p>
          </div>
          <CalendarDays size={18} className="text-white/65" />
        </div>
      </div>
    </div>
  );
}

function PagerMockup() {
  const { text } = useLandingText();

  return (
    <div className="relative flex h-[330px] w-[330px] items-center justify-center sm:h-[390px] sm:w-[390px]">
      <div className="absolute inset-0 rounded-full border border-black/10" />
      <div className="absolute inset-7 rounded-full border border-black/10" />
      <div className="relative flex h-[260px] w-[260px] flex-col items-center justify-center rounded-full border-[10px] border-[#1a1a1a] bg-[#0d0d0d] text-white shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:h-[300px] sm:w-[300px]">
        <div className="absolute top-8 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-white" /> KALOO
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/38">{text('Meja 08', 'Table 08')}</p>
        <p className="mt-4 text-3xl font-extrabold tracking-[-0.04em] sm:text-4xl">{text('SIAP', 'READY')}</p>
        <div className="mt-4 h-px w-20 bg-white/18" />
        <p className="mt-4 text-xs font-semibold text-white/58">{text('Pesanan A07', 'Order A07')}</p>
        <div className="absolute bottom-8 flex gap-2">
          <span className="h-2 w-2 rounded-full bg-white" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
}

function FeeExample({ transactionValue }: FeeExampleProps) {
  const { locale, text } = useLandingText();
  const result = calculatePlatformFee(transactionValue);

  return (
    <div className="grid grid-cols-1 gap-4 rounded-2xl border border-black/10 bg-[#fafaf8] p-5 sm:grid-cols-3">
      <div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/35">{text('Nilai transaksi', 'Transaction value')}</p>
        <p className="mt-1.5 text-sm font-extrabold">{formatIDR(result.transactionValue, locale)}</p>
      </div>
      <div>
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/35">{text('Fee 1,4%', '1.4% fee')}</p>
        <p className="mt-1.5 text-sm font-extrabold">{formatIDR(result.totalFee, locale)}</p>
      </div>
      <div className="sm:text-right">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/35">{text('Setelah fee', 'After fee')}</p>
        <p className="mt-1.5 text-sm font-extrabold">{formatIDR(result.netValue, locale)}</p>
      </div>
    </div>
  );
}

function LanguageToggle() {
  const locale = useLanguageStore(
    (state) => state.locale,
  );

  const setLocale = useLanguageStore(
    (state) => state.setLocale,
  );

  return (
    <div
      className="flex items-center rounded-full border border-black/10 bg-white p-1"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => setLocale('id')}
        aria-pressed={locale === 'id'}
        className={`rounded-full px-2.5 py-1.5 text-[10px] font-extrabold transition-colors ${
          locale === 'id'
            ? 'bg-black text-white'
            : 'text-black/45 hover:text-black'
        }`}
      >
        ID
      </button>

      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        className={`rounded-full px-2.5 py-1.5 text-[10px] font-extrabold transition-colors ${
          locale === 'en'
            ? 'bg-black text-white'
            : 'text-black/45 hover:text-black'
        }`}
      >
        EN
      </button>
    </div>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/60">
        <Icon size={17} />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.16em] text-black/35">{label}</p>
        <p className="mt-1 truncate text-sm font-bold">{value}</p>
      </div>
    </div>
  );
}
