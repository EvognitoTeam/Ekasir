'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  QrCode,
  TrendingUp,
  Receipt,
  BellRing,
  ShieldCheck,
  BarChart3,
  Users,
  MessageCircle,
  Mail,
  MapPin,
  Sparkles,
  Wifi,
  ScanLine,
  Check,
  X,
  CalendarDays,
} from 'lucide-react';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa6';

export default function EvokasirLandingPage() {
  const features = [
    {
      icon: <QrCode size={24} />,
      title: 'Menu Digital Interaktif',
      desc: 'Pelanggan scan QR dan langsung memesan dari meja tanpa perlu memanggil waiter.',
    },
    {
      icon: <TrendingUp size={24} />,
      title: 'Laporan Penjualan Real-Time',
      desc: 'Pantau omzet, transaksi, dan performa bisnis secara live kapan saja.',
    },
    {
      icon: <Receipt size={24} />,
      title: 'POS Modern',
      desc: 'Kasir cepat dengan dukungan diskon, pajak, split bill, dan kitchen order.',
    },
    {
      icon: <BellRing size={24} />,
      title: 'Notifikasi Pesanan',
      desc: 'Pesanan baru langsung masuk ke dapur dan kasir secara real-time.',
    },
    {
      icon: <ShieldCheck size={24} />,
      title: 'Keamanan Multi-Tenant',
      desc: 'Data setiap mitra terisolasi dan aman dengan sistem autentikasi modern.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Analitik Bisnis',
      desc: 'Lihat menu terlaris, jam ramai, hingga performa operasional bisnis.',
    },
    {
      icon: <Users size={24} />,
      title: 'Manajemen Pelanggan',
      desc: 'Simpan data pelanggan, loyalty point, dan histori transaksi otomatis.',
    },
    {
      icon: <Wifi size={24} />,
      title: 'WiFi & Informasi Outlet',
      desc: 'Tampilkan password WiFi, fasilitas, dan FAQ langsung di menu digital.',
    },
  ];

  const payments = [
    'QRIS',
    'GoPay',
    'OVO',
    'DANA',
    'ShopeePay',
    'Cash',
  ];

  const qrisFeeTiers = [
  {
    range: 'Rp0 – Rp10 juta',
    rate: '5%',
    description: 'Untuk Rp10 juta pertama transaksi QRIS setiap bulan.',
  },
  {
    range: 'Di atas Rp10 – Rp50 juta',
    rate: '3%',
    description:
      'Untuk bagian transaksi QRIS setelah Rp10 juta hingga Rp50 juta.',
  },
  {
    range: 'Di atas Rp50 juta',
    rate: '2%',
    description:
      'Untuk bagian transaksi QRIS yang melebihi Rp50 juta.',
  },
];

const freePlanFeatures = [
  'POS modern',
  'Menu digital QR',
  'Pemesanan langsung dari meja',
  'Kitchen order',
  'Notifikasi pesanan real-time',
  'Diskon, pajak, dan split bill',
  'Laporan penjualan real-time',
  'Manajemen pelanggan',
  'Loyalty point',
  'Analitik bisnis',
  'Dukungan printer Bluetooth',
  'Monitoring outlet',
];

const attendanceAddon = {
  name: 'Paket Absensi',
  price: 'Rp1.500.000',
  period: '/tahun',
  description:
    'Sistem absensi karyawan terintegrasi dengan dashboard dan outlet EKASIR.',
  features: [
    'Absensi karyawan real-time',
    'Manajemen data karyawan',
    'Pengaturan jadwal dan shift',
    'Riwayat kehadiran',
    'Rekap keterlambatan',
    'Laporan absensi bulanan',
    'Export laporan',
    'Terintegrasi dengan outlet',
  ],
};

type ProgressiveFeeResult = {
  firstTierFee: number;
  secondTierFee: number;
  thirdTierFee: number;
  totalFee: number;
};

function calculateProgressiveQrisFee(
  qrisRevenue: number,
): ProgressiveFeeResult {
  if (!Number.isFinite(qrisRevenue) || qrisRevenue < 0) {
    throw new Error('Pendapatan QRIS harus berupa angka positif.');
  }

  const firstTierRevenue = Math.min(qrisRevenue, 10_000_000);

  const secondTierRevenue = Math.min(
    Math.max(qrisRevenue - 10_000_000, 0),
    40_000_000,
  );

  const thirdTierRevenue = Math.max(
    qrisRevenue - 50_000_000,
    0,
  );

  const firstTierFee = firstTierRevenue * 0.05;
  const secondTierFee = secondTierRevenue * 0.03;
  const thirdTierFee = thirdTierRevenue * 0.02;

  return {
    firstTierFee,
    secondTierFee,
    thirdTierFee,
    totalFee: firstTierFee + secondTierFee + thirdTierFee,
  };
}

const whatsappNumber = '6285176773826';
const emailAddress = 'support@ekasir.evognito.my.id';

const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
const [selectedPlan, setSelectedPlan] = useState('Konsultasi Umum');

const openDemoModal = (planName = 'Konsultasi Umum') => {
  setSelectedPlan(planName);
  setIsDemoModalOpen(true);
};

const closeDemoModal = () => {
  setIsDemoModalOpen(false);
};

const whatsappMessage = encodeURIComponent(
  `Halo tim EKASIR,

Saya tertarik untuk menjadwalkan demo EKASIR.

Produk yang diminati: ${selectedPlan}

Mohon informasikan jadwal demo, mekanisme fee QRIS progresif, dan detail layanan EKASIR.

Terima kasih.`,
);

const emailSubject = encodeURIComponent(
  `Permintaan Demo EKASIR - ${selectedPlan}`,
);

const emailBody = encodeURIComponent(
  `Halo tim EKASIR,

Saya tertarik untuk menjadwalkan demo EKASIR.

Produk yang diminati: ${selectedPlan}

Mohon informasikan jadwal demo, mekanisme fee QRIS progresif, dan detail layanan EKASIR.

Terima kasih.`,
);

const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
const emailUrl = `mailto:${emailAddress}?subject=${emailSubject}&body=${emailBody}`;

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)] overflow-hidden relative">
      {/* BACKGROUND */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--color-primary)] opacity-10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[32rem] h-[32rem] bg-[var(--color-tertiary)] opacity-10 rounded-full blur-[120px]" />

      {/* NAVBAR */}
      <nav className="w-full px-6 py-6 relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[var(--color-primary)] text-white flex items-center justify-center ambient-shadow">
              <ScanLine size={22} />
            </div>

            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">
                EKASIR
              </h1>

              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-on-surface-variant)]">
                Smart POS Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-[var(--color-surface-container)] transition-all"
            >
              Masuk
            </Link>

            <Link
              href="/register"
              className="px-5 py-2.5 rounded-2xl bg-[var(--color-primary)] text-white text-sm font-bold flex items-center gap-2 hover:scale-105 transition-all ambient-shadow"
            >
              Daftar Mitra
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO (Sekarang berpusat ke tengah) */}
      <main className="relative z-10 px-4 pt-20 pb-24 flex justify-center text-center">
        <div className="max-w-4xl mx-auto flex flex-col items-center space-y-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-high)] text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} />
            POS Digital Generasi Baru
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-black leading-[1.1] tracking-tight">
              Sistem Kasir Modern untuk{' '}
              <span className="text-[var(--color-primary)] italic">
                Cafe, Resto,
              </span>{' '}
              dan Bisnis F&B.
            </h1>

            <p className="text-lg md:text-xl text-[var(--color-on-surface-variant)] leading-relaxed max-w-2xl mx-auto">
              Kelola transaksi, menu digital QR, laporan penjualan,
              pembayaran cashless, hingga monitoring outlet dalam satu
              platform yang cepat, elegan, dan real-time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <button
              type="button"
              onClick={() => openDemoModal()}
              className="px-8 py-4 rounded-2xl bg-[var(--color-primary)] text-white font-bold flex items-center justify-center gap-3 hover:scale-[1.03] transition-all ambient-shadow"
            >
              Jadwalkan Demo
              <CalendarDays size={18} />
            </button>

            <a
              href="#fitur"
              className="px-8 py-4 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/40 backdrop-blur-xl font-bold hover:bg-[var(--color-surface-container)] transition-all flex items-center justify-center"
            >
              Pelajari Fitur
            </a>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 w-full">
            {[
              {
                value: '24/7',
                label: 'Monitoring',
              },
              {
                value: 'Real-Time',
                label: 'Sync Order',
              },
              {
                value: 'Cloud',
                label: 'Modern System',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)]/40 backdrop-blur-xl"
              >
                <h3 className="text-3xl font-black text-[var(--color-primary)]">
                  {item.value}
                </h3>
                <p className="text-xs mt-2 text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* FEATURES */}
      <section
        id="fitur"
        className="relative z-10 max-w-7xl mx-auto px-4 py-24"
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-primary)] font-black mb-4">
            FITUR UNGGULAN
          </p>

          <h2 className="text-4xl md:text-5xl font-black leading-tight">
            Semua yang Dibutuhkan Bisnis F&B Modern
          </h2>

          <p className="mt-5 text-[var(--color-on-surface-variant)] text-lg">
            Dibangun khusus untuk cafe, coffee shop, restoran, dan UMKM
            modern yang membutuhkan sistem cepat, stabil, dan elegan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="p-8 rounded-[2rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 backdrop-blur-xl hover:-translate-y-1 hover:border-[var(--color-primary)]/20 transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-5">
                {feat.icon}
              </div>

              <h3 className="text-xl font-black mb-3">
                {feat.title}
              </h3>

              <p className="text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
                {feat.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PAYMENT */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-[2.5rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 backdrop-blur-2xl p-10 overflow-hidden relative">
          
          <div className="absolute top-0 right-0 w-72 h-72 bg-[var(--color-primary)] opacity-10 blur-[100px]" />

          <div className="relative z-10">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-primary)] font-black mb-4">
                PEMBAYARAN
              </p>

              <h2 className="text-4xl font-black leading-tight">
                Mendukung Berbagai Metode Pembayaran Modern
              </h2>

              <p className="mt-4 text-[var(--color-on-surface-variant)]">
                Permudah pelanggan dengan sistem pembayaran fleksibel dan
                cashless yang cepat.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-10">
              {payments.map((payment, idx) => (
                <div
                  key={idx}
                  className="px-5 py-3 rounded-2xl bg-white/70 dark:bg-black/10 border border-[var(--color-outline-variant)]/20 font-bold text-sm"
                >
                  {payment}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
<section
  id="paket"
  className="relative z-10 max-w-7xl mx-auto px-4 py-24"
>
  <div className="text-center max-w-3xl mx-auto mb-16">
    <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-primary)] font-black mb-4">
      HARGA EKASIR
    </p>

    <h2 className="text-4xl md:text-5xl font-black leading-tight">
      Mulai Gratis, Bayar Sesuai Transaksi QRIS
    </h2>

    <p className="mt-5 text-[var(--color-on-surface-variant)] text-lg">
      Tidak ada biaya langganan software bulanan. Fee dihitung secara
      progresif berdasarkan nilai transaksi QRIS yang berhasil setiap bulan.
    </p>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-7 items-stretch">
    {/* FREE PLAN */}
    <div className="relative flex flex-col p-8 md:p-10 rounded-[2rem] border border-[var(--color-primary)] bg-[var(--color-primary)]/5 backdrop-blur-xl shadow-2xl overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-primary)] opacity-10 blur-[100px]" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-xs font-black uppercase tracking-wider">
          <Sparkles size={13} />
          Tanpa Biaya Langganan
        </div>

        <h3 className="mt-7 text-3xl font-black">
          EKASIR Gratis
        </h3>

        <p className="mt-3 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
          Gunakan seluruh fitur utama EKASIR untuk mengelola transaksi,
          pesanan, pelanggan, dan operasional bisnis F&B.
        </p>

        <div className="mt-8 pb-8 border-b border-[var(--color-outline-variant)]/20">
          <p className="text-5xl font-black text-[var(--color-primary)]">
            Gratis
          </p>

          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
            Tidak ada biaya software bulanan
          </p>
        </div>

        <div className="py-8">
          <p className="text-sm font-black mb-5">
            Sudah termasuk:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {freePlanFeatures.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 text-sm text-[var(--color-on-surface-variant)]"
              >
                <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                  <Check size={13} strokeWidth={3} />
                </div>

                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            openDemoModal('EKASIR Gratis dengan Fee QRIS Progresif')
          }
          className="w-full px-6 py-4 rounded-2xl bg-[var(--color-primary)] text-white font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all ambient-shadow"
        >
          Jadwalkan Demo
          <CalendarDays size={18} />
        </button>
      </div>
    </div>

    {/* PROGRESSIVE FEE */}
    <div className="p-8 md:p-10 rounded-[2rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-primary)] font-black mb-4">
        FEE QRIS PROGRESIF
      </p>

      <h3 className="text-3xl font-black leading-tight">
        Semakin Besar Transaksi, Semakin Rendah Fee Berikutnya
      </h3>

      <p className="mt-4 text-[var(--color-on-surface-variant)] leading-relaxed">
        Fee dihitung berdasarkan lapisan transaksi QRIS. Perubahan lapisan
        tidak membuat seluruh transaksi dikenakan tarif baru.
      </p>

      <div className="mt-8 space-y-4">
        {qrisFeeTiers.map((tier, index) => (
          <div
            key={tier.range}
            className="flex flex-col sm:flex-row sm:items-center gap-5 p-5 rounded-2xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface)]/60"
          >
            <div className="w-14 h-14 shrink-0 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center font-black">
              {index + 1}
            </div>

            <div className="flex-1">
              <p className="font-black">
                {tier.range}
              </p>

              <p className="mt-1 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
                {tier.description}
              </p>
            </div>

            <div className="sm:text-right">
              <p className="text-3xl font-black text-[var(--color-primary)]">
                {tier.rate}
              </p>

              <p className="text-xs text-[var(--color-on-surface-variant)]">
                fee platform
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* EXAMPLE */}
      <div className="mt-7 p-6 rounded-2xl bg-[var(--color-primary)]/10">
        <p className="text-sm font-black text-[var(--color-primary)]">
          Contoh transaksi QRIS Rp60 juta/bulan
        </p>

        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--color-on-surface-variant)]">
              Rp10 juta × 5%
            </span>

            <span className="font-bold">
              Rp500.000
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--color-on-surface-variant)]">
              Rp40 juta × 3%
            </span>

            <span className="font-bold">
              Rp1.200.000
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-[var(--color-on-surface-variant)]">
              Rp10 juta × 2%
            </span>

            <span className="font-bold">
              Rp200.000
            </span>
          </div>

          <div className="pt-3 border-t border-[var(--color-primary)]/20 flex items-center justify-between gap-4">
            <span className="font-black">
              Total fee
            </span>

            <span className="text-xl font-black text-[var(--color-primary)]">
              Rp1.900.000
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div className="mt-8 max-w-5xl mx-auto">
    <div className="p-5 rounded-2xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40">
      <p className="text-sm text-center leading-relaxed text-[var(--color-on-surface-variant)]">
        Fee platform hanya dihitung dari transaksi QRIS yang berhasil
        diproses melalui EKASIR. Transaksi tunai dan transaksi manual tidak
        dikenakan fee platform. Biaya MDR QRIS atau biaya penyedia pembayaran
        dapat berlaku secara terpisah.
      </p>
    </div>
  </div>
</section>

{/* ATTENDANCE ADD-ON */}
<section className="relative z-10 max-w-6xl mx-auto px-4 pb-24">
  <div className="rounded-[2.5rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 backdrop-blur-2xl p-8 md:p-12 overflow-hidden relative">
    <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--color-primary)] opacity-10 blur-[110px]" />

    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1fr_0.8fr] gap-10 items-center">
      <div>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-black uppercase tracking-wider">
          Add-on Opsional
        </div>

        <h2 className="mt-6 text-3xl md:text-4xl font-black leading-tight">
          {attendanceAddon.name}
        </h2>

        <p className="mt-4 text-[var(--color-on-surface-variant)] leading-relaxed max-w-2xl">
          {attendanceAddon.description}
        </p>

        <div className="mt-7 flex flex-wrap items-end gap-2">
          <span className="text-4xl md:text-5xl font-black text-[var(--color-primary)]">
            {attendanceAddon.price}
          </span>

          <span className="pb-1 text-[var(--color-on-surface-variant)]">
            {attendanceAddon.period}
          </span>
        </div>

        <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">
          Paket absensi tidak wajib dan dapat ditambahkan sesuai kebutuhan
          operasional mitra.
        </p>
      </div>

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {attendanceAddon.features.map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-3 p-4 rounded-2xl bg-[var(--color-surface)]/60 border border-[var(--color-outline-variant)]/20"
            >
              <div className="mt-0.5 shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
                <Check size={13} strokeWidth={3} />
              </div>

              <span className="text-sm font-medium">
                {feature}
              </span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => openDemoModal('Add-on Paket Absensi')}
          className="mt-7 w-full px-6 py-4 rounded-2xl bg-[var(--color-primary)] text-white font-black flex items-center justify-center gap-3 hover:scale-[1.02] transition-all ambient-shadow"
        >
          Jadwalkan Demo Absensi
          <CalendarDays size={18} />
        </button>
      </div>
    </div>
  </div>
</section>

      {/* CONTACT */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 py-24">
        <div className="rounded-[2.5rem] overflow-hidden border border-[var(--color-outline-variant)]/20 bg-[var(--color-primary)] text-white p-10 md:p-14 relative">
          
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-72 h-72 bg-white rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            
            <div>
              <p className="text-xs uppercase tracking-[0.3em] font-black text-white/70 mb-4">
                CONTACT
              </p>

              <h2 className="text-4xl md:text-5xl font-black leading-tight">
                Siap Mengembangkan Bisnis Anda?
              </h2>

              <p className="mt-5 text-white/80 leading-relaxed">
                Konsultasikan kebutuhan sistem kasir, QR menu, dan digitalisasi bisnis F&B Anda bersama tim EKASIR.
              </p>

              <div className="flex flex-col gap-4 mt-8">
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <MessageCircle size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      WhatsApp
                    </p>

                    <p className="text-sm text-white/70">
                      +62 851-7677-3826
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <Mail size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Email
                    </p>

                    <p className="text-sm text-white/70">
                      support@ekasir.evognito.my.id
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <FaInstagram size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Instagram
                    </p>

                    <p className="text-sm text-white/70">
                      @evognitoteam
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                    <MapPin size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      Location
                    </p>

                    <p className="text-sm text-white/70">
                      Semarang, Indonesia
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <button
                type="button"
                onClick={() => openDemoModal()}
                className="px-10 py-5 rounded-3xl bg-white text-[var(--color-primary)] font-black text-lg hover:scale-105 transition-all shadow-2xl flex items-center gap-3"
              >
                Jadwalkan Demo
                <CalendarDays size={22} />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-[var(--color-outline-variant)]/20 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div>
            <h3 className="font-black text-xl text-[var(--color-primary)]">
              EKASIR
            </h3>

            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
              Smart POS & Digital Menu Platform
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-[var(--color-on-surface-variant)]">
            <Link href="/privacy-policy" className="hover:text-[var(--color-primary)] transition-colors">
              Privacy Policy
            </Link>

            <Link href="/term-conditions" className="hover:text-[var(--color-primary)] transition-colors">
              Terms
            </Link>
          </div>
        </div>
        {/* DEMO CONTACT MODAL */}
        {isDemoModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-modal-title"
            onClick={closeDemoModal}
            className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
          >
            <div
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-lg rounded-[2rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface)] p-7 md:p-9 shadow-2xl"
            >
              <button
                type="button"
                onClick={closeDemoModal}
                aria-label="Tutup"
                className="absolute top-5 right-5 w-10 h-10 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center hover:scale-105 transition-all"
              >
                <X size={20} />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center mb-6">
                <CalendarDays size={26} />
              </div>

              <p className="text-xs uppercase tracking-[0.3em] text-[var(--color-primary)] font-black mb-3">
                JADWALKAN DEMO
              </p>

              <h2
                id="demo-modal-title"
                className="text-3xl font-black leading-tight pr-10"
              >
                Hubungi Tim EKASIR
              </h2>

              <p className="mt-4 text-[var(--color-on-surface-variant)] leading-relaxed">
                Pilih metode komunikasi yang paling nyaman. Tim EKASIR akan
                membantu menjadwalkan demo dan menjelaskan paket yang sesuai.
              </p>

              <div className="mt-5 p-4 rounded-2xl bg-[var(--color-surface-container)]">
                <p className="text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                  Paket yang diminati
                </p>

                <p className="mt-1 font-black text-[var(--color-primary)]">
                  {selectedPlan}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-7">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={closeDemoModal}
                  className="px-5 py-4 rounded-2xl bg-green-600 text-white font-black flex items-center justify-center gap-3 hover:scale-[1.02] hover:bg-green-700 transition-all"
                >
                  <FaWhatsapp size={21} />
                  WhatsApp
                </a>

                <a
                  href={emailUrl}
                  onClick={closeDemoModal}
                  className="px-5 py-4 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] font-black flex items-center justify-center gap-3 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-all"
                >
                  <Mail size={20} />
                  Email
                </a>
              </div>

              <p className="mt-6 text-center text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
                WhatsApp akan membuka percakapan baru, sedangkan email akan
                membuka aplikasi email pada perangkat Anda.
              </p>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}