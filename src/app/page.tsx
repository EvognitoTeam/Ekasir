'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  BarChart3,
  BellRing,
  CalendarDays,
  Check,
  Mail,
  MapPin,
  MessageCircle,
  QrCode,
  Receipt,
  ScanLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { FaInstagram, FaWhatsapp } from 'react-icons/fa6';

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

const features = [
  { icon: QrCode, title: 'Menu Digital Interaktif', desc: 'Pelanggan scan QR dan langsung memesan dari meja tanpa perlu memanggil waiter.' },
  { icon: TrendingUp, title: 'Laporan Penjualan Real-Time', desc: 'Pantau omzet, transaksi, dan performa bisnis secara live kapan saja.' },
  { icon: Receipt, title: 'POS Modern', desc: 'Kasir cepat dengan dukungan diskon, pajak, dan kitchen order.' },
  { icon: BellRing, title: 'Notifikasi Pesanan', desc: 'Pesanan baru langsung masuk ke dapur dan kasir secara real-time.' },
  { icon: ShieldCheck, title: 'Keamanan Multi-Tenant', desc: 'Data setiap mitra terisolasi dan aman dengan sistem autentikasi modern.' },
  { icon: BarChart3, title: 'Analitik Bisnis', desc: 'Lihat menu terlaris, jam ramai, hingga performa operasional bisnis.' },
  { icon: Users, title: 'Manajemen Pelanggan', desc: 'Simpan data pelanggan, loyalty point, dan histori transaksi otomatis.' },
  { icon: Wifi, title: 'WiFi & Informasi Outlet', desc: 'Tampilkan password WiFi, fasilitas, dan FAQ langsung di menu digital.' },
];

const payments = ['QRIS', 'GoPay', 'OVO', 'DANA', 'ShopeePay', 'Cash'];

const freePlanFeatures = [
  'POS modern',
  'Menu digital QR',
  'Pemesanan langsung dari meja',
  'Kitchen order',
  'Notifikasi pesanan real-time',
  'Diskon, pajak',
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
  description: 'Sistem absensi karyawan terintegrasi dengan dashboard dan outlet KALOO POS.',
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

const gateParkingAddon = {
  name: 'Paket Gerbang Parkir',
  price: 'Rp2.500.000',
  period: '/bulan',
  description:
    'Sistem parking gate terintegrasi dengan KALOO POS yang memungkinkan pembayaran parkir melalui kasir maupun kartu e-money dengan akses keluar yang otomatis.',
  features: [
    'Parking gate otomatis untuk kendaraan masuk dan keluar',
    'Tiket parkir terintegrasi dengan KALOO POS',
    'Pembayaran tiket parkir langsung melalui kasir outlet',
    'Setelah pembayaran di kasir, kendaraan otomatis dapat keluar',
    'Integrasi pembayaran menggunakan kartu e-money',
    'Pembayaran e-money melalui kasir tanpa memotong saldo kartu',
    'Validasi pembayaran kendaraan secara real-time',
    'Sinkronisasi status pembayaran dengan gerbang keluar',
    'Riwayat kendaraan masuk, keluar, dan pembayaran',
    'Monitoring aktivitas parkir melalui dashboard',
    'Terintegrasi dengan outlet KALOO POS',
  ],
};

const whatsappNumber = '6285176773826';
const emailAddress = 'support@kaloopos.evognito.my.id';

const formatIDR = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s/g, '');

function calculatePlatformFee(transactionValue: number): PlatformFeeResult {
  if (!Number.isFinite(transactionValue) || transactionValue < 0) {
    throw new Error('Nilai transaksi harus berupa angka positif.');
  }

  const totalFee = transactionValue * PLATFORM_FEE_RATE;

  return {
    transactionValue,
    rate: PLATFORM_FEE_RATE,
    totalFee,
    netValue: transactionValue - totalFee,
  };
}

export default function EvokasirLandingPage() {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Konsultasi Umum');

  const openDemoModal = (planName = 'Konsultasi Umum') => {
    setSelectedPlan(planName);
    setIsDemoModalOpen(true);
  };

  const closeDemoModal = () => setIsDemoModalOpen(false);

  const whatsappUrl = useMemo(() => {
    const message = encodeURIComponent(`Halo tim KALOO POS,\n\nSaya tertarik untuk menjadwalkan demo KALOO POS.\n\nProduk yang diminati: ${selectedPlan}\n\nMohon informasikan jadwal demo, mekanisme fee platform flat 1,4% untuk seluruh transaksi, dan detail layanan KALOO POS.\n\nTerima kasih.`);
    return `https://wa.me/${whatsappNumber}?text=${message}`;
  }, [selectedPlan]);

  const emailUrl = useMemo(() => {
    const subject = encodeURIComponent(`Permintaan Demo KALOO POS - ${selectedPlan}`);
    const body = encodeURIComponent(`Halo tim KALOO POS,\n\nSaya tertarik untuk menjadwalkan demo KALOO POS.\n\nProduk yang diminati: ${selectedPlan}\n\nMohon informasikan jadwal demo, mekanisme fee platform flat 1,4% untuk seluruh transaksi, dan detail layanan KALOO POS.\n\nTerima kasih.`);
    return `mailto:${emailAddress}?subject=${subject}&body=${body}`;
  }, [selectedPlan]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-surface)] text-[var(--color-on-surface)]">
      <div className="absolute left-[-10%] top-[-10%] h-96 w-96 rounded-full bg-[var(--color-primary)] opacity-10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[32rem] w-[32rem] rounded-full bg-[var(--color-tertiary)] opacity-10 blur-[120px]" />

      <nav className="relative z-20 w-full px-6 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="ambient-shadow relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary)] overflow-hidden">
            <Image 
              src="/logo.png" // Sesuaikan dengan nama file gambar Anda
              alt="KALOO POS Logo" 
              fill
              sizes="44px"
              className="object-cover" 
            />            
          </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-[var(--color-primary)]">KALOO POS</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--color-on-surface-variant)]">Smart POS Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-2xl px-5 py-2.5 text-sm font-bold transition-all hover:bg-[var(--color-surface-container)]">Masuk</Link>
            <Link href="/register" className="ambient-shadow flex items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105">Daftar Mitra</Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 flex justify-center px-4 pb-24 pt-20 text-center">
        <div className="mx-auto flex max-w-4xl flex-col items-center space-y-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-outline-variant)]/40 bg-[var(--color-surface-container-high)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--color-primary)]">
            <Sparkles size={14} /> POS Digital Generasi Baru
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl font-black leading-[1.1] tracking-tight md:text-7xl">
              Sistem Kasir Modern untuk <span className="italic text-[var(--color-primary)]">Cafe, Resto,</span> dan Bisnis F&amp;B.
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-[var(--color-on-surface-variant)] md:text-xl">
              Kelola transaksi, menu digital QR, laporan penjualan, pembayaran cashless, hingga monitoring outlet dalam satu platform yang cepat, elegan, dan real-time.
            </p>
          </div>

          <div className="flex w-full flex-col justify-center gap-4 sm:w-auto sm:flex-row">
            <button type="button" onClick={() => openDemoModal()} className="ambient-shadow flex items-center justify-center gap-3 rounded-2xl bg-[var(--color-primary)] px-8 py-4 font-bold text-white transition-all hover:scale-[1.03]">
              Jadwalkan Demo <CalendarDays size={18} />
            </button>
            <a href="#fitur" className="flex items-center justify-center rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)]/40 px-8 py-4 font-bold backdrop-blur-xl transition-all hover:bg-[var(--color-surface-container)]">Pelajari Fitur</a>
          </div>

          <div className="grid w-full grid-cols-1 gap-6 pt-10 sm:grid-cols-3">
            {[{ value: '24/7', label: 'Monitoring' }, { value: 'Real-Time', label: 'Sync Order' }, { value: 'Cloud', label: 'Modern System' }].map((item) => (
              <div key={item.label} className="rounded-3xl border border-[var(--color-outline-variant)]/30 bg-[var(--color-surface-container)]/40 p-6 backdrop-blur-xl">
                <h3 className="text-3xl font-black text-[var(--color-primary)]">{item.value}</h3>
                <p className="mt-2 text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <section id="fitur" className="relative z-10 mx-auto max-w-7xl px-4 py-24">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">Fitur Unggulan</p>
          <h2 className="text-4xl font-black leading-tight md:text-5xl">Semua yang Dibutuhkan Bisnis F&amp;B Modern</h2>
          <p className="mt-5 text-lg text-[var(--color-on-surface-variant)]">Dibangun khusus untuk cafe, coffee shop, restoran, dan UMKM modern yang membutuhkan sistem cepat, stabil, dan elegan.</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="rounded-[2rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 p-8 backdrop-blur-xl transition-all hover:-translate-y-1 hover:border-[var(--color-primary)]/20">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Icon size={24} /></div>
                <h3 className="mb-3 text-xl font-black">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--color-on-surface-variant)]">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-10">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 p-10 backdrop-blur-2xl">
          <div className="absolute right-0 top-0 h-72 w-72 bg-[var(--color-primary)] opacity-10 blur-[100px]" />
          <div className="relative z-10">
            <div className="max-w-2xl">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">Pembayaran</p>
              <h2 className="text-4xl font-black leading-tight">Mendukung Berbagai Metode Pembayaran Modern</h2>
              <p className="mt-4 text-[var(--color-on-surface-variant)]">Permudah pelanggan dengan sistem pembayaran fleksibel, mulai dari tunai hingga cashless.</p>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              {payments.map((payment) => <div key={payment} className="rounded-2xl border border-[var(--color-outline-variant)]/20 bg-white/70 px-5 py-3 text-sm font-bold dark:bg-black/10">{payment}</div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="paket" className="relative z-10 mx-auto max-w-7xl px-4 py-24">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">Harga KALOO POS</p>
          <h2 className="text-4xl font-black leading-tight md:text-5xl">Mulai Gratis dengan Fee Platform Flat 1,4%</h2>
          <p className="mt-5 text-lg text-[var(--color-on-surface-variant)]">Tidak ada biaya langganan software bulanan. Setiap transaksi berhasil yang diproses atau dicatat melalui KALOO POS dikenakan fee platform tetap sebesar 1,4%, tanpa membedakan metode pembayaran.</p>
        </div>

        <div className="grid grid-cols-1 items-stretch gap-7 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative flex flex-col overflow-hidden rounded-[2rem] border border-[var(--color-primary)] bg-[var(--color-primary)]/5 p-8 shadow-2xl backdrop-blur-xl md:p-10">
            <div className="absolute right-0 top-0 h-64 w-64 bg-[var(--color-primary)] opacity-10 blur-[100px]" />
            <div className="relative z-10 flex h-full flex-col">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-black uppercase tracking-wider text-white"><Sparkles size={13} /> Tanpa Biaya Langganan</div>
              <h3 className="mt-7 text-3xl font-black">KALOO POS Gratis</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">Gunakan seluruh fitur utama KALOO POS untuk mengelola transaksi, pesanan, pelanggan, dan operasional bisnis F&amp;B.</p>
              <div className="mt-8 border-b border-[var(--color-outline-variant)]/20 pb-8">
                <p className="text-5xl font-black text-[var(--color-primary)]">Gratis</p>
                <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Tidak ada biaya software bulanan</p>
              </div>
              <div className="py-8">
                <p className="mb-5 text-sm font-black">Sudah termasuk:</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {freePlanFeatures.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-[var(--color-on-surface-variant)]">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Check size={13} strokeWidth={3} /></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => openDemoModal('KALOO POS Gratis dengan Fee Platform Flat 1,4%')} className="ambient-shadow mt-auto flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--color-primary)] px-6 py-4 font-black text-white transition-all hover:scale-[1.02]">Jadwalkan Demo <CalendarDays size={18} /></button>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 p-8 backdrop-blur-xl md:p-10">
            <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-[var(--color-primary)] opacity-10 blur-[100px]" />
            <div className="relative z-10">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">Fee Platform Flat</p>
              <h3 className="text-3xl font-black leading-tight">Satu Tarif untuk Seluruh Transaksi KALOO POS</h3>
              <p className="mt-4 leading-relaxed text-[var(--color-on-surface-variant)]">Seluruh transaksi berhasil yang diproses atau dicatat melalui KALOO POS dikenakan fee platform sebesar 1,4%, baik pembayaran dilakukan menggunakan tunai, QRIS, e-wallet, transfer, maupun metode pembayaran lainnya.</p>

              <div className="mt-8 rounded-[2rem] border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/10 p-7 md:p-9">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.25em] text-[var(--color-primary)]">Tarif Platform</p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">Berlaku sama untuk seluruh nominal dan metode pembayaran.</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-6xl font-black tracking-tight text-[var(--color-primary)] md:text-7xl">1,4%</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Per transaksi berhasil</p>
                  </div>
                </div>
              </div>

              <div className="mt-7 space-y-4">
                <FeeExample transactionValue={100_000} />
                <FeeExample transactionValue={1_000_000} />
                <FeeExample transactionValue={10_000_000} />
              </div>

              <div className="mt-7 rounded-2xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface)]/60 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><ShieldCheck size={17} /></div>
                  <p className="text-sm leading-relaxed text-[var(--color-on-surface-variant)]">Fee platform dihitung dari nilai transaksi berhasil yang tercatat melalui KALOO POS. Biaya MDR, settlement, atau biaya penyedia pembayaran dapat berlaku secara terpisah sesuai metode pembayaran yang digunakan.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-5xl">
          <div className="rounded-2xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 p-5">
            <p className="text-center text-sm leading-relaxed text-[var(--color-on-surface-variant)]">Fee platform flat 1,4% dikenakan pada seluruh transaksi berhasil yang diproses atau dicatat melalui KALOO POS, termasuk transaksi tunai dan non-tunai. Biaya MDR, settlement, atau biaya penyedia pembayaran dapat berlaku secara terpisah.</p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface-container)]/40 p-8 backdrop-blur-2xl md:p-12">
          <div className="absolute right-0 top-0 h-80 w-80 bg-[var(--color-primary)] opacity-10 blur-[110px]" />
          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)]/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-[var(--color-primary)]">Add-on Opsional</div>
              <h2 className="mt-6 text-3xl font-black leading-tight md:text-4xl">{attendanceAddon.name}</h2>
              <p className="mt-4 max-w-2xl leading-relaxed text-[var(--color-on-surface-variant)]">{attendanceAddon.description}</p>
              <div className="mt-7 flex flex-wrap items-end gap-2">
                <span className="text-4xl font-black text-[var(--color-primary)] md:text-5xl">{attendanceAddon.price}</span>
                <span className="pb-1 text-[var(--color-on-surface-variant)]">{attendanceAddon.period}</span>
              </div>
              <p className="mt-3 text-sm text-[var(--color-on-surface-variant)]">Paket absensi tidak wajib dan dapat ditambahkan sesuai kebutuhan operasional mitra.</p>
            </div>
            <div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {attendanceAddon.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 rounded-2xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface)]/60 p-4">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><Check size={13} strokeWidth={3} /></div>
                    <span className="text-sm font-medium">{feature}</span>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => openDemoModal('Add-on Paket Absensi')} className="ambient-shadow mt-7 flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--color-primary)] px-6 py-4 font-black text-white transition-all hover:scale-[1.02]">Jadwalkan Demo Absensi <CalendarDays size={18} /></button>
            </div>
          </div>
          
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-4 py-24">
        <div className="relative overflow-hidden rounded-[2.5rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-primary)] p-10 text-white md:p-14">
          <div className="absolute inset-0 opacity-10"><div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-white blur-[120px]" /></div>
          <div className="relative z-10 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="mb-4 text-xs font-black uppercase tracking-[0.3em] text-white/70">Contact</p>
              <h2 className="text-4xl font-black leading-tight md:text-5xl">Siap Mengembangkan Bisnis Anda?</h2>
              <p className="mt-5 leading-relaxed text-white/80">Konsultasikan kebutuhan sistem kasir, QR menu, dan digitalisasi bisnis F&amp;B Anda bersama tim KALOO POS.</p>
              <div className="mt-8 flex flex-col gap-4">
                <ContactItem icon={MessageCircle} label="WhatsApp" value="+62 851-7677-3826" />
                <ContactItem icon={Mail} label="Email" value={emailAddress} />
                <ContactItem icon={FaInstagram} label="Instagram" value="@evognitoteam" />
                <ContactItem icon={MapPin} label="Location" value="Semarang, Indonesia" />
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <button type="button" onClick={() => openDemoModal()} className="flex items-center gap-3 rounded-3xl bg-white px-10 py-5 text-lg font-black text-[var(--color-primary)] shadow-2xl transition-all hover:scale-105">Jadwalkan Demo <CalendarDays size={22} /></button>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[var(--color-outline-variant)]/20 px-4 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div>
            <h3 className="text-xl font-black text-[var(--color-primary)]">KALOO POS</h3>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Smart POS &amp; Digital Menu Platform</p>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">App Version: v{process.env.NEXT_PUBLIC_APP_VERSION}</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-[var(--color-on-surface-variant)]">
            <Link href="/privacy-policy" className="transition-colors hover:text-[var(--color-primary)]">Privacy Policy</Link>
            <Link href="/term-conditions" className="transition-colors hover:text-[var(--color-primary)]">Terms</Link>
          </div>
        </div>
      </footer>

      {isDemoModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="demo-modal-title" onClick={closeDemoModal} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-lg rounded-[2rem] border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface)] p-7 shadow-2xl md:p-9">
            <button type="button" onClick={closeDemoModal} aria-label="Tutup" className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-surface-container)] transition-all hover:scale-105"><X size={20} /></button>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]"><CalendarDays size={26} /></div>
            <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-[var(--color-primary)]">Jadwalkan Demo</p>
            <h2 id="demo-modal-title" className="pr-10 text-3xl font-black leading-tight">Hubungi Tim KALOO POS</h2>
            <p className="mt-4 leading-relaxed text-[var(--color-on-surface-variant)]">Pilih metode komunikasi yang paling nyaman. Tim KALOO POS akan membantu menjadwalkan demo dan menjelaskan paket yang sesuai.</p>
            <div className="mt-5 rounded-2xl bg-[var(--color-surface-container)] p-4">
              <p className="text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">Paket yang diminati</p>
              <p className="mt-1 font-black text-[var(--color-primary)]">{selectedPlan}</p>
            </div>
            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={closeDemoModal} className="flex items-center justify-center gap-3 rounded-2xl bg-green-600 px-5 py-4 font-black text-white transition-all hover:scale-[1.02] hover:bg-green-700"><FaWhatsapp size={21} /> WhatsApp</a>
              <a href={emailUrl} onClick={closeDemoModal} className="flex items-center justify-center gap-3 rounded-2xl border border-[var(--color-outline-variant)] bg-[var(--color-surface-container)] px-5 py-4 font-black transition-all hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"><Mail size={20} /> Email</a>
            </div>
            <p className="mt-6 text-center text-xs leading-relaxed text-[var(--color-on-surface-variant)]">WhatsApp akan membuka percakapan baru, sedangkan email akan membuka aplikasi email pada perangkat Anda.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function FeeExample({ transactionValue }: FeeExampleProps) {
  const result = calculatePlatformFee(transactionValue);
  return (
    <div className="rounded-2xl border border-[var(--color-outline-variant)]/20 bg-[var(--color-surface)]/60 p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">Nilai Transaksi</p>
          <p className="mt-1 font-black">{formatIDR(result.transactionValue)}</p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">Fee Platform 1,4%</p>
          <p className="mt-1 font-black text-[var(--color-primary)]">{formatIDR(result.totalFee)}</p>
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--color-on-surface-variant)]">Nilai Setelah Fee</p>
          <p className="mt-1 font-black">{formatIDR(result.netValue)}</p>
        </div>
      </div>
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
    <div className="flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Icon size={20} /></div>
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-sm text-white/70">{value}</p>
      </div>
    </div>
  );
}